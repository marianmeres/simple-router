# Simple router

Minimalistic (zero dependencies, ~100 lines) route parser for [sapper-like regex
routes](https://sapper.svelte.dev/docs#Regexes_in_routes). Intended primarily for
client side SPA routing, but can be used for any simple string based
dispatching needs (e.g. server side websocket message routing, etc...)

## Installation

```shell
npm install https://github.com/marianmeres/simple-router
```

## Quick start
```js
// routes via ctor config object
const router = new SimpleRouter({
    '/': () => pageIndex(),
    '*': () => page404(), // special case catch-all (last resort fallback)
});

// route definition via "on" api
router.on(
    '/article/[id([0-9]+)]/[slug]',
    ({ id, slug }) => pageArticle(id)
);

// e.g.
window.onhashchange = () => render(router.exec(location.hash));
```

See [tests](tests) or [examples](examples) for more.

## Route matching

Route segments:
- `exact` matches `exact`
- `[name]` matches `any` and is resolved as `{ name: 'any' }` param
- `[name(regex)]` matches if `regex.test(segment)` is truthy

Few notes on segments separators (which is slash `/` by default):
- multiple ones are always normalized to single,
- separator is always trimmed (both left and right) before matching

| Example route definition  | Example input      | Result                      |
| ------------------------- | ------------------ | --------------------------- |
| `/foo`                    | `/bar`             | `null`                      |
| `/foo`                    | (empty string)     | `null`                      |
| `/foo/[bar]`              | `/foo`             | `null`                      |
| `/[foo]/bar`              | `/foo`             | `null`                      |
| `/[foo]/[bar]`            | `/foo`             | `null`                      |
| `/`                       | (empty string)     | `{}`                        |
| (empty string)            | `///`              | `{}`                        |
| `foo`                     | `foo`              | `{}`                        |
| `//foo///bar.baz/`        | `foo/bar.baz`      | `{}`                        |
| `foo/bar/baz`             | `//foo//bar/baz//` | `{}`                        |
| `/[foo]`                  | `/bar`             | `{"foo":"bar"}`             |
| `#/foo/[bar]`             | `#/foo/bat`        | `{"bar":"bat"}`             |
| `#/[foo]/[bar]`           | `#/baz/bat`        | `{"foo":"baz","bar":"bat"}` |
| `#/[foo]/bar`             | `#/baz/bar`        | `{"foo":"baz"}`             |
| `/[id([0-9]+)]`           | `/123`             | `{"id":"123"}`              |
| `/[id(\d-\d)]`            | `/1-2`             | `{"id":"1-2"}`              |
| `/[id([0-9]+)]`           | `/foo`             | `null`                      |
| `/foo/[bar]/[id([0-9]+)]` | `/foo/baz/123`     | `{"bar":"baz","id":"123"}`  |
| `/foo/[id([0-9]+)]/[bar]` | `/foo/bar/baz`     | `null`                      |
| `/foo/[([0-9]+)]`         | `/foo/123`         | `null` (missing name before regex) |

See [tests](tests) or [examples](examples) for more.
