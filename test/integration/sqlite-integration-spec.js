var specs = require('./integration-specs');

describe("sqlite intregation tests", function() {
  specs({
    client: 'sqlite3',
    connection: {
      filename: './sqlite-integration-spec.db'
    }
  });
});
