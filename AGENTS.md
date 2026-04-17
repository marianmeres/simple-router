# @marianmeres/simple-router - AI Agent Reference

Machine-readable documentation for AI coding assistants.

## Package Metadata

```yaml
name: "@marianmeres/simple-router"
version: "3.2.0"
runtime: ["deno", "node"]
module_system: "ESM"
entry_point: "src/mod.ts"
npm_dist: ".npm-dist/"
license: "MIT"
```

## Core Concepts

```yaml
purpose: "Framework-agnostic string pattern matcher and router"
use_cases:
  - "SPA client-side routing"
  - "File path matching"
  - "Command pattern matching"
  - "Any string identifier matching"
key_features:
  - "Dynamic route parameters with optional regex constraints"
  - "Wildcard and catch-all routes"
  - "Spread parameters for multi-segment matching"
  - "Query string parsing (toggleable per route)"
  - "Reactive subscriptions (Svelte store compatible)"
  - "First-match-wins routing"
```

## File Structure

```yaml
source_files:
  - path: "src/mod.ts"
    purpose: "Main entry point, re-exports public API"
    exports: ["SimpleRoute", "SimpleRouter", "RouteConfig", "RouteParams", "SimpleRouteOptions", "Logger", "RouteCallback", "RouterConfig", "RouterCurrent", "RouterOnOptions", "RouterOptions", "RouterSubscriber", "RouterUnsubscribe"]

  - path: "src/route.ts"
    purpose: "Low-level pattern parser"
    exports: ["SimpleRoute", "RouteConfig", "RouteParams", "SimpleRouteOptions"]
    class: "SimpleRoute"

  - path: "src/router.ts"
    purpose: "High-level router with pub/sub"
    exports: ["SimpleRouter", "RouteParams", "Logger", "RouteCallback", "RouterConfig", "RouterCurrent", "RouterOnOptions", "RouterOptions", "RouterSubscriber", "RouterUnsubscribe"]
    class: "SimpleRouter"

test_files:
  - path: "tests/route.test.ts"
    coverage: "Pattern matching, query params, regex-with-parens constraints, strict mode, optional-position rules"

  - path: "tests/router.test.ts"
    coverage: "Router lifecycle, subscriptions, logger, strict propagation, specificity-shadowing warning"

build_files:
  - path: "scripts/build-npm.ts"
    purpose: "Deno-to-npm build script"
```

## Dependencies

```yaml
runtime:
  - name: "@marianmeres/pubsub"
    version: "^2.4.1"
    registry: "jsr"
    purpose: "Reactive subscriptions"

dev_only:
  - "@std/assert"
  - "@std/fs"
  - "@std/path"
```

## API Summary

### SimpleRouter

```yaml
class: "SimpleRouter<T = unknown>"
purpose: "Main router for pattern matching and state management"
generic_param:
  name: "T"
  default: "unknown"
  description: "Return type of route callbacks and exec() method"

static_properties:
  - name: "debug"
    type: "boolean"
    default: false
    description: "Enable debug logging (uses logger if provided, else console.log)"

constructor:
  params:
    - name: "config"
      type: "RouterConfig<T> | RouterOptions<T> | null"
      optional: true
      description: "Route config or options object with routes, logger, and strict"

methods:
  - name: "on"
    signature: "(routes: string | string[], cb: RouteCallback<T>, options?: RouterOnOptions) => void"
    description: "Register route(s) with callback"
    important: "Routes matched in registration order - first match wins"

  - name: "exec"
    signature: "(url: string, fallbackFn?: RouteCallback<T>) => T | false"
    description: "Execute pattern matching"
    returns: "Callback result (type T), or false if no match"

  - name: "subscribe"
    signature: "(subscription: RouterSubscriber) => RouterUnsubscribe"
    description: "Subscribe to state changes (Svelte store compatible)"
    behavior: "Called immediately with current state"
    returns: "Unsubscribe function directly (not wrapped object)"

  - name: "reset"
    signature: "() => this"
    description: "Clear all routes (except catch-all)"

  - name: "info"
    signature: "() => Record<string, string>"
    description: "Get route-to-label mapping"

properties:
  - name: "current"
    type: "RouterCurrent"
    readonly: true
    description: "Current router state"
```

### SimpleRoute

```yaml
class: SimpleRoute
purpose: "Low-level pattern parser"

static_properties:
  - name: "SPLITTER"
    type: "string"
    default: "/"
  - name: "WILDCARD"
    type: "string"
    default: "*"

constructor:
  params:
    - name: "route"
      type: "string"
      description: "Pattern string"
    - name: "options"
      type: "SimpleRouteOptions"
      optional: true
      description: "e.g. { strict: true } to disable empty-segment collapsing"
  throws: "Error if pattern invalid (multiple spread segments, invalid regex, invalid param name, optional-followed-by-required)"

static_methods:
  - name: "parseQueryString"
    signature: "(str: string) => RouteParams"
    description: "Parse query string to object"

methods:
  - name: "parse"
    signature: "(url: string, allowQueryParams?: boolean) => RouteParams | null"
    description: "Match string against pattern"
    returns: "Params object or null"
```

## Pattern Syntax Reference

```yaml
patterns:
  exact:
    syntax: "literal"
    example: "foo"
    matches: "foo"

  named_param:
    syntax: "[name]"
    example: "[id]"
    captures: "{ id: 'value' }"

  regex_param:
    syntax: "[name(regex)]"
    example: "[id([0-9]+)]"
    captures: "{ id: '123' }"
    constraint: "name must match /^\\w+$/. Regex may contain parentheses (capturing/non-capturing groups, alternation) — balanced-paren splitting is used."

  optional:
    syntax: "[name]?"
    example: "[id]?"
    captures: "{} or { id: 'value' }"
    constraint: "Only allowed in trailing position (or directly before wildcard). Optional-followed-by-required throws at construction."

  spread:
    syntax: "[...name]"
    example: "[...path]"
    captures: "{ path: 'a/b/c' }"
    constraint: "Only one per route, cannot be optional"

  wildcard:
    syntax: "*"
    example: "/foo/*"
    constraint: "Must be last segment"
    captures: "{}"
```

## Type Definitions

```typescript
type RouteParams = Record<string, any>;

// Generic callback type - T is the return type
type RouteCallback<T = unknown> = (params: RouteParams | null, route: string) => T;

// Generic config type - T is the return type of all callbacks
type RouterConfig<T = unknown> = Record<string, RouteCallback<T>>;

interface Logger {
  debug: (...args: unknown[]) => unknown;
  log: (...args: unknown[]) => unknown;
  warn: (...args: unknown[]) => unknown;
  error: (...args: unknown[]) => unknown;
}

// Generic options type - T is the return type of route callbacks
interface RouterOptions<T = unknown> {
  routes?: RouterConfig<T> | null;
  logger?: Logger | null;
  strict?: boolean;             // propagates to every registered route
}

interface RouterCurrent {
  route: string | null;
  params: RouteParams | null;
  label: string | null;
}

interface RouterOnOptions {
  label?: string | null;
  allowQueryParams?: boolean;
  strict?: boolean;             // overrides router-level default
}

interface SimpleRouteOptions {
  strict?: boolean;             // disables empty-segment collapsing
}

type RouterSubscriber = (current: RouterCurrent) => void;

type RouterUnsubscribe = () => void;

interface RouteConfig {
  segment: string;
  name: string | null;
  test: RegExp;
  isOptional: boolean;
  isSpread: boolean;
}
```

## Common Usage Patterns

### SPA Hash Routing (Typed)

```typescript
// Type-safe router - exec() returns Component | false
const router = new SimpleRouter<Component>({
  "/": () => HomePage,
  "/user/[id]": (params) => UserPage(params?.id),
  "*": () => NotFoundPage
});

window.addEventListener("hashchange", () => {
  const path = location.hash.slice(1) || "/";
  const result = router.exec(path); // Component | false
  if (result !== false) render(result);
});
```

### File Path Matching

```typescript
const router = new SimpleRouter({
  "src/[module]/[file].ts": ({ module, file }) => process(module, file),
  "assets/[...path]": ({ path }) => loadAsset(path)
});
```

### Command Routing

```typescript
const router = new SimpleRouter({
  "user:create": () => createUser(),
  "user:delete:[id]": ({ id }) => deleteUser(id)
});
```

## Important Behaviors

```yaml
behaviors:
  - name: "First Match Wins"
    description: "Routes matched in registration order"
    implication: "Register specific routes before generic ones. When SimpleRouter.debug is true, shadowing is detected at registration and warned via the logger (or console.warn)."

  - name: "Separator Normalization"
    description: "Non-strict (default): multiple separators are collapsed and trimmed from ends. Strict (opt-in): internal empty segments are preserved."
    example: "non-strict: '//foo//bar//' matches 'foo/bar'. strict: '/a//b' does NOT match '/a/b'."

  - name: "Optional Segment Position"
    description: "Optional segments ('[x]?') may only appear trailing (or immediately before wildcard '*'). Optional-followed-by-required throws at construction — register separate routes instead."

  - name: "Query String Priority"
    description: "Path params override same-name query params"

  - name: "Catch-all Stored Separately"
    description: "'*' route stored in #catchAll, not in #routes array"

  - name: "Immediate Subscription Call"
    description: "subscribe() calls callback immediately with current state"

  - name: "Parameter Names Are Literal"
    description: "Parameter names in the pattern are NOT URI-decoded. The pattern '[id%20x]' produces the key 'id%20x'. Parameter values ARE decoded."
```

## Error Conditions

```yaml
errors:
  - condition: "Multiple spread segments"
    message: "Multiple spread segments are invalid"

  - condition: "Optional spread"
    message: "Spread segment must not be marked as optional"

  - condition: "Wildcard not last"
    message: "Wildcard '*' can be used only as a last segment"

  - condition: "Invalid regex in pattern"
    message: "Invalid regex in route pattern '{segment}': {error}"

  - condition: "Invalid parameter name in named constraint"
    message: "Invalid parameter name '{name}' in route pattern '{segment}' (must match /^\\w+$/)"

  - condition: "Optional segment followed by a required segment"
    message: "Invalid route '{route}': optional segment '{segment}?' must not be followed by a required segment ..."

  - condition: "Non-function subscriber"
    throws: "TypeError: Subscription is not a function"
```

## Development Commands

```yaml
commands:
  test: "deno task test"
  build_npm: "deno task npm:build"
  publish_npm: "deno task npm:publish"
```

## Code Modification Guidelines

```yaml
guidelines:
  - "Maintain Svelte store contract compatibility for subscribe()"
  - "subscribe() returns unsubscribe function directly (not wrapped object)"
  - "First-match-wins is core behavior - do not change"
  - "Query param parsing must remain toggleable per-route"
  - "Keep catch-all ('*') handling separate from regular routes"
  - "URL encoding/decoding: param VALUES are decoded; param NAMES are not"
  - "Logger interface must remain compatible with @marianmeres/clog"
  - "Strict mode is opt-in and propagates router → route; per-route can override"
  - "Shadowing warning runs only when SimpleRouter.debug is true (no perf cost otherwise)"
  - "Run `deno task test` before any changes"
```

## Breaking Changes (3.2.0)

```yaml
breaking_changes:
  - id: "optional-middle-rejected"
    description: "Patterns like '/foo/[bar]?/baz' now throw at construction. Previously they parsed but silently treated the optional marker as required. Register two separate routes instead."

  - id: "param-names-not-decoded"
    description: "Parameter names are taken literally from the pattern. '/foo/[id%20x]' used to produce the key 'id x'; now produces 'id%20x'. Parameter values are still URI-decoded."

  - id: "named-constraint-name-validated"
    description: "In a named regex constraint '[name(regex)]', 'name' must match /^\\w+$/. Previously this was not validated."

bug_fixes:
  - id: "regex-constraint-with-parens"
    description: "Constraints containing parentheses (e.g. '[s((?:a|b)+)]', '[x((\\d+)-(\\d+))]') used to produce garbage regexes or throw obscure errors due to greedy regex-based splitting. Now uses balanced-paren splitting and works correctly."
```
