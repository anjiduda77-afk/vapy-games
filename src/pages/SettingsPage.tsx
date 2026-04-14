import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Settings, Save, Camera, User, Trash2, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";

const BASE_URL = "https://vapy-games.onrender.com";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { profile, user, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.nickname) setNickname(profile.nickname);
    if (profile?.avatar_url) setAvatarPreview(profile.avatar_url);
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please choose an image under 2MB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setAvatarPreview(result);
      setAvatarBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    setAvatarBase64(null);
    setRemoveAvatarFlag(true); // signals backend to clear avatar_url
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const body: Record<string, string | null> = {};
      if (nickname.trim()) body.nickname = nickname.trim().slice(0, 50);

      if (removeAvatarFlag) {
        body.avatar_url = null; // explicitly clear avatar
      } else if (avatarBase64 !== null) {
        body.avatar_url = avatarBase64;
      }

      const res = await fetch(`${BASE_URL}/profiles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("vapy_token")}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast({ title: "Error", description: error || "Failed to update profile", variant: "destructive" });
      } else {
        await refreshProfile();
        setAvatarBase64(null);
        setRemoveAvatarFlag(false);
        toast({ title: "✅ Profile updated!", description: "Your changes were saved." });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Is the backend running?", variant: "destructive" });
    }
    setSaving(false);
  };

  const initials = profile?.nickname?.charAt(0)?.toUpperCase() || "P";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-muted-foreground" />
        <h2 className="text-2xl font-display font-bold text-foreground">Settings</h2>
      </div>

      {/* Avatar Section */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">
          Profile Picture (DP)
        </h3>

        <div className="flex items-center gap-6">
          {/* Avatar Preview */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-2 border-primary neon-border overflow-hidden bg-muted flex items-center justify-center">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-bold text-primary text-3xl">{initials}</span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 w-24 h-24 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
          </div>

          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="font-display border-primary/50 text-primary hover:bg-primary/10"
            >
              <Camera className="w-4 h-4 mr-2" />
              Upload Photo
            </Button>
            {avatarPreview && (
              <Button
                variant="ghost"
                size="sm"
                onClick={removeAvatar}
                className="font-display text-destructive hover:bg-destructive/10 block"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove Photo
              </Button>
            )}
            <p className="text-xs text-muted-foreground font-body">JPG, PNG, GIF — max 2MB</p>
          </div>
        </div>
      </div>

      {/* Profile Info */}
      <div className="glass rounded-xl p-6 space-y-4">
        <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider">
          Profile Info
        </h3>

        <div>
          <label className="text-sm font-display text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Nickname
          </label>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="mt-1 bg-muted font-body"
            placeholder="Enter your nickname"
            maxLength={30}
          />
        </div>

        <div>
          <label className="text-sm font-display text-muted-foreground uppercase tracking-wider">
            Unique ID
          </label>
          <p className="mt-1 font-mono text-foreground bg-muted px-3 py-2 rounded-md text-sm select-all">
            {profile?.unique_id || "—"}
          </p>
        </div>

        <div>
          <label className="text-sm font-display text-muted-foreground uppercase tracking-wider">
            Email
          </label>
          <p className="mt-1 font-body text-foreground bg-muted px-3 py-2 rounded-md text-sm">
            {user?.email || "—"}
          </p>
        </div>

        <div>
          <label className="text-sm font-display text-muted-foreground uppercase tracking-wider">
            Total Points
          </label>
          <p className="mt-1 font-display font-bold text-primary text-xl">
            {profile?.points || 0} pts
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-display bg-primary text-primary-foreground neon-glow w-full"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save Changes</>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default SettingsPage;
