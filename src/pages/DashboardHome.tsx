import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Gamepad2, Users, TrendingUp, Crown, Zap, WifiOff } from "lucide-react";
import { useAuth, API_URL } from "@/contexts/AuthContext";

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass rounded-xl p-5 hover:neon-border transition-all"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground font-body uppercase tracking-wider">{label}</p>
      </div>
    </div>
  </motion.div>
);

const DashboardHome = () => {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState({ totalPlayers: 0, totalGames: 0, activeContests: 0 });
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/stats`);
        if (res.ok) {
          setBackendOnline(true);
          const data = await res.json();
          setStats({
            totalPlayers: data.totalPlayers,
            totalGames: data.totalGames,
            activeContests: data.activeContests
          });
          setTopPlayers(data.leaderboard);
        } else {
          setBackendOnline(false);
        }
      } catch (err) {
        setBackendOnline(false);
        console.error("Failed to fetch dashboard stats", err);
      }
    };
    fetchStats();
  }, []);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Backend offline warning */}
      {backendOnline === false && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
        >
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-display font-semibold text-sm">Backend Offline</p>
            <p className="text-xs opacity-80 font-body">Cannot reach the server at <span className="font-mono">{API_URL}</span>. Start the backend with <span className="font-mono">npm run dev</span> inside the <span className="font-mono">/backend</span> folder.</p>
          </div>
        </motion.div>
      )}

      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6 neon-border"
      >
        <h2 className="text-2xl font-display font-bold text-foreground">
          Welcome back, <span className="text-primary neon-text">{profile?.nickname || "Player"}</span>
        </h2>
        <p className="text-muted-foreground mt-1 font-body text-lg">
          {role === "developer" ? "Manage your gaming empire from the admin panel." : "Ready to climb the ranks? Jump into a game!"}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Your Points" value={profile?.points || 0} color="bg-accent/20 text-accent" />
        <StatCard icon={Users} label="Players" value={stats.totalPlayers} color="bg-primary/20 text-primary" />
        <StatCard icon={Gamepad2} label="Games" value={stats.totalGames} color="bg-secondary/20 text-secondary" />
        <StatCard icon={TrendingUp} label="Contests" value={stats.activeContests} color="bg-success/20 text-success" />
      </div>

      {/* Mini Leaderboard */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-accent" />
          <h3 className="font-display font-bold text-lg text-foreground">Top Players</h3>
        </div>
        {topPlayers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 font-body">No players ranked yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {topPlayers.map((player, i) => (
              <div key={player.unique_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <span className={`w-8 h-8 flex items-center justify-center rounded-full font-display font-bold text-sm ${
                  i === 0 ? "bg-accent/20 text-accent" : i === 1 ? "bg-muted-foreground/20 text-muted-foreground" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"
                }`}>
                  {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
                </span>
                <div className="flex-1">
                  <p className="font-body font-semibold text-foreground">{player.nickname}</p>
                  <p className="text-xs text-muted-foreground font-mono">{player.unique_id}</p>
                </div>
                <span className="font-display font-bold text-primary">{player.points} pts</span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default DashboardHome;
