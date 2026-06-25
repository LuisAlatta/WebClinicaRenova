/** Validaciones de negocio reutilizables (ValidacionDatosService como librería). */

export const esDniValido = (dni: string): boolean => /^\d{8}$/.test(dni);

export const esRucValido = (ruc: string): boolean => /^\d{11}$/.test(ruc);

export const esEmailValido = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const esTelefonoValido = (tel: string): boolean => /^\d{6,15}$/.test(tel);

export const esFechaValida = (fecha: string): boolean => !isNaN(Date.parse(fecha));

export interface ResultadoValidacion {
  valido: boolean;
  errores: string[];
}

/** Valida los campos típicos de un paciente y devuelve la lista de errores. */
export function validarPaciente(p: {
  dni?: string; email?: string; telefono?: string; nombres?: string; apellidos?: string;
}): ResultadoValidacion {
  const errores: string[] = [];
  if (!p.dni || !esDniValido(p.dni)) errores.push('DNI inválido (8 dígitos)');
  if (!p.nombres?.trim()) errores.push('Nombres requeridos');
  if (!p.apellidos?.trim()) errores.push('Apellidos requeridos');
  if (p.email && !esEmailValido(p.email)) errores.push('Email inválido');
  if (p.telefono && !esTelefonoValido(p.telefono)) errores.push('Teléfono inválido');
  return { valido: errores.length === 0, errores };
}
