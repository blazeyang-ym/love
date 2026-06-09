import { CharacterPersonality, MotionProfile, EmotionState } from '../types';

export function computeMotionProfile(p: CharacterPersonality): MotionProfile {
  return {
    speed:        clamp(0.4 + p.extraversion * 0.5 - p.elegance * 0.2 + p.playfulness * 0.2, 0.3, 1.5),
    amplitude:    clamp(0.3 + p.extraversion * 0.6 - p.sensitivity * 0.15 + p.playfulness * 0.2, 0.3, 1.2),
    poseBias:     clamp(p.warmth * 0.6 + p.extraversion * 0.3 - p.elegance * 0.1, 0, 1),
    transitionMs: Math.round(600 - p.extraversion * 200 - p.playfulness * 100 + p.elegance * 150),
    gazeDuration: Math.round(800 + p.warmth * 1000 - p.sensitivity * 300 + p.playfulness * 200),
    microTrigger: clamp(0.1 + p.sensitivity * 0.6 - p.extraversion * 0.2, 0.1, 0.8),
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface AnimationStyle {
  idle: string;
  incoming: string;
  bodyClass: string;
  intensity: number;
}

export function getAnimationForEmotion(
  emotion: EmotionState,
  profile: MotionProfile,
  affection: number
): AnimationStyle {
  const intensity = clamp(affection / 100 + profile.amplitude * 0.2, 0.2, 1);

  switch (emotion) {
    case 'neutral':
      return {
        idle: profile.speed < 0.7 ? 'animate-sigh' : 'animate-float',
        incoming: 'animate-fade-in',
        bodyClass: profile.poseBias < 0.4 ? 'scale-95 opacity-80' : 'scale-100 opacity-100',
        intensity,
      };
    case 'happy':
      return {
        idle: profile.amplitude > 0.7 ? 'animate-float' : 'animate-pulse-soft',
        incoming: 'animate-bounce-in',
        bodyClass: 'scale-105',
        intensity,
      };
    case 'shy':
      return {
        idle: 'animate-look-away',
        incoming: 'animate-slide-up',
        bodyClass: profile.poseBias < 0.4 ? 'translate-x-[-4px] scale-95' : 'scale-[0.97]',
        intensity,
      };
    case 'surprised':
      return {
        idle: 'animate-float',
        incoming: 'animate-bounce-in',
        bodyClass: 'scale-110',
        intensity,
      };
    case 'sad':
      return {
        idle: 'animate-sigh',
        incoming: 'animate-fade-in',
        bodyClass: profile.poseBias < 0.4 ? 'scale-90 opacity-60' : 'scale-95 opacity-70',
        intensity,
      };
    case 'love':
      return {
        idle: 'animate-heartbeat',
        incoming: 'animate-bounce-in',
        bodyClass: 'scale-110 brightness-110',
        intensity: Math.min(1, intensity * 1.2),
      };
    case 'teasing':
      return {
        idle: 'animate-float',
        incoming: 'animate-bounce-in',
        bodyClass: 'rotate-[-3deg] scale-105',
        intensity: profile.microTrigger * intensity,
      };
    case 'angry':
      return {
        idle: 'animate-pulse-soft',
        incoming: 'animate-slide-up',
        bodyClass: 'scale-105 [filter:brightness(0.9)_saturate(1.2)]',
        intensity,
      };
  }
}
