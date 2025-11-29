# @marianmeres/simple-router

A lightweight, framework-agnostic string pattern matcher and router with support for dynamic parameters, wildcards, query strings, and reactive subscriptions.

Can match any string identifiers - URLs, file paths, command names, or custom patterns. Originally inspired by [Sapper-like regex routes](https://sapper.svelte.dev/docs#Regexes_in_routes). Primarily designed for client-side SPA routing, but flexible enough for any pattern matching needs.

## Features

- ✨ Dynamic route parameters with optional regex constraints
- 🎯 Wildcard and catch-all routes
- 📦 Spread parameters for multi-segment matching
- 🔍 Query string parsing (with option to disable per route)
- 🔄 Reactive subscriptions (Svelte store contract compatible)
- 🪶 Zero dependencies (except `@marianmeres/pubsub` for subscriptions)
- 📘 Full TypeScript support
- 🎨 Framework-agnostic

## Installation

```shell
deno add "jsr:@marianmeres/simple-router";
```

```shell
npm install @marianmeres/simple-router
```

```ts
import { SimpleRouter } from "@marianmeres/simple-router";
```

## Quick Example

```ts
import { SimpleRouter } from "@marianmeres/simple-router";

// Routes can be defined via constructor config
const router = new SimpleRouter({
	"/": () => HomePage,
	"/about": () => AboutPage,
	"*": () => NotFoundPage, // catch-all fallback
});

// Or via the "on" API
router.on("/user/[id([0-9]+)]", (params) => {
	console.log("User ID:", params?.id);
	return UserPage(params?.id);
});

router.on("/article/[id]/[slug]", ({ id, slug }) => {
	return ArticlePage(id, slug);
});

// Execute route matching
const component = router.exec("/user/123");

// Use with hash routing
window.onhashchange = () => {
	const component = router.exec(location.hash.slice(1));
	render(component);
};
```

## Route Patterns

### Basic Segments

- `exact` - Matches exactly "exact"
- `[name]` - Matches any segment, captured as `{ name: "value" }`
- `[name(regex)]` - Matches if regex test passes
- `[name]?` - Optional segment
- `[...name]` - Spread params (matches multiple segments)
- `*` - Wildcard (matches zero or more segments)

### Separators

The default separator is `/`. Multiple separators are normalized to single, and separators are trimmed from both ends before matching.

## Pattern Examples

| Route Pattern                 | URL Input          | Params Result                    |
| ----------------------------- | ------------------ | -------------------------------- |
| `/foo`                        | `/bar`             | `null` (no match)                |
| `/foo`                        | (empty)            | `null`                           |
| `/foo/[bar]`                  | `/foo`             | `null`                           |
| `/`                           | (empty)            | `{}`                             |
| `foo`                         | `foo`              | `{}`                             |
| `//foo///bar.baz/`            | `foo/bar.baz`      | `{}`                             |
| `/[foo]`                      | `/bar`             | `{ foo: "bar" }`                 |
| `#/[foo]/[bar]`               | `#/baz/bat`        | `{ foo: "baz", bar: "bat" }`     |
| `/[id([0-9]+)]`               | `/123`             | `{ id: "123" }`                  |
| `/[id([0-9]+)]`               | `/foo`             | `null` (regex fails)             |
| `/foo/[bar]/[id([0-9]+)]`     | `/foo/baz/123`     | `{ bar: "baz", id: "123" }`      |
| `/foo/[bar]?`                 | `/foo`             | `{}`                             |
| `/foo/[bar]?`                 | `/foo/bar`         | `{ bar: "bar" }`                 |
| `/foo/[bar]?/baz`             | `/foo/bar/baz`     | `{ bar: "bar" }`                 |
| `/[...path]/[file]`           | `/foo/bar/baz.js`  | `{ path: "foo/bar", file: "baz.js" }` |
| `/foo/*`                      | `/foo/bar/baz.js`  | `{}`                             |
| `/[foo]/*`                    | `/foo/bar`         | `{ foo: "foo" }`                 |

## API Reference

### SimpleRouter

#### Constructor

```ts
const router = new SimpleRouter(config?);
```

- `config` - Optional object mapping route patterns to callbacks

#### Methods

##### `on(routes, callback, options?)`

Register one or more route patterns with a callback.

```ts
router.on("/users", () => UsersPage);

// Multiple routes to same handler
router.on(["/", "/home", "/index.html"], () => HomePage);

// With dynamic params
router.on("/user/[id]", (params) => UserPage(params?.id));

// With regex constraint
router.on("/post/[id([0-9]+)]", (params) => PostPage(params?.id));

// With label for debugging
router.on("/admin", () => AdminPage, { label: "admin-dashboard" });

// Disable query param parsing for this route
router.on("/raw", (params) => RawPage, { allowQueryParams: false });
```

**Options:**
- `label` - Optional label for debugging (visible via `info()`)
- `allowQueryParams` - Whether to parse query parameters (default: `true`)

**Important:** Routes are matched in registration order. First match wins!

##### `exec(url, fallbackFn?)`

Execute route matching against a URL.

```ts
const result = router.exec("/users");

// With fallback
router.exec("/unknown", () => console.log("Not found"));

// With query params
router.exec("/search?q=hello");
```

Returns the value returned by the matched callback, or `false` if no match.

##### `subscribe(callback)`

Subscribe to router state changes. Follows the [Svelte store contract](https://svelte.dev/docs#Store_contract).

```ts
const { unsubscribe } = router.subscribe((state) => {
	console.log("Route:", state.route);
	console.log("Params:", state.params);
	console.log("Label:", state.label);
});

// Later
unsubscribe();
```

The callback is called immediately with the current state, then on every route change.

##### `reset()`

Clears all registered routes (except catch-all).

```ts
router.reset().on("/new-route", () => NewPage);
```

##### `info()`

Returns a map of registered routes to their labels (for debugging).

```ts
router.on("/users", () => {}, { label: "users-list" });
console.log(router.info()); // { "/users": "users-list" }
```

#### Properties

##### `current`

Gets the current router state (readonly).

```ts
router.exec("/user/123");
console.log(router.current);
// { route: "/user/[id]", params: { id: "123" }, label: null }
```

##### `static debug`

Enable/disable debug logging.

```ts
SimpleRouter.debug = true;
router.exec("/test"); // Logs matching details to console
```

### SimpleRoute

Low-level route parser. Usually you don't need to use this directly.

```ts
import { SimpleRoute } from "@marianmeres/simple-router";

const route = new SimpleRoute("/user/[id([0-9]+)]");
const params = route.parse("/user/123");
console.log(params); // { id: "123" }
```

#### Static Methods

##### `parseQueryString(str)`

Parse a query string into an object.

```ts
SimpleRoute.parseQueryString("foo=bar&baz=123");
// Returns: { foo: "bar", baz: "123" }
```

## TypeScript

Full TypeScript support with exported types:

```ts
import type {
	RouteParams,
	RouteCallback,
	RouterConfig,
	RouterCurrent,
	RouterOnOptions,
	RouterSubscriber,
	RouterSubscription,
} from "@marianmeres/simple-router";
```

## Advanced Examples

### SPA with Hash Routing

```ts
const router = new SimpleRouter({
	"/": () => HomePage,
	"/about": () => AboutPage,
	"/user/[id]": (params) => UserPage(params?.id),
	"*": () => NotFoundPage,
});

function render(component) {
	document.getElementById("app").innerHTML = component;
}

window.addEventListener("hashchange", () => {
	const path = location.hash.slice(1) || "/";
	const component = router.exec(path);
	render(component);
});

// Trigger initial render
window.dispatchEvent(new HashChangeEvent("hashchange"));
```

### Route Priority

Routes are matched in registration order (first match wins):

```ts
const router = new SimpleRouter();

// Register generic route first
router.on("/user/[id]", (params) => {
	console.log("Generic:", params?.id); // This will match
});

// Specific route registered second (won't match "/user/admin")
router.on("/user/admin", () => {
	console.log("Admin"); // This won't be reached
});

router.exec("/user/admin"); // Logs: "Generic: admin"
```

To fix, register more specific routes first:

```ts
router.on("/user/admin", () => console.log("Admin"));
router.on("/user/[id]", (params) => console.log("User:", params?.id));
```

### Beyond URLs: General Pattern Matching

The router can match any string patterns, not just URLs:

```ts
// File path routing
const fileRouter = new SimpleRouter({
	"src/[module]/[file].ts": ({ module, file }) =>
		console.log(`Module: ${module}, File: ${file}`),
	"assets/images/[...path]": ({ path }) =>
		console.log(`Image path: ${path}`),
});

fileRouter.exec("src/components/Button.ts");
// Logs: "Module: components, File: Button"

fileRouter.exec("assets/images/icons/user.png");
// Logs: "Image path: icons/user.png"

// Command routing
const cmdRouter = new SimpleRouter({
	"user:create": () => createUser(),
	"user:delete:[id([0-9]+)]": ({ id }) => deleteUser(id),
	"cache:clear:[type(redis|memcached)]?": ({ type = "all" }) =>
		clearCache(type),
});

cmdRouter.exec("user:delete:123");
cmdRouter.exec("cache:clear:redis");
cmdRouter.exec("cache:clear"); // type defaults to "all"

// Custom separator (anything that's not a special regex char works)
const dotRouter = new SimpleRouter({
	"app.settings.theme": () => "Theme settings",
	"app.settings.[section]": ({ section }) => `Settings: ${section}`,
});

dotRouter.exec("app.settings.profile");
// Returns: "Settings: profile"
```

## License

MIT

## Links

- [Tests](tests/) - Comprehensive test suite with 82+ tests
- [GitHub Repository](https://github.com/marianmeres/simple-router)
- [JSR Package](https://jsr.io/@marianmeres/simple-router)
