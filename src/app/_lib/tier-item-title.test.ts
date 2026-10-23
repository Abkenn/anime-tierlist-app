import { describe, expect, it } from 'vitest';
import { limitTitleLines, normalizeTitleColor } from './tier-item-title';

describe('item title input', () => {
  it('accepts pasted three/six digit hex and rejects invalid CSS values', () => {
    expect(normalizeTitleColor(' #Fa0 ')).toBe('#ffaa00');
    expect(normalizeTitleColor('12ABef')).toBe('#12abef');
    expect(normalizeTitleColor('#12')).toBeNull();
    expect(normalizeTitleColor('red; background: url(test)')).toBeNull();
  });

  it('preserves Unicode and manual lines while limiting titles to four lines', () => {
    expect(
      limitTitleLines('推しの子\r\nHeavenly\nЗаглавие\r✨ TEST\nfifth'),
    ).toBe('推しの子\nHeavenly\nЗаглавие\n✨ TEST');
  });
});
