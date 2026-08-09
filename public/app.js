/**
 * 線上狼人殺 前端 Socket 客戶端與 UI 互動邏輯
 */

const socket = io();

// 應用程式狀態
let state = {
  currentRoom: null,
  myPlayerId: null,
  myRole: null,
  myRoleInfo: null,
  gamePhase: 'WAITING',
  selectedTargetId: null,
};

// DOM 元素引用
const lobbyView = document.getElementById('lobbyView');
const gameRoomView = document.getElementById('gameRoomView');
const playerNameInput = document.getElementById('playerNameInput');
const roomNameInput = document.getElementById('roomNameInput');
const maxPlayersSelect = document.getElementById('maxPlayersSelect');
const roomIdInput = document.getElementById('roomIdInput');
const btnCreateRoom = document.getElementById('btnCreateRoom');
const btnJoinRoom = document.getElementById('btnJoinRoom');

// 房間頂部
const displayRoomId = document.getElementById('displayRoomId');
const displayRoomName = document.getElementById('displayRoomName');
const displayPhase = document.getElementById('displayPhase');
const displayTimer = document.getElementById('displayTimer');
const btnToggleReady = document.getElementById('btnToggleReady');
const btnStartGame = document.getElementById('btnStartGame');
const btnLeaveRoom = document.getElementById('btnLeaveRoom');

// 遊戲內部區塊
const playerCount = document.getElementById('playerCount');
const playerSeatsGrid = document.getElementById('playerSeatsGrid');
const roleDetails = document.getElementById('roleDetails');
const actionArea = document.getElementById('actionArea');
const targetSelectorContainer = document.getElementById('targetSelectorContainer');
const targetButtonsGrid = document.getElementById('targetButtonsGrid');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

// ----------------------------------------------------
// 1. Socket 事件監聽
// ----------------------------------------------------

socket.on('connect', () => {
  state.myPlayerId = socket.id;
  logSystem('🟢 已成功連線至狼人殺遊戲伺服器。');
});

socket.on('room:error', (data) => {
  alert(data.message || '發生錯誤');
  logSystem(`❌ 錯誤: ${data.message}`);
});

socket.on('room:kicked', (data) => {
  alert(data.message);
  showLobbyView();
});

socket.on('room:state_update', (room) => {
  state.currentRoom = room;
  renderRoomState(room);
});

socket.on('game:role_assigned', (data) => {
  state.myRole = data.player.role;
  state.myRoleInfo = data.roleInfo;
  renderRoleCard(data.player, data.roleInfo);
});

socket.on('game:phase_change', (data) => {
  state.gamePhase = data.phase;
  displayPhase.textContent = `階段: ${data.phase} (第${data.round}輪)`;
  renderPhaseActions(data.phase, data.duration);
});

socket.on('game:system_message', (data) => {
  logSystem(data.message);
});

socket.on('game:death_announce', (data) => {
  if (data.deaths.length === 0) {
    logSystem('☀️ 昨夜平安夜，無人死亡。');
  } else {
    data.deaths.forEach(d => {
      logSystem(`⚰️ ${d.seatNumber}號【${d.name}】昨夜出局 (原因: ${d.reason})`);
    });
  }
});

socket.on('action:werewolf_team_sync', (data) => {
  logSystem(`🐺 狼隊投票同步：共識目標為 ${data.consensusTargetId || '無'}`);
});

socket.on('action:witch_night_info', (data) => {
  renderWitchPanel(data);
});

socket.on('action:seer_result', (result) => {
  alert(`🔮 查驗結果：\n${result.seatNumber}號 【${result.targetName}】身分為：${result.factionName}`);
});

socket.on('action:receive_chat', (chat) => {
  renderChatMessage(chat);
});

socket.on('game:vote_tally', (data) => {
  logSystem(`📊 投票統計結束！最高票數: ${data.maxVotes}`);
});

socket.on('game:over', (data) => {
  alert(`🏆 遊戲結束！\n獲勝陣營: ${data.winner === 'GOOD' ? '好人陣營' : '狼人陣營'}\n原因: ${data.reason}`);
  renderGameOverReveal(data.allPlayers);
});

// ----------------------------------------------------
// 2. UI 事件處理
// ----------------------------------------------------

btnCreateRoom.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const roomName = roomNameInput.value.trim();
  const maxPlayers = parseInt(maxPlayersSelect.value, 10);

  socket.emit('room:create', {
    playerName,
    roomName,
    maxPlayers,
  });
  showGameRoomView();
});

btnJoinRoom.addEventListener('click', () => {
  const playerName = playerNameInput.value.trim();
  const roomId = roomIdInput.value.trim().toUpperCase();

  if (!roomId) return alert('請輸入房間代碼！');

  socket.emit('room:join', {
    playerName,
    roomId,
  });
  showGameRoomView();
});

btnToggleReady.addEventListener('click', () => {
  socket.emit('room:toggle_ready');
});

btnStartGame.addEventListener('click', () => {
  socket.emit('game:start');
});

btnLeaveRoom.addEventListener('click', () => {
  socket.emit('room:leave');
  showLobbyView();
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (text) {
    socket.emit('action:send_chat', { message: text });
    chatInput.value = '';
  }
});

// ----------------------------------------------------
// 3. 渲染輔助函式
// ----------------------------------------------------

function showLobbyView() {
  lobbyView.classList.add('active');
  gameRoomView.classList.remove('active');
}

function showGameRoomView() {
  lobbyView.classList.remove('active');
  gameRoomView.classList.add('active');
}

function renderRoomState(room) {
  displayRoomId.textContent = room.id;
  displayRoomName.textContent = room.name;
  playerCount.textContent = `${room.playerCount}/${room.maxPlayers}`;

  // 檢查自己是否為房主
  const me = room.players.find(p => p.id === socket.id);
  if (me && me.isHost) {
    btnStartGame.style.display = 'inline-block';
    btnToggleReady.style.display = 'none';
  } else {
    btnStartGame.style.display = 'none';
    btnToggleReady.style.display = 'inline-block';
    btnToggleReady.textContent = (me && me.isReady) ? '已準備 (點擊取消)' : '準備';
  }

  // 渲染座位席
  playerSeatsGrid.innerHTML = '';
  room.players.forEach(p => {
    const card = document.createElement('div');
    card.className = `seat-card ${p.isReady ? 'ready' : ''} ${!p.isAlive ? 'dead' : ''}`;
    card.innerHTML = `
      <div class="seat-num">${p.seatNumber} 號位</div>
      <div class="player-name">${p.name} ${p.isHost ? '👑' : ''}</div>
      <small style="color: ${p.isAlive ? '#10b981' : '#ef4444'}">${p.isAlive ? '存活' : '已出局'}</small>
    `;
    playerSeatsGrid.appendChild(card);
  });
}

function renderRoleCard(player, roleInfo) {
  if (!roleInfo) return;
  roleDetails.innerHTML = `
    <div class="role-title">${roleInfo.name}</div>
    <div class="badge" style="margin-bottom: 8px;">陣營: ${roleInfo.faction === 'GOOD' ? '🛡️ 好人陣營' : '🐺 狼人陣營'}</div>
    <div class="role-desc">${roleInfo.description}</div>
  `;
}

function renderPhaseActions(phase, duration) {
  actionArea.innerHTML = '';
  targetSelectorContainer.style.display = 'none';
  targetButtonsGrid.innerHTML = '';

  const me = state.currentRoom ? state.currentRoom.players.find(p => p.id === socket.id) : null;
  if (me && !me.isAlive) {
    actionArea.innerHTML = `<p class="text-muted">⚰️ 您已出局，請靜待遊戲結算觀戰。</p>`;
    return;
  }

  if (phase === 'NIGHT_GUARD' && state.myRole === 'GUARD') {
    actionArea.innerHTML = `<h4>🛡️ 守衛行動：請選擇今晚要守護的玩家（不可連續兩晚守護同一人）</h4>`;
    renderTargetButtons((targetId) => {
      socket.emit('action:guard_protect', { targetId });
    }, true);
  } else if (phase === 'NIGHT_WEREWOLF' && state.myRole === 'WEREWOLF') {
    actionArea.innerHTML = `<h4>🐺 狼人行動：請與狼隊友商議並選擇今晚擊殺目標</h4>`;
    renderTargetButtons((targetId) => {
      socket.emit('action:werewolf_select', { targetId });
    });
  } else if (phase === 'NIGHT_SEER' && state.myRole === 'SEER') {
    actionArea.innerHTML = `<h4>🔮 預言家行動：請選擇今晚要查驗的玩家</h4>`;
    renderTargetButtons((targetId) => {
      socket.emit('action:seer_check', { targetId });
    });
  } else if (phase === 'DAY_VOTING') {
    actionArea.innerHTML = `<h4>🗳️ 白天投票階段：請投出您認為是狼人的玩家</h4>`;
    renderTargetButtons((targetId) => {
      socket.emit('action:cast_vote', { targetId });
    }, true); // 支援棄票
  } else if (phase === 'HUNTER_SHOOT' && state.myRole === 'HUNTER') {
    actionArea.innerHTML = `<h4>💥 獵人技能發動：請選擇開槍帶走的玩家（或壓槍）</h4>`;
    renderTargetButtons((targetId) => {
      socket.emit('action:hunter_shoot', { targetId });
    }, true);
  } else {
    actionArea.innerHTML = `<div class="waiting-prompt">⏳ 當前階段：${phase}，請等待指令或發言...</div>`;
  }
}

function renderWitchPanel(info) {
  actionArea.innerHTML = `
    <h4>🧪 女巫行動面板</h4>
    <p style="margin: 8px 0;">今晚中刀目標: <b>${info.targetName ? `${info.targetSeat}號 ${info.targetName}` : '平安夜 (無人中刀)'}</b></p>
    <div style="display: flex; gap: 10px; margin-top: 10px;">
      <button id="btnWitchSave" class="btn btn-primary" ${info.hasUsedAntidote || !info.targetId ? 'disabled' : ''}>💉 使用解藥救人</button>
      <button id="btnWitchPoison" class="btn btn-danger" ${info.hasUsedPoison ? 'disabled' : ''}>☠️ 使用毒藥毒人</button>
      <button id="btnWitchSkip" class="btn btn-secondary">不使用藥劑</button>
    </div>
  `;

  document.getElementById('btnWitchSave').addEventListener('click', () => {
    socket.emit('action:witch_action', { useAntidote: true, poisonTargetId: null });
    actionArea.innerHTML = `<p>已使用解藥！</p>`;
  });

  document.getElementById('btnWitchPoison').addEventListener('click', () => {
    renderTargetButtons((targetId) => {
      socket.emit('action:witch_action', { useAntidote: false, poisonTargetId: targetId });
      actionArea.innerHTML = `<p>已使用毒藥！</p>`;
    });
  });

  document.getElementById('btnWitchSkip').addEventListener('click', () => {
    socket.emit('action:witch_action', { useAntidote: false, poisonTargetId: null });
    actionArea.innerHTML = `<p>今晚不使用藥劑。</p>`;
  });
}

function renderTargetButtons(onSelect, allowSkip = false) {
  if (!state.currentRoom) return;
  targetSelectorContainer.style.display = 'block';
  targetButtonsGrid.innerHTML = '';

  state.currentRoom.players.forEach(p => {
    if (p.isAlive) {
      const btn = document.createElement('button');
      btn.className = 'target-btn';
      btn.textContent = `${p.seatNumber}號 ${p.name}`;
      btn.onclick = () => {
        onSelect(p.id);
      };
      targetButtonsGrid.appendChild(btn);
    }
  });

  if (allowSkip) {
    const skipBtn = document.createElement('button');
    skipBtn.className = 'target-btn';
    skipBtn.style.background = '#475569';
    skipBtn.textContent = '❌ 棄權 / 空過';
    skipBtn.onclick = () => onSelect(null);
    targetButtonsGrid.appendChild(skipBtn);
  }
}

function renderChatMessage(chat) {
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `<b>${chat.seatNumber}號 ${chat.senderName}:</b> ${escapeHtml(chat.message)}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function logSystem(msg) {
  const div = document.createElement('div');
  div.className = 'chat-msg system';
  div.textContent = `[系統] ${msg}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderGameOverReveal(allPlayers) {
  actionArea.innerHTML = `<h4>🎉 全體底牌揭曉</h4>`;
  const list = document.createElement('div');
  list.style.display = 'grid';
  list.style.gridTemplateColumns = '1fr 1fr';
  list.style.gap = '8px';
  list.style.marginTop = '10px';

  allPlayers.forEach(p => {
    const item = document.createElement('div');
    item.className = 'seat-card';
    item.innerHTML = `<b>${p.seatNumber}號 ${p.name}</b><br><span style="color:#f59e0b">${p.role}</span>`;
    list.appendChild(item);
  });
  actionArea.appendChild(list);
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;");
}
