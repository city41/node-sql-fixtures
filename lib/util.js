var _ = require("lodash");

module.exports = {
  asArray: function asArray(a) {
    if (_.isArray(a)) {
      return a;
    }
    return _.compact([a]);
  }
};
