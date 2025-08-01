import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";

import authRoutes from "./routes/authRoutes";
import accountsRoutes from "./routes/accountsRoutes";
import transactionsRoutes from "./routes/transactionsRoutes";
import usersRoutes from "./routes/usersRoutes";

dotenv.config();

const app = express();
// Configure CORS to accept requests from the client
app.use(
  cors({
    origin: [process.env.FRONTEND_URL!],
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

const httpPort = process.env.HTTP_PORT;
http.createServer(app).listen(httpPort, () => {
  console.log(`HTTP server running at http://localhost:${httpPort}`);
});
