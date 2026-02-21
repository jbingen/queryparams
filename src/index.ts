type Coercer<T> = {
  _type: T;
  _optional: boolean;
  _default: T | undefined;
  _array: boolean;
  coerce: (raw: string) => T;
  optional: () => Coercer<T | undefined>;
  default: (value: T) => Coercer<T>;
};

type SchemaField = Coercer<any>;
type Schema = Record<string, SchemaField>;

type InferField<F> =
  F extends Coercer<infer T>
    ? F extends { _array: true }
      ? T[]
      : F extends { _optional: true }
        ? T | undefined
        : T
    : never;

type InferSchema<S extends Schema> = {
  [K in keyof S]: InferField<S[K]>;
};

type IsOptionalField<F> =
  F extends { _optional: true } ? true :
  F extends { _default: infer D } ? (D extends undefined ? false : true) :
  false;

type BuildValue<F> =
  F extends { _array: true }
    ? F extends Coercer<infer T> ? readonly T[] : never
    : F extends Coercer<infer T> ? T : never;

type BuildInput<S extends Schema> =
  { [K in keyof S as IsOptionalField<S[K]> extends true ? never : K]: BuildValue<S[K]> } &
  { [K in keyof S as IsOptionalField<S[K]> extends true ? K : never]?: BuildValue<S[K]> };

export type Query<S extends Schema> = {
  readonly schema: S;
  parse: (input: string | URLSearchParams) => InferSchema<S>;
  build: (values: BuildInput<S>) => string;
};

function createCoercer<T>(coerce: (raw: string) => T, isArray = false): Coercer<T> {
  const c: Coercer<T> = {
    _type: undefined as T,
    _optional: false,
    _default: undefined,
    _array: isArray,
    coerce,
    optional() {
      const next = createCoercer<T | undefined>(coerce, isArray);
      next._optional = true;
      return next;
    },
    default(value: T) {
      const next = createCoercer<T>(coerce, isArray);
      next._default = value;
      next._optional = false;
      return next;
    },
  };
  return c;
}

export function string(): Coercer<string> {
  return createCoercer((raw) => raw);
}

export function number(): Coercer<number> {
  return createCoercer((raw) => {
    const n = Number(raw);
    if (Number.isNaN(n)) throw new Error(`Expected number, got "${raw}"`);
    return n;
  });
}

export function boolean(): Coercer<boolean> {
  return createCoercer((raw) => {
    if (raw === '' || raw === 'true' || raw === '1') return true;
    if (raw === 'false' || raw === '0') return false;
    throw new Error(`Expected boolean, got "${raw}"`);
  });
}

export function array<T>(item: Coercer<T>): Coercer<T> & { _array: true } {
  const c = createCoercer<T>(item.coerce, true);
  return c as Coercer<T> & { _array: true };
}

export function query<S extends Schema>(schema: S): Query<S> {
  return {
    schema,

    parse(input: string | URLSearchParams): InferSchema<S> {
      const params = typeof input === 'string'
        ? new URLSearchParams(input.startsWith('?') ? input.slice(1) : input)
        : input;

      const result: Record<string, unknown> = {};

      for (const [key, field] of Object.entries(schema)) {
        if (field._array) {
          const all = params.getAll(key);
          result[key] = all.length > 0 ? all.map(field.coerce) : [];
        } else {
          const raw = params.get(key);
          if (raw === null) {
            if (field._default !== undefined) result[key] = field._default;
            else if (field._optional) result[key] = undefined;
            else throw new Error(`Missing required query param: ${key}`);
          } else {
            result[key] = field.coerce(raw);
          }
        }
      }

      return result as InferSchema<S>;
    },

    build(values: BuildInput<S>): string {
      const params = new URLSearchParams();
      const vals = values as Record<string, unknown>;

      for (const [key, field] of Object.entries(schema)) {
        const value = vals[key];
        if (value === undefined || value === null) continue;
        if (field._array) {
          for (const v of value as unknown[]) params.append(key, String(v));
        } else {
          params.set(key, String(value));
        }
      }

      const qs = params.toString();
      return qs ? `?${qs}` : '';
    },
  };
}
