import React, { useState, useEffect, useRef } from 'react';
import './App.css'; 
import HeartParticle from './HeartParticle'; 
import io from 'socket.io-client'; // Ensure you have this imported

const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;
const PLAYER_ONE = 'player1'; 
const PLAYER_TWO = 'player2'; 

// Romantic Messages for Wins/Draws
const WIN_MESSAGES = {
  [PLAYER_ONE]: (opponentName) => `A love-ly victory for you, darling! ❤️`,
  [PLAYER_TWO]: (opponentName) => `You've captured their heart, my love! 💖`,
  draw: `It's a tie, just like our entwined hearts! 💘`,
};

// Romantic Rewards/Points System
const ROMANTIC_REWARDS = [
  "A sweet kiss",
  "A warm hug",
  "Your favorite song played",
  "A heartfelt compliment",
  "Cuddles for 10 minutes",
  "A shared dessert"
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
  
  // --- FIX PART 1: New State to track if we actually joined ---
  const [hasJoined, setHasJoined] = useState(false);
  // -----------------------------------------------------------

  const socket = useRef(null); 

  useEffect(() => {
    // --- FIX PART 2: MAKE SURE THIS URL IS CORRECT ---
    // If using LocalTunnel, paste that URL here.
    // If playing locally on one PC, 'http://localhost:3001' is fine.
    socket.current = io('https://great-tables-joke.loca.lt'); 
    // -------------------------------------------------

    socket.current.on('connect', () => {
      console.log('Connected to server!');
      setMessages(prev => [...prev, { text: 'Connected to server. Please join a room.', type: 'info' }]);
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
      setMessages(prev => [...prev, { text: `${opponentName} has joined the room! Let the love games begin!`, type: 'info' }]);
    });

    socket.current.on('turnUpdate', (isYourTurn) => {
      setIsPlayerTurn(isYourTurn);
      setMessages(prev => [...prev, { text: isYourTurn ? "It's your turn, my love!" : "Waiting for your darling's move...", type: 'info' }]);
    });

    socket.current.on('error', (message) => {
      setMessages(prev => [...prev, { text: `Error: ${message}`, type: 'error' }]);
      // If room is full, kick them back to login
      if(message.includes("full")) {
          setHasJoined(false); 
      }
    });

    socket.current.on('disconnect', () => {
      console.log('Disconnected from server');
      setMessages(prev => [...prev, { text: 'Disconnected from server.', type: 'error' }]);
    });

    return () => {
      socket.current.disconnect();
    };
  }, []);

  const handleJoinRoom = () => {
    if (playerName && room) {
      socket.current.emit('joinRoom', { playerName, room });
      // --- FIX PART 3: Only switch screens when button is clicked ---
      setHasJoined(true);
      // --------------------------------------------------------------
    } else {
      setMessages(prev => [...prev, { text: 'Please enter both your name and a room ID.', type: 'error' }]);
    }
  };

  const handleClick = (col) => {
    if (gameOver || !isPlayerTurn || !socket.current) return;

    if (board[0][col] !== null) {
      setMessages(prev => [...prev, { text: 'Column is full, choose another, my heart.', type: 'warning' }]);
      return;
    }

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

      <h1 className="text-6xl font-bold text-pink-600 mb-8 font-serif leading-tight text-center drop-shadow-lg">
        Connect Four of Hearts
        <span className="block text-2xl text-purple-400 mt-2">A Love Game for {opponentName || "Two Sweethearts"}</span>
      </h1>

      {/* --- FIX PART 4: Check 'hasJoined' instead of 'playerName' --- */}
      {!hasJoined ? (
        <div className="bg-white p-8 rounded-lg shadow-xl border border-pink-200 text-center z-10">
          <p className="text-xl text-gray-700 mb-4">Enter your name and a room ID to connect with your darling:</p>
          <input
            type="text"
            placeholder="Your Name (e.g., 'My Love')"
            className="p-3 border border-pink-300 rounded-md mb-3 w-full text-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Room ID (e.g., 'OurSecretGarden')"
            className="p-3 border border-pink-300 rounded-md mb-4 w-full text-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button
            onClick={handleJoinRoom}
            className="bg-pink-500 hover:bg-pink-600 text-white font-bold py-3 px-6 rounded-full text-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
          >
            Join Love Garden
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
                    Your Romantic Reward: <span className="text-red-900 block mt-2">{chosenReward}</span>
                  </div>
                )}
                <button
                  onClick={resetGame}
                  className="mt-8 bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 px-8 rounded-full text-2xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
                >
                  Play Another Round of Love!
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl z-10">
            {/* Player Info / Messages */}
            <div className="md:w-1/3 bg-gradient-to-br from-white to-pink-50 p-6 rounded-xl shadow-lg border border-pink-200">
              <h2 className="text-3xl font-semibold text-pink-600 mb-4 border-b pb-2 border-pink-200">Game Love Notes</h2>
              <p className="text-xl text-gray-700 mb-3">
                <span className="font-bold">Player 1 (You):</span> <span className="text-red-500">❤</span> {playerName}
              </p>
              <p className="text-xl text-gray-700 mb-5">
                <span className="font-bold">Player 2 (Your Darling):</span> <span className="text-purple-500">♡</span> {opponentName || 'Waiting...'}
              </p>
              <p className={`text-2xl font-bold text-center p-3 rounded-lg ${isPlayerTurn ? 'bg-green-100 text-green-700 border-green-300' : 'bg-yellow-100 text-yellow-700 border-yellow-300'} border mb-5`}>
                {isPlayerTurn ? "Your Sweet Turn!" : "Waiting for Your Darling..."}
              </p>
              <div className="h-48 overflow-y-auto bg-gray-50 p-3 rounded-md border border-gray-200 text-sm">
                {messages.map((msg, index) => (
                  <p key={index} className={`mb-1 ${msg.type === 'error' ? 'text-red-600' : msg.type === 'success' ? 'text-green-600' : 'text-gray-800'}`}>
                    {msg.text}
                  </p>
                ))}
              </div>
            </div>

            {/* Game Board */}
            <div className="md:w-2/3 flex flex-col items-center">
              <div className="grid gap-1 p-4 bg-gradient-to-br from-pink-300 to-purple-300 rounded-3xl shadow-2xl border-4 border-white transform rotate-3 scale-95 origin-bottom-left transition-all duration-500 ease-in-out hover:rotate-0 hover:scale-100">
                {board.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-1">
                    {row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`w-16 h-16 rounded-full flex items-center justify-center text-4xl font-bold transition-all duration-300 ease-in-out relative
                          ${cell === PLAYER_ONE ? 'bg-red-500 shadow-inner-lg' :
                            cell === PLAYER_TWO ? 'bg-purple-500 shadow-inner-lg' :
                            'bg-pink-100 hover:bg-pink-200 cursor-pointer'}
                          ${!gameOver && isPlayerTurn ? 'hover:scale-105' : ''}
                        `}
                        onClick={() => handleClick(colIndex)}
                      >
                        {cell === PLAYER_ONE && <span className="text-white drop-shadow-md transform rotate-12">❤</span>}
                        {cell === PLAYER_TWO && <span className="text-white drop-shadow-md transform -rotate-12">♡</span>}
                        {/* Empty hole appearance */}
                        {!cell && (
                           <div className="absolute inset-0 bg-pink-500 opacity-20 rounded-full blur-sm"></div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex justify-between w-full mt-4 text-xl font-semibold text-gray-700">
                <p>Current Turn: <span className={currentPlayer === PLAYER_ONE ? 'text-red-500' : 'text-purple-500'}>
                  {currentPlayer === PLAYER_ONE ? '❤' : '♡'}
                </span></p>
              </div>
            </div>
          </div>
        </>
      )}

      <footer className="mt-12 text-center text-xl text-purple-400 font-serif italic">
        "Love is not about finding the right person, but creating a right relationship. It's not about how much love you have in the beginning but how much love you build till the end."
      </footer>
    </div>
  );
}

export default App;