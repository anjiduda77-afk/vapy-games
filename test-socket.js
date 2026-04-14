import { io } from "socket.io-client";

const URL = "http://localhost:5000";

const socket1 = io(URL);
const socket2 = io(URL);

let roomCode = "TESTXX";

socket1.on("connect", () => {
    console.log("Socket 1 connected:", socket1.id);
    socket1.emit("gocar-join-room", { roomId: roomCode, userId: socket1.id, nickname: "Player1", create: true });
});

socket1.on("gocar-player-joined", (data) => {
    console.log("Socket 1 received gocar-player-joined:", data);
});

socket2.on("connect", () => {
    console.log("Socket 2 connected:", socket2.id);
    // Join after a brief delay to ensure room exists
    setTimeout(() => {
        socket2.emit("gocar-join-room", { roomId: roomCode, userId: socket2.id, nickname: "Player2", create: false });
    }, 500);
});

socket2.on("gocar-player-joined", (data) => {
    console.log("Socket 2 received gocar-player-joined:", data);
});

setTimeout(() => {
    console.log("Test finished.");
    process.exit(0);
}, 2000);
