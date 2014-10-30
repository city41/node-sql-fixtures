var specs = require('./integration-specs');

describe("mysql intregation tests", function() {
  specs({
    client: 'mysql',
    connection: {
      host: '192.168.59.103',
      user: 'admin',
      password: 'password',
      database: 'testdb',
      port: 3306
    }
  });
});
