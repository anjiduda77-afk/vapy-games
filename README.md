VapyGame – MERN Stack Application

A full-stack web application built using the MERN stack (MongoDB, Express.js, React.js, Node.js).
This platform allows users to register, log in securely, track scores, and view leaderboard rankings.

---
        
Features

* 🔐 User Authentication (JWT-based)
* 🔑 Secure Password Hashing (bcrypt)
* 🧑 User Profiles with Points System
* 🏆 Leaderboard (Top Players Ranking)
* 🎯 Game Score Tracking
* 📊 Dashboard Statistics

---

Tech Stack

* **Frontend:** React.js, Vite, Tailwind CSS
* **Backend:** Node.js, Express.js
* **Database:** MongoDB Atlas
* **Authentication:** JWT
* **Security:** bcrypt

---

Project Structure

```
vapygame/
├── frontend/       # React Application
├── backend/        # Express Server
├── README.md
```

---

⚙️ Installation & Setup

Clone Repository

```
git clone https://github.com/anjiduda77-afk/vapy-games.git
cd vapy-games
```

---
Setup Backend

```
cd backend
npm install
node server.js
```

Server runs on:

```
http://localhost:5000
```

---
Setup Frontend

```
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---
🔗 API Endpoints

| Method | Endpoint  | Description       |
| ------ | --------- | ----------------- |
| POST   | /register | Register new user |
| POST   | /login    | User login        |
| GET    | /profiles | Get leaderboard   |
| GET    | /stats    | Dashboard data    |

---
🔐 Security Features

* Password encryption using bcrypt
* JWT-based authentication
* Protected API routes
* Role-based access control

---
📈 Future Enhancements

* Real-time leaderboard updates
* Game matchmaking system
* Payment integration for tournaments
* Mobile app support

---
👨‍💻 Author

**Anji Duda**
GitHub: https://github.com/anjiduda77-afk

---

⭐ Conclusion

This project demonstrates a complete MERN stack implementation with authentication, database integration, and scalable architecture suitable for modern web applications.

---
