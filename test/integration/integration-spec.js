var fixtureGenerator = require('../../lib/fixture-generator');

var dbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'testdb',
    password: 'password',
    database: 'testdb',
    port: 15432
  }
};

describe('fixtureGenerator', function() {
  before(function(done) {
    var knex = this.knex = require('knex')(dbConfig);
    knex.schema.createTable('Users', function(table) {
      table.increments('id').primary();
      table.string('username');
    }).then(function() {
      knex.schema.createTable('Items', function(table) {
        table.increments('id').primary();
        table.string('name');
        table.integer('userId').references('id').inTable('Users');
      }).then(function() {
        done();
      });
    });
  });

  after(function(done) {
    this.knex.destroy().then(function() {
      fixtureGenerator.disconnect().then(function() {
        done();
      });
    });
  });

  it('should create a fixture with dependencies resolved via property strings', function(done) {
    var dataConfig = {
      Users: {
        username: 'bob'
      },
      Items: {
        name: "bob's item",
        userId: 'Users:0'
      }
    };

    fixtureGenerator.create(dbConfig, dataConfig).then(function(results) {
      expect(results.Users[0].username).to.eql('bob');
      expect(results.Items[0].userId).to.eql(results.Users[0].id);
      done();
    });
  });
});
