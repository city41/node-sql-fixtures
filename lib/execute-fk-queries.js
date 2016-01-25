var _ = require('lodash');
var bluebird = require('bluebird');
var util = require('./util');

module.exports = function resolveQueryObjects(config, knexInst) {
  var pendingQueries = [];

  _.forIn(config, function(entries, table) {
    entries = config[table] = util.asArray(entries);

    entries.forEach(function(entry, index) {
      _.forIn(entry, function(colValue, colName, record) {
        if (isQueryObject(colValue)) {
          var constraints = colValue;
          pendingQueries.push(
            knexInst(constraints.from)
              .where(constraints.where)
              .then(function(result) {
                if (result.length > 1) {
                  var where = JSON.stringify(constraints);
                  throw new Error(where + ' matches >1 possible FK!');
                } else {
                  record[colName] = result[0].id;
                }
              })
          );
        }
      });
    });
  });
  return pendingQueries;
};

function isQueryObject(value) {
  return _(value).has('from', 'where')
}
