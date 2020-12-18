class SimpleRoute {
    constructor(route) {
        this.route = route;
        this._parsed = SimpleRoute._parse(route);
    }
    // static _escapeRegExp(string) {
    //     return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
    // }
    // static _sanitizeAndSplit(str) {
    //     const s = SimpleRoute._escapeRegExp(SimpleRoute.SPLITTER);
    //     return (`${str}`
    //         .trim()
    //         // splitter trim left and right
    //         .replace(new RegExp(`^(${s})+`), '')
    //         .replace(new RegExp(`(${s})+$`), '')
    //         .split(SimpleRoute.SPLITTER)
    //         // remove empty segments... will "normalize" multiple splitters into one
    //         .filter(Boolean));
    // }
    // static _parse(route) {
    //     return SimpleRoute._sanitizeAndSplit(route).reduce((memo, segment) => {
    //         let name = null;
    //         let test = new RegExp('^' + SimpleRoute._escapeRegExp(segment) + '$');
    //         // starting with at least one word char within brackets...
    //         let m = segment.match(/^\[(\w.+)]$/);
    //         if (m) {
    //             name = m[1];
    //             test = /.+/;
    //             // id([0-9]+)
    //             let m2 = m[1].match(/^(\w.*)\((.+)\)$/);
    //             if (m2) {
    //                 name = m2[1];
    //                 test = new RegExp('^' + m2[2] + '$');
    //             }
    //         }
    //         memo.push({ segment, name, test });
    //         return memo;
    //     }, []);
    // }
    // parse(url) {
    //     let segments = SimpleRoute._sanitizeAndSplit(url);
    //     // quick cheap check: if counts dont match = no match
    //     if (segments.length !== this._parsed.length) {
    //         return null;
    //     }
    //     let matched = {};
    //     for (const [i, s] of segments.entries()) {
    //         const p = this._parsed[i];
    //         if (!p.test.test(s)) {
    //             return null;
    //         }
    //         if (p.name) {
    //             matched[p.name] = s;
    //         }
    //     }
    //     return matched;
    // }
}
SimpleRoute.SPLITTER = '/';

//
// class SimpleRouter {
//     constructor(config) {
//         this._routes = [];
//         Object.entries(config || {}).forEach(([route, cb]) => {
//             this.on(route, cb);
//         });
//     }
//     _dbg(...a) {
//         SimpleRouter.debug && console.log('[SimpleRouter]', ...a);
//     }
//     on(routes, cb) {
//         if (!Array.isArray(routes))
//             routes = [routes];
//         routes.forEach((route) => {
//             if (route === '*') {
//                 this._catchAll = cb;
//             }
//             else {
//                 this._routes.push([new SimpleRoute(route), cb]);
//             }
//         });
//     }
//     exec(url, fallbackFn) {
//         this._dbg(`routing: '${url}' ...`);
//         const isFn = (v) => typeof v === 'function';
//         for (const [route, cb] of this._routes) {
//             // first match wins
//             // parse returns null or params object (which can be empty)
//             const params = route.parse(url);
//             if (params) {
//                 this._dbg(`'${route.route}' match with`, params);
//                 return isFn(cb) ? cb(params) : true;
//             }
//         }
//         if (isFn(fallbackFn)) {
//             this._dbg(`falling back...`);
//             return fallbackFn();
//         }
//         if (isFn(this._catchAll)) {
//             this._dbg(`catching all...`);
//             return this._catchAll();
//         }
//         return false;
//     }
// }
// SimpleRouter.debug = false;
