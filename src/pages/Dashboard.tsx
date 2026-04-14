import { useState } from "react";
import { Outlet } from "react-router-dom";
import { motion } from "framer-motion";
import { MoreVertical, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardSidebar from "@/components/DashboardSidebar";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Top bar */}
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors">

              <MoreVertical className="w-5 h-5 text-foreground" />
            </motion.button>
            <h1 className="font-display font-bold text-lg tracking-wider">
              <span className="text-green-500">VAPY</span>
              <span className="text-foreground ml-1">GAMES</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Zap className="w-4 h-4 text-accent" />
            <span className="font-display font-semibold text-accent">{profile?.points || 0}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>);

};

export default Dashboard;