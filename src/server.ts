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
app.use(cors());
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

// Initialize Socket.IO conditionally
let io;
try {
  io = initializeSocketServer(server, userService);
  app.set("io", io);
  console.log("Socket.IO initialized successfully");
} catch (error) {
  console.error("Error initializing Socket.IO:", error);
  app.set("io", null);
}

// Start the server
server.listen(httpPort, () => {
  console.log(`HTTP server running at http://localhost:${httpPort}`);
  console.log(`Socket.IO server initialized and running`);
});
