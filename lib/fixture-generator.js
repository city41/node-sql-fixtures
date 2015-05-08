var _ = require('lodash');
var knex = require('knex');
var bluebird = require('bluebird');

var util = require('./util');
var generateSpecIds = require('./generate-spec-ids');
var prioritize = require('./prioritize');
var insertRecords = require('./insert-records');
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

function clone(object) {
  return _.mapValues(object, function(value) {
    if (_.isArray(value)) {
      return _.map(value, _.clone);
    }

    return _.clone(value);
  });
}

function FixtureGenerator(connectionConfig) {
  this._connectionConfig = connectionConfig;
  this.knex = knex(connectionConfig);
}

FixtureGenerator.prototype.create = function createRecords(dataConfig, options, callback) {
  if (_.isFunction(options)) {
    callback = options;
  }

  options = options || {};

  dataConfig = clone(dataConfig);
  var withSpecIds = generateSpecIds(dataConfig);
  var prioritized = prioritize(withSpecIds);

  if (prioritized instanceof Error) {
    return fail(prioritized, callback);
  }

  var knexInst = this.knex = (this.knex || knex(this._connectionConfig));

  return bluebird.reduce(prioritized, function(buildingFinalResult, priorityLevel) {
    priorityLevel = resolveDependencies(buildingFinalResult, priorityLevel);
    priorityLevel = unescape(priorityLevel);
    var priorityLevelPromises = insertRecords(knexInst, priorityLevel, options.unique, options.showWarning);
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

FixtureGenerator.prototype.destroy = function destroy(callback) {
  if (this.knex) {
    return this.knex.destroy()
      .bind(this)
      .tap(function(){ this.knex = null; })
      .nodeify(callback);
  } else {
    return bluebird.resolve().nodeify(callback);
  }
};

FixtureGenerator.prototype.truncate = function truncate(tableNames) {
  tableNames = util.asArray(tableNames);
  var 
    knex = this.knex,
    array = [];
  _.forEach(tableNames, function(name) {
    array.push(knex(name).truncate());
  });
  return bluebird.all(array);
}

var singleton;

FixtureGenerator.create = function staticCreateRecords(connectionConfig, dataConfig, options, callback) {
  if (!singleton) {
    singleton = new FixtureGenerator(connectionConfig);
  }

  return singleton.create(dataConfig, options, callback);
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

FixtureGenerator.disconnect = FixtureGenerator.destroy;

module.exports = FixtureGenerator;
