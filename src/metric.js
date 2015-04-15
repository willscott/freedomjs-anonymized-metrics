/*jslint node:true, sloppy:true */
/*globals freedom,Promise */

var rappor = require('rappor');
var util = require('freedom/src/util');
var storage = freedom['core.storage']();

var reports;

var Metrics = function (dispatchEvent, definition) {
  this.definition = definition.definition;
  this.name = definition.name;

  storage.get('metrics-id').then(function (id) {
    if (!id) {
      id = util.getId();
      storage.set('metrics-id', id);
    }
    this.rappor = new rappor.Encoder(id);
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
  var words = [];

  for (var report in reports) {
    var keys = Object.keys(reports[report]);
    for (var key in this.definition) {
      if (this.definition[key].type === "logarithmic") {
        var m = 0, mag = this.definition[key].base;
        while (reports[report][key] > 0) {
          words.push(key + m);
          m += 1;
          reports[report][key] = Math.floor(reports[report][key]/mag);
        }
      } else if (this.definition[key].type === "string") {
        words.push(key + reports[report][key]);
      }
    }
  }

  var output = this.rappor.encodeMultiple(words);
  return Promise.resolve(output.toString());
};

Metrics.prototype.retrieveUnsafe = function () {
  return Promise.resolve(reports);
};

if (typeof freedom !== 'undefined') {
  freedom().providePromises(Metrics);
} else {
  exports.provider = Metrics;
  exports.api = "metrics";
}
