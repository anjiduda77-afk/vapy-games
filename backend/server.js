console.log("Starting server...");
const API_URL = "http://localhost:5000";
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors({
  origin: ["http://localhost:8080", "http://localhost:5173", "http://localhost:3000"],
  credentials: true
}));
app.use(express.json());

// Ensure process stays alive on unhandled rejections
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const uri = "mongodb+srv://anji0:Anji7206@cluster0.pxxzabh.mongodb.net/?appName=Cluster0";
const JWT_SECRET = "vapygame_secret_key_12345";

const client = new MongoClient(uri, {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000,
});

let users, profiles, games, game_scores;

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.status(401).json({ error: "Missing token" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
};

async function start() {
  try {
    await client.connect();
    console.log("MongoDB Connected");

    const db = client.db("vapygame");
    users = db.collection("users"); // for auth
    profiles = db.collection("profiles"); // for profiles
    games = db.collection("games");
    game_scores = db.collection("game_scores");

    // Health check route
    app.get("/", (req, res) => {
      res.json({ status: "ok", message: "VAPY Games API is running 🎮", db: "connected" });
    });

    app.get("/health", (req, res) => {
      res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Register API
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

        // Create Profile
        const newProfile = {
          user_id: userId,
          nickname,
          unique_id: `vapy-${Math.floor(Math.random() * 10000)}`,
          points: 0,
          role: role || "player", // keeping role here for simplicity
        };
        await profiles.insertOne(newProfile);

        const token = jwt.sign({ id: userId, email, role: newUser.role }, JWT_SECRET);

        res.json({ token, user: { id: userId, email, role: newUser.role, ...newProfile } });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Login API
    app.post("/login", async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await users.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid email or password" });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: "Invalid email or password" });

        const profile = await profiles.findOne({ user_id: user._id.toString() });
        const token = jwt.sign({ id: user._id.toString(), email, role: user.role }, JWT_SECRET);

        res.json({ token, user: { id: user._id.toString(), email, role: user.role, ...profile } });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Get current user profile
    app.get("/me", authenticateToken, async (req, res) => {
      try {
        const profile = await profiles.findOne({ user_id: req.user.id });
        if (!profile) return res.status(404).json({ error: "Profile not found" });
        res.json({ profile, role: req.user.role });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Get all profiles (for leaderboard and admin)
    app.get("/profiles", async (req, res) => {
      try {
        const allProfiles = await profiles.find().sort({ points: -1 }).toArray();
        res.json(allProfiles);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Update points (for games adding score to user)
    app.post("/add-points", authenticateToken, async (req, res) => {
       try {
         const { score } = req.body;
         const result = await profiles.findOneAndUpdate(
           { user_id: req.user.id },
           { $inc: { points: score } },
           { returnDocument: 'after' }
         );
         
         await game_scores.insertOne({
           user_id: req.user.id,
           score,
           createdAt: new Date()
         });

         res.json({ success: true, points: result.points });
       } catch (err) {
         res.status(500).json({ error: err.message });
       }
    });
    
    // Dummy reset password
    app.post("/reset-password", async (req, res) => {
       res.json({ success: true, message: "If the email exists, a reset link has been sent." });
    });
    
    // Update profile (nickname)
    app.put("/profiles", authenticateToken, async (req, res) => {
      try {
        const { nickname } = req.body;
        await profiles.updateOne({ user_id: req.user.id }, { $set: { nickname } });
        res.json({ success: true });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Admin: update specific user's points
    app.put("/admin/profiles/:userId/points", authenticateToken, async (req, res) => {
       try {
         if (req.user.role !== "developer") return res.status(403).json({ error: "Access denied" });
         const { points } = req.body;
         const { userId } = req.params;
         
         await profiles.updateOne({ user_id: userId }, { $set: { points } });
         res.json({ success: true });
       } catch (err) {
         res.status(500).json({ error: err.message });
       }
    });

    // Games APIs
    app.get("/games", async (req, res) => {
      try {
        const activeGames = await games.find({ is_active: { $ne: false } }).toArray();
        res.json(activeGames);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post("/games", authenticateToken, async (req, res) => {
      try {
         if (req.user.role !== "developer") return res.status(403).json({ error: "Access denied" });
         const { title, description, category } = req.body;
         const newGame = {
           title,
           description,
           category: category || "uncategorized",
           is_active: true,
           createdAt: new Date()
         };
         const result = await games.insertOne(newGame);
         res.json({ ...newGame, _id: result.insertedId });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
    
    // Dashobard Stats endpoint
    app.get("/stats", async (req, res) => {
      try {
        const totalPlayers = await profiles.countDocuments();
        const totalGames = await games.countDocuments();
        const activeContests = 0; // We don't have contests right now
        const leaderboard = await profiles.find().sort({ points: -1 }).limit(5).toArray();
        res.json({ totalPlayers, totalGames, activeContests, leaderboard });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    const PORT = 5000;

    app.listen(PORT, ()=>{
      console.log(`Server running on ${API_URL}`);
    });

  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

start();