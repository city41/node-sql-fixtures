/*
 * A helper function to determine if a knex client is connected to a postgres database
 */

var _ = require("lodash");

module.exports = function isPostgres(knex) {
  if (!knex.client || !knex.client.connectionSettings) {
    return false;
  }

  if (knex.client.dialect) {
    // dialect is very accurate, prefer it when present
    return _.contains(knex.client.dialect, "pg") || _.contains(knex.client.dialect, "postg");
  }

  // fall back on digging into the connection, which can result in false negatives
  var host = knex.client.connectionSettings.host || knex.client.connectionSettings;
  return _.contains(host, "pg") || _.contains(host, "postg");
};


