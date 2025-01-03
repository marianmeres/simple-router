import { SimpleRoute } from './route';

export class SimpleRouter {
	// console log debug on/off switch
	static debug = false;

	protected _routes: [SimpleRoute, Function, boolean, string][] = [];

	protected _catchAll: Function;

	// current (last matched) route and params (in the shape { route: "...", params: {} } )
	protected _current: { route: string; params: any; label: string } = {
		route: null,
		params: null,
		label: null,
	};

	// https://svelte.dev/docs#Store_contract
	protected _subscriptions = new Set<Function>();

	constructor(config: { [route: string]: Function } = null) {
		Object.entries(config || {}).forEach(([route, cb]) => {
			this.on(route, cb);
		});
	}

	protected _dbg(...a) {
		SimpleRouter.debug && console.log('[SimpleRouter]', ...a);
	}

	/** Will report map of registered routes and their labels. Intended for debugging. */
	info(): Record<string, string> {
		return this._routes.reduce((m, r) => {
			m[r[0].route] = r[3];
			return m;
		}, {});
	}

	reset() {
		this._routes = [];
		return this;
	}

	get current() {
		return this._current;
	}

	on(
		routes: string | string[],
		cb: Function,
		{ label = null, allowQueryParams = true } = {}
	) {
		if (!Array.isArray(routes)) routes = [routes];
		routes.forEach((route) => {
			if (route === '*') {
				this._catchAll = cb;
			} else {
				this._routes.push([new SimpleRoute(route), cb, allowQueryParams, label]);
			}
		});
	}

	exec(url: string, fallbackFn?: Function) {
		const dbgPrefix = `'${url}' -> `;

		const isFn = (v) => typeof v === 'function';
		for (const [route, cb, allowQueryParams, label] of this._routes) {
			// first match wins
			// parse returns null or params object (which can be empty)
			const params = route.parse(url, allowQueryParams);
			if (params) {
				this._publishCurrent(route.route, params, label);
				this._dbg(`${dbgPrefix}matches '${route.route}' with`, params);
				return isFn(cb) ? cb(params, route.route) : true;
			}
		}

		if (isFn(fallbackFn)) {
			this._publishCurrent(null, null, null);
			this._dbg(`${dbgPrefix}fallback...`);
			return fallbackFn();
		}

		if (isFn(this._catchAll)) {
			this._publishCurrent('*', null, null);
			this._dbg(`${dbgPrefix}catchall...`);
			return this._catchAll(null, '*');
		}

		this._publishCurrent(null, null, null);
		this._dbg(`${dbgPrefix}no match...`);
		return false;
	}

	protected _publishCurrent(route, params, label) {
		this._current = { route, params, label };
		this._subscriptions.forEach((cb) => cb(this._current));
	}

	// https://svelte.dev/docs#Store_contract
	subscribe(subscription: Function) {
		if (typeof subscription !== 'function') {
			throw new TypeError('Subscription is not a function');
		}

		this._subscriptions.add(subscription);
		subscription(this._current);

		// For interoperability with RxJS Observables, the .subscribe method is also
		// allowed to return an object with an .unsubscribe method
		return {
			unsubscribe: () => this._subscriptions.delete(subscription),
		};
	}
}
