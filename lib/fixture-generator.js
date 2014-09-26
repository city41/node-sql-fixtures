var Promise = require('bluebird');

var prioritize = require('./prioritize');
var buildPromises = require('./build-promises');
var resolveDependencies = require('./resolve-dependencies');


function addToFinalResult(finalResult, levelResult) {
  
}

function createRecords(config) {
  var prioritizedPromises = prioritize(config).map(buildPromises);

  return Promise.reduce(prioritizedPromises, function(finalResult, level) {
    level = resolveDependencies(finalResult, level);
    return Promise.all(level).then(function(levelResults) {
      return addToFinalResult(finalResult, levelResults);
    });
  }, {});
}

module.exports = createRecords;
