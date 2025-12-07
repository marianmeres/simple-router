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
 * @typeParam T - The return type of the callback
 * @param params - Extracted route parameters (null if no match)
 * @param route - The matched route pattern string
 * @returns Any value - useful for returning components, data, or control flow values
 *
 * @example
 * ```ts
 * const callback: RouteCallback<MyComponent> = (params, route) => {
 *   console.log(`Matched ${route} with params:`, params);
 *   return MyComponent;
 * };
 * ```
 */
export type RouteCallback<T = unknown> = (params: RouteParams | null, route: string) => T;

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
 * @typeParam T - The return type of route callbacks
 *
 * @example
 * ```ts
 * const config: RouterConfig<Component> = {
 *   "/": () => HomePage,
 *   "/user/[id]": (params) => UserPage(params?.id),
 *   "*": () => NotFoundPage
 * };
 * ```
 */
export type RouterConfig<T = unknown> = Record<string, RouteCallback<T>>;

/**
 * Logger interface compatible with `@marianmeres/clog`.
 * Provides console-compatible logging methods.
 */
export interface Logger {
	/** Log debug level messages */
	debug: (...args: unknown[]) => unknown;
	/** Log info level messages */
	log: (...args: unknown[]) => unknown;
	/** Log warning level messages */
	warn: (...args: unknown[]) => unknown;
	/** Log error level messages */
	error: (...args: unknown[]) => unknown;
}

/**
 * Options for the SimpleRouter factory/constructor.
 *
 * @typeParam T - The return type of route callbacks
 */
export interface RouterOptions<T = unknown> {
	/** Route configuration mapping patterns to callbacks */
	routes?: RouterConfig<T> | null;
	/** Optional logger instance for debug output (compatible with @marianmeres/clog) */
	logger?: Logger | null;
}

/**
 * Unsubscribe function returned by the `subscribe()` method.
 * Follows the Svelte store contract.
 */
export type RouterUnsubscribe = () => void;

/**
 * Subscriber callback function that receives router state changes.
 *
 * @param current - The current router state
 */
export type RouterSubscriber = (current: RouterCurrent) => void;

type RouteEntry<T> = [SimpleRoute, RouteCallback<T>, boolean, string | null];

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
 *
 * @typeParam T - The return type of route callbacks (default: unknown)
 */
export class SimpleRouter<T = unknown> {
	/**
	 * Enable/disable console debug logging for route matching.
	 * When enabled, logs route matching details to the console.
	 * @default false
	 */
	static debug: boolean = false;

	#routes: RouteEntry<T>[] = [];

	#catchAll: RouteCallback<T> | null = null;

	#current: RouterCurrent = {
		route: null,
		params: null,
		label: null,
	};

	#pubsub: ReturnType<typeof createPubSub> = createPubSub();

	#logger: Logger | null = null;

	/**
	 * Creates a new SimpleRouter instance.
	 *
	 * @param config - Optional configuration: either a RouterConfig object mapping route patterns
	 *                 to callbacks, or a RouterOptions object with routes and logger
	 *
	 * @example
	 * ```ts
	 * // Typed router - exec() returns Component | false
	 * const router = new SimpleRouter<Component>({
	 *   "/": () => HomePage,
	 *   "/about": () => AboutPage
	 * });
	 *
	 * // With options object
	 * const router = new SimpleRouter<Component>({
	 *   routes: {
	 *     "/": () => HomePage,
	 *     "/about": () => AboutPage
	 *   },
	 *   logger: myLogger // optional, compatible with @marianmeres/clog
	 * });
	 * ```
	 */
	constructor(config: RouterConfig<T> | RouterOptions<T> | null = null) {
		let routes: RouterConfig<T> | null = null;

		if (config) {
			// Check if config is RouterOptions (has 'routes' or 'logger' key)
			if ("routes" in config || "logger" in config) {
				const options = config as RouterOptions<T>;
				routes = options.routes ?? null;
				this.#logger = options.logger ?? null;
			} else {
				// Backwards compatible: treat as RouterConfig
				routes = config as RouterConfig<T>;
			}
		}

		Object.entries(routes || {}).forEach(([route, cb]) => {
			this.on(route, cb);
		});
	}

	#dbg(...a: unknown[]): void {
		if (SimpleRouter.debug) {
			if (this.#logger) {
				this.#logger.log("[SimpleRouter]", ...a);
			} else {
				console.log("[SimpleRouter]", ...a);
			}
		}
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
		cb: RouteCallback<T>,
		options: RouterOnOptions = {}
	): void {
		const { label = null, allowQueryParams = true } = options;
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
	 * Returns the value returned by the matched route's callback (type `T`).
	 * Routes are tested in registration order - first match wins.
	 *
	 * @param url - String to match against registered patterns (can be a URL, file path, command, etc.)
	 * @param fallbackFn - Optional fallback function if no route matches
	 * @returns `T | false` - The value returned by the matched callback, or `false` if no match
	 *
	 * @example
	 * ```ts
	 * // Type-safe routing
	 * const router = new SimpleRouter<Component>({ "/home": () => HomePage });
	 * const result = router.exec("/home"); // Component | false
	 *
	 * // With query parameters
	 * router.exec("/users?sort=name");
	 *
	 * // With fallback
	 * router.exec("/unknown", () => NotFoundPage);
	 *
	 * // Check for no match
	 * const component = router.exec("/path");
	 * if (component !== false) {
	 *   render(component);
	 * }
	 * ```
	 */
	exec(url: string, fallbackFn?: RouteCallback<T>): T | false {
		const dbgPrefix = `'${url}' -> `;

		for (const [route, cb, allowQueryParams, label] of this.#routes) {
			// First match wins
			// Parse returns null or a params object (which can be empty)
			const params = route.parse(url, allowQueryParams);
			if (params !== null) {
				this.#publishCurrent(route.route, params, label);
				this.#dbg(`${dbgPrefix}matches '${route.route}' with`, params);
				return cb(params, route.route);
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
	 *
	 * @param subscription - Callback function that receives router state changes
	 * @returns Unsubscribe function
	 *
	 * @example
	 * ```ts
	 * const unsubscribe = router.subscribe((state) => {
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
	subscribe(subscription: RouterSubscriber): RouterUnsubscribe {
		if (typeof subscription !== "function") {
			throw new TypeError("Subscription is not a function");
		}

		const unsubscribe = this.#pubsub.subscribe(PUBSUB_TOPIC, subscription);

		// immediately call with current value (as per store contract)
		subscription(this.#current);

		return unsubscribe;
	}
}
