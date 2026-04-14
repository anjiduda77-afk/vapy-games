import { io } from "socket.io-client";

const URL = "http://localhost:5000";
let testsPassed = 0;
let testsFailed = 0;

async function testChatConnection() {
  return new Promise((resolve) => {
    const socket = io(URL, { 
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    const timeout = setTimeout(() => {
      console.log("❌ FAIL: Connection timeout after 5 seconds");
      socket.disconnect();
      testsFailed++;
      resolve();
    }, 5000);

    socket.on("connect", () => {
      clearTimeout(timeout);
      console.log("✅ PASS: Socket.IO connected");
      console.log(`   Socket ID: ${socket.id}`);
      testsPassed++;

      // Test join-chat event
      socket.emit("join-chat", { 
        nickname: "TestBot", 
        userId: "test-user-123" 
      });
    });

    socket.on("chat-history", (history) => {
      console.log("✅ PASS: Chat history received");
      console.log(`   Messages in history: ${history.length}`);
      testsPassed++;
    });

    socket.on("user-count", (count) => {
      console.log("✅ PASS: User count received");
      console.log(`   Users online: ${count}`);
      testsPassed++;
    });

    socket.on("new-message", (msg) => {
      console.log("✅ PASS: New message received");
      console.log(`   Message: ${msg.message}`);
      testsPassed++;
      
      // Send test message after a brief delay
      setTimeout(() => {
        socket.emit("send-message", {
          message: "Test message from connection check",
          nickname: "TestBot",
          userId: "test-user-123",
          avatar_url: null
        });
      }, 500);
    });

    socket.on("disconnect", () => {
      clearTimeout(timeout);
      console.log("ℹ️  Socket disconnected");
      socket.disconnect();
      resolve();
    });

    socket.on("error", (error) => {
      clearTimeout(timeout);
      console.log("❌ FAIL: Socket error");
      console.log(`   Error: ${error}`);
      testsFailed++;
      socket.disconnect();
      resolve();
    });

    socket.on("connect_error", (error) => {
      clearTimeout(timeout);
      console.log("❌ FAIL: Connection error");
      console.log(`   Error: ${error.message}`);
      testsFailed++;
      socket.disconnect();
      resolve();
    });

    // Auto-disconnect after 3 seconds
    setTimeout(() => {
      socket.disconnect();
    }, 3000);
  });
}

console.log("🔌 Testing Chat Room Socket.IO Connection\n");
console.log("Connecting to:", URL);
console.log("────────────────────────────────────────\n");

await testChatConnection();

console.log("\n────────────────────────────────────────");
console.log(`📊 Results: ${testsPassed} Passed, ${testsFailed} Failed`);
console.log("────────────────────────────────────────");

if (testsPassed >= 3) {
  console.log("\n✅ Chat room connection is WORKING!");
} else {
  console.log("\n⚠️  Chat room connection may have issues");
}

process.exit(testsFailed > 0 ? 1 : 0);
