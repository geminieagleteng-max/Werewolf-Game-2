import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

export const DayVoteChat = () => {
  const {
    room,
    myPlayer,
    gamePhase,
    castDayVote,
    sendChat,
    chatMessages,
    systemLogs,
  } = useSocket();

  const [selectedVoteTargetId, setSelectedVoteTargetId] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef(null);

  const isVotingPhase = gamePhase === 'DAY_VOTING';
  const isDiscussionPhase = gamePhase === 'DAY_DISCUSSION';
  const alivePlayers = room?.players.filter((p) => p.isAlive) || [];

  // 自動滾動聊天室
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, systemLogs]);

  // 換階段時重置投票狀態
  useEffect(() => {
    if (gamePhase === 'DAY_VOTING') {
      setHasVoted(false);
      setSelectedVoteTargetId(null);
    }
  }, [gamePhase]);

  const handleSendChat = (e) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendChat(chatInput);
      setChatInput('');
    }
  };

  const handleVoteSubmit = () => {
    castDayVote(selectedVoteTargetId);
    setHasVoted(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* 1. 白天階段狀態指標 */}
      <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {isVotingPhase ? '🗳️' : isDiscussionPhase ? '💬' : '☀️'}
          </span>
          <span className="font-bold text-sm text-white">
            {isVotingPhase
              ? '白天放逐投票階段'
              : isDiscussionPhase
              ? '白天自由討論發言中'
              : '白天階段'}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          存活玩家: <b className="text-emerald-400">{alivePlayers.length}</b> 人
        </span>
      </div>

      {/* 2. 投票操作區塊 (僅在投票階段顯示) */}
      {isVotingPhase && myPlayer?.isAlive && myPlayer?.canVote && (
        <div className="p-4 bg-orange-950/30 border-b border-orange-900/50">
          <h4 className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wider">
            請點擊選擇放逐目標：
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            {alivePlayers.map((p) => (
              <button
                key={p.id}
                disabled={hasVoted}
                onClick={() => setSelectedVoteTargetId(p.id)}
                className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  selectedVoteTargetId === p.id
                    ? 'bg-orange-600 border-orange-400 text-white shadow-md scale-105'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-orange-500'
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
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer"
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
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl text-xs border border-slate-700 cursor-pointer"
            >
              棄票
            </button>
          </div>
        </div>
      )}

      {/* 3. 聊天與系統公報整合流 */}
      <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3">
        {/* 系統即時廣播 */}
        {systemLogs.slice(-6).map((log) => (
          <div
            key={log.id}
            className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-amber-300/90 leading-relaxed font-mono"
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
              <div className="text-[10px] text-slate-400 mb-0.5">
                #{msg.seatNumber} {msg.senderName} {!msg.isAlive && '(已出局)'}
              </div>
              <div
                className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-amber-600 text-slate-950 font-medium rounded-br-none'
                    : 'bg-slate-800 text-white rounded-bl-none border border-slate-700'
                }`}
              >
                {msg.message}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. 發言輸入列 */}
      <form onSubmit={handleSendChat} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder={myPlayer?.isAlive ? '輸入發言訊息...' : '已出局，靜待遊戲結束...'}
          disabled={!myPlayer?.isAlive}
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!myPlayer?.isAlive || !chatInput.trim()}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold rounded-xl text-sm shadow-md transition-all cursor-pointer"
        >
          送出
        </button>
      </form>
    </div>
  );
};

export default DayVoteChat;
