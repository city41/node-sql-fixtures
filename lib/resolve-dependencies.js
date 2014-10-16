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
  if (!_.isString(value) || value.indexOf(':') < -1 || value.indexOf('::') > -1) {
    return value;
  }

  if (value.indexOf('{') > -1 && value.indexOf('}') > -1) {
    return value.replace(/{([^}]+)}/g, function(match, value) {
      return resolve(value, availablePreReqs);
    });
  }

  var split = value.split(':');

  var tableName = split[0];
  var specId = split[1];
  var property = split[2] || 'id';

  var records = availablePreReqs[tableName] || [];
  var resolvedDep = _.find(_.compact(records), { specId: specId });
  return resolvedDep && resolvedDep[property] || value;
}

module.exports = function resolveDependencies(availablePreReqs, toBeResolved) {
  toBeResolved = _.clone(toBeResolved);

  _.forIn(toBeResolved, function(entries, table) {
    toBeResolved[table] = entries.map(function(entry) {
      if(_.isString(entry)) {
        return resolve(entry, availablePreReqs);
      }
      else if(_.isObject(entry)) {
        _.forIn(entry, function(value, property, entry) {
          entry[property] = resolve(value, availablePreReqs);
        });

        return entry;
      }
    });
  });

  return toBeResolved;
};
