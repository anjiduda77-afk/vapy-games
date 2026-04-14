export const parseLevelData = (level: number) => {
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
  return LEVELS[Math.max(0, Math.min(level - 1, 8))];
};

import { useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";

export const LevelHUD = ({ level, def }: { level: number; def?: any }) => {
  const d = def || parseLevelData(level);
  const next = level < 9 ? parseLevelData(level + 1) : null;
  return (
    <motion.div key={level} initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border mb-5 ${d.bg} ${d.border} ${d.glow}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none">{d.emoji}</span>
        <div>
          <p className={`text-[11px] uppercase tracking-[0.1em] font-display font-bold ${d.color}`}>Level {level} · {d.name}</p>
          <p className="text-[10px] text-muted-foreground font-body">{d.mult}× score multiplier</p>
        </div>
      </div>
      {next
        ? <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><ChevronUp className="w-3 h-3"/>Win → {next.name}</span>
        : <span className="text-[10px] font-display text-rose-400 font-bold animate-pulse">MAX LEVEL</span>}
    </motion.div>
  );
};

export const LevelUpFlash = ({ level, onDone }: { level: number; onDone: () => void }) => {
  const def = parseLevelData(level);
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
