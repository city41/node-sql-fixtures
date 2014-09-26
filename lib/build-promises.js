var _ = require('lodash');

module.exports = function buildPromises(knex, configs) {
  var grouped = _.groupBy(configs, '__type__');

  var promises = [];

  for (var type in grouped) {
    if (grouped.hasOwnProperty(type)) {
      var records = grouped[type];
      records = records.map(function(r) { return _.omit(r, '__type__')});
      var promise = knex(type).insert(records, 'id').then(function(results) {
        var result = {};
        result[type] = records.map(function(record, i) {
          record.id = results[i];
          return record;
        });
        return result;
      })

      promises.push(promise);
    }
  }

  return promises;
};
