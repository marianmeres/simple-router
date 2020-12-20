const path = require('path');
const _ = require('lodash');
const assert = require('assert').strict;
const { TestRunner } = require('test-runner');
const { SimpleRoute } = require('../dist');

const suite = new TestRunner(path.basename(__filename));

const rpad = (s, len = 25) => (s += (' '.repeat(Math.max(0, len - s.length))));

// prettier-ignore
[
	// no match
	['/foo',                     '/bar',              null],
	['/foo',                     '',                  null],
	['/foo/[bar]',               '/foo',              null],
	['/[foo]/bar',               '/foo',              null],
	['/[foo]/[bar]',             '/foo',              null],
	// match no params
	['/',                        '',                  {}],
	['',                         '///',               {}],
	['foo',                      'foo',               {}],
	['//foo///bar.baz/',         'foo/bar.baz',       {}],
	['foo/bar/baz',              '//foo//bar/baz//',  {}],
	['#/foo//',                  '#/foo',             {}],
	// match with params
	['/[foo]',                   '/bar',              { foo: 'bar' }],
	['#/foo/[bar]',              '#/foo/bat',         { bar: 'bat' }],
	['#/[foo]/[bar]',            '#/baz/bat',         { foo: 'baz', bar: 'bat' }],
	['#/[foo]/bar',              '#/baz/bar',         { foo: 'baz' }],
	// params with regex constraint
	['/[id([0-9]+)]',            '/123',              { id: '123' }],
	['/[id(\\d-\\d)]',           '/1-2',              { id: '1-2' }],
	['/[id([0-9]+)]',            '/foo',              null],
	['/foo/[bar]/[id([0-9]+)]',  '/foo/baz/123',      { bar: 'baz', id: '123' }],
	['/foo/[id([0-9]+)]/[bar]',  '/foo/bar/baz',      null],
	// wrong regex - missing name...
	['/foo/[([0-9]+)]',          '/foo/123',          null],
]
	.forEach(([route, input, expected]) => {
		suite.test(
			`${rpad(route, 23)} -> ${rpad(input, 16)} => ${JSON.stringify(expected)}`,
			() => {
				const actual = new SimpleRoute(route).parse(input);
				assert(_.isEqual(actual, expected), JSON.stringify(actual));
			}
		)
	});

//
if (require.main === module) {
	suite.run();
}

module.exports = suite;
