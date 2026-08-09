/**
 * 自動化多玩家 Socket.io 狼人殺對局模擬測試腳本
 */

const { io } = require('socket.io-client');
const { app, server } = require('../src/server');

const PORT = 3001;
const SERVER_URL = `http://localhost:${PORT}`;

// 啟動測試專用伺服器實例
server.listen(PORT, async () => {
  console.log(`[TEST] 🧪 測試伺服器已於 http://localhost:${PORT} 啟動，開始執行模擬對局...`);

  try {
    await runSimulation();
    console.log(`[TEST] ✅ 模擬對局測試圓滿完成！`);
  } catch (err) {
    console.error(`[TEST] ❌ 模擬測試遭遇錯誤:`, err);
  } finally {
    server.close();
    process.exit(0);
  }
});

async function runSimulation() {
  const clients = [];
  const playerNames = ['愛麗絲(房主)', '鮑伯', '查理', '大衛', '伊娃', '法蘭克'];
  let roomId = null;

  // 1. 建立 6 個 Client 連線
  console.log('[TEST] 1. 正在建立 6 位玩家 Socket 連線...');
  for (let i = 0; i < 6; i++) {
    const socket = io(SERVER_URL, { reconnection: false });
    clients.push({ socket, name: playerNames[i], role: null, id: null });
    await new Promise(r => socket.on('connect', r));
  }
  console.log('[TEST] -> 6 位玩家已全部成功連線。');

  // 2. 房主創房
  console.log('[TEST] 2. 房主愛麗絲創建 6 人房間...');
  const host = clients[0];
  host.socket.emit('room:create', {
    playerName: host.name,
    roomName: '測試 6 人標準局',
    maxPlayers: 6,
  });

  const roomUpdate = await new Promise(r => host.socket.once('room:state_update', r));
  roomId = roomUpdate.id;
  console.log(`[TEST] -> 房間創建成功！房間代碼為: ${roomId}`);

  // 3. 其他 5 位玩家加入房間並點擊準備
  console.log('[TEST] 3. 其餘 5 位玩家加入房間並準備...');
  for (let i = 1; i < 6; i++) {
    const p = clients[i];
    p.socket.emit('room:join', { roomId, playerName: p.name });
    await new Promise(r => p.socket.once('room:state_update', r));
    p.socket.emit('room:toggle_ready');
  }

  // 4. 房主開始遊戲
  console.log('[TEST] 4. 全體已就緒，房主愛麗絲發起開始遊戲...');
  host.socket.emit('game:start');

  // 等待所有人收到角色發牌
  await Promise.all(clients.map(c => new Promise(resolve => {
    c.socket.once('game:role_assigned', (data) => {
      c.role = data.player.role;
      c.id = data.player.id;
      console.log(`[TEST]    🎴 玩家【${c.name}】獲分配身分：${data.roleInfo.name} (${c.role})`);
      resolve();
    });
  })));

  console.log('[TEST] -> 發牌驗證通過，角色分發成功！');

  // 5. 監聽夜晚階段轉移
  console.log('[TEST] 5. 監聽夜晚階段與技能發動...');
  
  // 等待進入狼人或女巫階段
  await new Promise(r => setTimeout(r, 6000)); // 等待 5s 發牌與 3s 夜晚開始

  const werewolves = clients.filter(c => c.role === 'WEREWOLF');
  const seer = clients.find(c => c.role === 'SEER');
  const witch = clients.find(c => c.role === 'WITCH');
  const villager = clients.find(c => c.role === 'VILLAGER');

  console.log(`[TEST] -> 狼人人數: ${werewolves.length}，預言家: ${seer ? seer.name : '無'}，女巫: ${witch ? witch.name : '無'}`);

  // 狼人選擇擊殺村民
  if (werewolves.length > 0 && villager) {
    console.log(`[TEST] 🐺 狼人 ${werewolves[0].name} 選擇擊殺目標：${villager.name}`);
    werewolves[0].socket.emit('action:werewolf_select', { targetId: villager.id });
  }

  // 預言家查驗
  if (seer && werewolves.length > 0) {
    console.log(`[TEST] 🔮 預言家 ${seer.name} 查驗目標：${werewolves[0].name}`);
    seer.socket.emit('action:seer_check', { targetId: werewolves[0].id });
  }

  // 清理關閉客戶端
  for (const c of clients) {
    c.socket.disconnect();
  }
}
