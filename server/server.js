const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GameRoom } = require('./game/GameRoom.js');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 10000,
  pingInterval: 5000
});

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    players: gameRoom.getPlayerCount(),
    uptime: Math.round(process.uptime()),
    version: '3.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const gameRoom = new GameRoom(io);

io.on('connection', (socket) => {
  console.log(`[Server] + ${socket.id}`);
  gameRoom.addPlayer(socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Server] - ${socket.id} (${reason})`);
    gameRoom.removePlayer(socket.id);
  });

  socket.on('playerMove', (data) => {
    gameRoom.handleMove(socket.id, data);
  });

  socket.on('bulletFire', (data) => {
    gameRoom.handleBullet(socket.id, data);
  });

  socket.on('playerHit', (data) => {
    gameRoom.handleHit(socket.id, data);
  });

  socket.on('chatMessage', (data) => {
    gameRoom.handleChat(socket.id, data);
  });

  socket.on('grenadeThrown', (data) => {
    gameRoom.handleGrenade(socket.id, data);
  });

  socket.on('grenadeExploded', (data) => {
    gameRoom.handleGrenadeExplode(socket.id, data);
  });

  socket.on('vehicleEnter', (data) => {
    gameRoom.handleVehicleEnter(socket.id, data);
  });

  socket.on('vehicleExit', (data) => {
    gameRoom.handleVehicleExit(socket.id, data);
  });

  socket.on('vehicleMove', (data) => {
    gameRoom.handleVehicleMove(socket.id, data);
  });

  socket.on('ping_custom', (clientTime) => {
    socket.emit('pong_custom', clientTime);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] Puerto ${PORT} — v3.0`);
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Error:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Promesa rechazada:', reason);
});
