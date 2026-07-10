/** Validaciones de negocio reutilizables (ValidacionDatosService como librería). */

export const esDniValido = (dni: string): boolean => /^\d{8}$/.test(dni);

export const esRucValido = (ruc: string): boolean => /^\d{11}$/.test(ruc);

/** Tipos de documento admitidos en admisión. */
export const TIPOS_DOCUMENTO = ['DNI', 'CE', 'PASAPORTE', 'CONADIS'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

/** Canales de contacto/notificación del paciente (paciente como medio de conexión). */
export const CANALES_CONTACTO = ['email', 'sms', 'whatsapp', 'ninguno'] as const;
export type CanalContacto = (typeof CANALES_CONTACTO)[number];

/**
 * Valida el número de documento según su tipo:
 *  - DNI: 8 dígitos.
 *  - CE (Carnet de Extranjería): 9 a 12 alfanuméricos.
 *  - PASAPORTE: 6 a 12 alfanuméricos.
 *  - CONADIS: 6 a 12 alfanuméricos.
 */
export function esDocumentoValido(tipo: string, numero: string): boolean {
  const n = (numero || '').trim();
  switch (tipo) {
    case 'DNI': return /^\d{8}$/.test(n);
    case 'CE': return /^[A-Za-z0-9]{9,12}$/.test(n);
    case 'PASAPORTE': return /^[A-Za-z0-9]{6,12}$/.test(n);
    case 'CONADIS': return /^[A-Za-z0-9]{6,12}$/.test(n);
    default: return false;
  }
}

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
  dni?: string; tipo_documento?: string; email?: string; telefono?: string;
  nombres?: string; apellidos?: string; canal_preferido?: string;
}): ResultadoValidacion {
  const errores: string[] = [];
  const tipo = p.tipo_documento || 'DNI';
  if (!TIPOS_DOCUMENTO.includes(tipo as TipoDocumento)) errores.push('Tipo de documento inválido');
  if (!p.dni || !esDocumentoValido(tipo, p.dni)) {
    const ayuda = tipo === 'DNI' ? '8 dígitos' : '6 a 12 caracteres';
    errores.push(`Documento ${tipo} inválido (${ayuda})`);
  }
  if (!p.nombres?.trim()) errores.push('Nombres requeridos');
  if (!p.apellidos?.trim()) errores.push('Apellidos requeridos');
  if (p.email && !esEmailValido(p.email)) errores.push('Email inválido');
  if (p.telefono && !esTelefonoValido(p.telefono)) errores.push('Teléfono inválido');
  if (p.canal_preferido && !CANALES_CONTACTO.includes(p.canal_preferido as CanalContacto)) {
    errores.push('Canal de contacto inválido');
  }
  return { valido: errores.length === 0, errores };
}
