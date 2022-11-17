'use strict';

class SimpleRoute {
    route;
    static SPLITTER = '/';
    _parsed;
    constructor(route) {
        this.route = route;
        this._parsed = SimpleRoute._parse(route);
    }
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
    static _escapeRegExp(str) {
        return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
    }
    static _sanitizeAndSplit(str) {
        const s = SimpleRoute._escapeRegExp(SimpleRoute.SPLITTER);
        return (`${str}`
            .trim()
            // splitter trim left and right
            .replace(new RegExp(`^(${s})+`), '')
            .replace(new RegExp(`(${s})+$`), '')
            .split(SimpleRoute.SPLITTER)
            // remove empty segments... will "normalize" multiple splitters into one
            .filter(Boolean));
    }
    static _parse(route) {
        let wasSpread = false;
        return SimpleRoute._sanitizeAndSplit(route).reduce((memo, segment) => {
            let name = null;
            // if optional, remove trailing '?' marker
            let isOptional = segment.endsWith('?');
            if (isOptional)
                segment = segment.slice(0, -1);
            let isSpread = segment.startsWith('[...');
            if (isSpread) {
                if (isOptional) {
                    throw new Error('Spread segment must not be marked as optional');
                }
                if (wasSpread) {
                    throw new Error('Multiple spread segments are invalid');
                }
                wasSpread = true;
                segment = '[' + segment.substr(4);
            }
            let test = new RegExp('^' + SimpleRoute._escapeRegExp(segment) + '$');
            // starting with at least one word char within brackets...
            let m = segment.match(/^\[(\w.+)]$/);
            if (m) {
                name = m[1];
                test = /.+/;
                // id([0-9]+)
                let m2 = m[1].match(/^(\w.*)\((.+)\)$/);
                if (m2) {
                    name = m2[1];
                    test = new RegExp('^' + m2[2] + '$');
                }
            }
            memo.push({ segment, name, test, isOptional, isSpread });
            return memo;
        }, []);
    }
    static parseQueryString(str) {
        return `${str}`
            .replace(/^&/, '')
            .replace(/&$/, '')
            .split('&')
            .reduce((memo, kvpair) => {
            const [k, v] = kvpair.split('=').map(decodeURIComponent);
            if (k.length)
                memo[k] = v;
            return memo;
        }, {});
    }
    parse(url, allowQueryParams = true) {
        let matched = {};
        const qPos = url.indexOf('?');
        if (allowQueryParams && ~qPos) {
            const _backup = url;
            url = _backup.slice(0, qPos);
            matched = SimpleRoute.parseQueryString(_backup.slice(qPos + 1));
        }
        let segments = SimpleRoute._sanitizeAndSplit(url);
        // SPREAD PARAMS DANCING BLOCK - if there are "spread" definitions we need to adjust input
        // that is "group" (join) segments that were initially splitted
        const hasSpread = !!this._parsed.filter((v) => v.isSpread).length;
        if (hasSpread) {
            let newSegments = [];
            this._parsed.forEach((p, i) => {
                if (p.isSpread) {
                    // there are defined segments after the "spread" definition
                    if (this._parsed[i + 1]) {
                        // SimpleRoute
                        newSegments.push(segments.slice(0, this._parsed.length - i).join(SimpleRoute.SPLITTER));
                        segments = segments.slice(this._parsed.length - i);
                    }
                    // there are no more defined segments
                    else {
                        newSegments.push(segments.join(SimpleRoute.SPLITTER));
                    }
                }
                else {
                    newSegments = newSegments.concat(segments.slice(0, 1));
                    segments = segments.slice(1);
                }
            });
            segments = newSegments;
        }
        // minimum required (not optional) segments length
        const reqLen = this._parsed.reduce((memo, p, idx, arr) => {
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
            const p = this._parsed[i];
            if (!p || !p.test.test(s)) {
                return null;
            }
            if (p.name) {
                matched[decodeURIComponent(p.name)] = decodeURIComponent(s);
            }
        }
        return matched;
    }
}

class SimpleRouter {
    // console log debug on/off switch
    static debug = false;
    _routes = [];
    _catchAll;
    // current (last matched) route and params (in the shape { route: "...", params: {} } )
    _current = {
        route: null,
        params: null,
        label: null,
    };
    // https://svelte.dev/docs#Store_contract
    _subscriptions = new Set();
    constructor(config = null) {
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
    on(routes, cb, { label = null, allowQueryParams = true } = {}) {
        if (!Array.isArray(routes))
            routes = [routes];
        routes.forEach((route) => {
            if (route === '*') {
                this._catchAll = cb;
            }
            else {
                this._routes.push([new SimpleRoute(route), cb, allowQueryParams, label]);
            }
        });
    }
    exec(url, fallbackFn) {
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
    _publishCurrent(route, params, label) {
        this._current = { route, params, label };
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

exports.SimpleRoute = SimpleRoute;
exports.SimpleRouter = SimpleRouter;
