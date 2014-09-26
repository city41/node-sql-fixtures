/*
 * resolve-dependencies
 * ====================
 * Given an array of fixture specs and the already resolved fixtures
 * from previous runs, resolves the current specs if it can.
 *
 * So if a current spec has "userId: 'Users:0'", and the available prereqs
 * contains a User, then userId will get resolved to the actual id
 */

var _ = require('lodash');

function resolve(value, availablePreReqs) {
  if (!_.isString(value) || value.indexOf(':') < -1) {
    return value;
  }

  if (value.indexOf('{') > -1 && value.indexOf('}') > -1) {
    value = value.replace(/{([^}]+)}/g, function(match, value) {
      return resolve(value, availablePreReqs);
    });
  }

  var split = value.split(':');
  var property = split[2] || 'id';

  var resolvedDep = (availablePreReqs[split[0]] && availablePreReqs[split[0]][split[1]]);

  return (resolvedDep && resolvedDep[property]) || value;
}

module.exports = function resolveDependencies(availablePreReqs, toBeResolved) {
  toBeResolved = _.clone(toBeResolved);

  for (var table in toBeResolved) {
    if (toBeResolved.hasOwnProperty(table)) {
      var entries = toBeResolved[table];

      toBeResolved[table] = entries.map(function(entry) {
        if(_.isString(entry)) {
          return resolve(entry, availablePreReqs);
        }
        else if(_.isObject(entry)) {
          for (var property in entry) {
            if(entry.hasOwnProperty(property)) {
              var value = entry[property];
              // createdById: "user:0" -> createdById: 1
              entry[property] = resolve(value, availablePreReqs);
            }
          }
          return entry;
        }
      });
    }
  }

  return toBeResolved;
};
