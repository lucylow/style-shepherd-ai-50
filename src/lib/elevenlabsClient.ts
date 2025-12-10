/**
 * ElevenLabs TTS Client
 * 
 * Frontend client for text-to-speech via Edge Function
 */

interface TTSResponse {
  success: boolean;
  source: "eleven" | "mock";
  audioBase64?: string;
  mimeType?: string;
  error?: string;
}

const TTS_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

// Available voices
export const ELEVEN_VOICES = {
  george: "JBFqnCBsd6RMkjVDRZzb",
  aria: "9BWtsMINqrJLrRacOk9x",
  roger: "CwhRBWXzGAHq8TQ4Fs17",
  sarah: "EXAVITQu4vr4xnSDxMaL",
  laura: "FGY2WhTYpPnrIDTdsKH5",
  charlie: "IKne3meq5aSn9XLyUdCD",
  callum: "N2lVS1w4EtoT3dr4eOWO",
  river: "SAz9YHcvj6GT2YYXdXww",
  liam: "TX3LPaxmHKxFdv7VOQHJ",
  charlotte: "XB0fDUnXU5powFXDhCwa",
  alice: "Xb7hH8MSUJpSbSDYk0k2",
  matilda: "XrExE9yKIg1WjnnlVkGX",
  will: "bIHbv24MWmeRgasZH58o",
  jessica: "cgSgspJ2msm6clMCkdW9",
  eric: "cjVigY5qzO86Huf0OWal",
  chris: "iP95p4xoKVk53GoZ742B",
  brian: "nPczCjzI2devNBz1zQrb",
  daniel: "onwK4e9ZLuTAKqWW03F9",
  lily: "pFZP5JQG7iQjIQuC4Bku",
  bill: "pqHfZKP75CvOlQylNhV4",
} as const;

export type VoiceName = keyof typeof ELEVEN_VOICES;

/**
 * Convert text to speech and return audio data URL
 */
export async function textToSpeech(
  text: string,
  voiceId: string = ELEVEN_VOICES.george
): Promise<{ success: boolean; audioUrl?: string; error?: string }> {
  try {
    const response = await fetch(TTS_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text, voiceId }),
    });

    const data: TTSResponse = await response.json();

    if (!data.success) {
      return { success: false, error: data.error || "TTS failed" };
    }

    if (data.audioBase64) {
      const audioUrl = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioBase64}`;
      return { success: true, audioUrl };
    }

    // Mock mode - no audio
    return { success: true, audioUrl: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Speak text using browser audio
 */
export async function speakText(
  text: string,
  voiceId?: string
): Promise<void> {
  const result = await textToSpeech(text, voiceId);

  if (result.success && result.audioUrl) {
    const audio = new Audio(result.audioUrl);
    await audio.play().catch((e) => {
      console.warn("Audio playback blocked:", e);
    });
  } else if (!result.success) {
    console.error("TTS error:", result.error);
  }
}
