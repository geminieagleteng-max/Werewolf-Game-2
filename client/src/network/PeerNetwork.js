import Peer from 'peerjs';
import { GameHostController } from '../engine/GameHostController';
import { SOCKET_EVENTS } from '../engine/socketEvents';

const PEER_PREFIX = 'ww-room-v2-';

/**
 * P2P WebRTC 房間網路管理器 (PeerNetwork)
 * 提供類似 Socket.io 的 on/emit 事件監聽機制，在無後端伺服器情況下進行多人連線
 */
export class PeerNetwork {
  constructor() {
    this.peer = null;
    this.myPeerId = null;
    this.connections = new Map(); // peerId -> DataConnection
    this.hostConnection = null; // 訪客與房主的連線
    this.eventListeners = new Map(); // eventName -> Set<Function>
    this.hostController = null; // 僅房主擁有
    this.isHost = false;
    this.roomId = null;
    this.myPlayerName = '';
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }

  dispatchLocal(event, data) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in event listener for [${event}]:`, e);
        }
      });
    }
  }

  // 房主建立 P2P 房間
  async hostRoom({ roomId, roomName, maxPlayers, roleConfig, playerName }) {
    this.cleanup();
    this.isHost = true;
    this.roomId = roomId || Math.random().toString(36).substring(2, 8).toUpperCase();
    this.myPlayerName = playerName || '房主';

    const fullPeerId = `${PEER_PREFIX}${this.roomId.toLowerCase()}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(fullPeerId, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          this.myPeerId = id;

          // 建立廣播介面
          const broadcastAdapter = {
            broadcast: (event, data) => {
              // 廣播給房主自己
              this.dispatchLocal(event, data);
              // 廣播給所有連線的訪客
              const packet = JSON.stringify({ event, data });
              this.connections.forEach((conn) => {
                if (conn.open) {
                  conn.send(packet);
                }
              });
            },
            sendTo: (playerId, event, data) => {
              if (playerId === this.myPeerId) {
                this.dispatchLocal(event, data);
              } else {
                const conn = this.connections.get(playerId);
                if (conn && conn.open) {
                  conn.send(JSON.stringify({ event, data }));
                }
              }
            },
            addSystemLog: (text) => {
              this.dispatchLocal(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: text });
            },
          };

          this.hostController = new GameHostController(broadcastAdapter);
          const { room, player } = this.hostController.createRoom({
            roomId: this.roomId,
            roomName,
            maxPlayers,
            roleConfig,
            playerName: this.myPlayerName,
            hostId: this.myPeerId,
          });

          this.dispatchLocal('connect', {});
          resolve({ roomId: this.roomId, room, player });
        });

        // 監聽訪客連入
        this.peer.on('connection', (conn) => {
          conn.on('open', () => {
            this.connections.set(conn.peer, conn);
          });

          conn.on('data', (raw) => {
            try {
              const { event, payload } = JSON.parse(raw);
              this.handleIncomingGuestAction(conn.peer, event, payload);
            } catch (err) {
              console.error('Failed to parse peer message:', err);
            }
          });

          conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.hostController?.removePlayer(conn.peer);
          });

          conn.on('error', () => {
            this.connections.delete(conn.peer);
            this.hostController?.removePlayer(conn.peer);
          });
        });

        this.peer.on('error', (err) => {
          if (err.type === 'unavailable-id') {
            this.dispatchLocal(SOCKET_EVENTS.ROOM.ERROR, { message: '此房間代碼已被佔用，請重新嘗試！' });
          } else {
            this.dispatchLocal(SOCKET_EVENTS.ROOM.ERROR, { message: `P2P 連線錯誤: ${err.type || err.message}` });
          }
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // 訪客加入 P2P 房間
  async joinRoom({ roomId, playerName }) {
    this.cleanup();
    this.isHost = false;
    this.roomId = (roomId || '').trim().toUpperCase();
    this.myPlayerName = playerName || '玩家';

    const targetHostPeerId = `${PEER_PREFIX}${this.roomId.toLowerCase()}`;

    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(undefined, {
          debug: 1,
        });

        this.peer.on('open', (id) => {
          this.myPeerId = id;
          const conn = this.peer.connect(targetHostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            this.dispatchLocal('connect', {});
            // 發送加入請求
            conn.send(
              JSON.stringify({
                event: SOCKET_EVENTS.ROOM.JOIN,
                payload: { playerName: this.myPlayerName },
              })
            );
            resolve({ roomId: this.roomId });
          });

          conn.on('data', (raw) => {
            try {
              const { event, data } = JSON.parse(raw);
              this.dispatchLocal(event, data);
            } catch (e) {
              console.error('Failed to parse host message:', e);
            }
          });

          conn.on('close', () => {
            this.dispatchLocal('disconnect', {});
            this.dispatchLocal(SOCKET_EVENTS.GAME.SYSTEM_MSG, { message: '🔴 與房主連線已中斷。' });
          });

          conn.on('error', (err) => {
            this.dispatchLocal(SOCKET_EVENTS.ROOM.ERROR, { message: '連線至房主失敗，請檢查房號是否正確！' });
            reject(err);
          });
        });

        this.peer.on('error', (err) => {
          this.dispatchLocal(SOCKET_EVENTS.ROOM.ERROR, { message: '無法連接到 P2P 伺服器，請檢查網路。' });
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // 訪客將動作發送給房主 / 房主自行處理動作
  emit(event, payload = {}) {
    if (this.isHost && this.hostController) {
      this.handleIncomingGuestAction(this.myPeerId, event, payload);
    } else if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send(JSON.stringify({ event, payload }));
    }
  }

  handleIncomingGuestAction(senderId, event, payload) {
    if (!this.hostController) return;

    switch (event) {
      case SOCKET_EVENTS.ROOM.JOIN:
        this.hostController.addRemotePlayer(senderId, payload.playerName);
        break;
      case SOCKET_EVENTS.ROOM.TOGGLE_READY:
        this.hostController.toggleReady(senderId);
        break;
      case SOCKET_EVENTS.ROOM.LEAVE:
        this.hostController.removePlayer(senderId);
        break;
      case SOCKET_EVENTS.ROOM.KICK_PLAYER:
        if (senderId === this.myPeerId) {
          this.hostController.kickPlayer(payload.targetPlayerId);
        }
        break;
      case SOCKET_EVENTS.GAME.START:
        if (senderId === this.myPeerId) {
          this.hostController.startGame();
        }
        break;
      case SOCKET_EVENTS.GAME.RESTART:
        if (senderId === this.myPeerId) {
          this.hostController.restartGame();
        }
        break;
      case SOCKET_EVENTS.ACTION.SEND_CHAT:
        this.hostController.handleSendChat(senderId, payload.message);
        break;
      case SOCKET_EVENTS.ACTION.CUPID_LINK:
        this.hostController.handleCupidLink(senderId, payload.target1Id, payload.target2Id);
        break;
      case SOCKET_EVENTS.ACTION.DREAMCATCHER_DREAM:
        this.hostController.handleDreamcatcherDream(senderId, payload.targetId);
        break;
      case SOCKET_EVENTS.ACTION.GUARD_PROTECT:
        this.hostController.handleGuardProtect(senderId, payload.targetId);
        break;
      case SOCKET_EVENTS.ACTION.WEREWOLF_SELECT:
        this.hostController.handleWerewolfSelect(senderId, payload.targetId);
        break;
      case SOCKET_EVENTS.ACTION.SEER_CHECK:
        this.hostController.handleSeerCheck(senderId, payload.targetId);
        break;
      case SOCKET_EVENTS.ACTION.WITCH_ACTION:
        this.hostController.handleWitchAction(senderId, payload);
        break;
      case SOCKET_EVENTS.ACTION.SILENCER_SILENCE:
        this.hostController.handleSilencerSilence(senderId, payload.targetId);
        break;
      case SOCKET_EVENTS.ACTION.KNIGHT_DUEL:
        this.hostController.handleKnightDuel(senderId, payload.targetId);
        break;
      case SOCKET_EVENTS.ACTION.CAST_VOTE:
        this.hostController.handleDayVote(senderId, payload.targetId);
        break;
      case SOCKET_EVENTS.ACTION.HUNTER_SHOOT:
        this.hostController.handleHunterShoot(senderId, payload.targetId);
        break;
      default:
        break;
    }
  }

  // 機器人控制介面 (房主專屬)
  addBot() {
    if (this.isHost && this.hostController) {
      return this.hostController.addBotPlayer();
    }
    return false;
  }

  fillBots() {
    if (this.isHost && this.hostController) {
      this.hostController.fillWithBots();
    }
  }

  cleanup() {
    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch (e) {}
    });
    this.connections.clear();

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch (e) {}
      this.hostConnection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }

    if (this.hostController) {
      this.hostController.clearBotTimers();
      this.hostController.room?.clearTimer();
      this.hostController = null;
    }

    this.isHost = false;
    this.roomId = null;
  }
}

export const peerNetwork = new PeerNetwork();
