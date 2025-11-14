import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fetch from "node-fetch";
import "dotenv/config";
import { getContext } from "./lib/context.js";

const { Client, LocalAuth } = pkg;
const language = "en"
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }
});


// ---------------------------------------------
// 🔥 Llamada a la IA (Groq)
// ---------------------------------------------
async function callIA(messages) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return "Error: GROQ_API_KEY no configurada.";
  }


  const systemPrompt = `${getContext()}
User language: identify automatically the language of the user.
Respond ONLY in this language.`;

  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 1024,
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API Error:", data);
      return language === "es"
        ? "Lo siento, tuve un problema procesando tu mensaje."
        : "Sorry, I had an issue processing your message.";
    }

    return data.choices?.[0]?.message?.content || "Sin respuesta.";
  } catch (error) {
    console.error("IA ERROR:", error);
    return "Error inesperado al procesar tu mensaje.";
  }
}

// ---------------------------------------------
// 🔥 Manejo de sesiones
// ---------------------------------------------
const sessions = new Map();

function getSession(user) {
  if (!sessions.has(user)) {
    sessions.set(user, { history: [] });
  }
  return sessions.get(user);
}

// --------------------------------------------------
// 🔥 WhatsApp BOT
// --------------------------------------------------
client.on("qr", qr => qrcode.generate(qr, { small: true }));

client.on("ready", () => {
  console.log("BOT LISTO 🚀");
});

client.on("message", async message => {
  const user = message.from;
  const text = message.body.trim();
  const session = getSession(user);

  session.history.push({ role: "user", content: text });

  const reply = await callIA(session.history);

  session.history.push({ role: "assistant", content: reply });

  await message.reply(reply);
});

// ---------------------------------------------
client.initialize();
