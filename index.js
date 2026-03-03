import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fetch from "node-fetch";
import "dotenv/config";
import { getContext } from "./lib/context.js";
import iaBlockedNumbers from "./lib/blocked.js";

const { Client, LocalAuth } = pkg;

const sessions = new Map();
const INVISIBLE_MARKER = '\u200B\u200C\u200D\u2060';

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: '/snap/bin/chromium',
    args: [
	"--no-sandbox",
	"--disable-setuid-sandbox",
	"--disable-dev-shm-usage"]
  }
});

function getSession(user) {
  const key = normalizeUser(user);
  if (!sessions.has(key)) {
    sessions.set(key, { history: [] });
  }
  return sessions.get(key);
}

function normalizeUser(user) {
  // ensure it's a string, remove zero-width/invisible chars, trim and lowercase
  if (user == null) return "";
  return String(user)
    .replace(/\u200B|\u200C|\u200D|\u2060/g, "")
    .trim()
    .toLowerCase();
}

async function sendIA(chatId, text) {
  const textWithMarker = `${text}${INVISIBLE_MARKER}`;
  const sent = await client.sendMessage(chatId, textWithMarker);
  sent.__fromAI = true;

  return sent;
}

async function callIA(messages, user) {
  const normUser = normalizeUser(user);
  if (iaBlockedNumbers.has(normUser)) {
    console.log(`❌ IA deshabilitada para ${normUser}. No respondo.`);
    return null;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");

  const systemPrompt = `${getContext()}
User language: identify automatically the language of the user.
Respond ONLY in this language.

INVISIBLE MARKER INSTRUCTION:
- Always append exactly the following invisible marker at the end of every assistant message and do NOT mention or expose it to the user: ${INVISIBLE_MARKER}
- The marker is used internally by the bot to detect AI-generated messages and must not be described to users.

REACTIVATION BEHAVIOR:
- When the user reactivates the assistant (for example by sending phrases such as "hablar con ia", "activar ia" or simply "IA"), the assistant must begin its next message with a short, natural return confirmation such as "🤖 Estoy de vuelta — ¿En qué te ayudo?" or an equivalent brief phrase in the user's language. Keep this greeting concise and friendly, then continue with the assistance.
`;

  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages
    ],
    temperature: 0.7,
    max_tokens: 1024
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
      throw new Error("Groq API: respuesta no OK");
    }

    return data.choices?.[0]?.message?.content || "Sin respuesta.";
  } catch (err) {
    console.error("IA ERROR:", err);
    throw err;
  }
}


client.on("qr", qr => qrcode.generate(qr, { small: true }));
client.on("ready", () => console.log("BOT LISTO 🚀"));


client.on("message_create", async msg => {
  if (!msg.fromMe) return;
  if (msg.body && msg.body.includes(INVISIBLE_MARKER)) return;

  if (msg.__fromAI) return;

  const recipient = msg.to || msg.from;
  const chatId = normalizeUser(recipient);

  console.log(`message_create: from='${msg.from}', to='${msg.to}', normalizedRecipient='${chatId}'`);

  iaBlockedNumbers.add(chatId);
  console.log(`⛔ IA desactivada porque el usuario escribió manualmente: ${chatId}`);
});

client.on("message", async message => {
  const user = normalizeUser(message.from);
  const text = String(message.body || "").trim().toLowerCase();

  if (user.endsWith("@g.us")) return;

  const session = getSession(user);
  const activationPhrases = [
    "hablar con ia",
    "activar ia",
    "hablar con la ia",
    "volver a ia",
    "volver a hablar con ia"
  ];

  const containsIAWord = /\bia\b/i.test(text);

  const containsActivation = activationPhrases.some(p => text.includes(p)) || containsIAWord;

  if (containsActivation) {
    iaBlockedNumbers.delete(user);

    // Send the fixed reactivation message
    const reactivationMessage = "🤖 Estoy de vuelta — Bienvenido a Orion Academy, ¿En qué te ayudo? 📍 Estamos ubicados en Ambato, Calle 7 y Av. Confraternidad Junto a Molinos casari.";

    try {
      session.history.push({ role: "assistant", content: reactivationMessage });
      await sendIA(user, reactivationMessage);
      console.log(`✅ IA activada para: ${user}`);
      return;
    } catch (err) {
      console.error(`IA reactivation error for ${user}:`, err);
      // Inform user and block IA for this number
      try {
        await sendIA(user, "Lo siento, en este momento no puedo procesar tu solicitud con la IA. Un asesor se comunicará contigo lo antes posible. Mientras tanto, te conectaré con un asesor humano.");
      } catch (e) {
        console.error("Error sending fallback message:", e);
      }
      iaBlockedNumbers.add(user);
      return;
    }
  }

  // -----------------------------------------------------
  // IA DESACTIVADA
  // -----------------------------------------------------
  if (iaBlockedNumbers.has(user)) {
    console.log(`❌ IA deshabilitada para ${user}. No respondo.`);
    return;
  }

  // -----------------------------------------------------
  // DESACTIVAR IA MANUALMENTE
  // -----------------------------------------------------
  const disableCommands = [
    "hablar con persona",
    "quiero hablar con alguien",
    "hablar con un asesor",
    "hablar con secretaria",
  ];

  // additional single-word matches for common phrases
  const disableWordRegex = /\b(asesor|asesora|secretari[ao]|representante|asesoría|asesoria)\b/i;

  if (disableCommands.some(cmd => text.includes(cmd)) || disableWordRegex.test(text)) {
    await sendIA(
      user,
      "Escribe cualquiera de estas palabras para conectarte con un asesor:\n\n• asesor\n• humano\n• agente\n• soporte\n• secretario\n• representante\n• hablar con persona\n\nO escribe algo relacionado con hablar con un asesor.\n\nUna persona de nuestro equipo se contactará contigo para atenderte 📞"
    );

    iaBlockedNumbers.add(user);
    return;
  }

  session.history.push({ role: "user", content: text });

  let reply;
  try {
    reply = await callIA(session.history, user);
  } catch (err) {
    console.error(`IA processing error for ${user}:`, err);
    try {
      await sendIA(user, "Lo siento, en este momento no puedo procesar tu solicitud con la IA. Un asesor se comunicará contigo lo antes posible.");
    } catch (e) {
      console.error("Error sending fallback message:", e);
    }
    iaBlockedNumbers.add(user);
    return;
  }

  // If callIA returned null it means the user is blocked and we should not send a reply
  if (reply == null) {
    return;
  }

  session.history.push({ role: "assistant", content: reply });

  await sendIA(user, reply);
});

client.initialize();
