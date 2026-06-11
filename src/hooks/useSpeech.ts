import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechOptions {
  onResult: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: SpeechState) => void;
  lang?: string;
}

type SpeechState = 'idle' | 'listening' | 'processing' | 'error';

export function useSpeechRecognition(opts: SpeechOptions) {
  const [state, setState] = useState<SpeechState>('idle');
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Check support
  const SpeechRecognitionAPI =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  useEffect(() => {
    setSupported(!!SpeechRecognitionAPI);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      optsRef.current.onError?.('浏览器不支持语音识别');
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = opts.lang || 'zh-CN';
      recognition.interimResults = true; // Get intermediate results
      recognition.continuous = false;    // Single utterance
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setState('listening');
        optsRef.current.onStateChange?.('listening');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        if (final) {
          optsRef.current.onResult(final, true);
        } else if (interim) {
          optsRef.current.onResult(interim, false);
        }
      };

      recognition.onerror = (event: any) => {
        const err = event.error;
        if (err === 'no-speech') {
          optsRef.current.onError?.('没有检测到语音');
        } else if (err === 'audio-capture') {
          optsRef.current.onError?.('无法访问麦克风');
        } else if (err === 'not-allowed') {
          optsRef.current.onError?.('麦克风权限被拒绝');
        } else if (err === 'network') {
          optsRef.current.onError?.('网络连接失败');
        } else {
          optsRef.current.onError?.(err || '识别出错');
        }
        setState('error');
        optsRef.current.onStateChange?.('error');
      };

      recognition.onend = () => {
        setState(prev => prev === 'error' ? 'error' : 'idle');
        optsRef.current.onStateChange?.('idle');
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e: any) {
      optsRef.current.onError?.(e.message || '语音启动失败');
      setState('error');
    }
  }, []);

  const stop = useCallback(() => {
    setState('processing');
    optsRef.current.onStateChange?.('processing');
    try {
      recognitionRef.current?.stop();
    } catch { /* already stopped */ }
  }, []);

  const abort = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch { /* cleanup */ }
    setState('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { try { recognitionRef.current?.abort(); } catch {} };
  }, []);

  return { state, supported, start, stop, abort };
}

/**
 * TTS - 语音合成
 * 根据性格参数调整语速、音调
 */
interface VoiceProfile {
  extraversion: number;
  sensitivity: number;
  warmth: number;
  elegance: number;
  playfulness: number;
}

export function speakText(
  text: string,
  personality?: VoiceProfile,
  onEnd?: () => void,
): { stop: () => void } | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;

  // 取消之前的语音，但不要取消得太早
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'zh-CN';

  // 性格 → 语音参数映射
  if (personality) {
    // 音调: 外向+俏皮 → 更高；温暖+敏感 → 更柔和偏中
    const pitchBase = 1.0;
    const pitchExtra = personality.extraversion * 0.15 + personality.playfulness * 0.1;
    const pitchWarmth = (1 - personality.warmth) * 0.05;
    utterance.pitch = pitchBase + pitchExtra - pitchWarmth;

    // 语速: 外向+俏皮 → 更快；优雅+敏感 → 更慢
    const rateBase = 0.95;
    const rateExtra = personality.extraversion * 0.15 + personality.playfulness * 0.1;
    const rateSlow = personality.elegance * 0.1 + personality.sensitivity * 0.05;
    utterance.rate = rateBase + rateExtra - rateSlow;

    // 音量: 温暖的人说话稍柔
    utterance.volume = 0.85 + personality.warmth * 0.15;
  } else {
    utterance.pitch = 1.1;
    utterance.rate = 0.95;
    utterance.volume = 1.0;
  }

  // Clamp
  utterance.pitch = Math.max(0.6, Math.min(1.5, utterance.pitch));
  utterance.rate = Math.max(0.7, Math.min(1.3, utterance.rate));
  utterance.volume = Math.max(0.5, Math.min(1.0, utterance.volume));

  if (onEnd) {
    utterance.onend = onEnd;
  }

  // 如果语音库还没加载完，等待加载后再播放
  const doSpeak = () => {
    synth.speak(utterance);
  };

  if (synth.getVoices().length === 0) {
    // 部分浏览器异步加载语音库
    const onVoicesChanged = () => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      doSpeak();
    };
    synth.addEventListener('voiceschanged', onVoicesChanged);
    // 超时保护：1秒后不管有没有加载完都播
    setTimeout(() => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      if (synth.speaking) return;
      doSpeak();
    }, 1000);
  } else {
    doSpeak();
  }

  return {
    stop: () => synth.cancel(),
  };
}

export function isSpeechSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function isTtsSupported(): boolean {
  return !!window.speechSynthesis;
}
