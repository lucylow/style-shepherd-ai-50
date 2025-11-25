/**
 * Speech-to-Text Service
 * Uses OpenAI Whisper API for accurate transcription
 * Falls back to ElevenLabs STT if available, then placeholder
 */

import OpenAI from 'openai';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import env from '../config/env.js';

export interface STTResult {
  text: string;
  confidence?: number;
  source: 'openai' | 'elevenlabs' | 'fallback';
  language?: string;
}

export class STTService {
  private openaiClient: OpenAI | null = null;
  private elevenLabsClient: ElevenLabsClient | null = null;
  private readonly MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper limit)

  constructor() {
    // Initialize OpenAI client for Whisper
    const openaiKey = env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        this.openaiClient = new OpenAI({
          apiKey: openaiKey,
        });
        console.log('✅ OpenAI STT (Whisper) client initialized');
      } catch (error) {
        console.warn('⚠️ Failed to initialize OpenAI STT client:', error);
      }
    }

    // Initialize ElevenLabs client as fallback
    const elevenLabsKey = env.ELEVENLABS_API_KEY || env.ELEVEN_LABS_API_KEY;
    if (elevenLabsKey) {
      try {
        this.elevenLabsClient = new ElevenLabsClient({
          apiKey: elevenLabsKey,
        });
        console.log('✅ ElevenLabs STT client initialized (fallback)');
      } catch (error) {
        console.warn('⚠️ Failed to initialize ElevenLabs STT client:', error);
      }
    }
  }

  /**
   * Transcribe audio to text using best available service
   */
  async transcribe(
    audioBuffer: Buffer | ArrayBuffer,
    options?: {
      language?: string;
      prompt?: string; // Context prompt for better accuracy
    }
  ): Promise<STTResult> {
    // Convert to Buffer if needed
    const buffer = audioBuffer instanceof Buffer
      ? audioBuffer
      : Buffer.from(new Uint8Array(audioBuffer));

    // Check file size
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(`Audio file too large: ${buffer.length} bytes (max: ${this.MAX_FILE_SIZE})`);
    }

    // Try OpenAI Whisper first (most accurate)
    if (this.openaiClient) {
      try {
        return await this.transcribeWithWhisper(buffer, options);
      } catch (error) {
        console.warn('OpenAI Whisper transcription failed, trying fallback:', error);
      }
    }

    // Try ElevenLabs STT as fallback
    if (this.elevenLabsClient) {
      try {
        return await this.transcribeWithElevenLabs(buffer);
      } catch (error) {
        console.warn('ElevenLabs STT failed, using placeholder:', error);
      }
    }

    // Final fallback
    return {
      text: '[Audio transcription needed - please configure STT service]',
      source: 'fallback',
      confidence: 0,
    };
  }

  /**
   * Transcribe using OpenAI Whisper API
   */
  private async transcribeWithWhisper(
    audioBuffer: Buffer,
    options?: { language?: string; prompt?: string }
  ): Promise<STTResult> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    // Create a File-like object for the API
    const file = new File(
      [audioBuffer],
      `audio_${Date.now()}.${this.detectAudioFormat(audioBuffer)}`,
      { type: this.detectMimeType(audioBuffer) }
    );

    const transcription = await this.openaiClient.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: options?.language,
      prompt: options?.prompt, // Context for better accuracy
      response_format: 'verbose_json', // Get confidence and other metadata
    });

    return {
      text: transcription.text,
      confidence: (transcription as any).confidence || 0.9, // Whisper doesn't provide confidence, estimate
      source: 'openai',
      language: transcription.language || options?.language,
    };
  }

  /**
   * Transcribe using ElevenLabs STT (if available)
   */
  private async transcribeWithElevenLabs(audioBuffer: Buffer): Promise<STTResult> {
    if (!this.elevenLabsClient) {
      throw new Error('ElevenLabs client not initialized');
    }

    // Check if ElevenLabs STT API is available
    if ('speechToText' in this.elevenLabsClient && this.elevenLabsClient.speechToText) {
      try {
        const response = await (this.elevenLabsClient as any).speechToText.convert(audioBuffer);
        if (response && response.text) {
          return {
            text: response.text,
            confidence: response.confidence || 0.8,
            source: 'elevenlabs',
          };
        }
      } catch (error) {
        throw new Error(`ElevenLabs STT error: ${error}`);
      }
    }

    throw new Error('ElevenLabs STT not available');
  }

  /**
   * Detect audio format from buffer
   */
  private detectAudioFormat(buffer: Buffer): string {
    // Check magic bytes
    if (buffer[0] === 0xFF && buffer[1] === 0xFB) return 'mp3';
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return 'mp3'; // ID3
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) return 'wav';
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) return 'ogg';
    if (buffer[0] === 0x66 && buffer[1] === 0x4C && buffer[2] === 0x61 && buffer[3] === 0x43) return 'flac';
    return 'mp3'; // Default
  }

  /**
   * Detect MIME type from buffer
   */
  private detectMimeType(buffer: Buffer): string {
    const format = this.detectAudioFormat(buffer);
    const mimeTypes: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
    };
    return mimeTypes[format] || 'audio/mpeg';
  }

  /**
   * Check if STT service is available
   */
  isAvailable(): boolean {
    return this.openaiClient !== null || this.elevenLabsClient !== null;
  }

  /**
   * Get available STT sources
   */
  getAvailableSources(): { openai: boolean; elevenlabs: boolean } {
    return {
      openai: this.openaiClient !== null,
      elevenlabs: this.elevenLabsClient !== null,
    };
  }
}

export const sttService = new STTService();

