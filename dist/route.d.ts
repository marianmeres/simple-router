export interface RouteConfig {
    segment: string;
    name: string;
    test: RegExp;
    isOptional: boolean;
    isSpread: boolean;
}
export declare class SimpleRoute {
    readonly route: any;
    static SPLITTER: string;
    static WILDCARD: string;
    protected _parsed: RouteConfig[];
    constructor(route: any);
    protected static _escapeRegExp(str: string): string;
    protected static _sanitizeAndSplit(str: any): string[];
    protected static _parse(route: any): any[];
    static parseQueryString(str: any): {};
    parse(url: any, allowQueryParams?: boolean): {};
}
