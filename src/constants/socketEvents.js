/**
 * Socket.io 事件名稱定義
 */

const SOCKET_EVENTS = {
  // --- 房務相關事件 ---
  ROOM: {
    // Client -> Server
    CREATE: 'room:create',             // 創建房間
    JOIN: 'room:join',                 // 加入房間
    LEAVE: 'room:leave',               // 離開房間
    TOGGLE_READY: 'room:toggle_ready', // 切換準備狀態
    UPDATE_CONFIG: 'room:update_config', // 房主修改配置 (人數、角色板子)
    KICK_PLAYER: 'room:kick_player',   // 房主踢人

    // Server -> Client
    STATE_UPDATE: 'room:state_update', // 廣播房間最新狀態 (玩家名單、房主、設定等)
    PLAYER_JOINED: 'room:player_joined',
    PLAYER_LEFT: 'room:player_left',
    KICKED: 'room:kicked',
    ERROR: 'room:error',
  },

  // --- 遊戲流程相關事件 ---
  GAME: {
    // Client -> Server
    START: 'game:start',               // 房主開始遊戲
    RESTART: 'game:restart',           // 結束後重開對局

    // Server -> Client
    STARTED: 'game:started',           // 遊戲開始通知
    ROLE_ASSIGNED: 'game:role_assigned', // 私密推送個人角色資訊
    PHASE_CHANGE: 'game:phase_change', // 廣播當前階段轉移 (帶倒數計時)
    SYSTEM_MSG: 'game:system_message', // 廣播系統通告
    DEATH_ANNOUNCE: 'game:death_announce', // 廣播昨夜或當日死者名單
    VOTE_TALLY: 'game:vote_tally',     // 廣播投票統計結果
    OVER: 'game:over',                 // 遊戲結束，結算陣營獲勝與底牌揭曉
  },

  // --- 玩家行動/技能相關事件 ---
  ACTION: {
    // 狼人 (Werewolf)
    WEREWOLF_SELECT: 'action:werewolf_select',       // Client -> Server: 選擇/取消狼殺目標
    WEREWOLF_TEAM_SYNC: 'action:werewolf_team_sync', // Server -> Werewolves: 同步狼隊即時選票

    // 守衛 (Guard)
    GUARD_PROTECT: 'action:guard_protect',           // Client -> Server: 選擇守護目標

    // 預言家 (Seer)
    SEER_CHECK: 'action:seer_check',                 // Client -> Server: 選擇查驗目標
    SEER_RESULT: 'action:seer_result',               // Server -> Seer: 私密回傳查驗結果

    // 女巫 (Witch)
    WITCH_ACTION: 'action:witch_action',             // Client -> Server: 使用解藥/毒藥/跳過
    WITCH_NIGHT_INFO: 'action:witch_night_info',     // Server -> Witch: 私密通知今晚誰中刀

    // 白天發言 (Speech / Chat)
    SEND_CHAT: 'action:send_chat',                   // Client -> Server: 發送聊天/發言訊息
    RECEIVE_CHAT: 'action:receive_chat',             // Server -> Client: 轉發聊天訊息

    // 白天投票 (Voting)
    CAST_VOTE: 'action:cast_vote',                   // Client -> Server: 投出放逐票 (或棄票)

    // 獵人 (Hunter)
    HUNTER_SHOOT: 'action:hunter_shoot',             // Client -> Server: 獵人開槍選擇目標
    HUNTER_STATUS: 'action:hunter_status',           // Server -> Hunter: 通知獵人是否具備開槍資格
  },
};

module.exports = SOCKET_EVENTS;
