/*jslint node:true, sloppy:true */
/*globals freedom,Promise */

var reports = {};

var Metrics = function (dispatchEvent, definition) {
  this.name = definition;
  if (!reports[this.name]) {
    reports[this.name] = {};
  }
};

Metrics.prototype.report = function (metric, value) {
  if (!reports[this.name][metric]) {
    reports[this.name][metric] = [];
  }
  reports[this.name][metric].push(value);
  return Promise.resolve();
};

Metrics.prototype.retrieve = function () {
  var keys = Object.keys(reports[this.name]);
  return Promise.resolve("");
};

if (typeof freedom !== 'undefined') {
  freedom().providePromises(Metrics);
} else {
  exports.provider = Metrics;
  exports.api = "metrics";
}
