import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const DayVoteChat = () => {
  const {
    room,
    myPlayer,
    gamePhase,
    castDayVote,
    voteSkipDiscussion,
    skipDiscussionData,
    sendChat,
    knightDuel,
    chatMessages,
    systemLogs,
    equippedTitle,
  } = useSocket();

  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState(null);
  const [selectedDuelTargetId, setSelectedDuelTargetId] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef(null);

  const isVotingPhase = gamePhase === 'DAY_VOTING';
  const isDiscussionPhase = gamePhase === 'DAY_DISCUSSION';
  const alivePlayers = room?.players.filter((p) => p.isAlive) || [];

  // 計算跳過發言門檻與進度
  const aliveCount = skipDiscussionData?.aliveCount || alivePlayers.length;
  const neededVotes = skipDiscussionData?.neededVotes || Math.max(1, Math.ceil(aliveCount * (2 / 3)));
  const skipVoters = skipDiscussionData?.skipVoters || [];
  const hasMySkipVote = myPlayer ? skipVoters.includes(myPlayer.id) : false;
  const progressPercent = Math.min(100, Math.round((skipVoters.length / neededVotes) * 100));

  // 自動滾動聊天室
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, systemLogs]);

  // 換階段時重置狀態
  useEffect(() => {
    if (gamePhase === 'DAY_VOTING') {
      setHasVoted(false);
      setSelectedVoteTargetId(null);
    }
  }, [gamePhase]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim() && !myPlayer?.isSilenced) {
      sendChat(chatInput);
      setChatInput('');
    }
  };

  const handleVoteSubmit = () => {
    castDayVote(selectedVoteTargetId);
    setHasVoted(true);
  };

  const isKnightCanDuel =
    isDiscussionPhase &&
    myPlayer?.role === 'KNIGHT' &&
    myPlayer?.isAlive &&
    !myPlayer?.hasUsedKnightDuel;

  return (
    <div className="flex flex-col h-full bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
      {/* 1. 白天階段狀態指標 */}
      <div className="px-5 py-3 bg-zinc-950/90 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">
            {isVotingPhase ? '🗳️' : isDiscussionPhase ? '💬' : '☀️'}
          </span>
          <span className="font-semibold text-xs text-zinc-100">
            {isVotingPhase
              ? '白天放逐投票階段'
              : isDiscussionPhase
              ? '白天自由發言中'
              : '白天階段'}
          </span>
        </div>
        <span className="text-[11px] text-zinc-400">
          存活玩家: <b className="text-emerald-400">{alivePlayers.length}</b> 人
        </span>
      </div>

      {/* 2. 白天發言階段：跳過發言投票組件 (超過 2/3 同意即跳過) */}
      {isDiscussionPhase && (
        <div className="p-3.5 bg-gradient-to-r from-sky-950/40 via-zinc-950/80 to-amber-950/30 border-b border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">⏩</span>
              <span className="text-xs font-bold text-zinc-200">
                跳過討論投票
              </span>
              <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded font-mono">
                {skipVoters.length} / {neededVotes} 票（達 2/3 即跳過）
              </span>
            </div>

            {myPlayer?.isAlive && (
              <button
                type="button"
                onClick={() => voteSkipDiscussion(!hasMySkipVote)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1 ${
                  hasMySkipVote
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-400'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40'
                }`}
              >
                <span>{hasMySkipVote ? '✅' : '⏩'}</span>
                <span>{hasMySkipVote ? '已同意跳過 (點擊撤回)' : '投票跳過討論'}</span>
              </button>
            )}
          </div>

          {/* 進度條 */}
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                progressPercent >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 animate-pulse'
                  : 'bg-gradient-to-r from-amber-500 to-sky-400'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* 已同意跳過的玩家名單徽章 */}
          {skipVoters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-[10px] text-zinc-400">
              <span className="text-zinc-500">已同意:</span>
              {skipVoters.map((vId) => {
                const voter = room?.players.find((p) => p.id === vId);
                if (!voter) return null;
                return (
                  <span
                    key={vId}
                    className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded"
                  >
                    #{voter.seatNumber} {voter.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. 騎士決鬥技能區塊 (僅在白天討論階段騎士專屬) */}
      {isKnightCanDuel && (
        <div className="p-3.5 bg-amber-950/40 border-b border-amber-800/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-300 flex items-center gap-1">
              <span>⚔️</span> 騎士決鬥技能（全場限 1 次）
            </span>
            <span className="text-[10px] text-zinc-400">點擊目標並決鬥</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2.5">
            {alivePlayers
              .filter((p) => p.id !== myPlayer.id)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedDuelTargetId(p.id)}
                  className={`p-2 rounded-lg border text-xs font-medium transition-all ${
                    selectedDuelTargetId === p.id
                      ? 'bg-amber-600 border-amber-400 text-white shadow-sm'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-amber-500/50'
                  } cursor-pointer`}
                >
                  #{p.seatNumber} {p.name}
                </button>
              ))}
          </div>

          <button
            onClick={() => {
              if (selectedDuelTargetId) {
                knightDuel(selectedDuelTargetId);
              }
            }}
            disabled={!selectedDuelTargetId}
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            ⚔️ 拔劍決鬥該玩家
          </button>
        </div>
      )}

      {/* 4. 投票操作區塊 (僅在投票階段顯示) */}
      {isVotingPhase && myPlayer?.isAlive && myPlayer?.canVote && (
        <div className="p-4 bg-zinc-950/80 border-b border-zinc-800">
          <h4 className="text-xs font-semibold text-zinc-300 mb-2">
            請點擊選擇放逐目標：
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {alivePlayers.map((p) => (
              <button
                key={p.id}
                disabled={hasVoted}
                onClick={() => setSelectedVoteTargetId(p.id)}
                className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedVoteTargetId === p.id
                    ? 'bg-zinc-100 border-white text-zinc-950 font-semibold shadow-sm'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                } ${hasVoted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                #{p.seatNumber} {p.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVoteSubmit}
              disabled={hasVoted || !selectedVoteTargetId}
              className="flex-1 py-2.5 bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              {hasVoted ? '✅ 已投出放逐票' : '🗳️ 確認投出'}
            </button>
            <button
              onClick={() => {
                setSelectedVoteTargetId(null);
                castDayVote(null);
                setHasVoted(true);
              }}
              disabled={hasVoted}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs rounded-lg cursor-pointer"
            >
              棄票
            </button>
          </div>
        </div>
      )}

      {/* 5. 聊天與系統公報整合流 */}
      <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-2.5">
        {/* 系統即時廣播 */}
        {systemLogs.slice(-8).map((log) => (
          <div
            key={log.id}
            className="p-2.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl text-xs text-zinc-300 leading-relaxed font-mono"
          >
            [系統] {log.text}
          </div>
        ))}

        {/* 玩家發言流 */}
        {chatMessages.map((msg, idx) => {
          const isMe = msg.senderId === myPlayer?.id;
          return (
            <div
              key={idx}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-zinc-500 mb-0.5 flex items-center gap-1">
                <span>#{msg.seatNumber} {msg.senderName}</span>
                {isMe && equippedTitle && (
                  <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/60">
                    【{equippedTitle}】
                  </span>
                )}
                {!msg.isAlive && <span>(已出局)</span>}
              </div>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? 'bg-zinc-100 text-zinc-950 font-medium rounded-br-none'
                    : 'bg-zinc-800 text-zinc-100 rounded-bl-none border border-zinc-700/60'
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      {/* 6. 發言輸入列 */}
      <form onSubmit={handleSendChat} className="p-3 bg-zinc-950 border-t border-zinc-800 flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={
            !myPlayer?.isAlive
              ? '已出局，靜待遊戲結束...'
              : myPlayer?.isSilenced
              ? '🤐 您今日被禁言長老禁言，無法在聊天室發言'
              : '輸入發言訊息...'
          }
          disabled={!myPlayer?.isAlive || myPlayer?.isSilenced}
          className="flex-1 px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-zinc-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!myPlayer?.isAlive || myPlayer?.isSilenced || !chatInput.trim()}
          className="px-4 py-2 bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
        >
          送出
        </button>
      </form>
    </div>
  );
};

export default DayVoteChat;
