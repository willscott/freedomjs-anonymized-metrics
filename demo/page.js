function start(MetricsClient) {
  var metrics = new MetricsClient({
    name: 'metrics-demo',
    definition: {
      'height': {
        type: 'logarithmic',
        base: 2,

        num_bloombits: 8,
        num_hashes: 2,
        num_cohorts: 64,
        prob_p: 0.5,
        prob_q: 0.75,
        prob_f: 0.5,
        flag_oneprr: true
      }
    }
  });
  window.metrics = metrics;

  document.getElementById('height').addEventListener('change', function (ev) {
    document.getElementById('height-value').innerText = ev.target.value;
  });
  document.getElementById('report').addEventListener('click', function () {
    var val = document.getElementById('height').value;
    metrics.report('height', Number(val)).then(function () {
      console.log('reported.');
    }, function (err) {
      console.err('error reporting', err);
    });
  });
  document.getElementById('retrieve').addEventListener('click', function () {
    metrics.retrieve().then(function (report) {
      document.getElementById('log').style.color = 'black';
      document.getElementById('log').innerText = JSON.stringify(report);
    }, function (err) {
      document.getElementById('log').style.color = 'red';
      document.getElementById('log').innerText = err.message;
    })
  });
}

window.onload = function () {
  freedom('../anonmetrics.json').then(start);
};
