import assert from "node:assert/strict";
import { test } from "node:test";
import { SimpleRouter } from "../src/router.ts";

test("sanity check", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/": () => log.push("index"),
	});

	//
	assert.deepStrictEqual(router.current.route, null);
	assert.deepStrictEqual(router.current.params, null);

	// match returns truthy (depends on the callback)
	assert.ok(router.exec("/") != null);

	//
	assert.deepStrictEqual(router.current.route, "/");
	assert.ok(router.current.params != null);

	// returns falsey on no match (but only if no fallback or catch all provided)
	assert.deepStrictEqual(router.exec("/wrong/path"), false);

	//
	assert.deepStrictEqual(router.current.route, null);
	assert.deepStrictEqual(router.current.params, null);

	assert.deepStrictEqual(log.join(), "index");
});

test("route id callback param", () => {
	const log: Array<[any, string]> = [];
	const router = new SimpleRouter({
		"*": (params, routeId) => log.push([params, routeId]),
		"/[foo]": (params, routeId) => log.push([params, routeId]),
	});

	router.exec("/");
	router.exec("/bar");
	router.exec("/");

	assert.deepStrictEqual(
		JSON.stringify(log),
		JSON.stringify([
			[null, "*"],
			[{ foo: "bar" }, "/[foo]"],
			[null, "*"],
		]),
	);
});

test("first match wins", () => {
	const log: string[] = [];
	const router = new SimpleRouter();

	router.on(["/", "/index.html"], () => log.push("index")); // must win
	router.on("/", () => log.push("foo"));

	router.exec("/");
	assert.deepStrictEqual(log.join(), "index");
});

test("exec fallback", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/": () => log.push("index"),
	});

	router.exec("/foo", () => log.push("fallback"));

	assert.deepStrictEqual(log.join(), "fallback");
});

test("catch all fallback", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/": () => log.push("index"),
		"*": () => log.push("404"),
	});

	// truthy even on no match (because catch all returns truthy)
	assert.ok(router.exec("/foo") != null);

	assert.deepStrictEqual(router.current.route, "*");

	router.exec("/");

	assert.deepStrictEqual(log.join(), "404,index");
});

test("exec returns arbitrary value", () => {
	const indexComponent = { page: "index" };
	const notFound = { page: "not-found" };

	const router = new SimpleRouter({
		"/": () => indexComponent,
		"*": () => notFound,
	});

	assert.deepStrictEqual(router.exec("/"), indexComponent);
	assert.deepStrictEqual(router.exec("/foo"), notFound);
});

test("integration", () => {
	const log: string[] = [];
	const log2: Array<string | null> = [];

	// routes can be configured via ctor config
	const router = new SimpleRouter<number>({
		"/": () => log.push("index"),
		"*": () => log.push("404"),
	});

	router.subscribe((v) => log2.push(v.route));

	// or via "on" api
	const route = "/[bar]/[id([\\d]+)]/baz";
	router.on(route, (params) => {
		if (params) return log.push(`${params.bar}:${params.id}`);
		return 0;
	});

	router.exec("hey", () => log.push("ho")); // custom fallback
	assert.deepStrictEqual(router.current.route, null);

	router.exec("id/non-digits/baz"); // 404
	assert.deepStrictEqual(router.current.route, "*");
	assert.deepStrictEqual(router.current.params, null);

	router.exec("id/123/baz"); // id:123
	assert.deepStrictEqual(router.current.route, route);
	// a fresh reference: node:assert's deepStrictEqual is an `asserts` function, so the
	// null check above narrowed `router.current.params` to null for the rest of the test
	const current = router.current;
	assert.deepStrictEqual(current.params?.bar, "id");
	assert.deepStrictEqual(current.params?.id, "123");

	router.exec(""); // index
	assert.deepStrictEqual(router.current.route, "/");

	assert.deepStrictEqual(log.join(), "ho,404,id:123,index");
	assert.deepStrictEqual(log2.join(), [null, null, "*", route, "/"].join());
});

test("unsubscribe works", () => {
	const log: Array<string | null> = [];
	const router = new SimpleRouter({
		"/": () => true,
	});

	const unsubscribe = router.subscribe((v) => log.push(v.route));

	router.exec("/");
	const logged = log.join();
	assert.deepStrictEqual(logged, ",/");

	unsubscribe();

	// log must not be changed
	router.exec("/");
	assert.deepStrictEqual(log.join(), logged);
});

test("label test", () => {
	const router = new SimpleRouter();

	router.on("/foo", () => null, { label: "foo" });
	router.on("/bar", () => null, { label: "bar" });

	router.exec("/foo");
	assert.deepStrictEqual(router.current.label, "foo");

	router.exec("/bar");
	assert.deepStrictEqual(router.current.label, "bar");
});

test("info test", () => {
	const router = new SimpleRouter();

	router.on("/foo", () => null, { label: "foo" });
	router.on("/bar", () => null, { label: "bar" });

	const info = router.info();
	assert.deepStrictEqual(info["/foo"], "foo");
	assert.deepStrictEqual(info["/bar"], "bar");
	assert.deepStrictEqual(Object.keys(info).length, 2);
});

test("Edge case: duplicate route registration", () => {
	const log: string[] = [];
	const router = new SimpleRouter();

	// Register same route twice - last one should be checked second
	router.on("/test", () => log.push("first"));
	router.on("/test", () => log.push("second"));

	router.exec("/test");

	// First match wins, so "first" should be executed
	assert.deepStrictEqual(log.join(), "first");
});

test("Edge case: empty config constructor", () => {
	// Should not throw
	const router1 = new SimpleRouter();
	const router2 = new SimpleRouter(null);
	const router3 = new SimpleRouter({});

	assert.deepStrictEqual(router1.current.route, null);
	assert.deepStrictEqual(router2.current.route, null);
	assert.deepStrictEqual(router3.current.route, null);
});

test("Edge case: reset clears routes", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/test": () => log.push("test"),
	});

	router.exec("/test");
	assert.deepStrictEqual(log.join(), "test");

	router.reset();
	const result = router.exec("/test");

	// After reset, should not match
	assert.deepStrictEqual(result, false);
	assert.deepStrictEqual(router.current.route, null);
});

test("Edge case: multiple subscribers", () => {
	const router = new SimpleRouter();
	const log1: Array<string | null> = [];
	const log2: Array<string | null> = [];
	const log3: Array<string | null> = [];

	router.on("/test", () => true);

	// Subscribe multiple times
	const _unsub1 = router.subscribe((v) => log1.push(v.route));
	const unsub2 = router.subscribe((v) => log2.push(v.route));
	const _unsub3 = router.subscribe((v) => log3.push(v.route));

	router.exec("/test");

	// All subscribers should be notified
	assert.deepStrictEqual(log1.join(), ",/test");
	assert.deepStrictEqual(log2.join(), ",/test");
	assert.deepStrictEqual(log3.join(), ",/test");

	// Unsubscribe one
	unsub2();

	router.exec("/test");

	// sub2 should not receive updates anymore
	assert.deepStrictEqual(log1.join(), ",/test,/test");
	assert.deepStrictEqual(log2.join(), ",/test"); // Still the old value
	assert.deepStrictEqual(log3.join(), ",/test,/test");
});

test("Edge case: callback returning false/0/null/undefined", () => {
	const router = new SimpleRouter();

	router.on("/false", () => false);
	router.on("/zero", () => 0);
	router.on("/null", () => null);
	router.on("/undefined", () => undefined);

	// All should return their respective values (not boolean true)
	assert.deepStrictEqual(router.exec("/false"), false);
	assert.deepStrictEqual(router.exec("/zero"), 0);
	assert.deepStrictEqual(router.exec("/null"), null);
	assert.deepStrictEqual(router.exec("/undefined"), undefined);
});

test("Edge case: route priority matters", () => {
	const log: string[] = [];
	const router = new SimpleRouter();

	// More specific route registered after generic one
	router.on("/user/[id]", () => log.push("generic"));
	router.on("/user/admin", () => log.push("specific"));

	router.exec("/user/admin");

	// Generic wins because it's registered first
	assert.deepStrictEqual(log.join(), "generic");
	assert.deepStrictEqual(router.current.params?.id, "admin");
});

test("Edge case: subscriber called immediately on subscribe", () => {
	const router = new SimpleRouter({ "/test": () => true });
	const log: Array<string | null> = [];

	// Before exec, current should be null
	router.subscribe((v) => log.push(v.route));

	// Subscriber should be called immediately with current state (null)
	assert.deepStrictEqual(log.length, 1);
	assert.deepStrictEqual(log[0], null);

	router.exec("/test");

	// Now should have 2 entries
	assert.deepStrictEqual(log.length, 2);
	assert.deepStrictEqual(log[1], "/test");
});

test("Edge case: query params with special characters", () => {
	const router = new SimpleRouter({
		"/search": (params) => params,
	});

	const result = router.exec("/search?q=hello+world&type=exact%20match") as Record<
		string,
		string
	>;

	assert.deepStrictEqual(result?.q, "hello+world");
	assert.deepStrictEqual(result?.type, "exact match");
});

test("Edge case: allowQueryParams false per route", () => {
	const router = new SimpleRouter();

	router.on("/with-query", (params) => params, { allowQueryParams: true });
	router.on("/without-query", (params) => params, { allowQueryParams: false });

	const withQuery = router.exec("/with-query?foo=bar") as Record<string, string>;
	const withoutQuery = router.exec("/without-query?foo=bar") as Record<string, string>;

	assert.deepStrictEqual(withQuery?.foo, "bar");
	assert.deepStrictEqual(withoutQuery?.foo, undefined);
});

test("RouterOptions: routes option works", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		routes: {
			"/": () => log.push("index"),
			"/about": () => log.push("about"),
		},
	});

	router.exec("/");
	router.exec("/about");

	assert.deepStrictEqual(log.join(), "index,about");
});

test("RouterOptions: logger option works", () => {
	const logOutput: string[] = [];
	const mockLogger = {
		debug: (...args: unknown[]) => logOutput.push(`debug: ${args.join(" ")}`),
		log: (...args: unknown[]) => logOutput.push(`log: ${args.join(" ")}`),
		warn: (...args: unknown[]) => logOutput.push(`warn: ${args.join(" ")}`),
		error: (...args: unknown[]) => logOutput.push(`error: ${args.join(" ")}`),
	};

	const router = new SimpleRouter({
		routes: {
			"/": () => "index",
		},
		logger: mockLogger,
	});

	// Enable debug mode
	SimpleRouter.debug = true;

	router.exec("/");
	router.exec("/not-found");

	// Disable debug mode
	SimpleRouter.debug = false;

	// Logger should have been called
	assert.deepStrictEqual(logOutput.length, 2);
	assert.deepStrictEqual(logOutput[0].includes("[SimpleRouter]"), true);
	assert.deepStrictEqual(logOutput[0].includes("matches"), true);
	assert.deepStrictEqual(logOutput[1].includes("[SimpleRouter]"), true);
	assert.deepStrictEqual(logOutput[1].includes("no match"), true);
});

test("RouterOptions: logger fallback to console.log when not provided", () => {
	// This test verifies that the router works without a logger (uses console.log)
	const router = new SimpleRouter({
		routes: {
			"/": () => "index",
		},
	});

	// Should not throw when debug is enabled and no logger provided
	SimpleRouter.debug = true;
	router.exec("/");
	SimpleRouter.debug = false;
});

test("RouterOptions: empty options object", () => {
	const router = new SimpleRouter({
		routes: null,
		logger: null,
	});

	assert.deepStrictEqual(router.current.route, null);
	assert.deepStrictEqual(router.exec("/test"), false);
});

test("subscribe returns function directly (not wrapped object)", () => {
	const router = new SimpleRouter({
		"/": () => true,
	});

	const result = router.subscribe(() => {});

	// Should be a function, not an object
	assert.deepStrictEqual(typeof result, "function");
});

test("RouterOptions: strict mode propagates to all routes", () => {
	const router = new SimpleRouter({
		strict: true,
		routes: {
			"/a/b": () => "matched",
		},
	});

	assert.deepStrictEqual(router.exec("/a/b"), "matched");
	// In strict mode, doubled separators in input are NOT collapsed
	assert.deepStrictEqual(router.exec("/a//b"), false);
});

test("RouterOnOptions: per-route strict overrides router default", () => {
	const router = new SimpleRouter({ strict: false });
	router.on("/a/b", () => "strict", { strict: true });
	router.on("/c/d", () => "loose");

	assert.deepStrictEqual(router.exec("/a/b"), "strict");
	assert.deepStrictEqual(router.exec("/a//b"), false); // strict overrides, no match
	assert.deepStrictEqual(router.exec("/c//d"), "loose"); // loose still collapses
});

test("shadowing: warning is emitted only when SimpleRouter.debug is true", () => {
	const warnings: string[] = [];
	const logger = {
		debug: () => {},
		log: () => {},
		warn: (...a: unknown[]) => warnings.push(a.join(" ")),
		error: () => {},
	};

	// debug off: no warning
	SimpleRouter.debug = false;
	const quiet = new SimpleRouter({ logger, routes: {} });
	quiet.on("/user/[id]", () => {});
	quiet.on("/user/admin", () => {});
	assert.deepStrictEqual(warnings.length, 0);

	// debug on: emits warning for the shadowed route
	SimpleRouter.debug = true;
	try {
		const loud = new SimpleRouter({ logger, routes: {} });
		loud.on("/user/[id]", () => {});
		loud.on("/user/admin", () => {});
		assert.deepStrictEqual(warnings.length, 1);
		assert.deepStrictEqual(warnings[0].includes("shadowed by"), true);
	} finally {
		SimpleRouter.debug = false;
	}
});

test("shadowing: does NOT warn when the more specific route is registered first", () => {
	const warnings: string[] = [];
	const logger = {
		debug: () => {},
		log: () => {},
		warn: (...a: unknown[]) => warnings.push(a.join(" ")),
		error: () => {},
	};

	SimpleRouter.debug = true;
	try {
		const router = new SimpleRouter({ logger, routes: {} });
		router.on("/user/admin", () => {});
		router.on("/user/[id]", () => {});
		assert.deepStrictEqual(warnings.length, 0);
	} finally {
		SimpleRouter.debug = false;
	}
});

test("skipCatchAll suppresses internal catch-all", () => {
	const r = new SimpleRouter();
	r.on("/foo/[id]", () => "foo");
	r.on("*", () => "catchall");

	// default behavior unchanged
	assert.deepStrictEqual(r.exec("/foo/123"), "foo");
	assert.deepStrictEqual(r.exec("/nope"), "catchall");

	// skipCatchAll: a miss returns false instead of firing the catch-all
	assert.deepStrictEqual(r.exec("/foo/123", undefined, { skipCatchAll: true }), "foo");
	assert.deepStrictEqual(r.exec("/nope", undefined, { skipCatchAll: true }), false);

	// skipCatchAll publishes the same "no match" state as a true miss
	assert.deepStrictEqual(r.current.route, null);
	assert.deepStrictEqual(r.current.params, null);

	// explicit fallback still wins over skipCatchAll
	assert.deepStrictEqual(r.exec("/nope", () => "fb", { skipCatchAll: true }), "fb");

	// catchAll getter exposes the callback without executing it
	assert.deepStrictEqual(typeof r.catchAll, "function");
});

test("catchAll getter is null when no catch-all registered", () => {
	const r = new SimpleRouter();
	r.on("/foo", () => "foo");
	assert.deepStrictEqual(r.catchAll, null);
});
