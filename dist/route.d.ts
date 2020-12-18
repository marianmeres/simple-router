export interface RouteConfig {
    segment: string;
    name: string;
    test: RegExp;
}
export declare class SimpleRoute {
    readonly route: any;
    static SPLITTER: string;
    protected _parsed: RouteConfig[];
    constructor(route: any);
    protected static _escapeRegExp(string: any): any;
    protected static _sanitizeAndSplit(str: any): string[];
    protected static _parse(route: any): any[];
    parse(url: any): {};
}
