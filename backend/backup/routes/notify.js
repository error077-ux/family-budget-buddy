import express from "express";
import { bot } from "../bot.js";

const router = express.Router();

/**
 * POST /api/notify
 * body: { chatId, message }
 */
router.post("/", async (req, res) => {
  const { chatId, message } = req.body;

  if (!chatId || !message) {
    return res.status(400).json({ error: "chatId and message required" });
  }

  try {
    await bot.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
