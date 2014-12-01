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

function buildInsertPromise(knex, tableName, records) {
  var insertRecords = _.map(records, function(record) {
    return _.transform(record, removeExtraKeys);
  });

  function assembleFinalResult(insertedRecords) {
    var finalResult = {};

    finalResult[tableName] = _.map(insertedRecords, function(insertedRecord, i) {
      // only attach keys that were passed with the data
      var recordResult = _.pick(insertedRecord, _.union(_.keys(records[i]), ['id']));
      return _.extend(records[i], recordResult);
    });

    return finalResult;
  }

  function getRecordAt(index, insertResults) {
    if (index < insertRecords.length) {
      return knex(tableName).where(insertRecords[index]).then(function(retrievedRecordResult) {
        insertResults[index] = retrievedRecordResult[0];
        return getRecordAt(index + 1, insertResults);
      });
    } else {
      return bluebird.resolve();
    }
  }

  return knex(tableName).insert(insertRecords, '*').then(function(insertResults) {
    if (_.isObject(insertResults[0])) {
      // postgres directly returns the inserted records
      return assembleFinalResult(insertResults);
    } else {
      // mysql and sqlite do not, need to query for them serially
      return getRecordAt(0, insertResults).then(function() {
        return assembleFinalResult(insertResults);
      });
    }
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
