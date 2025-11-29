/**
 * Configuration for a single route segment.
 * @internal
 */
export interface RouteConfig {
	segment: string;
	name: string | null;
	test: RegExp;
	isOptional: boolean;
	isSpread: boolean;
}

/**
 * Route parameters extracted from URL segments and query strings.
 */
export type RouteParams = Record<string, any>;

export class SimpleRoute {
	/** Separator used to split URL paths into segments */
	static SPLITTER = "/";

	/** Wildcard symbol for catch-all routes */
	static WILDCARD = "*";

	#parsed: RouteConfig[];

	/**
	 * Creates a new SimpleRoute instance.
	 *
	 * @param route - Route pattern string
	 * @throws {Error} If route pattern is invalid (e.g., multiple spread segments)
	 *
	 * @example
	 * ```ts
	 * new SimpleRoute("/user/[id]");
	 * new SimpleRoute("/post/[id([0-9]+)]");
	 * new SimpleRoute("/api/[...path]");
	 * ```
	 */
	constructor(public readonly route: string) {
		this.#parsed = SimpleRoute.#parse(route);
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	static #escapeRegExp(str: string): string {
		return str.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
	}

	static #sanitizeAndSplit(str: string): string[] {
		const s = SimpleRoute.#escapeRegExp(SimpleRoute.SPLITTER);
		return (
			`${str}`
				.trim()
				// splitter trim left and right
				.replace(new RegExp(`^(${s})+`), "")
				.replace(new RegExp(`(${s})+$`), "")
				.split(SimpleRoute.SPLITTER)
				// remove empty segments... will "normalize" multiple splitters into one
				.filter(Boolean)
		);
	}

	static #parse(route: string): RouteConfig[] {
		let wasSpread = false;
		let wasWildcard = false;
		return SimpleRoute.#sanitizeAndSplit(route).reduce<RouteConfig[]>(
			(memo, segment, idx, all) => {
				let name = null;

				// if optional, remove trailing '?' marker
				let isOptional = segment.endsWith("?");
				if (isOptional) segment = segment.slice(0, -1);

				const isSpread = segment.startsWith("[...");
				if (isSpread) {
					if (isOptional) {
						throw new Error("Spread segment must not be marked as optional");
					}
					if (wasSpread) {
						throw new Error("Multiple spread segments are invalid");
					}
					wasSpread = true;
					segment = "[" + segment.slice(4);
				}

				let test = new RegExp("^" + SimpleRoute.#escapeRegExp(segment) + "$");

				// catch all wildcard
				if (segment === SimpleRoute.WILDCARD) {
					if (idx < all.length - 1) {
						throw new Error(
							`Wildcard '${SimpleRoute.WILDCARD}' can be used only as a last segment`
						);
					}
					wasWildcard = true;
				} else {
					// starting with at least one word char within brackets...
					const m = segment.match(/^\[(\w.*)]$/);
					if (m) {
						name = m[1];
						test = /.+/;

						// id([0-9]+)
						const m2 = m[1].match(/^(\w.*)\((.+)\)$/);
						if (m2) {
							name = m2[1];
							try {
								test = new RegExp("^" + m2[2] + "$");
							} catch (e) {
								throw new Error(
									`Invalid regex in route pattern '${segment}': ${(e as Error).message}`
								);
							}
						}
					}
				}

				if (wasWildcard) {
					isOptional = true;
					test = /.*/;
				}

				memo.push({ segment, name, test, isOptional, isSpread });
				return memo;
			},
			[]
		);
	}

	/**
	 * Parses a query string into an object of key-value pairs.
	 * Handles URL decoding of both keys and values.
	 *
	 * @param str - Query string (without leading "?")
	 * @returns Object with parsed query parameters
	 *
	 * @example
	 * ```ts
	 * SimpleRoute.parseQueryString("foo=bar&baz=123");
	 * // Returns: { foo: "bar", baz: "123" }
	 *
	 * SimpleRoute.parseQueryString("name=John%20Doe");
	 * // Returns: { name: "John Doe" }
	 * ```
	 */
	static parseQueryString(str: string): RouteParams {
		return `${str}`
			.replace(/^&/, "")
			.replace(/&$/, "")
			.split("&")
			.reduce<RouteParams>((memo, kvpair) => {
				const [k, v = ""] = kvpair.split("=");
				if (k.length) {
					try {
						const decodedKey = decodeURIComponent(k);
						const decodedValue = v ? decodeURIComponent(v) : "";
						memo[decodedKey] = decodedValue;
					} catch {
						// Fallback for malformed URI components
						memo[k] = v;
					}
				}
				return memo;
			}, {});
	}

	/**
	 * Parses a URL against this route pattern.
	 * Returns extracted parameters if the URL matches, null otherwise.
	 *
	 * @param url - URL path to test (with or without query string)
	 * @param allowQueryParams - Whether to parse query string parameters (default: true)
	 * @returns Object with extracted parameters, or null if no match
	 *
	 * @example
	 * ```ts
	 * const route = new SimpleRoute("/user/[id]");
	 *
	 * route.parse("/user/123");
	 * // Returns: { id: "123" }
	 *
	 * route.parse("/user/123?tab=profile");
	 * // Returns: { id: "123", tab: "profile" }
	 *
	 * route.parse("/user/123?tab=profile", false);
	 * // Returns: { id: "123?tab=profile" } - query string not parsed
	 *
	 * route.parse("/post/456");
	 * // Returns: null - no match
	 * ```
	 */
	parse(url: string, allowQueryParams = true): RouteParams | null {
		let matched: RouteParams = {};

		const qPos = url.indexOf("?");
		if (allowQueryParams && qPos !== -1) {
			const _backup = url;
			url = _backup.slice(0, qPos);
			matched = SimpleRoute.parseQueryString(_backup.slice(qPos + 1));
		}

		let segments = SimpleRoute.#sanitizeAndSplit(url);

		// SPREAD PARAMS DANCING BLOCK - if there are "spread" definitions we need to adjust input
		// that is "group" (join) segments that were initially splitted
		const hasSpread = this.#parsed.some((v) => v.isSpread);
		if (hasSpread) {
			let newSegments: string[] = [];
			this.#parsed.forEach((p, i) => {
				if (p.isSpread) {
					// there are defined segments after the "spread" definition
					if (this.#parsed[i + 1]) {
						newSegments.push(
							segments
								.slice(0, this.#parsed.length - i)
								.join(SimpleRoute.SPLITTER)
						);
						segments = segments.slice(this.#parsed.length - i);
					}
					// there are no more defined segments
					else {
						newSegments.push(segments.join(SimpleRoute.SPLITTER));
					}
				} else {
					newSegments = newSegments.concat(segments.slice(0, 1));
					segments = segments.slice(1);
				}
			});
			segments = newSegments;
		}

		// return early no-op special case: first segment is a wildcard
		// (no need to process further)
		if (this.#parsed?.[0]?.segment === SimpleRoute.WILDCARD) {
			return matched;
		}

		// minimum required (not optional) segments length
		const reqLen = this.#parsed.reduce((memo, p, idx, arr) => {
			const next = arr[idx + 1];
			// if is not optional or has not optional still to come
			if (!p.isOptional || (next && !next.isOptional)) {
				memo++;
			}
			return memo;
		}, 0);

		// quick cheap check: if counts dont match = no match
		if (segments.length < reqLen) {
			return null;
		}

		for (const [i, s] of segments.entries()) {
			const p = this.#parsed[i];
			if (!p || !p.test.test(s)) {
				return null;
			}
			if (p.name) {
				try {
					matched[decodeURIComponent(p.name)] = decodeURIComponent(s);
				} catch {
					// Fallback for malformed URI components
					matched[p.name] = s;
				}
			}
			if (p.segment === SimpleRoute.WILDCARD) {
				break;
			}
		}

		return matched;
	}
}
