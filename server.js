import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function pickUserText(body = {}) {
  if (typeof body === "string") return body;
  return (
    body.message ||
    body.question ||
    body.prompt ||
    body.text ||
    body.query ||
    body.input ||
    body.userMessage ||
    ""
  ).toString();
}

function localFallback(text) {
  const q = text.toLowerCase();
  if (q.includes("bass") || q.includes("base")) {
    return "Bass weak असेल तर polarity +/− तपासा, crossover 80Hz LR24 ठेवा, bass delay 0–3ms मध्ये test करा, limiter जास्त tight नसेल याची खात्री करा, आणि bass/top crossover point वर RTA मध्ये cancellation आहे का पाहा.";
  }
  if (q.includes("dbx") || q.includes("limiter")) {
    return "DBX260 limiter साठी amp power, speaker RMS, ohm आणि amp gain/sensitivity नुसार threshold set करा. OverEasy OFF ठेवा, bass attack थोडा slow आणि HF attack fast ठेवा.";
  }
  if (q.includes("xover") || q.includes("crossover") || q.includes("slope")) {
    return "PA tuning साठी safe crossover slope LR24 वापरा. Bass LPF आणि Top/Low-mid HPF same frequency ठेवा. HF साठी LR48 जास्त safe असू शकतो.";
  }
  return "मी Sound Captain AI आहे. PA tuning, DBX260 limiter, crossover, alignment, RTA आणि bass weak problem साठी प्रश्न विचारा.";
}

app.get("/", (req, res) => {
  res.json({ ok: true, name: "Sound Captain Gemini AI Server", endpoint: "/api/chat" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, provider: "gemini", hasKey: Boolean(GEMINI_API_KEY) });
});

app.post("/api/chat", async (req, res) => {
  try {
    const userText = pickUserText(req.body);
    if (!userText.trim()) {
      return res.json({
        answer: "कृपया प्रश्न लिहा.",
        reply: "कृपया प्रश्न लिहा.",
        text: "कृपया प्रश्न लिहा.",
        message: "कृपया प्रश्न लिहा."
      });
    }

    if (!GEMINI_API_KEY) {
      const fb = localFallback(userText);
      return res.json({ answer: fb, reply: fb, text: fb, message: fb, offline: true });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are Sound Captain AI, a practical PA system tuning expert for Indian live sound engineers. Answer mainly in simple Marathi mixed with Hindi/English sound terms. Give clear field steps. Topics: DBX260, PA2, limiter, crossover, LR24/LR48, delay alignment, polarity, RTA, bass weak, 4 bass 8 top, amps, DSP.\n\nUser question: ${userText}`;

    const result = await model.generateContent(prompt);
    const output = result.response.text() || localFallback(userText);

    res.json({
      answer: output,
      reply: output,
      text: output,
      message: output,
      success: true
    });
  } catch (err) {
    console.error(err);
    const fb = localFallback(pickUserText(req.body));
    res.status(200).json({ answer: fb, reply: fb, text: fb, message: fb, fallback: true, error: err.message });
  }
});

app.listen(PORT, () => console.log(`Sound Captain Gemini AI Server running on port ${PORT}`));
