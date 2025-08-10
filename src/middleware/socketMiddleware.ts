import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import http from "http";
import { User, JwtPayload } from "../types";

interface ConnectedUser {
  socketId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AuthenticatedSocket extends Socket {
  userId: string;
  user: User;
}

// Map to track connected users by userId
const connectedUsers = new Map<string, ConnectedUser>();

/**
 * Initialize Socket.IO server with authentication middleware
 * @param server - HTTP server instance
 * @param userService - User service for looking up user information
 * @returns Socket.IO server instance
 */
function initializeSocketServer(
  server: http.Server,
  userService: { findUserById: (id: string) => Promise<User | null> }
): Server {
  // Check if we're in a serverless environment
  const isServerless = process.env.VERCEL === "1";

  if (isServerless) {
    console.log(
      "Running in serverless environment, Socket.IO functionality may be limited"
    );
  }

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication token missing"));
      }

      // Verify JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret"
      ) as JwtPayload;

      if (!decoded || !decoded.userId) {
        return next(new Error("Invalid authentication token"));
      }

      // Store user information in socket object
      const userId = decoded.userId;
      const user = await userService.findUserById(userId);

      (socket as any).userId = userId;
      (socket as any).user = user;

      if (!(socket as any).user) {
        return next(new Error("User not found"));
      }

      next();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Socket authentication error:", errorMessage);
      next(new Error("Authentication failed"));
    }
  });

  // Connection handler
  io.on("connection", (socket: Socket) => {
    // Cast socket to access our custom properties
    const socket_auth = socket as unknown as AuthenticatedSocket;
    const { userId, user } = socket_auth;
    console.log(
      `User connected: ${userId} (${user.email}), Socket ID: ${socket.id}`
    );

    // Track user connection
    connectedUsers.set(userId, {
      socketId: socket.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${userId}, Reason: ${reason}`);
      connectedUsers.delete(userId);
    });
  });

  return io;
}

/**
 * Emit money transfer event to recipient
 * @param io - Socket.IO server instance
 * @param transaction - Transaction details
 * @param senderUser - Sender user details
 * @param recipientUser - Recipient user details
 */
function notifyMoneyTransfer(
  io: Server,
  transaction: { amount: number; createdAt: Date },
  senderUser: { id: string; firstName: string; lastName: string },
  recipientUser: { id: string; firstName: string; lastName: string },
  videoRoomId: string
) {
  // Safety check for serverless environments
  if (!io) {
    console.log("Socket.IO instance not available, skipping notification");
    return;
  }

  try {
    // Check if users map exists in serverless context
    if (!connectedUsers || typeof connectedUsers.get !== "function") {
      console.log("Connected users map not available, skipping notification");
      return;
    }

    const videoCallUrl = `https://meet.jit.si/${videoRoomId}`;

    const recipientConnection = connectedUsers.get(recipientUser.id);

    if (recipientConnection && recipientConnection.socketId) {
      // Emit to recipient that they received money
      try {
        io.to(recipientConnection.socketId).emit("money-transfer", {
          from: `${senderUser.firstName} ${senderUser.lastName}`,
          amount: transaction.amount,
          timestamp: transaction.createdAt,
          videoCallUrl,
        });
        console.log(`Notification sent to recipient ${recipientUser.id}`);
      } catch (emitError) {
        console.error("Error emitting to recipient:", emitError);
      }
    } else {
      console.log(
        `Recipient ${recipientUser.id} not connected or has invalid socket ID`
      );
    }

    const senderConnection = connectedUsers.get(senderUser.id);

    if (senderConnection && senderConnection.socketId) {
      // Emit to sender that they sent money
      try {
        io.to(senderConnection.socketId).emit("money-sent", {
          to: `${recipientUser.firstName} ${recipientUser.lastName}`,
          amount: transaction.amount,
          timestamp: transaction.createdAt,
          videoCallUrl,
        });
        console.log(`Notification sent to sender ${senderUser.id}`);
      } catch (emitError) {
        console.error("Error emitting to sender:", emitError);
      }
    } else {
      console.log(
        `Sender ${senderUser.id} not connected or has invalid socket ID`
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notifyMoneyTransfer:", errorMessage);
  }
}

/**
 * Check if a specific user is connected
 * @param userId - User ID to check
 * @returns True if user is connected, false otherwise
 */
function isUserConnected(userId: string): boolean {
  try {
    // Safety check for serverless environments
    if (!connectedUsers || typeof connectedUsers.has !== "function") {
      console.log("Connected users map not available in isUserConnected");
      return false;
    }
    return connectedUsers.has(userId);
  } catch (error) {
    console.error("Error checking if user is connected:", error);
    return false;
  }
}

export { initializeSocketServer, notifyMoneyTransfer, isUserConnected };
