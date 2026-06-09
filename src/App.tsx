import { useState, useCallback, useRef } from 'react';
import { CharacterData, GameState, Message, RelationshipStage, STAGE_THRESHOLDS, DiaryEntry } from './types';
import { computeMotionProfile } from './utils/animationProfile';
import { generateResponse } from './data/personalityResponses';
import CreateCharacter from './pages/CreateCharacter';
import ChatRoom from './pages/ChatRoom';

const STORAGE_KEY = 'love-game-state';
const SERVER_URL = ''; // 同源部署，使用相对路径

function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch { return null; }
}

function saveState(state: GameState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { }
}

export default function App() {
  const [state, setState] = useState<GameState>(() => loadState() || {
    character: null, messages: [], affection: 0,
    currentEmotion: 'neutral', stage: 'stranger',
    memories: [], currentScene: 'garden', diaries: [],
  });
  const [apiReady, setApiReady] = useState<boolean | null>(null);
  const checked = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;

  useState(() => {
    if (checked.current) return;
    checked.current = true;
    fetch(`${SERVER_URL}/api/health`)
      .then(r => r.json())
      .then(d => setApiReady(d.api === true && d.keySet === true))
      .catch(() => setApiReady(false));
  });

  const handleCharacterCreated = useCallback((char: CharacterData) => {
    const motion = computeMotionProfile(char.personality);
    const fullChar: CharacterData = { ...char, motionProfile: motion };
    const initialMessage: Message = {
      id: crypto.randomUUID(),
      content: `你好……我是${char.name}。以后请多关照。`,
      sender: 'character', emotion: char.personality.extraversion > 0.6 ? 'happy' : 'shy',
      timestamp: Date.now(), affectionDelta: 0,
    };
    const newState: GameState = {
      character: fullChar, messages: [initialMessage], affection: 5,
      currentEmotion: initialMessage.emotion, stage: 'stranger',
      memories: [], currentScene: 'garden', diaries: [],
    };
    setState(newState);
    saveState(newState);
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    const s = stateRef.current;
    if (!s.character) return;

    const userMsg: Message = {
      id: crypto.randomUUID(), content: text, sender: 'user',
      emotion: 'neutral', timestamp: Date.now(),
    };

    let response: { text: string; emotion: string; delta: number; memory?: string; diary?: string } | null = null;

    if (apiReady === true) {
      try {
        const resp = await fetch(`${SERVER_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            personality: s.character.personality,
            history: s.messages.slice(-8),
            characterName: s.character.name,
            characterDesc: s.character.description,
            affection: s.affection,
            memories: s.memories,
            scene: s.currentScene,
          }),
        });
        const data = await resp.json();
        if (data.text) response = data;
      } catch { /* fallback */ }
    }

    if (!response) {
      response = generateResponse(text, s.character.personality, s.affection);
    }

    const newAffection = Math.max(0, Math.min(100, s.affection + (response.delta || 0)));
    let newStage: RelationshipStage = s.stage;
    const stages: RelationshipStage[] = ['stranger', 'acquainted', 'friend', 'close', 'intimate'];
    for (const st of stages) {
      if (newAffection >= STAGE_THRESHOLDS[st]) newStage = st;
    }

    const charMsg: Message = {
      id: crypto.randomUUID(),
      content: response.text || '……',
      sender: 'character',
      emotion: (response.emotion as any) || 'neutral',
      timestamp: Date.now() + 10,
      affectionDelta: response.delta || 0,
    };

    const newMemories = [...s.memories];
    if (response.memory) newMemories.push(response.memory);

    const newDiaries = [...s.diaries];
    if (response.diary) {
      newDiaries.push({
        id: crypto.randomUUID(),
        content: response.diary,
        scene: s.currentScene,
        timestamp: Date.now(),
        affection: newAffection,
      });
    }

    const newState: GameState = {
      ...s,
      messages: [...s.messages, userMsg, charMsg],
      affection: newAffection,
      currentEmotion: (response.emotion as any) || 'neutral',
      stage: newStage,
      memories: newMemories,
      diaries: newDiaries,
    };

    setState(newState);
    saveState(newState);
  }, [apiReady]);

  const setScene = useCallback((sceneId: string) => {
    setState(prev => {
      const next = { ...prev, currentScene: sceneId };
      saveState(next);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      character: null, messages: [], affection: 0,
      currentEmotion: 'neutral', stage: 'stranger',
      memories: [], currentScene: 'garden', diaries: [],
    });
  }, []);

  // 角色主动发起话题
  const handleProactive = useCallback(async (): Promise<Message | null> => {
    const s = stateRef.current;
    if (!s.character || apiReady !== true) return null;
    try {
      const resp = await fetch(`${SERVER_URL}/api/proactive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personality: s.character.personality,
          history: s.messages.slice(-6),
          characterName: s.character.name,
          characterDesc: s.character.description,
          affection: s.affection,
          memories: s.memories,
          scene: s.currentScene,
        }),
      });
      const data = await resp.json();
      if (!data?.text) return null;

      const charMsg: Message = {
        id: crypto.randomUUID(),
        content: data.text,
        sender: 'character',
        emotion: data.emotion || 'neutral',
        timestamp: Date.now(),
        affectionDelta: data.delta || 0.5,
      };
      const newState = {
        ...s,
        messages: [...s.messages, charMsg],
        affection: Math.max(0, Math.min(100, s.affection + (data.delta || 0.5))),
        currentEmotion: (data.emotion as any) || 'neutral',
      };
      setState(newState);
      saveState(newState);
      return charMsg;
    } catch { return null; }
  }, [apiReady]);

  if (!state.character) {
    return <CreateCharacter onCreated={handleCharacterCreated} />;
  }

  return (
    <ChatRoom
      state={state}
      onSend={handleSendMessage}
      onReset={handleReset}
      onSceneChange={setScene}
      onProactive={handleProactive}
      ollamaReady={apiReady}
    />
  );
}
