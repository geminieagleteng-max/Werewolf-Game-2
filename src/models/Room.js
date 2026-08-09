const Game = require('./Game');
const { DEFAULT_ROLE_CONFIGS } = require('../constants/roles');
const { GAME_PHASES } = require('../constants/gameStates');

/**
 * 房間資料與遊戲生命週期管理模型
 */
class Room {
  /**
   * @param {string} id - 房間代碼 (如 6 位字串)
   * @param {string} name - 房間名稱
   * @param {number} maxPlayers - 最大容納玩家數 (6 ~ 9)
   * @param {string} hostId - 初始房主 ID
   */
  constructor(id, name = '狼人殺房間', maxPlayers = 6, hostId = null) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.hostId = hostId;
    this.roleConfig = DEFAULT_ROLE_CONFIGS[maxPlayers] || DEFAULT_ROLE_CONFIGS[6];

    /** @type {Map<string, import('./Player')>} */
    this.players = new Map();

    /** @type {Game | null} */
    this.game = null;

    // 階段計時器
    this.phaseTimer = null;
    this.phaseInterval = null;
    this.timeRemaining = 0;
  }

  /**
   * 新增玩家加入房間
   */
  addPlayer(player) {
    if (this.players.size >= this.maxPlayers) {
      return { success: false, message: '房間已滿員！' };
    }

    if (this.game && this.game.phase !== GAME_PHASES.WAITING && this.game.phase !== GAME_PHASES.GAME_OVER) {
      return { success: false, message: '遊戲進行中，無法加入！' };
    }

    // 分配未被佔用的最小座位號 (1 ~ maxPlayers)
    const occupiedSeats = new Set(Array.from(this.players.values()).map(p => p.seatNumber));
    let seat = 1;
    while (occupiedSeats.has(seat) && seat <= this.maxPlayers) {
      seat++;
    }
    player.seatNumber = seat;

    // 若為第一位加入者，自動設為房主
    if (this.players.size === 0) {
      this.hostId = player.id;
      player.isHost = true;
      player.isReady = true; // 房主預設已準備
    } else {
      player.isHost = (player.id === this.hostId);
    }

    this.players.set(player.id, player);
    return { success: true, player };
  }

  /**
   * 移除玩家
   */
  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) return null;

    this.players.delete(playerId);

    // 若離開者為房主，將房主順延給下一個玩家
    if (this.hostId === playerId && this.players.size > 0) {
      const nextHost = this.players.values().next().value;
      this.hostId = nextHost.id;
      nextHost.isHost = true;
      nextHost.isReady = true;
    }

    // 若房間已無人，清除計時器
    if (this.players.size === 0) {
      this.clearTimer();
    }

    return player;
  }

  /**
   * 切換玩家準備狀態
   */
  toggleReady(playerId) {
    const player = this.players.get(playerId);
    if (!player) return false;
    if (player.isHost) return true; // 房主始終為準備狀態
    player.isReady = !player.isReady;
    return player.isReady;
  }

  /**
   * 更新房間設定（限房主）
   */
  updateConfig({ name, maxPlayers, roleConfig }) {
    if (name) this.name = name;
    if (maxPlayers && maxPlayers >= 6 && maxPlayers <= 9) {
      this.maxPlayers = maxPlayers;
      this.roleConfig = roleConfig || DEFAULT_ROLE_CONFIGS[maxPlayers];
    } else if (roleConfig) {
      this.roleConfig = roleConfig;
    }
  }

  /**
   * 檢查是否全體玩家已準備就緒
   */
  canStartGame() {
    if (this.players.size !== this.maxPlayers) {
      return { canStart: false, message: `目前人數 (${this.players.size}/${this.maxPlayers}) 不足！` };
    }

    for (const player of this.players.values()) {
      if (!player.isHost && !player.isReady) {
        return { canStart: false, message: `玩家【${player.name}】尚未準備！` };
      }
    }

    return { canStart: true };
  }

  /**
   * 開始新對局
   */
  startGame() {
    const playersList = Array.from(this.players.values());
    this.game = new Game(this.id, playersList, this.roleConfig);
    this.game.assignRoles();
    return this.game;
  }

  /**
   * 啟動階段倒數計時器
   * @param {number} seconds - 倒數秒數
   * @param {Function} onTick - 每秒回調 (remainingSeconds)
   * @param {Function} onTimeout - 倒數結束回調
   */
  startTimer(seconds, onTick, onTimeout) {
    this.clearTimer();
    this.timeRemaining = seconds;

    if (onTick) onTick(this.timeRemaining);

    this.phaseInterval = setInterval(() => {
      this.timeRemaining--;
      if (onTick) onTick(this.timeRemaining);

      if (this.timeRemaining <= 0) {
        this.clearTimer();
        if (onTimeout) onTimeout();
      }
    }, 1000);
  }

  /**
   * 清除當前階段計時器
   */
  clearTimer() {
    if (this.phaseInterval) {
      clearInterval(this.phaseInterval);
      this.phaseInterval = null;
    }
    if (this.phaseTimer) {
      clearTimeout(this.phaseTimer);
      this.phaseTimer = null;
    }
    this.timeRemaining = 0;
  }

  /**
   * 房間公開資訊 JSON
   */
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      maxPlayers: this.maxPlayers,
      hostId: this.hostId,
      playerCount: this.players.size,
      roleConfig: this.roleConfig,
      players: Array.from(this.players.values()).map(p => p.toPublicJSON()),
      gamePhase: this.game ? this.game.phase : GAME_PHASES.WAITING,
      gameRound: this.game ? this.game.round : 0,
      timeRemaining: this.timeRemaining,
    };
  }
}

module.exports = Room;
