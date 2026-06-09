import { Message } from '../types';

interface Props {
  message: Message;
  characterName: string;
}

export default function ChatBubble({ message, characterName }: Props) {
  const isUser = message.sender === 'user';

  const emotionColors: Record<string, string> = {
    happy: '#fbbf24',
    shy: '#f472b6',
    surprised: '#60a5fa',
    sad: '#818cf8',
    angry: '#f87171',
    love: '#f43f5e',
    teasing: '#f97316',
    neutral: '#94a3b8',
  };

  const emotionIcons: Record<string, string> = {
    happy: ' ♡',
    shy: ' ...',
    love: ' ❤',
    teasing: ' ^',
    surprised: ' !',
    sad: ' ..',
    angry: ' !!',
    neutral: '',
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`max-w-[75%] ${isUser ? 'order-1' : 'order-1'}`}>
        {/* 角色名称 */}
        {!isUser && (
          <div className="text-[10px] text-mist-500 mb-1 ml-1">{characterName}</div>
        )}

        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-gradient-to-r from-heart-600 to-rose-500 text-white rounded-br-md'
              : 'bg-white/5 border border-white/[0.06] text-mist-200 rounded-bl-md'
          }`}
        >
          <span>{message.content}</span>

          {/* 情绪标签 + 好感度变化 */}
          {!isUser && (
            <span
              className="inline-block ml-1 text-xs"
              style={{ color: emotionColors[message.emotion] || emotionColors.neutral }}
            >
              {emotionIcons[message.emotion] || ''}
            </span>
          )}
        </div>

        {/* 好感度变化指示 */}
        {!isUser && message.affectionDelta && message.affectionDelta !== 0 && (
          <div className={`text-[10px] mt-0.5 ml-1 ${message.affectionDelta > 0 ? 'text-heart-400' : 'text-red-400'}`}>
            {message.affectionDelta > 0 ? '+' : ''}{message.affectionDelta}
          </div>
        )}
      </div>
    </div>
  );
}
