import { SimpleRoute } from './route';
export declare class SimpleRouter {
    static debug: boolean;
    protected _routes: [SimpleRoute, Function, boolean][];
    protected _catchAll: Function;
    protected _current: {
        route: string;
        params: any;
    };
    protected _subscriptions: Set<Function>;
    constructor(config: {
        [route: string]: Function;
    });
    protected _dbg(...a: any[]): void;
    reset(): this;
    get current(): {
        route: string;
        params: any;
    };
    on(routes: string | string[], cb: Function, allowQueryParams?: boolean): void;
    exec(url: string, fallbackFn?: Function): any;
    protected _publishCurrent(route: any, params: any): void;
    subscribe(subscription: Function): {
        unsubscribe: () => boolean;
    };
}
