/*
 * A helper function to determine if a knex client is connected to a sqlite database
 */

var _ = require("lodash");

module.exports = function isPostgres(knex) {
  if (!knex.client) {
    return false;
  }

  return _.includes(knex.client.dialect, "sqlite");
};
