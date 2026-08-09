import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

const PHASE_LABELS = {
  WAITING: { text: '大廳等待中', color: 'bg-slate-800/80 text-slate-300 border-slate-700' },
  ASSIGNING_ROLES: { text: '發牌階段 🎴', color: 'bg-amber-950/70 text-amber-300 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  NIGHT_START: { text: '夜幕降臨 🌙', color: 'bg-indigo-950/80 text-indigo-300 border-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.3)]' },
  NIGHT_GUARD: { text: '守衛行動 🛡️', color: 'bg-blue-950/80 text-blue-300 border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]' },
  NIGHT_WEREWOLF: { text: '狼人行動 🐺', color: 'bg-red-950/90 text-red-400 border-red-600 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' },
  NIGHT_SEER: { text: '預言家行動 🔮', color: 'bg-purple-950/80 text-purple-300 border-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.3)]' },
  NIGHT_WITCH: { text: '女巫行動 🧪', color: 'bg-emerald-950/80 text-emerald-300 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  NIGHT_SETTLE: { text: '夜晚結算中 ⏳', color: 'bg-slate-800 text-slate-300 border-slate-600' },
  DAY_ANNOUNCE: { text: '天亮了 ☀️', color: 'bg-amber-950/60 text-amber-300 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.3)]' },
  DAY_DISCUSSION: { text: '白天自由發言 💬', color: 'bg-sky-950/80 text-sky-300 border-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.3)]' },
  DAY_VOTING: { text: '放逐投票 🗳️', color: 'bg-orange-950/90 text-orange-400 border-orange-500 animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.4)]' },
  DAY_VOTE_RESULT: { text: '票數結算 📊', color: 'bg-slate-800 text-slate-300 border-slate-600' },
  HUNTER_SHOOT: { text: '獵人開槍 💥', color: 'bg-rose-950/90 text-rose-300 border-rose-500 animate-bounce shadow-[0_0_15px_rgba(244,63,94,0.4)]' },
  GAME_OVER: { text: '遊戲結束 🏆', color: 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]' },
};

// 精緻金屬幾何狼頭 SVG Logo
const WolfLogoIcon = () => (
  <div className="relative group">
    <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-rose-600 rounded-xl blur-sm opacity-60 group-hover:opacity-100 transition duration-500"></div>
    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/50 flex items-center justify-center shadow-inner">
      <svg
        viewBox="0 0 100 100"
        className="w-7 h-7 text-amber-400 filter drop-shadow-[0_0_6px_rgba(245,158,11,0.7)]"
        fill="currentColor"
      >
        {/* 幾何狼頭面具 */}
        <polygon points="50,12 36,36 18,22 28,52 14,58 32,82 50,96 68,82 86,58 72,52 82,22 64,36" fill="url(#wolfGrad)" />
        {/* 狼面暗部線條 */}
        <polygon points="50,26 38,54 50,78 62,54" fill="#0f172a" opacity="0.8" />
        <polygon points="50,34 44,52 50,68 56,52" fill="url(#eyeGlow)" />
        {/* 雙眼發光寶石 */}
        <circle cx="40" cy="48" r="3.5" fill="#ef4444" className="animate-pulse" />
        <circle cx="60" cy="48" r="3.5" fill="#ef4444" className="animate-pulse" />
        {/* 漸層色定義 */}
        <defs>
          <linearGradient id="wolfGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="eyeGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7f1d1d" />
            <stop offset="100%" stopColor="#450a0a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  </div>
);

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

  const currentPhaseInfo = PHASE_LABELS[gamePhase] || { text: gamePhase, color: 'bg-slate-800 text-slate-300 border-slate-700' };

  return (
    <>
      <header className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-2.5 bg-slate-950/90 backdrop-blur-xl border-b border-amber-500/20 text-white shadow-[0_4px_30px_rgba(0,0,0,0.8)] z-40">
        {/* 頂部高光細線 */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        {/* 左側：精緻 Logo 與 房號標籤 */}
        <div className="flex items-center gap-3.5">
          <WolfLogoIcon />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-black tracking-[0.18em] bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,158,11,0.4)]">
                WEREWOLF
              </span>
              <span className="text-[10px] tracking-[0.25em] font-black uppercase text-rose-300 bg-gradient-to-r from-rose-950/90 to-red-900/80 border border-rose-500/40 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)]">
                ONLINE
              </span>
            </div>

            {room ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="text-[11px] text-slate-400">房號:</span>
                <button
                  onClick={copyRoomCode}
                  className="flex items-center gap-1.5 font-mono font-bold text-amber-300 tracking-wider bg-slate-900/90 hover:bg-slate-800 px-2.5 py-0.5 rounded-md border border-amber-500/40 shadow-sm transition-all cursor-pointer group"
                  title="點擊複製房號分享給好友"
                >
                  <span className="group-hover:text-amber-200">{room.id}</span>
                  <span className="text-[10px] text-amber-400/70">{copied ? '✅ 已複製' : '📋 複製'}</span>
                </button>
                <span className="text-slate-400 text-xs">• {room.name}</span>
              </div>
            ) : (
              <div className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                ✦ Blood & Deception ✦
              </div>
            )}
          </div>
        </div>

        {/* 中間：當前階段與倒數計時 */}
        {room && gamePhase !== 'WAITING' && (
          <div className="flex items-center gap-3">
            <div className={`px-4 py-1.5 rounded-full border text-xs font-bold tracking-wide backdrop-blur-md transition-all ${currentPhaseInfo.color}`}>
              {gameRound > 0 ? `第 ${gameRound} 輪 • ` : ''}{currentPhaseInfo.text}
            </div>

            {timeLeft > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 border border-red-600/80 rounded-full text-red-300 text-xs font-mono font-black shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse">
                <span>⏱️</span>
                <span>{timeLeft}s</span>
              </div>
            )}
          </div>
        )}

        {/* 右側：連線狀態與離開 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setTempMode(networkMode);
              setTempUrl(serverUrl);
              setShowServerModal(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            title="點擊切換連線模式"
          >
            <span className="relative flex h-2.5 w-2.5">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isConnected
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-red-500'
                }`}
              />
            </span>
            <span className="text-slate-300 font-mono text-[11px]">
              {networkMode === 'P2P' ? '🌐 P2P 免伺服器' : '🖥️ 自架後端'}
            </span>
            <span className="text-slate-500 text-[10px]">⚙️</span>
          </button>

          {room && (
            <button
              onClick={leaveRoom}
              className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-red-950/80 border border-slate-700 hover:border-red-600 rounded-xl text-xs text-slate-300 hover:text-red-200 transition-all shadow-sm cursor-pointer"
            >
              離開房間
            </button>
          )}
        </div>
      </header>

      {/* 連線模式設定 Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
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
