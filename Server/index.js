const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);

// ALLOW ALL CONNECTIONS
const io = new Server(server, {
  cors: {
    origin: "*", // This is crucial for online play
    methods: ["GET", "POST"]
  }
});

const PORT = 3001;
const rooms = {};
const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;

function generateBoard() {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
}

function checkWin(board, player) {
    // Check horizontal
    for (let r = 0; r < BOARD_HEIGHT; r++) {
      for (let c = 0; c <= BOARD_WIDTH - 4; c++) {
        if (board[r][c] === player && board[r][c+1] === player &&
            board[r][c+2] === player && board[r][c+3] === player) return true;
      }
    }
    // Check vertical
    for (let r = 0; r <= BOARD_HEIGHT - 4; r++) {
      for (let c = 0; c < BOARD_WIDTH; c++) {
        if (board[r][c] === player && board[r+1][c] === player &&
            board[r+2][c] === player && board[r+3][c] === player) return true;
      }
    }
    // Check diagonals
    for (let r = 0; r <= BOARD_HEIGHT - 4; r++) {
      for (let c = 0; c <= BOARD_WIDTH - 4; c++) {
        if (board[r][c] === player && board[r+1][c+1] === player &&
            board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
      }
      for (let c = 3; c < BOARD_WIDTH; c++) {
        if (board[r][c] === player && board[r+1][c-1] === player &&
            board[r+2][c-2] === player && board[r+3][c-3] === player) return true;
      }
    }
    return false;
}

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`); // Log connection to terminal

  socket.on('joinRoom', ({ playerName, room }) => {
    if (!rooms[room]) {
      rooms[room] = {
        board: generateBoard(),
        currentPlayer: 'player1',
        players: {},
        playerCount: 0,
        gameOver: false
      };
    }
    const currentRoom = rooms[room];

    if (currentRoom.playerCount >= 2) {
      socket.emit('error', 'Room is full!');
      return;
    }

    let playerType = currentRoom.players['player1'] ? 'player2' : 'player1';
    currentRoom.players[playerType] = { id: socket.id, name: playerName };
    currentRoom.playerCount++;
    socket.join(room);

    console.log(`${playerName} joined Room: ${room} as ${playerType}`);

    socket.emit('roomJoined', {
      room,
      yourName: playerName,
      yourTurn: playerType === currentRoom.currentPlayer,
      opponentName: 'Waiting...'
    });

    if (currentRoom.playerCount === 2) {
        const p1 = currentRoom.players['player1'];
        const p2 = currentRoom.players['player2'];
        
        io.to(p1.id).emit('opponentJoined', p2.name);
        io.to(p2.id).emit('opponentJoined', p1.name);
        
        io.to(room).emit('gameUpdate', { 
            board: currentRoom.board, 
            currentPlayer: currentRoom.currentPlayer, 
            messages: [{ text: 'Game Start!', type: 'success' }],
            isGameOver: false, 
            winner: null 
        });
        
        io.to(p1.id).emit('turnUpdate', currentRoom.currentPlayer === 'player1');
        io.to(p2.id).emit('turnUpdate', currentRoom.currentPlayer === 'player2');
    }
  });

  socket.on('makeMove', ({ col, player, room }) => {
    const r = rooms[room];
    if (!r || r.gameOver || r.currentPlayer !== player) return;

    for (let row = BOARD_HEIGHT - 1; row >= 0; row--) {
      if (!r.board[row][col]) {
        r.board[row][col] = player;
        
        if (checkWin(r.board, player)) {
            r.gameOver = true;
            io.to(room).emit('gameUpdate', {
                board: r.board,
                currentPlayer: r.currentPlayer,
                messages: [{ text: `GAME OVER!`, type: 'success' }],
                isGameOver: true,
                winner: player
            });
        } else {
            r.currentPlayer = r.currentPlayer === 'player1' ? 'player2' : 'player1';
            io.to(room).emit('gameUpdate', {
                board: r.board,
                currentPlayer: r.currentPlayer,
                messages: [],
                isGameOver: false,
                winner: null
            });
            if (r.players['player1']) io.to(r.players['player1'].id).emit('turnUpdate', r.currentPlayer === 'player1');
            if (r.players['player2']) io.to(r.players['player2'].id).emit('turnUpdate', r.currentPlayer === 'player2');
        }
        break;
      }
    }
  });
  
  socket.on('resetGame', ({ room }) => {
      if (rooms[room]) {
          rooms[room].board = generateBoard();
          rooms[room].gameOver = false;
          rooms[room].currentPlayer = 'player1';
          io.to(room).emit('gameUpdate', { 
              board: rooms[room].board, 
              currentPlayer: 'player1', 
              messages: [{ text: 'Game Reset!', type: 'info' }],
              isGameOver: false,
              winner: null
          });
      }
  });
});

server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});