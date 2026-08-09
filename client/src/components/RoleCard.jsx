import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

const ROLE_THEMES = {
  WEREWOLF: {
    name: '狼人',
    icon: '🐺',
    border: 'border-red-600',
    glow: 'shadow-red-950/60',
    gradient: 'from-red-950 via-slate-900 to-black',
    factionBadge: 'bg-red-900/60 text-red-300 border-red-500',
    factionText: '狼人陣營 🐺',
  },
  SEER: {
    name: '預言家',
    icon: '🔮',
    border: 'border-purple-500',
    glow: 'shadow-purple-950/60',
    gradient: 'from-purple-950 via-slate-900 to-black',
    factionBadge: 'bg-purple-900/60 text-purple-300 border-purple-500',
    factionText: '好人神職 🛡️',
  },
  WITCH: {
    name: '女巫',
    icon: '🧪',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-950/60',
    gradient: 'from-emerald-950 via-slate-900 to-black',
    factionBadge: 'bg-emerald-900/60 text-emerald-300 border-emerald-500',
    factionText: '好人神職 🛡️',
  },
  HUNTER: {
    name: '獵人',
    icon: '💥',
    border: 'border-amber-600',
    glow: 'shadow-amber-950/60',
    gradient: 'from-amber-950 via-slate-900 to-black',
    factionBadge: 'bg-amber-900/60 text-amber-300 border-amber-500',
    factionText: '好人神職 🛡️',
  },
  GUARD: {
    name: '守衛',
    icon: '🛡️',
    border: 'border-blue-500',
    glow: 'shadow-blue-950/60',
    gradient: 'from-blue-950 via-slate-900 to-black',
    factionBadge: 'bg-blue-900/60 text-blue-300 border-blue-500',
    factionText: '好人神職 🛡️',
  },
  IDIOT: {
    name: '白痴',
    icon: '🤡',
    border: 'border-pink-500',
    glow: 'shadow-pink-950/60',
    gradient: 'from-pink-950 via-slate-900 to-black',
    factionBadge: 'bg-pink-900/60 text-pink-300 border-pink-500',
    factionText: '好人神職 🛡️',
  },
  VILLAGER: {
    name: '村民',
    icon: '👨‍🌾',
    border: 'border-slate-500',
    glow: 'shadow-slate-950/60',
    gradient: 'from-slate-800 via-slate-900 to-black',
    factionBadge: 'bg-slate-800 text-slate-300 border-slate-600',
    factionText: '好人平民 🛡️',
  },
};

export const RoleCard = () => {
  const { myPlayer, myRoleInfo } = useSocket();
  const [isFlipped, setIsFlipped] = useState(true);

  if (!myPlayer || !myRoleInfo) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-500">
        <p className="text-sm">尚未發牌或遊戲尚未開始</p>
      </div>
    );
  }

  const role = myPlayer.role || myRoleInfo.id;
  const theme = ROLE_THEMES[role] || ROLE_THEMES.VILLAGER;

  return (
    <div className="flex flex-col items-center">
      {/* 3D 翻牌容器 */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-64 h-96 cursor-pointer select-none perspective-1000 group"
      >
        <div
          className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* 牌背 (Card Back) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-black border-2 border-amber-500/40 p-5 flex flex-col items-center justify-between shadow-2xl">
            <div className="w-full flex justify-between text-amber-400/60 text-xs font-mono">
              <span>WEREWOLF</span>
              <span>CARD</span>
            </div>

            <div className="w-28 h-28 rounded-full border-2 border-amber-500/30 flex items-center justify-center bg-slate-900/60 shadow-inner group-hover:scale-105 transition-transform">
              <span className="text-4xl">🐺</span>
            </div>

            <div className="text-center">
              <span className="text-xs font-serif text-amber-300 tracking-widest block mb-1">
                點擊翻開身分牌
              </span>
              <span className="text-[10px] text-slate-500">保持神祕，切勿窺探他人手牌</span>
            </div>
          </div>

          {/* 牌面 (Card Front) */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-gradient-to-b ${theme.gradient} border-2 ${theme.border} p-5 flex flex-col justify-between shadow-2xl ${theme.glow}`}
          >
            {/* 頂部標題與陣營 */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">
                #{myPlayer.seatNumber} 號位
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${theme.factionBadge}`}>
                {theme.factionText}
              </span>
            </div>

            {/* 角色立繪圖標與名稱 */}
            <div className="text-center my-auto">
              <div className="text-5xl mb-3 filter drop-shadow-[0_0_12px_rgba(255,255,255,0.2)]">
                {theme.icon}
              </div>
              <h3 className="text-2xl font-serif font-black tracking-wider text-white mb-2">
                {theme.name}
              </h3>
              <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed px-2">
                {myRoleInfo.description}
              </p>
            </div>

            {/* 底部角色專屬技能即時狀態 */}
            <div className="pt-3 border-t border-white/10 text-[11px] space-y-1">
              {role === 'WITCH' && (
                <div className="flex justify-around text-slate-300">
                  <span>解藥: {myPlayer.hasUsedAntidote ? '❌ 已用' : '🟢 可用'}</span>
                  <span>毒藥: {myPlayer.hasUsedPoison ? '❌ 已用' : '🟢 可用'}</span>
                </div>
              )}
              {role === 'HUNTER' && (
                <div className="text-center text-slate-300">
                  開槍資格: {myPlayer.canShoot ? '🟢 具備開槍資格' : '❌ 已失效(被毒)'}
                </div>
              )}
              {role === 'GUARD' && (
                <div className="text-center text-slate-300">
                  上夜守護: {myPlayer.lastGuardedId ? `已守護過` : '無'}
                </div>
              )}
              {role === 'IDIOT' && (
                <div className="text-center text-slate-300">
                  翻牌狀態: {myPlayer.isIdiotRevealed ? '🤡 已翻牌免死' : '未觸發'}
                </div>
              )}
              {role === 'WEREWOLF' && (
                <div className="text-center text-red-400 font-semibold">
                  夜晚可與狼隊友協商暗殺
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsFlipped(!isFlipped)}
        className="mt-3 text-xs text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
      >
        <span>🔄</span> 點擊翻轉卡片
      </button>
    </div>
  );
};

export default RoleCard;
