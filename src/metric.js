/*jslint node:true, sloppy:true */
/*globals freedom,Promise */

var rappor = require('rappor');
var util = require('freedom/src/util');
var storage = freedom['core.storage']();

var reports;

var Metrics = function (dispatchEvent, definition) {
  this.definition = definition.definition;
  this.name = definition.name;
  this.rappors = {};

  storage.get('metrics-id').then(function (id) {
    if (!id) {
      id = util.getId();
      storage.set('metrics-id', id);
    }
    var keys = Object.keys(this.definition);
    for (var key in keys) {
      this.rappors[key] = new rappor.Encoder(id, this.definition[key]);
    }
  }.bind(this));

  if (!reports[this.name]) {
    reports[this.name] = {};
  }
};

Metrics.prototype.report = function (metric, value) {
  if (!this.definition[metric]) {
    return Promise.reject({
      errcode: "UNDEFINED",
      message: "Unknown metric: " + metric
    });
  }

  if (this.definition[metric].type === "logarithmic") {
    reports[this.name][metric] = value;
  }

  if (this.definition[metric].type === "string") {
    reports[this.name][metric] = value;
  }

  return Promise.resolve();
};

Metrics.prototype.retrieve = function () {
  var output = {};

  for (var report in reports) {
    var keys = Object.keys(reports[report]);
    for (var key in this.definition) {
      if (this.definition[key].type === "logarithmic") {
        // for metric 'success', base 2, this would encode the keys:
        // success1, success2, success4, success8, success16.
        var mag = this.definition[key].base,
            rounded = Math.pow(mag,
              Math.floor(Math.log(reports[report][key])/Math.log(mag)));
        output[key] = this.rappors[key].encode(reports[report][key] + rounded);
      } else if (this.definition[key].type === "string") {
        output[key] = this.rappors[key].encode(reports[report][key]);
      }
    }
  }

  return Promise.resolve(output);
};

Metrics.prototype.retrieveUnsafe = function () {
  var output = {};

  for (var report in reports) {
    var keys = Object.keys(reports[report]);
    for (var key in this.definition) {
      output[key] = reports[report][key];
    }
  }

  return Promise.resolve(output);
};

if (typeof freedom !== 'undefined') {
  freedom().providePromises(Metrics);
} else {
  exports.provider = Metrics;
  exports.api = "metrics";
}
