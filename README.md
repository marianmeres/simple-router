# Simple router

Minimalistic route parser for [sapper-like regex
routes](https://sapper.svelte.dev/docs#Regexes_in_routes) itended for
SPA hash change routing primarily, but could be used for any simple string based
routing needs, for example, server sides websocket message routing...

## Installation

```shell
npm install https://github.com/marianmeres/simple-router
```

## Quick start
```js
// routes via ctor options
const router = new SimpleRouter({
    '/': () => pageIndex(),
    '*': () => page404(),
});

// route definition via "on" api
router.on(
    '/article/[id([0-9]+)]/[slug]',
    ({ id, slug }) => pageArticle(id)
);

// e.g.
render(router.exec(location.hash));
```

See [tests](tests) or [examples](examples) for more.

## Route matching example

| Route definition          | Input              | Result                      |
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
| `#/foo/`                  | `#/foo`            | `{}`                        |
| `/[foo]`                  | `/bar`             | `{"foo":"bar"}`             |
| `#/foo/[bar]`             | `#/foo/bat`        | `{"bar":"bat"}`             |
| `#/[foo]/[bar]`           | `#/baz/bat`        | `{"foo":"baz","bar":"bat"}` |
| `#/[foo]/bar`             | `#/baz/bar`        | `{"foo":"baz"}`             |
| `/[id([0-9]+)]`           | `/123`             | `{"id":"123"}`              |
| `/[id(\d-\d)]`            | `/1-2`             | `{"id":"1-2"}`              |
| `/[id([0-9]+)]`           | `/foo`             | `null`                      |
| `/foo/[bar]/[id([0-9]+)]` | `/foo/baz/123`     | `{"bar":"baz","id":"123"}`  |
| `/foo/[id([0-9]+)]/[bar]` | `/foo/bar/baz`     | `null`                      |
| `/foo/[([0-9]+)]`         | `/foo/123`         | `null`                      |

See [tests](tests) or [examples](examples) for more.
