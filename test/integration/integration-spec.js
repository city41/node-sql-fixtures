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

  describe("generating fixtures", function() {
    it('should create a fixture with dependencies resolved', function(done) {
      var dataConfig = {
        Users: {
          username: 'bob'
        },
        Items: {
          name: "bob's item",
          userId: 'Users:0'
        }
      };

      var knex = this.knex;
      fixtureGenerator.create(dbConfig, dataConfig).then(function(results) {
        expect(results.Users[0].username).to.eql('bob');
        expect(results.Items[0].userId).to.eql(results.Users[0].id);

        // verify the data made it into the database
        knex('Users').where('id', results.Users[0].id).then(function(result) {
          expect(result[0].username).to.eql('bob');
          done();
        });
      });
    });

    it('should properly deal with same types at different priorities', function(done) {
      var dataConfig = {
        Users: [{
          username: 'bob'
        }, {
          username: "Items:0:name"
        }],
        Items: {
          name: "bob's item",
          userId: 'Users:0'
        }
      };

      var knex = this.knex;
      fixtureGenerator.create(dbConfig, dataConfig).then(function(results) {
        expect(results.Users[0].id).to.be.a.number;
        expect(results.Users[1].id).to.be.a.number;
        expect(results.Items[0].id).to.be.a.number;

        expect(results.Users[0].username).to.eql('bob');
        expect(results.Users[1].username).to.eql("bob's item");
        expect(results.Items[0].name).to.eql("bob's item");
        expect(results.Items[0].userId).to.eql(results.Users[0].id);

        // verify the data made it into the database
        knex('Users').whereIn('id', [results.Users[0].id, results.Users[1].id]).then(function(result) {
          expect(result[0].username).to.eql('bob');
          expect(result[1].username).to.eql("bob's item");

          knex('Items').where('id', results.Items[0].id).then(function(result) {
            expect(result[0].name).to.eql("bob's item");
            done();
          });
        });
      });
    });
  });

  describe('calling the callback', function() {
    it('should call the callback if provided', function(done) {
      var dataConfig = {
        Users: {
          username: 'bob'
        }
      };

      fixtureGenerator.create(dbConfig, dataConfig, function(err, results) {
        expect(err).to.be.undefined;
        expect(results.Users[0].username).to.eql('bob');
        done();
      });
    });
  });
});
