/* global describe, it */
'use strict';

const assert = require('proclaim');
const polyfillio = require('../../../lib/index');

describe("polyfillio", function() {
	describe(".getPolyfills(features)", function() {

		it("should remove features not appropriate for the current UA", function() {
			const polyfillSet = polyfillio.getPolyfills({
				features: {
					'Array.prototype.map': { flags:[] }
				},
				uaString: 'chrome/38'
			});
				assert.deepEqual(polyfillSet, {});
		});

		it("should respect the always flag", function() {
			const polyfillSet = polyfillio.getPolyfills({
				features: {
					'Array.prototype.map': { flags:['always'] }
				},
				uaString: 'chrome/38'
			});
				assert.deepEqual(polyfillSet, {
					'Array.prototype.map': { flags:['always'] }
				});
		});

		it("should include dependencies", function() {
			const polyfillSet = polyfillio.getPolyfills({
				features: {
					'Element.prototype.placeholder': { flags: [] }
				},
				uaString: 'ie/8'
			});
				assert.deepEqual(polyfillSet, {
					'Element.prototype.placeholder': { flags:[] },
					'Object.defineProperty': { flags:[], aliasOf: ['Element.prototype.placeholder'] },
					'document.querySelector': { flags:[], aliasOf: ['Element.prototype.placeholder'] },
					'Element': { flags: [], aliasOf: ['Element.prototype.placeholder', 'document.querySelector'] },
					'Document': { flags: [], aliasOf: ['Element', 'Element.prototype.placeholder', 'document.querySelector'] }
				});
		});

		it("should not include unused dependencies", function() {
			const polyfillSet = polyfillio.getPolyfills({
				features: {
					'Promise': { flags: [] }
				},
				uaString: 'chrome/45'
			});
				assert.deepEqual(polyfillSet, {});
		});

		it("should return no polyfills for unknown UA unless unknown is set", function() {

				// Without unknown, no polyfills
					assert.deepEqual(polyfillio.getPolyfills({
					features: {'Math.sign': { flags: [] }},
					uaString: ''
				}), {});

				// With unknown=polyfill, default variant polyfills
					assert.deepEqual(polyfillio.getPolyfills({
					features: {'Math.sign': { flags: [] }},
					unknown: 'polyfill',
					uaString: ''
				}), {
						'Math.sign': { flags:[] }
					});

				// With unknown=polyfill, default variant polyfills (UA not specified)
					assert.deepEqual(polyfillio.getPolyfills({
					features: {'Math.sign': { flags: [] }},
					unknown: 'polyfill',
				}), {
						'Math.sign': { flags:[] }
					});
		});

		it("should understand the 'all' alias", function() {
			const polyfillSet = polyfillio.getPolyfills({
				features: {
					'all': { flags: [] }
				},
				uaString: 'ie/7'
			});
				assert(Object.keys(polyfillSet).length > 0);
			});
		});

		it("should respect the excludes option", function() {
					assert.deepEqual(polyfillio.getPolyfills({
					features: {
						'fetch': { flags:[] }
					},
					uaString: 'chrome/30'
				}), {
						fetch: { flags: [] },
						Promise: { flags: [], aliasOf: [ 'fetch' ] },
						setImmediate: { flags: [], aliasOf: [ 'Promise', 'fetch' ] }
					});
					assert.deepEqual(polyfillio.getPolyfills({
					features: {
						'fetch': { flags:[] }
					},
					excludes: ["Promise", "non-existent-feature"],
					uaString: 'chrome/30'
				}), {
						fetch: { flags: [] }
					});
		});
	});

	/*
	// TODO: Not sure how to test this reliably - need a mock polyfill source?
	describe('.getPolyfillstring', function() {

		it('should include the non-gated source when a feature-detect is unavailable', function() {
		});
	});
	*/
