import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

// 預設伺服器 URL (優先取環境變數，次取 localStorage，最後預設 localhost:3000)
const getDefaultServerUrl = () => {
  if (import.meta.env.VITE_SOCKET_SERVER_URL) {
    return import.meta.env.VITE_SOCKET_SERVER_URL;
  }
  const saved = localStorage.getItem('werewolf_server_url');
  if (saved) return saved;

  // 若在本地開發
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'http://localhost:3000';
};

export const SocketProvider = ({ children }) => {
  const [serverUrl, setServerUrl] = useState(getDefaultServerUrl);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [myRoleInfo, setMyRoleInfo] = useState(null);
  const [gamePhase, setGamePhase] = useState('WAITING');
  const [gameRound, setGameRound] = useState(0);
  const [phaseDuration, setPhaseDuration] = useState(0);
  const [systemLogs, setSystemLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [seerCheckResult, setSeerCheckResult] = useState(null);
  const [witchNightInfo, setWitchNightInfo] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);

  const updateServerUrl = (newUrl) => {
    if (newUrl && newUrl.trim()) {
      const formatted = newUrl.trim().replace(/\/$/, '');
      localStorage.setItem('werewolf_server_url', formatted);
      setServerUrl(formatted);
    }
  };

  useEffect(() => {
    if (!serverUrl) return;

    const s = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });
    setSocket(s);

    s.on('connect', () => {
      setIsConnected(true);
      addSystemLog(`🟢 已成功連線至伺服器 [${serverUrl}]`);
    });

    s.on('connect_error', (err) => {
      setIsConnected(false);
      addSystemLog(`⚠️ 連線至 [${serverUrl}] 失敗，請確認後端已啟動或更換伺服器網址。`);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      addSystemLog('🔴 與伺服器連線中斷');
    });

    s.on('room:state_update', (updatedRoom) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find((p) => p.id === s.id);
      if (me) setMyPlayer(me);
    });

    s.on('game:role_assigned', ({ player, roleInfo }) => {
      setMyPlayer(player);
      setMyRoleInfo(roleInfo);
      addSystemLog(`🎴 您的身分牌已發放：【${roleInfo.name}】`);
    });

    s.on('game:phase_change', ({ phase, round, duration }) => {
      setGamePhase(phase);
      setGameRound(round);
      setPhaseDuration(duration);
    });

    s.on('game:system_message', ({ message }) => {
      addSystemLog(message);
    });

    s.on('action:receive_chat', (chat) => {
      setChatMessages((prev) => [...prev, chat]);
    });

    s.on('action:seer_result', (result) => {
      setSeerCheckResult(result);
    });

    s.on('action:witch_night_info', (info) => {
      setWitchNightInfo(info);
    });

    s.on('game:over', (data) => {
      setGameOverData(data);
      addSystemLog(`🏆 遊戲結束！${data.reason}`);
    });

    return () => {
      s.disconnect();
    };
  }, [serverUrl]);

  const addSystemLog = useCallback((msg) => {
    setSystemLogs((prev) => [...prev, { id: Date.now() + Math.random(), text: msg, time: new Date() }]);
  }, []);

  // 快捷 Emitter 函式
  const createRoom = (playerName, roomName, maxPlayers) => {
    socket?.emit('room:create', { playerName, roomName, maxPlayers });
  };

  const joinRoom = (playerName, roomId) => {
    socket?.emit('room:join', { playerName, roomId });
  };

  const toggleReady = () => {
    socket?.emit('room:toggle_ready');
  };

  const startGame = () => {
    socket?.emit('game:start');
  };

  const leaveRoom = () => {
    socket?.emit('room:leave');
    setRoom(null);
    setMyPlayer(null);
    setMyRoleInfo(null);
    setGamePhase('WAITING');
    setGameOverData(null);
  };

  const kickPlayer = (targetPlayerId) => {
    socket?.emit('room:kick_player', { targetPlayerId });
  };

  const sendChat = (message) => {
    if (message?.trim()) {
      socket?.emit('action:send_chat', { message: message.trim() });
    }
  };

  const selectWerewolfTarget = (targetId) => {
    socket?.emit('action:werewolf_select', { targetId });
  };

  const checkSeerTarget = (targetId) => {
    socket?.emit('action:seer_check', { targetId });
  };

  const useWitchSkill = (useAntidote, poisonTargetId) => {
    socket?.emit('action:witch_action', { useAntidote, poisonTargetId });
  };

  const protectGuardTarget = (targetId) => {
    socket?.emit('action:guard_protect', { targetId });
  };

  const shootHunterTarget = (targetId) => {
    socket?.emit('action:hunter_shoot', { targetId });
  };

  const castDayVote = (targetId) => {
    socket?.emit('action:cast_vote', { targetId });
  };

  const restartGame = () => {
    socket?.emit('game:restart');
    setGameOverData(null);
    setMyRoleInfo(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        serverUrl,
        updateServerUrl,
        isConnected,
        room,
        myPlayer,
        myRoleInfo,
        gamePhase,
        gameRound,
        phaseDuration,
        systemLogs,
        chatMessages,
        seerCheckResult,
        setSeerCheckResult,
        witchNightInfo,
        gameOverData,
        createRoom,
        joinRoom,
        toggleReady,
        startGame,
        leaveRoom,
        kickPlayer,
        sendChat,
        selectWerewolfTarget,
        checkSeerTarget,
        useWitchSkill,
        protectGuardTarget,
        shootHunterTarget,
        castDayVote,
        restartGame,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
