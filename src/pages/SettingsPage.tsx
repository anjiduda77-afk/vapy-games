import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Save } from "lucide-react";
import { useAuth, API_URL } from "@/contexts/AuthContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.nickname) setNickname(profile.nickname);
  }, [profile]);

  const handleSave = async () => {
    if (!user || !nickname.trim()) return;
    setSaving(true);
    const res = await fetch(`${API_URL}/profiles`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("vapy_token")}`
      },
      body: JSON.stringify({ nickname: nickname.trim() })
    });
    
    if (!res.ok) {
      const { error } = await res.json();
      toast({ title: "Error", description: error || "Failed to update profile", variant: "destructive" });
    } else {
      await refreshProfile();
      toast({ title: "Profile updated!" });
    }
    setSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-muted-foreground" />
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
      </div>

      <div className="glass rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm font-display text-muted-foreground uppercase tracking-wider">Nickname</label>
          <Input value={nickname} onChange={e => setNickname(e.target.value)} className="mt-1 bg-muted" />
        </div>

        <div>
          <label className="text-sm font-display text-muted-foreground uppercase tracking-wider">User ID</label>
          <p className="mt-1 font-mono text-foreground bg-muted px-3 py-2 rounded-md text-sm">{profile?.unique_id}</p>
        </div>

        <div>
          <label className="text-sm font-display text-muted-foreground uppercase tracking-wider">Email</label>
          <p className="mt-1 font-body text-foreground bg-muted px-3 py-2 rounded-md text-sm">{user?.email}</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="font-display bg-primary text-primary-foreground neon-glow">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
