import { SimpleRoute } from './route';
export declare class SimpleRouter {
    static debug: boolean;
    protected _routes: [SimpleRoute, Function][];
    protected _catchAll: Function;
    constructor(config: {
        [route: string]: Function;
    });
    protected _dbg(...a: any[]): void;
    on(routes: string | string[], cb: Function): void;
    exec(url: string, fallbackFn?: Function): any;
}
