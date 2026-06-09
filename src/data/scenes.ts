export interface Scene {
  id: string;
  name: string;
  description: string;
  bgGradient: string;
  bgClass: string;
  moodLabel: string;
  affRequired: number;
  promptHint: string;
}

export const SCENES: Scene[] = [
  {
    id: 'garden',
    name: '花园',
    description: '阳光透过树荫洒在草地上',
    bgGradient: 'from-emerald-950/40 via-teal-950/20 to-transparent',
    bgClass: 'bg-gradient-to-b',
    moodLabel: '恬静清新',
    affRequired: 0,
    promptHint: '你们在安静的花园里，阳光温暖，微风轻拂，气氛宁静而美好。',
  },
  {
    id: 'rooftop',
    name: '天台',
    description: '城市灯火在夜色中闪烁',
    bgGradient: 'from-indigo-950/40 via-purple-950/20 to-transparent',
    bgClass: 'bg-gradient-to-b',
    moodLabel: '浪漫夜色',
    affRequired: 15,
    promptHint: '你们在天台上，夜风轻吹，城市灯火在脚下铺开，氛围浪漫而私密。',
  },
  {
    id: 'cafe',
    name: '咖啡厅',
    description: '暖色灯光下咖啡香气缭绕',
    bgGradient: 'from-amber-950/30 via-orange-950/15 to-transparent',
    bgClass: 'bg-gradient-to-b',
    moodLabel: '温暖舒适',
    affRequired: 0,
    promptHint: '你们在安静的咖啡厅里，周围有轻柔的音乐和咖啡香，气氛温暖轻松。',
  },
  {
    id: 'rain',
    name: '雨街',
    description: '雨滴敲打着屋檐，世界安静下来',
    bgGradient: 'from-slate-950/50 via-blue-950/20 to-transparent',
    bgClass: 'bg-gradient-to-b',
    moodLabel: '静谧沉浸',
    affRequired: 25,
    promptHint: '外面下着雨，你们一起躲雨的屋檐下，世界变得很小很安静，只有彼此。',
  },
  {
    id: 'beach',
    name: '海边',
    description: '海浪声和天边的晚霞',
    bgGradient: 'from-cyan-950/30 via-sky-950/15 to-transparent',
    bgClass: 'bg-gradient-to-b',
    moodLabel: '自由浪漫',
    affRequired: 35,
    promptHint: '你们在海边散步，夕阳把海面染成金色，海风咸咸的，轻松而惬意。',
  },
];

export function getScene(id: string): Scene {
  return SCENES.find(s => s.id === id) || SCENES[0];
}
