freedom.js Anonymized Metrics
============================

freedom.js module for anonymized metric collection.

## Usage

1. Add ```anonmetrics.json``` as a dependency of your module, using the
```metrics``` API.

2. Establish the metrics you want to monitor, and instantiate anonmetrics
with this definition. The definition format is described in the
[Metrics Definition](#Metrics-Definition) section.
    ```javascript
    var metrics = freedom.anonMetrics({
      "name": "myMetrics",
      "definition": {
        ...
      }
    });
    ```

3. Create metrics instances as needed, using the defined name.
    ```javascript
    var metrics = freedom.anonMetrics("myMetrics");
    ```

4. Report a metric values at appropriate points.
    ```javascript
    metrics.report('sessionStart');
    metrics.report('bandwidth', observedBandwidth);
    ````

5. Extract a report of current metric information for use in a report.
    ```javascript
    metrics.retrieve().then(function(report) {
      ...
    });
    ```

## Metrics Definition

A declarative description of how the anonmetrics module should process
reported data for your application is passed to the constructor once throughout
the modules making up your application. Other instances can report metrics
before this definition is provided, so you don't need to worry about race
conditions, but the definition does need to be provided in the lifetime of the
module or reports will not be saved - since storage will only record statistics
and not raw reported values.

The defintion of metrics follow the following format:

```javascript
"country": {
  "type": "enum",
  "values": ["us","mx","ca","zh","gb","it",...]
},
"bandwidth": {
  "type": "range",
  "min": 0,
  "max": 1000000000
},
"connections": {
  "type": "count",
  "perweek": "10"
}
```

## Development

Pull requests are happily taken. Automated tests are designed to enforce
correctness and code-quality of the repository.