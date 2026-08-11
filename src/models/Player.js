const { ROLES } = require('../constants/roles');

/**
 * 玩家資料模型
 */
class Player {
  /**
   * @param {string} id - 玩家唯一識別碼
   * @param {string} socketId - 當前 Socket 連線 ID
   * @param {string} name - 玩家名稱
   * @param {number} seatNumber - 座位號碼 (1 ~ N)
   * @param {boolean} isHost - 是否為房主
   * @param {string|null} avatar - 頭像 URL (如 Google 頭像)
   * @param {string} authProvider - 登入驗證來源 ('GOOGLE' | 'GUEST')
   */
  constructor(id, socketId, name, seatNumber = 1, isHost = false, avatar = null, authProvider = 'GUEST') {
    this.id = id;
    this.socketId = socketId;
    this.name = name;
    this.seatNumber = seatNumber;
    this.isHost = isHost;
    this.avatar = avatar;
    this.authProvider = authProvider || 'GUEST';
    this.isReady = false;

    // 遊戲內身分與狀態
    this.role = null;
    this.isAlive = true;
    this.deathReason = null; // 'WEREWOLF' | 'POISON' | 'VOTE' | 'HUNTER'
    this.deathRound = null;  // 出局輪次 (如第 1 夜、第 2 天)
    this.canVote = true;

    // 女巫技能專用狀態
    this.hasUsedAntidote = false;
    this.hasUsedPoison = false;

    // 守衛技能專用狀態
    this.lastGuardedId = null;

    // 獵人技能專用狀態
    this.canShoot = true; // 若被毒死則變為 false

    // 白痴技能專用狀態
    this.isIdiotRevealed = false;

    // 連線狀態
    this.connected = true;
  }

  /**
   * 重置玩家遊戲內狀態（重開局時使用）
   */
  resetGameState() {
    this.role = null;
    this.isAlive = true;
    this.deathReason = null;
    this.deathRound = null;
    this.canVote = true;
    this.hasUsedAntidote = false;
    this.hasUsedPoison = false;
    this.lastGuardedId = null;
    this.canShoot = true;
    this.isIdiotRevealed = false;
  }

  /**
   * 將玩家設為出局
   * @param {string} reason - 出局原因
   * @param {number} round - 出局輪次
   */
  kill(reason, round) {
    this.isAlive = false;
    this.deathReason = reason;
    this.deathRound = round;
    this.canVote = false;

    // 如果是被女巫毒殺，獵人失去開槍能力
    if (reason === 'POISON') {
      this.canShoot = false;
    }
  }

  /**
   * 公開資訊（所有人可見，不洩露角色與私密技能）
   */
  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      seatNumber: this.seatNumber,
      isHost: this.isHost,
      avatar: this.avatar,
      authProvider: this.authProvider,
      isReady: this.isReady,
      isAlive: this.isAlive,
      isIdiotRevealed: this.isIdiotRevealed,
      canVote: this.canVote,
      deathReason: this.deathReason,
      connected: this.connected,
    };
  }

  /**
   * 私密資訊（僅玩家本人可見，包含自己的角色底牌與技能狀態）
   */
  toPrivateJSON() {
    return {
      ...this.toPublicJSON(),
      role: this.role,
      hasUsedAntidote: this.hasUsedAntidote,
      hasUsedPoison: this.hasUsedPoison,
      lastGuardedId: this.lastGuardedId,
      canShoot: this.canShoot,
    };
  }

  /**
   * 遊戲結束時公開資訊（包含真實身分）
   */
  toGameOverJSON() {
    return {
      ...this.toPublicJSON(),
      role: this.role,
    };
  }
}

module.exports = Player;
