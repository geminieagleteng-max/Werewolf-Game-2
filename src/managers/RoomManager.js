const Room = require('../models/Room');

/**
 * 全局房間調度管理器 (Singleton)
 */
class RoomManager {
  constructor() {
    /** @type {Map<string, Room>} */
    this.rooms = new Map();

    /** @type {Map<string, { roomId: string, playerId: string }>} */
    this.socketToPlayerMap = new Map();
  }

  /**
   * 隨機生成 6 位大寫英數字房間代碼
   */
  generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    do {
      id = '';
      for (let i = 0; i < 6; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(id));
    return id;
  }

  /**
   * 創建新房間
   */
  createRoom({ name, maxPlayers = 6, roleConfig, hostId }) {
    const roomId = this.generateRoomId();
    const room = new Room(roomId, name, maxPlayers, hostId);
    if (roleConfig && Array.isArray(roleConfig)) {
      room.roleConfig = roleConfig;
    }
    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * 取得指定房間
   */
  getRoom(roomId) {
    if (!roomId) return null;
    return this.rooms.get(roomId.toUpperCase()) || null;
  }

  /**
   * 記錄 Socket ID 與 房間/玩家關聯
   */
  bindSocket(socketId, roomId, playerId) {
    this.socketToPlayerMap.set(socketId, { roomId, playerId });
  }

  /**
   * 移除 Socket 關聯
   */
  unbindSocket(socketId) {
    this.socketToPlayerMap.delete(socketId);
  }

  /**
   * 依據 Socket ID 查找房間與玩家
   */
  findPlayerBySocketId(socketId) {
    const binding = this.socketToPlayerMap.get(socketId);
    if (!binding) return { room: null, player: null };

    const room = this.getRoom(binding.roomId);
    if (!room) return { room: null, player: null };

    const player = room.players.get(binding.playerId);
    return { room, player };
  }

  /**
   * 刪除空房間
   */
  deleteRoom(roomId) {
    const room = this.getRoom(roomId);
    if (room) {
      room.clearTimer();
      this.rooms.delete(room.id);
    }
  }

  /**
   * 取得所有公開大廳房間清單
   */
  getLobbyList() {
    return Array.from(this.rooms.values()).map(r => ({
      id: r.id,
      name: r.name,
      maxPlayers: r.maxPlayers,
      playerCount: r.players.size,
      hasStarted: !!(r.game && r.game.phase !== 'WAITING' && r.game.phase !== 'GAME_OVER'),
    }));
  }
}

// 導出單例
module.exports = new RoomManager();
