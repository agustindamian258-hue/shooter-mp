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

// Health check para Render.com (evita que el server se duerma)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    players: gameRoom.getPlayerCount(),
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const gameRoom = new GameRoom(io);

io.on('connection', (socket) => {
  console.log(`[Server] Jugador conectado: ${socket.id}`);
  gameRoom.addPlayer(socket);

  socket.on('disconnect', (reason) => {
    console.log(`[Server] Jugador desconectado: ${socket.id} — ${reason}`);
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

  socket.on('ping_custom', (clientTime) => {
    socket.emit('pong_custom', clientTime);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[Server] Corriendo en puerto ${PORT}`);
});

// Manejo de errores no capturados para evitar crashes
process.on('uncaughtException', (err) => {
  console.error('[Server] Error no capturado:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Promesa rechazada:', reason);
});
