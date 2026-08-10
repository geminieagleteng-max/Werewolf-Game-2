const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const { ROLE_DEFINITIONS, DEFAULT_ROLE_CONFIGS } = require('./constants/roles');
const roomManager = require('./managers/RoomManager');
const setupSocketHandlers = require('./handlers/socketHandler');

const app = express();
const server = http.createServer(app);

// 初始化 Socket.io 並允許跨域
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const fs = require('fs');

// Middleware
app.use(cors());
app.use(express.json());

const distPath = path.join(__dirname, '../client/dist');
const publicPath = path.join(__dirname, '../public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
} else {
  app.use(express.static(publicPath));
}

// ----------------------------------------------------
// REST API 輔助端點
// ----------------------------------------------------

// 伺服器健康檢查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeRooms: roomManager.rooms.size,
  });
});

// 取得當前大廳房間列表
app.get('/api/rooms', (req, res) => {
  res.json({
    rooms: roomManager.getLobbyList(),
  });
});

// 取得遊戲支援的角色與預設板子配置資訊
app.get('/api/game-info', (req, res) => {
  res.json({
    roles: ROLE_DEFINITIONS,
    defaultConfigs: DEFAULT_ROLE_CONFIGS,
  });
});

// 註冊 Socket.io 核心事件監聽
setupSocketHandlers(io);

// SPA 頁面路由支援
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 僅在作為主程式執行時啟動監聽
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`==============================================`);
    console.log(`🐺 線上狼人殺服務端已成功啟動！`);
    console.log(`🌐 本地監聽端口: http://localhost:${PORT}`);
    console.log(`⏱️ 啟動時間: ${new Date().toLocaleString()}`);
    console.log(`==============================================`);
  });
}

module.exports = { app, server, io };
