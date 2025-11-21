import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
import HeartParticle from './HeartParticle'; 
import io from 'socket.io-client';

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;
const PLAYER_ONE = 'player1'; 
const PLAYER_TWO = 'player2'; 

const WIN_MESSAGES = {
  [PLAYER_ONE]: (opponentName) => `A love-ly victory for you, darling! ❤️`,
  [PLAYER_TWO]: (opponentName) => `You've captured their heart, my love! 💖`,
  draw: `It's a tie, just like our entwined hearts! 💘`,
};

const ROMANTIC_REWARDS = [
  "A sweet kiss", "A warm hug", "Your favorite song played",
  "A heartfelt compliment", "Cuddles for 10 minutes", "A shared dessert"
];

function generateBoard() {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(null));
}

function App() {
  const [board, setBoard] = useState(generateBoard());
  const [currentPlayer, setCurrentPlayer] = useState(PLAYER_ONE);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [room, setRoom] = useState(''); 
  const [playerName, setPlayerName] = useState(''); 
  const [opponentName, setOpponentName] = useState(''); 
  const [messages, setMessages] = useState([]); 
  const [isPlayerTurn, setIsPlayerTurn] = useState(false); 
  const [chosenReward, setChosenReward] = useState(null); 
  const [showReward, setShowReward] = useState(false); 
  const [heartParticles, setHeartParticles] = useState([]); 
  
  // State to check if user has clicked Join
  const [hasJoined, setHasJoined] = useState(false); 

  const socket = useRef(null); 

  useEffect(() => {
    // ----------------------------------------------------------------
    // IMPORTANT: WE WILL CHANGE THIS URL MANUALLY WHEN WE GO ONLINE
    // For now, we default to Localhost to ensure it works on your PC.
    // ----------------------------------------------------------------
    const BACKEND_URL = 'http://localhost:3001'; 
    
    socket.current = io(BACKEND_URL);

    socket.current.on('connect', () => {
      console.log('Connected to server ID:', socket.current.id);
      setMessages(prev => [...prev, { text: 'Connected to server.', type: 'info' }]);
    });

    socket.current.on('gameUpdate', ({ board: newBoard, currentPlayer: newPlayer, messages: newMessages, isGameOver, winner: gameWinner }) => {
      setBoard(newBoard);
      setCurrentPlayer(newPlayer);
      setMessages(prev => [...prev, ...newMessages]);
      if (isGameOver) {
        setGameOver(true);
        setWinner(gameWinner);
        if (gameWinner) {
          const reward = ROMANTIC_REWARDS[Math.floor(Math.random() * ROMANTIC_REWARDS.length)];
          setChosenReward(reward);
          setShowReward(true);
          for (let i = 0; i < 20; i++) {
            setHeartParticles(prev => [...prev, { id: Date.now() + i, x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight }]);
          }
        }
      }
    });

    socket.current.on('roomJoined', (roomData) => {
      setMessages(prev => [...prev, { text: `Joined room: ${roomData.room}`, type: 'success' }]);
      setOpponentName(roomData.opponentName || 'Waiting for partner...');
      setPlayerName(roomData.yourName);
      setIsPlayerTurn(roomData.yourTurn); 
    });

    socket.current.on('opponentJoined', (opponentName) => {
      setOpponentName(opponentName);
      setMessages(prev => [...prev, { text: `${opponentName} joined!`, type: 'info' }]);
    });

    socket.current.on('turnUpdate', (isYourTurn) => {
      setIsPlayerTurn(isYourTurn);
    });

    socket.current.on('error', (message) => {
      setMessages(prev => [...prev, { text: `Error: ${message}`, type: 'error' }]);
      if (message.includes("full")) setHasJoined(false);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleJoinRoom = () => {
    if (playerName && room) {
      socket.current.emit('joinRoom', { playerName, room });
      setHasJoined(true); 
    } else {
      setMessages(prev => [...prev, { text: 'Enter name and room ID.', type: 'error' }]);
    }
  };

  const handleClick = (col) => {
    if (gameOver || !isPlayerTurn || !socket.current) return;
    if (board[0][col] !== null) return; 
    socket.current.emit('makeMove', { col, player: currentPlayer, room });
  };

  const resetGame = () => {
    setBoard(generateBoard());
    setCurrentPlayer(PLAYER_ONE);
    setGameOver(false);
    setWinner(null);
    setMessages([]);
    setChosenReward(null);
    setShowReward(false);
    setHeartParticles([]);
    socket.current.emit('resetGame', { room }); 
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {heartParticles.map(particle => (
        <HeartParticle key={particle.id} x={particle.x} y={particle.y} />
      ))}

      <h1 className="text-5xl font-bold text-pink-600 mb-8 font-serif leading-tight text-center drop-shadow-lg">
        Connect Four of Hearts
        <span className="block text-2xl text-purple-400 mt-2">For {opponentName || "Two Sweethearts"}</span>
      </h1>

      {!hasJoined ? (
        <div className="bg-white p-8 rounded-lg shadow-xl border border-pink-200 text-center z-10">
          <p className="text-xl text-gray-700 mb-4">Join your darling:</p>
          <input type="text" placeholder="Your Name" className="p-3 border border-pink-300 rounded-md mb-3 w-full text-lg"
            value={playerName} onChange={(e) => setPlayerName(e.target.value)} />
          <input type="text" placeholder="Room ID (e.g. 'Love')" className="p-3 border border-pink-300 rounded-md mb-4 w-full text-lg"
            value={room} onChange={(e) => setRoom(e.target.value)} />
          <button onClick={handleJoinRoom} className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-full text-xl shadow-lg">
            Join Game
          </button>
        </div>
      ) : (
        <>
          {gameOver && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-10 rounded-xl shadow-2xl text-center border-4 border-pink-400">
                <p className="text-4xl font-bold text-pink-700 mb-4 animate-pulse">
                  {winner ? WIN_MESSAGES[winner](opponentName) : WIN_MESSAGES.draw}
                </p>
                {winner && showReward && (
                  <div className="mt-6 p-4 bg-red-50 text-red-700 border border-red-300 rounded-lg text-2xl font-semibold animate-bounce-slow">
                    Prize: <span className="text-red-900 block mt-2">{chosenReward}</span>
                  </div>
                )}
                <button onClick={resetGame} className="mt-8 bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-full text-2xl shadow-lg">
                  Play Again!
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl z-10">
            <div className="md:w-1/3 bg-white p-6 rounded-xl shadow-lg border border-pink-200">
              <h2 className="text-2xl font-semibold text-pink-600 mb-4">Status</h2>
              <p className={`text-xl font-bold text-center p-3 rounded-lg ${isPlayerTurn ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} border mb-5`}>
                {isPlayerTurn ? "Your Turn!" : "Waiting..."}
              </p>
              <div className="h-48 overflow-y-auto bg-gray-50 p-3 rounded-md border border-gray-200 text-sm">
                {messages.map((msg, index) => (
                  <p key={index} className={`mb-1 ${msg.type === 'error' ? 'text-red-600' : 'text-gray-800'}`}>{msg.text}</p>
                ))}
              </div>
            </div>

            <div className="md:w-2/3 flex flex-col items-center">
              <div className="grid gap-1 p-4 bg-pink-300 rounded-3xl shadow-2xl border-4 border-white">
                {board.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.map((cell, colIndex) => (
                      <div key={`${rowIndex}-${colIndex}`} className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-3xl font-bold cursor-pointer relative ${cell === PLAYER_ONE ? 'bg-red-500 shadow-inner' : cell === PLAYER_TWO ? 'bg-purple-500 shadow-inner' : 'bg-pink-100 hover:bg-pink-200'}`}
                        onClick={() => handleClick(colIndex)}>
                         {cell === PLAYER_ONE && '❤'}
                         {cell === PLAYER_TWO && '♡'}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;