export interface CharacterPersonality {
  extraversion: number;    // 外向性
  sensitivity: number;     // 敏感度
  warmth: number;          // 温暖度
  elegance: number;        // 优雅度
  playfulness: number;     // 俏皮度
}

export interface MotionProfile {
  speed: number;
  amplitude: number;
  poseBias: number;
  transitionMs: number;
  gazeDuration: number;
  microTrigger: number;
}

export type EmotionState = 'neutral' | 'happy' | 'shy' | 'surprised' | 'sad' | 'angry' | 'love' | 'teasing';

export type RelationshipStage = 'stranger' | 'acquainted' | 'friend' | 'close' | 'intimate';

export interface CharacterData {
  name: string;
  description: string;
  personality: CharacterPersonality;
  motionProfile: MotionProfile;
  avatarUrl: string | null;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'character';
  emotion: EmotionState;
  timestamp: number;
  affectionDelta?: number;
}

export interface GameState {
  character: CharacterData | null;
  messages: Message[];
  affection: number;
  currentEmotion: EmotionState;
  stage: RelationshipStage;
  memories: string[];
  currentScene: string;
  diaries: DiaryEntry[];
}

export interface DiaryEntry {
  id: string;
  content: string;
  scene: string;
  timestamp: number;
  affection: number;
}

export interface PersonalityTrait {
  key: keyof CharacterPersonality;
  label: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

export const PERSONALITY_TRAITS: PersonalityTrait[] = [
  {
    key: 'extraversion',
    label: '外向性',
    description: '主动还是安静',
    lowLabel: '安静内敛',
    highLabel: '活泼外放',
  },
  {
    key: 'sensitivity',
    label: '敏感度',
    description: '细腻还是淡然',
    lowLabel: '坦然大度',
    highLabel: '细腻敏感',
  },
  {
    key: 'warmth',
    label: '温暖度',
    description: '亲切还是清冷',
    lowLabel: '清冷疏离',
    highLabel: '温暖亲切',
  },
  {
    key: 'elegance',
    label: '优雅度',
    description: '自然还是讲究',
    lowLabel: '随性自然',
    highLabel: '优雅讲究',
  },
  {
    key: 'playfulness',
    label: '俏皮度',
    description: '认真还是爱玩',
    lowLabel: '认真严肃',
    highLabel: '古灵精怪',
  },
];

export const STAGE_THRESHOLDS: Record<RelationshipStage, number> = {
  stranger: 0,
  acquainted: 20,
  friend: 45,
  close: 70,
  intimate: 90,
};

export const STAGE_LABELS: Record<RelationshipStage, string> = {
  stranger: '陌生人',
  acquainted: '相识',
  friend: '朋友',
  close: '亲密',
  intimate: '恋人',
};
