import { SimpleRoute } from "../src/route.ts";
import assert from "node:assert/strict";
import { test } from "node:test";

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
		test(
			`${rpad(route as string, 23)} -> ${rpad(input as string, 16)} => ${expected instanceof RegExp ? expected : JSON.stringify(expected)}`,
			() => {
				try {
					const actual = new SimpleRoute(route as string).parse(input as string);
					assert.deepStrictEqual(actual, expected, JSON.stringify(actual));
				} catch (e) {
					if (expected instanceof RegExp) {
						const msg = (e as Error).toString();
						assert.deepStrictEqual(expected.test(msg), true, `${msg} does not match ${expected}`);
					} else {
						throw e;
					}
				}
			}
		)
	});

test("query params parsing works and is enabled by default", () => {
	let actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar?baz=ba%20t");
	assert.deepStrictEqual(actual, { bar: "bar", baz: "ba t" }, JSON.stringify(actual));

	// no match must still be no match
	actual = new SimpleRoute("/foo/[bar]").parse("/hoho?bar=bat");
	assert.deepStrictEqual(actual, null, JSON.stringify(actual));
});

// https://github.com/marianmeres/simple-router/issues/2
test("query param values may contain '='", () => {
	const qs = "token=YWJjZA==&redirect=/items?page=2&filter=a=b";
	const expected = {
		token: "YWJjZA==",
		redirect: "/items?page=2",
		filter: "a=b",
	};

	let actual = SimpleRoute.parseQueryString(qs);
	assert.deepStrictEqual(actual, expected, JSON.stringify(actual));

	// same through the route parser (only the first "?" starts the query string)
	actual = new SimpleRoute("/search").parse("/search?" + qs)!;
	assert.deepStrictEqual(actual, expected, JSON.stringify(actual));

	// value consisting only of "="
	actual = SimpleRoute.parseQueryString("k==");
	assert.deepStrictEqual(actual, { k: "=" }, JSON.stringify(actual));

	// unchanged: encoded "=", bare flag, empty value, empty key (dropped)
	actual = SimpleRoute.parseQueryString("enc=a%3Db&flag&empty=&=orphan");
	assert.deepStrictEqual(actual, { enc: "a=b", flag: "", empty: "" }, JSON.stringify(actual));
});

test("path params have priority over query params", () => {
	const actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar?bar=bat");
	assert.deepStrictEqual(actual, { bar: "bar" }, JSON.stringify(actual));
});

test("query params parsing can be disabled", () => {
	let actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar?baz=bat", false);
	assert.deepStrictEqual(actual, { bar: "bar?baz=bat" }, JSON.stringify(actual));
	// note added slash
	actual = new SimpleRoute("/foo/[bar]").parse("/foo/bar/?baz=bat", false);
	assert.deepStrictEqual(actual, null, JSON.stringify(actual));
});

// prettier-ignore
test('spread segment must not be optional', () => {
	assert.throws(() => new SimpleRoute('[...path]?'));
});

// prettier-ignore
test('there can only be one spread segment', () => {
	assert.throws(() => new SimpleRoute('/foo/[...some]/bar/[...another]'));
});

test("regex constraint may contain parentheses (capturing/non-capturing/alternation)", () => {
	// capturing groups inside the constraint
	let r = new SimpleRoute("/[id((\\d+)-(\\d+))]");
	assert.deepStrictEqual(r.parse("/12-34"), { id: "12-34" });
	assert.deepStrictEqual(r.parse("/abc"), null);

	// non-capturing alternation group
	r = new SimpleRoute("/[slug((?:foo|bar)+)]");
	assert.deepStrictEqual(r.parse("/foo"), { slug: "foo" });
	assert.deepStrictEqual(r.parse("/foobar"), { slug: "foobar" });
	assert.deepStrictEqual(r.parse("/baz"), null);

	// nested groups
	r = new SimpleRoute("/[x([0-9]{2}(?:-[0-9]{2})?)]");
	assert.deepStrictEqual(r.parse("/12"), { x: "12" });
	assert.deepStrictEqual(r.parse("/12-34"), { x: "12-34" });
	assert.deepStrictEqual(r.parse("/1"), null);
});

test("invalid regex inside a constraint throws a clear error", () => {
	assert.throws(
		() => new SimpleRoute("/[id([)]"),
		{ name: "Error", message: /Invalid regex/ }
	);
});

test("param name in a named constraint must be \\w+", () => {
	assert.throws(
		() => new SimpleRoute("/[my-name(\\d+)]"),
		{ name: "Error", message: /Invalid parameter name/ }
	);
});

test("optional segment followed by a required segment is rejected at construction", () => {
	assert.throws(() => new SimpleRoute("/foo/[bar]?/baz"), { name: "Error", message: /optional segment/ });
	assert.throws(() => new SimpleRoute("/[a]?/b"), { name: "Error", message: /optional segment/ });
	// trailing optionals are fine
	new SimpleRoute("/foo/[bar]?");
	new SimpleRoute("/foo/[a]?/[b]?");
	// optional followed by wildcard is fine (wildcard is itself optional)
	new SimpleRoute("/[foo]?/*");
});

test("strict mode: empty segments in input do NOT collapse", () => {
	const r = new SimpleRoute("/a/b", { strict: true });
	assert.deepStrictEqual(r.parse("/a/b"), {});
	// trailing slashes still trimmed
	assert.deepStrictEqual(r.parse("/a/b/"), {});
	// doubled internal separator is now a distinct empty segment
	assert.deepStrictEqual(r.parse("/a//b"), null);
	assert.deepStrictEqual(r.parse("//a/b"), {}); // leading duplicates still trimmed
});

test("non-strict (default): empty segments in input collapse (documented)", () => {
	const r = new SimpleRoute("/a/b");
	assert.deepStrictEqual(r.parse("/a//b"), {});
	assert.deepStrictEqual(r.parse("/a///b"), {});
});

test("param names are NOT URI-decoded (BC: previously decoded)", () => {
	// The value is still decoded, but the key is now the literal pattern name.
	const r = new SimpleRoute("/foo/[id%20x]");
	assert.deepStrictEqual(r.parse("/foo/12%203"), { "id%20x": "12 3" });
});

// `route` was a constructor parameter property, which Node's type stripping refuses;
// it is now a declared field assigned in the constructor. Pins that it stays public,
// holds the pattern exactly as given (not the sanitized form), and is an own property.
test("route property exposes the pattern as given", () => {
	const pattern = "//foo/[id([0-9]+)]?/";
	const r = new SimpleRoute(pattern, { strict: true });
	assert.strictEqual(r.route, pattern);
	assert.ok(Object.hasOwn(r, "route"));
	assert.deepStrictEqual(Object.keys(r), ["route"]);
});
