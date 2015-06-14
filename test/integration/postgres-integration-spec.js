var bluebird = require('bluebird');
var FixtureGenerator = require('../../lib/fixture-generator');
var specs = require('./integration-specs');

var dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DOCKER_IP || 'pg',
    user: 'testdb',
    password: 'password',
    database: 'testdb',
    port: Number(process.env.DOCKER_PORT || 5432)
  }
};

describe("postgres intregation tests", function() {
  specs(dbConfig);

  // postgres specific specs below

  describe("array data type", function() {
    before(function() {
      this.fixtureGenerator = new FixtureGenerator(dbConfig);
      this.knex = this.fixtureGenerator.knex;
    });

    after(function(done) {
      this.fixtureGenerator.destroy(done);
    });

    beforeEach(function(done) {
      var knex = this.knex;

      var dropPromises = [
        knex.schema.dropTableIfExists('simple_array_table'),
        knex.schema.dropTableIfExists('has_array_column')
      ];

      bluebird.all(dropPromises).then(function() {
        knex.schema.createTable('simple_array_table', function(table) {
          table.increments('id').primary();
          table.integer('integer_column');
        }).then(function() {
          knex.raw("create table has_array_column(integers integer[])").then(function() {
            done();
          });
        });
      });
    });

    it('should insert hard coded arrays', function(done) {
      var dataConfig = {
        has_array_column: {
          integers: [4,5,6]
        }
      };

      var knex = this.knex;

      this.fixtureGenerator.create(dataConfig).then(function(results) {
        expect(results.has_array_column[0].integers).to.eql([4,5,6]);

        knex('has_array_column').then(function(result) {
          expect(result[0].integers).to.eql([4,5,6]);
          done();
        });
      });
    });

    it('should resolve array values', function(done) {
      var dataConfig = {
        simple_array_table: {
          integer_column: 8
        },
        has_array_column: {
          integers: [4,5, 'simple_array_table:0:integer_column']
        }
      };

      var knex = this.knex;

      this.fixtureGenerator.create(dataConfig).then(function(results) {
        expect(results.has_array_column[0].integers).to.eql([4,5,8]);

        knex('has_array_column').then(function(result) {
          expect(result[0].integers).to.eql([4,5,8]);
          done();
        });
      });
    });
  });
});
