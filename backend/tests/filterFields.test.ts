import { describe, expect, it } from 'vitest';
import { filterFields } from '../utils/filterFields';

describe('filterFields', () => {
  it('includes only allowed own fields', () => {
    const source = { a: 1, b: undefined, c: 3 };
    const result = filterFields(source, ['a', 'b', 'd']);
    expect(result).toEqual({ a: 1 });
  });

  it('ignores inherited properties', () => {
    const proto = { secret: 'x' };
    const obj = Object.create(proto);
    obj.name = 'Alice';
    const result = filterFields(obj, ['name', 'secret']);
    expect(result).toEqual({ name: 'Alice' });
  });
});
