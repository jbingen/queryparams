import { describe, test, expect } from 'bun:test';
import { query, string, number, boolean, array } from '../src/index';

describe('parse', () => {
  test('parses required string', () => {
    const q = query({ name: string() });
    expect(q.parse('?name=hello')).toEqual({ name: 'hello' });
  });

  test('throws on missing required param', () => {
    const q = query({ name: string() });
    expect(() => q.parse('')).toThrow('Missing required query param: name');
  });

  test('parses number', () => {
    const q = query({ page: number() });
    expect(q.parse('?page=3')).toEqual({ page: 3 });
  });

  test('throws on invalid number', () => {
    const q = query({ page: number() });
    expect(() => q.parse('?page=abc')).toThrow('Expected number');
  });

  test('parses boolean', () => {
    const q = query({ active: boolean() });
    expect(q.parse('?active=true')).toEqual({ active: true });
    expect(q.parse('?active=false')).toEqual({ active: false });
    expect(q.parse('?active=1')).toEqual({ active: true });
    expect(q.parse('?active=0')).toEqual({ active: false });
  });

  test('presence flag (?flag) is true', () => {
    const q = query({ archived: boolean() });
    expect(q.parse('?archived')).toEqual({ archived: true });
    expect(q.parse('?archived=')).toEqual({ archived: true });
  });

  test('throws on invalid boolean', () => {
    const q = query({ active: boolean() });
    expect(() => q.parse('?active=yes')).toThrow('Expected boolean');
  });

  test('handles optional param', () => {
    const q = query({ search: string().optional() });
    expect(q.parse('')).toEqual({ search: undefined });
    expect(q.parse('?search=foo')).toEqual({ search: 'foo' });
  });

  test('applies default value', () => {
    const q = query({ page: number().default(1) });
    expect(q.parse('')).toEqual({ page: 1 });
    expect(q.parse('?page=5')).toEqual({ page: 5 });
  });

  test('default overrides optional', () => {
    const q = query({ name: string().optional().default('anon') });
    expect(q.parse('')).toEqual({ name: 'anon' });
    expect(q.parse('?name=joe')).toEqual({ name: 'joe' });
  });

  test('parses array', () => {
    const q = query({ tags: array(string()) });
    expect(q.parse('?tags=a&tags=b')).toEqual({ tags: ['a', 'b'] });
  });

  test('returns empty array when no values', () => {
    const q = query({ tags: array(string()) });
    expect(q.parse('')).toEqual({ tags: [] });
  });

  test('coerces array items', () => {
    const q = query({ ids: array(number()) });
    expect(q.parse('?ids=1&ids=2&ids=3')).toEqual({ ids: [1, 2, 3] });
  });

  test('accepts URLSearchParams directly', () => {
    const q = query({ name: string() });
    const params = new URLSearchParams('name=world');
    expect(q.parse(params)).toEqual({ name: 'world' });
  });

  test('handles leading ? in string input', () => {
    const q = query({ x: string() });
    expect(q.parse('?x=1')).toEqual({ x: '1' });
    expect(q.parse('x=1')).toEqual({ x: '1' });
  });

  test('parses complex schema', () => {
    const q = query({
      page: number().default(1),
      search: string().optional(),
      tags: array(string()),
      active: boolean().default(true),
    });

    const result = q.parse('?page=2&tags=a&tags=b');
    expect(result).toEqual({
      page: 2,
      search: undefined,
      tags: ['a', 'b'],
      active: true,
    });
  });
});

describe('build', () => {
  test('builds query string', () => {
    const q = query({ name: string() });
    expect(q.build({ name: 'hello' })).toBe('?name=hello');
  });

  test('builds with number', () => {
    const q = query({ page: number() });
    expect(q.build({ page: 3 })).toBe('?page=3');
  });

  test('builds with boolean', () => {
    const q = query({ active: boolean() });
    expect(q.build({ active: true })).toBe('?active=true');
  });

  test('builds with array', () => {
    const q = query({ tags: array(string()) });
    expect(q.build({ tags: ['a', 'b'] })).toBe('?tags=a&tags=b');
  });

  test('omits undefined values', () => {
    const q = query({ search: string().optional() });
    expect(q.build({})).toBe('');
  });

  test('default fields are optional in build', () => {
    const q = query({ page: number().default(1) });
    expect(q.build({})).toBe('');
    expect(q.build({ page: 5 })).toBe('?page=5');
  });

  test('builds complex schema', () => {
    const q = query({
      page: number().default(1),
      search: string().optional(),
      tags: array(string()),
    });

    const result = q.build({ page: 2, tags: ['x', 'y'] });
    expect(result).toBe('?page=2&tags=x&tags=y');
  });

  test('encodes special characters', () => {
    const q = query({ q: string() });
    expect(q.build({ q: 'hello world' })).toBe('?q=hello+world');
  });
});

describe('roundtrip', () => {
  test('parse -> build -> parse is stable', () => {
    const q = query({
      page: number().default(1),
      search: string().optional(),
      tags: array(string()),
    });

    const original = '?page=2&search=foo&tags=a&tags=b';
    const parsed = q.parse(original);
    const built = q.build(parsed as any);
    const reparsed = q.parse(built);

    expect(reparsed).toEqual(parsed);
  });
});
