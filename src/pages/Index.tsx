import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
// @ts-ignore
import killingVideo from "@/killing1.mp4";

const Index = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate("/dashboard", { replace: true });
  }, [session, navigate]);

  const handleEnter = () => {
    navigate("/auth");
  };

  return (
    <div 
      className="min-h-screen bg-black relative overflow-hidden cursor-pointer flex items-center justify-center group"
      onClick={handleEnter}
    >
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-700 group-hover:opacity-40"
      >
        <source src={killingVideo} type="video/mp4" />
      </video>
      
      {/* Dark Overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Tap to enter text */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-center"
        >
          <p className="text-white/80 tracking-[0.3em] text-xs md:text-sm font-medium uppercase hover:text-white transition-colors">
            Tap to Enter
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Index;
