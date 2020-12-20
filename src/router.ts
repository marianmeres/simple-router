import { SimpleRoute } from './route';

export class SimpleRouter {
	// console log debug on/off switch
	static debug = false;

	protected _routes: [SimpleRoute, Function][] = [];

	protected _catchAll: Function;

	constructor(config: { [route: string]: Function }) {
		Object.entries(config || {}).forEach(([route, cb]) => {
			this.on(route, cb);
		});
	}

	protected _dbg(...a) {
		SimpleRouter.debug && console.log('[SimpleRouter]', ...a);
	}

	on(routes: string | string[], cb: Function) {
		if (!Array.isArray(routes)) routes = [routes];
		routes.forEach((route) => {
			if (route === '*') {
				this._catchAll = cb;
			} else {
				this._routes.push([new SimpleRoute(route), cb]);
			}
		});
	}

	exec(url: string, fallbackFn?: Function) {
		const dbgPrefix = `${url} -> `;

		const isFn = (v) => typeof v === 'function';
		for (const [route, cb] of this._routes) {
			// first match wins
			// parse returns null or params object (which can be empty)
			const params = route.parse(url);
			if (params) {
				this._dbg(`${dbgPrefix}matches ${route.route} with`, params);
				return isFn(cb) ? cb(params) : true;
			}
		}

		if (isFn(fallbackFn)) {
			this._dbg(`${dbgPrefix}fallback...`);
			return fallbackFn();
		}

		if (isFn(this._catchAll)) {
			this._dbg(`${dbgPrefix}catchall...`);
			return this._catchAll();
		}

		this._dbg(`${dbgPrefix}no match...`);
		return false;
	}
}
