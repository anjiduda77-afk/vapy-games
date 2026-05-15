import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as ChessJSModule from 'chess.js';
const Chess = typeof (ChessJSModule as any).Chess === 'function' ? (ChessJSModule as any).Chess : ChessJSModule;
type Chess = import('chess.js').Chess;
type Square = import('chess.js').Square;
import ChessBoard from './ChessBoard';
import { getAIMove, getHint, AI_CONFIGS, DIFFICULTY_LEVELS, DifficultyLevel } from './engine';
import type { BoardTheme } from './ChessBoard';
import MultiplayerLobby, { RoomSettings } from './MultiplayerLobby';
import { useAuth } from '@/contexts/AuthContext';
import { io, Socket } from 'socket.io-client';
import { BASE_URL } from '@/lib/api';

// Sound effects
const playSound = (type: 'move'|'capture'|'check'|'castle'|'win'|'lose') => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    const freqs: Record<string,number> = { move:440, capture:330, check:660, castle:520, win:880, lose:220 };
    osc.frequency.value = freqs[type] || 440;
    osc.type = type === 'win' ? 'sine' : 'triangle';
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch {}
};

interface Props {
  level: number;
  onScore: (s: number, r?: 'win'|'loss'|'draw') => void;
  onLevelUp: () => void;
}

type GamePhase = 'menu' | 'lobby' | 'playing' | 'gameover';
type GameMode = 'computer' | 'local' | 'online';

const RANK_TIERS = [
  { name: 'Bronze', min: 0, color: 'text-amber-700', bg: 'bg-amber-900/20', border: 'border-amber-700/40' },
  { name: 'Silver', min: 400, color: 'text-slate-300', bg: 'bg-slate-500/20', border: 'border-slate-400/40' },
  { name: 'Gold', min: 800, color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
  { name: 'Platinum', min: 1200, color: 'text-cyan-300', bg: 'bg-cyan-500/20', border: 'border-cyan-400/40' },
  { name: 'Diamond', min: 1600, color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/40' },
  { name: 'Master', min: 2000, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
  { name: 'Grandmaster', min: 2400, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' },
];
const getRank = (xp: number) => [...RANK_TIERS].reverse().find(r => xp >= r.min) || RANK_TIERS[0];

export default function ChessGame({ level, onScore, onLevelUp }: Props) {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [mode, setMode] = useState<GameMode>('computer');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [game, setGame] = useState(new Chess());
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('cyber-neon');
  const [flipped, setFlipped] = useState(false);
  const [lastMove, setLastMove] = useState<{from:Square;to:Square}|null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [aiThinking, setAiThinking] = useState(false);
  const [hintSquare, setHintSquare] = useState<Square|null>(null);
  const [hintTarget, setHintTarget] = useState<Square|null>(null);
  const [gameResult, setGameResult] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<'w'|'b'>('w');
  const [totalXP, setTotalXP] = useState(0);
  const [timer, setTimer] = useState<{w:number;b:number}>({w:600,b:600});
  const [timerActive, setTimerActive] = useState(false);
  const [selectedTimer, setSelectedTimer] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);
  
  // Online Multiplayer State
  const auth = useAuth();
  const user = auth?.user;
  const profile = auth?.profile;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const [currentRoom, setCurrentRoom] = useState<any>(null);

  const gameRef = useRef(game);
  gameRef.current = game;

  // Timer
  useEffect(() => {
    if (!timerActive || phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        const t = game.turn();
        const newTime = { ...prev, [t]: prev[t] - 1 };
        if (newTime[t] <= 0) {
          clearInterval(timerRef.current!);
          setTimerActive(false);
          setGameResult(t === playerColor ? 'Time Out - You Lose!' : 'Opponent Timed Out - You Win!');
          setPhase('gameover');
          const xp = t === playerColor ? 0 : AI_CONFIGS[difficulty].xpReward;
          if (xp > 0) { onScore(xp, 'win'); setTotalXP(p => p + xp); }
        }
        return newTime;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerActive, phase, game.turn()]);

  // Online opponent move listener
  useEffect(() => {
    if (!socket || phase !== 'playing' || mode !== 'online') return;
    
    const onOpponentMove = ({ from, to, promotion, fen, san }: any) => {
      const g = new Chess(fen);
      setGame(g);
      setLastMove({ from, to });
      setMoveHistory(prev => [...prev, san]);
      if (san.includes('+')) playSound('check');
      else playSound('move');
      checkGameEnd(g);
    };

    const onGameOver = ({ reason, winnerId, loserId }: any) => {
      setTimerActive(false);
      setPhase('gameover');
      if (reason === 'resign') {
        if (winnerId === socket.id) {
          setGameResult('🎉 Opponent Resigned - You Win!');
          playSound('win');
        } else {
          setGameResult('🏳 You Resigned');
          playSound('lose');
        }
      } else if (reason === 'draw-agreement') {
        setGameResult('🤝 Draw by Agreement!');
      }
    };

    const onPlayerLeft = () => {
      setTimerActive(false);
      setPhase('gameover');
      setGameResult('⚠️ Opponent Disconnected');
    };

    socket.on("chess-opponent-move", onOpponentMove);
    socket.on("chess-game-over", onGameOver);
    socket.on("chess-player-left", onPlayerLeft);
    return () => { 
      socket.off("chess-opponent-move", onOpponentMove); 
      socket.off("chess-game-over", onGameOver);
      socket.off("chess-player-left", onPlayerLeft);
    };
  }, [socket, phase, mode, checkGameEnd]);

  const formatTime = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

  const startGame = (m: GameMode, diff?: DifficultyLevel) => {
    const g = new Chess();
    setGame(g);
    setMode(m);
    if (diff) setDifficulty(diff);
    setPhase('playing');
    setMoveHistory([]);
    setLastMove(null);
    setGameResult('');
    setHintSquare(null);
    setHintTarget(null);
    setTimer({ w: selectedTimer * 60, b: selectedTimer * 60 });
    setTimerActive(true);
  };

  const checkGameEnd = useCallback((g: Chess) => {
    if (!g.isGameOver()) return false;
    setTimerActive(false);
    const config = AI_CONFIGS[difficulty];
    if (g.isCheckmate()) {
      const loser = g.turn();
      if (loser !== playerColor) {
        setGameResult('🎉 Checkmate - You Win!');
        playSound('win');
        onScore(config.xpReward, 'win');
        setTotalXP(p => p + config.xpReward);
      } else {
        setGameResult('💀 Checkmate - You Lose!');
        playSound('lose');
      }
    } else if (g.isDraw()) {
      setGameResult('🤝 Draw!');
      const drawXP = Math.round(config.xpReward * 0.3);
      onScore(drawXP, 'draw');
      setTotalXP(p => p + drawXP);
    } else if (g.isStalemate()) {
      setGameResult('🤝 Stalemate!');
    }
    setPhase('gameover');
    return true;
  }, [difficulty, playerColor, onScore]);

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    const g = new Chess(game.fen());
    try {
      const move = g.move({ from, to, promotion: (promotion || 'q') as any });
      if (!move) return false;
      setGame(g);
      setLastMove({ from, to });
      setMoveHistory(prev => [...prev, move.san]);
      setHintSquare(null);
      setHintTarget(null);
      if (move.captured) playSound('capture');
      else if (move.san.includes('+')) playSound('check');
      else if (move.san === 'O-O' || move.san === 'O-O-O') playSound('castle');
      else playSound('move');
      if (checkGameEnd(g)) return true;
      
      // Online move emit
      if (mode === 'online' && socket && roomId) {
        socket.emit("chess-move", { roomId, from, to, promotion: promotion || 'q', fen: g.fen(), san: move.san });
        return true;
      }

      // AI move
      if (mode === 'computer' && g.turn() !== playerColor) {
        setAiThinking(true);
        const config = AI_CONFIGS[difficulty];
        const delay = config.thinkTimeMs[0] + Math.random() * (config.thinkTimeMs[1] - config.thinkTimeMs[0]);
        setTimeout(() => {
          const aiMove = getAIMove(g.fen(), difficulty);
          if (aiMove) {
            const g2 = new Chess(g.fen());
            g2.move(aiMove);
            setGame(g2);
            setLastMove({ from: aiMove.from as Square, to: aiMove.to as Square });
            setMoveHistory(prev => [...prev, aiMove.san]);
            if (aiMove.captured) playSound('capture');
            else if (aiMove.san.includes('+')) playSound('check');
            else playSound('move');
            checkGameEnd(g2);
          }
          setAiThinking(false);
        }, delay);
      }
      return true;
    } catch { return false; }
  }, [game, mode, difficulty, playerColor, checkGameEnd]);

  const handleUndo = () => {
    if (mode === 'online') return; // Cannot undo in online mode
    const g = new Chess(game.fen());
    const undoCount = mode === 'computer' ? 2 : 1;
    for (let i = 0; i < undoCount; i++) {
      const undone = g.undo();
      if (!undone) break;
    }
    setGame(new Chess(g.fen()));
    setMoveHistory(prev => prev.slice(0, -(mode === 'computer' ? 2 : 1)));
    setLastMove(null);
    setHintSquare(null);
    setHintTarget(null);
  };

  const handleResign = () => {
    setTimerActive(false);
    playSound('lose');
    setGameResult('🏳 You Resigned');
    setPhase('gameover');
    if (mode === 'online' && socket && roomId) {
      socket.emit('chess-resign', { roomId });
    }
  };

  const handleHint = () => {
    const hint = getHint(game.fen());
    if (hint) { setHintSquare(hint.from as Square); setHintTarget(hint.to as Square); }
  };

  const rank = getRank(totalXP);

  // ─── MENU ────────────────────────────────────────────────
  if (phase === 'menu') {
    return (
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="max-w-2xl mx-auto space-y-6 py-4">
        {/* Title */}
        <div className="text-center">
          <motion.div animate={{y:[0,-6,0]}} transition={{repeat:Infinity,duration:3}} className="text-6xl mb-3">♟️</motion.div>
          <h2 className="text-3xl font-display font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">VAPY CHESS</h2>
          <p className="text-muted-foreground text-sm font-body mt-1">Premium Competitive Chess</p>
          {totalXP > 0 && (
            <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full border ${rank.bg} ${rank.border}`}>
              <span className={`text-xs font-display font-bold ${rank.color}`}>{rank.name}</span>
              <span className="text-[10px] text-muted-foreground">{totalXP} XP</span>
            </div>
          )}
        </div>

        {/* Play vs Computer */}
        <div className="glass rounded-2xl p-5 border border-cyan-500/20">
          <h3 className="font-display font-bold text-sm text-cyan-400 mb-3 tracking-wider">🤖 PLAY VS COMPUTER</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
            {DIFFICULTY_LEVELS.map(d => {
              const c = AI_CONFIGS[d];
              const sel = difficulty === d;
              return (
                <motion.button key={d} whileHover={{scale:1.05}} whileTap={{scale:0.95}}
                  onClick={() => setDifficulty(d)}
                  className={`p-2 rounded-xl border text-center transition-all ${sel ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,255,255,0.2)]' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                  <span className="text-lg">{c.label.split(' ')[0]}</span>
                  <p className="text-[9px] font-display font-bold mt-0.5 truncate">{d.toUpperCase()}</p>
                  <p className="text-[8px] text-emerald-400">+{c.xpReward} XP</p>
                </motion.button>
              );
            })}
          </div>

          {/* Timer selection */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground font-display">⏱ TIMER:</span>
            {[1,3,5,10,30].map(t => (
              <button key={t} onClick={() => setSelectedTimer(t)}
                className={`px-2 py-1 rounded-lg text-[10px] font-display font-bold border transition-all ${selectedTimer===t ? 'border-cyan-400 bg-cyan-500/20 text-cyan-400' : 'border-white/10 text-muted-foreground hover:border-white/20'}`}>
                {t}m
              </button>
            ))}
          </div>

          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            onClick={() => startGame('computer', difficulty)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-display font-bold text-sm tracking-wider shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all">
            ⚔️ START MATCH
          </motion.button>
        </div>

        {/* Local 2P */}
        <div className="glass rounded-2xl p-5 border border-purple-500/20">
          <h3 className="font-display font-bold text-sm text-purple-400 mb-3 tracking-wider">👥 LOCAL 2-PLAYER</h3>
          <p className="text-xs text-muted-foreground mb-3">Play against a friend on the same device</p>
          <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            onClick={() => startGame('local')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-display font-bold text-sm tracking-wider shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all">
            🎮 PLAY LOCAL
          </motion.button>
        </div>

        {/* Board Theme */}
        <div className="glass rounded-2xl p-4 border border-white/10">
          <h3 className="font-display font-bold text-[10px] text-muted-foreground mb-2 tracking-widest">BOARD THEME</h3>
          <div className="flex gap-2">
            {(['cyber-neon','classic-wood','dark-pro','space'] as BoardTheme[]).map(t => (
              <button key={t} onClick={() => setBoardTheme(t)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-display font-bold border transition-all capitalize ${boardTheme===t ? 'border-cyan-400 bg-cyan-500/10 text-cyan-400' : 'border-white/10 text-muted-foreground'}`}>
                {t.replace('-',' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Online Modes */}
        <div className="glass rounded-2xl p-5 border border-cyan-500/30 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 z-0" />
          <div className="relative z-10">
            <h3 className="font-display font-bold text-sm text-cyan-400 mb-2 tracking-wider flex items-center gap-2">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span>
              🌐 ONLINE MULTIPLAYER
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Create private rooms, invite friends, and play ranked matches in real-time.</p>
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
              onClick={() => {
                if (!user) { alert("Please sign in to play online!"); return; }
                setPhase('lobby');
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-display font-bold text-sm tracking-wider shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all">
              🌍 ENTER LOBBY
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── LOBBY ────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <MultiplayerLobby 
        currentRoom={currentRoom}
        onCancel={() => setPhase('menu')}
        onCreateRoom={(settings) => {
          if (!socket) {
            const s = io(BASE_URL, { transports: ["websocket", "polling"] });
            setSocket(s);
            s.emit("chess-create-room", { userId: user?.id, nickname: profile?.nickname || 'Player', timeControl: settings.timeControl, settings });
            
            s.on("chess-room-created", ({ roomId, room }) => {
              setRoomId(roomId);
              setCurrentRoom(room);
            });
            
            s.on("chess-game-start", ({ roomId, players, fen, timeControl }) => {
              const me = players.find((p:any) => p.id === s.id);
              const opp = players.find((p:any) => p.id !== s.id);
              setOpponentName(opp?.nickname || 'Opponent');
              setPlayerColor(me?.color || 'w');
              setFlipped(me?.color === 'b');
              startGame('online');
              setTimer({ w: timeControl, b: timeControl });
            });
          }
        }}
        onJoinRoom={(code) => {
          if (!socket) {
            const s = io(BASE_URL, { transports: ["websocket", "polling"] });
            setSocket(s);
            s.emit("chess-join-room", { roomId: code, userId: user?.id, nickname: profile?.nickname || 'Player' });
            
            s.on("chess-game-start", ({ roomId, players, fen, timeControl }) => {
              const me = players.find((p:any) => p.id === s.id);
              const opp = players.find((p:any) => p.id !== s.id);
              setOpponentName(opp?.nickname || 'Opponent');
              setPlayerColor(me?.color || 'b');
              setFlipped(me?.color === 'b');
              setRoomId(roomId);
              startGame('online');
              setTimer({ w: timeControl, b: timeControl });
            });

            s.on("chess-error", (err) => alert(err.message));
          }
        }}
      />
    );
  }

  // ─── GAME OVER ───────────────────────────────────────────
  if (phase === 'gameover') {
    const isWin = gameResult.includes('Win');
    const isDraw = gameResult.includes('Draw') || gameResult.includes('Stalemate');
    return (
      <motion.div initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}} className="max-w-md mx-auto text-center py-8 space-y-4">
        <motion.div animate={{scale:[1,1.2,1],rotate:[0,5,-5,0]}} transition={{repeat:Infinity,duration:2}} className="text-7xl">
          {isWin ? '🏆' : isDraw ? '🤝' : '💀'}
        </motion.div>
        <h2 className={`text-2xl font-display font-black ${isWin ? 'text-emerald-400' : isDraw ? 'text-amber-400' : 'text-red-400'}`}>
          {gameResult}
        </h2>
        {mode === 'computer' && (
          <div className="glass rounded-xl p-4 border border-white/10 space-y-2">
            <p className="text-xs text-muted-foreground font-display">VS {AI_CONFIGS[difficulty].label}</p>
            <p className="text-sm font-display">
              <span className="text-emerald-400">+{isWin ? AI_CONFIGS[difficulty].xpReward : isDraw ? Math.round(AI_CONFIGS[difficulty].xpReward * 0.3) : 0} XP</span>
              {' · '}<span className={rank.color}>{rank.name}</span>
            </p>
            <p className="text-xs text-muted-foreground">{moveHistory.length} moves · {formatTime(selectedTimer*60 - timer[playerColor])} elapsed</p>
          </div>
        )}
        {/* Move history */}
        {moveHistory.length > 0 && (
          <div className="glass rounded-xl p-3 border border-white/10 max-h-32 overflow-y-auto">
            <p className="text-[10px] font-display text-muted-foreground mb-1 tracking-widest">MOVE HISTORY</p>
            <div className="flex flex-wrap gap-1 text-[10px] font-mono">
              {moveHistory.map((m, i) => (
                <span key={i} className={i%2===0 ? 'text-cyan-400' : 'text-purple-400'}>
                  {i%2===0 ? `${Math.floor(i/2)+1}.` : ''}{m}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            onClick={() => startGame(mode, difficulty)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-display font-bold text-xs tracking-wider">
            🔄 REMATCH
          </motion.button>
          <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}}
            onClick={() => setPhase('menu')}
            className="px-6 py-2.5 rounded-xl border border-white/20 text-muted-foreground font-display font-bold text-xs tracking-wider hover:border-white/40">
            📋 MENU
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // ─── PLAYING ─────────────────────────────────────────────
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="max-w-3xl mx-auto">
      {/* Top bar: opponent info + timer */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-sm">
            {mode === 'computer' ? '🤖' : '👤'}
          </div>
          <div>
            <p className="text-xs font-display font-bold text-foreground">
              {mode === 'computer' ? AI_CONFIGS[difficulty].label : 'Player 2'}
            </p>
            <p className="text-[10px] text-muted-foreground">{flipped ? 'White' : 'Black'}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold border ${game.turn() !== playerColor ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>
          {formatTime(timer[flipped ? 'w' : 'b'])}
        </div>
      </div>

      {/* AI thinking indicator */}
      <AnimatePresence>
        {aiThinking && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="mb-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2">
            <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1,ease:'linear'}}
              className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full"/>
            <span className="text-xs font-display text-purple-400 tracking-wider">AI THINKING...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chess Board */}
      <ChessBoard
        game={game}
        onMove={handleMove}
        flipped={flipped}
        boardTheme={boardTheme}
        disabled={aiThinking || phase !== 'playing' || (mode !== 'local' && game.turn() !== playerColor)}
        lastMove={lastMove}
        hintSquare={hintSquare}
        hintTarget={hintTarget}
        playerColor={playerColor}
      />

      {/* Bottom bar: player info + timer */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-sm">👤</div>
          <div>
            <p className="text-xs font-display font-bold text-foreground">You</p>
            <p className="text-[10px] text-muted-foreground">{flipped ? 'Black' : 'White'}</p>
          </div>
        </div>
        <div className={`px-3 py-1.5 rounded-lg font-mono text-sm font-bold border ${game.turn() === playerColor ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>
          {formatTime(timer[flipped ? 'b' : 'w'])}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <button onClick={handleUndo} disabled={moveHistory.length === 0 || aiThinking}
          className="px-3 py-2 rounded-lg border border-white/10 text-[10px] font-display font-bold text-muted-foreground hover:border-cyan-400/50 hover:text-cyan-400 disabled:opacity-30 transition-all">
          ↩ UNDO
        </button>
        <button onClick={handleHint} disabled={aiThinking || game.turn() !== playerColor}
          className="px-3 py-2 rounded-lg border border-white/10 text-[10px] font-display font-bold text-muted-foreground hover:border-emerald-400/50 hover:text-emerald-400 disabled:opacity-30 transition-all">
          💡 HINT
        </button>
        <button onClick={() => setFlipped(!flipped)}
          className="px-3 py-2 rounded-lg border border-white/10 text-[10px] font-display font-bold text-muted-foreground hover:border-purple-400/50 hover:text-purple-400 transition-all">
          🔄 FLIP
        </button>
        <button onClick={handleResign}
          className="px-3 py-2 rounded-lg border border-red-500/20 text-[10px] font-display font-bold text-red-400/70 hover:border-red-400/50 hover:text-red-400 transition-all">
          🏳 RESIGN
        </button>
      </div>

      {/* Move history */}
      {moveHistory.length > 0 && (
        <div className="mt-3 px-3 py-2 rounded-xl bg-white/5 border border-white/5 max-h-20 overflow-y-auto">
          <div className="flex flex-wrap gap-1 text-[10px] font-mono">
            {moveHistory.map((m, i) => (
              <span key={i} className={i%2===0 ? 'text-cyan-400/80' : 'text-purple-400/80'}>
                {i%2===0 ? `${Math.floor(i/2)+1}.` : ''}{m}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div className="text-center mt-2">
        <p className="text-[10px] font-display text-muted-foreground tracking-wider">
          {game.inCheck() && '⚠️ CHECK! · '}
          {game.turn() === 'w' ? "White's turn" : "Black's turn"}
          {mode === 'computer' && ` · vs ${AI_CONFIGS[difficulty].label}`}
        </p>
      </div>
    </motion.div>
  );
}
