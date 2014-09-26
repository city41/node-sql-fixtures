var _ = require('lodash');
var knex = require('knex');

module.exports = function buildPromises(configs) {
  var grouped = _.groupBy(configs, '__type__');

  var promises = [];

  for (var type in grouped) {
    if (grouped.hasOwnProperty(type)) {
      var records = grouped[type];
      var promise = knex(type).insert(records);

      promises.push(promise);
    }
  }

  return promises;
};
