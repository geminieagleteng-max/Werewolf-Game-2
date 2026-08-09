import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';

export const Lobby = () => {
  const {
    room,
    myPlayer,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    kickPlayer,
    addBot,
    fillBots,
    errorMessage,
    setErrorMessage,
    networkMode,
  } = useSocket();

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('werewolf_player_name') || '福爾摩斯');
  const [roomName, setRoomName] = useState('歡樂狼人殺');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHost = myPlayer?.isHost;
  const isReady = myPlayer?.isReady;
  const playerCount = room?.playerCount || 0;
  const max = room?.maxPlayers || 6;

  const handleNameChange = (e) => {
    const val = e.target.value;
    setPlayerName(val);
    localStorage.setItem('werewolf_player_name', val);
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('請輸入玩家暱稱！');
      return;
    }
    setLoading(true);
    await createRoom(playerName.trim(), roomName.trim(), maxPlayers);
    setLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('請輸入玩家暱稱！');
      return;
    }
    if (!joinRoomId.trim()) {
      setErrorMessage('請輸入 6 位房間代碼！');
      return;
    }
    setLoading(true);
    await joinRoom(playerName.trim(), joinRoomId.trim());
    setLoading(false);
  };

  const copyRoomCode = () => {
    if (room?.id) {
      navigator.clipboard.writeText(room.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 判斷是否可開始遊戲 (人數全滿且非房主全員準備)
  const canStart =
    isHost &&
    playerCount === max &&
    room?.players.every((p) => (p.isHost ? true : p.isReady));

  // 未進入房間時的登入/創房介面
  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-65px)] p-6 bg-slate-950">
        <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl">
          {/* 連線模式提示徽章 */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span>
                模式：
                <b className="text-amber-400">
                  {networkMode === 'P2P' ? '🌐 P2P 免伺服器（免架設後端，即開即玩）' : '🖥️ 自架 WebSocket 伺服器'}
                </b>
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              支援手機/電腦跨裝置連線 & AI 人機
            </div>
          </div>

          {/* 錯誤提示 */}
          {errorMessage && (
            <div className="mb-6 p-4 bg-red-950/60 border border-red-500 rounded-xl flex items-center justify-between text-red-200 text-xs animate-shake">
              <div className="flex items-center gap-2">
                <span>🚫</span>
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-slate-400 hover:text-white ml-2 text-base font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-950/40 border border-amber-500/30 rounded-full text-xs text-amber-300 font-mono tracking-wider mb-3">
              <span>✦</span>
              <span>MOONLIT BATTLE LOBBY</span>
              <span>✦</span>
            </div>
            <h2 className="text-4xl font-display font-black tracking-wider bg-gradient-to-r from-amber-100 via-amber-300 to-rose-500 bg-clip-text text-transparent drop-shadow-[0_4px_15px_rgba(245,158,11,0.3)]">
              線上狼人殺大廳
            </h2>
            <p className="text-sm text-slate-400 mt-2">創建或加入房間，展開一場智謀與欺瞞的暗夜對決</p>
          </div>

          {/* 玩家暱稱輸入 */}
          <div className="max-w-md mx-auto mb-8">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              您的玩家暱稱
            </label>
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="輸入遊戲暱稱..."
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 創建房間區塊 */}
            <div className="bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 rounded-xl p-6 transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2">
                  <span>🏰</span> 創建新房間
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">房間名稱</label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">人數板子配置 (6~9人)</label>
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value={6}>6 人局 (2狼 1預 1女 1獵 1民)</option>
                      <option value={7}>7 人局 (2狼 1預 1女 1獵 2民)</option>
                      <option value={8}>8 人局 (3狼 1預 1女 1獵 2民)</option>
                      <option value={9}>9 人局 (3狼 1預 1女 1獵 1守 2民)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="mt-6 w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-950/40 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? '正在建立房間...' : '➕ 建立房間 (支援 AI 補位)'}
              </button>
            </div>

            {/* 加入房間區塊 */}
            <div className="bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 rounded-xl p-6 transition-all flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">
                  <span>🚪</span> 加入既有房間
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">6 位英文/數字房間代碼</label>
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="例: 4CKLDU"
                      maxLength={6}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono tracking-widest text-center text-lg focus:outline-none focus:border-indigo-500 uppercase"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="mt-6 w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl border border-slate-700 hover:border-indigo-500 shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
              >
                {loading ? '正在加入...' : '🚀 進入房間'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 房間大廳等待介面 (座位席與準備控制)
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 頂部房間概況卡片 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{room.name}</h2>
              <button
                onClick={copyRoomCode}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-full text-xs font-mono font-bold transition-all cursor-pointer"
                title="點擊複製房號"
              >
                <span>代碼: {room.id}</span>
                <span>{copied ? '✅ 已複製' : '📋 點擊複製'}</span>
              </button>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              當前人數：<b className="text-white">{playerCount}</b> / {max} 人 •
              板子配置：{room.roleConfig?.join('、') || '標準配置'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isHost ? (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all ${
                  canStart
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 cursor-pointer animate-bounce'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                {canStart ? '🚀 開始遊戲 (發牌)' : `等待玩家準備 (${playerCount}/${max})`}
              </button>
            ) : (
              <button
                onClick={toggleReady}
                className={`px-6 py-3 rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer ${
                  isReady
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/50'
                }`}
              >
                {isReady ? '✅ 已準備 (點擊取消)' : '⏳ 點擊準備'}
              </button>
            )}
          </div>
        </div>

        {/* 房主專屬 AI 補位工具欄 */}
        {isHost && playerCount < max && (
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>🤖</span>
              <span>人數不足？您可以隨時召喚 AI 機器人補位測試或進行單人/少人遊玩！</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={addBot}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-amber-300 font-semibold transition-all cursor-pointer"
              >
                ➕ 新增 1 名 AI
              </button>
              <button
                onClick={fillBots}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-lg text-xs shadow transition-all cursor-pointer"
              >
                🤖 一鍵補滿 AI
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 座位圓桌網格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: max }).map((_, idx) => {
          const seatNum = idx + 1;
          const player = room.players.find((p) => p.seatNumber === seatNum);

          if (!player) {
            return (
              <div
                key={seatNum}
                className="h-40 border-2 border-dashed border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-slate-600 bg-slate-950/40"
              >
                <span className="text-xl font-mono mb-1">#{seatNum}</span>
                <span className="text-xs">空位等待加入</span>
                {isHost && (
                  <button
                    onClick={addBot}
                    className="mt-2 text-[11px] text-amber-400/80 hover:text-amber-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 cursor-pointer"
                  >
                    + 加入 AI
                  </button>
                )}
              </div>
            );
          }

          const isMe = player.id === myPlayer?.id;

          return (
            <div
              key={player.id}
              className={`h-40 rounded-2xl p-4 flex flex-col justify-between border transition-all relative ${
                isMe
                  ? 'bg-slate-900 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              {/* 座位號與身分標籤 */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">
                  #{player.seatNumber} 號位
                </span>
                <div className="flex items-center gap-1.5">
                  {player.isHost && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold">
                      👑 房主
                    </span>
                  )}
                  {player.isBot && (
                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded text-[10px] font-bold">
                      🤖 AI
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      player.isReady
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {player.isReady ? '已就緒' : '未準備'}
                  </span>
                </div>
              </div>

              {/* 玩家頭像與暱稱 */}
              <div className="text-center my-auto">
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-xl shadow-inner mb-2">
                  {player.isBot ? '🤖' : '👤'}
                </div>
                <div className="font-bold text-sm text-white truncate px-2">
                  {player.name} {isMe && '(我)'}
                </div>
              </div>

              {/* 房主踢人 / 移除操作 */}
              {isHost && !player.isHost && (
                <button
                  onClick={() => kickPlayer(player.id)}
                  className="text-[11px] text-red-400 hover:text-red-300 hover:underline text-center cursor-pointer"
                >
                  {player.isBot ? '移除 AI' : '請離房間'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Lobby;
