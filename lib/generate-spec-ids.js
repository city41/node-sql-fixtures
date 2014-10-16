/**
 * generate-spec-ids
 * given a config, all records in the config are given a spec id
 * then all index references are updated to use spec ids instead
 *
 * this allows prioritize to be much simpler and stable.
 */

var _ = require('lodash');
var util = require('./util');

var seed = -1;

function generateId() {
  seed += 1;
  return "__genned_specId_" + seed;
}

function assignId(record) {
  record.specId = record.specId || generateId();
}

function assignIds(config) {
  _.forIn(config, function(records, table) {
    _.each(util.asArray(records), assignId);
  });

  return config;
}

function findSpecId(table, index, config) {
  var records = util.asArray(config[table]);
  return records[index].specId;
}

function substituteSpecId(value, config) {
  var split = value.split(":");

  // did we just find <TableName>:<number> ?
  if (config[split[0]] && !isNaN(split[1])) {
    split[1] = findSpecId(split[0], split[1], config);
    value = split.join(":");
  }
  return value;
}

function updateRefsForString(str, config) {
  return str.replace(/{([^}]+)}/g, function(match, value) {
    return "{" + substituteSpecId(value, config) + "}";
  });
}

function updateRefsForRecord(record, config) {
  _.forIn(record, function(value, key, record) {
    if (_.isString(value)) {
      record[key] = substituteSpecId(value, config);
    }
  });

  return config;
}

function updateSql(sql, config) {
  if (_.isString(sql)) {
    return updateRefsForString(sql, config);
  } else {
    return _.map(sql, function(sqlEntry) {
      return updateRefsForString(sqlEntry, config);
    });
  }
}

function updateRefs(config) {
  _.forIn(config, function(records, table) {
    if (table === 'sql') {
      config.sql = updateSql(records, config);
    } else {
      records = util.asArray(records);
      _.each(records, function(record) {
        updateRefsForRecord(record, config);
      });
    }
  });

  return config;
}

module.exports = function(config) {
  var transformFn = _.compose(updateRefs, assignIds);
  return transformFn(_.clone(config));
};
