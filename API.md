# API Reference

Full API documentation for `@marianmeres/simple-router`.

## Table of Contents

- [SimpleRouter](#simplerouter)
  - [Constructor](#constructor)
  - [Static Properties](#static-properties)
  - [Instance Properties](#instance-properties)
  - [Methods](#methods)
- [SimpleRoute](#simpleroute)
  - [Constructor](#simpleroute-constructor)
  - [Static Properties](#simpleroute-static-properties)
  - [Static Methods](#static-methods)
  - [Instance Methods](#instance-methods)
- [Types](#types)
- [Pattern Syntax](#pattern-syntax)

---

## SimpleRouter

The main router class for registering routes, executing pattern matching, and subscribing to state changes.

`SimpleRouter` is generic over `T`, the return type of route callbacks. This allows for type-safe `exec()` return values.

### Constructor

```ts
new SimpleRouter<T = unknown>(config?: RouterConfig<T> | RouterOptions<T> | null)
```

Creates a new router instance.

**Type Parameters:**

| Name | Default | Description |
|------|---------|-------------|
| `T` | `unknown` | The return type of route callbacks |

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `config` | `RouterConfig<T> \| RouterOptions<T> \| null` | Optional route configuration or options object |

**Example:**

```ts
// Empty router (T defaults to unknown)
const router = new SimpleRouter();

// Typed router - all callbacks must return Component
const router = new SimpleRouter<Component>({
  "/": () => HomePage,
  "/about": () => AboutPage,
  "*": () => NotFoundPage
});

// Simple config without explicit type (T inferred from callbacks)
const router = new SimpleRouter({
  "/": () => HomePage,
  "/about": () => AboutPage,
  "*": () => NotFoundPage
});

// With options object (for logger support)
const router = new SimpleRouter<Component>({
  routes: {
    "/": () => HomePage,
    "/about": () => AboutPage
  },
  logger: myLogger // optional, compatible with @marianmeres/clog
});
```

### Static Properties

#### `debug`

```ts
static debug: boolean = false
```

Enable/disable console debug logging for route matching. When enabled, logs detailed matching information using the logger instance (if provided) or falls back to `console.log`.

**Example:**

```ts
SimpleRouter.debug = true;
router.exec("/test"); // Logs: [SimpleRouter] '/test' -> matches '/' with {}
```

### Instance Properties

#### `current`

```ts
get current(): RouterCurrent
```

Returns the current router state containing the last matched route, extracted parameters, and label.

**Returns:** `RouterCurrent` - Current state object

**Example:**

```ts
router.exec("/user/123");
console.log(router.current);
// { route: "/user/[id]", params: { id: "123" }, label: null }
```

### Methods

#### `on()`

```ts
on(routes: string | string[], cb: RouteCallback<T>, options?: RouterOnOptions): void
```

Registers one or more route patterns with a callback function.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `routes` | `string \| string[]` | Single route pattern or array of patterns |
| `cb` | `RouteCallback<T>` | Callback function executed when route matches (must return `T`) |
| `options` | `RouterOnOptions` | Optional configuration object |

**Options:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string \| null` | `null` | Label for debugging/identification |
| `allowQueryParams` | `boolean` | `true` | Whether to parse query parameters |
| `strict` | `boolean` | _inherits from router_ | Strict segment matching (see `RouterOptions.strict`) |

**Example:**

```ts
// Single route
router.on("/users", () => UsersPage);

// Multiple routes to same handler
router.on(["/", "/home", "/index.html"], () => HomePage);

// With dynamic parameters
router.on("/user/[id]", (params) => UserPage(params?.id));

// With regex constraint
router.on("/post/[id([0-9]+)]", (params) => PostPage(params?.id));

// With label for debugging
router.on("/admin", () => AdminPage, { label: "admin-dashboard" });

// Disable query parameter parsing
router.on("/raw/[path]", (params) => RawPage(params), { allowQueryParams: false });

// Catch-all route (must be registered last)
router.on("*", () => NotFoundPage);
```

**Important:** Routes are matched in registration order. First match wins!

**Shadowing warning:** When `SimpleRouter.debug` is enabled, registering a route that is strictly more specific than an already-registered route emits a `warn`-level log message (via the provided `Logger` if any, otherwise `console.warn`). The check is skipped when `debug` is off, so there is no runtime cost in production.

---

#### `exec()`

```ts
exec(url: string, fallbackFn?: RouteCallback<T>): T | false
```

Executes pattern matching against the provided string.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `url` | `string` | String to match against registered patterns |
| `fallbackFn` | `RouteCallback<T>` | Optional fallback function if no route matches |

**Returns:** `T | false` - The value returned by the matched callback (type `T`), or `false` if no match and no catch-all/fallback.

**Match Priority:**
1. First registered matching route
2. Fallback function (if provided)
3. Catch-all `"*"` route (if registered)
4. Returns `false`

**Example:**

```ts
// Basic usage
const result = router.exec("/users");

// With query parameters
router.exec("/search?q=hello&page=1");

// With fallback function
router.exec("/unknown", (params, route) => {
  console.log("No match found");
  return NotFoundPage;
});

// Return values from callbacks
const component = router.exec("/home");
render(component);
```

---

#### `subscribe()`

```ts
subscribe(subscription: RouterSubscriber): RouterUnsubscribe
```

Subscribes to router state changes. Follows the [Svelte store contract](https://svelte.dev/docs#Store_contract).

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `subscription` | `RouterSubscriber` | Callback function receiving state changes |

**Returns:** `RouterUnsubscribe` - Unsubscribe function

**Behavior:**
- Subscriber is called immediately with current state
- Subsequently called on every `exec()` call

**Example:**

```ts
const unsubscribe = router.subscribe((state) => {
  console.log("Route:", state.route);
  console.log("Params:", state.params);
  console.log("Label:", state.label);
});

// In Svelte
$: currentRoute = $router;

// Cleanup
unsubscribe();
```

---

#### `reset()`

```ts
reset(): this
```

Clears all registered routes except the catch-all (`*`).

**Returns:** The router instance for method chaining

**Example:**

```ts
router.reset().on("/new-route", () => NewPage);
```

---

#### `info()`

```ts
info(): Record<string, string>
```

Returns a map of registered route patterns to their labels.

**Returns:** Object mapping route patterns to labels (empty string if no label)

**Example:**

```ts
router.on("/users", () => {}, { label: "users-list" });
router.on("/posts", () => {}, { label: "posts-list" });

console.log(router.info());
// { "/users": "users-list", "/posts": "posts-list" }
```

---

## SimpleRoute

Low-level route pattern parser. Use this directly only when you need pattern matching without the full router functionality.

<a id="simpleroute-constructor"></a>
### Constructor

```ts
new SimpleRoute(pattern: string, options?: SimpleRouteOptions)
```

Creates a new route pattern parser.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `pattern` | `string` | Route pattern to match against |
| `options` | `SimpleRouteOptions` | Optional configuration (currently `{ strict?: boolean }`) |

**Throws:** `Error` if pattern is invalid — multiple spread segments, invalid regex, invalid parameter name in a named constraint, or an optional segment followed by a required one.

**Example:**

```ts
const route = new SimpleRoute("/user/[id([0-9]+)]");
const route2 = new SimpleRoute("/files/[...path]");

// Strict mode — '/a//b' will NOT match '/a/b'
const strict = new SimpleRoute("/a/b", { strict: true });
```

<a id="simpleroute-static-properties"></a>
### Static Properties

#### `SPLITTER`

```ts
static SPLITTER: string = "/"
```

Separator used to split paths into segments.

#### `WILDCARD`

```ts
static WILDCARD: string = "*"
```

Wildcard symbol for catch-all routes. Must be used as the last segment.

### Static Methods

#### `parseQueryString()`

```ts
static parseQueryString(str: string): RouteParams
```

Parses a query string into an object of key-value pairs.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `str` | `string` | Query string (without leading "?") |

**Returns:** `RouteParams` - Object with parsed query parameters

**Example:**

```ts
SimpleRoute.parseQueryString("foo=bar&baz=123");
// { foo: "bar", baz: "123" }

SimpleRoute.parseQueryString("name=John%20Doe&city=New%20York");
// { name: "John Doe", city: "New York" }

SimpleRoute.parseQueryString("empty=&flag");
// { empty: "", flag: "" }
```

### Instance Methods

#### `parse()`

```ts
parse(url: string, allowQueryParams?: boolean): RouteParams | null
```

Parses a string against this route pattern.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `url` | `string` | - | String to test against the pattern |
| `allowQueryParams` | `boolean` | `true` | Whether to parse query string parameters |

**Returns:** `RouteParams` object with extracted parameters, or `null` if no match

**Example:**

```ts
const route = new SimpleRoute("/user/[id]");

route.parse("/user/123");
// { id: "123" }

route.parse("/user/123?tab=profile");
// { id: "123", tab: "profile" }

route.parse("/user/123?tab=profile", false);
// { id: "123?tab=profile" }

route.parse("/post/456");
// null
```

---

## Types

### RouteParams

```ts
type RouteParams = Record<string, any>;
```

Object containing extracted route parameters. Keys are parameter names, values are the extracted string values.

### RouteCallback\<T\>

```ts
type RouteCallback<T = unknown> = (params: RouteParams | null, route: string) => T;
```

Callback function executed when a route matches.

**Type Parameters:**
- `T` - The return type of the callback (default: `unknown`)

**Parameters:**
- `params` - Extracted route parameters (or `null` if no params)
- `route` - The matched route pattern string

**Returns:** `T` - The value to be returned by `exec()`

### RouterConfig\<T\>

```ts
type RouterConfig<T = unknown> = Record<string, RouteCallback<T>>;
```

Configuration object mapping route patterns to callbacks.

**Type Parameters:**
- `T` - The return type of all route callbacks (default: `unknown`)

### RouterCurrent

```ts
interface RouterCurrent {
  route: string | null;   // Matched pattern, "*" for catch-all, null if no match
  params: RouteParams | null;
  label: string | null;
}
```

Current router state object.

### RouterOnOptions

```ts
interface RouterOnOptions {
  label?: string | null;      // Optional label for debugging
  allowQueryParams?: boolean; // Whether to parse query params (default: true)
  strict?: boolean;           // Per-route strict mode (overrides router default)
}
```

Options for the `on()` method.

### SimpleRouteOptions

```ts
interface SimpleRouteOptions {
  strict?: boolean; // Disable empty-segment collapsing (default: false)
}
```

Options for the `SimpleRoute` constructor.

### Logger

```ts
interface Logger {
  debug: (...args: unknown[]) => unknown;
  log: (...args: unknown[]) => unknown;
  warn: (...args: unknown[]) => unknown;
  error: (...args: unknown[]) => unknown;
}
```

Logger interface compatible with `@marianmeres/clog`. Provides console-compatible logging methods.

### RouterOptions\<T\>

```ts
interface RouterOptions<T = unknown> {
  routes?: RouterConfig<T> | null;  // Route configuration
  logger?: Logger | null;           // Optional logger instance
  strict?: boolean;                 // Strict mode; propagates to every route
}
```

Options object for the constructor (alternative to plain `RouterConfig`).

**Type Parameters:**
- `T` - The return type of route callbacks (default: `unknown`)

**`strict` mode:** when `true`, empty segments in both patterns and inputs (e.g. `/a//b`) are preserved rather than collapsed. This means `/a//b` will NOT match the canonical pattern `/a/b` — useful for URL canonicalization and preventing accidental shadow-matching in environments where concatenation bugs can produce doubled separators. Per-route `RouterOnOptions.strict` overrides this default.

### RouterSubscriber

```ts
type RouterSubscriber = (current: RouterCurrent) => void;
```

Callback function for route subscriptions.

### RouterUnsubscribe

```ts
type RouterUnsubscribe = () => void;
```

Unsubscribe function returned by `subscribe()`.

### RouteConfig (Internal)

```ts
interface RouteConfig {
  segment: string;
  name: string | null;
  test: RegExp;
  isOptional: boolean;
  isSpread: boolean;
}
```

Internal configuration for a parsed route segment. Exported for advanced use cases.

---

## Pattern Syntax

### Segment Types

| Pattern | Description | Example |
|---------|-------------|---------|
| `exact` | Literal match | `foo` matches "foo" |
| `[name]` | Named parameter | `[id]` captures any segment |
| `[name(regex)]` | Regex constrained | `[id([0-9]+)]` captures digits only |
| `[name]?` | Optional segment | `[id]?` matches with or without |
| `[...name]` | Spread parameter | `[...path]` captures multiple segments |
| `*` | Wildcard catch-all | Matches any remaining path |

### Key Behaviors

1. **Separator Normalization:** Multiple separators are collapsed in non-strict mode (default); trimmed from ends. Enable `strict: true` to preserve them.
2. **First Match Wins:** Routes matched in registration order. Enable `SimpleRouter.debug` for shadowing warnings at registration time.
3. **Query String Parsing:** Enabled by default, can disable per-route.
4. **Path Params Priority:** Path params override query params with the same name.
5. **URL Decoding:** Parameter _values_ are URL-decoded. Parameter _names_ are taken literally from the pattern (not decoded).

### Pattern Constraints

- Spread segments cannot be optional (`[...path]?` throws error)
- Only one spread segment allowed per route
- Wildcard `*` must be the last segment
- Regex in `[name(regex)]` must be valid JavaScript regex
- In a named constraint `[name(regex)]`, `name` must match `/^\w+$/`
- An optional segment (`[x]?`) may not be followed by a required segment — optional segments are only allowed in trailing position (or directly before a wildcard `*`)

### Security (regex constraints)

Regex constraints are compiled as ordinary JavaScript regexes. Some patterns (notably nested quantifiers like `(a+)+`) can exhibit catastrophic backtracking on crafted inputs. Route patterns are author-controlled — **never** accept them from untrusted input. Prefer simple character classes (`[0-9]+`, `[a-z]+`) over nested quantifiers.

### Examples

| Pattern | Input | Result |
|---------|-------|--------|
| `/foo` | `/bar` | `null` |
| `/foo` | `/foo` | `{}` |
| `/[foo]` | `/bar` | `{ foo: "bar" }` |
| `/[id([0-9]+)]` | `/123` | `{ id: "123" }` |
| `/[id([0-9]+)]` | `/abc` | `null` |
| `/foo/[bar]?` | `/foo` | `{}` |
| `/foo/[bar]?` | `/foo/baz` | `{ bar: "baz" }` |
| `/[...path]/[file]` | `/a/b/c.js` | `{ path: "a/b", file: "c.js" }` |
| `/*` | `/any/path` | `{}` |
| `/[foo]/*` | `/bar/baz` | `{ foo: "bar" }` |
