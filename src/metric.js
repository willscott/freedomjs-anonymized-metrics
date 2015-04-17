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
  this.rappors = {};

  storage.get('metrics-id').then(function (id) {
    if (!id) {
      id = util.getId();
      storage.set('metrics-id', id);
    }
    var keys = Object.keys(definition.definition);
    keys.forEach(function (key) {
      this.rappors[key] = new rappor.Encoder(id, definition.definition[key]);
    }.bind(this));
  }.bind(this));

  if (!reports[this.name]) {
    reports[this.name] = {};
    rappors[this.name] = {};
  }
};

Metrics.prototype.report = function (metric, value) {
  if (!definitions[this.name][metric]) {
    return Promise.reject({
      errcode: "UNDEFINED",
      message: "Unknown metric: " + metric
    });
  }

  if (definitions[this.name][metric].type === "logarithmic") {
    reports[this.name][metric] = value;

    // for metric 'success', base 2, this would encode the keys:
    // success1, success2, success4, success8, success16.
    var mag = definitions[this.name][metric].base,
        rounded = Math.pow(mag, Math.floor(Math.log(value)/Math.log(mag)));
    rappors[this.name][metric] = this.rappors[metric].encode(metric + rounded).toString();
  } else if (definitions[this.name][metric].type === "string") {
    reports[this.name][metric] = value;

    rappors[this.name][metric] = this.rappors[metric].encode(metric + value).toString();
  }

  return Promise.resolve();
};

Metrics.prototype.retrieve = function () {
  var output = {};

  try {
    for (var report in reports) {
      var keys = Object.keys(reports[report]);
      keys.forEach(function (metric) {
        output[metric] = rappors[report][metric];
      }.bind(this));
    }
  } catch (e) {
    console.error(e);
    return Promise.reject(e.message);
  }

  return Promise.resolve(output);
};

Metrics.prototype.retrieveUnsafe = function () {
  var output = {};

  for (var report in reports) {
    var keys = Object.keys(reports[report]);
    keys.forEach(function (metric) {
      output[metric] = reports[report][metric];
    });
  }

  return Promise.resolve(output);
};

if (typeof freedom !== 'undefined') {
  freedom().providePromises(Metrics);
} else {
  exports.provider = Metrics;
  exports.api = "metrics";
}
