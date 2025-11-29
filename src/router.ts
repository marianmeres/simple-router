import { SimpleRoute } from "./route.ts";
import { createPubSub } from "@marianmeres/pubsub";

/**
 * Route parameters extracted from the URL path and query string.
 * Keys are parameter names, values are the extracted string values.
 *
 * @example
 * ```ts
 * // For route "/user/[id]" matching "/user/123"
 * const params: RouteParams = { id: "123" };
 * ```
 */
export type RouteParams = Record<string, any>;

/**
 * Callback function executed when a route matches.
 *
 * @param params - Extracted route parameters (null if no match)
 * @param route - The matched route pattern string
 * @returns Any value - useful for returning components, data, or control flow values
 *
 * @example
 * ```ts
 * const callback: RouteCallback = (params, route) => {
 *   console.log(`Matched ${route} with params:`, params);
 *   return MyComponent;
 * };
 * ```
 */
export type RouteCallback = (params: RouteParams | null, route: string) => any;

/**
 * Represents the current router state including the matched route,
 * extracted parameters, and optional label.
 */
export interface RouterCurrent {
	/** The matched route pattern, "*" for catch-all, or null if no match */
	route: string | null;
	/** Extracted parameters from the URL, or null if no match */
	params: RouteParams | null;
	/** Optional label associated with the route for debugging */
	label: string | null;
}

/**
 * Options for registering routes with the `on()` method.
 */
export interface RouterOnOptions {
	/** Optional label for debugging - useful for identifying routes */
	label?: string | null;
	/** Whether to parse query parameters (default: true) */
	allowQueryParams?: boolean;
}

/**
 * Configuration object for initializing the router with routes.
 * Maps route patterns to their callback functions.
 *
 * @example
 * ```ts
 * const config: RouterConfig = {
 *   "/": () => HomePage,
 *   "/user/[id]": (params) => UserPage(params?.id),
 *   "*": () => NotFoundPage
 * };
 * ```
 */
export type RouterConfig = Record<string, RouteCallback>;

/**
 * Subscription object returned by the `subscribe()` method.
 * Follows the Svelte store contract and RxJS Observable interface.
 */
export interface RouterSubscription {
	/** Unsubscribe from router state changes */
	unsubscribe: () => void;
}

/**
 * Subscriber callback function that receives router state changes.
 *
 * @param current - The current router state
 */
export type RouterSubscriber = (current: RouterCurrent) => void;

type RouteEntry = [SimpleRoute, RouteCallback, boolean, string | null];

const PUBSUB_TOPIC = "current";

/**
 * A simple, framework-agnostic string pattern matcher and router with support
 * for dynamic parameters, wildcards, query strings, and reactive subscriptions.
 *
 * Can match any string identifiers - URLs, file paths, command names, or custom patterns.
 * Primarily designed for client-side SPA routing, but flexible enough for any pattern
 * matching needs.
 *
 * @example
 * ```ts
 * import { SimpleRouter } from "@marianmeres/simple-router";
 *
 * // URL routing
 * const router = new SimpleRouter({
 *   "/": () => console.log("Home"),
 *   "/user/[id]": (params) => console.log("User:", params?.id),
 *   "*": () => console.log("Not found")
 * });
 *
 * router.exec("/user/123"); // Logs: "User: 123"
 *
 * // Command routing
 * const cmdRouter = new SimpleRouter({
 *   "user:create": () => createUser(),
 *   "user:delete:[id]": ({ id }) => deleteUser(id),
 * });
 *
 * cmdRouter.exec("user:delete:123");
 * ```
 */
export class SimpleRouter {
	/** Enable/disable console debug logging for route matching */
	static debug = false;

	#routes: RouteEntry[] = [];

	#catchAll: RouteCallback | null = null;

	#current: RouterCurrent = {
		route: null,
		params: null,
		label: null,
	};

	#pubsub: ReturnType<typeof createPubSub> = createPubSub();

	/**
	 * Creates a new SimpleRouter instance.
	 *
	 * @param config - Optional configuration object mapping route patterns to callbacks
	 *
	 * @example
	 * ```ts
	 * const router = new SimpleRouter({
	 *   "/": () => HomePage,
	 *   "/about": () => AboutPage
	 * });
	 * ```
	 */
	constructor(config: RouterConfig | null = null) {
		Object.entries(config || {}).forEach(([route, cb]) => {
			this.on(route, cb);
		});
	}

	#dbg(...a: unknown[]): void {
		SimpleRouter.debug && console.log("[SimpleRouter]", ...a);
	}

	/**
	 * Returns a map of registered route patterns to their labels.
	 * Useful for debugging and introspection.
	 *
	 * @returns Object mapping route patterns to labels
	 *
	 * @example
	 * ```ts
	 * router.on("/users", () => {}, { label: "users-list" });
	 * console.log(router.info()); // { "/users": "users-list" }
	 * ```
	 */
	info(): Record<string, string> {
		return this.#routes.reduce((m, r) => {
			m[r[0].route] = r[3] || "";
			return m;
		}, {} as Record<string, string>);
	}

	/**
	 * Clears all registered routes (except catch-all).
	 * Useful for testing or dynamic route reconfiguration.
	 *
	 * @returns The router instance for method chaining
	 *
	 * @example
	 * ```ts
	 * router.reset().on("/new-route", () => {});
	 * ```
	 */
	reset(): this {
		this.#routes = [];
		return this;
	}

	/**
	 * Gets the current router state (last matched route and params).
	 *
	 * @returns Current router state
	 *
	 * @example
	 * ```ts
	 * router.exec("/user/123");
	 * console.log(router.current); // { route: "/user/[id]", params: { id: "123" }, label: null }
	 * ```
	 */
	get current(): RouterCurrent {
		return this.#current;
	}

	/**
	 * Registers one or more route patterns with a callback.
	 * Routes are matched in the order they are registered (first match wins).
	 * Use "*" as a catch-all route.
	 *
	 * @param routes - Single route pattern or array of patterns
	 * @param cb - Callback function to execute when route matches
	 * @param options - Optional configuration (label, allowQueryParams)
	 *
	 * @example
	 * ```ts
	 * // Single route
	 * router.on("/users", () => UsersPage);
	 *
	 * // Multiple routes to same handler
	 * router.on(["/", "/home", "/index.html"], () => HomePage);
	 *
	 * // With dynamic parameters
	 * router.on("/user/[id]", (params) => UserPage(params?.id));
	 *
	 * // With regex constraint
	 * router.on("/post/[id([0-9]+)]", (params) => PostPage(params?.id));
	 *
	 * // With label for debugging
	 * router.on("/admin", () => AdminPage, { label: "admin-dashboard" });
	 *
	 * // Catch-all route
	 * router.on("*", () => NotFoundPage);
	 * ```
	 */
	on(
		routes: string | string[],
		cb: RouteCallback,
		{ label = null, allowQueryParams = true }: RouterOnOptions = {}
	): void {
		if (!Array.isArray(routes)) routes = [routes];
		routes.forEach((route) => {
			if (route === "*") {
				this.#catchAll = cb;
			} else {
				this.#routes.push([
					new SimpleRoute(route),
					cb,
					allowQueryParams,
					label,
				]);
			}
		});
	}

	/**
	 * Executes pattern matching against the provided string.
	 * Returns the value returned by the matched route's callback.
	 * Routes are tested in registration order - first match wins.
	 *
	 * @param url - String to match against registered patterns (can be a URL, file path, command, etc.)
	 * @param fallbackFn - Optional fallback function if no route matches
	 * @returns The value returned by the matched callback, or false if no match
	 *
	 * @example
	 * ```ts
	 * // URL matching
	 * router.exec("/users"); // Returns result of callback
	 *
	 * // With query parameters
	 * router.exec("/users?sort=name");
	 *
	 * // File path matching
	 * router.exec("src/components/Button.ts");
	 *
	 * // Command matching
	 * router.exec("user:delete:123");
	 *
	 * // With fallback
	 * router.exec("/unknown", () => console.log("Not found"));
	 *
	 * // Can return components, values, etc.
	 * const component = router.exec("/home");
	 * ```
	 */
	// deno-lint-ignore no-explicit-any
	exec(url: string, fallbackFn?: RouteCallback): any {
		const dbgPrefix = `'${url}' -> `;

		for (const [route, cb, allowQueryParams, label] of this.#routes) {
			// First match wins
			// Parse returns null or a params object (which can be empty)
			const params = route.parse(url, allowQueryParams);
			if (params !== null) {
				this.#publishCurrent(route.route, params, label);
				this.#dbg(`${dbgPrefix}matches '${route.route}' with`, params);
				return typeof cb === "function" ? cb(params, route.route) : true;
			}
		}

		if (typeof fallbackFn === "function") {
			this.#publishCurrent(null, null, null);
			this.#dbg(`${dbgPrefix}fallback...`);
			return fallbackFn(null, "");
		}

		if (typeof this.#catchAll === "function") {
			this.#publishCurrent("*", null, null);
			this.#dbg(`${dbgPrefix}catchall...`);
			return this.#catchAll(null, "*");
		}

		this.#publishCurrent(null, null, null);
		this.#dbg(`${dbgPrefix}no match...`);
		return false;
	}

	#publishCurrent(
		route: string | null,
		params: RouteParams | null,
		label: string | null
	): void {
		this.#current = { route, params, label };
		this.#pubsub.publish(PUBSUB_TOPIC, this.#current);
	}

	/**
	 * Subscribes to router state changes.
	 * Follows the Svelte store contract - subscriber is called immediately with current state.
	 * Compatible with RxJS Observables (returns object with `unsubscribe` method).
	 *
	 * @param subscription - Callback function that receives router state changes
	 * @returns Subscription object with `unsubscribe()` method
	 *
	 * @example
	 * ```ts
	 * const { unsubscribe } = router.subscribe((state) => {
	 *   console.log("Route changed:", state.route);
	 *   console.log("Params:", state.params);
	 * });
	 *
	 * // Later, to unsubscribe
	 * unsubscribe();
	 * ```
	 *
	 * @see https://svelte.dev/docs#Store_contract
	 */
	subscribe(subscription: RouterSubscriber): RouterSubscription {
		if (typeof subscription !== "function") {
			throw new TypeError("Subscription is not a function");
		}

		const unsubscribe = this.#pubsub.subscribe(PUBSUB_TOPIC, subscription);

		// immediately call with current value (as per store contract)
		subscription(this.#current);

		// For interoperability with RxJS Observables, the .subscribe method is also
		// allowed to return an object with an .unsubscribe method
		return {
			unsubscribe,
		};
	}
}
