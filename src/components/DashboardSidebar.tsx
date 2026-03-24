import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  User, Trophy, Gamepad2, Settings, LogOut, Sun, Moon, Shield,
  Home, X, Crown, MonitorPlay
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const DashboardSidebar = ({ isOpen, onClose }: DashboardSidebarProps) => {
  const { profile, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Dashboard", path: "/dashboard" },
    { icon: Trophy, label: "Leaderboard", path: "/dashboard/leaderboard" },
    { icon: Gamepad2, label: "Games", path: "/dashboard/games" },
    { icon: MonitorPlay, label: "Esports", path: "/dashboard/esports" },
    ...(role === "developer" ? [{ icon: Shield, label: "Admin Panel", path: "/dashboard/admin" }] : []),
    { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-sidebar border-r border-sidebar-border z-50 flex flex-col"
          >
            {/* Close */}
            <div className="flex justify-end p-4">
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile */}
            <div className="px-6 pb-6 border-b border-sidebar-border">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-primary neon-border">
                  <AvatarFallback className="bg-primary/20 text-primary font-display font-bold text-lg">
                    {profile?.nickname?.charAt(0)?.toUpperCase() || "P"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-bold text-foreground truncate">{profile?.nickname || "Player"}</h3>
                  <p className="text-xs text-muted-foreground font-mono">{profile?.unique_id}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Crown className="w-3.5 h-3.5 text-accent" />
                    <span className="text-sm font-bold text-accent">{profile?.points || 0} pts</span>
                  </div>
                </div>
              </div>
              {role && (
                <span className={`inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-full text-xs font-display font-semibold ${role === "developer" ? "bg-secondary/20 text-secondary" : "bg-primary/20 text-primary"}`}>
                  {role === "developer" ? <Shield className="w-3 h-3" /> : <Gamepad2 className="w-3 h-3" />}
                  {role.toUpperCase()}
                </span>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-body text-base font-medium ${location.pathname === item.path
                      ? "bg-primary/15 text-primary neon-border"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Bottom actions */}
            <div className="p-4 border-t border-sidebar-border space-y-3">
              {/* Theme toggle */}
              <div className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
                  {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span className="font-body">{theme === "dark" ? "Dark" : "Light"} Mode</span>
                </div>
                <Switch checked={theme === "light"} onCheckedChange={toggleTheme} />
              </div>

              <button
                onClick={() => { signOut(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-all font-body font-medium"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default DashboardSidebar;
