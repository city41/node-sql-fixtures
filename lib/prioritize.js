    // user:
    //   username: fixtures.genName()
    //   email: fixtures.genEmail()
    //   role: 'member'
    //   password: 'password'
    // challenge: [
    //   name: 'challenge 1'
    //   createdById: 'user:0'
    // ,
    //   name: 'challenge 1'
    //   createdById: 'user:0'
    // ,
    //   name: 'challenge 2'
    //   createdById: 'user:0'
    // ]
    // task: [
    //   challengeId: 'challenge:0'
    //   createdById: 'user:0'
    // ]
    // checkin: [
    //   taskId: 'task:0'
    // ,
    //   taskId: 'task:0'
    // ,
    //   taskId: 'task:0'
    // ,
    //   taskId: 'task:0'
    // ]

    // [[user], [challenge, challenge, challenge], [task], [checkin, checkin, checkin, checkin]]

var _ = require('lodash');

function getNeeds(entries) {
  return entries.reduce(function(reduced, entry) {
    var needs = _.values(entry).filter(function(property) {
      return _.isString(property) && property.indexOf(':') > -1;
    }).map(function(property) {
      return property.split(':');
    });
    Array.prototype.push.apply(reduced, needs);
    return reduced;
  }, []);
}

// apr = {
//   user: 1,
//   challenge: 3
// }
function satisfied(entries, availablePreReqs) {
  var needs = getNeeds(entries);
  // [[task, 0], [task, 0], [user, 0]]

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

module.exports = function prioritize(config) {
  config = _.clone(config);
  var prioritized = [];
  var availablePreReqs = {};

  while (Object.keys(config).length) {
    var levelEntries = {};
    var upcomingPreReqs = {};

    for (var table in config) {
      if (config.hasOwnProperty(table)) {
        var entries = asArray(config[table]);

        if (satisfied(entries, availablePreReqs)) {
          levelEntries[table] = levelEntries[table] || [];
          Array.prototype.push.apply(levelEntries[table], entries);

          upcomingPreReqs[table] = entries.length;
          delete config[table];
        }
      }
    }

    if (_.isEmpty(levelEntries)) {
      return new Error("Non-existant dependency");
    }

    prioritized.push(levelEntries);
    availablePreReqs = _.extend(availablePreReqs, upcomingPreReqs);
  }

  return prioritized;
};
