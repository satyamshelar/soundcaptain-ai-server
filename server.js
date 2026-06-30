import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "1mb" }));

const hasKey = Boolean(process.env.OPENAI_API_KEY);
const openai = hasKey ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `
You are Sound Captain AI, a professional PA tuning assistant for live sound engineers.
Reply mainly in Marathi/Hinglish when the user asks in Marathi/Hinglish.
Give practical, safe, step-by-step guidance for:
- DBX260 / PA2 / DSP setup
- limiter, crossover slope, HPF/LPF
- bass weak diagnosis
- delay alignment, polarity, phase
- RTA, frequency chart, reports
Do not give fake certainty. Ask for needed values like amp watts, ohms, speaker RMS, crossover point when required.
Keep answers clear and field-ready.
`;

function offlineAnswer(message = "") {
  const m = String(message).toLowerCase();
  if (m.includes("bass") || m.includes("base") || m.includes("weak")) {
    return "Bass weak असल्यास आधी polarity +/- तपासा, crossover 80Hz LR24 ठेवा, bass HPF 35Hz BW24/LR24 ठेवा, tops मध्ये 80Hz खाली cut करा, आणि bass-top delay alignment करा. 2 bass 2 top मध्ये bass मागे जास्त आणि पुढे कमी येत असेल तर placement/cardioid cancellation किंवा polarity issue असू शकतो.";
  }
  if (m.includes("xover") || m.includes("crossover") || m.includes("slope")) {
    return "Safe starting point: Bass LPF 80Hz LR24, Top/Low-mid HPF 80Hz LR24. HF साठी driver नुसार HPF ठेवा. Phase match साठी crossover point वर polarity आणि delay तपासा.";
  }
  if (m.includes("limiter") || m.includes("dbx")) {
    return "DBX260 limiter सेट करताना speaker RMS, ohm, amp power आणि amp sensitivity लागते. साधारण OverEasy OFF, PeakStop+ ON, bass attack थोडा slow आणि HF attack fast ठेवा. चुकीचा limiter driver खराब करू शकतो.";
  }
  return "Sound Captain local guide: तुमचा प्रश्न PA tuning बद्दल आहे. Accurate उत्तरासाठी speaker RMS, ohm, amp watt, crossover frequency, DSP model आणि system layout सांगा.";
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Sound Captain AI Server",
    status: "running",
    endpoint: "/api/chat",
    openai_key_loaded: hasKey
  });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, status: "healthy", openai_key_loaded: hasKey });
});

app.post("/api/chat", async (req, res) => {
  try {
    const body = req.body || {};
    const userMessage = body.message || body.question || body.prompt || body.text || "";

    if (!userMessage || String(userMessage).trim().length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Message is required",
        answer: "कृपया AI ला प्रश्न लिहा."
      });
    }

    if (!hasKey) {
      const ans = offlineAnswer(userMessage);
      return res.json({ ok: true, mode: "local_fallback", answer: ans, reply: ans, text: ans });
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.35,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: String(userMessage) }
      ]
    });

    const ans = completion.choices?.[0]?.message?.content || "AI कडून उत्तर मिळाले नाही.";
    res.json({ ok: true, mode: "online", answer: ans, reply: ans, text: ans });
  } catch (error) {
    const ans = "AI server error आला. Render Environment मध्ये OPENAI_API_KEY नीट आहे का तपासा.";
    res.status(500).json({ ok: false, error: error.message, answer: ans, reply: ans, text: ans });
  }
});

app.listen(PORT, () => {
  console.log(`Sound Captain AI Server running on port ${PORT}`);
});
