import { RelationshipStage, STAGE_THRESHOLDS, STAGE_LABELS } from '../types';

interface Props {
  value: number;
  stage: RelationshipStage;
}

const stageColors: Record<RelationshipStage, string> = {
  stranger: 'from-mist-500 to-mist-400',
  acquainted: 'from-sky-500 to-sky-400',
  friend: 'from-violet-500 to-violet-400',
  close: 'from-rose-500 to-rose-400',
  intimate: 'from-heart-500 to-rose-400',
};

const stageGradients: Record<RelationshipStage, string> = {
  stranger: 'from-mist-500/5 to-mist-500/10',
  acquainted: 'from-sky-500/5 to-sky-500/10',
  friend: 'from-violet-500/5 to-violet-500/10',
  close: 'from-rose-500/5 to-rose-500/10',
  intimate: 'from-heart-500/5 to-heart-500/10',
};

const stages: RelationshipStage[] = ['stranger', 'acquainted', 'friend', 'close', 'intimate'];

export default function AffectionMeter({ value, stage }: Props) {
  const currentStageIndex = stages.indexOf(stage);

  return (
    <div className="glass rounded-xl px-4 py-3">
      {/* 好感度进度条 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[10px] text-mist-500 uppercase tracking-wider">affection</span>
            <span className="text-xs font-mono text-heart-400 font-medium">{Math.round(value)}/100</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${stageColors[stage]} transition-all duration-700 ease-out`}
              style={{ width: `${value}%` }}
            />
          </div>
        </div>

        {/* 阶段图标 */}
        <div className="flex items-center gap-1.5">
          {stages.map((s, i) => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i <= currentStageIndex
                  ? `bg-gradient-to-br ${stageColors[s]} shadow-lg`
                  : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 阶段标签 */}
      <div className="flex justify-between mt-2">
        {stages.map((s) => (
          <span
            key={s}
            className={`text-[9px] transition-all duration-500 ${
              s === stage
                ? 'text-white font-medium scale-105'
                : 'text-mist-600'
            }`}
          >
            {STAGE_LABELS[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
