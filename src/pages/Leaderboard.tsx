import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Crown, Medal } from "lucide-react";
import { API_URL } from "@/contexts/AuthContext";


interface PlayerRank {
  nickname: string;
  points: number;
  unique_id: string;
}

const Leaderboard = () => {
  const [players, setPlayers] = useState<PlayerRank[]>([]);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/profiles`);
      if (res.ok) {
        const data = await res.json();
        // Take top 50
        setPlayers(data.slice(0, 50));
      }
    } catch (err) {
      console.error("Failed to fetch leaderboard", err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Polling as a simpler alternative to realtime sockets
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown className="w-6 h-6 text-accent" />;
    if (i === 1) return <Medal className="w-6 h-6 text-muted-foreground" />;
    if (i === 2) return <Medal className="w-6 h-6 text-orange-400" />;
    return <span className="w-6 text-center font-display font-bold text-muted-foreground">{i + 1}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-7 h-7 text-accent" />
        <h2 className="text-2xl font-display font-bold text-foreground">Leaderboard</h2>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px] px-4 py-3 border-b border-border text-xs font-display uppercase tracking-wider text-muted-foreground">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">Points</span>
        </div>

        {players.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground font-body">No players ranked yet.</p>
        ) : (
          players.map((player, i) => (
            <motion.div
              key={player.unique_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`grid grid-cols-[60px_1fr_100px] px-4 py-3.5 items-center transition-colors hover:bg-muted/50 ${i < 3 ? "bg-muted/30" : ""}`}
            >
              <div className="flex justify-center">{getRankIcon(i)}</div>
              <div>
                <p className="font-body font-semibold text-foreground">{player.nickname}</p>
                <p className="text-xs text-muted-foreground font-mono">{player.unique_id}</p>
              </div>
              <p className="text-right font-display font-bold text-primary">{player.points}</p>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default Leaderboard;
