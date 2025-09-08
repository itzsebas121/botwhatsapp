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

const saludosValidos = ['hola', 'buenas tardes', 'buenas', 'buenas noches', 'buen día', 'buen dia', 'buenos días', 'buenos dias', 'saludos', 'hey', 'hi', 'hello', 'info', 'informacion', 'información'];

function contieneSaludo(texto) {
  texto = texto.toLowerCase();
  return saludosValidos.some(saludo => texto.includes(saludo));
}

client.on('message', async (message) => {
  if (message.from.includes('-')) {
    return;
  }

  const chat = await message.getChat();
  if (chat.isGroup || chat.isGroupMsg) {
    return;
  }

  const contact = await message.getContact();
  if (contact.isGroup) {
    return;
  }

  const chatId = message.from;
  const texto = message.body.toLowerCase().trim();
  const nombre = contact.pushname || 'amigo';

  if (!sessions[chatId]) {
    sessions[chatId] = { menu: null, enContacto: false };
  }
  const session = sessions[chatId];

  if (session.enContacto) {
    if (contieneSaludo(texto)) {
      session.enContacto = false;
      session.menu = 'principal';
      await message.reply(`👋 Hola ${nombre}, bienvenido de nuevo a *OrionAcademy*.`);
      return mostrarMenuPrincipal(message, session);
    }
    return;
  }

  if (session.menu === null && !contieneSaludo(texto)) {
    return;
  }

  async function mostrarMenuPrincipal(msg, sess) {
    sess.menu = 'principal';
    await msg.reply(
      `👋 Hola ${nombre}, bienvenido a *OrionAcademy*, centro de formación y capacitación en seguridad privada.\n\n` +
      `📚 Selecciona una opción respondiendo con el número:\n` +
      `1️⃣ Cursos Básicos\n` +
      `2️⃣ Especializaciones\n` +
      `3️⃣ Combos\n` +
      `4️⃣ Contactar a un asesor\n` +
      `5️⃣ Salir\n\n` +
      `📍 *Estamos ubicados en Ambato, Av. Confraternidad y Calle 7.*\n` +
      `🔗 [Ver ubicación en Google Maps](https://n9.cl/n9pkf)\n\n` +
      `¡Te esperamos para iniciar tu formación profesional!`
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
      session.menu = 'combos';
      return await message.reply(
        `🎁 *Combos disponibles:*\n\n` +
        `1️⃣ Combo 1: Primer Nivel + Reentrenamiento + Manejo de Consolas\n` +
        `2️⃣ Combo 2: Segundo Nivel + Supervisor de Seguridad\n` +
        `3️⃣ Combo 3: Bares y Restaurantes + Control de Eventos Públicos + Seguridad Financiera\n\n` +
        `*Escribe el número para más info* o '0' para regresar al menú principal.`
      );
    }
    if (texto === '4') {
      session.enContacto = true;
      return await message.reply(
        `📲 Perfecto ${nombre}, un asesor se pondrá en contacto contigo pronto.\n` +
        `*Mientras tanto, el asistente no responderá más mensajes.*\n\n` +
        `Si quieres volver al menú en otro momento, envía un saludo como "hola" o "buenos días".`
      );
    }
    if (texto === '5' || texto === 'salir') {
      session.menu = null;
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

  // Menú combos
  if (session.menu === 'combos') {
    if (texto === '0') {
      return mostrarMenuPrincipal(message, session);
    }
    switch (texto) {
      case '1':
        return await message.reply(
          `🎁 *Combo 1*\n` +
          `Incluye: Curso Primer Nivel + Reentrenamiento + Manejo de Consolas.\n` +
          `COTIZACIÓN:\n` +
          `Contado: $300.00\n` +
          `Crédito:  $350.00\n\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '2':
        return await message.reply(
          `🎁 *Combo 2*\n` +
          `Incluye: Curso Segundo Nivel + Supervisor de Seguridad.\n` +
          `COTIZACIÓN:\n` +
          `Contado: $380.00\n` +
          `Crédito:  $430.00\n\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      case '3':
        return await message.reply(
          `🎁 *Combo 3*\n` +
          `Incluye: Especialización en Bares y Restaurantes + Control de Eventos Públicos + Seguridad Financiera.\n` +
          `COTIZACIÓN:\n` +
          `Contado: $450.00\n` +
          `Crédito:  $500.00\n\n` +
          `Valor incluye IVA.\n\n` +
          `*Escribe '0' para regresar.*`
        );
      default:
        return;
    }
  }

  if (contieneSaludo(texto)) {
    return mostrarMenuPrincipal(message, session);
  }
});

client.initialize();
