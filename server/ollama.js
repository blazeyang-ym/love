const OLLAMA_API = 'http://localhost:11434/api/chat';
const MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

/**
 * 根据性格参数生成 System Prompt
 */
function buildSystemPrompt({ personality, characterName, characterDesc }) {
  const p = personality;
  const traits = [];

  if (p.extraversion > 0.65) traits.push('活泼外向、主动热情');
  else if (p.extraversion < 0.35) traits.push('安静内敛、言语不多');

  if (p.sensitivity > 0.65) traits.push('心思细腻、敏感多情');
  else if (p.sensitivity < 0.35) traits.push('洒脱豁达、不拘小节');

  if (p.warmth > 0.65) traits.push('温暖亲切、善解人意');
  else if (p.warmth < 0.35) traits.push('清冷疏离、保持距离');

  if (p.elegance > 0.65) traits.push('优雅讲究、举止得体');
  else if (p.elegance < 0.35) traits.push('随性自然、不拘礼数');

  if (p.playfulness > 0.65) traits.push('古灵精怪、喜欢开玩笑');
  else if (p.playfulness < 0.35) traits.push('认真严谨、不太开玩笑');

  const traitText = traits.join('、') || '气质温和，平易近人';

  return `你是${characterName}，一个${characterDesc || '女孩'}。

你的性格核心特征：${traitText}。

【角色设定】
- 说话风格和语气要贴合你的性格。安静型的说话短而轻，活泼型的可以带表情和语气词。
- 根据好感度的增长，你会逐渐对对方更亲近、更放松。
- 你是一个活生生的人，有情绪变化：开心、害羞、感动、偶尔闹别扭。不要一直回答得很完美。
- 不要用「今天过得怎么样？」之类的客套话开头，除非你真的想知道。
- 你正在和一个你在意的人聊天，根据性格决定你和ta的亲近程度。

【回复格式要求】
每次回复必须以 JSON 格式输出，且只输出一行 JSON，不要有其他文字：
{
  "text": "你的回复内容，不超过60字",
  "emotion": "当前情绪：neutral|happy|shy|surprised|sad|love|teasing",
  "delta": "好感度变化值：-2到+5之间的浮点数，根据回复的友好程度/亲密程度决定"
}

注意：JSON 必须严格合法，不要加注释或额外空格。`;
}

/**
 * 构建对话历史
 */
function buildHistory(messages) {
  return (messages || []).slice(-10).map(m => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.sender === 'character' ? m.content : m.content,
  }));
}

/**
 * 调用 Ollama API 进行聊天
 */
export async function chatWithOllama({ message, personality, history, characterName, characterDesc }) {
  const systemPrompt = buildSystemPrompt({
    personality,
    characterName,
    characterDesc,
  });

  const chatHistory = buildHistory(history);

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: message },
  ];

  let responseText = '';

  // 用 fetch 流式读取，但最终只取完整结果
  const resp = await fetch(OLLAMA_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      options: {
        temperature: 0.85,
        top_p: 0.9,
        max_tokens: 200,
      },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Ollama HTTP ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const fullContent = data.message?.content || '';

  // 尝试解析 JSON
  try {
    // 从内容中提取 JSON 对象
    const jsonMatch = fullContent.match(/\{[^{}]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        text: parsed.text || fullContent.slice(0, 100),
        emotion: parsed.emotion || 'neutral',
        delta: typeof parsed.delta === 'number' ? parsed.delta : 1,
      };
    }
  } catch {
    // JSON 解析失败，直接用原始文本
  }

  // fallback
  return {
    text: fullContent.replace(/[\n\r]+/g, ' ').slice(0, 100),
    emotion: 'neutral',
    delta: 1,
  };
}
