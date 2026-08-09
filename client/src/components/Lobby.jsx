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

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('werewolf_player_name') || '玩家一');
  const [roomName, setRoomName] = useState('狼人殺');
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
      setErrorMessage('請輸入暱稱');
      return;
    }
    setLoading(true);
    await createRoom(playerName.trim(), roomName.trim(), maxPlayers);
    setLoading(false);
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('請輸入暱稱');
      return;
    }
    if (!joinRoomId.trim()) {
      setErrorMessage('請輸入 6 位房間代碼');
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

  const canStart =
    isHost &&
    playerCount === max &&
    room?.players.every((p) => (p.isHost ? true : p.isReady));

  // 未進入房間時的登入/創房介面
  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-60px)] p-6 bg-zinc-950">
        <div className="w-full max-w-3xl bg-zinc-900/70 border border-zinc-800 rounded-2xl p-8 shadow-sm backdrop-blur-md">
          {/* 頂部極簡標題 */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
              線上狼人殺
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5">
              創建新房間或輸入代碼加入既有對局
            </p>
          </div>

          {/* 錯誤提示 */}
          {errorMessage && (
            <div className="mb-6 p-3 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center justify-between text-red-300 text-xs">
              <div className="flex items-center gap-2">
                <span>✕</span>
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-zinc-500 hover:text-zinc-300 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* 暱稱輸入 */}
          <div className="max-w-sm mx-auto mb-8">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              玩家暱稱
            </label>
            <input
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="輸入您的暱稱..."
              className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 創建新房間 */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-3.5 flex items-center gap-2">
                  <span>＋</span> 創建新房間
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">房間名稱</label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">人數配置</label>
                    <select
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer"
                    >
                      <option value={6}>6 人 (2狼 1預 1女 1獵 1民)</option>
                      <option value={7}>7 人 (2狼 1預 1女 1獵 2民)</option>
                      <option value={8}>8 人 (3狼 1預 1女 1獵 2民)</option>
                      <option value={9}>9 人 (3狼 1預 1女 1獵 1守 2民)</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="mt-6 w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? '建立中...' : '建立房間'}
              </button>
            </div>

            {/* 加入既有房間 */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-200 mb-3.5 flex items-center gap-2">
                  <span>→</span> 加入房間
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">6 位房間代碼</label>
                    <input
                      type="text"
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                      placeholder="例如: 4CKLDU"
                      maxLength={6}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 font-mono tracking-widest text-center text-sm focus:outline-none focus:border-zinc-500 uppercase"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleJoinRoom}
                disabled={loading}
                className="mt-6 w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? '加入中...' : '進入房間'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 房間大廳等待介面
  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 頂部房間概況卡片 */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-zinc-100">{room.name}</h2>
              <button
                onClick={copyRoomCode}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-md text-xs font-mono transition-colors cursor-pointer"
                title="點擊複製房號"
              >
                <span>代碼: {room.id}</span>
                <span className="text-[10px] text-zinc-500">{copied ? '已複製' : '複製'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              人數：<span className="text-zinc-200 font-medium">{playerCount}</span> / {max} ·
              配置：{room.roleConfig?.join('、') || '標準配置'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {isHost ? (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`px-5 py-2 rounded-lg font-semibold text-xs transition-colors ${
                  canStart
                    ? 'bg-zinc-100 hover:bg-white text-zinc-950 cursor-pointer'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-800 cursor-not-allowed'
                }`}
              >
                {canStart ? '開始遊戲' : `等待準備 (${playerCount}/${max})`}
              </button>
            ) : (
              <button
                onClick={toggleReady}
                className={`px-5 py-2 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                  isReady
                    ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                {isReady ? '✓ 已準備' : '點擊準備'}
              </button>
            )}
          </div>
        </div>

        {/* 房主 AI 工具列 */}
        {isHost && playerCount < max && (
          <div className="mt-4 pt-3.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-zinc-400">人數不足？可使用 AI 機器人補位測試：</span>
            <div className="flex items-center gap-2">
              <button
                onClick={addBot}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 text-xs transition-colors cursor-pointer"
              >
                + 1 名 AI
              </button>
              <button
                onClick={fillBots}
                className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-medium rounded text-xs transition-colors cursor-pointer"
              >
                補滿 AI
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 座位席 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: max }).map((_, idx) => {
          const seatNum = idx + 1;
          const player = room.players.find((p) => p.seatNumber === seatNum);

          if (!player) {
            return (
              <div
                key={seatNum}
                className="h-36 border border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-600 bg-zinc-950/40"
              >
                <span className="text-sm font-mono mb-1">#{seatNum}</span>
                <span className="text-[11px]">空位</span>
                {isHost && (
                  <button
                    onClick={addBot}
                    className="mt-1.5 text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 cursor-pointer"
                  >
                    + AI
                  </button>
                )}
              </div>
            );
          }

          const isMe = player.id === myPlayer?.id;

          return (
            <div
              key={player.id}
              className={`h-36 rounded-xl p-3.5 flex flex-col justify-between border transition-all ${
                isMe
                  ? 'bg-zinc-900 border-zinc-500 shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              {/* 座位號與身分標籤 */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">
                  #{player.seatNumber}
                </span>
                <div className="flex items-center gap-1">
                  {player.isHost && (
                    <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-300 border border-zinc-700 rounded text-[10px]">
                      房主
                    </span>
                  )}
                  {player.isBot && (
                    <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded text-[10px]">
                      AI
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      player.isReady
                        ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                        : 'text-zinc-500 bg-zinc-950 border border-zinc-800'
                    }`}
                  >
                    {player.isReady ? '就緒' : '未準備'}
                  </span>
                </div>
              </div>

              {/* 玩家暱稱 */}
              <div className="text-center my-auto">
                <div className="text-sm font-medium text-zinc-200 truncate">
                  {player.name} {isMe && '(我)'}
                </div>
              </div>

              {/* 房主踢人 / 移除操作 */}
              {isHost && !player.isHost && (
                <button
                  onClick={() => kickPlayer(player.id)}
                  className="text-[10px] text-zinc-500 hover:text-red-400 text-center cursor-pointer transition-colors"
                >
                  {player.isBot ? '移除' : '請離'}
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
