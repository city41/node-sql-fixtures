var specs = require('./integration-specs');

describe("maria intregation tests", function() {
  specs({
    client: 'mysql',
    connection: {
      host: process.env.DOCKER_HOST || 'maria',
      user: 'testdb',
      password: 'password',
      database: 'testdb',
      port: Number(process.env.DOCKER_PORT || 3306)
    }
  });
});
