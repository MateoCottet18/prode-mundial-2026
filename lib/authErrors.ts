/**
 * Traduce mensajes crudos de Supabase Auth a textos claros para el usuario.
 * Nunca exponer JSON ni códigos técnicos en la UI.
 */
export function mapAuthErrorMessage(message: string | undefined | null): string {
  if (!message) {
    return "No se pudo completar la operación. Intentá de nuevo.";
  }

  const lower = message.toLowerCase();

  if (
    lower.includes("email rate limit") ||
    lower.includes("rate limit exceeded") ||
    lower.includes("over_email_send_rate_limit")
  ) {
    return "Supabase limitó temporalmente los emails de confirmación. Probá de nuevo en unos minutos o avisale al admin.";
  }

  if (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already registered")
  ) {
    return "Ese email ya está registrado.";
  }

  if (lower.includes("invalid login credentials") || lower.includes("invalid password")) {
    return "Contraseña incorrecta.";
  }

  if (lower.includes("user not found")) {
    return "Usuario no encontrado.";
  }

  if (lower.includes("password") && lower.includes("least")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }

  if (lower.includes("signup disabled")) {
    return "El registro está deshabilitado en Supabase. Avisale al admin.";
  }

  if (lower.includes("duplicate") || lower.includes("unique")) {
    if (lower.includes("username")) {
      return "Ese nombre de usuario ya está en uso.";
    }
    if (lower.includes("email")) {
      return "Ese email ya está registrado.";
    }
    return "Ya existe un usuario con esos datos.";
  }

  return message;
}
