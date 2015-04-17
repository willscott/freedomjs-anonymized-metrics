/*jslint node:true, sloppy:true */
/*globals freedom,Promise */

var rappor = require('rappor');
var util = require('freedom/src/util');
var storage = freedom['core.storage']();

var reports = {},
    definitions = {},
    rappors = {};

var Metrics = function (dispatchEvent, definition) {
  this.name = definition.name;
  definitions[this.name] = definition.definition;

  if (!reports[this.name]) {
    reports[this.name] = {};
    rappors[this.name] = {};
  }

  storage.get('metrics-id').then(function (id) {
    if (!id) {
      id = util.getId();
      storage.set('metrics-id', id);
    }
    var keys = Object.keys(definition.definition);
    keys.forEach(function (key) {
      rappors[this.name][key] = new rappor.Encoder(id, definition.definition[key]);
    }.bind(this));
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
  var output = {},
      addReport = function (metric) {
        var value = reports[report][metric];
        if (definitions[report][metric].type === "logarithmic") {
          // for metric 'success', base 2, this would encode the keys:
          // success1, success2, success4, success8, success16.
          var mag = definitions[report][metric].base,
              rounded = Math.pow(mag, Math.floor(Math.log(value)/Math.log(mag)));
          output[metric] = rappors[report][metric].encode(metric + rounded).value;
        } else if (definitions[this.name][metric].type === "string") {
          output[metric] = this.rappors[report][metric].encode(metric + value).value;
        }
      }.bind(this);

  try {
    for (var report in reports) {
      var keys = Object.keys(reports[report]);
      keys.forEach(addReport);
    }
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
