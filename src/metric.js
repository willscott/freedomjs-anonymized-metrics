/*jslint node:true, sloppy:true */
/*globals freedom,Promise */

var rappor = require('rappor');
var util = require('freedom/src/util');
var storage = freedom['core.storage']();

var reports;
var events = {};
util.handleEvents(events);

// Initial data load;
storage.get('metrics-data', function (data) {
  reports = JSON.parse(data);
  events.emit('ready');
});

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

  var init = function () {
    if (!reports[this.name]) {
      reports[this.name] = {};
    }
  }
  if (reports) {
    init();
  } else {
    events.once('ready', init);
  }
};

Metrics.prototype.report = function (metric, value) {
  if (this.definition[metric].type === "count") {
    if (reports[this.name][metric]) {
      reports[this.name][metric] = 0;
    }
    reports[this.name][metric] += 1;
  }

  storage.set('metrics-data', JSON.stringify(reports));
  return Promise.resolve();
};

Metrics.prototype.retrieve = function () {
  var words = [];

  var keys = Object.keys(reports[this.name]);
  for (var key in this.definition) {
    if (this.definition[key].type === "count") {
      var m = 0, mag = this.definition[key].magnitude;
      while (reports[this.name][key] > 0) {
        words.push(key + m);
        m += 1;
        reports[this.name][key] = Math.floor(reports[this.name][key]/mag);
      }
    }
  }

  var output = this.rappor.encode(words);
  return Promise.resolve(output.toString());
};

Metrics.prototype.counters = function () {
  return Promise.resolve(reports[this.name]);
};

if (typeof freedom !== 'undefined') {
  freedom().providePromises(Metrics);
} else {
  exports.provider = Metrics;
  exports.api = "metrics";
}
