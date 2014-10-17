var _ = require('lodash');

function unescape(record) {
  _.forIn(record, function(value, key, record) {
    if (_.isString(value)) {
      record[key] = value.replace(/::/g, ':');
    }
  });

  return record;
}

module.exports = function(toBeUnescaped) {
  toBeUnescaped = _.clone(toBeUnescaped);

  _.forIn(toBeUnescaped, function(records, table, toBeUnescaped) {
    toBeUnescaped[table] = records.map(unescape);
  });

  return toBeUnescaped;
};
