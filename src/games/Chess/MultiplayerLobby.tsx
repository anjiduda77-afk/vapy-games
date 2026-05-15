import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Lock, Unlock, Globe, Clock, Swords, Shield, Copy, Check, ArrowLeft, Play, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export interface RoomSettings {
  roomId?: string;
  hostId?: string;
  timeControl: number; // in seconds
  matchType: 'casual' | 'ranked' | 'practice';
  privacy: 'public' | 'private';
  allowSpectators: boolean;
}

interface Props {
  onCreateRoom: (settings: RoomSettings) => void;
  onJoinRoom: (roomId: string) => void;
  onCancel: () => void;
  currentRoom: any | null; // room data if in waiting state
}

export default function MultiplayerLobby({ onCreateRoom, onJoinRoom, onCancel, currentRoom }: Props) {
  const { profile } = useAuth();
  const [view, setView] = useState<'main' | 'create' | 'join' | 'waiting'>('main');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Settings state
  const [timeControl, setTimeControl] = useState<number>(600); // 10 mins default
  const [matchType, setMatchType] = useState<'casual'|'ranked'>('casual');
  const [privacy, setPrivacy] = useState<'public'|'private'>('private');
  const [spectators, setSpectators] = useState(true);

  useEffect(() => {
    if (currentRoom) setView('waiting');
  }, [currentRoom]);

  const handleCreate = () => {
    onCreateRoom({ timeControl, matchType, privacy, allowSpectators: spectators });
  };

  const copyCode = () => {
    if (currentRoom?.roomId) {
      navigator.clipboard.writeText(currentRoom.roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto w-full">
      <div className="glass rounded-3xl overflow-hidden border border-cyan-500/30 shadow-[0_0_50px_rgba(0,255,255,0.1)] relative">
        {/* Background ambient glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="p-6 md:p-8 relative z-10">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => view === 'main' ? onCancel() : setView('main')} className="p-2 hover:bg-white/5 rounded-full transition-colors text-muted-foreground hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl md:text-2xl font-display font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              MULTIPLAYER LOBBY
            </h2>
            <div className="w-9" /> {/* Spacer for centering */}
          </div>

          <AnimatePresence mode="wait">
            {view === 'main' && (
              <motion.div key="main" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
                <button onClick={() => setView('create')} className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-white/10 hover:border-cyan-400/50 p-6 flex items-center gap-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,255,0.15)]">
                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 group-hover:scale-110 transition-transform shadow-[inset_0_0_20px_rgba(0,255,255,0.2)]">
                    <Shield className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-display font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">Create Private Room</h3>
                    <p className="text-sm text-muted-foreground font-body">Host a custom match and invite friends with a secure code.</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-black transition-colors">
                    <Play className="w-4 h-4 ml-1" />
                  </div>
                </button>

                <button onClick={() => setView('join')} className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10 hover:border-purple-400/50 p-6 flex items-center gap-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30 group-hover:scale-110 transition-transform shadow-[inset_0_0_20px_rgba(168,85,247,0.2)]">
                    <Users className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-display font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">Join via Code</h3>
                    <p className="text-sm text-muted-foreground font-body">Enter a 6-character room code to instantly join a friend.</p>
                  </div>
                </button>
              </motion.div>
            )}

            {view === 'create' && (
              <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                
                {/* Match Type */}
                <div>
                  <label className="text-xs font-display font-bold text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                    <Swords className="w-3 h-3 text-cyan-400" /> MATCH TYPE
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setMatchType('casual')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${matchType === 'casual' ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.2)]' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                      <span className="text-xl">🎯</span>
                      <span className="font-display font-bold text-sm">Casual</span>
                      <span className="text-[10px]">No point loss</span>
                    </button>
                    <button onClick={() => setMatchType('ranked')} className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${matchType === 'ranked' ? 'bg-purple-500/20 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                      <span className="text-xl">🏆</span>
                      <span className="font-display font-bold text-sm">Ranked</span>
                      <span className="text-[10px]">Dynamic ELO</span>
                    </button>
                  </div>
                </div>

                {/* Time Control */}
                <div>
                  <label className="text-xs font-display font-bold text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                    <Clock className="w-3 h-3 text-yellow-400" /> TIME CONTROL
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 3, 5, 10, 30].map(mins => (
                      <button key={mins} onClick={() => setTimeControl(mins * 60)} className={`py-2 rounded-lg font-display font-bold text-sm border transition-all ${timeControl === mins * 60 ? 'bg-yellow-500/20 border-yellow-400 text-yellow-400' : 'bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10'}`}>
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Privacy & Spectators */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-display font-bold text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                      {privacy === 'private' ? <Lock className="w-3 h-3 text-red-400" /> : <Globe className="w-3 h-3 text-emerald-400" />} PRIVACY
                    </label>
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                      <button onClick={() => setPrivacy('private')} className={`flex-1 py-1.5 rounded-md text-xs font-display font-bold transition-all ${privacy === 'private' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}>Private</button>
                      <button onClick={() => setPrivacy('public')} className={`flex-1 py-1.5 rounded-md text-xs font-display font-bold transition-all ${privacy === 'public' ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}>Public</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-display font-bold text-muted-foreground tracking-widest mb-3 flex items-center gap-2">
                      <Eye className="w-3 h-3 text-blue-400" /> SPECTATORS
                    </label>
                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/10">
                      <button onClick={() => setSpectators(true)} className={`flex-1 py-1.5 rounded-md text-xs font-display font-bold transition-all ${spectators ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}>Allow</button>
                      <button onClick={() => setSpectators(false)} className={`flex-1 py-1.5 rounded-md text-xs font-display font-bold transition-all ${!spectators ? 'bg-white/10 text-white' : 'text-muted-foreground hover:text-white'}`}>Deny</button>
                    </div>
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleCreate} className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-display font-black tracking-widest text-sm shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] transition-all">
                  INITIALIZE LOBBY
                </motion.button>
              </motion.div>
            )}

            {view === 'join' && (
              <motion.div key="join" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 py-8">
                <div className="text-center space-y-2 mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-500/30 mb-2 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                    <Unlock className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-display font-bold text-white">Enter Room Code</h3>
                  <p className="text-sm text-muted-foreground">Ask the host for the 6-character invite code</p>
                </div>

                <div className="max-w-xs mx-auto">
                  <input
                    type="text"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="E.g. ABX92K"
                    className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-4 py-4 text-center text-3xl font-mono font-bold text-white tracking-[0.5em] focus:outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all placeholder:text-white/10"
                  />
                  
                  <motion.button 
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                    disabled={joinCode.length < 6}
                    onClick={() => onJoinRoom(joinCode)}
                    className="w-full mt-6 py-4 rounded-xl bg-purple-500 text-white font-display font-black tracking-widest text-sm shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:shadow-none transition-all"
                  >
                    JOIN MATCH
                  </motion.button>
                </div>
              </motion.div>
            )}

            {view === 'waiting' && currentRoom && (
              <motion.div key="waiting" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-8">
                <div className="relative inline-block">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }} className="absolute -inset-4 border-2 border-dashed border-cyan-500/30 rounded-full" />
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-2 border-cyan-400/50 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(0,255,255,0.2)]">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="You" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-display font-bold text-cyan-400">{profile?.nickname?.charAt(0) || 'U'}</span>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-display font-bold text-white mb-2">Waiting for opponent...</h3>
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Room is live and waiting
                  </p>
                </div>

                <div className="max-w-sm mx-auto bg-black/40 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />
                  <p className="text-[10px] font-display font-bold text-muted-foreground tracking-widest mb-2">YOUR ROOM CODE</p>
                  <div className="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/10">
                    <span className="text-3xl font-mono font-bold text-white tracking-widest pl-4">{currentRoom.roomId}</span>
                    <button onClick={copyCode} className={`p-3 rounded-lg transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'}`}>
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    Share this code with a friend to start the match.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
