var _ = require('lodash');
var bluebird = require('bluebird');
var FixtureGenerator = require('../../lib/fixture-generator');
var specs = require('./integration-specs');

var dbConfig = {
  client: 'sqlite3',
  connection: {
    filename: './sqlite-integration-spec.db'
  }
};

describe("sqlite intregation tests", function() {
  specs(dbConfig);

  // sqlite specific specs below

  describe("using rowids", function() {
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
        knex.schema.dropTableIfExists('has_no_id_and_timestamps')
      ];

      bluebird.all(dropPromises).then(function() {
        knex.schema.createTable('has_no_id_and_timestamps', function(table) {
          table.integer('integer_column');
          table.timestamp('timestamp_column').defaultTo(knex.fn.now());
        }).then(function() {
          done();
        });
      });
    });

    it('should select the correct row', function(done) {
      this.timeout(4000);
      var me = this;

      var firstConfig = {
        has_no_id_and_timestamps: [
          { integer_column: 2, timestamp_column: null },
          { integer_column: 2, timestamp_column: null },
          { integer_column: 2, timestamp_column: null },
          { integer_column: 2, timestamp_column: null },
          { integer_column: 2, timestamp_column: null }
        ]
      };

      this.fixtureGenerator.create(firstConfig).then(function(firstResults) {
        setTimeout(function() {
          var dataConfig = {
            has_no_id_and_timestamps: { integer_column: 2, timestamp_column: null }
          };

          me.fixtureGenerator.create(dataConfig).then(function(nextResults) {
            // if we got the correct row, it will have a timestamp not found in the previous set
            var previousTimestamps = _.map(firstResults.has_no_id_and_timestamps, 'timestamp_column');
            expect(previousTimestamps).to.not.contain(nextResults.has_no_id_and_timestamps[0].timestamp_column);
            done();
          });
        }, 2000);
      });
    });
  });
});
