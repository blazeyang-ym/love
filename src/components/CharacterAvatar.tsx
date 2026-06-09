import { EmotionState, CharacterPersonality } from '../types';

interface Props {
  emotion: EmotionState;
  profile: CharacterPersonality;
  name: string;
}

const emotionColors: Record<EmotionState, string> = {
  neutral: '#94a3b8',
  happy: '#fbbf24',
  shy: '#f472b6',
  surprised: '#60a5fa',
  sad: '#818cf8',
  angry: '#f87171',
  love: '#f43f5e',
  teasing: '#f97316',
};

const emotionGlows: Record<EmotionState, string> = {
  neutral: 'rgba(148,163,184,0.1)',
  happy: 'rgba(251,191,36,0.2)',
  shy: 'rgba(244,114,182,0.12)',
  surprised: 'rgba(96,165,250,0.15)',
  sad: 'rgba(129,140,248,0.1)',
  angry: 'rgba(248,113,113,0.12)',
  love: 'rgba(244,63,94,0.25)',
  teasing: 'rgba(249,115,22,0.15)',
};

export default function CharacterAvatar({ emotion, profile, name }: Props) {
  const color = emotionColors[emotion];
  const glow = emotionGlows[emotion];

  // 根据性格决定眼睛大小和形状
  const eyeW = 8 + profile.extraversion * 4;
  const eyeH = 10 + profile.sensitivity * 3;
  const pupilOffset = (1 - profile.warmth / 1000) * 2;
  const smileOffset = profile.warmth * 4;

  return (
    <div className="relative">
      {/* 光晕 */}
      <div
        className="absolute -inset-4 rounded-full blur-xl transition-all duration-700"
        style={{ background: glow }}
      />

      {/* SVG 角色 */}
      <svg width="96" height="120" viewBox="0 0 96 120" className="transition-all duration-500">
        {/* 头发 - 性格影响发型风格 */}
        <g opacity={0.9}>
          {profile.elegance > 0.6 ? (
            <>
              <path d="M20 50 Q18 30 28 20 Q38 10 48 8 Q58 10 68 20 Q78 30 76 50 L76 30 Q74 18 60 14 Q48 12 36 14 Q22 18 20 30 Z"
                    fill={color} opacity="0.6" />
              <path d="M22 30 Q24 22 36 18 Q48 15 60 18 Q72 22 74 30"
                    fill="none" stroke={color} strokeWidth="1.5" opacity="0.3" />
            </>
          ) : profile.playfulness > 0.6 ? (
            <>
              <path d="M18 52 Q16 28 26 18 Q36 8 48 6 Q60 8 70 18 Q80 28 78 52 L78 28 Q76 16 62 12 Q48 9 34 12 Q20 16 18 28 Z"
                    fill={color} opacity="0.6" />
              <circle cx="30" cy="16" r="4" fill={color} opacity="0.3" />
              <circle cx="66" cy="16" r="4" fill={color} opacity="0.3" />
            </>
          ) : (
            <path d="M20 50 Q18 32 26 22 Q34 12 48 10 Q62 12 70 22 Q78 32 76 50 L76 32 Q74 20 62 16 Q48 14 34 16 Q22 20 20 32 Z"
                  fill={color} opacity="0.6" />
          )}
        </g>

        {/* 脸 */}
        <ellipse cx="48" cy="52" rx="28" ry="32" fill="white" opacity="0.9" />

        {/* 眼睛 - 性格影响大小和形状 */}
        <g>
          {/* 左眼 */}
          <ellipse cx="36" cy="48" rx={eyeW - 2} ry={eyeH - 1} fill="white" />
          <ellipse cx="36" cy="48" rx={eyeW - 3} ry={eyeH - 2} fill="#1a1a2e" />
          <circle cx={36 + pupilOffset} cy={47} r={eyeW - 5} fill="white" opacity="0.6" />

          {/* 右眼 */}
          <ellipse cx="60" cy="48" rx={eyeW - 2} ry={eyeH - 1} fill="white" />
          <ellipse cx="60" cy="48" rx={eyeW - 3} ry={eyeH - 2} fill="#1a1a2e" />
          <circle cx={60 + pupilOffset} cy={47} r={eyeW - 5} fill="white" opacity="0.6" />
        </g>

        {/* 眉毛 - 情绪驱动 */}
        {emotion === 'happy' || emotion === 'love' || emotion === 'teasing' ? (
          <>
            <path d={`M28 40 Q34 36 42 39`} fill="none" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
            <path d={`M54 39 Q62 36 68 40`} fill="none" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
          </>
        ) : emotion === 'sad' || emotion === 'shy' ? (
          <>
            <path d={`M28 40 Q34 44 42 41`} fill="none" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
            <path d={`M54 41 Q62 44 68 40`} fill="none" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
          </>
        ) : emotion === 'surprised' ? (
          <>
            <path d={`M28 38 Q36 34 44 38`} fill="none" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
            <path d={`M52 38 Q60 34 68 38`} fill="none" stroke="#475569" strokeWidth="1.4" strokeLinecap="round" />
          </>
        ) : (
          <>
            <path d={`M28 40 Q36 37 44 40`} fill="none" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
            <path d={`M52 40 Q60 37 68 40`} fill="none" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
          </>
        )}

        {/* 腮红 - 羞涩时 */}
        {(emotion === 'shy' || emotion === 'love' || emotion === 'happy') && (
          <>
            <ellipse cx="28" cy="58" rx="6" ry="3" fill={color} opacity={emotion === 'shy' ? 0.3 : 0.12} />
            <ellipse cx="68" cy="58" rx="6" ry="3" fill={color} opacity={emotion === 'shy' ? 0.3 : 0.12} />
          </>
        )}

        {/* 嘴巴 */}
        {emotion === 'happy' || emotion === 'love' ? (
          <path d={`M38 62 Q48 72 58 62`} fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        ) : emotion === 'shy' ? (
          <path d={`M40 62 Q48 64 56 62`} fill="none" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
        ) : emotion === 'surprised' ? (
          <ellipse cx="48" cy="63" rx="5" ry="4" fill="none" stroke="#475569" strokeWidth="1.2" />
        ) : emotion === 'sad' ? (
          <path d={`M38 65 Q48 60 58 65`} fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
        ) : emotion === 'teasing' ? (
          <g>
            <path d={`M36 62 Q48 68 60 62`} fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M46 56 L44 57" stroke="#475569" strokeWidth="1" strokeLinecap="round" />
          </g>
        ) : (
          <line x1="40" y1="63" x2="56" y2="63" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" />
        )}

        {/* 脖子 */}
        <rect x="42" y="80" width="12" height="6" rx="3" fill="#f5e6d3" />

        {/* 肩膀 - 性格影响姿态 */}
        {profile.extraversion < 0.4 ? (
          <path d="M16 86 Q30 90 48 90 Q66 90 80 86" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
        ) : (
          <path d="M12 84 Q30 88 48 88 Q66 88 84 84" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3" />
        )}
      </svg>

      {/* 名字标签 */}
      <div className="text-center mt-1">
        <span className="text-[10px] text-mist-400">{name}</span>
      </div>
    </div>
  );
}
