'use strict';

const path = require('path');
const fs = require('graceful-fs');

const polyfillsPath = path.join(__dirname, '../polyfills/__dist');
let features = [];
let configuredAliases;

function Collection() {
	this.cache = {};
}

Collection.prototype.polyfillExists = function(featureName) {
	return (features.indexOf(featureName) !== -1);
};

Collection.prototype.listPolyfills = function() {
	return features;
};

Collection.prototype.getPolyfill = function(featureName) {

	// TODO: Should this throw if the polyfill doesn't exist? Makes the main module logic a bit more complex
	if (this.polyfillExists(featureName)) {
		return this.cache[featureName];
	} else {
		return null;
	}
};

Collection.prototype.getConfigAliases = function(featureName) {
	return configuredAliases[featureName];
};

const collection = new Collection();

// Discover and index all the available polyfills (synchronously so that the index is available for the first request)
try {
	configuredAliases = require(path.join(__dirname, '../polyfills/__dist/aliases.json'));
	features = fs
		.readdirSync(polyfillsPath)
		.filter(fileName => (fileName.match(/\.json$/) && fileName !== 'aliases.json'))
		.map(fileName => fileName.replace(/\.json$/i, ''))
	;
	const polyfillCount = features.length;
	console.log("Found "+polyfillCount+" polyfills");
	console.log("Placing all polyfills into memory", collection);
	features.forEach(feature => loadPolyfillIntoCache(collection.cache, feature));
} catch(e) {
	console.error(e);
	throw Error("No polyfill sources found.  Run `grunt build` to build them");
}

function loadPolyfillIntoCache(cache, featureName) {
		const feature = JSON.parse(fs.readFileSync(path.join(polyfillsPath, featureName + '.json'), 'utf-8'));
		feature.name = featureName;
		cache[featureName] = feature;
}

module.exports = collection;
