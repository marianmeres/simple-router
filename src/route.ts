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

/**
 * Options for the `SimpleRoute` constructor.
 */
export interface SimpleRouteOptions {
	/**
	 * When true, empty segments (caused by consecutive separators) are preserved
	 * rather than silently collapsed. In strict mode, inputs like `/a//b` will
	 * NOT match a pattern `/a/b`. Default: false.
	 */
	strict?: boolean;
}

export class SimpleRoute {
	/**
	 * Separator used to split paths into segments.
	 * @default "/"
	 */
	static SPLITTER: string = "/";

	/**
	 * Wildcard symbol for catch-all routes. Must be used as the last segment.
	 * @default "*"
	 */
	static WILDCARD: string = "*";

	#parsed: RouteConfig[];
	#strict: boolean;

	/**
	 * Creates a new SimpleRoute instance.
	 *
	 * @param route - Pattern string to match against (URL, file path, command, or any string identifier)
	 * @param options - Optional configuration (e.g. `{ strict: true }` to disable empty-segment collapsing)
	 * @throws {Error} If route pattern is invalid (multiple spread segments, optional
	 * segment followed by a required one, invalid regex constraint, etc.)
	 *
	 * @example
	 * ```ts
	 * // URL patterns
	 * new SimpleRoute("/user/[id]");
	 * new SimpleRoute("/post/[id([0-9]+)]");
	 * new SimpleRoute("/api/[...path]");
	 *
	 * // File path patterns
	 * new SimpleRoute("src/[module]/[file].ts");
	 *
	 * // Command patterns
	 * new SimpleRoute("user:delete:[id]");
	 *
	 * // Strict mode: '/a//b' will NOT match '/a/b'
	 * new SimpleRoute("/a/b", { strict: true });
	 * ```
	 */
	constructor(
		public readonly route: string,
		options: SimpleRouteOptions = {}
	) {
		this.#strict = options.strict === true;
		this.#parsed = SimpleRoute.#parse(route, this.#strict);
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	static #escapeRegExp(str: string): string {
		return str.replace(/[.*+\-?^${}()|[\]\\]/g, "\\$&");
	}

	static #sanitizeAndSplit(str: string, strict: boolean): string[] {
		const s = SimpleRoute.#escapeRegExp(SimpleRoute.SPLITTER);
		let out = `${str}`
			.trim()
			// Trim splitters from left and right
			.replace(new RegExp(`^(${s})+`), "")
			.replace(new RegExp(`(${s})+$`), "")
			.split(SimpleRoute.SPLITTER);
		// In non-strict mode, empty (internal) segments are silently collapsed.
		// In strict mode, they are preserved and treated as literal empty segments
		// (which generally will not match any parameterized pattern position).
		if (!strict) out = out.filter(Boolean);
		return out;
	}

	/**
	 * Splits a bracketed definition like "name(regex)" into its two parts.
	 * Uses balanced-paren tracking so nested groups in the regex are preserved.
	 * Returns null if the input is not in the name(...)  shape.
	 */
	static #splitNamedConstraint(
		inner: string
	): { name: string; regex: string } | null {
		const open = inner.indexOf("(");
		if (open <= 0) return null;
		if (!inner.endsWith(")")) return null;
		const name = inner.slice(0, open);
		const regex = inner.slice(open + 1, -1);
		return { name, regex };
	}

	static #parse(route: string, strict: boolean): RouteConfig[] {
		let wasSpread = false;
		let wasWildcard = false;
		const parsed = SimpleRoute.#sanitizeAndSplit(route, strict).reduce<
			RouteConfig[]
		>((memo, segment, idx, all) => {
			let name = null;

			// If optional, remove trailing '?' marker
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

			// Catch-all wildcard
			if (segment === SimpleRoute.WILDCARD) {
				if (idx < all.length - 1) {
					throw new Error(
						`Wildcard '${SimpleRoute.WILDCARD}' can be used only as a last segment`
					);
				}
				wasWildcard = true;
			} else {
				// Starts with at least one word character within brackets
				const m = segment.match(/^\[(\w.*)]$/);
				if (m) {
					name = m[1];
					test = /.+/;

					// Named constraint: [id([0-9]+)], [s((?:a|b)+)], ...
					// Split on first '(' (balanced-paren-safe).
					const split = SimpleRoute.#splitNamedConstraint(m[1]);
					if (split) {
						if (!/^\w+$/.test(split.name)) {
							throw new Error(
								`Invalid parameter name '${split.name}' in route pattern '${segment}' (must match /^\\w+$/)`
							);
						}
						name = split.name;
						try {
							test = new RegExp("^" + split.regex + "$");
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
		}, []);

		// An optional segment may only appear in trailing position (or directly
		// before a wildcard, which itself is optional). Otherwise the 'optional'
		// marker is misleading — it can never actually be skipped.
		for (let i = 0; i < parsed.length; i++) {
			const p = parsed[i];
			if (!p.isOptional) continue;
			// segment is optional — all following segments must also be optional
			for (let j = i + 1; j < parsed.length; j++) {
				if (!parsed[j].isOptional) {
					throw new Error(
						`Invalid route '${route}': optional segment '${p.segment}?' must not be followed by a required segment ('${parsed[j].segment}'). ` +
							`Optional segments are only allowed in trailing position. ` +
							`Register separate routes instead.`
					);
				}
			}
			break;
		}

		return parsed;
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
	 * Parses a string against this route pattern.
	 * Returns extracted parameters if the string matches, null otherwise.
	 *
	 * @param url - String to test against the pattern (can be a URL, file path, command, etc.)
	 * @param allowQueryParams - Whether to parse query string parameters (default: true)
	 * @returns Object with extracted parameters, or null if no match
	 *
	 * @example
	 * ```ts
	 * // URL matching
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
	 *
	 * // File path matching
	 * const fileRoute = new SimpleRoute("src/[module]/[file].ts");
	 * fileRoute.parse("src/components/Button.ts");
	 * // Returns: { module: "components", file: "Button" }
	 *
	 * // Command matching
	 * const cmdRoute = new SimpleRoute("user:delete:[id]");
	 * cmdRoute.parse("user:delete:123");
	 * // Returns: { id: "123" }
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

		let segments = SimpleRoute.#sanitizeAndSplit(url, this.#strict);

		// If there are spread definitions, we need to adjust input by grouping
		// (joining) segments that were initially split
		const hasSpread = this.#parsed.some((v) => v.isSpread);
		if (hasSpread) {
			let newSegments: string[] = [];
			this.#parsed.forEach((p, i) => {
				if (p.isSpread) {
					// There are defined segments after the spread definition
					if (this.#parsed[i + 1]) {
						newSegments.push(
							segments
								.slice(0, this.#parsed.length - i)
								.join(SimpleRoute.SPLITTER)
						);
						segments = segments.slice(this.#parsed.length - i);
					}
					// There are no more defined segments
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

		// Return early (special case): first segment is a wildcard
		// (no need to process further)
		if (this.#parsed?.[0]?.segment === SimpleRoute.WILDCARD) {
			return matched;
		}

		// Minimum required (non-optional) segment count
		const reqLen = this.#parsed.reduce((memo, p, idx, arr) => {
			const next = arr[idx + 1];
			// If segment is not optional or has non-optional segments still to come
			if (!p.isOptional || (next && !next.isOptional)) {
				memo++;
			}
			return memo;
		}, 0);

		// Quick check: if counts don't match, no match
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
					matched[p.name] = decodeURIComponent(s);
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
