/*
 * Calls into knex to actually insert the records into the database
 * and returns an array of promises that knex generated
 *
 * Also massages the result of knex's insert into entire hydrated records
 */
var _ = require('lodash');

function removeExtraKeys(trimmedRecord, value, key) {
  if (key !== 'specId' && value != null) {
    trimmedRecord[key] = value;
  }
}

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
    return _.transform(record, removeExtraKeys);
  });

  return knex(tableName).insert(insertRecords, '*').then(function(results) {
    var result = {};
    result[tableName] = _.map(records, function(record, i) {
      // only attach keys that were passed with the data
      var result = _.pick(results[i], _.union(_.keys(record), ['id']));
      return _.extend(record, result);
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
