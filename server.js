const express = require("express");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Only create the AI client if a key exists, so the website still runs without one
const client = process.env.OPENAI_API_KEY
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

if (!client) {
    console.warn("OPENAI_API_KEY is not set. The site will run, but the chatbot will use offline answers only.");
}

app.use(express.json({ limit: "10kb" }));

// Serve ONLY the public folder (keeps server.js, .env and package files private)
app.use(express.static(path.join(__dirname, "public")));

// Simple per-IP rate limit: 20 questions per minute (protects your API bill)
const hits = new Map();
function rateLimit(req, res, next) {
    const now = Date.now();
    const windowMs = 60 * 1000;
    const entry = (hits.get(req.ip) || []).filter(t => now - t < windowMs);
    if (entry.length >= 20) {
        return res.status(429).json({ reply: "You're asking questions very quickly. Please wait a moment and try again." });
    }
    entry.push(now);
    hits.set(req.ip, entry);
    next();
}
setInterval(() => hits.clear(), 10 * 60 * 1000).unref();

const INSTRUCTIONS = `
You are SmartMoney Helper, a friendly financial education assistant for South African users.

Explain budgeting, saving, debt management, student funding, bursaries, NSFAS, and financial safety in simple language.

Use South African rand (R) when relevant. Give general educational information, not guaranteed financial outcomes.

Keep answers short and clear (under about 150 words) unless the user asks for more detail.

Never ask users for passwords, PINs, or banking security codes. Do not claim to be a financial adviser.
`;

// AI chatbot endpoint
app.post("/api/chat", rateLimit, async (req, res) => {
    try {
        const message = req.body && req.body.message;

        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ reply: "Please enter a money question." });
        }
        if (message.length > 500) {
            return res.status(400).json({ reply: "Please keep your question under 500 characters." });
        }
        if (!client) {
            return res.status(503).json({ reply: "The AI helper is not set up yet." });
        }

        const response = await client.responses.create({
            model: "gpt-4.1-mini",
            instructions: INSTRUCTIONS,
            input: message.trim()
        });

        res.json({ reply: response.output_text });

    } catch (error) {
        console.error("Chatbot error:", error.message);
        res.status(500).json({ reply: "Sorry, I could not answer right now. Please try again." });
    }
});

app.listen(PORT, () => {
    console.log(`SmartMoney is running at http://localhost:${PORT}`);
});
