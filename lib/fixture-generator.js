var _ = require('lodash');
var knex = require('knex');
var bluebird = require('bluebird');

var util = require('./util');
var generateSpecIds = require('./generate-spec-ids');
var prioritize = require('./prioritize');
var buildPromises = require('./build-promises');
var resolveDependencies = require('./resolve-dependencies');
var unescape = require('./unescape');

function addToFinalResult(finalResult, levelResults, originalConfig) {
  levelResults.forEach(function(levelResult) {
    _.forIn(levelResult, function(records, table, levelResult) {
      finalResult[table] = finalResult[table] || [];
      _.each(records, function(record) {
        var index = _.findIndex(util.asArray(originalConfig[table]), { specId: record.specId });
        finalResult[table][index] = record;
      });
    });
  });

  return finalResult;
}

function fail(error, callback) {
  return bluebird.reject(error).nodeify(callback);
}

function stripSpecIds(result) {
  _.forIn(result, function(records, table) {
    _.each(records, function(record) {
      delete record.specId;
    });
  });
  return result;
}

function FixtureGenerator(connectionConfig) {
  this.knex = knex(connectionConfig);
}

FixtureGenerator.prototype.create = function createRecords(dataConfig, callback) {
  dataConfig = _.cloneDeep(dataConfig);
  var withSpecIds = generateSpecIds(dataConfig);
  var prioritized = prioritize(withSpecIds);

  if (prioritized instanceof Error) {
    return fail(prioritized, callback);
  }

  var knex = this.knex;

  if (!knex) {
    return fail(new Error('No connection available.'), callback);
  }

  this._tablesToCleanup = _.without(_.keys(dataConfig), 'sql');

  return bluebird.reduce(prioritized, function(buildingFinalResult, priorityLevel) {
    priorityLevel = resolveDependencies(buildingFinalResult, priorityLevel);
    priorityLevel = unescape(priorityLevel);
    var priorityLevelPromises = buildPromises(knex, priorityLevel);
    return bluebird.all(priorityLevelPromises).then(function(levelResults) {
      return addToFinalResult(buildingFinalResult, levelResults, withSpecIds);
    });
  }, {}).then(function(finalResult) {
    finalResult = stripSpecIds(finalResult);
    if (callback) {
      callback(undefined, finalResult);
    }
    return finalResult;
  });
};

FixtureGenerator.prototype.disconnect = function disconnect(callback) {
  var knex = this.knex;

  if (!knex) {
    return bluebird.resolve().nodeify(callback);
  }

  return knex.destroy().nodeify(callback);
};

FixtureGenerator.prototype.destroy = function destroy(callback) {
  var knex = this.knex;

  if (!knex) {
    return bluebird.resolve().nodeify(callback);
  }

  if (!this._tablesToCleanup || !this._tablesToCleanup.length) {
    return this.disconnect(callback);
  }

  var tablesToCleanup = _.map(this._tablesToCleanup, function(table) {
    return '"' + table + '"';
  });

  return knex.raw('TRUNCATE ' + tablesToCleanup.join(', ') + ' RESTART IDENTITY CASCADE')
    .bind(this)
    .finally(this.disconnect)
    .nodeify(callback);
};

var singleton;

FixtureGenerator.create = function staticCreateRecords(connectionConfig, dataConfig, callback) {
  if (!singleton) {
    singleton = new FixtureGenerator(connectionConfig);
  }

  return singleton.create(dataConfig, callback);
};

FixtureGenerator.disconnect = function staticDisconnect(callback) {
  if (!singleton) {
    return bluebird.resolve().nodeify(callback);
  }

  // TODO: look into using bluebird's disposer pattern
  return singleton.disconnect().nodeify(callback).finally(function(){
    singleton = null;
  });
};

FixtureGenerator.destroy = function staticDestroy(callback) {
  if (!singleton) {
    return bluebird.resolve().nodeify(callback);
  }

  // TODO: look into using bluebird's disposer pattern
  return singleton.destroy().nodeify(callback).finally(function(){
    singleton = null;
  });
};

module.exports = FixtureGenerator;
