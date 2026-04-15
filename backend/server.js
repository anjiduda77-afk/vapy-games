console.log("Starting server...");
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  "https://vapy-games.vercel.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://localhost:3000",
  "http://127.0.0.1:8081",
  "http://127.0.0.1:5173"
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list OR is a vercel.app subdomain
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith(".vercel.app")) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
};

const io = new Server(server, {
  cors: corsOptions
});

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" })); // 10MB for base64 avatars

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const uri = process.env.MONGO_URI || "mongodb+srv://anji0:Anji7206@cluster0.pxxzabh.mongodb.net/?appName=Cluster0";
const JWT_SECRET = process.env.JWT_SECRET || "vapygame_secret_key_12345";

const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000,
});

let users, profiles, games, game_scores, chat_messages;

// --- Auth Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

// --- Difficulty-based scoring ---
const getScoreByDifficulty = (difficulty) => {
  if (difficulty === "easy") return Math.floor(Math.random() * 2) + 1; // 1–2
  if (difficulty === "medium") return Math.floor(Math.random() * 2) + 3; // 3–4
  if (difficulty === "hard") return Math.floor(Math.random() * 2) + 5; // 5–6
  return 1;
};

// --- Socket.IO Real-time Chat ---
const connectedUsers = new Map();
const chatHistory = [];
// --- GO CAR Multiplayer Rooms ---
const carRooms = new Map(); // roomId -> { players, started, winnerId }

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-chat", ({ nickname, userId }) => {
    connectedUsers.set(socket.id, { nickname, userId });
    io.emit("user-count", connectedUsers.size);
    socket.emit("chat-history", chatHistory.slice(-50));
    const systemMsg = {
      id: `sys-${Date.now()}`,
      type: "system",
      message: `${nickname} joined the chat room!`,
      timestamp: new Date().toISOString()
    };
    io.emit("new-message", systemMsg);
  });

  socket.on("send-message", ({ message, nickname, userId, avatar_url }) => {
    if (!message || !message.trim()) return;
    const msg = {
      id: Date.now(),
      type: "chat",
      message: message.trim().slice(0, 500),
      nickname,
      userId,
      avatar_url: avatar_url || null,
      timestamp: new Date().toISOString()
    };
    chatHistory.push(msg);
    if (chatHistory.length > 100) chatHistory.shift();
    if (chat_messages) {
      chat_messages.insertOne({ ...msg }).catch(console.error);
    }
    io.emit("new-message", msg);
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);
      io.emit("user-count", connectedUsers.size);
      io.emit("new-message", {
        id: `sys-${Date.now()}`,
        type: "system",
        message: `${user.nickname} left the chat room.`,
        timestamp: new Date().toISOString()
      });
    }
    // Clean up GO CAR rooms
    for (const [roomId, room] of carRooms.entries()) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
          carRooms.delete(roomId);
        } else {
          io.to(roomId).emit("gocar-player-joined", { players: room.players });
          if (room.started) {
            const alivePlayers = room.players.filter(p => !p.isDead);
            if (alivePlayers.length <= 1) {
              if (alivePlayers.length === 1) {
                const last = alivePlayers[0];
                last.isDead = true;
                room.finished.push({ id: last.id, nickname: last.nickname, score: last.score, survived: true });
              }
              room.finished.sort((a, b) => b.score - a.score);
              if (room.finished.length > 0) {
                io.to(roomId).emit("gocar-game-over", { winnerId: room.finished[0].id, rankings: room.finished });
              }
              room.started = false;
            }
          }
        }
        break;
      }
    }
  });

  // ── GO CAR Multiplayer Events ─────────────────────────────────────────────
  socket.on("gocar-join-room", ({ roomId, userId, nickname, create }) => {
    if (!create && !carRooms.has(roomId)) {
      socket.emit("gocar-error", { message: "Room not found" });
      return;
    }
    const room = carRooms.get(roomId) || { players: [], started: false, finished: [] };
    if (room.players.length >= 4 && !room.players.find(p => p.id === socket.id)) {
      socket.emit("gocar-error", { message: "Room is full (Max 4)" });
      return;
    }
    if (!room.players.find(p => p.id === socket.id)) {
      room.players.push({ id: socket.id, nickname: nickname || "Driver", x: 0, y: 0, health: 100, score: 0, isDead: false });
    }
    carRooms.set(roomId, room);
    socket.join(roomId);
    socket.emit("gocar-room-state", { players: room.players, roomId });
    io.to(roomId).emit("gocar-player-joined", { players: room.players, roomId });
    console.log(`GO CAR: ${nickname} joined room ${roomId} (${room.players.length}/4)`);
  });

  socket.on("gocar-ready", ({ roomId }) => {
    const room = carRooms.get(roomId);
    if (!room) return;
    if (room.players.length >= 2) {
      room.started = true;
      room.finished = [];
      room.players.forEach(p => { p.isDead = false; p.score = 0; p.health = 100; });
      io.to(roomId).emit("gocar-start", { roomId });
      console.log(`GO CAR: Race started in room ${roomId}`);
    }
  });

  socket.on("gocar-player-update", ({ x, y, speed, health, score }) => {
    for (const [roomId, room] of carRooms.entries()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.x = x; player.y = y; player.health = health; player.score = score || player.score;
        socket.to(roomId).emit("gocar-opponent-update", { x, y, speed, health, score, playerId: socket.id });
        break;
      }
    }
  });

  socket.on("gocar-game-end", ({ roomId, score, survived }) => {
    const room = carRooms.get(roomId);
    if (!room) return;
    
    let player = room.players.find(p => p.id === socket.id);
    if (player && !player.isDead) {
      player.isDead = true;
      player.score = score;
      room.finished.push({ id: socket.id, nickname: player.nickname, score, survived });
      
      const alivePlayers = room.players.filter(p => !p.isDead);
      
      if (survived || alivePlayers.length <= 1) {
        alivePlayers.forEach(p => {
          p.isDead = true;
          room.finished.push({ id: p.id, nickname: p.nickname, score: p.score, survived: false });
        });
        
        room.finished.sort((a, b) => {
            if (a.survived && !b.survived) return -1;
            if (!a.survived && b.survived) return 1;
            return b.score - a.score;
        });
        
        const winner = room.finished[0];
        io.to(roomId).emit("gocar-game-over", { 
          winnerId: winner.id, 
          rankings: room.finished 
        });
        room.started = false;
      }
    }
  });

  socket.on("gocar-leave-room", ({ roomId }) => {
    socket.leave(roomId);
    const room = carRooms.get(roomId);
    if (room) {
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) carRooms.delete(roomId);
      else io.to(roomId).emit("gocar-player-joined", { players: room.players });
    }
  });
});

// ============================================================
//  REST API
// ============================================================
async function start() {
  try {
    await client.connect();
    console.log("MongoDB Connected");

    const db = client.db("vapygame");
    users = db.collection("users");
    profiles = db.collection("profiles");
    games = db.collection("games");
    game_scores = db.collection("game_scores");
    chat_messages = db.collection("chat_messages");
    const user_progress = db.collection("user_progress");

    // ── Health ──────────────────────────────────────────────
    app.get("/", (req, res) => {
      res.json({ status: "ok", message: "VAPY Games API is running 🎮", db: "connected" });
    });
    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // ── Register ────────────────────────────────────────────
    app.post("/register", async (req, res) => {
      try {
        const { email, password, nickname, role } = req.body;
        const existingUser = await users.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already exists" });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
          email,
          password: hashedPassword,
          role: role || "player",
          createdAt: new Date()
        };
        const result = await users.insertOne(newUser);
        const userId = result.insertedId.toString();

        const newProfile = {
          user_id: userId,
          nickname,
          unique_id: `vapy-${Math.floor(Math.random() * 90000) + 10000}`,
          points: 0,
          role: role || "player",
          avatar_url: null,
          isVerified: false
        };
        await profiles.insertOne(newProfile);

        const token = jwt.sign({ id: userId, email, role: newUser.role }, JWT_SECRET);
        res.json({ token, user: { id: userId, email, role: newUser.role, ...newProfile } });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Login ───────────────────────────────────────────────
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await users.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid email or password" });

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).json({ error: "Invalid email or password" });

        const profile = await profiles.findOne({ user_id: user._id.toString() });
        const token = jwt.sign({ id: user._id.toString(), email, role: user.role }, JWT_SECRET);
        res.json({ token, user: { id: user._id.toString(), email, role: user.role, ...profile } });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Me ──────────────────────────────────────────────────
    app.get("/me", authenticateToken, async (req, res) => {
      try {
        const profile = await profiles.findOne({ user_id: req.user.id });
        if (!profile) return res.status(404).json({ error: "Profile not found" });
        res.json({ profile, role: req.user.role });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Profiles (all) ─────────────────────────────────────
    app.get("/profiles", async (req, res) => {
      try {
        const allProfiles = await profiles.find().sort({ points: -1 }).toArray();
        res.json(allProfiles);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Leaderboard (MongoDB Aggregation) ──────────────────
    app.get("/leaderboard", async (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 100;
        const leaderboard = await profiles.aggregate([
          { $sort: { points: -1 } },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              user_id: 1,
              nickname: 1,
              unique_id: 1,
              points: 1,
              avatar_url: 1,
              role: 1
            }
          }
        ]).toArray();
        res.json(leaderboard);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Update Profile (nickname + avatar) ──────────────────
    app.put("/profiles", authenticateToken, async (req, res) => {
      try {
        const { nickname, avatar_url } = req.body;
        const update = {};
        if (nickname !== undefined) update.nickname = nickname;
        if (avatar_url !== undefined) update.avatar_url = avatar_url;
        await profiles.updateOne({ user_id: req.user.id }, { $set: update });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Get User Progress ───────────────────────────────────
    app.get("/user-progress", authenticateToken, async (req, res) => {
      try {
        const progress = await user_progress.find({ user_id: req.user.id }).toArray();
        res.json(progress);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Update User Progress (Level Up) ─────────────────────
    app.post("/user-progress", authenticateToken, async (req, res) => {
      try {
        const { game_id, level } = req.body;
        await user_progress.updateOne(
          { user_id: req.user.id, game_id },
          { $set: { level, updatedAt: new Date() } },
          { upsert: true }
        );
        res.json({ success: true, game_id, level });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Add Points (difficulty-aware) ───────────────────────
    app.post("/add-points", authenticateToken, async (req, res) => {
      try {
        const { result, gameId, difficulty, match_id } = req.body;
        
        if (!['win', 'loss', 'draw'].includes(result)) {
           return res.status(400).json({ error: "result must be one of: win, draw, loss" });
        }
        if (!['easy', 'medium', 'hard'].includes(difficulty)) {
           return res.status(400).json({ error: "difficulty must be one of: easy, medium, hard" });
        }
        if (!match_id) {
           return res.status(400).json({ error: "match_id is required to prevent duplicates" });
        }

        // Prevent duplicate updates for the same match
        const existingMatch = await game_scores.findOne({ match_id });
        if (existingMatch) {
            return res.status(400).json({ error: "Duplicate match result submission" });
        }

        // Calculate points based on result and difficulty
        let pointsToAdd = 0;
        if (result === 'win') {
          if (difficulty === 'easy') pointsToAdd = 1;
          else if (difficulty === 'medium') pointsToAdd = 2;
          else if (difficulty === 'hard') pointsToAdd = 3;
        } else if (result === 'loss') {
          pointsToAdd = -1;
        } else if (result === 'draw') {
          pointsToAdd = 0;
        }

        // Use $inc for atomic point incrementing, then calculate final for the logging record
        const updatedProfile = await profiles.findOneAndUpdate(
          { user_id: req.user.id },
          { $inc: { points: pointsToAdd } },
          { returnDocument: "after" }
        );
        let newPoints = updatedProfile?.points || 0;
        
        // Ensure points don't drop below zero logically if possible (fallback cleanup)
        if (newPoints < 0) {
            await profiles.updateOne({ user_id: req.user.id }, { $set: { points: 0 } });
            newPoints = 0;
        }
        
        await game_scores.insertOne({
          match_id,
          user_id: req.user.id,
          game_id: gameId || "unknown",
          difficulty,
          result,
          points_awarded: pointsToAdd,
          total_points: newPoints,
          createdAt: new Date()
        });
        
        res.json({ success: true, points: newPoints, scoreAwarded: pointsToAdd });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Reset Password (dummy) ──────────────────────────────
    app.post("/reset-password", async (req, res) => {
      res.json({ success: true, message: "If the email exists, a reset link has been sent." });
    });

    // ── Admin: Update User Verification ─────────────────────
    app.put("/admin/users/:userId/verify", authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
        const { isVerified } = req.body;
        await profiles.updateOne({ user_id: req.params.userId }, { $set: { isVerified } });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Admin: Update User Points ───────────────────────────
    app.put("/admin/profiles/:userId/points", authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
        const { points } = req.body;
        await profiles.updateOne({ user_id: req.params.userId }, { $set: { points } });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Games: GET all ──────────────────────────────────────
    app.get("/games", async (req, res) => {
      try {
        const activeGames = await games.find({ is_active: { $ne: false } }).toArray();
        res.json(activeGames);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Games: POST (add) ───────────────────────────────────
    app.post("/games", authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
        const { title, description, category, difficulty, image_url } = req.body;
        const newGame = {
          title,
          description,
          category: category || "uncategorized",
          difficulty: difficulty || "medium",
          image_url: image_url || null,
          is_active: true,
          createdAt: new Date()
        };
        const result = await games.insertOne(newGame);
        res.json({ ...newGame, _id: result.insertedId });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Games: PUT (update) ─────────────────────────────────
    app.put("/games/:gameId", authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
        const { title, description, category, difficulty, is_active } = req.body;
        const update = {};
        if (title !== undefined) update.title = title;
        if (description !== undefined) update.description = description;
        if (category !== undefined) update.category = category;
        if (difficulty !== undefined) update.difficulty = difficulty;
        if (is_active !== undefined) update.is_active = is_active;

        await games.updateOne({ _id: new ObjectId(req.params.gameId) }, { $set: update });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Games: DELETE (soft delete) ─────────────────────────
    app.delete("/games/:gameId", authenticateToken, async (req, res) => {
      try {
        if (req.user.role !== "admin") return res.status(403).json({ error: "Access denied" });
        await games.updateOne({ _id: new ObjectId(req.params.gameId) }, { $set: { is_active: false } });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Dashboard Stats ─────────────────────────────────────
    app.get("/stats", async (req, res) => {
      try {
        const totalPlayers = await profiles.countDocuments();
        const totalGames = await games.countDocuments({ is_active: { $ne: false } });
        const activeContests = 0;
        const leaderboard = await profiles.find().sort({ points: -1 }).limit(5).toArray();
        res.json({ totalPlayers, totalGames, activeContests, leaderboard });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // ── Start server ────────────────────────────────────────
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO chat enabled on port ${PORT}`);
    });

  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

start();