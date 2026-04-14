import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Users, Wifi, WifiOff, Hash, Smile } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const BASE_URL = "https://vapy-games.onrender.com";
import { Input } from "@/components/ui/input";
import { io, Socket } from "socket.io-client";

interface ChatMessage {
  id: string | number;
  type: "chat" | "system";
  message: string;
  nickname?: string;
  userId?: string;
  avatar_url?: string | null;
  timestamp: string;
}

const QUICK_REACTIONS = ["🔥", "👏", "😂", "💯", "🎮", "🏆", "😎", "❤️"];

const ChatRoom = () => {
  const { profile, user } = useAuth();
  const [socket, setSocket]       = useState<Socket | null>(null);
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState("");
  const [online, setOnline]       = useState(0);
  const [connected, setConnected] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const s = io(BASE_URL, { transports: ["websocket", "polling"] });

    s.on("connect", () => {
      setConnected(true);
      if (profile?.nickname && user?.id) {
        s.emit("join-chat", { nickname: profile.nickname, userId: user.id });
      }
    });

    s.on("disconnect", () => setConnected(false));

    s.on("chat-history", (history: ChatMessage[]) => {
      setMessages(history);
    });

    s.on("new-message", (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
    });

    s.on("user-count", (count: number) => setOnline(count));

    setSocket(s);
    return () => { s.disconnect(); };
  }, [profile?.nickname, user?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket || !connected) return;
    socket.emit("send-message", {
      message: input.trim(),
      nickname: profile?.nickname || "Player",
      userId: user?.id,
      avatar_url: profile?.avatar_url || null
    });
    setInput("");
    inputRef.current?.focus();
    setShowEmoji(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const addReaction = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  const isMe = (msg: ChatMessage) => msg.userId === user?.id;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-[calc(100vh-130px)] max-h-[700px]">
      {/* Header */}
      <div className="glass rounded-t-xl px-4 py-3 flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-primary" />
            {connected && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-background animate-pulse" />
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-foreground">Chat Room</h2>
            <div className="flex items-center gap-1.5">
              {connected
                ? <><Wifi className="w-3 h-3 text-emerald-400" /><span className="text-xs text-emerald-400 font-body">Live</span></>
                : <><WifiOff className="w-3 h-3 text-destructive" /><span className="text-xs text-destructive font-body">Connecting…</span></>
              }
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 glass rounded-lg px-3 py-1.5">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="font-display font-bold text-primary text-sm">{online}</span>
          <span className="text-xs text-muted-foreground font-body">online</span>
        </div>
      </div>

      {/* Room label */}
      <div className="glass px-4 py-2 flex items-center gap-2 border-b border-border/30">
        <Hash className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-display text-muted-foreground uppercase tracking-wider">global-chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-card/30 backdrop-blur-sm scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <MessageSquare className="w-12 h-12 text-primary/30 mb-3" />
            <p className="font-display text-muted-foreground">No messages yet.</p>
            <p className="text-xs text-muted-foreground font-body mt-1">Be the first to say something!</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            if (msg.type === "system") {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-center"
                >
                  <span className="text-xs text-muted-foreground font-body bg-muted/50 px-3 py-1 rounded-full">
                    {msg.message}
                  </span>
                </motion.div>
              );
            }

            const mine = isMe(msg);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full border border-border overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                  {msg.avatar_url
                    ? <img src={msg.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-display font-bold text-primary">
                        {msg.nickname?.charAt(0)?.toUpperCase()}
                      </span>}
                </div>

                <div className={`max-w-[70%] ${mine ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                  {!mine && (
                    <span className="text-xs font-display text-muted-foreground ml-1">{msg.nickname}</span>
                  )}
                  <div className={`px-3 py-2 rounded-2xl text-sm font-body break-words ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm neon-glow"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {msg.message}
                  </div>
                  <span className={`text-[10px] text-muted-foreground font-mono ${mine ? "text-right" : "text-left"} mx-1`}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass rounded-b-xl p-3 border-t border-border/50">
        <div className="relative">
          {/* Emoji picker */}
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-full mb-2 left-0 glass rounded-xl p-2 flex gap-2 z-10"
              >
                {QUICK_REACTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => addReaction(e)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-xl"
                  >
                    {e}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmoji(prev => !prev)}
              className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted"
            >
              <Smile className="w-5 h-5" />
            </button>
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={connected ? "Send a message…" : "Connecting to server…"}
              disabled={!connected}
              maxLength={500}
              className="flex-1 bg-muted border-0 font-body focus-visible:ring-1 focus-visible:ring-primary"
            />
            <Button
              onClick={sendMessage}
              disabled={!connected || !input.trim()}
              size="sm"
              className="font-display bg-primary text-primary-foreground neon-glow px-4"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          {input.length > 400 && (
            <p className="text-xs text-muted-foreground text-right mt-1 font-mono">{input.length}/500</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ChatRoom;
