import { describe, expect, it } from 'vitest';
import { contarDigitos, formatMiles, parseAmt, posicionDelCursor } from './format';

describe('puntos de miles mientras se escribe', () => {
  it('agrupa de a tres', () => {
    expect(formatMiles('45300')).toBe('45.300');
    expect(formatMiles('1234567')).toBe('1.234.567');
    expect(formatMiles('999')).toBe('999');
    expect(formatMiles('')).toBe('');
  });
  it('mantiene el formato si ya lo tenía', () => {
    expect(formatMiles('1.234')).toBe('1.234');
    expect(formatMiles('1.2345')).toBe('12.345'); // al escribir un dígito más, reagrupa
  });
  it('admite decimales con coma y negativos', () => {
    expect(formatMiles('1234,5')).toBe('1.234,5');
    expect(formatMiles('1234,567')).toBe('1.234,56');
    expect(formatMiles('-50000')).toBe('-50.000');
    expect(formatMiles(',')).toBe(',');
  });
  it('ignora letras y ceros a la izquierda', () => {
    expect(formatMiles('abc12x00')).toBe('1.200');
    expect(formatMiles('007')).toBe('7');
  });
  it('lo que se muestra es lo que se guarda', () => {
    expect(parseAmt(formatMiles('45300'))).toBe(45300);
    expect(parseAmt(formatMiles('1234,50'))).toBe(1234.5);
    expect(parseAmt(formatMiles('-50000'))).toBe(-50000);
  });
});

describe('cursor', () => {
  it('queda después del mismo dígito al reformatear', () => {
    // "1234|5" → formateado "12.345", el cursor iba después de 4 dígitos
    expect(posicionDelCursor('12.345', contarDigitos('1234'))).toBe(5);
    expect(posicionDelCursor('45.300', 5)).toBe(6);
    expect(posicionDelCursor('45.300', 0)).toBe(0);
  });
});
