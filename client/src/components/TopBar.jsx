import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

const PHASE_LABELS = {
  WAITING: { text: '大廳等待中', color: 'bg-slate-700 text-slate-200' },
  ASSIGNING_ROLES: { text: '發牌階段 🎴', color: 'bg-amber-600/30 text-amber-300 border-amber-500' },
  NIGHT_START: { text: '夜幕降臨 🌙', color: 'bg-indigo-950 text-indigo-300 border-indigo-700' },
  NIGHT_GUARD: { text: '守衛行動 🛡️', color: 'bg-blue-900/60 text-blue-300 border-blue-600' },
  NIGHT_WEREWOLF: { text: '狼人行動 🐺', color: 'bg-red-950 text-red-400 border-red-700 animate-pulse' },
  NIGHT_SEER: { text: '預言家行動 🔮', color: 'bg-purple-900/60 text-purple-300 border-purple-600' },
  NIGHT_WITCH: { text: '女巫行動 🧪', color: 'bg-emerald-950 text-emerald-300 border-emerald-600' },
  NIGHT_SETTLE: { text: '夜晚結算中 ⏳', color: 'bg-slate-800 text-slate-300' },
  DAY_ANNOUNCE: { text: '天亮了 ☀️', color: 'bg-yellow-900/40 text-yellow-300 border-yellow-600' },
  DAY_DISCUSSION: { text: '白天討論發言 💬', color: 'bg-sky-950 text-sky-300 border-sky-600' },
  DAY_VOTING: { text: '放逐投票 🗳️', color: 'bg-orange-950 text-orange-400 border-orange-600 animate-pulse' },
  DAY_VOTE_RESULT: { text: '票數結算 📊', color: 'bg-slate-800 text-slate-300' },
  HUNTER_SHOOT: { text: '獵人開槍 💥', color: 'bg-rose-950 text-rose-300 border-rose-600' },
  GAME_OVER: { text: '遊戲結束 🏆', color: 'bg-amber-950 text-amber-300 border-amber-500' },
};

export const TopBar = () => {
  const { room, gamePhase, gameRound, phaseDuration, leaveRoom, isConnected, serverUrl, updateServerUrl } = useSocket();
  const [timeLeft, setTimeLeft] = useState(0);
  const [showServerModal, setShowServerModal] = useState(false);
  const [tempUrl, setTempUrl] = useState(serverUrl);

  useEffect(() => {
    if (phaseDuration > 0) {
      setTimeLeft(phaseDuration);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gamePhase, phaseDuration]);

  const currentPhaseInfo = PHASE_LABELS[gamePhase] || { text: gamePhase, color: 'bg-slate-800 text-slate-300' };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white shadow-lg">
        {/* 標誌與房號 */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🐺</span>
          <div>
            <h1 className="font-serif text-lg font-bold tracking-wider bg-gradient-to-r from-amber-400 to-red-500 bg-clip-text text-transparent">
              WEREWOLF ONLINE
            </h1>
            {room && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>房號:</span>
                <span className="font-mono font-bold text-amber-400 tracking-wider bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                  {room.id}
                </span>
                <span>• {room.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* 中間：當前階段與倒數計時 */}
        {room && gamePhase !== 'WAITING' && (
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full border text-xs font-semibold tracking-wide ${currentPhaseInfo.color}`}>
              {gameRound > 0 ? `第 ${gameRound} 輪 • ` : ''}{currentPhaseInfo.text}
            </div>

            {timeLeft > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/60 border border-red-800/80 rounded-full text-red-300 text-xs font-mono font-bold">
                <span>⏱️</span>
                <span>{timeLeft}s</span>
              </div>
            )}
          </div>
        )}

        {/* 右側：伺服器連線狀態與離開 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTempUrl(serverUrl);
              setShowServerModal(true);
            }}
            className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
            title="點擊切換後端伺服器網址"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500'}`} />
            <span className="text-slate-300 font-mono text-[11px] max-w-[120px] truncate">{serverUrl}</span>
            <span className="text-slate-500 text-[10px]">⚙️</span>
          </button>

          {room && (
            <button
              onClick={leaveRoom}
              className="px-3 py-1.5 bg-slate-800 hover:bg-red-900/60 border border-slate-700 hover:border-red-600 rounded-lg text-xs text-slate-300 hover:text-red-200 transition-all cursor-pointer"
            >
              離開房間
            </button>
          )}
        </div>
      </header>

      {/* 伺服器網址設定 Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
              <span>⚙️</span> 後端 WebSocket 伺服器網址
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              當前端部署至 GitHub Pages 時，請填入您部署在 Render / Railway / Zeabur 或本機的後端伺服器網址。
            </p>

            <div className="mb-4">
              <input
                type="text"
                value={tempUrl}
                onChange={(e) => setTempUrl(e.target.value)}
                placeholder="例如: https://your-werewolf-server.onrender.com"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowServerModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                取消
              </button>
              <button
                onClick={() => {
                  updateServerUrl(tempUrl);
                  setShowServerModal(false);
                }}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400"
              >
                儲存並重新連線
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
