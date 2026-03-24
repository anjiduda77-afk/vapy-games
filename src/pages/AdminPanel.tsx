import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Users, Gamepad2, Trophy, Plus } from "lucide-react";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const AdminPanel = () => {
  const { role, session } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [newGameTitle, setNewGameTitle] = useState("");
  const [newGameDesc, setNewGameDesc] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "games">("users");

  useEffect(() => {
    if (role !== "developer") return;

    fetch(`${API_URL}/profiles`)
      .then(res => res.json())
      .then(data => setPlayers(data));

    fetch(`${API_URL}/games`)
      .then(res => res.json())
      .then(data => setGames(data));
  }, [role]);

  if (role !== "developer") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-display font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground font-body">Only developers can access the admin panel.</p>
      </div>
    );
  }

  const addGame = async () => {
    if (!newGameTitle.trim() || !session?.access_token) return;
    try {
      const res = await fetch(`${API_URL}/games`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ title: newGameTitle, description: newGameDesc })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add game");
      }
      toast({ title: "Game added!" });
      setNewGameTitle("");
      setNewGameDesc("");
      
      const gamesRes = await fetch(`${API_URL}/games`);
      const gamesData = await gamesRes.json();
      setGames(gamesData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updatePoints = async (userId: string, points: number) => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${API_URL}/admin/profiles/${userId}/points`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ points })
      });
      if (!res.ok) throw new Error("Failed to update points");

      const profilesRes = await fetch(`${API_URL}/profiles`);
      const profilesData = await profilesRes.json();
      setPlayers(profilesData);
      toast({ title: "Points updated!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-secondary" />
        <h2 className="text-2xl font-display font-bold text-foreground">Admin Panel</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === "users" ? "default" : "outline"}
          onClick={() => setActiveTab("users")}
          className="font-display"
        >
          <Users className="w-4 h-4 mr-2" /> Users
        </Button>
        <Button
          variant={activeTab === "games" ? "default" : "outline"}
          onClick={() => setActiveTab("games")}
          className="font-display"
        >
          <Gamepad2 className="w-4 h-4 mr-2" /> Games
        </Button>
      </div>

      {activeTab === "users" && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_120px] px-4 py-3 border-b border-border text-xs font-display uppercase tracking-wider text-muted-foreground">
            <span>Player</span>
            <span>Points</span>
            <span>Action</span>
          </div>
          {players.map(p => {
            let inputRef: HTMLInputElement | null = null;
            return (
              <div key={p._id || p.id} className="grid grid-cols-[1fr_100px_120px] px-4 py-3 items-center border-b border-border/50">
                <div>
                  <p className="font-body font-semibold text-foreground">{p.nickname}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.unique_id}</p>
                </div>
                <Input
                  type="number"
                  defaultValue={p.points}
                  className="w-20 h-8 text-sm bg-muted"
                  ref={el => { inputRef = el; }}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary font-display text-xs"
                  onClick={() => {
                    const val = parseInt(inputRef?.value || String(p.points));
                    if (!isNaN(val)) updatePoints(p.user_id, val);
                  }}
                >
                  <Trophy className="w-3 h-3 mr-1" /> Save
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "games" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="font-display font-bold text-foreground">Add New Game</h3>
            <Input placeholder="Game title" value={newGameTitle} onChange={e => setNewGameTitle(e.target.value)} className="bg-muted" />
            <Input placeholder="Description" value={newGameDesc} onChange={e => setNewGameDesc(e.target.value)} className="bg-muted" />
            <Button onClick={addGame} className="font-display bg-primary text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" /> Add Game
            </Button>
          </div>

          <div className="glass rounded-xl overflow-hidden">
            {games.map(g => (
              <div key={g._id || g.id} className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <div>
                  <p className="font-body font-semibold text-foreground">{g.title}</p>
                  <p className="text-xs text-muted-foreground font-body">{g.description}</p>
                </div>
                <span className="text-xs font-display uppercase bg-primary/20 text-primary px-2 py-1 rounded">{g.category}</span>
              </div>
            ))}
            {games.length === 0 && <p className="text-center py-8 text-muted-foreground font-body">No games yet.</p>}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminPanel;
