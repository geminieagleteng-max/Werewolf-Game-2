import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { ROLE_DEFINITIONS } from '../engine/roles';

const ROLE_THEMES = {
  WEREWOLF: {
    border: 'border-red-500',
    glow: 'shadow-red-600/50 ring-2 ring-red-500/50',
    gradient: 'from-red-950 via-zinc-950 to-black',
    accentText: 'text-red-400',
    badge: 'bg-red-950/80 border-red-500 text-red-300',
  },
  SEER: {
    border: 'border-purple-500',
    glow: 'shadow-purple-600/50 ring-2 ring-purple-500/50',
    gradient: 'from-purple-950 via-zinc-950 to-black',
    accentText: 'text-purple-400',
    badge: 'bg-purple-950/80 border-purple-500 text-purple-300',
  },
  WITCH: {
    border: 'border-emerald-500',
    glow: 'shadow-emerald-600/50 ring-2 ring-emerald-500/50',
    gradient: 'from-emerald-950 via-zinc-950 to-black',
    accentText: 'text-emerald-400',
    badge: 'bg-emerald-950/80 border-emerald-500 text-emerald-300',
  },
  HUNTER: {
    border: 'border-amber-500',
    glow: 'shadow-amber-600/50 ring-2 ring-amber-500/50',
    gradient: 'from-amber-950 via-zinc-950 to-black',
    accentText: 'text-amber-400',
    badge: 'bg-amber-950/80 border-amber-500 text-amber-300',
  },
  GUARD: {
    border: 'border-blue-500',
    glow: 'shadow-blue-600/50 ring-2 ring-blue-500/50',
    gradient: 'from-blue-950 via-zinc-950 to-black',
    accentText: 'text-blue-400',
    badge: 'bg-blue-950/80 border-blue-500 text-blue-300',
  },
  IDIOT: {
    border: 'border-pink-500',
    glow: 'shadow-pink-600/50 ring-2 ring-pink-500/50',
    gradient: 'from-pink-950 via-zinc-950 to-black',
    accentText: 'text-pink-400',
    badge: 'bg-pink-950/80 border-pink-500 text-pink-300',
  },
  KNIGHT: {
    border: 'border-amber-400',
    glow: 'shadow-amber-500/50 ring-2 ring-amber-400/50',
    gradient: 'from-amber-950 via-zinc-950 to-black',
    accentText: 'text-amber-300',
    badge: 'bg-amber-950/80 border-amber-400 text-amber-200',
  },
  SILENCER: {
    border: 'border-indigo-500',
    glow: 'shadow-indigo-600/50 ring-2 ring-indigo-500/50',
    gradient: 'from-indigo-950 via-zinc-950 to-black',
    accentText: 'text-indigo-400',
    badge: 'bg-indigo-950/80 border-indigo-500 text-indigo-300',
  },
  DREAMCATCHER: {
    border: 'border-cyan-500',
    glow: 'shadow-cyan-600/50 ring-2 ring-cyan-500/50',
    gradient: 'from-cyan-950 via-zinc-950 to-black',
    accentText: 'text-cyan-400',
    badge: 'bg-cyan-950/80 border-cyan-500 text-cyan-300',
  },
  CUPID: {
    border: 'border-rose-500',
    glow: 'shadow-rose-600/50 ring-2 ring-rose-500/50',
    gradient: 'from-rose-950 via-zinc-950 to-black',
    accentText: 'text-rose-400',
    badge: 'bg-rose-950/80 border-rose-500 text-rose-300',
  },
  VILLAGER: {
    border: 'border-slate-500',
    glow: 'shadow-slate-600/50 ring-2 ring-slate-500/50',
    gradient: 'from-slate-900 via-zinc-950 to-black',
    accentText: 'text-slate-300',
    badge: 'bg-slate-900/80 border-slate-500 text-slate-300',
  },
};

export const RoleRevealModal = ({ onOpenFullManual }) => {
  const { myPlayer, myRoleInfo, gamePhase, phaseDuration } = useSocket();
  const [dismissed, setDismissed] = useState(false);
  const [lastPhase, setLastPhase] = useState(null);

  // 每一局重置或當進入 ASSIGNING_ROLES 階段時自動彈出
  useEffect(() => {
    if (gamePhase === 'ASSIGNING_ROLES' && lastPhase !== 'ASSIGNING_ROLES') {
      setDismissed(false);
    }
    setLastPhase(gamePhase);
  }, [gamePhase, lastPhase]);

  if (!myPlayer || !myRoleInfo) return null;
  if (gamePhase !== 'ASSIGNING_ROLES' || dismissed) return null;

  const role = myPlayer.role || myRoleInfo.id;
  const roleDef = ROLE_DEFINITIONS[role] || myRoleInfo;
  const theme = ROLE_THEMES[role] || ROLE_THEMES.VILLAGER;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg animate-fade-in">
      <div
        className={`relative w-full max-w-lg rounded-3xl bg-gradient-to-b ${theme.gradient} border-2 ${theme.border} p-6 sm:p-8 shadow-2xl ${theme.glow} text-zinc-100 flex flex-col items-center text-center`}
      >
        {/* 頂部動態徽章 */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
            ROLE REVEAL · 身分抽取揭曉
          </span>
        </div>

        {/* 角色立繪圖標與發光特效 */}
        <div className="relative mb-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-950/80 border-2 border-white/20 flex items-center justify-center text-5xl sm:text-6xl shadow-inner">
            {roleDef.icon || '🐺'}
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-900 border border-zinc-700 text-zinc-200">
            #{myPlayer.seatNumber} 號
          </span>
        </div>

        {/* 角色名稱與陣營 */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1">
          {roleDef.name}
        </h2>
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${theme.badge}`}>
            {roleDef.factionName || '陣營'}
          </span>
          <span className="text-xs text-zinc-400 font-serif italic">
            「{roleDef.title || roleDef.description}」
          </span>
        </div>

        {/* 核心技能與勝利目標簡報區塊 */}
        <div className="w-full space-y-2.5 text-left mb-6">
          {/* 勝利條件 */}
          <div className="p-3 bg-zinc-950/80 border border-white/10 rounded-xl text-xs flex items-start gap-2.5">
            <span className="text-base">🏆</span>
            <div>
              <div className="font-semibold text-zinc-300">勝利目標</div>
              <div className="text-zinc-200 mt-0.5 leading-relaxed">{roleDef.winCondition}</div>
            </div>
          </div>

          {/* 核心專屬技能 */}
          {roleDef.skills && roleDef.skills.length > 0 && (
            <div className="p-3 bg-zinc-950/80 border border-white/10 rounded-xl text-xs space-y-1.5">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <span>⚡</span> 專屬核心技能：{roleDef.skills[0].name}
                <span className="text-[10px] text-zinc-400 ml-auto font-mono">
                  {roleDef.skills[0].phase}
                </span>
              </div>
              <div className="text-zinc-200 leading-relaxed pl-1">
                {roleDef.skills[0].effect}
              </div>
              {roleDef.skills[0].restrictions && (
                <div className="text-[11px] text-red-300/90 pl-1">
                  ⚠️ 注意：{roleDef.skills[0].restrictions}
                </div>
              )}
            </div>
          )}

          {/* 實戰秘笈小提點 */}
          {roleDef.strategyTips && roleDef.strategyTips.length > 0 && (
            <div className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl text-[11px] text-zinc-400 flex items-start gap-2">
              <span>💡</span>
              <span className="text-zinc-300">{roleDef.strategyTips[0]}</span>
            </div>
          )}
        </div>

        {/* 底部操作按鈕組 */}
        <div className="w-full flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={() => onOpenFullManual?.(role)}
            className="flex-1 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>📖</span> 查看完整技能手冊與圖鑑
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="flex-1 py-3 px-4 bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>✨</span> 我了解了，進入對局
          </button>
        </div>

        <p className="text-[10px] text-zinc-500 mt-3">
          對局中可隨時點擊左側身分卡或頂部「📖 技能說明」再次查看
        </p>
      </div>
    </div>
  );
};

export default RoleRevealModal;
