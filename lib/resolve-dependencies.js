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
  toBeResolved = _.clone(toBeResolved);

  for (var table in toBeResolved) {
    if (toBeResolved.hasOwnProperty(table)) {
      var entries = toBeResolved[table];

      toBeResolved[table] = entries.map(function(entry) {
        for (var property in entry) {
          if(entry.hasOwnProperty(property)) {
            var value = entry[property];
            // createdById: "user:0" -> createdById: 1
            entry[property] = resolve(value, previouslyResolved);
          }
        }
        return entry;
      });
    }
  }

  return toBeResolved;
};
