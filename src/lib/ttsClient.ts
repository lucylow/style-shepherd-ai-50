/**
 * Text-to-Speech Client with Fallback Chain
 * Tries browser Web Speech API first, then falls back to server TTS endpoint
 */

export type TTSSource = 'browser' | 'server' | 'none';

export interface TTSResult {
  source: TTSSource;
  success: boolean;
  error?: string;
}

/**
 * Speak text using fallback chain:
 * 1. Browser Web Speech API (instant, no server needed)
 * 2. Server TTS endpoint (local TTS or ElevenLabs)
 */
export async function speakText(text: string): Promise<TTSResult> {
  if (!text || text.trim().length === 0) {
    return { source: 'none', success: false, error: 'Text is required' };
  }

  // 1) Try browser Web Speech API first (no key, instant, zero dependencies)
  if ('speechSynthesis' in window) {
    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      
      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        // Prefer English voices, fallback to first available
        const preferredVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        utter.voice = preferredVoice;
        utter.lang = preferredVoice.lang || 'en-US';
      } else {
        utter.lang = 'en-US';
      }

      // Set reasonable defaults
      utter.rate = 1.0;
      utter.pitch = 1.0;
      utter.volume = 1.0;

      // Wait for voices to load if needed
      if (voices.length === 0) {
        await new Promise<void>((resolve) => {
          const checkVoices = () => {
            const loadedVoices = window.speechSynthesis.getVoices();
            if (loadedVoices.length > 0) {
              const preferredVoice = loadedVoices.find(v => v.lang.startsWith('en')) || loadedVoices[0];
              utter.voice = preferredVoice;
              utter.lang = preferredVoice.lang || 'en-US';
              resolve();
            } else {
              setTimeout(checkVoices, 100);
            }
          };
          checkVoices();
        });
      }

      // Speak and wait for completion
      await new Promise<void>((resolve, reject) => {
        utter.onend = () => resolve();
        utter.onerror = (error) => reject(error);
        window.speechSynthesis.speak(utter);
      });

      console.info('✅ TTS: played via Web Speech API (browser)');
      return { source: 'browser', success: true };
    } catch (err) {
      console.warn('⚠️ Web Speech API failed:', err);
      // Continue to server fallback
    }
  }

  // 2) Fallback: call server /api/tts endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for server TTS

    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({ text }),
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`TTS endpoint returned ${res.status}: ${res.statusText}`);
    }

    // Get the TTS source from header
    const source = (res.headers.get('X-TTS-Source') || 'server') as TTSSource;
    const contentType = res.headers.get('Content-Type') || 'audio/wav';

    // Server returns audio blob
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    // Play audio and wait for completion
    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      audio.play().catch(reject);
    });

    console.info(`✅ TTS: played via server (${source})`);
    return { source, success: true };
  } catch (err) {
    console.warn('⚠️ Server TTS failed:', err);
    return {
      source: 'none',
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Stop any ongoing speech
 */
export function stopSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Check which TTS sources are available
 */
export async function getAvailableTTSSources(): Promise<{
  browser: boolean;
  server: boolean;
}> {
  const browserAvailable = 'speechSynthesis' in window;

  let serverAvailable = false;
  try {
    const res = await fetch('/api/tts/sources', {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    if (res.ok) {
      const data = await res.json();
      serverAvailable = data.local || data.elevenlabs;
    }
  } catch {
    // Server not available or timeout
    serverAvailable = false;
  }

  return {
    browser: browserAvailable,
    server: serverAvailable,
  };
}

