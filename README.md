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

There are two objects `SimpleRoute` and `SimpleRouter`. `SimpleRouter` keeps collection of
`SimpleRoute`s and perform match on them in order in which they were registered. First match wins.

`SimpleRoute` is hidden from the top level router api, but internally does this:
```js
const result = new SimpleRoute('/route/definition').parse(input);
```
where `result` is either `null` (no match) or params `object` (input matched). Params
object will be empty `{}` if there are no named segments. Named segment is defined in
brackets, e.g.: `/[foo]`.

`SimpleRouter` does:
- register routes with their "on match" callbacks: `router.on('/route/definition', callback)`
- perform match `router.exec(input)`, which will **return** the matched route's executed callback.
The callback can either do actual work (e.g. render page) or return an arbitrary value
for later consumption (e.g. return component instance). Callback receives the matched
route's parsed params object as a parameter.

Example code:

```js
// routes definitions can be added via ctor config object
const router = new SimpleRouter({
    '/': () => pageIndex(),
    '*': () => page404(), // special case catch-all (last resort fallback)
});

// or via "on" api
router.on(
    '/article/[id([0-9]+)]/[slug]',
    ({ id, slug }) => pageArticle(id, slug)
);

// finally, perform route match (execute router)
// (example here returns "component" which is then "rendered")
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
