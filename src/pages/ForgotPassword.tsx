import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { API_URL } from "@/contexts/AuthContext";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !isValidEmail(email.trim())) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      // Always treat as success to prevent email enumeration
      if (res.ok || res.status === 429) {
        if (res.status === 429) {
          toast({ title: "Too many requests", description: "Please wait 15 minutes before trying again.", variant: "destructive" });
          return;
        }
        setIsSuccess(true);
        toast({ title: "Check your inbox", description: "If this email exists, a reset link has been sent." });
        setTimeout(() => navigate("/auth"), 4000);
      }
    } catch {
      toast({ title: "Network error", description: "Cannot connect to server. Is the backend running?", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">
      {/* Premium Animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[100px] animate-bounce-slow" />
        
        {/* Modern Grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-morphism rounded-3xl p-10 border border-white/10 shadow-2xl backdrop-blur-2xl">
          {!isSuccess ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <button 
                  onClick={() => navigate("/auth")} 
                  className="group mb-4 text-xs font-display uppercase tracking-widest text-muted-foreground hover:text-primary flex items-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" /> Back to portal
                </button>
                <h2 className="text-4xl font-display font-black tracking-tight text-white">
                  Reset <span className="text-primary neon-text">Access</span>
                </h2>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">
                  Enter your credentials to receive a recovery link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-xl blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        type="email" 
                        placeholder="Enter Email Address" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        className="h-14 pl-12 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl font-body transition-all" 
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-14 font-display font-bold text-base tracking-widest bg-primary text-white hover:bg-primary/90 rounded-xl shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all active:scale-95" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" 
                    />
                  ) : (
                    "REQUEST RECOVERY"
                  )}
                </Button>
              </form>

              <div className="pt-2 border-t border-white/5 text-center">
                <p className="text-xs text-muted-foreground">
                  Secure protocols active. <button onClick={() => navigate("/auth")} className="text-primary hover:text-primary/80 font-semibold underline-offset-4 hover:underline">Return to Hub</button>
                </p>
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4"
            >
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-6"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
                  <div className="relative bg-green-500/10 border border-green-500/50 p-5 rounded-full">
                    <CheckCircle className="w-12 h-12 text-green-500" />
                  </div>
                </div>
              </motion.div>
              <h3 className="text-3xl font-display font-black mb-3 text-white">Email Dispatched</h3>
              <p className="text-muted-foreground font-body mb-8 leading-relaxed">
                Check your inbox for reactivation instructions.<br/>Rerouting to main hub...
              </p>
              <div className="flex justify-center">
                <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "100%" }}
                    transition={{ duration: 3, ease: "easeInOut" }}
                    className="w-full h-full bg-primary"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
