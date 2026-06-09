import { CharacterPersonality, EmotionState } from '../types';

interface ResponseEntry {
  emotion: EmotionState;
  text: string;
  delta: number;
}

const responsePool: Record<string, ResponseEntry[]> = {
  // 性格关键词 → 回复池
  greeting: [
    { emotion: 'happy', text: '啊，你来了！我正想着你呢。', delta: 2 },
    { emotion: 'shy', text: '……你来了呀。', delta: 1.5 },
    { emotion: 'neutral', text: '嗯，你来了。', delta: 1 },
    { emotion: 'teasing', text: '哟，舍得来找我了？', delta: 1.5 },
    { emotion: 'happy', text: '你来啦！今天过得怎么样？', delta: 2 },
  ],
  compliment: [
    { emotion: 'shy', text: '别……别突然说这种话啦……', delta: 4 },
    { emotion: 'happy', text: '你这么说，我有点开心呢。', delta: 3 },
    { emotion: 'teasing', text: '今天嘴这么甜，是不是做了什么亏心事？', delta: 2.5 },
    { emotion: 'love', text: '你这样说，我会当真的哦。', delta: 5 },
    { emotion: 'shy', text: '……你这个人真是的。（低头笑了笑）', delta: 3.5 },
  ],
  teasing: [
    { emotion: 'teasing', text: '哼，你才笨呢！', delta: 1 },
    { emotion: 'angry', text: '你再说一遍试试？', delta: -1 },
    { emotion: 'shy', text: '……不理你了。', delta: 0.5 },
    { emotion: 'happy', text: '你也就嘴上厉害。', delta: 1.5 },
    { emotion: 'love', text: '虽然你讨人厌，但我好像习惯了。', delta: 2 },
  ],
  sad: [
    { emotion: 'sad', text: '……今天心情不太好。', delta: 0 },
    { emotion: 'neutral', text: '我没事。你不用担心。', delta: 1 },
    { emotion: 'sad', text: '你能来陪我一会儿吗……', delta: 3 },
    { emotion: 'shy', text: '其实……看到你来了，好了一点点。', delta: 2.5 },
  ],
  deep: [
    { emotion: 'love', text: '你对我而言，好像越来越特别了。', delta: 5 },
    { emotion: 'shy', text: '有些话……我不知道该不该说。', delta: 3 },
    { emotion: 'neutral', text: '我在想，人为什么会喜欢上另一个人呢。', delta: 2 },
    { emotion: 'happy', text: '和你说话的时候，时间过得特别快。', delta: 3 },
  ],
  playful: [
    { emotion: 'teasing', text: '我们来玩个游戏吧？输的人要答应对方一个要求。', delta: 2 },
    { emotion: 'happy', text: '你猜我今天遇到了什么有趣的事？', delta: 1.5 },
    { emotion: 'love', text: '和你在一起的时候，做什么都开心。', delta: 3 },
  ],
  silence: [
    { emotion: 'shy', text: '……（安静地看着你）', delta: 1 },
    { emotion: 'neutral', text: '不说话也可以，就这样待着吧。', delta: 2 },
    { emotion: 'happy', text: '安静地待在一起，也很舒服呢。', delta: 2.5 },
  ],
};

function pickWeighted(entries: ResponseEntry[]): ResponseEntry {
  return entries[Math.floor(Math.random() * entries.length)];
}

function scoreResponse(entry: ResponseEntry, p: CharacterPersonality): number {
  let score = 1;
  const emotion = entry.emotion;

  // 性格匹配：某些性格对该情绪有偏好
  if (emotion === 'shy' || emotion === 'love') {
    score += p.sensitivity * 0.5;
    score += p.warmth * 0.3;
  }
  if (emotion === 'teasing') {
    score += p.playfulness * 0.8;
    score += p.extraversion * 0.3;
  }
  if (emotion === 'happy') {
    score += p.extraversion * 0.4;
    score += p.warmth * 0.3;
  }
  if (emotion === 'sad' || emotion === 'neutral') {
    score += p.sensitivity * 0.3;
    score += (1 - p.extraversion) * 0.3;
  }
  if (emotion === 'angry') {
    score += (1 - p.warmth) * 0.5;
    score += p.sensitivity * 0.2;
  }

  // 高好感度时倾向正面情绪
  return score;
}

export function generateResponse(
  userMessage: string,
  personality: CharacterPersonality,
  affection: number
): { text: string; emotion: EmotionState; delta: number } {
  // 简单意图分类（关键词匹配）
  let poolKey: string;
  const msg = userMessage.toLowerCase();

  if (/好看|漂亮|可爱|喜欢|爱|美|迷人|心动/.test(msg)) {
    poolKey = 'compliment';
  } else if (/开玩笑|讨厌|笨|傻瓜|坏蛋|欠揍/.test(msg)) {
    poolKey = 'teasing';
  } else if (/难过|伤心|哭|累|不开心|郁闷/.test(msg)) {
    poolKey = 'sad';
  } else if (/想你了|在吗|hi|hello|嗨|你好|早安|晚安/.test(msg)) {
    poolKey = 'greeting';
  } else if (/人生|意义|未来|如果|可能|永远|时间/.test(msg)) {
    poolKey = 'deep';
  } else if (/游戏|玩|赌|打赌|冒险/.test(msg)) {
    poolKey = 'playful';
  } else if (/[。.！!？?]$/.test(msg) || msg.length < 3) {
    poolKey = 'silence';
  } else {
    // 随机fallback
    const keys = ['greeting', 'deep', 'silence', 'playful'];
    poolKey = keys[Math.floor(Math.random() * keys.length)];
  }

  const pool = responsePool[poolKey] || responsePool.greeting;

  // 按性格排序：选择最符合性格的回复
  const scored = pool
    .map(e => ({ ...e, score: scoreResponse(e, personality) }))
    .sort((a, b) => b.score - a.score);

  // 取top3之一，有点随机性但不脱离性格
  const top = scored.slice(0, 3);
  const chosen = top[Math.floor(Math.random() * Math.min(top.length, 3))];

  // 好感度调节好感度增量
  let delta = chosen.delta;
  if (affection > 70) {
    delta *= 1.2;
  } else if (affection < 20 && delta > 0) {
    delta *= 0.7;
  }

  return {
    text: chosen.text,
    emotion: chosen.emotion,
    delta: Math.round(delta * 10) / 10,
  };
}
