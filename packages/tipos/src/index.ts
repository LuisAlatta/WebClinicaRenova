/** DTOs / contratos compartidos entre servicios y frontend. */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export type Rol = 'ADMIN' | 'MEDICO' | 'ASISTENTE';

export interface Paciente {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento?: string;
  sexo?: 'M' | 'F';
  telefono?: string;
  email?: string;
  direccion?: string;
}

export interface Consulta {
  id: string;
  paciente_id: string;
  medico_id: string;
  consultorio_id?: number;
  fecha_hora: string;
  motivo?: string;
  estado: 'PROGRAMADO' | 'EN_PROCESO' | 'FINALIZADO' | 'CANCELADO';
}

export interface Medicamento {
  id: string;
  codigo: string;
  nombre: string;
  presentacion?: string;
  stock_minimo: number;
  precio_unit: number;
}

export interface Factura {
  id: string;
  paciente_id: string;
  subtotal: number;
  igv: number;
  total: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
}
