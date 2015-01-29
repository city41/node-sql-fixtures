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

function getInsertableRecords(knex, tableName, candidateRecords, unique) {
  if (unique) {
    var checkIfEquivalentRecordExistsPromises = _.map(candidateRecords, function(candidateRecord) {
      return knex(tableName).where(candidateRecord).then(function(result) {
        if (result.length === 0) {
          return candidateRecord;
        }
      });
    });

    return bluebird.all(checkIfEquivalentRecordExistsPromises).then(function(results) {
      return _.compact(results);
    });

  } else {
    return bluebird.resolve(candidateRecords);
  }
}

function getAllKeys(records) {
  var keys = _.reduce(records, function(keysResult, record) {
    keysResult = keysResult.concat(_.keys(record));
    return keysResult;
  }, []);
  return _.compact(_.uniq(keys));
}

function buildInsertPromise(knex, tableName, records, unique) {
  var insertRecords = _.map(records, function(record) {
    return _.transform(record, removeExtraKeys);
  });

  if (unique) {
    insertRecords = _.uniq(insertRecords, getAllKeys(insertRecords));
  }

  function assembleFinalResult(insertedRecords) {
    var finalResult = {};

    finalResult[tableName] = _.map(insertedRecords, function(insertedRecord, i) {
      // only attach keys that were passed with the data
      var recordResult = _.pick(insertedRecord, _.union(_.keys(records[i]), ['id']));
      return _.extend(records[i], recordResult);
    });

    return finalResult;
  }

  function getRecordAt(index, newRecords, insertResults) {
    if (index < insertRecords.length) {
      var knexPromise = knex(tableName).where(insertRecords[index]).limit(1);

      if (!isNaN(insertResults[index]) && insertResults[index] !== 0) {
        knexPromise = knexPromise.orderBy('id', 'DESC');
      }

      return knexPromise.then(function(retrievedRecordResult) {
        newRecords[index] = retrievedRecordResult[0];
        return getRecordAt(index + 1, newRecords, insertResults);
      });
    } else {
      return bluebird.resolve();
    }
  }

  return getInsertableRecords(knex, tableName, insertRecords, unique).then(function(insertableRecords) {
    insertRecords = insertableRecords;

    if (insertRecords.length === 0) {
      return assembleFinalResult(insertRecords);
    }

    return knex(tableName).returning('*').insert(insertRecords).then(function(insertResults) {
      if (_.isObject(insertResults[0])) {
        // postgres directly returns the inserted records
        return assembleFinalResult(insertResults);
      } else {
        // mysql and sqlite do not, need to query for them serially
        var insertedRecords = [];
        return getRecordAt(0, insertedRecords, insertResults).then(function() {
          return assembleFinalResult(insertedRecords);
        });
      }
    });
  });
}

module.exports = function insertRecords(knex, configs, unique) {
  var promises = [];

  _.forIn(configs, function(records, table) {
    if (table === 'sql') {
      var sqlPromises = buildRawSqlPromises(knex, records);
      promises = promises.concat(sqlPromises);
    } else {
      var insertPromise = buildInsertPromise(knex, table, records, unique);
      promises.push(insertPromise);
    }
  });

  return promises;
};
