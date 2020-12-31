"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleRouter = void 0;
const route_1 = require("./route");
class SimpleRouter {
    constructor(config) {
        this._routes = [];
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
    on(routes, cb) {
        if (!Array.isArray(routes))
            routes = [routes];
        routes.forEach((route) => {
            if (route === '*') {
                this._catchAll = cb;
            }
            else {
                this._routes.push([new route_1.SimpleRoute(route), cb]);
            }
        });
    }
    exec(url, fallbackFn) {
        const dbgPrefix = `'${url}' -> `;
        const isFn = (v) => typeof v === 'function';
        for (const [route, cb] of this._routes) {
            // first match wins
            // parse returns null or params object (which can be empty)
            const params = route.parse(url);
            if (params) {
                this._dbg(`${dbgPrefix}matches '${route.route}' with`, params);
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
exports.SimpleRouter = SimpleRouter;
// console log debug on/off switch
SimpleRouter.debug = false;
