import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { formatRoleConfigZh } from '../engine/roles';

const AVAILABLE_CUSTOM_ROLES = [
  { id: 'WEREWOLF', name: '狼人', icon: '🐺', max: 5 },
  { id: 'SEER', name: '預言家', icon: '🔮', max: 2 },
  { id: 'WITCH', name: '女巫', icon: '🧪', max: 2 },
  { id: 'HUNTER', name: '獵人', icon: '💥', max: 2 },
  { id: 'GUARD', name: '守衛', icon: '🛡️', max: 2 },
  { id: 'KNIGHT', name: '騎士', icon: '⚔️', max: 2 },
  { id: 'SILENCER', name: '禁言長老', icon: '🤐', max: 2 },
  { id: 'DREAMCATCHER', name: '攝夢人', icon: '💤', max: 2 },
  { id: 'CUPID', name: '邱比特', icon: '💘', max: 2 },
  { id: 'IDIOT', name: '白痴', icon: '🤡', max: 2 },
  { id: 'VILLAGER', name: '村民', icon: '👨‍🌾', max: 8 },
];

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
    isMicMuted,
    toggleMic,
    isSpeaking,
    micLevel,
    setIsMicSettingsOpen,
  } = useSocket();

  const [playerName, setPlayerName] = useState(() => localStorage.getItem('werewolf_player_name') || '玩家一');
  const [roomName, setRoomName] = useState('狼人殺');
  const [boardPreset, setBoardPreset] = useState('6'); // '6' | '7' | '8' | '9' | '10' | '12' | 'CUSTOM'
  const [customRoles, setCustomRoles] = useState({
    WEREWOLF: 2,
    SEER: 1,
    WITCH: 1,
    HUNTER: 1,
    GUARD: 1,
    KNIGHT: 0,
    SILENCER: 0,
    DREAMCATCHER: 0,
    CUPID: 0,
    IDIOT: 0,
    VILLAGER: 2,
  });

  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const isHost = myPlayer?.isHost;
  const isReady = myPlayer?.isReady;
  const playerCount = room?.playerCount || 0;
  const max = room?.maxPlayers || 6;

  const totalCustomPlayers = Object.values(customRoles).reduce((a, b) => a + b, 0);

  const handleNameChange = (e) => {
    const val = e.target.value;
    setPlayerName(val);
    localStorage.setItem('werewolf_player_name', val);
  };

  const updateRoleCount = (roleId, delta) => {
    setCustomRoles((prev) => {
      const current = prev[roleId] || 0;
      const targetRole = AVAILABLE_CUSTOM_ROLES.find((r) => r.id === roleId);
      const maxCount = targetRole ? targetRole.max : 6;
      const updated = Math.max(0, Math.min(maxCount, current + delta));
      return { ...prev, [roleId]: updated };
    });
  };

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('請輸入暱稱');
      return;
    }

    if (boardPreset === 'CUSTOM') {
      if (customRoles.WEREWOLF < 1) {
        setErrorMessage('自定義板子至少需要 1 名狼人！');
        return;
      }
      const goodCount = totalCustomPlayers - customRoles.WEREWOLF;
      if (goodCount < 1) {
        setErrorMessage('自定義板子至少需要 1 名好人陣營玩家！');
        return;
      }
      if (totalCustomPlayers < 3 || totalCustomPlayers > 12) {
        setErrorMessage('自定義總人數需介於 3 至 12 人之間！');
        return;
      }

      const customRoleArray = [];
      AVAILABLE_CUSTOM_ROLES.forEach(({ id }) => {
        const count = customRoles[id] || 0;
        for (let i = 0; i < count; i++) {
          customRoleArray.push(id);
        }
      });

      setLoading(true);
      await createRoom(playerName.trim(), roomName.trim(), totalCustomPlayers, customRoleArray);
      setLoading(false);
    } else {
      const pCount = Number(boardPreset);
      setLoading(true);
      await createRoom(playerName.trim(), roomName.trim(), pCount);
      setLoading(false);
    }
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
          <div className="max-w-sm mx-auto mb-5">
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

          {/* 麥克風快速檢測條 */}
          <div className="max-w-sm mx-auto mb-8 p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isMicMuted
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400 shadow-sm'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
                }`}
                title={!isMicMuted ? '麥克風開啟中（點擊靜音）' : '麥克風已靜音（點擊開麥）'}
              >
                {!isMicMuted ? '🎙️' : '🔇'}
              </button>
              <div>
                <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <span>{!isMicMuted ? '麥克風已開啟' : '麥克風已靜音'}</span>
                  {!isMicMuted && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        micLevel > 15 ? 'bg-emerald-300 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                  )}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {!isMicMuted
                    ? isSpeaking
                      ? '🟢 正在發言中...'
                      : `收音就緒 (${micLevel}%)`
                    : '支援 WebRTC 多人即時語音通話'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMicSettingsOpen(true)}
              className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/80 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>⚙️ 設定</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* 創建新房間 */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between h-full">
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
                    <label className="block text-[11px] text-zinc-400 mb-1">人數與板子配置</label>
                    <select
                      value={boardPreset}
                      onChange={(e) => setBoardPreset(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer"
                    >
                      <option value="6">6 人標準局 (2狼 1預 1女 1獵 1民)</option>
                      <option value="7">7 人標準局 (2狼 1預 1女 1獵 2民)</option>
                      <option value="8">8 人標準局 (3狼 1預 1女 1獵 2民)</option>
                      <option value="9">9 人守衛局 (3狼 1預 1女 1獵 1守 2民)</option>
                      <option value="10">10 人騎士局 (3狼 1預 1女 1獵 1守 1騎 2民)</option>
                      <option value="12">12 人標準大局 (4狼 1預 1女 1獵 1守 1騎 3民)</option>
                      <option value="CUSTOM">🛠️ 自定義局（自選人數與 11 種職業組成）</option>
                    </select>
                  </div>

                  {/* 自定義板子設定器 */}
                  {boardPreset === 'CUSTOM' && (
                    <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2.5 mt-2">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800">
                        <span className="font-semibold text-zinc-200">職業人數微調</span>
                        <span className="font-mono text-zinc-300 font-bold">
                          總人數：<span className="text-amber-400">{totalCustomPlayers}</span> 人
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {AVAILABLE_CUSTOM_ROLES.map((r) => {
                          const count = customRoles[r.id] || 0;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-1.5 bg-zinc-950/60 border border-zinc-800/80 rounded-lg text-xs"
                            >
                              <div className="flex items-center gap-1.5">
                                <span>{r.icon}</span>
                                <span className="text-zinc-200 font-medium">{r.name}</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateRoleCount(r.id, -1)}
                                  disabled={count <= 0}
                                  className="w-5 h-5 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 rounded text-xs font-bold cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="font-mono font-bold w-4 text-center text-zinc-100">
                                  {count}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateRoleCount(r.id, 1)}
                                  disabled={count >= r.max}
                                  className="w-5 h-5 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 rounded text-xs font-bold cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="mt-6 w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? '建立中...' : boardPreset === 'CUSTOM' ? `建立 ${totalCustomPlayers} 人自定義房間` : '建立房間'}
              </button>
            </div>

            {/* 加入既有房間 */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between h-full">
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
              配置：{formatRoleConfigZh(room.roleConfig)}
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

        {/* 語音麥克風狀態列 */}
        <div className="mt-4 pt-3.5 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMic}
              className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                !isMicMuted
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400 shadow-sm'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              }`}
            >
              <span>{!isMicMuted ? '🎙️' : '🔇'}</span>
              <span>{!isMicMuted ? (isSpeaking ? '發言中...' : '麥克風已開') : '點擊開麥通話'}</span>
              {!isMicMuted && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    micLevel > 15 ? 'bg-emerald-300 animate-ping' : 'bg-emerald-400'
                  }`}
                />
              )}
            </button>
            <span className="text-[11px] text-zinc-400">零延遲 WebRTC 多人即時語音</span>
          </div>

          <button
            type="button"
            onClick={() => setIsMicSettingsOpen(true)}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
          >
            <span>⚙️ 麥克風音訊設定</span>
          </button>
        </div>

        {/* 房主 AI 工具列 */}
        {isHost && playerCount < max && (
          <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
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
                  onClick={() => {
                    if (window.confirm(`確定要將【${player.name}】請出房間嗎？`)) {
                      kickPlayer(player.id);
                    }
                  }}
                  className="px-2 py-0.5 text-[10px] bg-red-950/60 hover:bg-red-900 border border-red-800/80 text-red-300 rounded cursor-pointer transition-colors"
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
