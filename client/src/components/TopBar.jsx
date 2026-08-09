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
  const {
    room,
    gamePhase,
    gameRound,
    phaseDuration,
    leaveRoom,
    isConnected,
    networkMode,
    serverUrl,
    switchNetworkMode,
  } = useSocket();

  const [timeLeft, setTimeLeft] = useState(0);
  const [showServerModal, setShowServerModal] = useState(false);
  const [tempMode, setTempMode] = useState(networkMode);
  const [tempUrl, setTempUrl] = useState(serverUrl);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (phaseDuration > 0) {
      setTimeLeft(phaseDuration);
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gamePhase, phaseDuration]);

  const copyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>房號:</span>
                <button
                  onClick={copyRoomCode}
                  className="flex items-center gap-1 font-mono font-bold text-amber-400 tracking-wider bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded border border-slate-700 transition-colors cursor-pointer"
                  title="點擊複製房號分享給好友"
                >
                  <span>{room.id}</span>
                  <span className="text-[10px] text-slate-400">{copied ? '✅ 已複製' : '📋 複製'}</span>
                </button>
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

        {/* 右側：連線模式狀態與離開 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTempMode(networkMode);
              setTempUrl(serverUrl);
              setShowServerModal(true);
            }}
            className="flex items-center gap-2 px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
            title="點擊切換連線模式 (P2P 免伺服器 / 自架後端)"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-slate-300 font-mono text-[11px]">
              {networkMode === 'P2P' ? '🌐 P2P 免伺服器模式' : '🖥️ 自架伺服器'}
            </span>
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

      {/* 連線模式設定 Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-amber-400 mb-2 flex items-center gap-2">
              <span>⚙️</span> 遊戲連線模式設定
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              狼人殺支援 <b>P2P 免伺服器模式</b>（直接透過瀏覽器互相連線與 AI 機器人）或 <b>自架 WebSocket 伺服器模式</b>。
            </p>

            <div className="space-y-3 mb-5">
              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  tempMode === 'P2P'
                    ? 'bg-amber-950/30 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                onClick={() => setTempMode('P2P')}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={tempMode === 'P2P'}
                  onChange={() => setTempMode('P2P')}
                  className="mt-1 accent-amber-500"
                />
                <div>
                  <div className="font-bold text-sm text-amber-300">🌐 P2P 免伺服器模式（推薦）</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    100% 透過瀏覽器直接連線，免架設後端，可直接開房、分享房號給好友或加入 AI 機器人！
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  tempMode === 'SERVER'
                    ? 'bg-amber-950/30 border-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
                onClick={() => setTempMode('SERVER')}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={tempMode === 'SERVER'}
                  onChange={() => setTempMode('SERVER')}
                  className="mt-1 accent-amber-500"
                />
                <div className="flex-1">
                  <div className="font-bold text-sm text-indigo-300">🖥️ 自架 WebSocket 伺服器</div>
                  <div className="text-xs text-slate-400 mt-0.5 mb-2">
                    連接至本地或部署在 Render / Railway 上的獨立後端。
                  </div>
                  {tempMode === 'SERVER' && (
                    <input
                      type="text"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      placeholder="例: https://your-server.onrender.com 或 http://localhost:3000"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowServerModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  switchNetworkMode(tempMode, tempUrl);
                  setShowServerModal(false);
                }}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 cursor-pointer"
              >
                儲存設定
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
