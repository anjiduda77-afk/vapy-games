import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal, Star, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const BASE_URL = "https://vapy-games.onrender.com";

interface PlayerRank {
  nickname: string;
  points: number;
  unique_id: string;
  avatar_url?: string | null;
  user_id?: string;
  role?: string;
}

const getTierLabel = (points: number) => {
  if (points >= 500) return { label: "Legend", color: "text-yellow-400", bg: "bg-yellow-400/10" };
  if (points >= 200) return { label: "Diamond", color: "text-cyan-400",  bg: "bg-cyan-400/10"  };
  if (points >= 100) return { label: "Gold",    color: "text-amber-400", bg: "bg-amber-400/10" };
  if (points >= 50)  return { label: "Silver",  color: "text-slate-300", bg: "bg-slate-400/10" };
  return               { label: "Bronze",  color: "text-orange-400", bg: "bg-orange-400/10"};
};

const Leaderboard = () => {
  const { profile } = useAuth();
  const [players, setPlayers] = useState<PlayerRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/leaderboard?limit=50`);
      if (res.ok) {
        const data = await res.json();
        setPlayers(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, []);

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown className="w-5 h-5 text-yellow-400" />;
    if (i === 1) return <Medal className="w-5 h-5 text-slate-300" />;
    if (i === 2) return <Medal className="w-5 h-5 text-orange-400" />;
    return <span className="w-5 text-center font-display font-bold text-muted-foreground text-sm">{i + 1}</span>;
  };

  const myRank = profile ? players.findIndex(p => p.unique_id === profile.unique_id) : -1;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trophy className="w-7 h-7 text-accent" />
          <h2 className="text-2xl font-display font-bold text-foreground">Leaderboard</h2>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-muted-foreground font-mono hidden sm:block">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
          <Button
            size="sm" variant="ghost"
            onClick={fetchLeaderboard}
            disabled={loading}
            className="text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* My Rank banner */}
      {myRank >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4 neon-border flex items-center gap-4"
        >
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            {getRankIcon(myRank)}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-body">Your Current Rank</p>
            <p className="font-display font-bold text-foreground">
              #{myRank + 1}
              <span className="text-primary ml-2">{players[myRank]?.points} pts</span>
            </p>
          </div>
          {(() => {
            const tier = getTierLabel(profile?.points || 0);
            return (
              <span className={`ml-auto text-xs font-display font-bold px-3 py-1 rounded-full ${tier.bg} ${tier.color}`}>
                {tier.label}
              </span>
            );
          })()}
        </motion.div>
      )}

      {/* Top 3 podium */}
      {!loading && players.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[players[1], players[0], players[2]].map((p, podiumIdx) => {
            const rank = podiumIdx === 0 ? 1 : podiumIdx === 1 ? 0 : 2;
            const heights = ["h-28", "h-36", "h-24"];
            const colors = ["text-slate-300", "text-yellow-400", "text-orange-400"];
            const glows  = ["shadow-slate-500/20", "shadow-yellow-500/30", "shadow-orange-500/20"];
            return (
              <motion.div
                key={p.unique_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: podiumIdx * 0.1 }}
                className={`glass rounded-xl p-3 flex flex-col items-center justify-end ${heights[podiumIdx]} shadow-lg ${glows[podiumIdx]}`}
              >
                <div className="w-10 h-10 rounded-full border-2 overflow-hidden bg-muted mb-2"
                  style={{ borderColor: podiumIdx === 1 ? "#facc15" : podiumIdx === 0 ? "#cbd5e1" : "#fb923c" }}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className={`w-full h-full flex items-center justify-center font-display font-bold text-sm ${colors[podiumIdx]}`}>
                        {p.nickname?.charAt(0)?.toUpperCase()}
                      </div>}
                </div>
                <p className={`font-display font-bold text-xs ${colors[podiumIdx]}`}>#{rank + 1}</p>
                <p className="font-body text-xs text-foreground font-semibold truncate w-full text-center">{p.nickname}</p>
                <p className={`font-display font-bold text-sm ${colors[podiumIdx]}`}>{p.points}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Full rankings table */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_80px_90px] px-4 py-3 border-b border-border text-xs font-display uppercase tracking-wider text-muted-foreground">
          <span>Rank</span>
          <span>Player</span>
          <span>Tier</span>
          <span className="text-right">Points</span>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && players.length === 0 && (
          <p className="text-center py-12 text-muted-foreground font-body">
            No players ranked yet. Start playing to earn points!
          </p>
        )}

        {!loading && players.map((player, i) => {
          const isMe = player.unique_id === profile?.unique_id;
          const tier = getTierLabel(player.points);
          return (
            <motion.div
              key={player.unique_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
              className={`grid grid-cols-[48px_1fr_80px_90px] px-4 py-3 items-center border-b border-border/40 last:border-0 transition-colors ${
                isMe
                  ? "bg-primary/10 border-l-2 border-l-primary"
                  : i < 3 ? "bg-muted/20" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex justify-center">{getRankIcon(i)}</div>

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-muted flex-shrink-0">
                  {player.avatar_url
                    ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center font-display font-bold text-xs text-primary">
                        {player.nickname?.charAt(0)?.toUpperCase()}
                      </div>}
                </div>
                <div className="min-w-0">
                  <p className={`font-body font-semibold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                    {player.nickname} {isMe && <span className="text-xs">(You)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{player.unique_id}</p>
                </div>
              </div>

              <span className={`text-xs font-display font-bold px-2 py-0.5 rounded ${tier.bg} ${tier.color}`}>
                {tier.label}
              </span>

              <p className="text-right font-display font-bold text-primary">{player.points}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Tier legend */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
          <Star className="w-3.5 h-3.5" /> Tier System
        </h4>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Bronze",  pts: "0+",   color: "text-orange-400", bg: "bg-orange-400/10" },
            { label: "Silver",  pts: "50+",  color: "text-slate-300",  bg: "bg-slate-400/10"  },
            { label: "Gold",    pts: "100+", color: "text-amber-400",  bg: "bg-amber-400/10"  },
            { label: "Diamond", pts: "200+", color: "text-cyan-400",   bg: "bg-cyan-400/10"   },
            { label: "Legend",  pts: "500+", color: "text-yellow-400", bg: "bg-yellow-400/10" },
          ].map(t => (
            <span key={t.label} className={`text-xs font-display font-bold px-3 py-1 rounded-full ${t.bg} ${t.color}`}>
              {t.label} · {t.pts} pts
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default Leaderboard;
