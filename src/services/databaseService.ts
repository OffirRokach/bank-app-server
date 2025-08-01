import { PrismaClient } from "@prisma/client";

// Create a singleton instance of PrismaClient
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "info", "warn", "error"]
      : ["error"],
});

// Handle graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  console.log("Disconnected from the database");
});

export default prisma;
