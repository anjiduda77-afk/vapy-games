const { io } = require("socket.io-client");
const sock1 = io("http://localhost:5000", {transports: ["websocket"]});
const sock2 = io("http://localhost:5000", {transports: ["websocket"]});

sock1.on("connect", () => {
    sock1.emit("gocar-join-room", {roomId: "AAA", nickname: "S1", create: true});
});
sock1.on("gocar-player-joined", (data) => console.log("SOCK1 received joined: ", data.players.length));

setTimeout(() => {
    sock2.on("connect", () => {
        sock2.emit("gocar-join-room", {roomId: "AAA", nickname: "S2", create: false});
    });
    sock2.on("gocar-player-joined", (data) => console.log("SOCK2 received joined: ", data.players.length));
}, 1000);

setTimeout(() => process.exit(0), 3000);
