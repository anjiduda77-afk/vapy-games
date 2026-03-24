import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gamepad2, Shield, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
type AppRole = "player" | "developer";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("player");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signIn, signUp, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Navigate to dashboard as soon as the session is ready
  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate confirm password on signup
    if (!isLogin && password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        // Navigation handled by useEffect watching session
      } else {
        await signUp(email, password, nickname || "Player", selectedRole);
        toast({ title: "Account created!", description: "Redirecting to your dashboard..." });
        // Navigation handled by useEffect watching session
      }
    } catch (err: any) {
      const msg = err.message?.toLowerCase().includes("failed to fetch")
        ? "Cannot connect to the server. Please ensure the backend is running."
        : err.message;
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.h1
            className="text-4xl font-display font-bold tracking-wider neon-text"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <span className="text-green-500">VAPY</span>
            <span className="text-foreground ml-2">GAMES</span>
          </motion.h1>
          <p className="text-muted-foreground mt-2 text-lg font-body">The Ultimate Gaming Platform</p>
        </div>

        {/* Auth Card */}
        <div className="glass rounded-xl p-8 neon-border">
          {/* Toggle */}
          <div className="flex mb-6 rounded-lg bg-muted p-1">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-md text-sm font-display font-semibold tracking-wide transition-all ${isLogin ? "bg-primary text-primary-foreground neon-glow" : "text-muted-foreground hover:text-foreground"}`}
            >
              SIGN IN
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-md text-sm font-display font-semibold tracking-wide transition-all ${!isLogin ? "bg-primary text-primary-foreground neon-glow" : "text-muted-foreground hover:text-foreground"}`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Nickname */}
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Nickname"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      className="pl-10 bg-muted border-border focus:border-primary"
                    />
                  </div>

                  {/* Role Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("player")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${selectedRole === "player" ? "border-primary bg-primary/10 neon-border" : "border-border bg-muted hover:border-muted-foreground"}`}
                    >
                      <Gamepad2 className={`w-6 h-6 ${selectedRole === "player" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-display font-semibold ${selectedRole === "player" ? "text-primary" : "text-muted-foreground"}`}>PLAYER</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole("developer")}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${selectedRole === "developer" ? "border-secondary bg-secondary/10" : "border-border bg-muted hover:border-muted-foreground"}`}
                    >
                      <Shield className={`w-6 h-6 ${selectedRole === "developer" ? "text-secondary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-display font-semibold ${selectedRole === "developer" ? "text-secondary" : "text-muted-foreground"}`}>DEVELOPER</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="pl-10 bg-muted border-border focus:border-primary"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="pl-10 pr-10 bg-muted border-border focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {!isLogin && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={`pl-10 pr-10 bg-muted border-border focus:border-primary ${password && confirmPassword && password !== confirmPassword ? "border-red-500 focus:border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            )}

            {isLogin && (
              <div className="text-right">
                <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm text-muted-foreground hover:text-foreground">
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full font-display font-semibold tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 neon-glow"
            >
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                <>
                  {isLogin ? "ENTER" : "JOIN"}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
