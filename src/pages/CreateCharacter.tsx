import { useState, useCallback } from 'react';
import { CharacterData, CharacterPersonality, PERSONALITY_TRAITS, STAGE_LABELS } from '../types';

interface SaveSlot {
  id: string;
  name: string;
  savedAt: number;
  characterName: string;
  affection: number;
  stage: string;
  messageCount: number;
  state: any;
}

interface Props {
  onCreated: (char: CharacterData) => void;
  savedGames: SaveSlot[];
  onLoadGame: (slot: SaveSlot) => void;
}

const AVATAR_MAP: Record<string, string> = {
  elegant: '/characters/elegant.png',
  sunny: '/characters/sunny.png',
  gentle: '/characters/gentle.png',
  mysterious: '/characters/mysterious.png',
};

function selectAvatar(p: CharacterPersonality): string {
  // 优雅+内向 → elegant
  // 外向+俏皮+温暖 → sunny
  // 温暖+敏感 → gentle
  // 优雅+低温暖 → mysterious
  const scores = {
    elegant: p.elegance * 0.5 + (1 - p.playfulness) * 0.3 + (1 - p.extraversion) * 0.2,
    sunny: p.extraversion * 0.4 + p.playfulness * 0.3 + p.warmth * 0.3,
    gentle: p.warmth * 0.4 + p.sensitivity * 0.3 + (1 - p.elegance) * 0.3,
    mysterious: p.elegance * 0.3 + (1 - p.warmth) * 0.3 + p.sensitivity * 0.2 + (1 - p.playfulness) * 0.2,
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  return AVATAR_MAP[best];
}

function getPreviewText(p: CharacterPersonality): string {
  const parts: string[] = [];
  if (p.extraversion > 0.6) parts.push('活泼外向');
  if (p.extraversion < 0.35) parts.push('安静内敛');
  if (p.sensitivity > 0.6) parts.push('心思细腻');
  if (p.sensitivity < 0.35) parts.push('洒脱大方');
  if (p.warmth > 0.6) parts.push('温暖亲切');
  if (p.warmth < 0.35) parts.push('清冷疏离');
  if (p.elegance > 0.6) parts.push('优雅讲究');
  if (p.elegance < 0.35) parts.push('随性自然');
  if (p.playfulness > 0.6) parts.push('古灵精怪');
  if (p.playfulness < 0.35) parts.push('认真严谨');
  return parts.join('、') || '气质淡雅';
}

const PRESETS = [
  { name: '霜月', desc: '清冷高岭之花', p: { extraversion: 0.2, sensitivity: 0.7, warmth: 0.2, elegance: 0.9, playfulness: 0.1 } },
  { name: '小阳', desc: '元气小太阳', p: { extraversion: 0.9, sensitivity: 0.3, warmth: 0.8, elegance: 0.2, playfulness: 0.8 } },
  { name: '知予', desc: '邻家温柔姐姐', p: { extraversion: 0.5, sensitivity: 0.6, warmth: 0.8, elegance: 0.5, playfulness: 0.3 } },
  { name: '夜澜', desc: '神秘御姐', p: { extraversion: 0.3, sensitivity: 0.6, warmth: 0.3, elegance: 0.8, playfulness: 0.2 } },
];

export default function CreateCharacter({ onCreated, savedGames, onLoadGame }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState<CharacterPersonality>({
    extraversion: 0.5,
    sensitivity: 0.5,
    warmth: 0.5,
    elegance: 0.5,
    playfulness: 0.5,
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const handlePersonalityChange = useCallback((key: keyof CharacterPersonality, value: number) => {
    setPersonality(prev => ({ ...prev, [key]: value }));
    setAvatarUrl(selectAvatar({ ...personality, [key]: value }));
  }, [personality]);

  const applyPreset = useCallback((preset: typeof PRESETS[0]) => {
    setName(preset.name);
    setDescription(preset.desc);
    setPersonality(preset.p as CharacterPersonality);
    setAvatarUrl(selectAvatar(preset.p as CharacterPersonality));
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    const finalAvatar = avatarUrl || selectAvatar(personality);
    onCreated({
      name: name.trim(),
      description: description.trim() || getPreviewText(personality),
      personality,
      motionProfile: null as any,
      avatarUrl: finalAvatar,
    });
  }, [name, description, personality, avatarUrl, onCreated]);

  return (
    <div className="h-screen flex flex-col bg-[#0f0a1a] overflow-hidden">
      <header className="text-center pt-6 pb-4 flex-shrink-0">
        <h1 className="text-3xl font-light tracking-widest gradient-text">心域</h1>
        <p className="text-xs text-mist-400 mt-0.5 tracking-wide">创造你的专属角色</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-4 max-w-lg mx-auto w-full">
        {/* 形象预览 */}
        {avatarUrl && (
          <div className="text-center mb-5">
            <div className="relative inline-block">
              <img
                src={avatarUrl}
                alt={name || '角色形象'}
                className="w-28 h-36 rounded-2xl object-cover shadow-2xl shadow-heart-500/15 ring-1 ring-white/10"
              />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-heart-500/20 backdrop-blur text-[10px] text-heart-300 whitespace-nowrap">
                {name || '???'}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* 预设快捷 */}
          <div>
            <label className="block text-xs text-mist-400 mb-2">快捷模板</label>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-2 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-heart-500/30
                             hover:bg-white/[0.06] transition-all text-center group"
                >
                  <div className="text-xs text-mist-300 font-medium group-hover:text-heart-300 transition-colors">{p.name}</div>
                  <div className="text-[9px] text-mist-600 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 名称 */}
          <div>
            <label className="block text-xs text-mist-400 mb-1.5">角色名称</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="给她取个名字..."
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white
                         placeholder:text-mist-600 focus:outline-none focus:border-heart-500/50 focus:ring-1 focus:ring-heart-500/20 transition-all"
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-xs text-mist-400 mb-1.5">气质描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="清冷高岭之花 / 元气小太阳 / 邻家温柔姐姐……"
              rows={1}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white
                         placeholder:text-mist-600 focus:outline-none focus:border-heart-500/50 focus:ring-1 focus:ring-heart-500/20 transition-all resize-none"
            />
          </div>

          {/* 性格滑块 */}
          <div>
            <label className="block text-xs text-mist-400 mb-2.5">性格维度</label>
            <div className="space-y-3">
              {PERSONALITY_TRAITS.map(trait => (
                <div key={trait.key}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-mist-300">{trait.label}</span>
                    <span className="text-[10px] text-mist-500">
                      {personality[trait.key] < 0.35 ? trait.lowLabel
                        : personality[trait.key] > 0.65 ? trait.highLabel : '适中'}
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.01"
                    value={personality[trait.key]}
                    onChange={e => handlePersonalityChange(trait.key, parseFloat(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none bg-white/10
                               [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                               [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-heart-500
                               [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-heart-500/30
                               [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                               [&::-webkit-slider-thumb]:hover:scale-110"
                  />
                  <div className="flex justify-between text-[9px] text-mist-700 mt-0.5">
                    <span>{trait.lowLabel}</span>
                    <span>{trait.highLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 性格摘要 */}
          {name && (
            <div className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <p className="text-xs text-mist-400 leading-relaxed">
                <span className="text-heart-300">{name}</span>
                {' — '}一个{getPreviewText(personality)}的{description || '女孩'}
              </p>
            </div>
          )}

          {/* 开始 */}
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full py-3.5 rounded-xl text-sm font-medium transition-all
                       bg-gradient-to-r from-heart-500 to-rose-500 text-white
                       hover:from-heart-400 hover:to-rose-400
                       disabled:opacity-30 disabled:cursor-not-allowed
                       shadow-lg shadow-heart-500/25"
          >
            开始互动
          </button>

          {/* 存档列表 */}
          {savedGames.length > 0 && (
            <div>
              <label className="block text-xs text-mist-400 mb-2">继续之前的旅程</label>
              <div className="space-y-2">
                {savedGames.slice().reverse().map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => onLoadGame(slot)}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]
                               hover:border-heart-500/30 hover:bg-white/[0.06] transition-all text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-mist-200 font-medium">{slot.characterName}</span>
                        <span className="text-[10px] text-mist-500 ml-2">
                          {STAGE_LABELS[slot.stage as keyof typeof STAGE_LABELS] || slot.stage}
                        </span>
                      </div>
                      <span className="text-xs text-heart-400">♥ {slot.affection}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-mist-600">
                      <span>{slot.messageCount} 条消息</span>
                      <span>·</span>
                      <span>{new Date(slot.savedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>·</span>
                      <span>{slot.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
