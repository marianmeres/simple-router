export interface RouteConfig {
	segment: string;
	name: string;
	test: RegExp;
	isOptional: boolean;
}

export class SimpleRoute {
	static SPLITTER = '/';

	protected _parsed: RouteConfig[];

	constructor(public readonly route) {
		this._parsed = SimpleRoute._parse(route);
	}

	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
	protected static _escapeRegExp(str: string) {
		return str.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
	}

	protected static _sanitizeAndSplit(str): string[] {
		const s = SimpleRoute._escapeRegExp(SimpleRoute.SPLITTER);
		return (
			`${str}`
				.trim()
				// splitter trim left and right
				.replace(new RegExp(`^(${s})+`), '')
				.replace(new RegExp(`(${s})+$`), '')
				.split(SimpleRoute.SPLITTER)
				// remove empty segments... will "normalize" multiple splitters into one
				.filter(Boolean)
		);
	}

	protected static _parse(route) {
		return SimpleRoute._sanitizeAndSplit(route).reduce((memo, segment) => {
			let name = null;

			// if optional, remove trailing '?' marker
			let isOptional = segment.endsWith('?');
			if (isOptional) segment = segment.slice(0, -1);

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
			memo.push({ segment, name, test, isOptional });
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
				if (k.length) memo[k] = v;
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

		const segments = SimpleRoute._sanitizeAndSplit(url);

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
