var _ = require('lodash');
var bluebird = require('bluebird');
var util = require('./util');
var knex;

module.exports = function resolveQueryObjects(config, knexInst) {
  var pendingQueries = [];
  knex = knexInst;

  _.forEach(config, function handleTable(entries) {
    util.asArray(entries).forEach(function (entry) {
      var promises = _.map(entry, resolveSingleValue);
      pendingQueries = pendingQueries.concat(promises);
    });
  });
  return pendingQueries;
};

function resolveSingleValue(colValue, colName, entry) {
  if (isQueryObject(colValue)) {
    return knex(colValue.from)
      .where(colValue.where)
      .then(function(result) {
        if (result.length > 1) {
          var where = JSON.stringify(colValue);
          throw new Error(where + ' matches >1 possible FK!');
        } else {
          entry[colName] = result[0][colValue.column || 'id'];
        }
      });
  }
}

function isQueryObject(value) {
  return _(value).has('from', 'where');
}
