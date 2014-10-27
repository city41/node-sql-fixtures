var specs = require('./integration-specs');

describe("postgres intregation tests", function() {
  specs({
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'testdb',
      password: 'password',
      database: 'testdb',
      port: 15432
    }
  });
});
