import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Gamepad2, Users, TrendingUp, Crown, Zap, WifiOff, ArrowRight, Play, Swords } from "lucide-react";
import { Link } from "react-router-dom";
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
        className="glass rounded-xl p-6"
      >
        <h2 className="text-2xl font-display font-bold text-foreground">
          Welcome back, <span className="text-primary neon-text">{profile?.nickname || "Player"}</span>
        </h2>
        <p className="text-muted-foreground mt-1 font-body text-lg">
          {role === "admin" ? "Manage your gaming empire from the admin panel." : "Ready to climb the ranks? Jump into a game!"}
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Your Points" value={profile?.points || 0} color="bg-accent/20 text-accent" />
        <StatCard icon={Users} label="Players" value={stats.totalPlayers} color="bg-primary/20 text-primary" />
        <StatCard icon={Gamepad2} label="Games" value={stats.totalGames} color="bg-secondary/20 text-secondary" />
        <StatCard icon={TrendingUp} label="Contests" value={stats.activeContests} color="bg-success/20 text-success" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Mini Leaderboard */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6 lg:col-span-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-accent" />
            <h3 className="font-display font-bold text-lg text-foreground">Top Players</h3>
          </div>
          {topPlayers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 font-body">No players ranked yet. Be the first!</p>
          ) : (
            <div className="space-y-3 flex-1">
              {topPlayers.map((player, i) => (
                <div key={player.unique_id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors glass-border bg-card/50">
                  <span className={`w-8 h-8 shadow-sm flex items-center justify-center rounded-full font-display font-bold text-sm ${i === 0 ? "bg-accent/20 text-accent" : i === 1 ? "bg-muted-foreground/20 text-muted-foreground" : i === 2 ? "bg-orange-500/20 text-orange-400" : "bg-muted text-muted-foreground"
                    }`}>
                    {i === 0 ? <Crown className="w-4 h-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body font-semibold text-foreground truncate">{player.nickname}</p>
                    <p className="text-xs text-muted-foreground font-mono">{player.unique_id}</p>
                  </div>
                  <span className="font-display font-bold text-primary flex-shrink-0">{player.points} pts</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Games & Contests */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {/* Featured Games */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-5 h-5 text-secondary" />
                <h3 className="font-display font-bold text-lg text-foreground">Featured Games</h3>
              </div>
              <Link to="/dashboard/games" className="text-xs text-primary hover:text-primary/80 font-display flex items-center gap-1 transition-colors">
                Play Now <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="space-y-3 flex-1 flex flex-col">
              <Link to="/dashboard/games" className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 flex items-center gap-4 hover:border-secondary/50 hover:shadow-[0_0_15px_rgba(var(--secondary),0.1)] transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-transparent flex items-center justify-center flex-shrink-0 border border-emerald-500/20 shadow-inner">
                   <Zap className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-display font-bold text-sm text-foreground">Reaction Test</h4>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">Reaction · <span className="text-emerald-400 font-bold">Hard</span></p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-background transition-colors">
                  <Play className="w-3.5 h-3.5 ml-0.5 text-emerald-500 group-hover:text-background" />
                </div>
              </Link>
              
              <Link to="/dashboard/games" className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-3 flex items-center gap-4 hover:border-accent/50 hover:shadow-[0_0_15px_rgba(var(--accent),0.1)] transition-all mt-auto">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500/20 to-transparent flex items-center justify-center flex-shrink-0 border border-yellow-500/20 shadow-inner">
                   <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-display font-bold text-sm text-foreground">Memory Match</h4>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">Puzzle · <span className="text-yellow-400 font-bold">Medium</span></p>
                </div>
                <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500 transition-colors">
                  <Play className="w-3.5 h-3.5 ml-0.5 text-yellow-500 group-hover:text-background" />
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Active Contests */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass rounded-xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-success" />
                <h3 className="font-display font-bold text-lg text-foreground">Contests</h3>
              </div>
              {stats.activeContests > 0 && (
                <span className="bg-success/20 text-success border border-success/30 px-2 py-0.5 rounded text-[10px] uppercase font-display font-bold animate-pulse">LIVE NOW</span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center p-5 border border-dashed border-border/40 rounded-xl bg-muted/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-success/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-muted to-muted/30 border border-white/5 flex items-center justify-center mb-3 shadow-lg relative z-10 transition-transform hover:scale-110 duration-500 cursor-default">
                <Swords className="w-7 h-7 text-muted-foreground/70" />
              </div>
              <h4 className="font-display font-bold text-[15px] text-foreground mb-1 relative z-10">Weekly Championship</h4>
              <p className="text-xs text-muted-foreground font-body max-w-[200px] leading-relaxed relative z-10">Next premium tournament starts this weekend. Prepare your skills!</p>
              
              <button disabled className="mt-4 relative z-10 text-[10px] font-display font-bold px-4 py-2 bg-background/50 border border-border/60 text-muted-foreground rounded-lg cursor-not-allowed uppercase tracking-wider backdrop-blur-sm shadow-sm">
                Registrations Open Soon
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardHome;
