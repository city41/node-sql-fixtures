/*
 * Calls into knex to actually insert the records into the database
 * and returns an array of promises that knex generated
 *
 * Also massages the result of knex's insert into entire hydrated records.
 *
 * Database differences
 * ====================
 * The insertion happens differently for postgres versus all the other supported
 * databases. The return result of an insert in Postgres can be the actual records
 * that were inserted. sql-fixtures takes advantage of that in order to return to
 * the user their data. For MySQL et al, this is not true. The best you get is
 * the id (primary key) of the last record that got inserted.
 *
 * So for non-postgres dbs, the insertions happen serially, and after each insert
 * a select is done to grab the inserted record.
 *
 * This also means for non-postgres, if a table lacks a primary key, then it can
 * lead into undefined behavior. Also see
 * http://city41.github.io/node-sql-fixtures/#no-primary-key-warning
 */
var _ = require('lodash');
var bluebird = require('bluebird');

var isPostgres = require('./is-postgres');

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

function getNoPrimaryKeyWarning(tableName) {
  return "WARNING, sql-fixtures: it looks like " + tableName +
    " does not have a singular primary key column." +
    " This means sql-fixtures needs to make a guess to return this record." +
    " You may get unexpected results. See:" +
    " http://city41.github.io/node-sql-fixtures/#no-primary-key-warning";
}

function insertRecordsSerially(knex, tableName, insertRecords, showWarning) {
  var insertedRecords = [];

  function insertRecordAt(index) {
    if (index < insertRecords.length) {
      return knex(tableName).insert(insertRecords[index]).then(function(insertResult) {
        var selectPromise = knex(tableName).where(insertRecords[index]).limit(1);

        if (insertResult && insertResult[0]) {
          selectPromise = selectPromise.orderBy('id', 'DESC');
        } else if (typeof showWarning === 'undefined' || showWarning === true) {
          console.warn(getNoPrimaryKeyWarning(tableName));
        }

        return selectPromise.then(function(retrievedRecordResult) {
          insertedRecords[index] = retrievedRecordResult[0];
          return insertRecordAt(index + 1);
        });
      });
    } else {
      return bluebird.resolve(insertedRecords);
    }
  }

  return insertRecordAt(0);
}

function buildInsertPromise(knex, tableName, records, unique, showWarning) {
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

  return getInsertableRecords(knex, tableName, insertRecords, unique).then(function(insertableRecords) {
    insertRecords = insertableRecords;

    if (insertRecords.length === 0) {
      return assembleFinalResult(insertRecords);
    }

    if (isPostgres(knex)) {
      return knex(tableName).returning('*').insert(insertRecords).then(function(insertResults) {
        return assembleFinalResult(insertResults);
      });
    } else {
      return insertRecordsSerially(knex, tableName, insertRecords, showWarning).then(function(insertResults) {
        return assembleFinalResult(insertResults);
      });
    }
  });
}

module.exports = function insertRecords(knex, configs, unique, showWarning) {
  var promises = [];

  _.forIn(configs, function(records, table) {
    if (table === 'sql') {
      var sqlPromises = buildRawSqlPromises(knex, records);
      promises = promises.concat(sqlPromises);
    } else {
      var insertPromise = buildInsertPromise(knex, table, records, unique, showWarning);
      promises.push(insertPromise);
    }
  });

  return promises;
};
