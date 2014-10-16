var _ = require('lodash');
var bluebird = require('bluebird');

var generateSpecIds = require('./generate-spec-ids');
var prioritize = require('./prioritize');
var buildPromises = require('./build-promises');
var resolveDependencies = require('./resolve-dependencies');
var unescape = require('./unescape');

function addToFinalResult(finalResult, levelResults) {
  levelResults.forEach(function(levelResult) {
    _.forIn(levelResult, function(records, table, levelResult) {
      finalResult[table] = finalResult[table] || [];
      finalResult[table] = finalResult[table].concat(records);
    });
  });

  return finalResult;
}

function fail(error, callback) {
  if (callback) {
    callback(error);
  }
  return bluebird.reject(error);
}

function FixtureGenerator() {}

FixtureGenerator.prototype.create = function createRecords(connectionConfig, dataConfig, callback) {
  dataConfig = _.cloneDeep(dataConfig);
  var withSpecIds = generateSpecIds(dataConfig);
  var prioritized = prioritize(withSpecIds);

  if (prioritized instanceof Error) {
    return fail(prioritized, callback);
  }

  var knex = this.knex = (this.knex || require('knex')(connectionConfig));

  return bluebird.reduce(prioritized, function(buildingFinalResult, priorityLevel) {
    priorityLevel = resolveDependencies(buildingFinalResult, priorityLevel);
    priorityLevel = unescape(priorityLevel);
    var priorityLevelPromises = buildPromises(knex, priorityLevel);
    return bluebird.all(priorityLevelPromises).then(function(levelResults) {
      return addToFinalResult(buildingFinalResult, levelResults);
    });
  }, {}).then(function(finalResult) {
    if (callback) {
      callback(undefined, finalResult);
    }
    return finalResult;
  });
};

FixtureGenerator.prototype.disconnect = function(callback) {
  if (this.knex) {
    return this.knex.destroy(callback);
  } else {
    if (callback) {
      callback();
    }
    return bluebird.resolve();
  }
};

module.exports = new FixtureGenerator();
