# @marianmeres/simple-router - AI Agent Reference

Machine-readable documentation for AI coding assistants.

## Package Metadata

```yaml
name: "@marianmeres/simple-router"
version: "2.2.3"
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
    exports: ["SimpleRoute", "SimpleRouter", "RouteConfig", "RouteParams", "Logger", "RouteCallback", "RouterConfig", "RouterCurrent", "RouterOnOptions", "RouterOptions", "RouterSubscriber", "RouterUnsubscribe"]

  - path: "src/route.ts"
    purpose: "Low-level pattern parser"
    exports: ["SimpleRoute", "RouteConfig", "RouteParams"]
    class: "SimpleRoute"

  - path: "src/router.ts"
    purpose: "High-level router with pub/sub"
    exports: ["SimpleRouter", "RouteParams", "Logger", "RouteCallback", "RouterConfig", "RouterCurrent", "RouterOnOptions", "RouterOptions", "RouterSubscriber", "RouterUnsubscribe"]
    class: "SimpleRouter"

test_files:
  - path: "tests/route.test.ts"
    test_count: 63
    coverage: "Pattern matching, query params, errors"

  - path: "tests/router.test.ts"
    test_count: 24
    coverage: "Router lifecycle, subscriptions, logger, edge cases"

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
class: SimpleRouter
purpose: "Main router for pattern matching and state management"

static_properties:
  - name: "debug"
    type: "boolean"
    default: false
    description: "Enable debug logging (uses logger if provided, else console.log)"

constructor:
  params:
    - name: "config"
      type: "RouterConfig | RouterOptions | null"
      optional: true
      description: "Route config or options object with routes and logger"

methods:
  - name: "on"
    signature: "(routes: string | string[], cb: RouteCallback, options?: RouterOnOptions) => void"
    description: "Register route(s) with callback"
    important: "Routes matched in registration order - first match wins"

  - name: "exec"
    signature: "(url: string, fallbackFn?: RouteCallback) => unknown"
    description: "Execute pattern matching"
    returns: "Callback result, or false if no match"

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
  throws: "Error if pattern invalid"

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
    constraint: "Must match regex"

  optional:
    syntax: "[name]?"
    example: "[id]?"
    captures: "{} or { id: 'value' }"

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

type RouteCallback = (params: RouteParams | null, route: string) => any;

type RouterConfig = Record<string, RouteCallback>;

interface Logger {
  debug: (...args: unknown[]) => unknown;
  log: (...args: unknown[]) => unknown;
  warn: (...args: unknown[]) => unknown;
  error: (...args: unknown[]) => unknown;
}

interface RouterOptions {
  routes?: RouterConfig | null;
  logger?: Logger | null;
}

interface RouterCurrent {
  route: string | null;
  params: RouteParams | null;
  label: string | null;
}

interface RouterOnOptions {
  label?: string | null;
  allowQueryParams?: boolean;
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

### SPA Hash Routing

```typescript
const router = new SimpleRouter({
  "/": () => HomePage,
  "/user/[id]": (params) => UserPage(params?.id),
  "*": () => NotFoundPage
});

window.addEventListener("hashchange", () => {
  const path = location.hash.slice(1) || "/";
  router.exec(path);
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
    implication: "Register specific routes before generic ones"

  - name: "Separator Normalization"
    description: "Multiple separators normalized, trimmed from ends"
    example: "//foo//bar// matches foo/bar"

  - name: "Query String Priority"
    description: "Path params override same-name query params"

  - name: "Catch-all Stored Separately"
    description: "'*' route stored in #catchAll, not in #routes array"

  - name: "Immediate Subscription Call"
    description: "subscribe() calls callback immediately with current state"
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
  - "URL encoding/decoding must be handled for params"
  - "Logger interface must remain compatible with @marianmeres/clog"
  - "Tests cover 87 cases - run before any changes"
```
