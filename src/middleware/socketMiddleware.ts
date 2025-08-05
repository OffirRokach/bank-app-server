import jwt from "jsonwebtoken";
import { Server, Socket } from "socket.io";
import http from "http";
import { User, JwtPayload } from "../types";

// Define types for user connections
interface ConnectedUser {
  socketId: string;
  firstName: string;
  lastName: string;
  email: string;
}

// Define extended socket interface with user properties
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
function initializeSocketServer(server: http.Server, userService: any) {
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

      // Cast the socket to include our custom properties
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
  recipientUser: { id: string; firstName: string; lastName: string }
) {
  try {
    const recipientConnection = connectedUsers.get(recipientUser.id);

    if (recipientConnection) {
      // Emit to recipient that they received money
      io.to(recipientConnection.socketId).emit("money-transfer", {
        from: `${senderUser.firstName} ${senderUser.lastName}`,
        amount: transaction.amount,
        timestamp: transaction.createdAt,
      });
    }

    const senderConnection = connectedUsers.get(senderUser.id);

    if (senderConnection) {
      // Emit to sender that they sent money
      io.to(senderConnection.socketId).emit("money-sent", {
        to: `${recipientUser.firstName} ${recipientUser.lastName}`,
        amount: transaction.amount,
        timestamp: transaction.createdAt,
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error emitting money transfer event:", errorMessage);
  }
}

/**
 * Check if a specific user is connected
 * @param userId - User ID to check
 * @returns True if user is connected, false otherwise
 */
function isUserConnected(userId: string): boolean {
  return connectedUsers.has(userId);
}

export { initializeSocketServer, notifyMoneyTransfer, isUserConnected };
