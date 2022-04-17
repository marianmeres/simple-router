import { SimpleRoute } from './route';
export declare class SimpleRouter {
    static debug: boolean;
    protected _routes: [SimpleRoute, Function, boolean, string][];
    protected _catchAll: Function;
    protected _current: {
        route: string;
        params: any;
        label: string;
    };
    protected _subscriptions: Set<Function>;
    constructor(config?: {
        [route: string]: Function;
    });
    protected _dbg(...a: any[]): void;
    reset(): this;
    get current(): {
        route: string;
        params: any;
        label: string;
    };
    on(routes: string | string[], cb: Function, { label, allowQueryParams }?: {
        label?: any;
        allowQueryParams?: boolean;
    }): void;
    exec(url: string, fallbackFn?: Function): any;
    protected _publishCurrent(route: any, params: any, label: any): void;
    subscribe(subscription: Function): {
        unsubscribe: () => boolean;
    };
}
