"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleRouter = void 0;
const route_1 = require("./route");
class SimpleRouter {
    constructor(config) {
        this._routes = [];
        // current (last matched) route and params (in the shape { route: "...", params: {} } )
        this._current = { route: null, params: null };
        // https://svelte.dev/docs#Store_contract
        this._subscriptions = new Set();
        Object.entries(config || {}).forEach(([route, cb]) => {
            this.on(route, cb);
        });
    }
    _dbg(...a) {
        SimpleRouter.debug && console.log('[SimpleRouter]', ...a);
    }
    reset() {
        this._routes = [];
        return this;
    }
    get current() {
        return this._current;
    }
    on(routes, cb, allowQueryParams = true) {
        if (!Array.isArray(routes))
            routes = [routes];
        routes.forEach((route) => {
            if (route === '*') {
                this._catchAll = cb;
            }
            else {
                this._routes.push([new route_1.SimpleRoute(route), cb, allowQueryParams]);
            }
        });
    }
    exec(url, fallbackFn) {
        const dbgPrefix = `'${url}' -> `;
        const isFn = (v) => typeof v === 'function';
        for (const [route, cb, allowQueryParams] of this._routes) {
            // first match wins
            // parse returns null or params object (which can be empty)
            const params = route.parse(url, allowQueryParams);
            if (params) {
                this._publishCurrent(route.route, params);
                this._dbg(`${dbgPrefix}matches '${route.route}' with`, params);
                return isFn(cb) ? cb(params) : true;
            }
        }
        if (isFn(fallbackFn)) {
            this._publishCurrent(null, null);
            this._dbg(`${dbgPrefix}fallback...`);
            return fallbackFn();
        }
        if (isFn(this._catchAll)) {
            this._publishCurrent('*', null);
            this._dbg(`${dbgPrefix}catchall...`);
            return this._catchAll();
        }
        this._publishCurrent(null, null);
        this._dbg(`${dbgPrefix}no match...`);
        return false;
    }
    _publishCurrent(route, params) {
        this._current = { route, params };
        this._subscriptions.forEach((cb) => cb(this._current));
    }
    // https://svelte.dev/docs#Store_contract
    subscribe(subscription) {
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
exports.SimpleRouter = SimpleRouter;
// console log debug on/off switch
SimpleRouter.debug = false;
