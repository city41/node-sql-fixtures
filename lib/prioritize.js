/*
 * prioritize
 * ==========
 *
 * Given a fixture spec, it returns the spec in prioritized order.
 * This allows a fixture spec to contain dependencies inside of it,
 * and is what really gives sql-fixtures its power.
 *
 * Example:
 *
 * fixtureSpec = {
 *   Users: {
 *     username: "bob"
 *   },
 *   Items: {
 *     name: "bob's item",
 *     userId: "Users:0"
 *   }
 * };
 *
 * In the above spec, the item has a foreign key dependency on the user.
 * Since the userId isn't known yet, the spec just says "put the user's id here".
 * Most databases won't allow item to be created unless that foreign key is
 * satisfied. So when actually generating the fixtures, the user needs to get
 * created first. prioritize takes the above and returns:
 *
 * [{
 *   Users: [{
 *     username: "bob"
 *   }]
 * }, {
 *   Items: [{
 *     name: "bob's item",
 *     userId: "Users:0"
 *   }]
 * }]
 *
 * Allowing the user to get created first.
 *
 * Errors
 * ------
 * If a dependency cannot be resolved, then prioritize returns an Error
 */


var _ = require('lodash');

/*
 * Given an entry, digs into it and finds its dependencies.
 * The dependencies are returned as a simple nested array, ie
 *
 * [['Users', '0'], ['Items', '1', 'bar']]
 */
function getNeeds(entry) {
  if(_.isString(entry) && entry.indexOf('{') > -1 && entry.indexOf('}') > -1) {
    var match;
    var needs = [];
    var regex = /{([^}]+)}/g;
    while((match = regex.exec(entry)) !== null) {
      needs.push(match[1].split(':'));
    }
    return needs;
  }

  return _.values(entry).filter(function(property) {
    return _.isString(property) && property.indexOf(':') > -1;
  }).map(function(property) {
    return property.split(':');
  });
}

/*
 * given an entry and a set of prerequisites
 * determines if the entry's dependencies can be satisfied
 * from the prerequisites
 */
function satisfied(entry, availablePreReqs) {
  var needs = getNeeds(entry);

  return _.all(needs, function(need) {
    return availablePreReqs[need[0]] > need[1];
  });
}

function asArray(a) {
  if (!_.isArray(a)) {
    return [a];
  }
  return a;
}

/*
 * Continually walsk over the given fixture spec (config)
 * and pulls out entries as their dependencies get satisfied
 */
module.exports = function prioritize(config) {
  config = _.clone(config);
  var prioritized = [];
  var availablePreReqs = {};

  while (Object.keys(config).length) {
    var levelEntries = {};
    var upcomingPreReqs = {};

    for (var table in config) {
      if (config.hasOwnProperty(table)) {
        var entries = config[table] = asArray(config[table]);

        entries.forEach(function(entry, index) {
          if (satisfied(entry, availablePreReqs)) {
            levelEntries[table] = levelEntries[table] || [];
            levelEntries[table].push(entry);

            upcomingPreReqs[table] = upcomingPreReqs[table] || 0;
            upcomingPreReqs[table] += 1;
          }
        });

        config[table] = _.difference(entries, levelEntries[table]);
        if (_.isEmpty(config[table])) {
          delete config[table];
        }
      }
    }

    // every pass over the spec should resolve at least one set of entries
    // if nothing could be resolved, there are impossible dependencies in the spec
    // TODO: would be nice to tell the user what dependency doesn't exist
    if (_.isEmpty(levelEntries)) {
      return new Error("Non-existant dependency");
    }

    prioritized.push(levelEntries);
    availablePreReqs = _.extend(availablePreReqs, upcomingPreReqs);
  }

  return prioritized;
};
