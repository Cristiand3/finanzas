export type Moneda = 'ARS' | 'USD' | 'EUR' | 'BRL';

export const MONEDAS: Record<Moneda, { simbolo: string; nombre: string }> = {
  ARS: { simbolo: '$', nombre: 'Pesos' },
  USD: { simbolo: 'US$', nombre: 'Dólares' },
  EUR: { simbolo: '€', nombre: 'Euros' },
  BRL: { simbolo: 'R$', nombre: 'Reales' },
};
export const MONEDA_IDS = Object.keys(MONEDAS) as Moneda[];
export type TipoMov = 'gasto' | 'ingreso' | 'ahorro' | 'transferencia' | 'ajuste';
export type TipoCuenta = 'efectivo' | 'banco' | 'inversion';

export const TIPOS_CUENTA: Record<TipoCuenta, { nombre: string; icono: string; disponible: boolean }> = {
  efectivo: { nombre: 'Efectivo', icono: '💵', disponible: true },
  banco: { nombre: 'Cuenta bancaria', icono: '🏦', disponible: true },
  inversion: { nombre: 'Inversiones', icono: '📈', disponible: false },
};

/** Dónde está la plata: efectivo, una cuenta del banco o algo invertido (plazo fijo, FCI…). */
export interface Cuenta {
  id: string;
  nombre: string;
  tipo: TipoCuenta;
  inicial?: Partial<Record<Moneda, number>>; // saldo al empezar a usar la app
  orden?: number;
}
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
  tc?: number; // cotización guardada por versiones anteriores; ya no se usa
  medio?: string;
  cuotas?: number; // > 1 = compra en cuotas
  desde?: string; // YYYY-MM de la primera cuota
  notas?: string;
  meta?: string; // id de meta (ahorro)
  cuenta?: string; // de dónde sale o a dónde entra la plata
  cuentaDestino?: string; // transferencias: a qué cuenta va
  creadoPor?: string;
}

/** Una meta puede juntar plata en varias monedas a la vez: un objetivo por cada una. */
export interface Meta {
  id: string;
  nombre: string;
  objetivos: Partial<Record<Moneda, number>>;
  orden?: number;
  objetivo?: number; // versiones anteriores
  moneda?: Moneda;   // versiones anteriores
}

/** Normaliza las metas guardadas por versiones anteriores (un solo objetivo y una moneda). */
export function conObjetivos(m: Meta): Meta {
  if (m.objetivos) return m;
  return { ...m, objetivos: m.objetivo ? { [m.moneda || 'ARS']: m.objetivo } : {} };
}

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
  cuentas?: Cuenta[];
}

/** Hogares creados antes de las cuentas: arrancan con efectivo y banco. */
export const CUENTAS_INICIALES: Cuenta[] = [
  { id: 'efectivo', nombre: 'Efectivo', tipo: 'efectivo', orden: 0 },
  { id: 'banco', nombre: 'Cuenta bancaria', tipo: 'banco', orden: 1 },
];
/** Nombres típicos de inversiones, para no arrancar de cero. */
export const SUGERENCIAS_INVERSION = ['Fondo común de inversión', 'Plazo fijo', 'Acciones', 'Cripto', 'Dólares guardados'];

export const cuentasDe = (h: { cuentas?: Cuenta[] }) => (h.cuentas?.length ? h.cuentas : CUENTAS_INICIALES);

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
