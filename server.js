import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { sendMessage } from "./src/contollers/chatController.js";
import chatRoutes from "./src/routes/chat.js";
import authRoutes from "./src/routes/auth.js";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", credentials: true } });

// ----------------------
// Middleware
// ----------------------
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static("public")); // serve frontend files

// ----------------------
// Routes
// ----------------------
app.get("/", (req, res) => res.send("ChatterUp API Running 🚀"));
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);

// ----------------------
// MongoDB connection
// ----------------------
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.log("❌ MongoDB connection error:", err));

// ----------------------
// Socket.io events
// ----------------------
let onlineUsers = [];

// Middleware to verify token for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error"));

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error("Authentication error"));
    socket.user = decoded; // store user info in socket
    next();
  });
});

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket.id})`);

  // Add user to onlineUsers
  onlineUsers.push({ id: socket.id, name: socket.user.name });
  io.emit("updateUsers", onlineUsers.map(u => u.name));

  socket.on("sendMessage", async (data) => {
    await sendMessage({ ...data, senderId: socket.user._id }, io);
  });

  socket.on("typing", () => {
    socket.broadcast.emit("userTyping", socket.user.name);
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter(u => u.id !== socket.id);
    io.emit("updateUsers", onlineUsers.map(u => u.name));
    console.log(`User disconnected: ${socket.user.name}`);
  });
});

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
