import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { ROLE_DEFINITIONS } from '../engine/roles';

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
  KNIGHT: {
    name: '騎士',
    icon: '⚔️',
    border: 'border-amber-400',
    glow: 'shadow-amber-900/60',
    gradient: 'from-amber-950 via-zinc-900 to-black',
    factionBadge: 'bg-amber-900/60 text-amber-200 border-amber-400',
    factionText: '好人神職 🛡️',
  },
  SILENCER: {
    name: '禁言長老',
    icon: '🤐',
    border: 'border-indigo-500',
    glow: 'shadow-indigo-950/60',
    gradient: 'from-indigo-950 via-zinc-900 to-black',
    factionBadge: 'bg-indigo-900/60 text-indigo-300 border-indigo-500',
    factionText: '好人神職 🛡️',
  },
  DREAMCATCHER: {
    name: '攝夢人',
    icon: '💤',
    border: 'border-cyan-500',
    glow: 'shadow-cyan-950/60',
    gradient: 'from-cyan-950 via-zinc-900 to-black',
    factionBadge: 'bg-cyan-900/60 text-cyan-300 border-cyan-500',
    factionText: '好人神職 🛡️',
  },
  CUPID: {
    name: '邱比特',
    icon: '💘',
    border: 'border-rose-500',
    glow: 'shadow-rose-950/60',
    gradient: 'from-rose-950 via-zinc-900 to-black',
    factionBadge: 'bg-rose-900/60 text-rose-300 border-rose-500',
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

export const RoleCard = ({ onOpenSkillGuide }) => {
  const { myPlayer, myRoleInfo, werewolfTeammates, equippedTitle, currentUser, isGoogleLinked } = useSocket();
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
  const roleDef = ROLE_DEFINITIONS[role] || myRoleInfo;
  const playerAvatar = myPlayer.avatar || currentUser?.picture;
  const isGoogle = myPlayer.authProvider === 'GOOGLE' || isGoogleLinked;

  return (
    <div className="flex flex-col items-center">
      {/* 3D 翻牌容器 */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full max-w-[270px] h-[390px] cursor-pointer select-none perspective-1000 group"
      >
        <div
          className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* 牌背 (Card Back) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-700/60 p-5 flex flex-col items-center justify-between shadow-2xl">
            <div className="w-full flex justify-between text-zinc-400 text-xs font-mono">
              <span>WEREWOLF</span>
              <span>CARD</span>
            </div>

            <div className="w-24 h-24 rounded-full border border-zinc-700 flex items-center justify-center bg-zinc-900/80 shadow-inner group-hover:scale-105 transition-transform relative">
              {playerAvatar ? (
                <img
                  src={playerAvatar}
                  alt={myPlayer.name}
                  className="w-20 h-20 rounded-full object-cover border border-amber-500/50 shadow-md"
                />
              ) : (
                <span className="text-4xl">🐺</span>
              )}
              {isGoogle && (
                <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md p-0.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </span>
              )}
            </div>

            <div className="text-center">
              {equippedTitle && (
                <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/80 mb-2">
                  👑 【{equippedTitle}】
                </span>
              )}
              <span className="text-xs font-medium text-zinc-300 tracking-wider block mb-1">
                點擊翻開身分牌
              </span>
              <span className="text-[10px] text-zinc-500">保持神祕，切勿窺探他人手牌</span>
            </div>
          </div>

          {/* 牌面 (Card Front) */}
          <div
            className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-gradient-to-b ${theme.gradient} border ${theme.border} p-4 flex flex-col justify-between shadow-2xl ${theme.glow}`}
          >
            {/* 頂部標題與陣營 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {playerAvatar && (
                  <img
                    src={playerAvatar}
                    alt={myPlayer.name}
                    className="w-5 h-5 rounded-full object-cover border border-white/20"
                  />
                )}
                <span className="text-xs font-mono font-medium text-zinc-400">
                  #{myPlayer.seatNumber} 號位
                </span>
                {equippedTitle && (
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/60 max-w-[80px] truncate">
                    【{equippedTitle}】
                  </span>
                )}
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${theme.factionBadge}`}>
                {theme.factionText}
              </span>
            </div>

            {/* 角色立繪圖標與名稱 */}
            <div className="text-center my-auto">
              <div className="text-5xl mb-2">
                {theme.icon}
              </div>
              <h3 className="text-xl font-bold tracking-tight text-white mb-0.5">
                {theme.name}
              </h3>
              <p className="text-[11px] text-amber-300/80 font-serif italic mb-1.5">
                {roleDef.title ? `「${roleDef.title}」` : ''}
              </p>
              <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed px-1">
                {roleDef.description || myRoleInfo.description}
              </p>
            </div>

            {/* 底部角色專屬技能即時狀態 */}
            <div className="pt-2.5 border-t border-white/10 text-[11px] space-y-1">
              {role === 'WITCH' && (
                <div className="flex justify-around text-zinc-300">
                  <span>解藥: {myPlayer.hasUsedAntidote ? '❌ 已用' : '🟢 可用'}</span>
                  <span>毒藥: {myPlayer.hasUsedPoison ? '❌ 已用' : '🟢 可用'}</span>
                </div>
              )}
              {role === 'HUNTER' && (
                <div className="text-center text-zinc-300">
                  開槍資格: {myPlayer.canShoot ? '🟢 具備開槍資格' : '❌ 已失效(被毒)'}
                </div>
              )}
              {role === 'KNIGHT' && (
                <div className="text-center text-zinc-300">
                  決鬥技能: {myPlayer.hasUsedKnightDuel ? '❌ 已發動' : '🟢 白天發言可發動'}
                </div>
              )}
              {role === 'GUARD' && (
                <div className="text-center text-zinc-300">
                  上夜守護: {myPlayer.lastGuardedId ? `已守護過` : '無'}
                </div>
              )}
              {role === 'SILENCER' && (
                <div className="text-center text-zinc-300">
                  每夜可指定一人次日白天禁言
                </div>
              )}
              {role === 'DREAMCATCHER' && (
                <div className="text-center text-zinc-300">
                  每夜可使一人入夢免疫傷害
                </div>
              )}
              {role === 'CUPID' && (
                <div className="text-center text-zinc-300">
                  首夜可指定兩位玩家連為情侶
                </div>
              )}
              {role === 'IDIOT' && (
                <div className="text-center text-zinc-300">
                  翻牌狀態: {myPlayer.isIdiotRevealed ? '🤡 已翻牌免死' : '未觸發'}
                </div>
              )}
              {role === 'WEREWOLF' && (
                <div className="text-center text-red-400 font-medium">
                  {werewolfTeammates && werewolfTeammates.length > 1
                    ? `狼隊友：${werewolfTeammates
                        .filter((w) => w.id !== myPlayer.id)
                        .map((w) => `#${w.seatNumber} ${w.name}`)
                        .join('、')}`
                    : '夜晚可指定暗殺目標'}
                </div>
              )}
              {role === 'SEER' && (
                <div className="text-center text-purple-300 font-medium">
                  每晚可查驗一人真實陣營
                </div>
              )}
              {role === 'VILLAGER' && (
                <div className="text-center text-zinc-400 font-medium">
                  白天參與發言與投票放逐
                </div>
              )}

              {/* 情侶關係特別揭曉標籤 */}
              {myPlayer?.loverId && (
                <div className="mt-2 p-2 bg-rose-950/80 border border-rose-500 rounded-xl text-center shadow-md animate-pulse">
                  <span className="text-[11px] text-rose-300 font-bold block mb-0.5">💘 您的生死情侶：</span>
                  <div className="text-xs font-black text-white">
                    {(() => {
                      const loverPartner = room?.players?.find((p) => p.id === myPlayer.loverId);
                      return loverPartner ? `#${loverPartner.seatNumber} ${loverPartner.name}` : '未知對象';
                    })()}
                  </div>
                  <span className="text-[9px] text-rose-300/80 block mt-0.5">生死同命：一人死亡，另一人即刻殉情！</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 卡片下方操作工具列 */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
        >
          <span>🔄</span> 翻轉手牌
        </button>

        <button
          onClick={() => onOpenSkillGuide?.(role)}
          className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-500/50 rounded-lg text-xs text-amber-300 font-semibold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
          title="開啟角色技能指南與全角色圖鑑"
        >
          <span>📖</span> 技能詳解
        </button>
      </div>

      {/* 狼人專屬：狼隊友詳細名單面板 */}
      {role === 'WEREWOLF' && werewolfTeammates && werewolfTeammates.length > 0 && (
        <div className="w-full max-w-[270px] mt-3 p-3.5 bg-red-950/40 border border-red-800/80 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
              <span>🐺</span> 狼人隊友列表 ({werewolfTeammates.length} 狼)
            </span>
          </div>

          <div className="space-y-1.5">
            {werewolfTeammates.map((w) => {
              const isMe = w.id === myPlayer.id;
              return (
                <div
                  key={w.id}
                  className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between border transition-all ${
                    isMe
                      ? 'bg-red-900/50 border-red-500 text-white font-bold ring-1 ring-red-400'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-red-400 font-bold">#{w.seatNumber}</span>
                    <span className="truncate max-w-[85px]">{w.name}</span>
                    {isMe && <span className="text-[10px] text-amber-300">(您)</span>}
                  </div>
                  <span className="text-[10px] font-medium">
                    {w.isAlive ? '🟢 存活' : '⚰️ 出局'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleCard;
