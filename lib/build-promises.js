/*
 * Calls into knex to actually insert the records into the database
 * and returns an array of promises that knex generated
 *
 * Also massages the result of knex's insert into entire hydrated records
 */
var _ = require('lodash');
var bluebird = require('bluebird');

function removeExtraKeys(trimmedRecord, value, key) {
  if (key !== 'specId' && value !== null && typeof value !== 'undefined') {
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

function buildInsertPromise(knex, tableName, record) {
  var insertRecord = _.transform(record, removeExtraKeys);

  return knex(tableName).insert(insertRecord, '*').then(function(insertResult) {
    return knex(tableName).where(insertRecord).then(function(hydrateResult) {
      var result = _.pick(hydrateResult[0], _.union(_.keys(record), ['id']));
      return _.extend(record, result);
    });
  });
}

function buildInsertPromises(knex, tableName, records) {
  var finalResult = {};
  finalResult[tableName] = [];

  var insertPromises = _.map(records, function(record, index) {
    return buildInsertPromise(knex, tableName, record).then(function(insertResult) {
      finalResult[tableName][index] = insertResult;
    });
  });

  return bluebird.all(insertPromises).then(function() {
    return finalResult;
  });
}

module.exports = function buildPromises(knex, configs) {
  var promises = [];

  _.forIn(configs, function(records, table) {
    if (table === 'sql') {
      var sqlPromises = buildRawSqlPromises(knex, records);
      promises = promises.concat(sqlPromises);
    } else {
      var insertPromise = buildInsertPromises(knex, table, records);
      promises.push(insertPromise);
    }
  });

  return promises;
};
