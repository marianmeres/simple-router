const { TestRunner } = require('test-runner');

const args = process.argv.slice(2);
const verbose = args.includes('-v');
const whitelist = args.filter((v) => !/^-v$/.test(v));

TestRunner.runAll(__dirname, {
	whitelist,
	verbose,
	rootDir: __dirname,
	enableErrorsSummaryOnNonVerbose: true,
});
