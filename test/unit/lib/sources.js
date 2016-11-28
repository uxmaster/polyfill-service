/* eslint-env mocha */
"use strict";

const assert = require('proclaim');
const mockery = require('mockery');
const path = require('path');
const sinon = require('sinon');
require('sinon-as-promised');

describe('lib/sources', () => {
	let aliases;
	let denodeify;
	let fs;
	let sources;

	beforeEach(() => {
		denodeify = require('../mock/denodeify.mock');
		mockery.registerMock('denodeify', denodeify);

		fs = require('../mock/fs.mock');
		mockery.registerMock('fs', fs);
		fs.readdirSync.returns([]);

		aliases = {};
		mockery.registerMock('../polyfills/__dist/aliases.json', aliases);
	});

	it('exports an object', () => {
		sources = require('../../../lib/sources');
		assert.isObject(sources);
	});

	it('has a getCollection method', () => {
		sources = require('../../../lib/sources');
		assert.isFunction(sources.getCollection);
	});

	it('loads the polyfill aliases file', () => {
		// TODO
	});

	it('reads the polyfill directory', () => {
		sources = require('../../../lib/sources');
		assert.calledWithExactly(fs.readdirSync, path.join(__dirname, '../../../polyfills/__dist'));
	});

	it('filters out aliases.json from the polyfill directory', () => {
		const spy = sinon.spy(Array.prototype, 'filter');
		sources = require('../../../lib/sources');
		spy.restore();
		assert.equal(spy.lastCall.args[0]('aliases.json'), []);
	});

	it('removes .json from the filenames retrieved from the polyfill directory', () => {
		const spy = sinon.spy(Array.prototype, 'map');
		sources = require('../../../lib/sources');
		spy.restore();
		assert.equal(spy.lastCall.args[0]('example.json'), ['example']);
	});

	it('catches errors when reading the polyfill directory and returns a friendly error message. ', () => {
		const error = new Error;
		fs.readdirSync.throws(error);
		assert.throws(() => require('../../../lib/sources'), "No polyfill sources found.  Run `grunt build` to build them");
	});

	describe('sources.getCollection()', () => {

		it('returns a Collection object', () => {
			sources = require('../../../lib/sources');
			const collection = sources.getCollection();
			assert.isFunction(collection.polyfillExistsSync);
			assert.isFunction(collection.listPolyfills);
			assert.isFunction(collection.getPolyfill);
			assert.isFunction(collection.getConfigAliases);
			assert.isObject(collection.cache);
		});

		it('returns the same collection object', () => {
			sources = require('../../../lib/sources');
			assert.deepEqual(sources.getCollection(), sources.getCollection());
		});

		describe('sources.getCollection().polyfillExistsSync()', () => {
			it('returns true if polyfill exists', () => {
				fs.readdirSync.returns(['featureToPolyfill.json']);
				sources = require('../../../lib/sources');
				const collection = sources.getCollection();
				assert.equal(collection.polyfillExistsSync('featureToPolyfill'), true);
			});

			it('returns false if polyfill exists', () => {
				fs.readdirSync.returns(['featureToPolyfill.json']);
				sources = require('../../../lib/sources');
				const collection = sources.getCollection();
				assert.equal(collection.polyfillExistsSync('Array.from'), false);
			});
		});

		describe('sources.getCollection().listPolyfills()', () => {
			it('returns a promise which resolves with an array containing names for each polyfilled feature', () => {
				fs.readdirSync.returns(['Array.from.json', 'Symbol.json']);
				sources = require('../../../lib/sources');
				const collection = sources.getCollection();
				return collection.listPolyfills().then(polyfills => assert.deepEqual(polyfills, [ 'Array.from', 'Symbol' ]));
			});
		});

		describe('sources.getCollection().getConfigAliases()', () => {
			it('returns a promise which resolves to an array of polyfills which are under the alias', () => {
				const polyfills = ["Array.from","Array.of","Map","Object.assign","Object.is","Promise","Set","Symbol","WeakMap","WeakSet"];
				aliases["es6"] = polyfills;
				sources = require('../../../lib/sources');
				const collection = sources.getCollection();
				return collection.getConfigAliases('es6').then(aliasedPolyfills => assert.deepEqual(aliasedPolyfills, polyfills));
			});

			it('returns a promise which resolves to undefined if alias does not exist', () => {
				const polyfills = ["Array.from","Array.of","Map","Object.assign","Object.is","Promise","Set","Symbol","WeakMap","WeakSet"];
				aliases["es6"] = polyfills;
				sources = require('../../../lib/sources');
				const collection = sources.getCollection();
				return collection.getConfigAliases('es7').then(aliasedPolyfills => assert.deepEqual(aliasedPolyfills, undefined));
			});
		});

		describe('sources.getCollection().getPolyfill()', () => {
			it('returns a promise which resolves to null if the polyfill does not exist', () => {
				fs.readdirSync.returns(['Array.from.json']);
				sources = require('../../../lib/sources');
				const collection = sources.getCollection();
				return collection.getPolyfill('Array.of').then(polyfill => assert.equal(polyfill, null));
			});

			it('retrieves polyfill from polyfill folder if not cached', () => {
				const arrayFromPolyfill = {"aliases":["es6"],"browsers":{"chrome":"<45"},"dependencies":["Object.defineProperty"]};
				fs.readFile.resolves(JSON.stringify(arrayFromPolyfill));
				denodeify.returns(fs.readFile);
				fs.readdirSync.returns(['Array.from.json']);

				sources = require('../../../lib/sources');
				const collection = sources.getCollection();

				return collection.getPolyfill('Array.from').then(() => {
					assert.calledWithExactly(fs.readFile, path.join(__dirname, '../../../polyfills/__dist/Array.from.json'), 'utf-8');
				});
			});

			it('adds polyfill to cache once loaded from polyfill folder', () => {
				const arrayFromPolyfill = {"aliases":["es6"],"browsers":{"chrome":"<45"},"dependencies":["Object.defineProperty"]};
				fs.readFile.resolves(JSON.stringify(arrayFromPolyfill));
				denodeify.returns(fs.readFile);
				fs.readdirSync.returns(['Array.from.json']);

				sources = require('../../../lib/sources');
				const collection = sources.getCollection();

				return collection.getPolyfill('Array.from').then(polyfill => {
					assert.deepEqual(collection.cache, {'Array.from': polyfill});
				});
			});

			it('does not read from filesystem if polyfill is already in the cache', () => {
				const arrayFromPolyfill = {"aliases":["es6"],"browsers":{"chrome":"<45"},"dependencies":["Object.defineProperty"]};
				fs.readFile.resolves(JSON.stringify(arrayFromPolyfill));
				denodeify.returns(fs.readFile);
				fs.readdirSync.returns(['Array.from.json']);

				sources = require('../../../lib/sources');
				const collection = sources.getCollection();

				return collection.getPolyfill('Array.from').then(() => {
					assert.calledOnce(fs.readFile);
					return collection.getPolyfill('Array.from').then(() => {
						assert.calledOnce(fs.readFile);
					});
				});
			});

			it('adds polyfill name to polyfill object', () => {
				const arrayFromPolyfill = {"aliases":["es6"],"browsers":{"chrome":"<45"},"dependencies":["Object.defineProperty"]};
				fs.readFile.resolves(JSON.stringify(arrayFromPolyfill));
				denodeify.returns(fs.readFile);
				fs.readdirSync.returns(['Array.from.json']);

				sources = require('../../../lib/sources');
				const collection = sources.getCollection();

				return collection.getPolyfill('Array.from').then(polyfill => {

					assert.equal(polyfill.name, 'Array.from');
					delete polyfill.name;
					assert.deepEqual(polyfill, arrayFromPolyfill);
				});
			});
		});

	});

});
