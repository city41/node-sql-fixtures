var _ = require("lodash");
var knex = require("knex");
var bluebird = require("bluebird");

var util = require("./util");
var executeFkQueries = require("./execute-fk-queries");
var generateSpecIds = require("./generate-spec-ids");
var prioritize = require("./prioritize");
var insertRecords = require("./insert-records");
var resolveDependencies = require("./resolve-dependencies");
var unescape = require("./unescape");

function addToFinalResult(finalResult, levelResults, originalConfig) {
  levelResults.forEach(function (levelResult) {
    _.forIn(levelResult, function (records, table, levelResult) {
      finalResult[table] = finalResult[table] || [];
      _.each(records, function (record) {
        var index = _.findIndex(util.asArray(originalConfig[table]), {
          specId: record.specId,
        });
        finalResult[table][index] = record;
      });
    });
  });

  return finalResult;
}

function fail(error, callback) {
  return bluebird.reject(error).nodeify(callback);
}

function stripSpecIds(result) {
  _.forIn(result, function (records, table) {
    _.each(records, function (record) {
      delete record.specId;
    });
  });
  return result;
}

function clone(object) {
  return _.mapValues(object, function (value) {
    if (_.isArray(value)) {
      return _.map(value, _.clone);
    }

    return _.clone(value);
  });
}

function isKnexInstance(obj) {
  return (
    obj &&
    _.isFunction(obj.where) &&
    _.isFunction(obj.andWhere) &&
    _.isFunction(obj.insert)
  );
}

function isAllTablesEmpty(dataConfig) {
  return _.every(Object.keys(dataConfig), function (key) {
    return dataConfig[key].length === 0;
  });
}

function FixtureGenerator(knexInstanceOrConnectionConfig) {
  if (isKnexInstance(knexInstanceOrConnectionConfig)) {
    this.knex = knexInstanceOrConnectionConfig;
  } else {
    this._connectionConfig = knexInstanceOrConnectionConfig;
    this.knex = knex(knexInstanceOrConnectionConfig);
  }
}

FixtureGenerator.prototype.create = function resolveQueriesAndCreateRecords(
  dataConfig,
  options,
  callback
) {
  dataConfig = clone(dataConfig);

  if (_.isFunction(options)) {
    callback = options;
  }
  options = options || {};

  if (isAllTablesEmpty(dataConfig)) {
    // user is asking us to insert no rows. Which is a strange, but valid, request.
    // Rather than talk to the db at all, we can immediately return in this scenario.
    return bluebird.resolve(dataConfig).nodeify(callback);
  }

  var withSpecIds = generateSpecIds(dataConfig);
  var prioritized = prioritize(withSpecIds);

  if (prioritized instanceof Error) {
    return fail(prioritized, callback);
  }

  var knexInst = (this.knex = this.knex || knex(this._connectionConfig));
  var fkQueries = executeFkQueries(dataConfig, knexInst);

  var mainPromise = bluebird.all(fkQueries).then(function createRecords() {
    return bluebird
      .reduce(
        prioritized,
        function (buildingFinalResult, priorityLevel) {
          priorityLevel = resolveDependencies(
            buildingFinalResult,
            priorityLevel
          );
          priorityLevel = unescape(priorityLevel);
          var priorityLevelPromises = insertRecords(
            knexInst,
            priorityLevel,
            options.unique,
            options.showWarning
          );
          return bluebird
            .all(priorityLevelPromises)
            .then(function (levelResults) {
              return addToFinalResult(
                buildingFinalResult,
                levelResults,
                withSpecIds
              );
            });
        },
        {}
      )
      .then(function (finalResult) {
        return stripSpecIds(finalResult);
      });
  });

  return mainPromise.nodeify(callback);
};

FixtureGenerator.prototype.destroy = function destroy(callback) {
  if (this.knex) {
    return bluebird
      .resolve()
      .bind(this)
      .then(function () {
        return this.knex.destroy();
      })
      .tap(function () {
        this.knex = null;
      })
      .nodeify(callback);
  } else {
    return bluebird.resolve().nodeify(callback);
  }
};

var singleton;

FixtureGenerator.create = function staticCreateRecords(
  connectionConfig,
  dataConfig,
  options,
  callback
) {
  if (!singleton) {
    singleton = new FixtureGenerator(connectionConfig);
  }

  return singleton.create(dataConfig, options, callback);
};

FixtureGenerator.destroy = function staticDestroy(callback) {
  if (!singleton) {
    return bluebird.resolve().nodeify(callback);
  }

  // TODO: look into using bluebird's disposer pattern
  return bluebird
    .resolve()
    .then(function () {
      return singleton.destroy();
    })
    .nodeify(callback)
    .finally(function () {
      singleton = null;
    });
};

FixtureGenerator.disconnect = FixtureGenerator.destroy;

module.exports = FixtureGenerator;
