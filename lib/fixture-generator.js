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
        Array.prototype.push.apply(finalResult[table], levelResult[table]);
      }
    }
  });

  return finalResult;
}

function FixtureGenerator() {};

FixtureGenerator.prototype.create = function createRecords(connectionConfig, dataConfig) {
  var knex = this.knex = (this.knex || require('knex')(connectionConfig));

  var prioritized = prioritize(dataConfig);

  return Promise.reduce(prioritized, function(buildingFinalResult, priorityLevel) {
    priorityLevel = resolveDependencies(buildingFinalResult, priorityLevel);
    var priorityLevelPromises = buildPromises(knex, priorityLevel);
    return Promise.all(priorityLevelPromises).then(function(levelResults) {
      return addToFinalResult(buildingFinalResult, levelResults);
    });
  }, {});
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
