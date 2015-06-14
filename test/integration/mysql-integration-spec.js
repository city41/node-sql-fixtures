var specs = require('./integration-specs');

describe("mysql intregation tests", function() {
  specs({
    client: 'mysql',
    connection: {
      host: process.env.DOCKER_IP || 'mysql',
      user: 'testdb',
      password: 'password',
      database: 'testdb',
      port: Number(process.env.DOCKER_PORT || 3306)
    }
  });
});
