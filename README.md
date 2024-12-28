# @marianmeres/simple-router

Small path-like string parser. Originally inspired by
[sapper-like regex routes](https://sapper.svelte.dev/docs#Regexes_in_routes).
Intended primarily for - but not limited to - client side SPA routing.

## Installation

```shell
npm i @marianmeres/simple-router
```

## Quick example

```js
// routes definitions can be added via ctor config object
const router = new SimpleRouter({
    '/': () => pageIndex(),
    '*': () => page404(), // catch all (last resort fallback)
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
- `exact?` or `[name]?` marks segment as optional
- `[...name]` matches "rest segments"
- `*` matches zero or more following segments

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
| `/foo/[bar]?`             | `/foo`             | `{}`                        |
| `/foo/[bar]?`             | `/foo/bar`         | `{ bar: "bar" }`            |
| `/foo/[bar]?/baz`         | `/foo/bar/baz`     | `{ bar: "bar" }`            |
| `/[...path]/[file]`       | `/foo/bar/baz.js`  | `{ path: "foo/bar", file: "baz.js" }`|
| `/foo/*`                  | `/foo/bar/baz.js`  | `{}`                        |
| `/[foo]/*`                | `/foo/bar`         | `{ foo: "foo" }`            |
| `/*`                      | `/foo/bar`         | `{}`                        |
See [tests](tests) or [examples](examples) for more.

