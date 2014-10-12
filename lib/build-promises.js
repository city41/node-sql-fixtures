/*
 * Calls into knex to actually insert the records into the database
 * and returns an array of promises that knex generated
 *
 * Also massages the result of knex's insert into entire hydrated records
 */
var _ = require('lodash');

function buildRawSqlPromises(knex, sqls) {
  return sqls.map(function(rawSql) {
    var sqlPromise = knex.raw(rawSql).then(function(result) {
      return {};
    });
    return sqlPromise;
  });
}

function buildInsertPromise(knex, tableName, records) {
  var insertRecords = _.map(records, function(record) {
    return _.omit(record, "specId");
  });

  return knex(tableName).insert(insertRecords, 'id').then(function(results) {
    var result = {};
    result[tableName] = records.map(function(record, i) {
      record.id = results[i];
      return record;
    });
    return result;
  });
}

module.exports = function buildPromises(knex, configs) {
  var promises = [];

  _.forIn(configs, function(records, table) {
    if (table === 'sql') {
      var sqlPromises = buildRawSqlPromises(knex, records);
      promises = promises.concat(sqlPromises);
    } else {
      var insertPromise = buildInsertPromise(knex, table, records);
      promises.push(insertPromise);
    }
  });
  
  return promises;
};
