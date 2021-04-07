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

	//
	assert(router.current.route === null);
	assert(router.current.params === null);

	// match returns truthy (depends on the callback)
	assert(router.exec('/'));

	//
	assert(router.current.route === '/');
	assert(router.current.params);

	// returns falsey on no match (but only if no fallback or catch all provided)
	assert(!router.exec('/wrong/path'));

	//
	assert(router.current.route === null);
	assert(router.current.params === null);

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

	// truthy even on no match (because catch all returns truthy)
	assert(router.exec('/foo'));

	assert(router.current.route === '*');

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
	const log2 = [];

	// routes can be cofigured via ctor config
	const router = new SimpleRouter({
		'/': () => log.push('index'),
		'*': () => log.push('404'),
	});

	router.subscribe((v) => log2.push(v.route));

	// or via "on" api
	const route = '/[bar]/[id([\\d]+)]/baz';
	router.on(route, ({ bar, id }) => log.push(`${bar}:${id}`));

	router.exec('hey', () => log.push('ho')); // custom fallback
	assert(router.current.route === null);

	router.exec('id/non-digits/baz'); // 404
	assert(router.current.route === '*');
	assert(router.current.params === null);

	router.exec('id/123/baz'); // id:123
	assert(router.current.route === route);
	assert(router.current.params.bar === 'id');
	assert(router.current.params.id === '123');

	router.exec(''); // index
	assert(router.current.route === '/');

	assert(log.join() === 'ho,404,id:123,index');
	assert(log2.join() === [null, null, '*', route, '/'].join());
});

//
if (require.main === module) {
	suite.run();
}

module.exports = suite;
