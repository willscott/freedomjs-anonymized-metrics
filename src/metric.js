/*jslint node:true, sloppy:true */
/*globals freedom,Promise */

var rappor = require('rappor');
var crypt = require('crypto');
var util = require('freedom/src/util');
var storage = freedom['core.storage']();

var reports = {},
    definitions = {},
    rappors = {},
    rapporState,
    rapporId;

var getRandomness = function (callback) {
  var bloombits = 0;
  for (var i in definitions) {
    if (definitions.hasOwnProperty(i)) {
      bloombits += definitions[i].num_bloombits || rappor.Params.num_bloombits;
    }
  }
  return new Promise(function (resolve) {
    console.log('asking to reload to ', 4*bloombits);
    crypt.refreshBuffer(4 * 8 * bloombits + Object.keys(definitions).length, resolve);
  });
};

var Metrics = function (dispatchEvent, definition) {
  this.ready = false;
  this.name = definition.name;
  definitions[this.name] = definition.definition;

  if (!reports[this.name]) {
    reports[this.name] = {};
    rappors[this.name] = {};
  }

  this.loadPromise = storage.get('metrics-rapporstate').then(function (state) {
    if (state && !rapporState) {
      rapporState = JSON.parse(state);
    } else {
      rapporState = {};
    }
    if (!rapporId) {
      return storage.get('metrics-id');
    } else {
      return rapporId;
    }
  }.bind(this)).then(function (id) {
    if (!id) {
      rapporId = util.getId();
      storage.set('metrics-id', rapporId);
    }
    var keys = Object.keys(definition.definition);
    keys.forEach(function (key) {
      rappors[this.name][key] = new rappor.Encoder(rapporId, definition.definition[key],
        new rappor.MemoizedRandomFunctions(definition.definition[key], rapporState));
    }.bind(this));
    this.ready = true;
  }.bind(this));
};

Metrics.prototype.report = function (metric, value) {
  if (!definitions[this.name][metric]) {
    return Promise.reject({
      errcode: "UNDEFINED",
      message: "Unknown metric: " + metric
    });
  }

  reports[this.name][metric] = value;

  return Promise.resolve();
};

Metrics.prototype.retrieve = function () {
  return getRandomness().then(this.actualRetrieve.bind(this));
};

Metrics.prototype.actualRetrieve = function () {
  if (!this.ready) {
    return this.loadPromise.then(this.actualRetrieve.bind(this));
  }

  var output = {},
      addReport = function (metric) {
        var value = reports[report][metric];
        if (definitions[report][metric].type === "logarithmic") {
          // for metric 'success', base 2, this would encode the keys:
          // success1, success2, success4, success8, success16.
          if (!definitions[report][metric].base) {
            throw new Error("Logarihmic metrics must define a base for encoding.");
          }
          var mag = definitions[report][metric].base,
              rounded = Math.pow(mag, Math.floor(Math.log(value)/Math.log(mag)));
          output[metric] = rappors[report][metric].encode(String(metric) + rounded).value;
        } else if (definitions[this.name][metric].type === "string") {
          output[metric] = rappors[report][metric].encode(metric + value).value;
        } else {
          throw new Error("Unknown Metric Type for " + metric + ": " + definitions[this.name][metric].type);
        }
      }.bind(this);
  try {
    for (var report in reports) {
      var keys = Object.keys(reports[report]);
      keys.forEach(addReport);
    }
    storage.set('metrics-rapporstate', JSON.stringify(rapporState));
  } catch (e) {
    console.error(e);
    return Promise.reject(e.message);
  }

  return Promise.resolve(output);
};

Metrics.prototype.retrieveUnsafe = function () {
  var output = {},
      addReport = function (metric) {
        output[metric] = reports[report][metric];
      };

  for (var report in reports) {
    var keys = Object.keys(reports[report]);
    keys.forEach(addReport);
  }

  return Promise.resolve(output);
};

if (typeof freedom !== 'undefined') {
  freedom().providePromises(Metrics);
} else {
  exports.provider = Metrics;
  exports.api = "metrics";
}
