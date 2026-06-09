import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chatWithLLM, proactiveChat } from './llm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 静态文件服务 - 提供前端构建产物
const distPath = path.resolve(__dirname, '..', 'dist');
app.use(express.static(distPath));
// SPA fallback: 所有非API路由返回index.html
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const { message, personality, history, characterName, characterDesc, affection, memories, scene } = req.body;
  if (!message || !personality) {
    return res.status(400).json({ error: '缺少 message 或 personality' });
  }
  try {
    const response = await chatWithLLM({
      message, personality, history: history || [],
      characterName: characterName || '角色', characterDesc: characterDesc || '',
      affection: affection || 0, memories: memories || [], scene: scene || null,
    });
    res.json(response);
  } catch (err) {
    console.error('Chat error:', err.message);
    res.json({ text: '……', emotion: 'neutral', delta: 0.5, memory: '', diary: '' });
  }
});

// 角色主动发起话题
app.post('/api/proactive', async (req, res) => {
  const { personality, history, characterName, characterDesc, affection, memories, scene } = req.body;
  try {
    const response = await proactiveChat({
      personality, history: history || [], characterName: characterName || '角色',
      characterDesc: characterDesc || '', affection: affection || 0,
      memories: memories || [], scene: scene || null,
    });
    res.json(response);
  } catch {
    res.json(null);
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', api: true, keySet: process.env.LLM_API_KEY ? true : false });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('心域服务器运行在 http://localhost:' + PORT);
  console.log('API Key 已设置:', process.env.LLM_API_KEY ? '是' : '否');
  console.log('API Base:', process.env.LLM_API_BASE || 'https://api.openai.com/v1');
  console.log('Model:', process.env.LLM_MODEL || 'gpt-4o-mini');
});
