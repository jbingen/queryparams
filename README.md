# 🔍 queryparams

[![npm version](https://img.shields.io/npm/v/@jbingen/queryparams)](https://www.npmjs.com/package/@jbingen/queryparams)
[![npm bundle size](https://img.shields.io/npm/unpacked-size/@jbingen/queryparams)](https://www.npmjs.com/package/@jbingen/queryparams)
[![license](https://img.shields.io/github/license/jbingen/queryparams)](https://github.com/jbingen/queryparams/blob/main/LICENSE)

Type-safe query string parser and serializer. No schemas, no framework lock-in.

For anyone tired of `Number(params.get("page") ?? 1)` scattered across every route handler.

```
npm install @jbingen/queryparams
```

```typescript
// before
const params = new URLSearchParams(location.search);
const page = Number(params.get("page") ?? 1); // no type safety
const tags = params.getAll("tags");            // always string[]

// after
const result = usersQuery.parse(location.search);
// { page: 2, search: undefined, tags: ["a", "b"] } - typed, coerced, defaulted
```

Define once, parse and build anywhere. Types are inferred from the definition.

```typescript
import { query, number, string, boolean, array } from "@jbingen/queryparams";

const usersQuery = query({
  page: number().default(1),
  search: string().optional(),
  active: boolean().default(true),
  tags: array(string()),
});

usersQuery.parse("?page=2&tags=a&tags=b");
// { page: 2, search: undefined, active: true, tags: ["a", "b"] }

usersQuery.build({ page: 3, tags: ["x"] });
// "?page=3&tags=x"
```

## Why

Every app parses query strings. Almost none of them do it consistently. You end up with `Number()` casts, `?? ""` fallbacks, and `getAll()` calls copy-pasted across handlers with no shared type.

queryparams fixes this with zero dependencies. Define the shape once - get parsing, serialization, defaults, and full type inference for free.

## API

### `query(schema)`

Creates a typed query object from a schema. Returns an object with `parse`, `build`, and `schema`.

```typescript
const q = query({
  page: number().default(1),
  search: string().optional(),
  tags: array(string()),
});
```

### `.parse(input)`

Parses a query string or `URLSearchParams` into a typed object. Coerces values, applies defaults, and throws on missing required params.

```typescript
q.parse("?page=2&tags=a&tags=b");
// { page: 2, search: undefined, tags: ["a", "b"] }

q.parse(new URLSearchParams("page=5"));
// { page: 5, search: undefined, tags: [] }
```

Throws at runtime if a required param is missing. The leading `?` is optional.

### `.build(values)`

Builds a query string from typed values. Returns the string with a leading `?`, or empty string if no params.

```typescript
q.build({ page: 3, tags: ["x", "y"] });
// "?page=3&tags=x&tags=y"

q.build({ tags: [] });
// ""
```

Optional and defaulted params can be omitted.

### Coercers

#### `string()`

Passes the raw value through as-is.

#### `number()`

Coerces to `Number`. Throws if the result is `NaN`.

#### `boolean()`

Accepts `"true"`, `"1"`, `""` as `true` and `"false"`, `"0"` as `false`. Throws on anything else. Empty string maps to `true` so that `?flag` (presence-only) behaves as "enabled".

#### `array(coercer)`

Collects all values for a key using `getAll()` and coerces each one. Returns `[]` when no values are present.

```typescript
array(string())  // string[]
array(number())  // number[]
```

### Modifiers

#### `.optional()`

Makes a param optional. Returns `undefined` when absent instead of throwing.

```typescript
string().optional()  // string | undefined
```

#### `.default(value)`

Provides a fallback when the param is absent. The param becomes optional in `.build()`.

```typescript
number().default(1)  // number, defaults to 1
```

## Design decisions

- Zero dependencies. Tiny footprint.
- Coercers are plain functions, not a schema DSL. No `.min()`, `.max()`, `.regex()` - use Zod for that.
- `parse` accepts both strings and `URLSearchParams` so it works in any environment.
- `build` returns the `?` prefix so you can concatenate directly with a path.
- Arrays use `getAll()` semantics matching how browsers serialize repeated keys.
- No opinion on your framework, router, or state management.
