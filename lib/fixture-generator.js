var _ = require('lodash');
var Promise = require('bluebird');

var prioritize = require('./prioritize');
var buildPromises = require('./build-promises');
var resolveDependencies = require('./resolve-dependencies');

function addToFinalResult(finalResult, levelResults) {
  levelResults.forEach(function(levelResult) {
    for (var table in levelResult) {
      if (levelResult.hasOwnProperty(table)) {
        finalResult[table] = finalResult[table] || [];
        finalResult[table] = finalResult[table].concat(levelResult[table]);
      }
    }
  });

  return finalResult;
}

function fail(error, callback) {
  if (callback) {
    callback(error);
  }
  return Promise.reject(error);
}

function FixtureGenerator() {};

FixtureGenerator.prototype.create = function createRecords(connectionConfig, dataConfig, callback) {
  var prioritized = prioritize(dataConfig);

  if (prioritized instanceof Error) {
    return fail(prioritized, callback);
  }

  var knex = this.knex = (this.knex || require('knex')(connectionConfig));

  return Promise.reduce(prioritized, function(buildingFinalResult, priorityLevel) {
    priorityLevel = resolveDependencies(buildingFinalResult, priorityLevel);
    var priorityLevelPromises = buildPromises(knex, priorityLevel);
    return Promise.all(priorityLevelPromises).then(function(levelResults) {
      return addToFinalResult(buildingFinalResult, levelResults);
    });
  }, {}).then(function(finalResult) {
    callback && callback(undefined, finalResult);
    return finalResult;
  });
};

FixtureGenerator.prototype.disconnect = function(callback) {
  if (this.knex) {
    return this.knex.destroy(callback);
  } else {
    callback && callback();
    return Promise.resolve();
  }
};

module.exports = new FixtureGenerator();
