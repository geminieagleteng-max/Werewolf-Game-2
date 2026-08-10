import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

const PHASE_LABELS = {
  WAITING: { text: '大廳等待中', color: 'bg-zinc-900 text-zinc-400 border-zinc-800' },
  ASSIGNING_ROLES: { text: '發牌階段 🎴', color: 'bg-zinc-900 text-amber-300 border-amber-500/40' },
  NIGHT_START: { text: '夜幕降臨 🌙', color: 'bg-zinc-900 text-indigo-300 border-indigo-500/40' },
  NIGHT_GUARD: { text: '守衛行動 🛡️', color: 'bg-zinc-900 text-blue-300 border-blue-500/40' },
  NIGHT_WEREWOLF: { text: '狼人行動 🐺', color: 'bg-zinc-900 text-red-400 border-red-500/40' },
  NIGHT_SEER: { text: '預言家行動 🔮', color: 'bg-zinc-900 text-purple-300 border-purple-500/40' },
  NIGHT_WITCH: { text: '女巫行動 🧪', color: 'bg-zinc-900 text-emerald-300 border-emerald-500/40' },
  NIGHT_SILENCER: { text: '禁言長老行動 🤐', color: 'bg-zinc-900 text-indigo-300 border-indigo-500/40' },
  NIGHT_DREAMCATCHER: { text: '攝夢人行動 💤', color: 'bg-zinc-900 text-cyan-300 border-cyan-500/40' },
  NIGHT_CUPID: { text: '邱比特行動 💘', color: 'bg-zinc-900 text-rose-300 border-rose-500/40' },
  NIGHT_SETTLE: { text: '夜晚結算中', color: 'bg-zinc-900 text-zinc-400 border-zinc-800' },
  DAY_ANNOUNCE: { text: '天亮了 ☀️', color: 'bg-zinc-900 text-amber-300 border-amber-500/40' },
  DAY_DISCUSSION: { text: '白天自由發言', color: 'bg-zinc-900 text-sky-300 border-sky-500/40' },
  DAY_VOTING: { text: '放逐投票 🗳️', color: 'bg-zinc-900 text-orange-400 border-orange-500/40' },
  DAY_VOTE_RESULT: { text: '票數結算', color: 'bg-zinc-900 text-zinc-400 border-zinc-800' },
  HUNTER_SHOOT: { text: '獵人開槍 💥', color: 'bg-zinc-900 text-rose-400 border-rose-500/40' },
  GAME_OVER: { text: '遊戲結束', color: 'bg-zinc-900 text-amber-300 border-amber-500/40' },
};

// 簡約極簡線條狼標誌 (Minimalist Vector Wolf)
const MinimalWolfIcon = () => (
  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l3.5 7L12 3l4.5 8L20 4l-2 14-6 3-6-3L4 4z" />
      <circle cx="9" cy="11" r="0.9" fill="currentColor" />
      <circle cx="15" cy="11" r="0.9" fill="currentColor" />
      <path d="M12 14.5v2" />
    </svg>
  </div>
);

export const TopBar = ({ onOpenSkillGuide }) => {
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
    myPlayer,
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

  const currentPhaseInfo = PHASE_LABELS[gamePhase] || { text: gamePhase, color: 'bg-zinc-900 text-zinc-400 border-zinc-800' };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-zinc-950 border-b border-zinc-800/80 text-zinc-100">
        {/* 左側：極簡 Logo 與 房號標籤 */}
        <div className="flex items-center gap-3">
          <MinimalWolfIcon />
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Werewolf
            </span>
            <span className="text-[10px] font-medium text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">
              ONLINE
            </span>

            {room && (
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-zinc-800 text-xs text-zinc-400">
                <span>房號</span>
                <button
                  onClick={copyRoomCode}
                  className="font-mono text-zinc-200 bg-zinc-900 hover:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-800 transition-colors cursor-pointer"
                  title="點擊複製房號"
                >
                  <span>{room.id}</span>
                  <span className="text-[10px] text-zinc-500 ml-1.5">{copied ? '已複製' : '複製'}</span>
                </button>
                <span className="text-zinc-500 text-xs hidden md:inline">• {room.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* 中間：當前階段與倒數計時 */}
        {room && gamePhase !== 'WAITING' && (
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1 rounded-full border text-xs font-medium ${currentPhaseInfo.color}`}>
              {gameRound > 0 ? `第 ${gameRound} 輪 · ` : ''}{currentPhaseInfo.text}
            </div>

            {timeLeft > 0 && (
              <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-300 text-xs font-mono">
                {timeLeft}s
              </div>
            )}
          </div>
        )}

        {/* 右側：技能指南快捷鍵、連線狀態與操作 */}
        <div className="flex items-center gap-2.5">
          {room && (
            <button
              onClick={() => onOpenSkillGuide?.(myPlayer?.role)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-amber-600/30 hover:from-amber-500/30 hover:to-amber-600/40 border border-amber-500/50 rounded-lg text-xs text-amber-300 font-semibold transition-all cursor-pointer shadow-sm"
              title="查看角色技能說明與圖鑑"
            >
              <span>📖</span>
              <span className="hidden sm:inline">角色技能</span>
            </button>
          )}

          <button
            onClick={() => {
              setTempMode(networkMode);
              setTempUrl(serverUrl);
              setShowServerModal(true);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs transition-colors cursor-pointer text-zinc-300"
            title="連線設定"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span className="text-[11px] text-zinc-400">
              {networkMode === 'P2P' ? 'P2P 免伺服器' : '自架伺服器'}
            </span>
            <span className="text-zinc-500 text-[10px]">⚙️</span>
          </button>

          {room && (
            <button
              onClick={leaveRoom}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              離開
            </button>
          )}
        </div>
      </header>

      {/* 連線設定 Modal */}
      {showServerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-base font-semibold text-zinc-100 mb-1 flex items-center gap-2">
              連線設定
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              選擇連線方式進行多人遊戲
            </p>

            <div className="space-y-2.5 mb-5">
              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  tempMode === 'P2P'
                    ? 'bg-zinc-800/80 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-950/50 border-zinc-800 text-zinc-400'
                }`}
                onClick={() => setTempMode('P2P')}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={tempMode === 'P2P'}
                  onChange={() => setTempMode('P2P')}
                  className="mt-0.5 accent-white"
                />
                <div>
                  <div className="font-medium text-xs text-zinc-200">P2P 免伺服器模式（預設推薦）</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    直接透過瀏覽器互相連線，免架設後端，支援 AI 機器人與好友跨網連線。
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  tempMode === 'SERVER'
                    ? 'bg-zinc-800/80 border-zinc-600 text-zinc-100'
                    : 'bg-zinc-950/50 border-zinc-800 text-zinc-400'
                }`}
                onClick={() => setTempMode('SERVER')}
              >
                <input
                  type="radio"
                  name="mode"
                  checked={tempMode === 'SERVER'}
                  onChange={() => setTempMode('SERVER')}
                  className="mt-0.5 accent-white"
                />
                <div className="flex-1">
                  <div className="font-medium text-xs text-zinc-200">自架 WebSocket 伺服器</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5 mb-2">
                    連接至本地或雲端部署的獨立 Node.js 後端。
                  </div>
                  {tempMode === 'SERVER' && (
                    <input
                      type="text"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      placeholder="例: https://your-server.onrender.com 或 http://localhost:3000"
                      className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-100 focus:outline-none focus:border-zinc-400"
                    />
                  )}
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowServerModal(false)}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={() => {
                  switchNetworkMode(tempMode, tempUrl);
                  setShowServerModal(false);
                }}
                className="px-3.5 py-1.5 bg-white hover:bg-zinc-200 text-zinc-950 font-semibold text-xs rounded-lg cursor-pointer"
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
