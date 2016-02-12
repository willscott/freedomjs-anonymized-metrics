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

var logMessages = [];

function clearLogs() {
  logMessages = [];
};

function logMessage(str) {
  logMessages.push(str);
};

function getLogs() {
  var ret = '  ' + logMessages.join('\n  ');
  clearLogs();
  return ret;
};

var getRandomness = function (callback) {
  logMessage("getRandomness: Starting with: " + JSON.stringify(definitions));
  var bloombits = 0;
  var num_definitions = 0;
  for (var i in definitions) {
    if (definitions.hasOwnProperty(i)) {
        for (var j in definitions[i]) {
            if (definitions[i].hasOwnProperty(j)) {
                num_definitions++;
                bloombits += definitions[i][j].num_bloombits || rappor.Params.num_bloombits;
            }
        }
    }
  }
  var num_desired_rand_bytes = 8 * 8 * bloombits * num_definitions;
  logMessage("getRandomness: total bloombits=" + bloombits + ", with " + num_definitions +
      " definitions.  So that should be "+ num_desired_rand_bytes);
  return new Promise(function (resolve, reject) {
    logMessage('asking to reload to ' + num_desired_rand_bytes);
    crypt.refreshBuffer(num_desired_rand_bytes, function(code, err) {
      if (code === 0) {
        resolve();
      } else {
        reject([err, getLogs()]);
      }});
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
  clearLogs();
  logMessage("Metrics.retrieve()");
  return getRandomness().then(this.actualRetrieve.bind(this),
                              function(err) { logMessage("Failed getRandomness: ", err); });
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
