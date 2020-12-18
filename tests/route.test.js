const path = require('path');
const _ = require('lodash');
const assert = require('assert').strict;
const { TestRunner } = require('test-runner');
const { SimpleRoute } = require('../dist');

const suite = new TestRunner(path.basename(__filename));

// prettier-ignore
[
	// no match
	['/foo                   ', '/bar            ', null],
	['/foo                   ', '                ', null],
	['/foo/[bar]             ', '/foo            ', null],
	['/[foo]/bar             ', '/foo            ', null],
	['/[foo]/[bar]           ', '/foo            ', null],
	// match no params
	['/                      ', '                ', {}],
	['                       ', '///             ', {}],
	['foo                    ', 'foo             ', {}],
	['//foo///bar.baz/       ', 'foo/bar.baz     ', {}],
	['foo/bar/baz            ', '//foo//bar/baz//', {}],
	['#/foo//                ', '#/foo           ', {}],
	// match with params
	['/[foo]                 ', '/bar            ', { foo: 'bar' }],
	['#/foo/[bar]            ', '#/foo/bat       ', { bar: 'bat' }],
	['#/[foo]/[bar]          ', '#/baz/bat       ', { foo: 'baz', bar: 'bat' }],
	['#/[foo]/bar            ', '#/baz/bar       ', { foo: 'baz' }],
	// params with regex constraint
	['/[id([0-9]+)]          ', '/123            ', { id: '123' }],
	['/[id(\\d-\\d)]           ', '/1-2            ', { id: '1-2' }],
	['/[id([0-9]+)]          ', '/foo            ', null],
	['/foo/[bar]/[id([0-9]+)]', '/foo/baz/123    ', { bar: 'baz', id: '123' }],
	['/foo/[id([0-9]+)]/[bar]', '/foo/bar/baz    ', null],
	// wrong regex - missing name...
	['/foo/[([0-9]+)]        ', '/foo/123        ', null],
]
	.forEach(([route, match, expected]) => {
		suite.test(
			`${route} -> ${match} => ${JSON.stringify(expected)}`,
			() => {
				let actual = new SimpleRoute(route).parse(match);
				assert(_.isEqual(actual, expected), JSON.stringify(actual));
			}
		)
	});

//
if (require.main === module) {
	suite.run();
}

module.exports = suite;
