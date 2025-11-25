/**
 * Text-to-Speech Service with Fallback Chain
 * Fallback order: Cache → Local System TTS → ElevenLabs API (direct HTTP or SDK)
 * 
 * Note: For Python-based TTS (pyttsx3, Coqui), you would need a separate Python microservice.
 * This implementation uses Node.js-compatible options for the hackathon MVP.
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import env from '../config/env.js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

export interface TTSResult {
  audio: Buffer;
  source: 'local' | 'elevenlabs' | 'cached' | 'none';
  contentType: string;
}

export interface TTSOptions {
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
  useCache?: boolean;
}

export class TTSService {
  private elevenLabsClient: ElevenLabsClient | null = null;
  private hasLocalTTS: boolean = false;
  private cacheDir: string;
  private useDirectAPI: boolean = true; // Prefer direct HTTP API over SDK

  constructor() {
    // Set up cache directory for pre-generated audio
    this.cacheDir = path.join(os.tmpdir(), 'style-shepherd-tts-cache');
    this.ensureCacheDir();

    // Initialize ElevenLabs client if API key is available
    // Support both ELEVENLABS_API_KEY and ELEVEN_LABS_API_KEY (legacy)
    const apiKey = env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY;
    if (apiKey) {
      try {
        this.elevenLabsClient = new ElevenLabsClient({
          apiKey: apiKey,
        });
        console.log('✅ ElevenLabs TTS client initialized (SDK fallback)');
      } catch (error) {
        console.warn('⚠️ ElevenLabs SDK not available, will use direct HTTP API:', error);
        this.elevenLabsClient = null;
      }
    }

    // Check for local TTS availability
    this.checkLocalTTS();
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.warn('⚠️ Could not create TTS cache directory:', error);
    }
  }

  /**
   * Check if local TTS is available (system TTS)
   */
  private async checkLocalTTS(): Promise<void> {
    try {
      const platform = os.platform();
      
      if (platform === 'darwin') {
        // macOS - check for 'say' command
        await execAsync('which say');
        this.hasLocalTTS = true;
        console.log('✅ Local TTS available (macOS say)');
      } else if (platform === 'linux') {
        // Linux - check for espeak or festival
        try {
          await execAsync('which espeak');
          this.hasLocalTTS = true;
          console.log('✅ Local TTS available (espeak)');
        } catch {
          try {
            await execAsync('which festival');
            this.hasLocalTTS = true;
            console.log('✅ Local TTS available (festival)');
          } catch {
            this.hasLocalTTS = false;
          }
        }
      } else if (platform === 'win32') {
        // Windows - PowerShell TTS is available
        this.hasLocalTTS = true;
        console.log('✅ Local TTS available (Windows PowerShell)');
      } else {
        this.hasLocalTTS = false;
      }
    } catch (error) {
      this.hasLocalTTS = false;
      console.warn('⚠️ Local TTS not available:', error);
    }
  }

  /**
   * Generate speech from text using fallback chain
   * Order: Cache → Local System TTS → ElevenLabs (direct API or SDK)
   */
  async textToSpeech(text: string, voiceId?: string, options?: TTSOptions): Promise<TTSResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for TTS');
    }

    const opts = {
      useCache: options?.useCache !== false, // Default to true
      voiceId: voiceId || options?.voiceId || '21m00Tcm4TlvDq8ikWAM', // Default: Rachel
      stability: options?.stability ?? 0.5,
      similarityBoost: options?.similarityBoost ?? 0.75,
    };

    // 1) Check cache first (for common utterances)
    if (opts.useCache) {
      try {
        const cached = await this.getCachedAudio(text, opts.voiceId);
        if (cached) {
          return {
            audio: cached,
            source: 'cached',
            contentType: 'audio/mpeg',
          };
        }
      } catch (error) {
        // Cache miss or error, continue to generation
      }
    }

    // 2) Try local TTS first (free, no API key needed)
    if (this.hasLocalTTS) {
      try {
        const audio = await this.generateLocalTTS(text);
        if (audio) {
          // Cache the result for future use
          if (opts.useCache) {
            this.cacheAudio(text, opts.voiceId, audio, 'audio/wav').catch(() => {});
          }
          return {
            audio,
            source: 'local',
            contentType: 'audio/wav',
          };
        }
      } catch (error) {
        console.warn('Local TTS failed, trying fallback:', error);
      }
    }

    // 3) Fallback to ElevenLabs if available
    const apiKey = env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY;
    if (apiKey) {
      try {
        const audio = await this.generateElevenLabsTTS(text, opts.voiceId, {
          stability: opts.stability,
          similarityBoost: opts.similarityBoost,
        });
        if (audio) {
          // Cache the result for future use
          if (opts.useCache) {
            this.cacheAudio(text, opts.voiceId, audio, 'audio/mpeg').catch(() => {});
          }
          return {
            audio,
            source: 'elevenlabs',
            contentType: 'audio/mpeg',
          };
        }
      } catch (error) {
        console.warn('ElevenLabs TTS failed:', error);
      }
    }

    // 4) No TTS available
    throw new Error('No TTS backend available. Please configure local TTS or ElevenLabs API key.');
  }

  /**
   * Generate TTS using local system TTS
   */
  private async generateLocalTTS(text: string): Promise<Buffer> {
    const platform = os.platform();
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `tts_${Date.now()}.wav`);

    try {
      if (platform === 'darwin') {
        // macOS: use 'say' command
        await new Promise<void>((resolve, reject) => {
          const sayProcess = spawn('say', ['-o', tempFile, '--data-format=LEF32@22050', text]);
          sayProcess.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`say command exited with code ${code}`));
          });
          sayProcess.on('error', reject);
        });
      } else if (platform === 'linux') {
        // Linux: try espeak first, then festival
        try {
          await execAsync(`espeak -s 150 -w "${tempFile}" "${text}"`);
        } catch {
          // Fallback to festival
          const festivalScript = `(utt.save.wave (SayText "${text}") "${tempFile}")`;
          await execAsync(`echo '${festivalScript}' | festival --pipe`);
        }
      } else if (platform === 'win32') {
        // Windows: use PowerShell Add-Type for SAPI
        // Escape the text properly for PowerShell
        const escapedText = text.replace(/"/g, '`"').replace(/\$/g, '`$');
        const psScript = `Add-Type -AssemblyName System.Speech; $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; $synth.SetOutputToWaveFile('${tempFile.replace(/\\/g, '/')}'); $synth.Speak('${escapedText}'); $synth.Dispose()`;
        await execAsync(`powershell -Command "${psScript}"`);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }

      // Read the generated audio file
      const audioBuffer = await fs.readFile(tempFile);
      
      // Clean up temp file
      await fs.unlink(tempFile).catch(() => {});

      return audioBuffer;
    } catch (error) {
      // Clean up temp file on error
      await fs.unlink(tempFile).catch(() => {});
      throw error;
    }
  }

  /**
   * Generate TTS using ElevenLabs API
   * Prefers direct HTTP API (as recommended), falls back to SDK
   */
  private async generateElevenLabsTTS(
    text: string,
    voiceId?: string,
    options?: { stability?: number; similarityBoost?: number }
  ): Promise<Buffer> {
    const apiKey = env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const defaultVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
    const stability = options?.stability ?? 0.5;
    const similarityBoost = options?.similarityBoost ?? 0.75;

    // Try direct HTTP API first (recommended approach)
    if (this.useDirectAPI) {
      try {
        return await this.generateElevenLabsDirectAPI(text, defaultVoiceId, {
          stability,
          similarityBoost,
        });
      } catch (error) {
        console.warn('ElevenLabs direct API failed, trying SDK:', error);
        // Fall through to SDK
      }
    }

    // Fallback to SDK if available
    if (this.elevenLabsClient) {
    try {
      const audioResponse = await this.elevenLabsClient.textToSpeech.convert(defaultVoiceId, {
        text: text,
          modelId: 'eleven_multilingual_v2',
          voiceSettings: {
            stability,
            similarityBoost,
        },
      });

        // Convert ReadableStream to buffer
        const reader = audioResponse.getReader();
      const chunks: Uint8Array[] = [];
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
        } finally {
          reader.releaseLock();
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
        console.error('ElevenLabs SDK error:', error);
      throw error;
      }
    }

    throw new Error('ElevenLabs client not available');
  }

  /**
   * Generate TTS using ElevenLabs direct HTTP API (recommended)
   * This matches the Python requests approach from the recommendation
   */
  private async generateElevenLabsDirectAPI(
    text: string,
    voiceId: string,
    options: { stability: number; similarityBoost: number }
  ): Promise<Buffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const payload = {
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: options.stability,
        similarity_boost: options.similarityBoost,
      },
    };

    const apiKey = env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get cached audio if available
   */
  private async getCachedAudio(text: string, voiceId: string): Promise<Buffer | null> {
    try {
      const cacheKey = this.getCacheKey(text, voiceId);
      const cachePath = path.join(this.cacheDir, `${cacheKey}.mp3`);
      
      const stats = await fs.stat(cachePath).catch(() => null);
      if (stats) {
        // Cache hit - return cached audio
        return await fs.readFile(cachePath);
      }
    } catch (error) {
      // Cache miss or error
    }
    return null;
  }

  /**
   * Cache audio for future use
   */
  private async cacheAudio(
    text: string,
    voiceId: string,
    audio: Buffer,
    contentType: string
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(text, voiceId);
      const extension = contentType.includes('mpeg') ? 'mp3' : 'wav';
      const cachePath = path.join(this.cacheDir, `${cacheKey}.${extension}`);
      
      await fs.writeFile(cachePath, audio);
    } catch (error) {
      // Cache write failed, but don't throw - this is non-critical
      console.warn('Failed to cache TTS audio:', error);
    }
  }

  /**
   * Generate cache key from text and voice ID
   */
  private getCacheKey(text: string, voiceId: string): string {
    const hash = createHash('sha256')
      .update(`${text}:${voiceId}`)
      .digest('hex')
      .substring(0, 16);
    return hash;
  }

  /**
   * Check which TTS sources are available
   */
  getAvailableSources(): { local: boolean; elevenlabs: boolean; cache: boolean } {
    const apiKey = env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY;
    return {
      local: this.hasLocalTTS,
      elevenlabs: !!apiKey,
      cache: true, // Cache is always available if directory exists
    };
  }

  /**
   * Pre-generate and cache common utterances
   * Useful for onboarding, button labels, common responses
   */
  async preCacheCommonUtterances(voiceId?: string): Promise<void> {
    const commonTexts = [
      "Hi there! I'm here to help you find the perfect fashion items.",
      "I'll help you find that right away!",
      "Great choice! I'll add that to your cart.",
      "Let me search our collection for you!",
      "Based on your preferences, I have some great recommendations!",
      "I can help you find the perfect size!",
      "Would you like to continue shopping or proceed to checkout?",
    ];

    const defaultVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM';
    console.log(`📦 Pre-caching ${commonTexts.length} common utterances...`);

    for (const text of commonTexts) {
      try {
        // Check if already cached
        const cached = await this.getCachedAudio(text, defaultVoiceId);
        if (!cached) {
          // Generate and cache using ElevenLabs if available, otherwise local TTS
          await this.textToSpeech(text, defaultVoiceId, { useCache: true });
        }
      } catch (error) {
        console.warn(`Failed to pre-cache: "${text.substring(0, 30)}..."`, error);
      }
    }

    console.log('✅ Common utterances pre-cached');
  }
}

export const ttsService = new TTSService();
