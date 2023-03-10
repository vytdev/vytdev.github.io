/*!
 * util.js — Doc resource
 */
(function(factory) {
	"use strict";
	// expose this to global scope (for browser and some browser emulators)
	if (typeof window != "undefined" && window.window == window) factory(window);
	else if (typeof define == "function" && define.amd) define([], "util", factory);
	else if (typeof module == "object" && typeof exports == "object") module.exports = factory(global);
	else if (typeof self == "object" && self.self == self) factory(self);
	else factory(this);
})(function factory(scope) {
"use strict";

if (!scope.jQuery) throw "jQuery missing!";

var cache = {}, global = {};
var build = 1;


function util(val) {
	if (typeof val == "string") return loadModule(val);
}

// define build number
util.build = build;

// main function for loading modules
function loadModule(pkg) {
	if (!cache[pkg]) throw "Module not found!"
	if (!cache[pkg].data.exports) {
		cache[pkg].data.exports = {};
		cache[pkg].callback.call(global, loadModule, cache[pkg].data, cache[pkg].data.exports, global);
		cache[pkg].data.loaded = true;
	};
	return cache[pkg].data.exports;
}

// a class for representing modules
function Addin(pkg, fn) {
	if (pkg in cache) throw "Module already registered!";
	if (!(this instanceof Addin)) return new Addin(pkg, fn);
	cache[pkg] = this;
	this.name = pkg;
	this.reset();
	this.callback = fn;
}

Addin.prototype = {
	constructor: Addin,
	
	data:  {exports: null, loaded: false, path: "/", id: "<null>"},
	reset: function() {
		this.data = {exports: null, loaded: false, path: this.name, id: this.name};
	}
};

util.register = function(pkg, fn) {
	return Addin(pkg, fn);
}

// An integraded math library for mathematical equations
util.register("math", function(require, module, exports, global) {
"use strict";

var math = require(module.id);


// the ratio of the circumference of a circle to its diameter
exports.PI   = 3.14159265358979323846;

// the Euler's number, it is the base of the natural logarithms
exports.E    = 2.71828182845904523536;



exports.pow = function(x, y) {
	var n = 1;
	for (var c = 0; c < y; c++) n = n * x;
	return n;
};

exports.floor = function (num, place) {
	return num - (num % math.pow(10, (place || 0)));
};

exports.ceil = function (num, place) {
	var pow = math.pow(10, (place || 0));
	var off = num % pow;
	return (num - off) + ((off === 0 ? 0 : 1) * pow);
};

exports.round = function (num, place) {
	var pow = math.pow(10, (place || 0));
	var off = num % pow;
	return (num - off) + ((off < 0.5 ? 0 : 1) * pow);
};

exports.elevt = function(x, e) {
	return math.pow(10, e || 0) * x;
};

exports.sum = function() {
	var n = 0;
	for (var c = 0; c < arguments.length; c++) n = n + arguments[c];
	return n;
};

exports.prod = function() {
	var n = 1;
	for (var c = 0; c < arguments.length; c++) n = n * arguments[c];
	return n;
};

exports.avg = function() {
	var n = 0;
	for (var c = 0; c < arguments.length; c++) n = n + arguments[c];
	return n / arguments.length;
};


});



// in-case of overwrite
var overwrite = scope._ === scope.util && scope.util;

// for AMD, with version checking
util.noConflict = function(deep) {
	var sub = scope._ || scope.util;
	if ((deep && overwrite && overwrite.build < build) || (sub.build < build)) {
		return scope._ = scope.util = util;
	}
};

// not loading on AMD, so...
if ((typeof define !== "function" || !define.amd) && overwrite) util.noConflict(true);
else return scope._ = scope.util = util;

});




