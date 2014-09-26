var _ = require('lodash');

function resolve(value, previouslyResolved) {
  if (!_.isString(value) || value.indexOf(':') < -1) {
    return value;
  }

  var split = value.split(':');
  var property = split[2] || 'id';

  var resolvedDep = (previouslyResolved[split[0]] && previouslyResolved[split[0]][split[1]]);

  return (resolvedDep && resolvedDep[property]) || value;
}

module.exports = function resolveDependencies(previouslyResolved, toBeResolved) {
  return toBeResolved.map(function(config) {
    for (var property in config) {
      if(config.hasOwnProperty(property)) {
        var value = config[property];
        // createdById: "user:0" -> createdById: 1
        config[property] = resolve(value, previouslyResolved);
      }
    }
    return config;
  });
};
