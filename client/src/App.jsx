import React from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import TopBar from './components/TopBar';
import Lobby from './components/Lobby';
import RoleCard from './components/RoleCard';
import NightSkillPanel from './components/NightSkillPanel';
import DayVoteChat from './components/DayVoteChat';

const GameContent = () => {
  const { room, gamePhase, myPlayer, gameOverData, restartGame } = useSocket();

  // 若尚未進房或處於大廳等待狀態，顯示房間大廳
  if (!room || gamePhase === 'WAITING') {
    return <Lobby />;
  }

  const isHost = myPlayer?.isHost;

  return (
    <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-65px)] flex flex-col gap-6">
      {/* 遊戲中主版面三欄配置 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* 左側欄 (身分卡與座位狀態) - 3 columns */}
        <div className="lg:col-span-3 flex flex-col gap-4 overflow-y-auto pr-1">
          <RoleCard />

          {/* 座位存活清單概覽 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              👥 存活座位席
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {room.players.map((p) => (
                <div
                  key={p.id}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                    p.isAlive
                      ? 'bg-slate-950 border-slate-800 text-white'
                      : 'bg-red-950/20 border-red-900/40 text-slate-500 line-through'
                  }`}
                >
                  <span className="font-mono font-bold">#{p.seatNumber}</span>
                  <span className="truncate max-w-[70px]">{p.name}</span>
                  <span>{p.isAlive ? '🟢' : '⚰️'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中間欄 (技能行動面板 / 階段主操作) - 5 columns */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto">
          <NightSkillPanel />
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
                  <div className="text-sm font-bold text-white mt-1">{p.role}</div>
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
  return (
    <SocketProvider serverUrl="http://localhost:3000">
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <GameContent />
        </main>
      </div>
    </SocketProvider>
  );
}
