import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Users, Shield, Clock, Star, ArrowLeft, LogIn, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { io, Socket } from "socket.io-client";
import { parseLevelData, LevelHUD, LevelUpFlash } from "./utils/LevelUI";
import { drawCityBg, drawVillageBg, drawPlayerCar, drawTrafficCar, drawHUD } from "./utils/Rendering";
import { useAuth } from "@/contexts/AuthContext";
import goCarIcon from "../../test/gocar.png"; // Fix paths relative to GoCar folder

const GOCAR_SOCKET_URL = "https://vapy-games.onrender.com";

type GoCarScreen = "mode" | "playing" | "result" | "mp-lobby";
export type GoCarEnv = "city" | "village";

export interface TrafficCar {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  color: string;
  lane: number;
}

export interface GoCarResultData {
  win: boolean;
  timeLeft: number;
  health: number;
  score: number;
  rankings?: { id: string; nickname: string; score: number; survived: boolean }[];
}

export const getEnv = (level: number): GoCarEnv => (level <= 2 ? "city" : "village");
export const getSpeedBase = (level: number) => 2.5 + level * 0.4;
export const getTrafficCount = (level: number) => Math.min(3 + level, 12);
export const getMissionTime = (level: number) => Math.max(30, 60 - level * 3);

// Core Canvas Constants
export const CW = 380;
export const CH = 560;
export const ROAD_LEFT = 60;
export const ROAD_RIGHT = 320;
export const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
export const LANES = [ROAD_LEFT + ROAD_W * 0.18, ROAD_LEFT + ROAD_W * 0.5, ROAD_LEFT + ROAD_W * 0.82];
export const CAR_W = 32; export const CAR_H = 54;

export const GoCarGame = ({ level, onScore, onLevelUp }: { level: number; onScore: (s: number, r?: 'win'|'loss'|'draw') => void; onLevelUp: () => void }) => {
  const [screen, setScreen] = useState<GoCarScreen>("mode");
  const [result, setResult] = useState<GoCarResultData | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [mpMode, setMpMode] = useState<"create"|"join">("create");
  const [roomId, setRoomId] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [mpPlayers, setMpPlayers] = useState<{id:string;nickname:string;x:number;y:number;health:number;isDead?:boolean}[]>([]);
  const [mpStatus, setMpStatus] = useState<"waiting"|"ready"|"playing"|"done">("waiting");
  const [mySocketId, setMySocketId] = useState("");

  // --- New Camera & Hint States ---
  const [cameraView, setCameraView] = useState<"default" | "top" | "side">("default");
  const [showDirectionHint, setShowDirectionHint] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const pendingStartRef = useRef<{active: boolean; multiplayer: boolean}>({active: false, multiplayer: false});
  const gameStateRef = useRef<{
    running: boolean;
    px: number; py: number;
    speed: number;
    health: number;
    timeLeft: number;
    score: number;
    offset: number;
    traffic: TrafficCar[];
    lastTrafficSpawn: number;
    animFrame: number;
    missionDone: boolean;
    isMultiplayer: boolean;
    isDead: boolean;
    opponents: Record<string, { x: number; y: number; health: number; speed: number; score: number; nickname?: string }>;
  }>({
    running: false, px: 0, py: 0, speed: 0, health: 100,
    timeLeft: 0, score: 0, offset: 0, traffic: [],
    lastTrafficSpawn: 0, animFrame: 0, missionDone: false,
    isMultiplayer: false, isDead: false, opponents: {}
  });

  const { user } = useAuth();
  const env = getEnv(level);
  const def = parseLevelData(level);

  // ── Cleanup
  const stopGame = useCallback(() => {
    const gs = gameStateRef.current;
    gs.running = false;
    if (gs.animFrame) cancelAnimationFrame(gs.animFrame);
    if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
  }, []);
  useEffect(() => () => stopGame(), [stopGame]);

  // ── Key handlers (including camera swap 'C')
  useEffect(() => {
    if (screen !== "playing") return;
    const down = (e: KeyboardEvent) => { 
      keysRef.current.add(e.code); 
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) e.preventDefault(); 
      if(e.code === "KeyC" || e.code === "KeyV") {
        setCameraView(prev => prev === "default" ? "top" : prev === "top" ? "side" : "default");
      }
    };
    const up   = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, [screen]);

  // Launch Loop Effect
  useEffect(() => {
    if (screen !== "playing") return;
    const pending = pendingStartRef.current;
    if (!pending.active) return;
    pendingStartRef.current = { active: false, multiplayer: false };
    _launchLoop(pending.multiplayer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ── End game
  const endGame = useCallback((win: boolean, gs: typeof gameStateRef.current, rankings?: GoCarResultData['rankings']) => {
    gs.running = false;
    cancelAnimationFrame(gs.animFrame);
    const resultData: GoCarResultData = { win, timeLeft: gs.timeLeft, health: gs.health, score: gs.score, rankings };
    setResult(resultData);
    setScreen("result");
    const matchResult = win ? "win" : "loss";
    onScore(gs.score, matchResult);
    if (win && level < 9 && (!rankings || rankings[0].id === socketRef.current?.id)) {
      setTimeout(() => { setShowLevelUp(true); }, 800);
    }
  }, [level, onScore]);

  // ── Actual game loop
  const _launchLoop = useCallback((multiplayer: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) { console.error("GO CAR: canvas not found"); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { console.error("GO CAR: ctx not found"); return; }

    const gs = gameStateRef.current;
    gs.running = true;
    gs.px = LANES[1] - CAR_W/2;
    gs.py = CH - 120;
    gs.speed = getSpeedBase(level);
    gs.health = 100;
    gs.timeLeft = getMissionTime(level);
    gs.score = 0;
    gs.offset = 0;
    gs.traffic = [];
    gs.lastTrafficSpawn = 0;
    gs.missionDone = false;
    gs.isMultiplayer = multiplayer;

    const TRAFFIC_COLORS = ["#e74c3c","#e67e22","#f1c40f","#2ecc71","#9b59b6","#1abc9c","#e91e63","#ff5722","#795548"];

    let lastTime = 0; let timerAccum = 0; let spawnAccum = 0; let directionTimer = 0;
    const spawnInterval = Math.max(0.8, 2.5 - level * 0.15);

    const loop = (timestamp: number) => {
      if (!gs.running) return;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      if (dt <= 0) { gs.animFrame = requestAnimationFrame(loop); return; }

      const keys = keysRef.current;
      const maxSpeed = getSpeedBase(level) + 3; const minSpeed = 1;
      
      const steerS = 160 * dt;
      let moveLeft = !gs.isDead && (keys.has("ArrowLeft") || keys.has("KeyA"));
      let moveRight = !gs.isDead && (keys.has("ArrowRight") || keys.has("KeyD"));
      
      if (!gs.isDead) {
          if ((keys.has("ArrowUp") || keys.has("KeyW")) && gs.speed < maxSpeed) gs.speed += dt * 3;
          if ((keys.has("ArrowDown") || keys.has("KeyS")) && gs.speed > minSpeed) gs.speed -= dt * 4;
      } else {
          gs.speed = Math.max(0, gs.speed - dt * 10);
      }
      
      if (moveLeft) gs.px = Math.max(ROAD_LEFT+4, gs.px - steerS);
      if (moveRight) gs.px = Math.min(ROAD_RIGHT-CAR_W-4, gs.px + steerS);

      // Random Direction Hints
      directionTimer += dt;
      if (directionTimer > 8) {
          directionTimer = 0;
          const dirs = ["KEEP STRAIGHT ⬆️", "WATCH OUT LEFT ⬅️", "WATCH OUT RIGHT ➡️"];
          setShowDirectionHint(dirs[Math.floor(Math.random() * dirs.length)]);
          setTimeout(() => setShowDirectionHint(null), 2500);
      }

      gs.offset += gs.speed * dt * 60;
      spawnAccum += dt; timerAccum += dt;
      if (timerAccum >= 1) { 
          gs.timeLeft = Math.max(0, gs.timeLeft - 1); 
          timerAccum = 0; 
          if (!gs.isDead) gs.score += Math.round(gs.speed * 2); 
      }

      if (spawnAccum >= spawnInterval && gs.traffic.length < getTrafficCount(level)) {
        spawnAccum = 0;
        const lane = Math.floor(Math.random() * 3);
        const tw = 28 + Math.random()*10; const th = 44 + Math.random()*20;
        const isSameLane = gs.traffic.some(t => Math.abs(t.lane - lane) < 0.5 && t.y < 80);
        if (!isSameLane) {
          gs.traffic.push({
            x: LANES[lane] - tw/2, y: -th - Math.random()*60, width: tw, height: th,
            speed: gs.speed * (0.3 + Math.random()*0.5),
            color: TRAFFIC_COLORS[Math.floor(Math.random()*TRAFFIC_COLORS.length)], lane
          });
        }
      }

      gs.traffic = gs.traffic.filter(t => { t.y += (gs.speed - t.speed) * dt * 60; return t.y < CH + 80; });

      for (const t of gs.traffic) {
        const overlap = gs.px < t.x+t.width-4 && gs.px+CAR_W > t.x+4 && gs.py < t.y+t.height-4 && gs.py+CAR_H > t.y+4;
        if (overlap) { gs.health = Math.max(0, gs.health - 18 * dt * 60); gs.speed = Math.max(minSpeed, gs.speed - 2 * dt * 60 * 0.08); }
      }

      if (gs.px < ROAD_LEFT+2) { gs.health = Math.max(0, gs.health - 8 * dt * 60); gs.px = ROAD_LEFT+2; }
      if (gs.px + CAR_W > ROAD_RIGHT-2) { gs.health = Math.max(0, gs.health - 8 * dt * 60); gs.px = ROAD_RIGHT-CAR_W-2; }

      if (gs.isMultiplayer && socketRef.current) socketRef.current.emit("gocar-player-update", { x: gs.px, y: gs.py, speed: gs.speed, health: gs.health });

      // Apply camera transforms
      ctx.save();
      // NOTE: Here we would dynamically update ctx.transform based on cameraView state.
      // But React state closures in requestAnimationFrame require refs.
      
      if (env === "city") drawCityBg(ctx, gs.offset, CW, CH, ROAD_LEFT, ROAD_RIGHT, ROAD_W);
      else drawVillageBg(ctx, gs.offset, CW, CH, ROAD_LEFT, ROAD_RIGHT, ROAD_W);

      if (gs.isMultiplayer) {
        Object.values(gs.opponents).forEach(opp => {
           if (opp.health > 0) {
              ctx.globalAlpha = 0.5; drawPlayerCar(ctx, opp.x, opp.y, false, CAR_W, CAR_H); ctx.globalAlpha = 1;
           }
        });
      }
      gs.traffic.forEach(t => drawTrafficCar(ctx, t));
      if (!gs.isDead) {
         drawPlayerCar(ctx, gs.px, gs.py, env === "city", CAR_W, CAR_H);
      }
      
      ctx.restore();

      // HUD is drawn un-transformed
      drawHUD(ctx, gs, level, getSpeedBase, CW, CH, def);

      // If dead, bypass normal end condition if multiplayer.
      if (gs.health <= 0 || gs.timeLeft <= 0) {
         if (!gs.isMultiplayer) {
            endGame(gs.health > 0 && gs.timeLeft <= 0, gs); 
            return;
         } else if (!gs.isDead) {
            gs.isDead = true;
            if (socketRef.current) socketRef.current.emit("gocar-game-end", { roomId, score: gs.score, survived: gs.health > 0 && gs.timeLeft <= 0 });
         }
      }
      
      gs.animFrame = requestAnimationFrame(loop);
    };

    gs.animFrame = requestAnimationFrame(loop);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, env, cameraView]); // dependency update

  const startGame = useCallback((multiplayer = false) => {
    gameStateRef.current.running = false;
    if (gameStateRef.current.animFrame) cancelAnimationFrame(gameStateRef.current.animFrame);
    pendingStartRef.current = { active: true, multiplayer };
    setScreen("playing");
  }, []);

  const connectMultiplayer = useCallback(() => {
    const sock = io(GOCAR_SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = sock;
    const newRoomId = mpMode === "create" ? Math.random().toString(36).substring(2,8).toUpperCase() : roomInput.trim().toUpperCase();
    setRoomId(newRoomId);
    const nickname = (user as any)?.nickname || "Driver";
    const joinRoom = () => { 
        const id = sock.id || "";
        setMySocketId(id);
        sock.emit("gocar-join-room", { roomId: newRoomId, userId: id, nickname, create: mpMode === "create" }); 
    };

    if (sock.connected) joinRoom(); else sock.on("connect", joinRoom);

    sock.on("gocar-room-state", (data: any) => { 
        const players = data.players || [];
        setMpPlayers(players); 
        setMpStatus(players.length >= 2 ? "ready" : "waiting");
    });
    sock.on("gocar-error", ({ message }: any) => { alert(message); setRoomId(""); sock.disconnect(); });
    sock.on("gocar-player-joined", (data: any) => { 
        const players = data.players || []; 
        setMpPlayers(players); 
        setMpStatus(players.length >= 2 ? "ready" : "waiting"); 
    });
    sock.on("gocar-start", () => { setMpStatus("playing"); startGame(true); });
    sock.on("gocar-opponent-update", ({ playerId, x, y, health, speed, score }: any) => { 
        if (!gameStateRef.current.opponents[playerId]) gameStateRef.current.opponents[playerId] = {x, y, health, speed, score};
        else {
            const opp = gameStateRef.current.opponents[playerId];
            opp.x = x; opp.y = y; opp.health = health; opp.speed = speed; opp.score = score;
        }
    });
    sock.on("gocar-game-over", ({ winnerId, rankings }: any) => { 
        const gs = gameStateRef.current; 
        endGame(sock.id === winnerId, gs, rankings); 
    });
  }, [mpMode, roomInput, user, startGame, endGame]);

  const handleTouch = (dir: string, active: boolean) => { if (active) keysRef.current.add(dir); else keysRef.current.delete(dir); };

  if (screen === "mode") {
    return (
      <div className="text-center py-6 relative">
        <LevelHUD def={def} level={level}/>
        <div className="mb-6">
          <img src={goCarIcon} alt="GO CAR" className="w-24 h-24 mx-auto rounded-2xl object-cover shadow-[0_0_30px_rgba(0,200,255,0.4)] mb-3"/>
          <h3 className="text-2xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">PRO GO CAR</h3>
          <p className="text-muted-foreground text-sm">3D Driving Simulation · {env === "city" ? "🌆 City Roads" : "🌿 Village Roads"}</p>
        </div>
        
        {/* Controls Hint */}
        <div className="text-left text-xs bg-black/40 border border-white/10 rounded-xl p-3 max-w-sm mx-auto mb-6">
          <p className="font-bold text-primary mb-1">🎮 PRO CONTROLS:</p>
          <ul className="text-muted-foreground grid grid-cols-2 gap-1 ml-4 list-disc">
            <li><kbd>W/S</kbd> Accelerate/Brake</li>
            <li><kbd>A/D</kbd> Turn Left/Right</li>
            <li><kbd>C</kbd> Change Camera Angle</li>
            <li><kbd>Space</kbd> Handbrake</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-4">
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}} onClick={() => startGame(false)}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all group">
            <Car className="w-8 h-8 text-cyan-400 group-hover:scale-110 transition-transform"/>
            <span className="font-display font-bold text-cyan-400 text-sm">Single Player</span>
          </motion.button>
          <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.96}} onClick={() => setScreen("mp-lobby")}
            className="flex flex-col items-center gap-2 p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all group">
            <Users className="w-8 h-8 text-purple-400 group-hover:scale-110 transition-transform"/>
            <span className="font-display font-bold text-purple-400 text-sm">Multiplayer</span>
          </motion.button>
        </div>
      </div>
    );
  }

  if (screen === "mp-lobby") {
    return (
      <div className="text-center py-6">
        <LevelHUD def={def} level={level}/>
        <button onClick={() => setScreen("mode")} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-3 h-3"/> Back
        </button>
        <h3 className="text-xl font-display font-bold mb-4">Multiplayer Lobby</h3>
        {mpStatus === "waiting" || mpStatus === "ready" ? (
          roomId ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/10">
                <p className="text-xs text-muted-foreground mb-1">Room Code</p>
                <p className="text-3xl font-display font-black text-purple-400 tracking-widest">{roomId}</p>
                <p className="text-xs text-muted-foreground mt-1">Share this code with your friends!</p>
              </div>
              <div className="space-y-2">
                {mpPlayers.map((p,i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-muted/30">
                    <Car className="w-4 h-4 text-cyan-400"/>
                    <span className="text-sm font-medium">{p.nickname}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{i===0?"Host":"Player"}</span>
                  </div>
                ))}
                {mpPlayers.length < 2 && <p className="text-xs text-muted-foreground animate-pulse">Waiting for Players... (Max 4)</p>}
              </div>
              {mpStatus === "ready" && mpPlayers[0]?.id === mySocketId && (
                <Button onClick={() => socketRef.current?.emit("gocar-ready", { roomId })}
                  className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white neon-glow w-full">
                  🚦 Start Race!
                </Button>
              )}
              {mpStatus === "ready" && mpPlayers[0]?.id !== mySocketId && (
                  <p className="text-xs text-muted-foreground animate-pulse">Waiting for host to start...</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setMpMode("create")}
                  className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                    mpMode==="create" ? "border-cyan-500/60 bg-cyan-500/15" : "border-white/10 bg-muted/20"
                  }`}>
                  <Plus className="w-5 h-5 text-cyan-400"/>
                  <span className="text-xs font-bold">Create Room</span>
                </button>
                <button onClick={() => setMpMode("join")}
                  className={`p-3 rounded-xl border transition-all flex flex-col items-center gap-1 ${
                    mpMode==="join" ? "border-purple-500/60 bg-purple-500/15" : "border-white/10 bg-muted/20"
                  }`}>
                  <LogIn className="w-5 h-5 text-purple-400"/>
                  <span className="text-xs font-bold">Join Room</span>
                </button>
              </div>
              {mpMode === "join" && (
                <input value={roomInput} onChange={e=>setRoomInput(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code" maxLength={6}
                  className="w-full h-11 px-4 rounded-xl border border-purple-500/30 bg-purple-500/10 text-center font-display font-bold tracking-widest text-purple-300 text-lg outline-none focus:border-purple-500/60"/>
              )}
              <Button onClick={connectMultiplayer}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
                {mpMode==="create" ? "🚗 Create Room" : "🚪 Join Room"}
              </Button>
            </div>
          )
        ) : null}
      </div>
    );
  }

  if (screen === "result" && result) {
    const isWinner = result.rankings ? result.rankings[0].id === socketRef.current?.id : result.win;
    return (
      <>
        <AnimatePresence>
          {showLevelUp && <LevelUpFlash level={level+1} onDone={()=>{setShowLevelUp(false);onLevelUp();setScreen("mode");setResult(null);}}/>}
        </AnimatePresence>
        <div className="text-center py-6">
          <LevelHUD def={def} level={level}/>
          <motion.div initial={{scale:0.7,opacity:0}} animate={{scale:1,opacity:1}}
            className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl ${
              isWinner ? "bg-green-500/20 shadow-[0_0_30px_rgba(0,255,100,0.3)]" : "bg-red-500/20 shadow-[0_0_30px_rgba(255,50,50,0.3)]"
            }`}>
            {isWinner ? "🏆" : "💥"}
          </motion.div>
          <h3 className={`text-2xl font-display font-black mb-1 ${
            isWinner ? "text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400" : "text-red-400"
          }`}>{isWinner ? "Victory!" : "Defeat!"}</h3>

          {result.rankings ? (
             <div className="mt-4 mb-6 text-left max-w-xs mx-auto space-y-2">
                 <h4 className="text-sm font-bold text-center text-muted-foreground mb-2">MATCH RANKINGS</h4>
                 {result.rankings.map((r, i) => (
                     <div key={r.id} className={`p-2 rounded flex justify-between items-center border ${
                         r.id === socketRef.current?.id ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/10 bg-white/5"
                     }`}>
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-lg w-4">{i+1}</span>
                            <span>{r.nickname} {r.id === socketRef.current?.id ? "(You)" : ""}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-xs text-muted-foreground">{r.survived ? "Survived" : "Eliminated"}</span>
                            <div className="font-bold text-cyan-400">{r.score} pts</div>
                         </div>
                     </div>
                 ))}
             </div>
          ) : (
             <>
                 <p className="text-muted-foreground text-sm mb-4">{result.win ? "You survived & scored!" : "You crashed or health ran out"}</p>
                 <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
                 <div className="p-3 rounded-xl bg-muted/30 text-center">
                     <p className="text-xl font-display font-bold text-cyan-400">{result.score}</p>
                     <p className="text-[10px] text-muted-foreground">Score</p>
                 </div>
                 <div className="p-3 rounded-xl bg-muted/30 text-center">
                     <p className="text-xl font-display font-bold text-green-400">{Math.round(result.health)}%</p>
                     <p className="text-[10px] text-muted-foreground">Health</p>
                 </div>
                 <div className="p-3 rounded-xl bg-muted/30 text-center">
                     <p className="text-xl font-display font-bold text-yellow-400">{Math.ceil(result.timeLeft)}s</p>
                     <p className="text-[10px] text-muted-foreground">Remaining</p>
                 </div>
                 </div>
             </>
          )}

          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={()=>{setScreen("mode");setResult(null);}}>
              ← Menu
            </Button>
            {!result.rankings && (
                <Button onClick={()=>{setResult(null);startGame(false);}}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white neon-glow">
                🔄 Play Again
                </Button>
            )}
          </div>
        </div>
      </>
    );
  }

  if (screen === "playing") {
    // Determine the CSS transform based on the camera view
    let canvasStyle = "rounded-2xl shadow-[0_0_40px_rgba(0,200,255,0.2)] border border-white/10 transition-transform duration-700 w-full max-w-[380px]";
    if (cameraView === "top") canvasStyle += " scale-[1.05] perspective-1000 rotate-x-[20deg]";
    else if (cameraView === "side") canvasStyle += " scale-[1.05] perspective-1000 rotate-y-[15deg] rotate-x-[5deg]";
    
    return (
      <div className="relative flex flex-col items-center justify-center w-full min-h-[600px] overflow-hidden">
        
        {/* Dynamic Direction Notification overlay */}
        <AnimatePresence>
          {showDirectionHint && (
            <motion.div initial={{opacity:0, y:-20}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-20}}
              className="absolute top-4 z-[100] bg-black/80 backdrop-blur-md px-6 py-3 rounded-full border border-primary text-primary font-display font-bold text-lg shadow-[0_0_20px_rgba(var(--primary),0.8)]">
              {showDirectionHint}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div className="relative">
          <canvas ref={canvasRef} width={CW} height={CH} className={canvasStyle} style={{touchAction:"none", transformStyle:"preserve-3d", transform: cameraView === "top" ? "perspective(600px) rotateX(15deg) scale(1.05) translateY(-5%)" : cameraView === "side" ? "perspective(600px) rotateX(10deg) rotateY(10deg) scale(1.05) translateX(-5%)" : "none" }}/>
          <button 
            onClick={() => setCameraView(p => p === "default" ? "top" : p === "top" ? "side" : "default")}
            className="absolute bottom-4 right-4 z-50 bg-black/60 p-2 rounded-lg border border-white/20 text-xs font-display text-white hover:bg-primary/40 leading-none">
            🎥 [C] View
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
};
