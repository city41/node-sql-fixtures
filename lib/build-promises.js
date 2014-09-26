var _ = require('lodash');

module.exports = function buildPromises(knex, configs) {
  var promises = [];

  for (var table in configs) {
    if (configs.hasOwnProperty(table)) {
      var records = configs[table];
      records = records.map(function(r) { return _.omit(r, '__type__')});
      var promise = knex(table).insert(records, 'id').then(function(results) {
        var result = {};
        result[table] = records.map(function(record, i) {
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
