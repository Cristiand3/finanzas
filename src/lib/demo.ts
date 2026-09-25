// Modo de prueba: solo en desarrollo y con ?demo en la URL.
// Guarda todo en memoria, sin tocar Firebase, para poder recorrer la app completa.
import { CUENTAS_INICIALES, DEFAULTS, type Hogar, type Meta, type Mov } from './model';

export const modoDemo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');

export const hogarDemo = (): Hogar => ({
  id: 'demo', nombre: 'Hogar de prueba', owner: 'u1', miembros: ['u1', 'u2'], invite: 'x',
  personas: ['Cristian', 'Camila'],
  categorias: DEFAULTS.categorias, medios: DEFAULTS.medios, fuentesIngreso: DEFAULTS.fuentesIngreso,
  cuentas: CUENTAS_INICIALES,
});

export const metasDemo = (): Meta[] => [
  { id: 'm1', nombre: 'Fondo de emergencia', objetivos: { ARS: 1_000_000 }, orden: 0 },
  { id: 'm2', nombre: 'Viaje', objetivos: { ARS: 800_000, USD: 1_000 }, orden: 1 },
];

export const movsDemo = (): Mov[] => [];
