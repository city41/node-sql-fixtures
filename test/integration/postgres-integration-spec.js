var specs = require('./integration-specs');

describe("postgres intregation tests", function() {
  specs({
    client: 'pg',
    connection: {
      host: process.env.DOCKER_HOST || 'pg',
      user: 'testdb',
      password: 'password',
      database: 'testdb',
      port: process.env.DOCKER_PORT || 5432
    }
  });
});
