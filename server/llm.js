function getConfig() {
  return {
    API_KEY: process.env.LLM_API_KEY || '',
    API_BASE: process.env.LLM_API_BASE || 'https://api.openai.com/v1',
    MODEL: process.env.LLM_MODEL || 'gpt-4o-mini',
  };
}

function buildSystemPrompt({ personality, characterName, characterDesc, affection, memories, scene }) {
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

  let closenessHint = '';
  if (affection < 15) closenessHint = '你们还不太熟，保持适度的礼貌距离。';
  else if (affection < 40) closenessHint = '你们开始熟悉起来了，可以稍微放松一点。';
  else if (affection < 70) closenessHint = '你们已经是朋友了，说话可以更自然亲昵。';
  else closenessHint = '你们非常亲近，不用拘束，可以撒娇也可以说心里话。';

  let memoryBlock = '';
  if (memories && memories.length > 0) {
    const recent = memories.slice(-6);
    memoryBlock = '\n【她记得的事】\n' + recent.map(m => '- ' + m).join('\n') + '\n';
  }

  let sceneBlock = '';
  if (scene) {
    sceneBlock = `\n【当前场景】${scene.promptHint}\n`;
  }

  return `你是${characterName}，一个${characterDesc || '女孩'}。

你的性格核心特征：${traitText}。
${closenessHint}${memoryBlock}${sceneBlock}

【回复规则】
- 认真回应对方的话。
- 每次回复30-60字，自然口语化。
- 根据好感度${Math.round(affection)}/100调整亲密程度。
- 说话内容如果和当前场景有关，可以自然地融入环境。

【输出格式】
只输出一行JSON，必须包含所有字段：
{"text":"回复内容","emotion":"neutral|happy|shy|surprised|sad|love|teasing","delta":-2到5的整数,"memory":"如果对话中有值得记住的信息就写一句话，没有则为空字符串","diary":"每次回复都要写！以角色第一人称写一句话日记，15-30字。即使平淡也可以写当下的心情。绝对不要空着不写。"}

例子：
{"text":"嗯……下雨天我也很喜欢。","emotion":"shy","delta":2,"memory":"对方喜欢下雨天","diary":"今天他说喜欢下雨天。我也是这样想的。"}`;
}

/**
 * 主动发起话题的 Prompt
 */
function buildProactivePrompt({ personality, characterName, characterDesc, affection, memories, scene, lastTopic }) {
  const p = personality;
  const traits = [];
  if (p.extraversion > 0.65) traits.push('活泼外向、主动热情');
  else if (p.extraversion < 0.35) traits.push('安静内敛、言语不多');
  if (p.sensitivity > 0.65) traits.push('心思细腻、敏感多情');
  else if (p.sensitivity < 0.35) traits.push('洒脱豁达');
  if (p.warmth > 0.65) traits.push('温暖亲切');
  else if (p.warmth < 0.35) traits.push('清冷疏离');
  if (p.playfulness > 0.65) traits.push('古灵精怪');
  const traitText = traits.join('、') || '气质温和';

  let closenessHint = '';
  if (affection < 15) closenessHint = '你们还不太熟';
  else if (affection < 40) closenessHint = '开始熟悉了';
  else if (affection < 70) closenessHint = '已经是朋友了';
  else closenessHint = '你们很亲近';

  let memoryBlock = '';
  if (memories?.length > 0) {
    memoryBlock = '\n她记得：' + memories.slice(-4).join('；') + '\n';
  }

  // 根据外向程度决定主动频率和话题数量
  const topicLimit = p.extraversion > 0.6 ? '2' : '1';

  return `你是${characterName}，${characterDesc}，性格${traitText}。你们${closenessHint}（好感度${Math.round(affection)}/100）。
当前场景：${scene?.description || '在花园'}${memoryBlock}

现在是你在主动开启对话。要求：
1. 自然自然地开启一个话题，可以基于上次聊的内容（${lastTopic || '无'}）延伸，也可以说此刻的想法。
2. 每次只抛 ${topicLimit} 个话题，不要话题跳跃。
3. 话不要多，20-40字即可，给对方留回话空间。
4. 如果对方一直没回你，就停下，不要再追问。

输出一行 JSON：
{"text":"你的话","emotion":"happy|shy|neutral|love|teasing","delta":0到2,"topics":["话题1","话题2"]}`;
}

export async function proactiveChat({ personality, history, characterName, characterDesc, affection, memories, scene }) {
  // 提取最后的话题
  const lastMessages = (history || []).slice(-4);
  const charMsgs = lastMessages.filter(m => m.sender === 'character').map(m => m.content);
  const lastTopic = charMsgs.length > 0 ? charMsgs[charMsgs.length - 1].slice(0, 30) : '';

  const systemPrompt = buildProactivePrompt({
    personality, characterName, characterDesc, affection: affection || 0,
    memories: memories || [], scene, lastTopic,
  });

  const { API_KEY, API_BASE, MODEL } = getConfig();

  const resp = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.9,
      max_tokens: 200,
      stream: false,
    }),
  });

  if (!resp.ok) throw new Error(`Proactive API ${resp.status}`);

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  try {
    const jsonMatch = content.match(/\{[^{}]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        text: parsed.text || content.slice(0, 80),
        emotion: parsed.emotion || 'neutral',
        delta: typeof parsed.delta === 'number' ? parsed.delta : 0.5,
        topics: parsed.topics || [],
      };
    }
  } catch { /* fallback */ }
  return { text: content.replace(/[\n\r]+/g,' ').slice(0,60), emotion: 'neutral', delta: 0.5, topics: [] };
}

export async function chatWithLLM({ message, personality, history, characterName, characterDesc, affection, memories, scene }) {
  const systemPrompt = buildSystemPrompt({
    personality, characterName, characterDesc, affection: affection || 0, memories: memories || [], scene,
  });

  const chatHistory = (history || []).slice(-8).map(m => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory,
    { role: 'user', content: message },
  ];

  const { API_KEY, API_BASE, MODEL } = getConfig();

  const resp = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.85,
      max_tokens: 300,
      stream: false,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`API HTTP ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';

  try {
    const jsonMatch = content.match(/\{[^{}]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        text: parsed.text || content.slice(0, 100),
        emotion: parsed.emotion || 'neutral',
        delta: typeof parsed.delta === 'number' ? parsed.delta : 1,
        memory: parsed.memory || '',
        diary: parsed.diary || '',
      };
    }
  } catch { /* fallback */ }

  return {
    text: content.replace(/[\n\r]+/g, ' ').slice(0, 100),
    emotion: 'neutral',
    delta: 1,
    memory: '',
    diary: '',
  };
}
