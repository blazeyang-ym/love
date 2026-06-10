import { useState, useRef, useEffect, useCallback } from 'react';
import { GameState, STAGE_LABELS, EmotionState, RelationshipStage, DiaryEntry, Message } from '../types';
import { getAnimationForEmotion } from '../utils/animationProfile';
import { SCENES, getScene } from '../data/scenes';
import { useSpeechRecognition, speakText, isSpeechSupported, isTtsSupported } from '../hooks/useSpeech';

interface Props {
  state: GameState;
  onSend: (text: string) => void;
  onReset: () => void;
  onSceneChange: (id: string) => void;
  onProactive: () => Promise<Message | null>;
  onSave: () => void;
  ollamaReady?: boolean | null;
}

const EMOTION_GLOW: Record<EmotionState, string> = {
  neutral: 'rgba(148,163,184,0.08)',
  happy: 'rgba(251,191,36,0.2)',
  shy: 'rgba(244,114,182,0.15)',
  surprised: 'rgba(96,165,250,0.15)',
  sad: 'rgba(129,140,248,0.1)',
  angry: 'rgba(248,113,113,0.12)',
  love: 'rgba(244,63,94,0.25)',
  teasing: 'rgba(249,115,22,0.15)',
};

const EMOTION_FILTERS: Record<EmotionState, string> = {
  neutral: 'brightness(1)', happy: 'brightness(1.05) saturate(1.1)', shy: 'brightness(0.98) saturate(1.05)',
  surprised: 'brightness(1.08)', sad: 'brightness(0.9) saturate(0.8)', angry: 'brightness(0.9) saturate(1.2) hue-rotate(-5deg)',
  love: 'brightness(1.1) saturate(1.2) contrast(1.05)', teasing: 'brightness(1.03) saturate(1.1) hue-rotate(2deg)',
};

const QUICK_ACTIONS = ['你好呀', '你今天好美', '在想什么呢', '晚安'];

export default function ChatRoom({ state, onSend, onReset, onSceneChange, onProactive, onSave, ollamaReady }: Props) {
  const [input, setInput] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showMemories, setShowMemories] = useState(false);
  const [showScenes, setShowScenes] = useState(false);
  const [showDiary, setShowDiary] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showStageUp, setShowStageUp] = useState(false);
  const prevMsgCount = useRef(state.messages.length);

  // ---- 语音 ----
  const [voiceOn, setVoiceOn] = useState(true); // TTS 开关
  const [voiceInterim, setVoiceInterim] = useState(''); // 语音识别中间结果
  const [voiceError, setVoiceError] = useState('');
  const voiceSupported = isSpeechSupported();
  const ttsSupported = isTtsSupported();
  const voiceSpeaking = useRef(false);

  const handleVoiceResult = useCallback((text: string, isFinal: boolean) => {
    setVoiceInterim(text);
    if (isFinal) {
      setInput(text);
      setVoiceInterim('');
    }
  }, []);

  const handleVoiceError = useCallback((err: string) => {
    setVoiceError(err);
    setTimeout(() => setVoiceError(''), 3000);
  }, []);

  const { state: voiceState, supported: micReady, start: startVoice, stop: stopVoice } =
    useSpeechRecognition({
      onResult: handleVoiceResult,
      onError: handleVoiceError,
    });

  // 错误提示自动消失
  useEffect(() => {
    if (!voiceError) return;
    const t = setTimeout(() => setVoiceError(''), 3500);
    return () => clearTimeout(t);
  }, [voiceError]);

  // 角色消息播放 TTS
  const prevCharMsgId = useRef<string | null>(null);
  useEffect(() => {
    if (!voiceOn || !ttsSupported || !state.character) return;
    const msgs = state.messages;
    const last = msgs[msgs.length - 1];
    if (last && last.sender === 'character' && last.id !== prevCharMsgId.current) {
      prevCharMsgId.current = last.id;
      const toSpeak = last.content.length > 120 ? last.content.slice(0, 100) + '…' : last.content;
      voiceSpeaking.current = true;
      speakText(toSpeak, state.character.personality, () => {
        voiceSpeaking.current = false;
      });
    }
  }, [state.messages, voiceOn, ttsSupported]);

  const { character, messages, affection, currentEmotion, stage, currentScene, diaries } = state;
  if (!character) return null;

  const scene = getScene(currentScene);
  const animStyle = getAnimationForEmotion(currentEmotion, character.motionProfile, affection);

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      if (messages[messages.length - 1].sender === 'user') {
        setIsTyping(true);
        const delay = 800 + Math.random() * 600;
        const timer = setTimeout(() => setIsTyping(false), delay);
        prevMsgCount.current = messages.length;
        return () => clearTimeout(timer);
      }
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    prevMsgCount.current = messages.length;
  }, [messages]);

  const prevStageRef = useRef<RelationshipStage>(stage);
  useEffect(() => {
    if (prevStageRef.current !== stage) {
      setShowStageUp(true);
      const timer = setTimeout(() => setShowStageUp(false), 2800);
      prevStageRef.current = stage;
      return () => clearTimeout(timer);
    }
  }, [stage]);

  // 主动话题：角色回复后 20 秒，如果用户还没说话，角色主动搭话
  const proactiveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proactiveLock = useRef(false); // 防止定时器重复触发
  useEffect(() => {
    if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    if (proactiveLock.current) { proactiveLock.current = false; return; }

    const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
    // 条件：角色刚回复过 && 最近有用户互动 && 角色没连续说太多 && 对话有一定量
    const recent = messages.slice(-6);
    const hasRecentUser = recent.some(m => m.sender === 'user');
    const charCount = recent.filter(m => m.sender === 'character').length;

    if (lastMsg?.sender === 'character' && hasRecentUser && charCount <= 3 && messages.length >= 4) {
      proactiveTimer.current = setTimeout(async () => {
        proactiveLock.current = true;
        const msg = await onProactive();
        if (msg) {
          setIsTyping(true);
          setTimeout(() => setIsTyping(false), 400);
        }
      }, 20000);
    }
    return () => {
      if (proactiveTimer.current) clearTimeout(proactiveTimer.current);
    };
  }, [messages]);

  const handleSend = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setInput('');
    onSend(t);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); }
  };

  return (
    <div className={`h-screen flex flex-col overflow-hidden bg-[#0f0a1a]`}>
      {/* 场景背景层 */}
      <div className={`fixed inset-0 pointer-events-none ${scene.bgClass} ${scene.bgGradient} opacity-60 transition-opacity duration-700`} />

      {/* 顶栏 */}
      <header className="relative flex-shrink-0 px-4 py-2.5 flex items-center justify-between z-20 bg-[#0f0a1a]/90 backdrop-blur border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src={character.avatarUrl || ''} alt={character.name}
              className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10" />
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400/80 shadow-lg shadow-green-400/20" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">{character.name}</h2>
            <p className="text-[10px] text-mist-500">{STAGE_LABELS[stage]} · {character.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 场景按钮 */}
          <button onClick={() => setShowScenes(!showScenes)}
            className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-mist-400 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {scene.name}
          </button>

          {/* 日记按钮 */}
          <button onClick={() => setShowDiary(!showDiary)}
            className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] text-mist-400 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            {diaries.length > 0 ? diaries.length : '日记'}
          </button>

          <div className={`text-[9px] ${ollamaReady === true ? 'text-green-500' : ollamaReady === false ? 'text-amber-500' : 'text-mist-600'}`}>
            {ollamaReady === true ? 'AI' : ollamaReady === false ? '本地' : ''}
          </div>

          {/* 记忆按钮 */}
          {state.memories.length > 0 && (
            <button onClick={() => setShowMemories(!showMemories)}
              className="relative w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors" title="记忆">
              <svg className="w-3.5 h-3.5 text-mist-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-heart-500 text-[7px] flex items-center justify-center text-white font-bold">
                {state.memories.length > 9 ? '9+' : state.memories.length}
              </span>
            </button>
          )}

          <button onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
            <svg className="w-3.5 h-3.5 text-mist-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
          </button>
        </div>
        {showMenu && (
          <div className="absolute top-11 right-4 bg-[#1a1428] rounded-xl py-2 min-w-[130px] z-30 shadow-2xl border border-white/[0.06]">
            <button onClick={() => { setShowMenu(false); onSave(); }}
              className="w-full px-4 py-2 text-xs text-mist-400 hover:text-white hover:bg-white/5 text-left transition-colors">
              保存进度
            </button>
            <button onClick={() => { setShowMenu(false); onReset(); }}
              className="w-full px-4 py-2 text-xs text-mist-400 hover:text-white hover:bg-white/5 text-left transition-colors">
              重新创建角色
            </button>
          </div>
        )}
      </header>

      {/* 好感度条 */}
      <div className="relative flex-shrink-0 px-4 pt-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-heart-600 via-heart-400 to-rose-400 transition-all duration-700 ease-out"
              style={{ width: `${affection}%` }} />
          </div>
          <div className="flex gap-1">
            {(['stranger','acquainted','friend','close','intimate'] as RelationshipStage[]).map((s,i) => (
              <div key={s} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                ['stranger','acquainted','friend','close','intimate'].indexOf(stage) >= i
                  ? 'bg-heart-400 shadow-md shadow-heart-400/20' : 'bg-white/10'
              }`} />
            ))}
          </div>
        </div>
        <div className="text-[9px] text-mist-600 mt-0.5 flex items-center gap-1">
          <span>{scene.moodLabel}</span>
          <span className="text-mist-700">·</span>
          <span>{scene.description}</span>
        </div>
      </div>

      {/* 场景选择面板 */}
      {showScenes && (
        <div className="relative z-20 px-4 py-2 animate-slide-up max-w-lg mx-auto w-full">
          <div className="glass-strong rounded-2xl p-3 border border-white/[0.06]">
            <div className="grid grid-cols-5 gap-2">
              {SCENES.filter(s => affection >= s.affRequired).map(s => (
                <button key={s.id} onClick={() => { onSceneChange(s.id); setShowScenes(false); }}
                  className={`px-2 py-2 rounded-xl text-center transition-all text-[10px] ${
                    currentScene === s.id
                      ? 'bg-heart-500/20 text-heart-300 border border-heart-500/30'
                      : 'bg-white/[0.03] text-mist-400 border border-transparent hover:bg-white/[0.06]'
                  }`}>
                  <div className="text-[11px] mb-0.5">{s.name}</div>
                  <div className="text-[8px] opacity-60">{s.moodLabel}</div>
                </button>
              ))}
            </div>
            {SCENES.filter(s => affection < s.affRequired).length > 0 && (
              <div className="mt-2 text-[9px] text-mist-600">
                好感度 {affection}，已解锁 {SCENES.filter(s => affection >= s.affRequired).length}/{SCENES.length} 场景
              </div>
            )}
          </div>
        </div>
      )}

      {/* 日记面板 */}
      {showDiary && (
        <div className="relative z-20 px-4 py-2 animate-slide-up flex-1 overflow-y-auto max-w-lg mx-auto w-full">
          <div className="glass-strong rounded-2xl p-4 border border-white/[0.06] min-h-[200px] max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-mist-300 font-medium">{character.name} 的日记</span>
              <button onClick={() => setShowDiary(false)} className="text-mist-500 hover:text-white text-[10px]">关闭</button>
            </div>
            {diaries.length === 0 ? (
              <div className="text-center py-8 text-mist-600 text-xs">还没有日记……聊一会儿就有了</div>
            ) : (
              <div className="space-y-3">
                {diaries.slice().reverse().map((entry) => {
                  const s = getScene(entry.scene);
                  return (
                    <div key={entry.id} className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] text-mist-500">{s.name} · {new Date(entry.timestamp).toLocaleString('zh-CN', {month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                        <span className="text-[9px] text-heart-400">♥ {Math.round(entry.affection)}</span>
                      </div>
                      <p className="text-xs text-mist-200 leading-relaxed italic">{entry.content}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 记忆面板 */}
      {showMemories && state.memories.length > 0 && (
        <div className="absolute top-20 left-4 right-4 z-30 mx-auto max-w-md animate-slide-up">
          <div className="glass-strong rounded-2xl p-4 shadow-2xl border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-mist-300 font-medium">{character.name} 记得的事</span>
              <button onClick={() => setShowMemories(false)} className="text-mist-500 hover:text-white text-xs">关闭</button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {state.memories.slice().reverse().map((mem, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-[9px] text-heart-400 mt-0.5 flex-shrink-0">♡</span>
                  <p className="text-[11px] text-mist-300 leading-relaxed">{mem}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 升级提示 */}
      {showStageUp && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30 animate-bounce-in pointer-events-none">
          <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-heart-600/90 to-rose-500/90 backdrop-blur shadow-2xl shadow-heart-500/25 text-center">
            <p className="text-sm font-bold text-white">关系升级 · {STAGE_LABELS[stage]}</p>
          </div>
        </div>
      )}

      {/* 主要内容 */}
      <div className="relative flex-1 flex overflow-hidden">
        <div className="hidden md:flex flex-col items-center justify-center w-56 flex-shrink-0 px-4">
          <div className="relative transition-all duration-700" style={{ filter: EMOTION_FILTERS[currentEmotion] }}>
            <div className="absolute -inset-4 rounded-full blur-2xl transition-all duration-700"
              style={{ background: EMOTION_GLOW[currentEmotion] || 'transparent' }} />
            <img src={character.avatarUrl || ''} alt={character.name}
              className={`w-40 h-52 rounded-2xl object-cover shadow-2xl transition-all duration-700 ${animStyle.bodyClass} ring-1 ring-white/[0.06]`}
              style={{ boxShadow: `0 0 40px ${EMOTION_GLOW[currentEmotion] || 'transparent'}` }} />
          </div>
          <div className={`mt-3 text-[10px] text-mist-500 ${animStyle.idle}`}>
            {currentEmotion === 'happy' && '♡ 心情不错'}
            {currentEmotion === 'shy' && '... 有点害羞'}
            {currentEmotion === 'love' && '❤ 心跳加速'}
            {currentEmotion === 'neutral' && '静静地看着你'}
            {currentEmotion === 'surprised' && '! 有点意外'}
            {currentEmotion === 'sad' && '.. 有点低落'}
            {currentEmotion === 'teasing' && '^ 想逗你玩'}
            {currentEmotion === 'angry' && '!! 有点生气'}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div key={msg.id} className={`flex gap-2.5 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
                  {!isUser && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10 md:hidden">
                      <img src={character.avatarUrl || ''} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className={`max-w-[80%]`}>
                    <div className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-heart-600 to-rose-500 text-white rounded-2xl rounded-br-md'
                        : 'bg-white/[0.04] border border-white/[0.04] text-mist-200 rounded-2xl rounded-bl-md'
                    }`}>
                      {msg.content}
                      {!isUser && ['love','happy','shy','teasing'].includes(msg.emotion) && (
                        <span className="ml-1" style={{color:EMOTION_GLOW[msg.emotion]||'#f472b6'}}>
                          {msg.emotion === 'love' ? ' ❤' : msg.emotion === 'happy' ? ' ♡' : msg.emotion === 'shy' ? ' ...' : ' ^'}
                        </span>
                      )}
                    </div>
                    {!isUser && msg.affectionDelta && msg.affectionDelta !== 0 && (
                      <div className={`text-[10px] mt-0.5 ml-1.5 ${msg.affectionDelta > 0 ? 'text-heart-400' : 'text-red-400'}`}>
                        {msg.affectionDelta > 0 ? '+' : ''}{msg.affectionDelta}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-2.5 animate-fade-in">
                <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10">
                  <img src={character.avatarUrl || ''} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="bg-white/[0.04] border border-white/[0.04] rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-bounce" style={{animationDelay:'0ms'}} />
                    <div className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-bounce" style={{animationDelay:'150ms'}} />
                    <div className="w-1.5 h-1.5 rounded-full bg-mist-500 animate-bounce" style={{animationDelay:'300ms'}} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 3 && (
            <div className="flex-shrink-0 px-4 pb-2 flex gap-2 overflow-x-auto">
              {QUICK_ACTIONS.map(action => (
                <button key={action} onClick={() => handleSend(action)}
                  className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs text-mist-400 bg-white/[0.03] border border-white/[0.06]
                    hover:border-heart-500/30 hover:text-heart-300 hover:bg-white/[0.06] transition-all">
                  {action}
                </button>
              ))}
            </div>
          )}

          <div className="flex-shrink-0 px-4 pb-3 pt-1">
            {/* 语音错误提示 */}
            {voiceError && (
              <div className="mb-1.5 px-3 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 text-center">
                {voiceError}
              </div>
            )}
            <div className="flex items-end gap-2">
              {/* 麦克风按钮 */}
              {voiceSupported && (
                <button
                  onPointerDown={() => { if (voiceState === 'idle') startVoice(); }}
                  onPointerUp={() => { if (voiceState === 'listening') stopVoice(); }}
                  onPointerLeave={() => { if (voiceState === 'listening') stopVoice(); }}
                  onClick={() => {
                    // fallback for desktop click
                    if (voiceState === 'idle') startVoice();
                  }}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    voiceState === 'listening'
                      ? 'bg-red-500/20 border border-red-500/50 animate-pulse'
                      : 'bg-white/5 border border-white/10 hover:border-heart-500/30'
                  }`}
                  title="按住说话"
                >
                  {voiceState === 'listening' ? (
                    <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-mist-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  )}
                </button>
              )}

              {/* TTS 开关 */}
              {ttsSupported && (
                <button
                  onClick={() => setVoiceOn(!voiceOn)}
                  className={`w-8 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                    voiceOn ? 'text-heart-400 bg-heart-500/10 border border-heart-500/20' : 'text-mist-600 bg-white/[0.02] border border-white/[0.03]'
                  }`}
                  title={voiceOn ? '关闭语音播放' : '开启语音播放'}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    {!voiceOn && (
                      <>
                        <line x1="23" y1="9" x2="17" y2="15"/>
                        <line x1="17" y1="9" x2="23" y2="15"/>
                      </>
                    )}
                    {voiceOn && (
                      <>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                      </>
                    )}
                  </svg>
                </button>
              )}

              <textarea
                value={voiceState === 'listening' ? voiceInterim || input : input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={voiceState === 'listening'
                  ? (voiceInterim ? '松开发送…' : '正在听…')
                  : voiceSupported
                    ? `对${character.name}说点什么… 或按住🎤说话`
                    : `对${character.name}说点什么…`}
                rows={1}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white
                  placeholder:text-mist-600 focus:outline-none focus:border-heart-500/50 focus:ring-1 focus:ring-heart-500/20
                  transition-all resize-none max-h-24"
                style={{
                  lineHeight: '1.4',
                  ...(voiceState === 'listening' ? { borderColor: 'rgba(239,68,68,0.4)', boxShadow: '0 0 12px rgba(239,68,68,0.1)' } : {})
                }}
              />
              <button onClick={() => {
                if (voiceState === 'listening') {
                  stopVoice();
                  if (voiceInterim) setInput(voiceInterim);
                  // 给一点时间让 final result 进来
                  setTimeout(() => {
                    const txt = voiceInterim || input;
                    if (txt.trim()) handleSend(txt);
                  }, 200);
                } else {
                  handleSend(input);
                }
              }} disabled={!input.trim() && !voiceInterim.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-heart-500 to-rose-500 flex items-center justify-center
                  flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed hover:from-heart-400 hover:to-rose-400
                  transition-all shadow-lg shadow-heart-500/20">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 移动端底部角色条 */}
      <div className="relative md:hidden flex-shrink-0 px-4 py-2 bg-[#0f0a1a]/90 border-t border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img src={character.avatarUrl || ''} alt={character.name}
              className={`w-9 h-12 rounded-xl object-cover transition-all duration-700 ${animStyle.idle}`}
              style={{filter:EMOTION_FILTERS[currentEmotion]}} />
            <div className="absolute -inset-2 rounded-xl blur-md transition-all duration-700"
              style={{background:EMOTION_GLOW[currentEmotion]||'transparent'}} />
          </div>
          <div className="flex-1">
            <div className="text-xs text-mist-300">{character.name}</div>
            <div className="text-[10px] text-mist-500">{scene.name} · {['happy','love'].includes(currentEmotion) ? '心情不错' : currentEmotion === 'shy' ? '有点害羞' : currentEmotion === 'neutral' ? '静静看着你' : currentEmotion === 'sad' ? '有点低落' : ''}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-heart-400 font-mono">{Math.round(affection)}</div>
            <div className="text-[9px] text-mist-600">{STAGE_LABELS[stage]}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
