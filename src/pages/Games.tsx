import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Play, Trophy, Zap } from "lucide-react";

import { useAuth, API_URL } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BUILT_IN_GAMES = [
  { 
    id: "click-frenzy", 
    title: "Click Frenzy", 
    description: "Click as fast as you can in 10 seconds!", 
    category: "arcade", 
    image_url: "/games/click_frenzy.png" 
  },
  { 
    id: "memory-match", 
    title: "Memory Match", 
    description: "Test your memory with card matching!", 
    category: "puzzle", 
    image_url: "/games/memory_match.png" 
  },
  { 
    id: "reaction-test", 
    title: "Reaction Time", 
    description: "How fast are your reflexes?", 
    category: "reflex", 
    image_url: "/games/reaction_time.png" 
  },
  { 
    id: "tic-tac-toe", 
    title: "Tic-Tac-Toe", 
    description: "Classic strategy against an AI!", 
    category: "board", 
    image_url: "/games/tic_tac_toe.png" 
  },
];

const MemoryMatchGame = ({ onScore }: { onScore: (s: number) => void }) => {
  const [cards, setCards] = useState<{ id: number; value: number; flipped: boolean; matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [best, setBest] = useState<number | null>(null);

  const initBoard = () => {
    const values = [1, 2, 3, 4, 1, 2, 3, 4];
    const shuffled = values.sort(() => Math.random() - 0.5);
    setCards(shuffled.map((v, i) => ({ id: i, value: v, flipped: false, matched: false })));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setEnded(false);
    setStarted(false);
  };

  useEffect(() => {
    initBoard();
    const stored = localStorage.getItem("best_memory-match");
    if (stored) setBest(Number(stored));
  }, []);

  useEffect(() => {
    if (flipped.length !== 2) return;
    const [first, second] = flipped;
    if (cards[first].value === cards[second].value) {
      setMatched([...matched, first, second]);
      setFlipped([]);
    } else {
      setTimeout(() => setFlipped([]), 600);
    }
    setMoves(m => m + 1);
  }, [flipped]);

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setEnded(true);
      const score = Math.max(0, (cards.length - moves) * 10); // Score based on moves
      onScore(score);
      if (best === null || score > best) {
        setBest(score);
        try { localStorage.setItem("best_memory-match", String(score)); } catch {};
      }
    }
  }, [matched, cards.length, moves]);

  const toggleFlip = (id: number) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    setFlipped([...flipped, id]);
  };

  const restart = () => initBoard();

  if (!started) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse-neon" />
        <h3 className="text-xl font-display font-bold text-foreground mb-2">Memory Match</h3>
        <p className="text-muted-foreground mb-6 font-body">Find matching pairs. Fewer moves = higher score!</p>
        <Button onClick={() => setStarted(true)} className="font-display bg-primary text-primary-foreground neon-glow">
          START GAME
        </Button>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-accent" />
        <h3 className="text-2xl font-display font-bold text-foreground mb-2">You Won!</h3>
        <p className="text-muted-foreground mb-4">Moves: {moves}</p>
        <p className="text-4xl font-display font-bold text-primary neon-text">{Math.max(0, (cards.length - moves) * 10)}</p>
        <p className="text-muted-foreground font-body">points earned!</p>
        {best !== null && (
          <p className="text-sm text-muted-foreground mt-2">Best: {best} pts</p>
        )}
        <div className="mt-4">
          <Button onClick={restart} className="mr-2">PLAY AGAIN</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-2xl font-display font-bold text-primary mb-6">Moves: {moves}</p>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map(card => (
          <motion.button
            key={card.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => toggleFlip(card.id)}
            className={`h-20 rounded-lg font-display font-bold text-xl transition-all ${
              flipped.includes(card.id) || matched.includes(card.id) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
            }`}
          >
            {(flipped.includes(card.id) || matched.includes(card.id)) ? card.value : "?"}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

const ReactionTestGame = ({ onScore }: { onScore: (s: number) => void }) => {
  const [state, setState] = useState<"waiting" | "ready" | "go" | "finished">("waiting");
  const [reactionTime, setReactionTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [started, setStarted] = useState(false);
  const [best, setBest] = useState<number | null>(null);

  const startTest = () => {
    setStarted(true);
    setState("ready");
    const delay = Math.random() * 3000 + 1000;
    setTimeout(() => {
      setStartTime(Date.now());
      setState("go");
    }, delay);
  };

  const handleClick = () => {
    if (state === "go") {
      const time = Date.now() - startTime;
      setReactionTime(time);
      setState("finished");
      const score = Math.max(0, 500 - time * 2);
      onScore(score); // Score based on reaction time
      if (best === null || score > best) {
        setBest(score);
        try { localStorage.setItem("best_reaction-test", String(score)); } catch {};
      }
    } else if (state === "ready") {
      setState("waiting");
      setStarted(false);
    }
  };

  if (!started) {
    return (
      <div className="text-center py-12">
        <Zap className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse-neon" />
        <h3 className="text-xl font-display font-bold text-foreground mb-2">Reaction Time</h3>
        <p className="text-muted-foreground mb-6 font-body">Click when the screen turns green!</p>
        <Button onClick={startTest} className="font-display bg-primary text-primary-foreground neon-glow">
          START TEST
        </Button>
      </div>
    );
  }

  if (state === "finished") {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-accent" />
        <h3 className="text-2xl font-display font-bold text-foreground mb-2">Result</h3>
        <p className="text-5xl font-display font-bold text-primary neon-text mb-2">{reactionTime}ms</p>
        <p className="text-muted-foreground mb-6">Reaction time</p>
        <p className="text-xl font-display text-accent mb-4">{Math.max(0, 500 - reactionTime * 2)} points!</p>
        {best !== null && (
          <p className="text-sm text-muted-foreground mt-2">Best: {best} pts</p>
        )}
        <div className="mt-4">
          <Button onClick={() => setStarted(false)} className="font-display bg-primary text-primary-foreground neon-glow mr-2">TRY AGAIN</Button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    const stored = localStorage.getItem("best_reaction-test");
    if (stored) setBest(Number(stored));
  }, []);

  return (
    <div className="text-center py-12">
      <motion.button
        onClick={handleClick}
        className={`w-48 h-48 rounded-full font-display font-bold text-2xl transition-all ${
          state === "ready"
            ? "bg-yellow-500/20 text-yellow-500 border-2 border-yellow-500 cursor-not-allowed"
            : "bg-green-500/20 text-green-500 border-2 border-green-500 active:scale-90"
        }`}
      >
        {state === "ready" ? "WAIT..." : "CLICK!"}
      </motion.button>
    </div>
  );
};

const TicTacToeGame = ({ onScore }: { onScore: (s: number) => void }) => {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [winner, setWinner] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const handleClick = (i: number) => {
    if (winner || board[i]) return;
    const nextBoard = board.slice();
    nextBoard[i] = "X";
    setBoard(nextBoard);
    
    const win = calculateWinner(nextBoard);
    if (win) {
      setWinner(win);
      onScore(50);
    } else if (!nextBoard.includes(null)) {
      setWinner("Draw");
      onScore(10);
    } else {
      setIsXNext(false);
      // Simple AI Move after a short delay
      setTimeout(() => aiMove(nextBoard), 500);
    }
  };

  const aiMove = (currentBoard: (string | null)[]) => {
    const availableIndices = currentBoard.map((v, i) => v === null ? i : null).filter(v => v !== null) as number[];
    if (availableIndices.length === 0) return;
    const randomIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const nextBoard = currentBoard.slice();
    nextBoard[randomIdx] = "O";
    setBoard(nextBoard);
    const win = calculateWinner(nextBoard);
    if (win) {
      setWinner(win);
    } else {
      setIsXNext(true);
    }
  };

  const restart = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  if (!started) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse-neon" />
        <h3 className="text-xl font-display font-bold text-foreground mb-2">Tic-Tac-Toe</h3>
        <p className="text-muted-foreground mb-6 font-body">Beat the AI in this classic strategy game!</p>
        <Button onClick={() => setStarted(true)} className="font-display bg-primary text-primary-foreground neon-glow">
          START GAME
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <h3 className="text-2xl font-display font-bold text-foreground mb-6">
        {winner ? (winner === "Draw" ? "It's a Draw!" : `Winner: ${winner}`) : `Next: ${isXNext ? "X" : "O"}`}
      </h3>
      <div className="grid grid-cols-3 gap-3 max-w-[300px] mx-auto mb-8">
        {board.map((val, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleClick(i)}
            className={`h-24 rounded-xl border-2 border-primary/20 bg-muted/30 font-display text-4xl font-bold flex items-center justify-center transition-all hover:bg-muted/50 ${
              val === "X" ? "text-primary neon-text" : "text-accent"
            }`}
          >
            {val}
          </motion.button>
        ))}
      </div>
      {(winner || !board.includes(null)) && (
        <Button onClick={restart} className="bg-primary text-primary-foreground neon-glow">
          PLAY AGAIN
        </Button>
      )}
    </div>
  );
};

const ClickFrenzyGame = ({ onScore }: { onScore: (s: number) => void }) => {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void | null>(null);

  useEffect(() => {
    if (!started || ended) return;
    if (timeLeft <= 0) {
      setEnded(true);
      onScore(clicks);
      if (best === null || clicks > best) {
        setBest(clicks);
        try { localStorage.setItem("best_click-frenzy", String(clicks)); } catch {};
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [started, timeLeft, ended]);

  useEffect(() => {
    const stored = localStorage.getItem("best_click-frenzy");
    if (stored) setBest(Number(stored));
  }, []);

  useEffect(() => {
    if (!started || ended) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setClicks(c => c + 1);
      }
    };
    keyHandlerRef.current = onKey;
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, ended]);

  const restart = () => {
    setClicks(0);
    setTimeLeft(10);
    setStarted(false);
    setEnded(false);
  };

  if (!started) {
    return (
      <div className="text-center py-12">
        <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-primary animate-pulse-neon" />
        <h3 className="text-xl font-display font-bold text-foreground mb-2">Click Frenzy</h3>
        <p className="text-muted-foreground mb-6 font-body">Click the button as many times as you can in 10 seconds!</p>
        <Button onClick={() => setStarted(true)} className="font-display bg-primary text-primary-foreground neon-glow">
          START GAME
        </Button>
      </div>
    );
  }

  if (ended) {
    return (
      <div className="text-center py-12">
        <Trophy className="w-16 h-16 mx-auto mb-4 text-accent" />
        <h3 className="text-2xl font-display font-bold text-foreground mb-2">Game Over!</h3>
        <p className="text-4xl font-display font-bold text-primary neon-text mb-2">{clicks}</p>
        <p className="text-muted-foreground font-body">clicks earned as points!</p>
        {best !== null && (
          <p className="text-sm text-muted-foreground mt-2">Best: {best} clicks</p>
        )}
        <div className="mt-4">
          <Button onClick={restart} className="mr-2">PLAY AGAIN</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-5xl font-display font-bold text-accent mb-2">{timeLeft}s</p>
      <p className="text-3xl font-display font-bold text-primary mb-6">{clicks} clicks</p>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setClicks(c => c + 1)}
        className="w-40 h-40 rounded-full gradient-primary text-primary-foreground font-display font-bold text-xl neon-glow active:scale-95 transition-transform"
      >
        CLICK!
      </motion.button>
    </div>
  );
};

const Games = () => {
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [dbGames, setDbGames] = useState<any[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/games`)
      .then(res => res.json())
      .then(data => setDbGames(data))
      .catch(err => console.error("Failed to fetch games:", err));
  }, []);

  const handleScore = async (score: number) => {
    if (!user) return;
    
    try {
      const res = await fetch(`${API_URL}/add-points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("vapy_token")}`
        },
        body: JSON.stringify({ score })
      });
      
      if (res.ok) {
        await refreshProfile();
        toast({ title: `+${score} points!`, description: "Points added to your profile!" });
      }
    } catch (err) {
      console.error("Failed to add score", err);
    }
  };

  const allGames = [...BUILT_IN_GAMES, ...dbGames];

  if (activeGame === "click-frenzy") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={gameContainerRef}>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setActiveGame(null)} className="text-muted-foreground hover:text-foreground font-body">← Back to Games</button>
          <button onClick={toggleFullscreen} className="text-sm text-primary hover:underline">
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
        <div className="glass rounded-xl p-6">
          <ClickFrenzyGame onScore={handleScore} />
        </div>
      </motion.div>
    );
  }

  if (activeGame === "memory-match") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={gameContainerRef}>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setActiveGame(null)} className="text-muted-foreground hover:text-foreground font-body">← Back to Games</button>
          <button onClick={toggleFullscreen} className="text-sm text-primary hover:underline">
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
        <div className="glass rounded-xl p-6">
          <MemoryMatchGame onScore={handleScore} />
        </div>
      </motion.div>
    );
  }

  if (activeGame === "reaction-test") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={gameContainerRef}>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setActiveGame(null)} className="text-muted-foreground hover:text-foreground font-body">← Back to Games</button>
          <button onClick={toggleFullscreen} className="text-sm text-primary hover:underline">
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
        <div className="glass rounded-xl p-6">
          <ReactionTestGame onScore={handleScore} />
        </div>
      </motion.div>
    );
  }

  if (activeGame === "tic-tac-toe") {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={gameContainerRef}>
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setActiveGame(null)} className="text-muted-foreground hover:text-foreground font-body">← Back to Games</button>
          <button onClick={toggleFullscreen} className="text-sm text-primary hover:underline">
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
        <div className="glass rounded-xl p-6">
          <TicTacToeGame onScore={handleScore} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Gamepad2 className="w-7 h-7 text-primary" />
        <h2 className="text-2xl font-display font-bold text-foreground">Games</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allGames.map(game => (
          <motion.div
            key={game._id || game.id}
            whileHover={{ y: -4 }}
            className="glass rounded-xl overflow-hidden hover:neon-border transition-all cursor-pointer group"
            onClick={() => ["click-frenzy", "memory-match", "reaction-test", "tic-tac-toe"].includes(game.id) ? setActiveGame(game.id) : null}
          >
            <div className="h-40 overflow-hidden relative">
              {game.image_url ? (
                <img src={game.image_url} alt={game.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="h-full gradient-primary flex items-center justify-center">
                  <Gamepad2 className="w-12 h-12 text-primary-foreground/80 group-hover:scale-110 transition-transform" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            </div>
            <div className="p-4">
              <h3 className="font-display font-bold text-foreground">{game.title}</h3>
              <p className="text-sm text-muted-foreground font-body mt-1">{game.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs font-display uppercase tracking-wider bg-primary/20 text-primary px-2 py-1 rounded">{game.category}</span>
                {["click-frenzy", "memory-match", "reaction-test", "tic-tac-toe"].includes(game.id) && (
                  <Button size="sm" variant="ghost" className="text-primary font-display">
                    <Play className="w-4 h-4 mr-1" /> PLAY
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Games;
