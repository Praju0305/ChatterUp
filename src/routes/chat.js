import express from "express";
import Message from "../models/message.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const messages = await Message.find().populate("sender", "name profilePic").sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: "Error fetching messages" });
  }
});

export default router;
