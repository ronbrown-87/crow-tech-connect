import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTextToSpeechOptions {
  lang?: string;
  preferMale?: boolean;
}

// Language fallback chains for African languages not widely supported
const LANG_FALLBACKS: Record<string, string[]> = {
  'bem': ['sw-KE', 'sw', 'en-ZA', 'en-GB'],   // Bemba → Swahili → South African English
  'ny':  ['sw-KE', 'sw', 'en-ZA', 'en-GB'],    // Nyanja → Swahili → South African English
  'en':  ['en-ZA', 'en-GB', 'en-US'],           // English → South African accent first
};

// Voice quality scoring - prefer natural/human-sounding voices
const QUALITY_KEYWORDS = [
  'natural', 'neural', 'premium', 'enhanced', 'wavenet', 'online',
];
const MALE_KEYWORDS = [
  'male', 'david', 'daniel', 'james', 'mark', 'fred', 'george',
  'thomas', 'richard', 'liam', 'charles', 'arthur',
];

function scoreVoice(voice: SpeechSynthesisVoice, preferMale: boolean): number {
  let score = 0;
  const name = voice.name.toLowerCase();

  // Prefer "natural" / "neural" tagged voices (sound more human)
  if (QUALITY_KEYWORDS.some(k => name.includes(k))) score += 20;

  // Prefer non-local (network) voices – they are typically higher quality
  if (!voice.localService) score += 10;

  // Gender preference
  if (preferMale && MALE_KEYWORDS.some(k => name.includes(k))) score += 15;

  // Prefer Google / Microsoft neural voices
  if (name.includes('google')) score += 5;
  if (name.includes('microsoft') && name.includes('online')) score += 8;

  // African-accented English voices
  if (voice.lang.startsWith('en-ZA') || voice.lang.startsWith('en-KE')) score += 12;

  return score;
}

export function useTextToSpeech({ lang = 'en-US', preferMale = true }: UseTextToSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSupported) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [isSupported]);

  const pickVoice = useCallback((langCode: string): SpeechSynthesisVoice | undefined => {
    if (!voices.length) return undefined;

    const langPrefix = langCode.split('-')[0];
    const fallbackChain = LANG_FALLBACKS[langPrefix] || [langCode];

    // Try each language in the fallback chain
    for (const tryLang of [langCode, ...fallbackChain]) {
      const prefix = tryLang.split('-')[0];
      const candidates = voices.filter(v => 
        v.lang === tryLang || v.lang.startsWith(prefix)
      );

      if (candidates.length > 0) {
        // Score and sort candidates
        const scored = candidates
          .map(v => ({ voice: v, score: scoreVoice(v, preferMale) }))
          .sort((a, b) => b.score - a.score);
        return scored[0].voice;
      }
    }

    // Ultimate fallback
    return voices[0];
  }, [voices, preferMale]);

  const speak = useCallback((text: string, langOverride?: string) => {
    if (!isSupported || !text) return;

    window.speechSynthesis.cancel();

    const effectiveLang = langOverride || lang;
    const langPrefix = effectiveLang.split('-')[0];
    const isAfricanLang = ['bem', 'ny'].includes(langPrefix);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = effectiveLang;

    // Tune for natural, warm, human-like delivery
    if (isAfricanLang) {
      // Slower, warmer delivery for Bemba/Nyanja to sound more natural
      utterance.rate = 0.88;
      utterance.pitch = 0.85;
      utterance.volume = 1.0;
    } else {
      // English - natural conversational pace
      utterance.rate = 0.92;
      utterance.pitch = 0.88;
      utterance.volume = 1.0;
    }

    const voice = pickVoice(effectiveLang);
    if (voice) {
      utterance.voice = voice;
      // If we fell back to a different language voice, keep the original lang tag
      // so the engine attempts proper pronunciation
      utterance.lang = effectiveLang;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, lang, pickVoice]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
}
