import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, RefreshCcw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full bg-destructive/5 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center px-4"
      >
        {/* Glitchy 404 Number */}
        <motion.div
          animate={{ textShadow: ["0 0 10px hsl(var(--primary))", "0 0 40px hsl(var(--primary))", "0 0 10px hsl(var(--primary))"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-[140px] md:text-[200px] font-display font-black leading-none text-primary select-none"
        >
          404
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 mb-10"
        >
          <h1 className="text-3xl font-display font-bold text-foreground">Signal Lost</h1>
          <p className="text-muted-foreground font-body text-lg max-w-md mx-auto">
            The page you're looking for has disconnected from the network. Let's get you back.
          </p>
          <p className="text-xs font-mono text-muted-foreground/60 bg-muted/40 inline-block px-3 py-1 rounded-md">
            PATH: {location.pathname}
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold tracking-wider neon-glow hover:bg-primary/90 transition-all"
          >
            <Home className="w-4 h-4" /> GO HOME
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-muted text-muted-foreground font-display font-semibold tracking-wider hover:bg-muted/80 hover:text-foreground transition-all border border-border"
          >
            <RefreshCcw className="w-4 h-4" /> GO BACK
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
