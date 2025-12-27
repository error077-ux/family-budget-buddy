import express from "express";
import cors from "cors";

import { bot } from "./bot.js";     // initializes Telegram bot
import "./telegram/handlers.js";    // attaches Telegram handlers

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
