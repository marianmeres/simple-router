const path = require('path');
const assert = require('assert').strict;
const { TestRunner } = require('test-runner');
const { SimpleRouter } = require('../dist');

const suite = new TestRunner(path.basename(__filename));

suite.test('sanity check', () => {
	const log = [];
	const router = new SimpleRouter({
		'/': () => log.push('index'),
	});

	// match returns truthy (depends on the callback)
	assert(router.exec('/'));

	// returns falsey on no match (but only if no fallback or catch all provided)
	assert(!router.exec('/wrong/path'));

	assert(log.join() === 'index');
});

suite.test('first match wins', () => {
	const log = [];
	const router = new SimpleRouter();

	router.on(['/', '/index.html'], () => log.push('index')); // must win
	router.on('/', () => log.push('foo'));

	router.exec('/');
	assert(log.join() === 'index');
});

suite.test('exec fallback', () => {
	const log = [];
	const router = new SimpleRouter({
		'/': () => log.push('index'),
	});

	router.exec('/foo', () => log.push('fallback'));

	assert(log.join() === 'fallback');
});

suite.test('catch all fallback', () => {
	const log = [];
	const router = new SimpleRouter({
		'/': () => log.push('index'),
		'*': () => log.push('404'),
	});

	// truthy even on no match (because catch all exists)
	assert(router.exec('/foo'));
	router.exec('/');

	assert(log.join() === '404,index');
});

suite.test('exec returns arbitrary value', () => {
	const indexComponent = { page: 'index' };
	const notFound = { page: 'not-found' };

	const router = new SimpleRouter({
		'/': () => indexComponent,
		'*': () => notFound,
	});

	assert(router.exec('/') === indexComponent);
	assert(router.exec('/foo') === notFound);
});

suite.test('integration', () => {
	const log = [];

	// routes can be cofigured via ctor config
	const router = new SimpleRouter({
		'/': () => log.push('index'),
		'*': () => log.push('404'),
	});

	// or via "on" api
	router.on('/[bar]/[id([\\d]+)]/baz', ({ bar, id }) => log.push(`${bar}:${id}`));

	router.exec('hey', () => log.push('ho')); // custom fallback
	router.exec('id/non-digits/baz'); // 404
	router.exec('id/123/baz'); // id:123
	router.exec(''); // index

	assert(log.join() === 'ho,404,id:123,index');
});

//
if (require.main === module) {
	suite.run();
}

module.exports = suite;
