import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Users, Gamepad2, Trophy, Plus, Pencil, Trash2,
  X, Check, ChevronDown, Loader2, Star
} from "lucide-react";
import { useAuth, API_URL } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const DIFFICULTY_OPTS = [
  { value: "easy",   label: "Easy",   color: "bg-emerald-500/20 text-emerald-400",  pts: "1–2 pts" },
  { value: "medium", label: "Medium", color: "bg-yellow-500/20 text-yellow-400",    pts: "3–4 pts" },
  { value: "hard",   label: "Hard",   color: "bg-red-500/20 text-red-400",          pts: "5–6 pts" },
];

const CATEGORIES = ["arcade", "puzzle", "reflex", "board", "strategy", "shooter", "rpg", "uncategorized"];

const DiffBadge = ({ diff }: { diff: string }) => {
  const d = DIFFICULTY_OPTS.find(x => x.value === diff) || DIFFICULTY_OPTS[1];
  return (
    <span className={`text-xs font-display uppercase px-2 py-0.5 rounded ${d.color}`}>
      {d.label} · {d.pts}
    </span>
  );
};

const AdminPanel = () => {
  const { role, session } = useAuth();
  const { toast } = useToast();

  const [players, setPlayers]         = useState<any[]>([]);
  const [games, setGames]             = useState<any[]>([]);
  const [activeTab, setActiveTab]     = useState<"users" | "games">("users");
  const [loading, setLoading]         = useState(false);

  // Add game form
  const [newTitle, setNewTitle]       = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [newCat, setNewCat]           = useState("arcade");
  const [newDiff, setNewDiff]         = useState("medium");
  const [adding, setAdding]           = useState(false);

  // Edit game
  const [editId, setEditId]           = useState<string | null>(null);
  const [editTitle, setEditTitle]     = useState("");
  const [editDesc, setEditDesc]       = useState("");
  const [editCat, setEditCat]         = useState("arcade");
  const [editDiff, setEditDiff]       = useState("medium");

  const token = session?.access_token;

  const fetchData = async () => {
    if (role !== "admin") return;
    setLoading(true);
    const [pRes, gRes] = await Promise.all([
      fetch(`${API_URL}/profiles`),
      fetch(`${API_URL}/games`)
    ]);
    setPlayers(await pRes.json());
    setGames(await gRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [role]);

  if (role !== "admin") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-display font-bold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground font-body">Only admins can access the admin panel.</p>
      </div>
    );
  }

  // ── Add Game ──────────────────────────────────────────────
  const addGame = async () => {
    if (!newTitle.trim() || !token) return;
    setAdding(true);
    try {
      const res = await fetch(`${API_URL}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTitle, description: newDesc, category: newCat, difficulty: newDiff })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast({ title: "✅ Game added!" });
      setNewTitle(""); setNewDesc(""); setNewCat("arcade"); setNewDiff("medium");
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setAdding(false);
  };

  // ── Save Edit ─────────────────────────────────────────────
  const saveEdit = async (gameId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/games/${gameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, description: editDesc, category: editCat, difficulty: editDiff })
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast({ title: "✅ Game updated!" });
      setEditId(null);
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ── Delete Game ───────────────────────────────────────────
  const deleteGame = async (gameId: string, title: string) => {
    if (!token || !confirm(`Remove "${title}" from the platform?`)) return;
    try {
      const res = await fetch(`${API_URL}/games/${gameId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast({ title: "🗑️ Game removed" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  // ── Update Points ─────────────────────────────────────────
  const updatePoints = async (userId: string, points: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/profiles/${userId}/points`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ points })
      });
      if (!res.ok) throw new Error("Failed to update points");
      fetchData();
      toast({ title: "✅ Points updated!" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const toggleVerify = async (userId: string, current: boolean) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isVerified: !current })
      });
      if (!res.ok) throw new Error("Failed to update verification status");
      fetchData();
      toast({ title: !current ? "✅ User Verified!" : "⚠️ Verification Revoked" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const startEdit = (g: any) => {
    setEditId(g._id);
    setEditTitle(g.title);
    setEditDesc(g.description || "");
    setEditCat(g.category || "arcade");
    setEditDiff(g.difficulty || "medium");
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-7 h-7 text-secondary" />
        <h2 className="text-2xl font-display font-bold text-foreground">Admin Panel</h2>
        {loading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
      </div>

      {/* Stat chips */}
      <div className="flex gap-3 flex-wrap">
        <div className="glass rounded-lg px-4 py-2 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-primary">{players.length}</span>
          <span className="text-xs text-muted-foreground font-body">Players</span>
        </div>
        <div className="glass rounded-lg px-4 py-2 flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-secondary" />
          <span className="font-display font-bold text-secondary">{games.length}</span>
          <span className="text-xs text-muted-foreground font-body">Games</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([["users", Users, "Users"], ["games", Gamepad2, "Games"]] as const).map(([tab, Icon, label]) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            onClick={() => setActiveTab(tab)}
            className="font-display"
          >
            <Icon className="w-4 h-4 mr-2" /> {label}
          </Button>
        ))}
      </div>

      {/* ── Users Tab ── */}
      {activeTab === "users" && (
        <div className="glass rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_130px] px-4 py-3 border-b border-border text-xs font-display uppercase tracking-wider text-muted-foreground">
            <span>Player</span><span>Status</span><span>Points</span><span>Action</span>
          </div>
          {players.length === 0 && (
            <p className="text-center py-10 text-muted-foreground font-body">No players yet.</p>
          )}
          {players.map(p => {
            let inputRef: HTMLInputElement | null = null;
            return (
              <div key={p.user_id} className="grid grid-cols-[1fr_100px_100px_130px] px-4 py-3 items-center border-b border-border/50 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-primary/30 overflow-hidden bg-muted flex items-center justify-center text-xs font-display text-primary font-bold">
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      : p.nickname?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-body font-semibold text-foreground text-sm truncate max-w-[120px]">{p.nickname}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.email || p.unique_id}</p>
                  </div>
                </div>
                <div>
                   <button 
                     onClick={() => toggleVerify(p.user_id, !!p.isVerified)}
                     className={`px-2 py-0.5 rounded text-[10px] font-display uppercase transition-colors ${p.isVerified ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"}`}
                   >
                     {p.isVerified ? "Verified" : "Pending"}
                   </button>
                </div>
                <Input
                  type="number"
                  defaultValue={p.points}
                  className="w-16 h-8 text-sm bg-muted text-center"
                  ref={el => { inputRef = el; }}
                />
                <Button
                  size="sm" variant="ghost"
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

      {/* ── Games Tab ── */}
      {activeTab === "games" && (
        <div className="space-y-4">
          {/* Add Game Form */}
          <div className="glass rounded-xl p-5 space-y-3">
            <h3 className="font-display font-bold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> Add New Game
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Input placeholder="Game title *" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="bg-muted" />
              <Input placeholder="Description" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="bg-muted" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {/* Category select */}
              <div className="relative">
                <select
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-body text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {/* Difficulty select */}
              <div className="relative">
                <select
                  value={newDiff}
                  onChange={e => setNewDiff(e.target.value)}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-body text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {DIFFICULTY_OPTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label} ({d.pts})</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            <Button onClick={addGame} disabled={adding || !newTitle.trim()} className="font-display bg-primary text-primary-foreground neon-glow">
              {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Game
            </Button>
          </div>

          {/* Games List */}
          <div className="glass rounded-xl overflow-hidden">
            {games.length === 0 && (
              <p className="text-center py-10 text-muted-foreground font-body">No games yet. Add one above!</p>
            )}
            <AnimatePresence>
              {games.map(g => (
                <motion.div
                  key={g._id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="border-b border-border/40 last:border-0"
                >
                  {editId === g._id ? (
                    /* ── Edit row ── */
                    <div className="p-4 space-y-3 bg-muted/30">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-muted" placeholder="Title" />
                        <Input value={editDesc}  onChange={e => setEditDesc(e.target.value)}  className="bg-muted" placeholder="Description" />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="relative">
                          <select value={editCat} onChange={e => setEditCat(e.target.value)}
                            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-body text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary">
                            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                        <div className="relative">
                          <select value={editDiff} onChange={e => setEditDiff(e.target.value)}
                            className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-body text-foreground appearance-none focus:outline-none focus:ring-1 focus:ring-primary">
                            {DIFFICULTY_OPTS.map(d => <option key={d.value} value={d.value}>{d.label} ({d.pts})</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(g._id)} className="font-display bg-primary text-primary-foreground">
                          <Check className="w-3 h-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)} className="font-display">
                          <X className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display row ── */
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-body font-semibold text-foreground">{g.title}</p>
                        <p className="text-xs text-muted-foreground font-body truncate">{g.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-display uppercase bg-primary/20 text-primary px-2 py-0.5 rounded">
                            {g.category}
                          </span>
                          <DiffBadge diff={g.difficulty || "medium"} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(g)} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteGame(g._id, g.title)} className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Scoring guide */}
          <div className="glass rounded-xl p-4">
            <h4 className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1">
              <Star className="w-3.5 h-3.5" /> Scoring System
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_OPTS.map(d => (
                <div key={d.value} className={`rounded-lg p-3 text-center ${d.color.replace("text-", "border border-").replace("bg-", "bg-")}`}>
                  <p className="font-display font-bold text-sm">{d.label}</p>
                  <p className="font-display text-xl font-bold mt-1">{d.pts}</p>
                  <p className="text-xs opacity-70 font-body">per game</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AdminPanel;
