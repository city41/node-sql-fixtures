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

  function massageResult(dbResult) {
    var result = _.pick(dbResult[0], _.union(_.keys(record), ['id']));
    return _.extend(record, result);
  }

  return knex(tableName).insert(insertRecord, '*').then(function(insertResult) {
    // postgres will return the inserted object, other DBs won't
    if (_.isObject(insertResult[0])) {
      // postgres
      return massageResult(insertResult);
    } else {
      // sqlite, mysql, etc
      // this can potentially be wrong in some obscure-ish cases, but not
      // much can be done about it.
      return knex(tableName).where(insertRecord).then(massageResult);
    }
  });
}

function buildInsertPromises(knex, tableName, records) {
  var finalResult = {};
  finalResult[tableName] = [];

  // insert the records serially to maintain predictable id ordering
  // this isn't technically required as sql-fixtures never promised this, but
  // having the first record in your spec have a lower id than the next one is nice
  // TODO: this does mean sql-fixtures is slower, so might need to revisit this
  function doNext(index) {
    if (index < records.length) {
      return buildInsertPromise(knex, tableName, records[index]).then(function(insertResult) {
        finalResult[tableName][index] = insertResult;
        return doNext(index+1);
      });
    } else {
      return bluebird.resolve();
    }
  }

  return doNext(0).then(function() {
    return finalResult;
  });

  //
  //
  //
  //
  // var insertPromises = _.map(records, function(record, index) {
  //   return buildInsertPromise(knex, tableName, record).then(function(insertResult) {
  //     finalResult[tableName][index] = insertResult;
  //   });
  // });
  //
  // return bluebird.all(insertPromises).then(function() {
  //   return finalResult;
  // });
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
