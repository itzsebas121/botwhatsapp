/**
 * Valida una cédula ecuatoriana según el algoritmo de dígito verificador
 * REQUIERE exactamente 10 dígitos, sin espacios, sin signos.
 * @param {string} cedula - Cédula a validar
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export function validateEcuadorianCedula(cedula) {
  const clean = String(cedula).trim();

  // Check for exactly 10 digits
  if (!/^\d{10}$/.test(clean)) {
    if (clean.length < 10) {
      return { isValid: false, error: `La cédula debe tener exactamente 10 dígitos. La que proporcionaste tiene ${clean.length}. Por favor, verifica y proporciona los 10 dígitos correctos.` };
    } else if (clean.length > 10) {
      return { isValid: false, error: `La cédula debe tener exactamente 10 dígitos. La que proporcionaste tiene ${clean.length}. Por favor, verifica y proporciona los 10 dígitos correctos.` };
    } else {
      return { isValid: false, error: "La cédula debe contener solo dígitos (0-9). Por favor, proporciona una cédula válida." };
    }
  }

  // Calculate verification digit using Ecuador algorithm
  const digits = clean.split('').map(Number);
  const checkDigit = digits[9];
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let product = digits[i] * weights[i];
    product = product >= 10 ? product - 9 : product;
    sum += product;
  }

  const remainder = sum % 10;
  const calculatedCheckDigit = remainder === 0 ? 0 : 10 - remainder;

  if (checkDigit !== calculatedCheckDigit) {
    return { isValid: false, error: "La cédula proporcionada no es válida según el algoritmo de verificación ecuatoriano. Por favor, verifica los dígitos e intenta de nuevo." };
  }

  return { isValid: true, error: null };
}

/**
 * Valida un correo electrónico
 * REQUIERE formato válido: user@domain.extension
 * @param {string} email - Correo a validar
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export function validateEmail(email) {
  const clean = String(email).trim().toLowerCase();
  
  // Must have @ symbol
  if (!clean.includes('@')) {
    return { isValid: false, error: "El correo debe incluir el símbolo @. Ejemplo: usuario@example.com" };
  }

  // Must have a domain with at least one dot and extension
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (emailRegex.test(clean)) {
    return { isValid: true, error: null };
  }

  // Provide specific error
  if (clean.match(/^[^\s@]+@[^\s@]+$/)) {
    // Has @ but no extension
    return { isValid: false, error: "El correo debe incluir una extensión válida (como .com, .org, .ec). Ejemplo: usuario@example.com. Por favor, proporciona un correo válido." };
  }

  return { isValid: false, error: "El correo no tiene un formato válido. Debe ser: usuario@dominio.extension (ejemplo: usuario@example.com)" };
}

/**
 * Valida nombre completo
 * REQUIERE 2+ palabras, solo letras y espacios
 * @param {string} nombre - Nombre a validar
 * @returns {object} - { isValid: boolean, error: string|null }
 */
export function validateFullName(nombre) {
  const clean = String(nombre).trim();
  
  if (clean.length < 3) {
    return { isValid: false, error: "El nombre debe tener al menos 3 caracteres." };
  }

  // Only letters (including accents) and spaces, no numbers
  if (!/^[a-záéíóúñA-ZÁÉÍÓÚÑ\s]+$/.test(clean)) {
    return { isValid: false, error: "El nombre no debe contener números o caracteres especiales. Por favor, proporciona solo letras y espacios." };
  }

  // Must have at least 2 words (first name + last name)
  const words = clean.split(/\s+/).filter(w => w.length > 0);
  if (words.length < 2) {
    return { isValid: false, error: "Por favor, proporciona tu nombre completo (nombre y apellido)." };
  }

  return { isValid: true, error: null };
}
