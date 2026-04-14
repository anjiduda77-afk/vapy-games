import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Play, Trophy, Zap, MousePointer2, Hash, ChevronUp, Search, Car, Users, Plus, LogIn, ArrowLeft, Shield, Clock, Star, Maximize2, Minimize2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const BASE_URL = "https://vapy-games.onrender.com";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ticTacToeIcon from "../tictactoeicon.jpeg.png";
import goCarIcon from "../test/gocar.png";
import { io, Socket } from "socket.io-client";
import { GoCarGame } from "../games/GoCar";
// ── 9 Difficulty Levels: Basic → Heroic ──────────────────────────────────────
const LEVELS = [
  { n:1, name:"Basic",     emoji:"🌱", color:"text-emerald-400", bg:"bg-emerald-500/10", border:"border-emerald-500/30", glow:"",                                           mult:1.0 },
  { n:2, name:"Rookie",    emoji:"⚡", color:"text-green-400",   bg:"bg-green-500/10",   border:"border-green-500/30",   glow:"",                                           mult:1.5 },
  { n:3, name:"Skilled",   emoji:"🎯", color:"text-lime-400",    bg:"bg-lime-500/10",    border:"border-lime-500/30",    glow:"",                                           mult:2.0 },
  { n:4, name:"Advanced",  emoji:"⭐", color:"text-yellow-400",  bg:"bg-yellow-500/10",  border:"border-yellow-500/30",  glow:"",                                           mult:2.5 },
  { n:5, name:"Expert",    emoji:"🔥", color:"text-orange-400",  bg:"bg-orange-500/10",  border:"border-orange-500/30",  glow:"",                                           mult:3.0 },
  { n:6, name:"Elite",     emoji:"💀", color:"text-red-400",     bg:"bg-red-500/10",     border:"border-red-500/30",     glow:"shadow-[0_0_12px_rgba(239,68,68,0.35)]",     mult:4.0 },
  { n:7, name:"Master",    emoji:"👑", color:"text-purple-400",  bg:"bg-purple-500/10",  border:"border-purple-500/30",  glow:"shadow-[0_0_16px_rgba(168,85,247,0.45)]",    mult:5.0 },
  { n:8, name:"Legendary", emoji:"💫", color:"text-pink-400",    bg:"bg-pink-500/10",    border:"border-pink-500/30",    glow:"shadow-[0_0_20px_rgba(236,72,153,0.55)]",    mult:6.0 },
  { n:9, name:"Heroic",    emoji:"⚔️", color:"text-rose-400",    bg:"bg-rose-500/10",    border:"border-rose-500/30",    glow:"shadow-[0_0_28px_rgba(244,63,94,0.65)]",     mult:8.0 },
];
const getLevel = (n: number) => LEVELS[Math.max(0, Math.min(n - 1, 8))];

// ── Level HUD shown inside each game ─────────────────────────────────────────
const LevelHUD = ({ level }: { level: number }) => {
  const def = getLevel(level);
  const next = level < 9 ? getLevel(level + 1) : null;
  return (
    <motion.div key={level} initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border mb-5 ${def.bg} ${def.border} ${def.glow}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none">{def.emoji}</span>
        <div>
          <p className={`text-[11px] uppercase tracking-[0.1em] font-display font-bold ${def.color}`}>Level {level} · {def.name}</p>
          <p className="text-[10px] text-muted-foreground font-body">{def.mult}× score multiplier</p>
        </div>
      </div>
      {next
        ? <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><ChevronUp className="w-3 h-3"/>Win → {next.name}</span>
        : <span className="text-[10px] font-display text-rose-400 font-bold animate-pulse">MAX LEVEL</span>}
    </motion.div>
  );
};

// ── Level-Up Flash overlay ────────────────────────────────────────────────────
const LevelUpFlash = ({ level, onDone }: { level: number; onDone: () => void }) => {
  const def = getLevel(level);
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <motion.div initial={{ opacity:0,scale:0.7 }} animate={{ opacity:1,scale:1 }} exit={{ opacity:0,scale:1.15 }}
      onClick={onDone}
      className={`fixed inset-0 z-[100] flex items-center justify-center cursor-pointer backdrop-blur-[2px] transition-all hover:bg-white/5`}>
      <div className={`px-10 py-8 rounded-2xl border-2 backdrop-blur-xl text-center pointer-events-auto ${def.bg} ${def.border} ${def.glow}`}>
        <p className="text-5xl mb-2">{def.emoji}</p>
        <p className={`text-3xl font-display font-black tracking-wide ${def.color}`}>LEVEL UP!</p>
        <p className={`text-xl font-display font-bold mt-1 ${def.color}`}>{def.name}</p>
        <p className="text-sm text-muted-foreground font-body mt-2">{def.mult}× score multiplier unlocked</p>
        <p className="text-[10px] text-muted-foreground mt-4 animate-pulse uppercase tracking-widest font-display">Tap to Continue</p>
      </div>
    </motion.div>
  );
};

// ── Built-in games (no difficulty field on cards) ─────────────────────────────
const BUILT_IN_GAMES = [
  { id:"click-frenzy",  title:"Click Frenzy",  description:"Click as fast as you can!", category:"Arcade", image_url:"" },
  { id:"memory-match",  title:"Memory Match",  description:"Match the cards!",           category:"Puzzle", image_url:"" },
  { id:"reaction-test", title:"Reaction Time", description:"Test your reflexes!",        category:"Reflex", image_url:"" },
  { id:"tic-tac-toe",   title:"Tic-Tac-Toe",   description:"Beat the AI!",               category:"Board",  image_url:ticTacToeIcon },
  { id:"go-car",        title:"GO CAR",         description:"Drive through city & village!", category:"Driving", image_url:goCarIcon },
];
const PLAYABLE = ["click-frenzy","memory-match","reaction-test","tic-tac-toe","go-car"];

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY MATCH
// ═══════════════════════════════════════════════════════════════════════════════
const PAIRS_BY_LEVEL = [4,4,6,6,8,8,10,10,12];

const MemoryMatchGame = ({ level, onScore, onLevelUp }: { level:number; onScore:(s:number, result?:'win'|'loss'|'draw')=>void; onLevelUp:()=>void }) => {
  const pairs = PAIRS_BY_LEVEL[level - 1];
  const [cards, setCards] = useState<{id:number;value:number;flipped:boolean;matched:boolean}[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [scored, setScored] = useState(false);
  const [showUp, setShowUp] = useState(false);

  const initBoard = () => {
    const vals = Array.from({length:pairs},(_,i)=>i+1).flatMap(v=>[v,v]).sort(()=>Math.random()-0.5);
    setCards(vals.map((v,i)=>({id:i,value:v,flipped:false,matched:false})));
    setFlipped([]); setMatched([]); setMoves(0); setEnded(false); setStarted(false); setScored(false);
  };
  useEffect(() => { initBoard(); }, [level]);

  useEffect(() => {
    if (flipped.length!==2) return;
    const [a,b] = flipped;
    if (cards[a]?.value===cards[b]?.value) { setMatched(m=>[...m,a,b]); setFlipped([]); }
    else setTimeout(()=>setFlipped([]),700);
    setMoves(m=>m+1);
  }, [flipped]);

  useEffect(() => {
    if (matched.length===cards.length&&cards.length>0&&!scored) {
      setEnded(true); setScored(true);
      const base = Math.max(0,(pairs*2-moves)*8);
      const score = Math.round(base*getLevel(level).mult);
      onScore(score, "win");
      if (level<9) setShowUp(true);
    }
  }, [matched]);

  const flip = (id:number) => { if(flipped.length===2||flipped.includes(id)||matched.includes(id))return; setFlipped([...flipped,id]); };
  const cols = pairs<=4?4:pairs<=6?4:pairs<=8?4:5;

  if (!started) return (
    <div className="text-center py-8">
      <LevelHUD level={level}/>
      <Gamepad2 className="w-14 h-14 mx-auto mb-4 text-primary animate-pulse"/>
      <h3 className="text-xl font-display font-bold mb-1">Memory Match</h3>
      <p className="text-muted-foreground text-sm mb-6">{pairs} pairs · Fewer moves = higher score!</p>
      <Button onClick={()=>setStarted(true)} className="bg-primary text-primary-foreground neon-glow">START GAME</Button>
    </div>
  );

  if (ended) return (
    <>
      <AnimatePresence>{showUp&&<LevelUpFlash level={level+1} onDone={()=>{setShowUp(false);onLevelUp();}}/>}</AnimatePresence>
      <div className="text-center py-8">
        <LevelHUD level={level}/>
        <Trophy className="w-14 h-14 mx-auto mb-4 text-accent"/>
        <h3 className="text-2xl font-display font-bold mb-2">You Won!</h3>
        <p className="text-muted-foreground mb-3">Moves: {moves} · {pairs} pairs</p>
        <p className="text-4xl font-display font-bold text-primary neon-text">{Math.round(Math.max(0,(pairs*2-moves)*8)*getLevel(level).mult)}</p>
        <p className="text-muted-foreground text-sm mb-6">pts · {getLevel(level).mult}× multiplier</p>
        <Button onClick={initBoard}>PLAY AGAIN</Button>
      </div>
    </>
  );

  return (
    <div className="py-4">
      <LevelHUD level={level}/>
      <p className="text-center text-2xl font-display font-bold text-primary mb-5">Moves: {moves}</p>
      <div className="grid gap-2" style={{gridTemplateColumns:`repeat(${cols},minmax(0,1fr))`}}>
        {cards.map(c=>(
          <motion.button key={c.id} whileTap={{scale:0.92}} onClick={()=>flip(c.id)}
            className={`aspect-square rounded-lg font-display font-bold text-lg transition-all ${flipped.includes(c.id)||matched.includes(c.id)?"bg-primary text-primary-foreground":"bg-muted hover:bg-muted/80"}`}>
            {(flipped.includes(c.id)||matched.includes(c.id))?c.value:"?"}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// REACTION TEST
// ═══════════════════════════════════════════════════════════════════════════════
const TARGET_MS =    [600,550,500,450,400,350,300,250,200];
const ROUNDS_NEEDED = [1,  1,  2,  2,  3,  3,  4,  4,  5 ];

const ReactionTestGame = ({ level, onScore, onLevelUp }: { level:number; onScore:(s:number, result?:'win'|'loss'|'draw')=>void; onLevelUp:()=>void }) => {
  const target = TARGET_MS[level-1];
  const needed = ROUNDS_NEEDED[level-1];
  const def = getLevel(level);
  const [phase, setPhase] = useState<"idle"|"ready"|"go"|"result">("idle");
  const [rt, setRt] = useState(0);
  const [startT, setStartT] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [total, setTotal] = useState(0);
  const [passed, setPassed] = useState(false);
  const [showUp, setShowUp] = useState(false);

  const startRound = () => {
    setPhase("ready");
    const d = Math.random()*3000+1000;
    setTimeout(()=>{ setStartT(Date.now()); setPhase("go"); },d);
  };

  const handleClick = () => {
    if (phase==="go") {
      const t = Date.now()-startT;
      setRt(t); setPhase("result");
      const ok = t<=target;
      const score = Math.round(Math.max(0,600-t)*def.mult);
      onScore(score, ok ? "win" : "loss"); setTotal(s=>s+score);
      setPassed(ok);
      if (ok) {
        const newRounds = rounds+1;
        setRounds(newRounds);
        if (newRounds>=needed&&level<9) setShowUp(true);
      }
    } else if (phase==="ready") { setPhase("idle"); }
  };

  const done = rounds>=needed;

  if (phase==="idle") return (
    <div className="text-center py-8">
      <LevelHUD level={level}/>
      <Zap className="w-14 h-14 mx-auto mb-4 text-primary animate-pulse"/>
      <h3 className="text-xl font-display font-bold mb-1">Reaction Time</h3>
      <p className="text-muted-foreground text-sm mb-1">Target: &lt;{target}ms · {needed} round{needed>1?"s":""}</p>
      <p className="text-xs text-muted-foreground mb-6">Click when screen turns green!</p>
      <Button onClick={startRound} className="bg-primary text-primary-foreground neon-glow">START TEST</Button>
    </div>
  );

  if (phase==="result") return (
    <>
      <AnimatePresence>{showUp&&<LevelUpFlash level={level+1} onDone={()=>{setShowUp(false);onLevelUp();setPhase("idle");setRounds(0);setTotal(0);}}/>}</AnimatePresence>
      <div className="text-center py-8">
        <LevelHUD level={level}/>
        <p className="text-4xl mb-2">{passed?"✅":"💥"}</p>
        <h3 className={`text-xl font-display font-bold mb-2 ${passed?"text-emerald-400":"text-red-400"}`}>{passed?done?"Level Complete!":"Round Clear!":"Too Slow!"}</h3>
        <p className="text-5xl font-display font-bold text-primary neon-text mb-1">{rt}ms</p>
        <p className="text-muted-foreground text-sm mb-1">Target: &lt;{target}ms · Round {rounds}/{needed}</p>
        <p className="text-muted-foreground text-sm mb-6">Total: {total} pts</p>
        <Button onClick={()=>{ if(done||!passed){setPhase("idle");setRounds(0);setTotal(0);}else startRound(); }}>
          {!passed?"RETRY":done?"PLAY AGAIN":"NEXT ROUND"}
        </Button>
      </div>
    </>
  );

  return (
    <div className="py-8">
      <LevelHUD level={level}/>
      <p className="text-center text-sm text-muted-foreground mb-6">Round {rounds+1}/{needed} · Target &lt;{target}ms</p>
      <motion.button onClick={handleClick}
        className={`w-48 h-48 rounded-full font-display font-bold text-2xl transition-all mx-auto flex items-center justify-center ${phase==="ready"?"bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500":"bg-green-500/20 text-green-400 border-2 border-green-500 active:scale-90"}`}>
        {phase==="ready"?"WAIT...":"GO!"}
      </motion.button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIC-TAC-TOE (with smart AI by level)
// ═══════════════════════════════════════════════════════════════════════════════
const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const calcWinner = (sq:(string|null)[]) => { for(const[a,b,c]of WIN_LINES){if(sq[a]&&sq[a]===sq[b]&&sq[a]===sq[c])return sq[a];}return null; };

const minimax = (b:(string|null)[],depth:number,isMax:boolean):number => {
  const w=calcWinner(b); if(w==="O")return 10-depth; if(w==="X")return depth-10; if(!b.includes(null))return 0;
  const avail=b.map((v,i)=>v===null?i:-1).filter(v=>v!==-1);
  if(isMax){let best=-Infinity;for(const i of avail){const nb=[...b];nb[i]="O";best=Math.max(best,minimax(nb,depth+1,false));}return best;}
  else{let best=Infinity;for(const i of avail){const nb=[...b];nb[i]="X";best=Math.min(best,minimax(nb,depth+1,true));}return best;}
};

const aiMove = (board:(string|null)[],level:number):number => {
  const avail=board.map((v,i)=>v===null?i:-1).filter(v=>v!==-1) as number[];
  if(!avail.length)return -1;
  if(level<=3) return avail[Math.floor(Math.random()*avail.length)];
  if(level<=6){
    for(const i of avail){const b=[...board];b[i]="O";if(calcWinner(b)==="O")return i;}
    for(const i of avail){const b=[...board];b[i]="X";if(calcWinner(b)==="X")return i;}
    if(board[4]===null)return 4;
    return avail[Math.floor(Math.random()*avail.length)];
  }
  let best=-Infinity,move=avail[0];
  for(const i of avail){const nb=[...board];nb[i]="O";const v=minimax(nb,0,false);if(v>best){best=v;move=i;}}
  return move;
};

const TicTacToeGame = ({ level, onScore, onLevelUp }:{level:number;onScore:(s:number, r?:'win'|'loss'|'draw')=>void;onLevelUp:()=>void}) => {
  const [board, setBoard] = useState<(string|null)[]>(Array(9).fill(null));
  const [isX, setIsX] = useState(true);
  const [winner, setWinner] = useState<string|null>(null);
  const [started, setStarted] = useState(false);
  const [scored, setScored] = useState(false);
  const [showUp, setShowUp] = useState(false);
  const def = getLevel(level);
  const aiLabel = level<=3?"Random AI":level<=6?"Strategic AI":"Unbeatable AI";

  const click = (i:number) => {
    if(winner||board[i]||!isX)return;
    const next=[...board];next[i]="X";setBoard(next);
    const w=calcWinner(next);
    if(w){setWinner(w);if(!scored){setScored(true);const s=Math.round(50*def.mult);onScore(s, w==="X" ? "win" : "loss");if(w==="X"&&level<9)setShowUp(true);}}
    else if(!next.includes(null)){setWinner("Draw");if(!scored){setScored(true);onScore(Math.round(10*def.mult), "draw");}}
    else{setIsX(false);setTimeout(()=>{const m=aiMove(next,level);if(m===-1)return;const nb=[...next];nb[m]="O";setBoard(nb);const nw=calcWinner(nb);if(nw){setWinner(nw);if(!scored){setScored(true);onScore(5, "loss");}}else setIsX(true);},450);}
  };

  const reset = ()=>{setBoard(Array(9).fill(null));setIsX(true);setWinner(null);setScored(false);};

  if(!started) return (
    <div className="text-center py-8">
      <LevelHUD level={level}/>
      <Hash className="w-14 h-14 mx-auto mb-4 text-primary animate-pulse"/>
      <h3 className="text-xl font-display font-bold mb-1">Tic-Tac-Toe</h3>
      <p className="text-muted-foreground text-sm mb-1">AI: <span className={def.color}>{aiLabel}</span></p>
      <p className="text-xs text-muted-foreground mb-6">Win to advance to next level!</p>
      <Button onClick={()=>setStarted(true)} className="bg-primary text-primary-foreground neon-glow">START GAME</Button>
    </div>
  );

  return (
    <>
      <AnimatePresence>{showUp&&<LevelUpFlash level={level+1} onDone={()=>{setShowUp(false);onLevelUp();reset();}}/>}</AnimatePresence>
      <div className="text-center py-6">
        <LevelHUD level={level}/>
        <h3 className="text-xl font-display font-bold mb-5">
          {winner?(winner==="Draw"?"🤝 Draw!":`${winner==="X"?"🎉 You Win!":"🤖 AI Wins!"}`):(`Next: ${isX?"X (You)":"O (AI)"}`)}
        </h3>
        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-6">
          {board.map((val,i)=>(
            <motion.button key={i} whileTap={{scale:0.9}} onClick={()=>click(i)}
              className={`h-24 rounded-xl border-2 border-primary/20 bg-muted/30 font-display text-4xl font-bold flex items-center justify-center transition-all hover:bg-muted/50 ${val==="X"?"text-primary neon-text":"text-accent"}`}>
              {val}
            </motion.button>
          ))}
        </div>
        {(winner||!board.includes(null))&&<Button onClick={reset} className="bg-primary text-primary-foreground neon-glow">PLAY AGAIN</Button>}
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLICK FRENZY
// ═══════════════════════════════════════════════════════════════════════════════
const getTimeLimit  = (l:number) => Math.max(4,11-l);       // 10s→4s
const getTarget     = (l:number) => Math.round(15+l*5);     // clicks needed to pass

const ClickFrenzyGame = ({ level, onScore, onLevelUp }:{level:number;onScore:(s:number, r?:'win'|'loss'|'draw')=>void;onLevelUp:()=>void}) => {
  const timeLimit = getTimeLimit(level);
  const targetClicks = getTarget(level);
  const def = getLevel(level);
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [scored, setScored] = useState(false);
  const [showUp, setShowUp] = useState(false);

  useEffect(()=>{
    if(!started||ended)return;
    if(timeLeft<=0){
      setEnded(true);
      if(!scored){
        setScored(true);
        const s=Math.round(Math.min(clicks,targetClicks*1.5)*def.mult);
        onScore(s, clicks >= targetClicks ? "win" : "loss");
        if(clicks>=targetClicks&&level<9)setShowUp(true);
      }
      return;
    }
    const t=setTimeout(()=>setTimeLeft(p=>p-1),1000);
    return()=>clearTimeout(t);
  },[started,timeLeft,ended]);

  useEffect(()=>{
    if(!started||ended)return;
    const fn=(e:KeyboardEvent)=>{if(e.code==="Space"){e.preventDefault();setClicks(c=>c+1);}};
    window.addEventListener("keydown",fn);
    return()=>window.removeEventListener("keydown",fn);
  },[started,ended]);

  const restart=()=>{setClicks(0);setTimeLeft(timeLimit);setStarted(false);setEnded(false);setScored(false);};
  const progress=Math.min(100,(clicks/targetClicks)*100);

  if(!started) return (
    <div className="text-center py-8">
      <LevelHUD level={level}/>
      <MousePointer2 className="w-14 h-14 mx-auto mb-4 text-primary animate-pulse"/>
      <h3 className="text-xl font-display font-bold mb-1">Click Frenzy</h3>
      <p className="text-muted-foreground text-sm mb-1">{timeLimit}s · Target: {targetClicks} clicks to advance</p>
      <p className="text-xs text-muted-foreground mb-6">Click button or press Space!</p>
      <Button onClick={()=>setStarted(true)} className="bg-primary text-primary-foreground neon-glow">START GAME</Button>
    </div>
  );

  if(ended) return (
    <>
      <AnimatePresence>{showUp&&<LevelUpFlash level={level+1} onDone={()=>{setShowUp(false);onLevelUp();restart();}}/>}</AnimatePresence>
      <div className="text-center py-8">
        <LevelHUD level={level}/>
        <Trophy className="w-14 h-14 mx-auto mb-4 text-accent"/>
        <h3 className="text-2xl font-display font-bold mb-2">{clicks>=targetClicks?"🎉 Level Clear!":"Not Enough Clicks!"}</h3>
        <p className="text-5xl font-display font-bold text-primary neon-text mb-1">{clicks}</p>
        <p className="text-muted-foreground text-sm mb-1">clicks · needed {targetClicks}</p>
        <p className="text-muted-foreground text-sm mb-6">{Math.round(Math.min(clicks,targetClicks*1.5)*def.mult)} pts · {def.mult}× multiplier</p>
        <Button onClick={restart}>PLAY AGAIN</Button>
      </div>
    </>
  );

  return (
    <div className="text-center py-6">
      <LevelHUD level={level}/>
      <p className="text-5xl font-display font-bold text-accent mb-1">{timeLeft}s</p>
      <p className="text-2xl font-display font-bold text-primary mb-3">{clicks} <span className="text-base text-muted-foreground">/ {targetClicks}</span></p>
      <div className="w-full max-w-xs mx-auto bg-muted rounded-full h-2 mb-6 overflow-hidden">
        <motion.div className="h-2 rounded-full bg-primary" animate={{width:`${progress}%`}} transition={{ease:"easeOut",duration:0.2}}/>
      </div>
      <motion.button whileTap={{scale:0.95}} onClick={()=>setClicks(c=>c+1)}
        className="w-40 h-40 rounded-full gradient-primary text-primary-foreground font-display font-bold text-xl neon-glow active:scale-95 transition-transform mx-auto flex items-center justify-center">
        CLICK!
      </motion.button>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// GAMES PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const Games = () => {
  const [activeGame, setActiveGame] = useState<string|null>(null);
  const [dbGames, setDbGames]       = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gameLevels, setGameLevels] = useState<Record<string,number>>({});
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetch(`${BASE_URL}/user-progress`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("vapy_token")}` }
      })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const levels: Record<string, number> = {};
          d.forEach((item: any) => { levels[item.game_id] = item.level; });
          setGameLevels(levels);
        }
      }).catch(console.error);
    }
  }, [user]);

  const getGameLevel = (id:string) => gameLevels[id]||1;

  const handleLevelUp = (gameId:string) => {
    setGameLevels(prev => {
      const cur=prev[gameId]||1;
      if(cur>=9)return prev;
      const nextLevel = cur + 1;
      const next={...prev,[gameId]:nextLevel};
      if (user) {
        fetch(`${BASE_URL}/user-progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("vapy_token")}` },
          body: JSON.stringify({ game_id: gameId, level: nextLevel })
        }).catch(console.error);
      }
      return next;
    });
  };

  useEffect(()=>{
    fetch(`${BASE_URL}/games`).then(r=>r.json()).then(d=>setDbGames(Array.isArray(d)?d:[])).catch(console.error);
  },[]);

  const toggleFullscreen = () => {
    if(!document.fullscreenElement){gameContainerRef.current?.requestFullscreen();setIsFullscreen(true);}
    else{document.exitFullscreen().catch(()=>{});setIsFullscreen(false);}
  };
  useEffect(()=>{
    const fn=()=>setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange",fn);
    return()=>document.removeEventListener("fullscreenchange",fn);
  },[]);

  const handleScore = async (score:number, result: 'win'|'loss'|'draw'='win', gameId?:string) => {
    if(!user){toast({title:"Sign in to save scores!",variant:"destructive"});return;}
    
    const currentLevel = gameId ? getGameLevel(gameId) : 1;
    const difficultyStr = currentLevel <= 3 ? "easy" : (currentLevel <= 6 ? "medium" : "hard");
    const matchId = `match_${gameId || 'game'}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    try{
      const res=await fetch(`${BASE_URL}/add-points`,{
        method:"POST",
        headers:{"Content-Type":"application/json",Authorization:`Bearer ${localStorage.getItem("vapy_token")}`},
        body:JSON.stringify({ 
          result, 
          gameId,
          difficulty: difficultyStr,
          match_id: matchId
        })
      });
      if(res.ok){
        const data=await res.json();
        await refreshProfile();
        toast({title:`🎮 ${data.scoreAwarded > 0 ? '+' : ''}${data.scoreAwarded} points!`,description:`Level ${currentLevel} · Total: ${data.points} pts`});
      }
    }catch(e){console.error("Score failed",e);}
  };

  const allGames = [...BUILT_IN_GAMES,...dbGames];
  const filteredGames = allGames.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()) || (g.category && g.category.toLowerCase().includes(searchQuery.toLowerCase())));
  const activeGameData = BUILT_IN_GAMES.find(g=>g.id===activeGame);

  // ── Active game view ──────────────────────────────────────────────────────
  if (activeGame && PLAYABLE.includes(activeGame)) {
    const level = getGameLevel(activeGame);
    const onScore = (s: number, r?: 'win'|'loss'|'draw') => handleScore(s, r || 'win', activeGame);
    const onLevelUp = () => handleLevelUp(activeGame);

    const exitGame = () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setActiveGame(null);
    };

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={gameContainerRef} className="game-fullscreen-container w-full h-full relative">
        {/* Transparent Global Click Dismissal Helper - optionally */}
        
        {/* Dedicated Exit Fullscreen Button */}
        {isFullscreen && (
          <button 
            onClick={toggleFullscreen} 
            className="fixed top-8 right-8 z-[120] flex items-center gap-2 bg-black/60 hover:bg-primary/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/20 text-white font-display font-bold text-[10px] tracking-widest transition-all hover:border-primary hover:text-primary animate-in fade-in slide-in-from-top-4 duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)] group"
          >
            <Minimize2 className="w-4 h-4 group-hover:scale-110 transition-transform"/>
            EXIT FULLSCREEN
          </button>
        )}

        {/* Immersive Fullscreen Header Control (Floats on hover) */}
        <div className={
          isFullscreen 
            ? "fixed top-6 left-1/2 -translate-x-1/2 z-[110] flex gap-4 bg-black/80 backdrop-blur-xl px-6 py-3 rounded-full border border-white/10 opacity-0 hover:opacity-100 transition-all duration-500 shadow-2xl scale-90 hover:scale-100" 
            : "flex justify-between items-center mb-6 bg-card/40 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg"
        }>
          <button 
            onClick={exitGame} 
            className={`text-muted-foreground hover:text-primary transition-all font-display font-bold text-xs flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/10 group ${isFullscreen ? "bg-white/5" : ""}`}
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform"/> BACK
          </button>
          
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-display font-black px-4 py-2 rounded-full border shadow-sm ${getLevel(level).bg} ${getLevel(level).border} ${getLevel(level).color} hidden md:inline-block`}>
              {getLevel(level).emoji} {getLevel(level).name}
            </span>
            
            <div className={`flex items-center gap-2 rounded-xl p-1.5 ${isFullscreen ? "" : "bg-black/40 border border-white/5"}`}>
              <button 
                onClick={toggleFullscreen} 
                className="p-2.5 rounded-lg hover:bg-white/10 transition-all text-muted-foreground hover:text-primary relative group" 
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button 
                onClick={exitGame} 
                className="p-2.5 rounded-lg hover:bg-destructive/20 transition-all text-muted-foreground hover:text-destructive relative group" 
                title="Exit Game"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className={`transition-all duration-700 ease-in-out ${isFullscreen ? "p-0 bg-transparent w-full h-full flex items-center justify-center scale-110" : "glass rounded-3xl p-8 shadow-2xl relative overflow-hidden"}`}>
          {!isFullscreen && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />}
          
          <div className={isFullscreen ? "scale-90 sm:scale-100" : ""}>
            {activeGame === "click-frenzy"  && <ClickFrenzyGame  level={level} onScore={onScore} onLevelUp={onLevelUp}/>}
            {activeGame === "memory-match"  && <MemoryMatchGame  level={level} onScore={onScore} onLevelUp={onLevelUp}/>}
            {activeGame === "reaction-test" && <ReactionTestGame level={level} onScore={onScore} onLevelUp={onLevelUp}/>}
            {activeGame === "tic-tac-toe"   && <TicTacToeGame    level={level} onScore={onScore} onLevelUp={onLevelUp}/>}
            {activeGame === "go-car"         && <GoCarGame         level={level} onScore={onScore} onLevelUp={onLevelUp}/>}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Games grid ────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Gamepad2 className="w-7 h-7 text-primary"/>
          <h2 className="text-2xl font-display font-bold text-foreground">Games</h2>
          <span className="text-xs font-display bg-muted text-muted-foreground px-2 py-1 rounded">{filteredGames.length} available</span>
        </div>
        
        {/* Search bar replacing the levels strip */}
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-white/10 bg-black/20 focus:bg-background focus:ring-2 focus:ring-primary/50 transition-all font-body text-sm outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 gap-y-10 pt-4">
        {filteredGames.map(game=>{
          const isPlayable=PLAYABLE.includes(game.id);
          const lvl=getGameLevel(game.id);
          const lvDef=getLevel(lvl);
          return (
            <motion.div key={game._id||game.id}
              whileHover={{y:-6,scale:1.03}} whileTap={{scale:0.95}}
              className={`flex flex-col items-center group ${isPlayable?"cursor-pointer":"opacity-75 grayscale-[0.3]"}`}
              onClick={()=>isPlayable?setActiveGame(game.id):null}>
              {/* App Icon */}
              <div className="relative w-full aspect-square max-w-[150px] rounded-[2rem] p-[2px] bg-gradient-to-br from-white/20 via-white/5 to-transparent drop-shadow-xl shadow-black/50 overflow-hidden mb-4 group-hover:shadow-[0_0_25px_rgba(var(--primary),0.3)] transition-all duration-500">
                <div className="w-full h-full rounded-[1.8rem] overflow-hidden relative bg-card flex items-center justify-center">
                  {game.image_url
                    ? <img src={game.image_url} alt={game.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"/>
                    : <div className="h-full w-full gradient-primary flex items-center justify-center">
                        {game.id==="tic-tac-toe"   && <Hash         className="w-16 h-16 text-white/90 drop-shadow-md group-hover:scale-110 transition-transform duration-700"/>}
                        {game.id==="click-frenzy"  && <MousePointer2 className="w-16 h-16 text-white/90 drop-shadow-md group-hover:scale-110 transition-transform duration-700"/>}
                        {game.id==="reaction-test" && <Zap           className="w-16 h-16 text-white/90 drop-shadow-md group-hover:scale-110 transition-transform duration-700"/>}
                        {game.id==="go-car"         && <Car           className="w-16 h-16 text-white/90 drop-shadow-md group-hover:scale-110 transition-transform duration-700"/>}
                        {!["tic-tac-toe","click-frenzy","reaction-test","go-car"].includes(game.id) && <Gamepad2 className="w-16 h-16 text-white/90 drop-shadow-md group-hover:scale-110 transition-transform duration-700"/>}
                      </div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent opacity-40 pointer-events-none mix-blend-overlay"/>
                  <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-[1.8rem] pointer-events-none"/>
                  {/* Level indicator (replaces difficulty badge) */}
                  {isPlayable && (
                    <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end items-center pb-2 px-1 pointer-events-none">
                      <span className={`text-[9px] font-display font-bold uppercase tracking-wide ${lvDef.color}`}>{lvDef.emoji} Lv.{lvl} {lvDef.name}</span>
                    </div>
                  )}
                  {isPlayable && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(var(--primary),0.8)]">
                        <Play className="w-5 h-5 text-primary-foreground ml-1"/>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <h3 className="font-display font-medium text-foreground text-[15px] truncate w-full px-2 text-center tracking-wide group-hover:text-primary transition-colors">{game.title}</h3>
              <p className="text-[11px] text-muted-foreground font-body mt-0.5 uppercase tracking-widest text-center">{game.category}</p>
              {!isPlayable&&<span className="mt-2 text-[9px] uppercase tracking-widest bg-muted px-2 py-0.5 rounded-full text-muted-foreground border border-white/5">Soon</span>}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default Games;
