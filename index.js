import pkg from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import fetch from "node-fetch";
import "dotenv/config";
import { getContext } from "./lib/context.js";
import iaBlockedNumbers from "./lib/blocked.js";

const { Client, LocalAuth } = pkg;

const sessions = new Map();
const INVISIBLE_MARKER = '\u200B\u200C\u200D\u2060';
const MAX_HISTORY_MESSAGES = 12;
const MAX_GROQ_ATTEMPTS = 3;

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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelayMs(response, data, attempt) {
  const retryAfter = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.ceil(retryAfter * 1000);
  }

  const message = data?.error?.message || "";
  const match = message.match(/try again in ([\d.]+)s/i);
  if (match) return Math.ceil(Number(match[1]) * 1000);

  return 2000 * attempt;
}

async function sendIA(chatId, text) {
  const textWithMarker = `${text}${INVISIBLE_MARKER}`;
  const sent = await client.sendMessage(chatId, textWithMarker);

  // Some whatsapp-web.js/client combinations return undefined even when the
  // message was sent successfully. The invisible marker is the reliable way
  // message_create identifies AI messages, so this property is only a backup.
  if (sent && (typeof sent === "object" || typeof sent === "function")) {
    sent.__fromAI = true;
  }

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
Default to Spanish unless the user's latest message is clearly written in English.
For Spanish responses, always use the official course names "Primer nivel", "Segundo nivel", "Protección VIP" and "Reentrenamiento"; never use "Level I", "Level II" or "Re-training".

REACTIVATION BEHAVIOR:
- When the user reactivates the assistant (for example by sending phrases such as "hablar con ia", "activar ia" or simply "IA"), the assistant must begin its next message with a short, natural return confirmation such as "🤖 Estoy de vuelta — ¿En qué te ayudo?" or an equivalent brief phrase in the user's language. Keep this greeting concise and friendly, then continue with the assistance.
`;

  const body = {
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.slice(-MAX_HISTORY_MESSAGES)
    ],
    temperature: 0.7,
    max_tokens: 512
  };

  try {
    for (let attempt = 1; attempt <= MAX_GROQ_ATTEMPTS; attempt += 1) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (response.ok) {
        return data.choices?.[0]?.message?.content || "Sin respuesta.";
      }

      console.error("Groq API Error:", data);

      if (response.status === 429 && attempt < MAX_GROQ_ATTEMPTS) {
        const delayMs = getRetryDelayMs(response, data, attempt);
        console.log(`⏳ Límite temporal de Groq; reintento ${attempt + 1}/${MAX_GROQ_ATTEMPTS} en ${delayMs} ms.`);
        await wait(delayMs);
        continue;
      }

      const error = new Error(`Groq API: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
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
    const reactivationMessage = "🤖 Estoy de vuelta — Soy el asistente virtual de Orionacademy CIA. LTDA. - Escuela para guardias. ¿En que te ayudo? 📍 Estamos ubicados en Ambato, Calle 7 y Av. Confraternidad junto a Molinos Casari.";

    try {
      session.history.push({ role: "assistant", content: reactivationMessage });
      await sendIA(user, reactivationMessage);
      console.log(`✅ IA activada para: ${user}`);
      return;
    } catch (err) {
      console.error(`IA reactivation error for ${user}:`, err);
      // Technical errors must not message the user or disable the AI.
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
  session.history = session.history.slice(-MAX_HISTORY_MESSAGES);

  let reply;
  try {
    reply = await callIA(session.history, user);
  } catch (err) {
    console.error(`IA processing error for ${user}:`, err);
    // Keep the AI active and silently try again on the user's next message.
    return;
  }

  // If callIA returned null it means the user is blocked and we should not send a reply
  if (reply == null) {
    return;
  }

  session.history.push({ role: "assistant", content: reply });
  session.history = session.history.slice(-MAX_HISTORY_MESSAGES);

  await sendIA(user, reply);
});

client.initialize();
