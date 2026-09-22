export type Moneda = 'ARS' | 'USD';
export type TipoMov = 'gasto' | 'ingreso' | 'ahorro';
export type Casa = 'oficial' | 'blue' | 'bolsa' | 'tarjeta';
export type TipoPmov = 'Pago' | 'Interés' | 'Ajuste' | 'Pago previo';

export interface Mov {
  id: string;
  tipo: TipoMov;
  fecha: string; // YYYY-MM-DD
  persona: string;
  desc: string;
  cat: string; // categoría (gasto) o tipo de ingreso
  monto: number; // total, en `moneda`
  moneda: Moneda;
  tc: number; // pesos por dólar al cargarlo (1 si es ARS)
  medio?: string;
  cuotas?: number; // > 1 = compra en cuotas
  desde?: string; // YYYY-MM de la primera cuota
  notas?: string;
  meta?: string; // id de meta (ahorro)
  creadoPor?: string;
}

export interface Meta { id: string; nombre: string; objetivo: number; moneda: Moneda; orden?: number }

export interface Prestamo {
  id: string;
  nombre: string;
  persona: string;
  original: number;
  moneda: Moneda;
  cuotasTotales: number; // 0 = pago variable
  cuota: number;
  fin?: string; // YYYY-MM objetivo
}

export interface Pmov {
  id: string;
  prestamoId: string;
  fecha: string;
  tipo: TipoPmov;
  monto: number;
  cuotas: number;
  nota: string;
}

export interface Hogar {
  id: string;
  nombre: string;
  owner: string;
  miembros: string[];
  invite: string;
  personas: string[];
  categorias: string[];
  medios: string[];
  fuentesIngreso: string[];
  cotizacion: Casa;
}

export const CAT_ICON: Record<string, string> = {
  'Alimentación': '🛒', 'Transporte': '🚌', 'Salud & Estética': '💊', 'Hogar': '🏠',
  'Ropa & Accesorios': '👕', 'Entretenimiento': '🎬', 'Gym & Bienestar': '🏋️', 'Mascotas': '🐾',
  'Deudas/Cuotas': '💳', 'Trabajo': '💼', 'Regalos': '🎁', 'Servicios': '💡', 'Educación': '📚', 'Otros': '📦',
};

export const DEFAULTS = {
  categorias: ['Alimentación', 'Transporte', 'Servicios', 'Hogar', 'Salud & Estética', 'Ropa & Accesorios',
    'Entretenimiento', 'Gym & Bienestar', 'Mascotas', 'Educación', 'Deudas/Cuotas', 'Trabajo', 'Regalos', 'Otros'],
  medios: ['Efectivo', 'Débito', 'Crédito', 'Transferencia', 'Billeteras virtuales', 'Otro'],
  fuentesIngreso: ['Sueldo', 'Extra', 'Otros'],
  metas: ['Fondo de emergencia', 'Viaje / vacaciones', 'Proyecto hogar', 'Ahorro largo plazo'],
};
