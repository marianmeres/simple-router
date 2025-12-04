import { assertEquals, assertExists } from "@std/assert";
import { SimpleRouter } from "../src/router.ts";

Deno.test("sanity check", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/": () => log.push("index"),
	});

	//
	assertEquals(router.current.route, null);
	assertEquals(router.current.params, null);

	// match returns truthy (depends on the callback)
	assertExists(router.exec("/"));

	//
	assertEquals(router.current.route, "/");
	assertExists(router.current.params);

	// returns falsey on no match (but only if no fallback or catch all provided)
	assertEquals(router.exec("/wrong/path"), false);

	//
	assertEquals(router.current.route, null);
	assertEquals(router.current.params, null);

	assertEquals(log.join(), "index");
});

Deno.test("route id callback param", () => {
	const log: Array<[any, string]> = [];
	const router = new SimpleRouter({
		"*": (params, routeId) => log.push([params, routeId]),
		"/[foo]": (params, routeId) => log.push([params, routeId]),
	});

	router.exec("/");
	router.exec("/bar");
	router.exec("/");

	assertEquals(
		JSON.stringify(log),
		JSON.stringify([
			[null, "*"],
			[{ foo: "bar" }, "/[foo]"],
			[null, "*"],
		]),
	);
});

Deno.test("first match wins", () => {
	const log: string[] = [];
	const router = new SimpleRouter();

	router.on(["/", "/index.html"], () => log.push("index")); // must win
	router.on("/", () => log.push("foo"));

	router.exec("/");
	assertEquals(log.join(), "index");
});

Deno.test("exec fallback", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/": () => log.push("index"),
	});

	router.exec("/foo", () => log.push("fallback"));

	assertEquals(log.join(), "fallback");
});

Deno.test("catch all fallback", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/": () => log.push("index"),
		"*": () => log.push("404"),
	});

	// truthy even on no match (because catch all returns truthy)
	assertExists(router.exec("/foo"));

	assertEquals(router.current.route, "*");

	router.exec("/");

	assertEquals(log.join(), "404,index");
});

Deno.test("exec returns arbitrary value", () => {
	const indexComponent = { page: "index" };
	const notFound = { page: "not-found" };

	const router = new SimpleRouter({
		"/": () => indexComponent,
		"*": () => notFound,
	});

	assertEquals(router.exec("/"), indexComponent);
	assertEquals(router.exec("/foo"), notFound);
});

Deno.test("integration", () => {
	const log: string[] = [];
	const log2: Array<string | null> = [];

	// routes can be configured via ctor config
	const router = new SimpleRouter({
		"/": () => log.push("index"),
		"*": () => log.push("404"),
	});

	router.subscribe((v) => log2.push(v.route));

	// or via "on" api
	const route = "/[bar]/[id([\\d]+)]/baz";
	router.on(route, (params) => {
		if (params) log.push(`${params.bar}:${params.id}`);
	});

	router.exec("hey", () => log.push("ho")); // custom fallback
	assertEquals(router.current.route, null);

	router.exec("id/non-digits/baz"); // 404
	assertEquals(router.current.route, "*");
	assertEquals(router.current.params, null);

	router.exec("id/123/baz"); // id:123
	assertEquals(router.current.route, route);
	assertEquals(router.current.params?.bar, "id");
	assertEquals(router.current.params?.id, "123");

	router.exec(""); // index
	assertEquals(router.current.route, "/");

	assertEquals(log.join(), "ho,404,id:123,index");
	assertEquals(log2.join(), [null, null, "*", route, "/"].join());
});

Deno.test("unsubscribe works", () => {
	const log: Array<string | null> = [];
	const router = new SimpleRouter({
		"/": () => true,
	});

	const unsubscribe = router.subscribe((v) => log.push(v.route));

	router.exec("/");
	const logged = log.join();
	assertEquals(logged, ",/");

	unsubscribe();

	// log must not be changed
	router.exec("/");
	assertEquals(log.join(), logged);
});

Deno.test("label test", () => {
	const router = new SimpleRouter();

	router.on("/foo", () => null, { label: "foo" });
	router.on("/bar", () => null, { label: "bar" });

	router.exec("/foo");
	assertEquals(router.current.label, "foo");

	router.exec("/bar");
	assertEquals(router.current.label, "bar");
});

Deno.test("info test", () => {
	const router = new SimpleRouter();

	router.on("/foo", () => null, { label: "foo" });
	router.on("/bar", () => null, { label: "bar" });

	const info = router.info();
	assertEquals(info["/foo"], "foo");
	assertEquals(info["/bar"], "bar");
	assertEquals(Object.keys(info).length, 2);
});

Deno.test("Edge case: duplicate route registration", () => {
	const log: string[] = [];
	const router = new SimpleRouter();

	// Register same route twice - last one should be checked second
	router.on("/test", () => log.push("first"));
	router.on("/test", () => log.push("second"));

	router.exec("/test");

	// First match wins, so "first" should be executed
	assertEquals(log.join(), "first");
});

Deno.test("Edge case: empty config constructor", () => {
	// Should not throw
	const router1 = new SimpleRouter();
	const router2 = new SimpleRouter(null);
	const router3 = new SimpleRouter({});

	assertEquals(router1.current.route, null);
	assertEquals(router2.current.route, null);
	assertEquals(router3.current.route, null);
});

Deno.test("Edge case: reset clears routes", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		"/test": () => log.push("test"),
	});

	router.exec("/test");
	assertEquals(log.join(), "test");

	router.reset();
	const result = router.exec("/test");

	// After reset, should not match
	assertEquals(result, false);
	assertEquals(router.current.route, null);
});

Deno.test("Edge case: multiple subscribers", () => {
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
	assertEquals(log1.join(), ",/test");
	assertEquals(log2.join(), ",/test");
	assertEquals(log3.join(), ",/test");

	// Unsubscribe one
	unsub2();

	router.exec("/test");

	// sub2 should not receive updates anymore
	assertEquals(log1.join(), ",/test,/test");
	assertEquals(log2.join(), ",/test"); // Still the old value
	assertEquals(log3.join(), ",/test,/test");
});

Deno.test("Edge case: callback returning false/0/null/undefined", () => {
	const router = new SimpleRouter();

	router.on("/false", () => false);
	router.on("/zero", () => 0);
	router.on("/null", () => null);
	router.on("/undefined", () => undefined);

	// All should return their respective values (not boolean true)
	assertEquals(router.exec("/false"), false);
	assertEquals(router.exec("/zero"), 0);
	assertEquals(router.exec("/null"), null);
	assertEquals(router.exec("/undefined"), undefined);
});

Deno.test("Edge case: route priority matters", () => {
	const log: string[] = [];
	const router = new SimpleRouter();

	// More specific route registered after generic one
	router.on("/user/[id]", () => log.push("generic"));
	router.on("/user/admin", () => log.push("specific"));

	router.exec("/user/admin");

	// Generic wins because it's registered first
	assertEquals(log.join(), "generic");
	assertEquals(router.current.params?.id, "admin");
});

Deno.test("Edge case: subscriber called immediately on subscribe", () => {
	const router = new SimpleRouter({ "/test": () => true });
	const log: Array<string | null> = [];

	// Before exec, current should be null
	router.subscribe((v) => log.push(v.route));

	// Subscriber should be called immediately with current state (null)
	assertEquals(log.length, 1);
	assertEquals(log[0], null);

	router.exec("/test");

	// Now should have 2 entries
	assertEquals(log.length, 2);
	assertEquals(log[1], "/test");
});

Deno.test("Edge case: query params with special characters", () => {
	const router = new SimpleRouter({
		"/search": (params) => params,
	});

	const result = router.exec("/search?q=hello+world&type=exact%20match") as Record<
		string,
		string
	>;

	assertEquals(result?.q, "hello+world");
	assertEquals(result?.type, "exact match");
});

Deno.test("Edge case: allowQueryParams false per route", () => {
	const router = new SimpleRouter();

	router.on("/with-query", (params) => params, { allowQueryParams: true });
	router.on("/without-query", (params) => params, { allowQueryParams: false });

	const withQuery = router.exec("/with-query?foo=bar") as Record<string, string>;
	const withoutQuery = router.exec("/without-query?foo=bar") as Record<string, string>;

	assertEquals(withQuery?.foo, "bar");
	assertEquals(withoutQuery?.foo, undefined);
});

Deno.test("RouterOptions: routes option works", () => {
	const log: string[] = [];
	const router = new SimpleRouter({
		routes: {
			"/": () => log.push("index"),
			"/about": () => log.push("about"),
		},
	});

	router.exec("/");
	router.exec("/about");

	assertEquals(log.join(), "index,about");
});

Deno.test("RouterOptions: logger option works", () => {
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
	assertEquals(logOutput.length, 2);
	assertEquals(logOutput[0].includes("[SimpleRouter]"), true);
	assertEquals(logOutput[0].includes("matches"), true);
	assertEquals(logOutput[1].includes("[SimpleRouter]"), true);
	assertEquals(logOutput[1].includes("no match"), true);
});

Deno.test("RouterOptions: logger fallback to console.log when not provided", () => {
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

Deno.test("RouterOptions: empty options object", () => {
	const router = new SimpleRouter({
		routes: null,
		logger: null,
	});

	assertEquals(router.current.route, null);
	assertEquals(router.exec("/test"), false);
});

Deno.test("subscribe returns function directly (not wrapped object)", () => {
	const router = new SimpleRouter({
		"/": () => true,
	});

	const result = router.subscribe(() => {});

	// Should be a function, not an object
	assertEquals(typeof result, "function");
});
