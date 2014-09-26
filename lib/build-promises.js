/*
 * Calls into knex to actually insert the records into the database
 * and returns an array of promises that knex generated
 *
 * Also massages the result of knex's insert into entire hydrated records
 */
var _ = require('lodash');

module.exports = function buildPromises(knex, configs) {
  var promises = [];

  for (var table in configs) {
    if (configs.hasOwnProperty(table)) {
      var records = configs[table];

      var promise = knex(table).insert(records, 'id').then(function(results) {
        var result = {};
        result[table] = records.map(function(record, i) {
          record.id = results[i];
          return record;
        });
        return result;
      });

      promises.push(promise);
    }
  }

  return promises;
};
