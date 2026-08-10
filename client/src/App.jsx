import React, { useState } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import { ROLE_NAMES_ZH } from './engine/roles';
import TopBar from './components/TopBar';
import Lobby from './components/Lobby';
import RoleCard from './components/RoleCard';
import NightSkillPanel from './components/NightSkillPanel';
import DayVoteChat from './components/DayVoteChat';
import RoleSkillModal from './components/RoleSkillModal';
import RoleRevealModal from './components/RoleRevealModal';
import MicrophoneSettingsModal from './components/MicrophoneSettingsModal';

const GameContent = ({ onOpenSkillGuide }) => {
  const { room, gamePhase, myPlayer, gameOverData, restartGame, speakingPlayerIds, werewolfTeammates } = useSocket();

  // 若尚未進房或處於大廳等待狀態，顯示房間大廳
  if (!room || gamePhase === 'WAITING') {
    return <Lobby />;
  }

  const isHost = myPlayer?.isHost;
  const isMeWolf = myPlayer?.role === 'WEREWOLF';

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto h-[calc(100vh-65px)] flex flex-col gap-4 sm:gap-6">
      {/* 遊戲中主版面三欄配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 min-h-0">
        {/* 左側欄 (身分卡與座位狀態) - 3 columns */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          <RoleCard onOpenSkillGuide={onOpenSkillGuide} />

          {/* 座位存活清單概覽 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                👥 存活座位席
              </h4>
              <span className="text-[10px] text-zinc-500">
                {isMeWolf ? '🐺 紅框為狼隊友' : '🎙️ 綠框為說話中'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {room.players.map((p) => {
                const isSpeaking = speakingPlayerIds?.includes(p.id);
                const isWolfTeammate = isMeWolf && werewolfTeammates?.some((w) => w.id === p.id);
                const isMe = p.id === myPlayer?.id;

                let cardStyle = 'bg-slate-950 border-slate-800 text-white';
                if (!p.isAlive) {
                  cardStyle = 'bg-red-950/20 border-red-900/40 text-slate-500 line-through';
                } else if (isSpeaking) {
                  cardStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-2 ring-emerald-400 shadow-md shadow-emerald-950 animate-pulse';
                } else if (isWolfTeammate) {
                  cardStyle = 'bg-red-950/40 border-red-600/80 text-red-100 ring-1 ring-red-500/50';
                }

                return (
                  <div
                    key={p.id}
                    className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all ${cardStyle}`}
                  >
                    <span className="font-mono font-bold">#{p.seatNumber}</span>
                    <span className="truncate max-w-[65px] flex items-center gap-1">
                      {isSpeaking && <span className="text-[10px] animate-bounce">🎙️</span>}
                      {isWolfTeammate && (
                        <span className="text-[9px] text-red-400 bg-red-950 px-1 py-0.2 rounded border border-red-800">
                          {isMe ? '我' : '🐺狼'}
                        </span>
                      )}
                      <span>{p.name}</span>
                    </span>
                    <span>{p.isAlive ? (isSpeaking ? '🔊' : '🟢') : '⚰️'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 中間欄 (技能行動面板 / 階段主操作) - 5 columns */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto">
          <NightSkillPanel onOpenSkillGuide={onOpenSkillGuide} />
        </div>

        {/* 右側欄 (白天發言與放逐投票 / 系統公告) - 4 columns */}
        <div className="lg:col-span-4 h-full min-h-[400px]">
          <DayVoteChat />
        </div>
      </div>

      {/* 遊戲結束底牌揭曉 Modal */}
      {gameOverData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-8 max-w-2xl w-full shadow-2xl shadow-amber-950/50 text-center">
            <span className="text-5xl block mb-2">🏆</span>
            <h2 className="text-3xl font-serif font-black text-amber-400 mb-2">
              {gameOverData.winner === 'GOOD' ? '🛡️ 好人陣營獲勝！' : '🐺 狼人陣營獲勝！'}
            </h2>
            <p className="text-sm text-slate-300 mb-6">{gameOverData.reason}</p>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              全體玩家真實身分揭曉
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {gameOverData.allPlayers?.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center"
                >
                  <div className="font-mono text-xs text-amber-400 font-bold">
                    #{p.seatNumber} {p.name}
                  </div>
                  <div className="text-sm font-bold text-white mt-1">{ROLE_NAMES_ZH[p.role] || p.role}</div>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                onClick={restartGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-2xl shadow-xl transition-all cursor-pointer"
              >
                🔄 房主重置房間 (再玩一局)
              </button>
            ) : (
              <p className="text-xs text-slate-500">等待房主重新開啟對局...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [activeModalRole, setActiveModalRole] = useState('VILLAGER');

  const handleOpenSkillGuide = (roleKey) => {
    setActiveModalRole(roleKey || 'VILLAGER');
    setIsSkillModalOpen(true);
  };

  return (
    <SocketProvider serverUrl="http://localhost:3000">
      <AppContent
        isSkillModalOpen={isSkillModalOpen}
        setIsSkillModalOpen={setIsSkillModalOpen}
        activeModalRole={activeModalRole}
        handleOpenSkillGuide={handleOpenSkillGuide}
      />
    </SocketProvider>
  );
}

function AppContent({ isSkillModalOpen, setIsSkillModalOpen, activeModalRole, handleOpenSkillGuide }) {
  const { room, myPlayer, isMicSettingsOpen, setIsMicSettingsOpen } = useSocket();

  const handleOpenGuideWithFallback = (roleKey) => {
    const targetRole = roleKey || myPlayer?.role || 'VILLAGER';
    handleOpenSkillGuide(targetRole);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      <TopBar onOpenSkillGuide={handleOpenGuideWithFallback} />

      <main className="flex-1 overflow-hidden">
        <GameContent onOpenSkillGuide={handleOpenGuideWithFallback} />
      </main>

      {/* 抽牌身分揭曉 Spotlight Modal */}
      <RoleRevealModal onOpenFullManual={handleOpenGuideWithFallback} />

      {/* 角色技能百科與手冊 Modal */}
      <RoleSkillModal
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
        initialRole={activeModalRole}
        roomRoleConfig={room?.roleConfig}
      />

      {/* 麥克風與語音通話設定 Modal */}
      <MicrophoneSettingsModal
        isOpen={isMicSettingsOpen}
        onClose={() => setIsMicSettingsOpen(false)}
      />
    </div>
  );
}
