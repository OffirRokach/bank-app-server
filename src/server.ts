import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import authRoutes from "./routes/authRoutes";
import accountsRoutes from "./routes/accountsRoutes";
import transactionsRoutes from "./routes/transactionsRoutes";
import usersRoutes from "./routes/usersRoutes";
import { initializeSocketServer } from "./middleware/socketMiddleware";

// Import user repository functions for socket authentication
import { findUserById } from "./repositories/userRepository";

// Create a simple user service object for socket authentication
const userService = {
  findUserById,
};

dotenv.config();

const app = express();
// Configure CORS to accept requests from the client
app.use(
  cors({
    origin: process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : "*",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/accounts", accountsRoutes);
app.use("/api/v1/transactions", transactionsRoutes);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// Create HTTP server
const httpPort = process.env.PORT || "3001";
const server = http.createServer(app);

// Check if we're in a serverless environment (like Vercel)
const isServerless = process.env.VERCEL === "1";

// Initialize Socket.IO conditionally
let io;
try {
  // Only initialize Socket.IO in non-serverless environments or if explicitly enabled
  if (!isServerless || process.env.ENABLE_SOCKET_IN_SERVERLESS === "true") {
    io = initializeSocketServer(server, userService);
    // Make io available to the Express app
    app.set("io", io);
    console.log("Socket.IO initialized successfully");
  } else {
    console.log(
      "Running in serverless environment, Socket.IO initialization skipped"
    );
    // Set a null value so the app knows Socket.IO is not available
    app.set("io", null);
  }
} catch (error) {
  console.error("Error initializing Socket.IO:", error);
  // Set a null value so the app knows Socket.IO is not available
  app.set("io", null);
}

// Start the server
server.listen(httpPort, () => {
  console.log(`HTTP server running at http://localhost:${httpPort}`);
  console.log(`Socket.IO server initialized and running`);
});
