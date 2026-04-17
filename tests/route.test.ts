import { SimpleRoute } from "../src/route.ts";
import { assertEquals, assertThrows } from "@std/assert";

const rpad = (s: string, len = 25) =>
	(s += " ".repeat(Math.max(0, len - s.length)));

// prettier-ignore
[
	// no match
	['/foo',                     '/bar',                null],
	['/foo',                     '',                    null],
	['/foo/[bar]',               '/foo',                null],
	['/[foo]/bar',               '/foo',                null],
	['/[foo]/[bar]',             '/foo',                null],
	// match no params (trailing separators are OK)
	['/',                        '',                    {}],
	['',                         '///',                 {}],
	['foo',                      'foo',                 {}],
	['//foo///bar.baz/',         'foo/bar.baz',         {}],
	['foo/bar/baz',              '//foo//bar/baz//',    {}],
	['#/foo//',                  '#/foo',               {}],
	// match with params
	['/[foo]',                   '/bar',                { foo: 'bar' }],
	['#/foo/[bar]',              '#/foo/bat',           { bar: 'bat' }],
	['#/[foo]/[bar]',            '#/baz/bat',           { foo: 'baz', bar: 'bat' }],
	['#/[foo]/bar',              '#/baz/bar',           { foo: 'baz' }],
	// params with regex constraint
	['/[id([0-9]+)]',            '/123',                { id: '123' }],
	['/[id(\\d-\\d)]',           '/1-2',                { id: '1-2' }],
	['/[id([0-9]+)]',            '/foo',                null],
	['/foo/[bar]/[id([0-9]+)]',  '/foo/baz/123',        { bar: 'baz', id: '123' }],
	['/foo/[id([0-9]+)]/[bar]',  '/foo/bar/baz',        null],
	// wrong regex - missing name...
	['/foo/[([0-9]+)]',          '/foo/123',            null],
	//
	['/[foo(bar)]/[baz]',         '/bar/bat',           { foo: 'bar', baz: 'bat' }],
	['/[foo(bar)]/[baz]',         '/baz/bat',           null],
	// url encoded values (param names are NOT decoded — authors write literal names)
	['/foo/[id%20x]',             '/foo/12%203',        { 'id%20x': '12 3' }],
	// optional param
	['/foo?',                     '/',                  {}],
	['/foo?',                     '/foo',               {}],
	['/foo?',                     '/bar',               null],
	['/foo/[bar]?',               '/foo',               {}],
	['/foo/[bar]?',               '/foo/bar',           { bar: 'bar' }],
	['/foo/[bar]?',               '/foo/bar/baz',       null],
	['/foo/[bar([0-9]+)]?',       '/foo',               {}],
	['/foo/[bar([0-9]+)]?',       '/foo/bar',           null],
	['/foo/[bar([0-9]+)]?',       '/foo/123',           { bar: '123' }],
	['/foo/[bar([0-9]+)]?',       '/foo/123/baz',       null],
	// optional-followed-by-required is rejected at construction
	// (register separate routes: '/foo/[bar]/baz' and '/foo/baz')
	['/foo/[bar]?/baz',           '/anything',          /optional segment/i],
	['/foo/[bar]?/[baz]?',        '/foo',               {}],
	['/foo/[bar]?/[baz]?',        '/foo/bar',           { bar: 'bar' }],
	['/foo/[bar]?/[baz]?',        '/foo/bar/baz',       { bar: 'bar', baz: 'baz' }],
	// spread params
	['/js/[...path]',             '/js/foo/bar/baz.js', { 'path': 'foo/bar/baz.js' }],
	['/js/[root]/[...path]',      '/js/foo/bar/baz.js', { 'root': 'foo', 'path': 'bar/baz.js' }],
	['/js/[...path]/[file]',      '/js/foo/bar/baz.js', { 'path': 'foo/bar', 'file': 'baz.js' }],
	['/[...path]/[file]',         '/foo/bar/baz.js',    { 'path': 'foo/bar', 'file': 'baz.js' }],
	// single char param name
	['/[f]',                      '/bar',               { f: 'bar' }],
	// wildcard
	['/*',                        '/',                  {}],
	['/*',                        '/foo',               {}],
	['/*',                        '/foo/bar/baz',       {}],
	['/foo/*',                    '/foo',               {}],
	['/foo/*',                    '/foo/bar',           {}],
	['/foo/*',                    '/foo/bar/baz/x.js',  {}],
	['/[foo]/*',                  '/foo/bar',           { foo: 'foo' }],
	['/[foo]/*',                  '/foo/bar/baz/x.js',  { foo: 'foo' }],
	['/[foo]?/*',                 '/foo/bar',           { foo: 'foo' }],
	['/[foo]?/*',                 '/bar',               { foo: 'bar' }],
	['/*/asdf',                   '/foo',               /wildcard/i],
	['/foo/[bar]/*',              '/foo/bar',           { bar: 'bar' }],
]
	.forEach(([route, input, expected, _only]) => {
		Deno.test(
			`${rpad(route as string, 23)} -> ${rpad(input as string, 16)} => ${expected instanceof RegExp ? expected : JSON.stringify(expected)}`,
			() => {
				try {
					const actual = new SimpleRoute(route as string).parse(input as string);
					assertEquals(actual, expected, JSON.stringify(actual));
				} catch (e) {
					if (expected instanceof RegExp) {
						const msg = (e as Error).toString();
						assertEquals(expected.test(msg), true, `${msg} does not match ${expected}`);
					} else {
						throw e;
					}
				}
			}
		)
	});

Deno.test("query params parsing works and is enabled by default", () => {
	let actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar?baz=ba%20t");
	assertEquals(actual, { bar: "bar", baz: "ba t" }, JSON.stringify(actual));

	// no match must still be no match
	actual = new SimpleRoute("/foo/[bar]").parse("/hoho?bar=bat");
	assertEquals(actual, null, JSON.stringify(actual));
});

Deno.test("path params have priority over query params", () => {
	const actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar?bar=bat");
	assertEquals(actual, { bar: "bar" }, JSON.stringify(actual));
});

Deno.test("query params parsing can be disabled", () => {
	let actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar?baz=bat", false);
	assertEquals(actual, { bar: "bar?baz=bat" }, JSON.stringify(actual));
	// note added slash
	actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar/?baz=bat", false);
	assertEquals(actual, null, JSON.stringify(actual));
});

// prettier-ignore
Deno.test('spread segment must not be optional', () => {
	assertThrows(() => new SimpleRoute('[...path]?'));
});

// prettier-ignore
Deno.test('there can only be one spread segment', () => {
	assertThrows(() => new SimpleRoute('/foo/[...some]/bar/[...another]'));
});

Deno.test("regex constraint may contain parentheses (capturing/non-capturing/alternation)", () => {
	// capturing groups inside the constraint
	let r = new SimpleRoute("/[id((\\d+)-(\\d+))]");
	assertEquals(r.parse("/12-34"), { id: "12-34" });
	assertEquals(r.parse("/abc"), null);

	// non-capturing alternation group
	r = new SimpleRoute("/[slug((?:foo|bar)+)]");
	assertEquals(r.parse("/foo"), { slug: "foo" });
	assertEquals(r.parse("/foobar"), { slug: "foobar" });
	assertEquals(r.parse("/baz"), null);

	// nested groups
	r = new SimpleRoute("/[x([0-9]{2}(?:-[0-9]{2})?)]");
	assertEquals(r.parse("/12"), { x: "12" });
	assertEquals(r.parse("/12-34"), { x: "12-34" });
	assertEquals(r.parse("/1"), null);
});

Deno.test("invalid regex inside a constraint throws a clear error", () => {
	assertThrows(
		() => new SimpleRoute("/[id([)]"),
		Error,
		"Invalid regex"
	);
});

Deno.test("param name in a named constraint must be \\w+", () => {
	assertThrows(
		() => new SimpleRoute("/[my-name(\\d+)]"),
		Error,
		"Invalid parameter name"
	);
});

Deno.test("optional segment followed by a required segment is rejected at construction", () => {
	assertThrows(() => new SimpleRoute("/foo/[bar]?/baz"), Error, "optional segment");
	assertThrows(() => new SimpleRoute("/[a]?/b"), Error, "optional segment");
	// trailing optionals are fine
	new SimpleRoute("/foo/[bar]?");
	new SimpleRoute("/foo/[a]?/[b]?");
	// optional followed by wildcard is fine (wildcard is itself optional)
	new SimpleRoute("/[foo]?/*");
});

Deno.test("strict mode: empty segments in input do NOT collapse", () => {
	const r = new SimpleRoute("/a/b", { strict: true });
	assertEquals(r.parse("/a/b"), {});
	// trailing slashes still trimmed
	assertEquals(r.parse("/a/b/"), {});
	// doubled internal separator is now a distinct empty segment
	assertEquals(r.parse("/a//b"), null);
	assertEquals(r.parse("//a/b"), {}); // leading duplicates still trimmed
});

Deno.test("non-strict (default): empty segments in input collapse (documented)", () => {
	const r = new SimpleRoute("/a/b");
	assertEquals(r.parse("/a//b"), {});
	assertEquals(r.parse("/a///b"), {});
});

Deno.test("param names are NOT URI-decoded (BC: previously decoded)", () => {
	// The value is still decoded, but the key is now the literal pattern name.
	const r = new SimpleRoute("/foo/[id%20x]");
	assertEquals(r.parse("/foo/12%203"), { "id%20x": "12 3" });
});
