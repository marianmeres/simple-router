import { SimpleRoute } from './route';
export declare class SimpleRouter {
    static debug: boolean;
    protected _routes: [SimpleRoute, Function, boolean][];
    protected _catchAll: Function;
    protected _current: any;
    constructor(config: {
        [route: string]: Function;
    });
    protected _dbg(...a: any[]): void;
    reset(): this;
    get current(): any;
    on(routes: string | string[], cb: Function, allowQueryParams?: boolean): void;
    exec(url: string, fallbackFn?: Function): any;
}
