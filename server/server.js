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
    version: '2.0'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const gameRoom = new GameRoom(io);

io.on('connection', (socket) => {
  console.log(`[Server] + Conexión: ${socket.id}`);
  gameRoom.addPlayer(socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Server] - Desconexión: ${socket.id} — ${reason}`);
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
  }
