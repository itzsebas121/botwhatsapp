const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('📲 Escanea el QR para iniciar sesión');
});

client.on('ready', () => {
  console.log('✅ Bot conectado y listo');
});

const sessions = {};

const saludosValidos = ['hola', 'buenas tardes', 'buenas noches', 'buen día', 'buenos días'];

function contieneSaludo(texto) {
  texto = texto.toLowerCase();
  return saludosValidos.some(saludo => texto.includes(saludo));
}

client.on('message', async (message) => {
  
  // 1. Chequeo básico con el ID del chat (caso más común)
  if (message.from.includes('-')) {
    return;
  }

  // 2. Chequeo usando getChat() para detectar si es grupo
  const chat = await message.getChat();
  if (chat.isGroup || chat.isGroupMsg) {
    return;
  }

  // 3. Opcional: si quieres estar aún más seguro, chequea si el contacto es grupo
  const contact = await message.getContact();
  if (contact.isGroup) {
    return;
  }

  // Si pasa estas validaciones, es chat individual -> continuar con la lógica

  const chatId = message.from;
  const texto = message.body.toLowerCase().trim();
  const nombre = contact.pushname || 'amigo';

  if (!sessions[chatId]) {
    sessions[chatId] = { menu: null, enContacto: false };
  }
  const session = sessions[chatId];

  // Si el usuario está en contacto con asesor, solo reactivamos con saludo
  if (session.enContacto) {
    if (contieneSaludo(texto)) {
      session.enContacto = false;
      session.menu = 'principal';
      await message.reply(`👋 Hola ${nombre}, bienvenido de nuevo a *OrionAcademy*.`);
      return mostrarMenuPrincipal(message, session);
    }
    return; // no responde si está en contacto con asesor
  }

  // Si no ha iniciado sesión (menu=null) solo responde si contiene saludo
  if (session.menu === null && !contieneSaludo(texto)) {
    return; // no responde si no saluda para empezar
  }

  // Función para mostrar menú principal
  async function mostrarMenuPrincipal(msg, sess) {
    sess.menu = 'principal';
    await msg.reply(
      `👋 Hola ${nombre}, bienvenido a *OrionAcademy*, centro de formación y capacitación en seguridad.\n\n` +
      `Selecciona una opción respondiendo con el número:\n` +
      `1️⃣ Cursos Básicos\n` +
      `2️⃣ Especializaciones\n` +
      `3️⃣ Contactar asesor\n` +
      `4️⃣ Salir`
    );
  }

  // Menú principal
  if (session.menu === 'principal') {
    if (texto === '1') {
      session.menu = 'basicos';
      return await message.reply(
        `📚 *Cursos Básicos disponibles:*\n\n` +
        `1️⃣ Primer Nivel - Vigilancia Fija\n` +
        `2️⃣ Segundo Nivel - Vigilancia Móvil\n` +
        `3️⃣ Reentrenamiento\n\n` +
        `*Escribe el número para más info* o '0' para regresar al menú principal.`
      );
    }
    if (texto === '2') {
      session.menu = 'especializaciones';
      return await message.reply(
        `🎯 *Especializaciones disponibles:*\n\n` +
        `1️⃣ Supervisor de Seguridad\n` +
        `2️⃣ Operadores de Consolas de CC.TV\n` +
        `3️⃣ Seguridad Financiera\n` +
        `4️⃣ Bares y Restaurantes\n` +
        `5️⃣ Carga Crítica\n` +
        `6️⃣ Custodia y Transporte de Valores\n` +
        `7️⃣ Escoltas y Seguridad VIP\n\n` +
        `*Escribe el número para más info* o '0' para regresar al menú principal.`
      );
    }
    if (texto === '3') {
      session.enContacto = true;
      return await message.reply(
        `📲 Perfecto ${nombre}, un asesor se pondrá en contacto contigo pronto.\n` +
        `*Mientras tanto, el asistente no responderá más mensajes.*\n\n` +
        `Si quieres volver al menú en otro momento, envía un saludo como "hola" o "buenos días".`
      );
    }
    if (texto === '4' || texto === 'salir') {
      session.menu = null;  // resetea menú para obligar saludo para reingresar
      return await message.reply(`👋 Gracias por comunicarte con OrionAcademy, ${nombre}. ¡Hasta pronto!`);
    }
    return;
  }

  // Menú cursos básicos
  if (session.menu === 'basicos') {
    if (texto === '0') {
      return mostrarMenuPrincipal(message, session);
    }
    if (texto === '1') {
      return await message.reply(
        `📌 *Curso Primer Nivel - Vigilancia Fija*\n` +
        `COTIZACIÓN\n` +
        `Contado: $190.00 (incluye polígono virtual de tiro).\n` +
        `Crédito:  $230.00 (incluye polígono virtual de tiro).\n` +
        `Valor incluye IVA.\n\n` +
        `*Escribe '0' para regresar.*`
      );
    }
    if (texto === '2') {
      return await message.reply(
        `📌 *Curso Segundo Nivel - Vigilancia Móvil*\n` +
        `COTIZACIÓN\n` +
        `Contado: $250.00 (incluye polígono de tiro virtual y real).\n` +
        `Crédito:  $300.00 (incluye polígono de tiro virtual y real).\n` +
        `Valor incluye IVA.\n\n` +
        `*Escribe '0' para regresar.*`
      );
    }
    if (texto === '3') {
      return await message.reply(
        `📌 *Curso Reentrenamiento*\n` +
        `COTIZACIÓN\n` +
        `Contado: $20.00 (incluye polígono virtual de tiro).\n` +
        `Valor incluye IVA.\n\n` +
        `*Escribe '0' para regresar.*`
      );
    }
    return;
  }

  // Menú especializaciones
  if (session.menu === 'especializaciones') {
    if (texto === '0') {
      return mostrarMenuPrincipal(message, session);
    }
    switch (texto) {
      case '1':
        return await message.reply(
          `🎯 *Especialización Supervisor de Seguridad*\n` +
          `COTIZACIÓN\n` +
          `Contado: $160.00 (incluye polígono virtual de tiro).\n` +
          `Crédito:  $190.00 (incluye polígono virtual de tiro).\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '2':
        return await message.reply(
          `🎯 *Especialización Operadores de Consolas de CC.TV*\n` +
          `COTIZACIÓN\n` +
          `Contado: $120.00 (incluye polígono virtual de tiro).\n` +
          `Crédito:  $160.00 (incluye polígono virtual de tiro).\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '3':
        return await message.reply(
          `🎯 *Especialización Seguridad Financiera*\n` +
          `COTIZACIÓN\n` +
          `Contado: $110.00 (incluye polígono virtual de tiro).\n` +
          `Crédito:  $160.00 (incluye polígono virtual de tiro).\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '4':
        return await message.reply(
          `🎯 *Especialización Bares y Restaurantes*\n` +
          `COTIZACIÓN\n` +
          `Contado: $180.00 (incluye polígono virtual de tiro).\n` +
          `Crédito:  $240.00 (incluye polígono virtual de tiro).\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '5':
        return await message.reply(
          `🎯 *Especialización Carga Crítica*\n` +
          `COTIZACIÓN\n` +
          `Contado: $350.00 (incluye polígono virtual y real de tiro, instructor, escenarios, arma, equipo, munición).\n` +
          `Crédito:  $400.00 (incluye polígono virtual y real de tiro, instructor, escenarios, arma, equipo, munición).\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '6':
        return await message.reply(
          `🎯 *Especialización Custodia y Transporte de Valores*\n` +
          `COTIZACIÓN\n` +
          `Contado: $350.00 (incluye polígono virtual y real de tiro, instructor, escenarios, arma, equipo, munición).\n` +
          `Crédito:  $400.00 (incluye polígono virtual y real de tiro, instructor, escenarios, arma, equipo, munición).\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '7':
        return await message.reply(
          `🎯 *Especialización Escoltas y Seguridad VIP*\n` +
          `COTIZACIÓN\n` +
          `Contado: $350.00 (incluye polígono virtual y real de tiro, instructor, escenarios, arma, equipo, munición).\n` +
          `Crédito:  $400.00 (incluye polígono virtual y real de tiro, instructor, escenarios, arma, equipo, munición).\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      default:
        return;
    }
  }

  // Si el usuario escribe saludo en cualquier otro caso, mostramos menú principal
  if (contieneSaludo(texto)) {
    return mostrarMenuPrincipal(message, session);
  }
});

client.initialize();
