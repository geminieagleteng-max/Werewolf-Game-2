import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { peerNetwork } from '../network/PeerNetwork';
import { SOCKET_EVENTS } from '../engine/socketEvents';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  // 連線模式：預設 'P2P' (免伺服器即開即玩，支援好友跨網連線與AI人機)，亦支援自架 'SERVER'
  const [networkMode, setNetworkMode] = useState(() => localStorage.getItem('werewolf_network_mode') || 'P2P');
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('werewolf_server_url') || 'http://localhost:3000');

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(true); // P2P 模式下預設連線就緒

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
  const [errorMessage, setErrorMessage] = useState(null);

  const addSystemLog = useCallback((msg) => {
    setSystemLogs((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), text: msg, time: new Date() },
    ]);
  }, []);

  // ----------------------------------------------------
  // P2P 網路事件監聽掛載
  // ----------------------------------------------------
  useEffect(() => {
    if (networkMode !== 'P2P') return;

    setIsConnected(true);

    const unsubRoomUpdate = peerNetwork.on(SOCKET_EVENTS.ROOM.STATE_UPDATE, (updatedRoom) => {
      setRoom(updatedRoom);
      if (peerNetwork.myPeerId) {
        const me = updatedRoom.players.find((p) => p.id === peerNetwork.myPeerId);
        if (me) {
          setMyPlayer((prev) => ({
            ...me,
            role: prev?.role || me.role,
            hasUsedAntidote: prev?.hasUsedAntidote ?? me.hasUsedAntidote,
            hasUsedPoison: prev?.hasUsedPoison ?? me.hasUsedPoison,
            lastGuardedId: prev?.lastGuardedId ?? me.lastGuardedId,
            canShoot: prev?.canShoot ?? me.canShoot,
          }));
        }
      }
    });

    const unsubRoleAssigned = peerNetwork.on(SOCKET_EVENTS.GAME.ROLE_ASSIGNED, ({ player, roleInfo }) => {
      setMyPlayer(player);
      setMyRoleInfo(roleInfo);
      addSystemLog(`🎴 您的身分牌已發放：【${roleInfo.name}】`);
    });

    const unsubPhaseChange = peerNetwork.on(SOCKET_EVENTS.GAME.PHASE_CHANGE, ({ phase, round, duration }) => {
      setGamePhase(phase);
      setGameRound(round);
      setPhaseDuration(duration);
    });

    const unsubSystemMsg = peerNetwork.on(SOCKET_EVENTS.GAME.SYSTEM_MSG, ({ message }) => {
      addSystemLog(message);
    });

    const unsubChat = peerNetwork.on(SOCKET_EVENTS.ACTION.RECEIVE_CHAT, (chat) => {
      setChatMessages((prev) => [...prev, chat]);
    });

    const unsubSeer = peerNetwork.on(SOCKET_EVENTS.ACTION.SEER_RESULT, (result) => {
      setSeerCheckResult(result);
    });

    const unsubWitch = peerNetwork.on(SOCKET_EVENTS.ACTION.WITCH_NIGHT_INFO, (info) => {
      setWitchNightInfo(info);
    });

    const unsubGameOver = peerNetwork.on(SOCKET_EVENTS.GAME.OVER, (data) => {
      setGameOverData(data);
      addSystemLog(`🏆 遊戲結束！${data.reason}`);
    });

    const unsubError = peerNetwork.on(SOCKET_EVENTS.ROOM.ERROR, ({ message }) => {
      setErrorMessage(message);
      addSystemLog(`⚠️ 提示: ${message}`);
    });

    return () => {
      unsubRoomUpdate();
      unsubRoleAssigned();
      unsubPhaseChange();
      unsubSystemMsg();
      unsubChat();
      unsubSeer();
      unsubWitch();
      unsubGameOver();
      unsubError();
    };
  }, [networkMode, addSystemLog]);

  // ----------------------------------------------------
  // Socket.io 伺服器連線 (選擇自架伺服器模式時使用)
  // ----------------------------------------------------
  useEffect(() => {
    if (networkMode !== 'SERVER' || !serverUrl) return;

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

    s.on('connect_error', () => {
      setIsConnected(false);
      addSystemLog(`⚠️ 連線至 [${serverUrl}] 失敗，請確認後端已啟動。`);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
      addSystemLog('🔴 與伺服器連線中斷');
    });

    s.on('room:state_update', (updatedRoom) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find((p) => p.id === s.id);
      if (me) {
        setMyPlayer((prev) => ({
          ...me,
          role: prev?.role || me.role,
          hasUsedAntidote: prev?.hasUsedAntidote ?? me.hasUsedAntidote,
          hasUsedPoison: prev?.hasUsedPoison ?? me.hasUsedPoison,
          lastGuardedId: prev?.lastGuardedId ?? me.lastGuardedId,
          canShoot: prev?.canShoot ?? me.canShoot,
        }));
      }
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

    s.on('room:error', ({ message }) => {
      setErrorMessage(message);
      addSystemLog(`⚠️ ${message}`);
    });

    return () => {
      s.disconnect();
    };
  }, [networkMode, serverUrl, addSystemLog]);

  // 切換網路模式
  const switchNetworkMode = (mode, customUrl) => {
    setNetworkMode(mode);
    localStorage.setItem('werewolf_network_mode', mode);
    if (customUrl) {
      const formatted = customUrl.trim().replace(/\/$/, '');
      setServerUrl(formatted);
      localStorage.setItem('werewolf_server_url', formatted);
    }
  };

  // ----------------------------------------------------
  // 操作派發方法 (統整 P2P 與 Socket.io)
  // ----------------------------------------------------
  const createRoom = async (playerName, roomName, maxPlayers) => {
    setErrorMessage(null);
    if (networkMode === 'P2P') {
      try {
        const { room: r, player: p } = await peerNetwork.hostRoom({
          roomName,
          maxPlayers,
          playerName,
        });
        setRoom(r.toPublicJSON());
        setMyPlayer(p.toPublicJSON());
      } catch (err) {
        setErrorMessage('建立房間失敗，請重新嘗試！');
      }
    } else {
      socket?.emit('room:create', { playerName, roomName, maxPlayers });
    }
  };

  const joinRoom = async (playerName, roomId) => {
    setErrorMessage(null);
    if (!roomId || !roomId.trim()) {
      setErrorMessage('請輸入 6 位房間代碼！');
      return;
    }

    if (networkMode === 'P2P') {
      try {
        await peerNetwork.joinRoom({ roomId: roomId.trim(), playerName });
      } catch (err) {
        setErrorMessage('加入房間失敗，請確認房號是否正確且房主在線上！');
      }
    } else {
      socket?.emit('room:join', { playerName, roomId: roomId.trim() });
    }
  };

  const addBot = () => {
    if (networkMode === 'P2P') {
      peerNetwork.addBot();
    }
  };

  const fillBots = () => {
    if (networkMode === 'P2P') {
      peerNetwork.fillBots();
    }
  };

  const toggleReady = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ROOM.TOGGLE_READY);
    } else {
      socket?.emit('room:toggle_ready');
    }
  };

  const startGame = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.GAME.START);
    } else {
      socket?.emit('game:start');
    }
  };

  const leaveRoom = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ROOM.LEAVE);
      peerNetwork.cleanup();
    } else {
      socket?.emit('room:leave');
    }
    setRoom(null);
    setMyPlayer(null);
    setMyRoleInfo(null);
    setGamePhase('WAITING');
    setGameOverData(null);
  };

  const kickPlayer = (targetPlayerId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ROOM.KICK_PLAYER, { targetPlayerId });
    } else {
      socket?.emit('room:kick_player', { targetPlayerId });
    }
  };

  const sendChat = (message) => {
    if (!message?.trim()) return;
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.SEND_CHAT, { message: message.trim() });
    } else {
      socket?.emit('action:send_chat', { message: message.trim() });
    }
  };

  const selectWerewolfTarget = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.WEREWOLF_SELECT, { targetId });
    } else {
      socket?.emit('action:werewolf_select', { targetId });
    }
  };

  const checkSeerTarget = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.SEER_CHECK, { targetId });
    } else {
      socket?.emit('action:seer_check', { targetId });
    }
  };

  const useWitchSkill = (useAntidote, poisonTargetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.WITCH_ACTION, { useAntidote, poisonTargetId });
    } else {
      socket?.emit('action:witch_action', { useAntidote, poisonTargetId });
    }
  };

  const protectGuardTarget = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.GUARD_PROTECT, { targetId });
    } else {
      socket?.emit('action:guard_protect', { targetId });
    }
  };

  const shootHunterTarget = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.HUNTER_SHOOT, { targetId });
    } else {
      socket?.emit('action:hunter_shoot', { targetId });
    }
  };

  const castDayVote = (targetId) => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.ACTION.CAST_VOTE, { targetId });
    } else {
      socket?.emit('action:cast_vote', { targetId });
    }
  };

  const restartGame = () => {
    if (networkMode === 'P2P') {
      peerNetwork.emit(SOCKET_EVENTS.GAME.RESTART);
    } else {
      socket?.emit('game:restart');
    }
    setGameOverData(null);
    setMyRoleInfo(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        networkMode,
        serverUrl,
        switchNetworkMode,
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
        errorMessage,
        setErrorMessage,
        createRoom,
        joinRoom,
        addBot,
        fillBots,
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
