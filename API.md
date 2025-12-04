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

### Constructor

```ts
new SimpleRouter(config?: RouterConfig | RouterOptions | null)
```

Creates a new router instance.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `config` | `RouterConfig \| RouterOptions \| null` | Optional route configuration or options object |

**Example:**

```ts
// Empty router
const router = new SimpleRouter();

// Simple config (backwards compatible)
const router = new SimpleRouter({
  "/": () => HomePage,
  "/about": () => AboutPage,
  "*": () => NotFoundPage
});

// With options object (for logger support)
const router = new SimpleRouter({
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
on(routes: string | string[], cb: RouteCallback, options?: RouterOnOptions): void
```

Registers one or more route patterns with a callback function.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `routes` | `string \| string[]` | Single route pattern or array of patterns |
| `cb` | `RouteCallback` | Callback function executed when route matches |
| `options` | `RouterOnOptions` | Optional configuration object |

**Options:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `label` | `string \| null` | `null` | Label for debugging/identification |
| `allowQueryParams` | `boolean` | `true` | Whether to parse query parameters |

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

---

#### `exec()`

```ts
exec(url: string, fallbackFn?: RouteCallback): unknown
```

Executes pattern matching against the provided string.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `url` | `string` | String to match against registered patterns |
| `fallbackFn` | `RouteCallback` | Optional fallback function if no route matches |

**Returns:** The value returned by the matched callback, or `false` if no match and no catch-all/fallback.

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
new SimpleRoute(pattern: string)
```

Creates a new route pattern parser.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `pattern` | `string` | Route pattern to match against |

**Throws:** `Error` if pattern is invalid (e.g., multiple spread segments, invalid regex)

**Example:**

```ts
const route = new SimpleRoute("/user/[id([0-9]+)]");
const route2 = new SimpleRoute("/files/[...path]");
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

### RouteCallback

```ts
type RouteCallback = (params: RouteParams | null, route: string) => any;
```

Callback function executed when a route matches.

**Parameters:**
- `params` - Extracted route parameters (or `null` if no params)
- `route` - The matched route pattern string

### RouterConfig

```ts
type RouterConfig = Record<string, RouteCallback>;
```

Configuration object mapping route patterns to callbacks.

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
}
```

Options for the `on()` method.

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

### RouterOptions

```ts
interface RouterOptions {
  routes?: RouterConfig | null;  // Route configuration
  logger?: Logger | null;        // Optional logger instance
}
```

Options object for the constructor (alternative to plain `RouterConfig`).

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

1. **Separator Normalization:** Multiple separators normalized to single; trimmed from ends
2. **First Match Wins:** Routes matched in registration order
3. **Query String Parsing:** Enabled by default, can disable per-route
4. **Path Params Priority:** Path params override query params with same name
5. **URL Decoding:** Both param names and values are URL-decoded

### Pattern Constraints

- Spread segments cannot be optional (`[...path]?` throws error)
- Only one spread segment allowed per route
- Wildcard `*` must be the last segment
- Regex in `[name(regex)]` must be valid JavaScript regex

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
