var _ = require('lodash');
var knex = require('knex');
var bluebird = require('bluebird');
var FixtureGenerator = require('../../lib/fixture-generator');

module.exports = function(dbConfig) {
  describe('FixtureGenerator', function() {
    this.enableTimeouts(false);

    before(function() {
      this.fixtureGenerator = new FixtureGenerator(dbConfig);
      this.knex = this.fixtureGenerator.knex;
    });

    beforeEach(function(done) {
      // NOTE: these test tables don't actually have foreign key constraints.
      // This is to make clearing the data between tests easier. The tests are
      // still asserting that cross-table dependencies get resolved correctly
      // so the lack of a true foreign key doesn't affect what is being tested.

      // snake case is used to keep everything lowercase, avoiding case-sensitivity issues,
      // which makes running these common specs against the different database
      // engines easier (especially the arbitrary sql specs)

      var knex = this.knex;
      var dropPromises = [
        knex.schema.dropTableIfExists('simple_table'),
        knex.schema.dropTableIfExists('has_foreign_key'),
        knex.schema.dropTableIfExists('has_foreign_key_to_itself'),
        knex.schema.dropTableIfExists('has_two_foreign_keys'),
        knex.schema.dropTableIfExists('has_no_id_column')
      ];

      bluebird.all(dropPromises)
      .then(function() {
        return knex.schema.createTable('simple_table', function(table) {
          table.increments('id').primary();
          table.string('string_column');
          table.string('auto_populated_column').notNullable().defaultTo('autopopulated');
        });
      })
      .then(function() {
        return knex.schema.createTable('has_foreign_key', function(table) {
          table.increments('id').primary();
          table.string('string_column');
          table.integer('simple_table_id');
        });
      })
      .then(function() {
        return knex.schema.createTable('has_foreign_key_to_itself', function(table) {
          table.increments('id').primary();
          table.string('string_column');
          table.integer('parent_id');
        });
      })
      .then(function() {
        return knex.schema.createTable('has_two_foreign_keys', function(table) {
          table.increments('id').primary();
          table.integer('has_foreign_key_to_itself_id');
          table.integer('simple_table_id');
          table.string('string_column');
        });
      })
      .then(function() {
        return knex.schema.createTable('has_no_id_column', function(table) {
          table.integer('foreign_a_id');
          table.integer('foreign_b_id');
          table.string('auto_populated_column').notNullable().defaultTo('autopopulated');
        });
      })
      .then(function() {
        done();
      });
    });

    after(function(done) {
      this.fixtureGenerator.destroy(done);
    });

    describe('selecting pre-existing data with unknown ID:s', function() {
      beforeEach(function createTableWithUnknownIds(done) {
        var wantedData = 'unique row';
        this.knex('simple_table')
          .insert([{
            string_column: 'non-unique row'
          }, {
            string_column: wantedData
          }, {
            string_column: 'non-unique row'
          }])
          .then(function(result) {
            done();
          });

        this.dataConfig = {
          has_foreign_key: [{
            string_column: 'first row with external reference',
            simple_table_id: {from: 'simple_table', where: { string_column: wantedData }}
          }, {
            string_column: 'second row with external reference',
            simple_table_id: {from: 'simple_table', where: { string_column: wantedData }}
          }]
        };
      });

      it('should replace a single query object with its result, corresponding to a FK', function(done) {
        var knex = this.knex;
        this.fixtureGenerator.create(this.dataConfig).then(function checkSimpleTableIdMatches(fixtures) {
          expect(fixtures.has_foreign_key[0].simple_table_id, 'resolved FK').to.be.gt(0);

          knex('simple_table')
            .first()
            .where('id', fixtures.has_foreign_key[0].simple_table_id)
            .then(function(rowIdentifiedByFk) {
              expect(rowIdentifiedByFk, 'rowIdentifiedByFk').to.have.property('string_column');
              expect(rowIdentifiedByFk.string_column).to.eql('unique row');
              done();
            });
        })
        .catch(function (err) {
          done(err);
        });
      });

      it('should replace multiple query objects with their corresponding FK:s', function(done) {
        var knex = this.knex;
        this.fixtureGenerator.create(this.dataConfig).then(function checkSimpleTableIdMatches(fixtures) {
          expect(fixtures.has_foreign_key[0].simple_table_id, 'resolved FK').to.be.gt(0);

          knex('simple_table')
            .first()
            .where('id', fixtures.has_foreign_key[0].simple_table_id)
            .then(function(rowIdentifiedByFk) {
              expect(rowIdentifiedByFk, 'rowIdentifiedByFk').to.have.property('string_column');
              expect(rowIdentifiedByFk.string_column).to.eql('unique row');
              done();
            });
        })
        .catch(function (err) {
          done(err);
        });
      });

      it('should fail early for errors during FK lookup', function(done) {
        var dataConfig = {
          has_foreign_key: {
            simple_table_id: {from: 'invalid_table', where: {}}
          }
        };

        this.fixtureGenerator.create(dataConfig)
          .then(function (res) {
            done(new Error('promise should have been rejected'));
          })
          .catch(function (err) {
            done();
          });
      });

      it('should fail early if FK lookup finds multiple rows', function(done) {
        this.dataConfig.has_foreign_key[0].simple_table_id.where = {string_column: 'non-unique row'};

        this.fixtureGenerator.create(this.dataConfig)
          .then(function (res) {
            done(new Error('promise should have been rejected'));
          })
          .catch(function (err) {
            expect(err.message).to.contain('>1 possible');
            done();
          });
      });

      it('should allow getting a column other than id from existing data', function(done) {
        var knex = this.knex;

        var wantedData = 'unique row';
        var dataConfig = {
          has_foreign_key: [{
            string_column: {from: 'simple_table', column: 'string_column', where: { string_column: wantedData }},
            simple_table_id: {from: 'simple_table', where: { string_column: wantedData }}
          }]
        };

        this.fixtureGenerator.create(dataConfig).then(function(fixtures) {
          expect(fixtures.has_foreign_key[0].string_column).to.equal('unique row');
          done();
        })
        .catch(function (err) {
          done(err);
        });
      });
    });

    describe("generating fixtures", function() {
      it('should create a fixture with dependencies resolved', function(done) {
        var dataConfig = {
          simple_table: {
            string_column: 'value1'
          },
          has_foreign_key: {
            string_column: 'value2',
            simple_table_id: 'simple_table:0'
          }
        };

        var knex = this.knex;

        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.simple_table[0].string_column).to.eql('value1');
          expect(results.simple_table[0]).to.not.have.property('specId');

          expect(results.has_foreign_key[0].simple_table_id).to.eql(results.simple_table[0].id);
          expect(results.has_foreign_key[0].string_column).to.eql('value2');
          expect(results.has_foreign_key[0]).to.not.have.property('specId');

          // verify the data made it into the database
          knex('simple_table').where('id', results.simple_table[0].id).then(function(result) {
            expect(result[0].string_column).to.eql('value1');
            done();
          });
        });
      });

      it('should leave the passed in data spec alone', function(done) {
        var dataConfig = {
          simple_table: {
            string_column: 'value1'
          },
          has_foreign_key: {
            string_column: 'value2',
            simple_table_id: 'simple_table:0'
          }
        };

        var originalConfig = _.cloneDeep(dataConfig);

        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.simple_table[0].string_column).to.eql('value1');
          expect(originalConfig).to.eql(dataConfig);
          done();
        });
      });

      it('should properly deal with same types at different priorities', function(done) {
        var dataConfig = {
          simple_table: [{
            string_column: 'value1'
          }, {
            string_column: 'has_foreign_key:0:string_column'
          }],
          has_foreign_key: {
            string_column: 'value2',
            simple_table_id: 'simple_table:0'
          }
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.simple_table[0].id).to.be.a('number');
          expect(results.simple_table[1].id).to.be.a('number');
          expect(results.has_foreign_key[0].id).to.be.a('number');

          expect(results.simple_table[0].string_column).to.eql('value1');
          expect(results.simple_table[1].string_column).to.eql('value2');
          expect(results.has_foreign_key[0].string_column).to.eql('value2');
          expect(results.has_foreign_key[0].simple_table_id).to.eql(results.simple_table[0].id);

          // verify the data made it into the database
          knex('simple_table').whereIn('id', [results.simple_table[0].id, results.simple_table[1].id]).then(function(result) {
            expect(result[0].string_column).to.eql('value1');
            expect(result[1].string_column).to.eql('value2');

            knex('has_foreign_key').where('id', results.has_foreign_key[0].id).then(function(result) {
              expect(result[0].string_column).to.eql('value2');
              done();
            });
          });
        });
      });

      it('should properly resolve same types at different priorities', function(done) {
        var dataConfig = {
          simple_table: {
            string_column: 'value1'
          },
          has_foreign_key_to_itself: [{
            string_column: 'value2'
          }, {
            string_column: 'value3',
            parent_id: 'has_foreign_key_to_itself:0'
          }],
          has_two_foreign_keys: [{
            has_foreign_key_to_itself_id: 'has_foreign_key_to_itself:0',
            simple_table_id: 'simple_table:0'
          }, {
            has_foreign_key_to_itself_id: "has_foreign_key_to_itself:1",
            simple_table_id: "simple_table:0"
          }]
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.has_foreign_key_to_itself[1].parent_id).to.be.a('number');
          expect(results.has_foreign_key_to_itself[1].parent_id).to.eql(results.has_foreign_key_to_itself[0].id);

          expect(results.has_two_foreign_keys[1].has_foreign_key_to_itself_id).to.be.a('number');
          expect(results.has_two_foreign_keys[1].has_foreign_key_to_itself_id).to.eql(results.has_foreign_key_to_itself[1].id);

          expect(results.has_two_foreign_keys[1].simple_table_id).to.be.a('number');
          expect(results.has_two_foreign_keys[1].simple_table_id).to.eql(results.simple_table[0].id);

          knex('has_two_foreign_keys').where('id', results.has_two_foreign_keys[1].id).then(function(result) {
            expect(result[0].simple_table_id).to.eql(results.simple_table[0].id);
            done();
          });
        });
      });

      // this spec asserts that issue #5 is resolved
      // in the below, the prioritization ends up moving the has_two_foreign_keys around
      // and so before the fix, results.has_two_foreign_keys[0] is what the user expected to
      // find at results.has_two_foreign_keys[1]
      it('should properly resolve dependencies that might move around', function(done) {

        // the below config will end up as these priority levels
        // notice the "twos" switched places
        //
        // 1 -> simpletable 0 and 1, itself 0
        // 2 -> itself 1, two 1
        // 3 -> two 0

        var dataConfig = {
          simple_table: [{
            string_column: 'value1'
          }, {
            string_column: 'value2'
          }],
          has_foreign_key_to_itself: [{
            string_column: 'value3'
          }, {
            string_column: 'value4',
            parent_id: 'has_foreign_key_to_itself:0'
          }],
          has_two_foreign_keys: [{
            simple_table_id: 'simple_table:0',
            has_foreign_key_to_itself_id: 'has_foreign_key_to_itself:0',
            string_column: 'value5'
          }, {
            simple_table_id: 'simple_table:1',
            string_column: 'value6'
          }]
        };

        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.has_two_foreign_keys[0].string_column).to.eql('value5');
          expect(results.has_two_foreign_keys[1].string_column).to.eql('value6');
          expect(results.has_two_foreign_keys[1].simple_table_id).to.eql(results.simple_table[1].id);
          done();
        });
      });

      it("should insert records in the same order as defined in the spec", function(done) {
        var dataConfig = {
          simple_table: []
        };
        for (var i = 0; i < 20; ++i) {
          dataConfig.simple_table.push({string_column: 'value' + i});
        }

        this.fixtureGenerator.create(dataConfig).then(function(results) {
          for (var i = 1; i < results.simple_table.length; ++i) {
            expect(results.simple_table[i].id).to.be.greaterThan(results.simple_table[i-1].id);
          }
          done();
        });
      });

      describe("when inserting multiple times (issue #22)", function() {
        it("should resolve foreign dependencies correctly", function(done) {
          var dataConfig = {
            simple_table: [{
              string_column: 'sc1'
            }, {
              string_column: 'sc2'
            }],
            has_foreign_key: [{
              string_column: 'hfk1',
              simple_table_id: 'simple_table:0'
            }, {
              string_column: 'hfk1',
              simple_table_id: 'simple_table:1'
            }]
          };

          this.fixtureGenerator.create(dataConfig).bind(this).then(function(firstResult) {
            this.fixtureGenerator.create(dataConfig).then(function(secondResult) {
              expect(secondResult.has_foreign_key[0].simple_table_id).to.not.equal(
                firstResult.simple_table[0].id
              );
              expect(secondResult.has_foreign_key[0].simple_table_id).to.not.equal(
                firstResult.simple_table[1].id
              );

              expect(secondResult.has_foreign_key[1].simple_table_id).to.not.equal(
                firstResult.simple_table[0].id
              );
              expect(secondResult.has_foreign_key[1].simple_table_id).to.not.equal(
                firstResult.simple_table[1].id
              );

              expect(secondResult.has_foreign_key[1].simple_table_id).to.equal(
                secondResult.simple_table[1].id
              );

              expect(firstResult.simple_table[0].id).to.not.equal(secondResult.simple_table[0].id);
              expect(firstResult.simple_table[0].id).to.not.equal(secondResult.simple_table[1].id);
              expect(firstResult.simple_table[1].id).to.not.equal(secondResult.simple_table[0].id);
              expect(firstResult.simple_table[1].id).to.not.equal(secondResult.simple_table[1].id);
              done();
            });
          });
        });
      });

      describe("tables without an id column", function() {
        it('should create rows for tables without an id column', function(done) {
          var dataConfig = {
            has_no_id_column: [{
              foreign_a_id: 2,
              foreign_b_id: 3,
              auto_populated_column: null
            }, {
              foreign_a_id: 5,
              foreign_b_id: 6
            }]
          };

          var knex = this.knex;

          this.fixtureGenerator.create(dataConfig).then(function(results) {
            expect(results.has_no_id_column[0].foreign_a_id).to.eql(2);
            expect(results.has_no_id_column[0].foreign_b_id).to.eql(3);
            expect(results.has_no_id_column[0].auto_populated_column).to.exist;

            expect(results.has_no_id_column[1].foreign_a_id).to.eql(5);
            expect(results.has_no_id_column[1].foreign_b_id).to.eql(6);
            expect(results.has_no_id_column[1]).to.not.have.property('auto_populated_column');

            knex('has_no_id_column').where('foreign_a_id', 2).then(function(knexResult) {
              expect(knexResult[0].foreign_b_id).to.eql(3);
              expect(knexResult[0].auto_populated_column).to.exist;
              done();
            });
          });
        });
      });

      describe("invoking raw sql", function() {
        it("should invoke raw sql", function(done) {
          var dataConfig = {
            simple_table: [{
              string_column: 'value1'
            }, {
              string_column: 'value2'
            }],
            sql: [
              'insert into has_foreign_key (string_column, simple_table_id) values (\'rawsql0\', {simple_table:0})',
              'insert into has_foreign_key (string_column, simple_table_id) values (\'rawsql1\', {simple_table:1})'
            ]
          };

          var knex = this.knex;
          this.fixtureGenerator.create(dataConfig).then(function(results) {
            expect(results.simple_table.length).to.eql(2);
            expect(results).to.not.have.property('has_foreign_key');
            knex('has_foreign_key').where('string_column', 'rawsql0').then(function(knexResult) {
              expect(knexResult[0].simple_table_id).to.eql(results.simple_table[0].id);
              knex('has_foreign_key').where('string_column', 'rawsql1').then(function(knexResult) {
                expect(knexResult[0].simple_table_id).to.eql(results.simple_table[1].id);
                done();
              });
            });
          });
        });

        it('should allow raw sql in a column', function(done) {
          var knex = this.fixtureGenerator.knex;

          var dataConfig = {
            simple_table: [
              {
                string_column: knex.raw('?', ['value1'])
              }
            ]
          };

          this.fixtureGenerator.create(dataConfig).then(function(results) {
            expect(results.simple_table[0].string_column).to.equal('value1');
            done();
          });
        });
      });

      describe('auto populated columns', function() {
        it('should return the auto populated columns in the result if they are in the config', function(done) {
          var dataConfig = {
            simple_table: [
              {
                string_column: 'value1',
                auto_populated_column: null
              },
              {
                string_column: 'value2'
              }
            ]
          };

          this.fixtureGenerator.create(dataConfig).then(function(results) {
            expect(results.simple_table[0].auto_populated_column).to.eql('autopopulated');
            expect(results.simple_table[1]).to.not.have.property('auto_populated_column');
            done();
          });
        });
      });
    });

    describe('spec ids', function() {
      it('should resolved spec ids', function(done) {
        var dataConfig = {
          simple_table: {
            specId: 'mySimpleTableRow',
            string_column: 'value1'
          },
          has_foreign_key: {
            string_column: 'value2',
            simple_table_id: 'simple_table:mySimpleTableRow'
          }
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.simple_table[0].string_column).to.eql('value1');
          expect(results.has_foreign_key[0].simple_table_id).to.eql(results.simple_table[0].id);

          // verify the data made it into the database
          knex('simple_table').where('id', results.simple_table[0].id).then(function(result) {
            expect(result[0].string_column).to.eql('value1');
            done();
          });
        });
      });
    });

    describe('escaping', function() {
      it('should unescape colons', function(done) {
        var dataConfig = {
          simple_table: {
            string_column: 'foo::bar'
          }
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.simple_table[0].string_column).to.eql('foo:bar');

          // verify the data made it into the database
          knex('simple_table').where('id', results.simple_table[0].id).then(function(result) {
            expect(result[0].string_column).to.eql('foo:bar');
            done();
          });
        });
      });
    });

    describe('unique rows', function() {
      it('should not insert the same data more than once', function(done) {
        var dataConfig = {
          simple_table: [
          { string_column: 'same value'},
          { string_column: 'same value'},
          { string_column: 'same value'}
          ]
        };
        var knex = this.knex;
        var fg = this.fixtureGenerator;

        fg.create(dataConfig, { unique: true }).then(function(results) {
          expect(results.simple_table.length).to.equal(1);
          knex('simple_table').then(function(result) {
            expect(result.length).to.equal(1);

            fg.create(dataConfig, { unique: true }).then(function(results) {
              expect(results.simple_table.length).to.equal(0);

              knex('simple_table').then(function(result) {
                expect(result.length).to.equal(1);
                done();
              });
            });
          });
        });
      });
    });

    describe('errors', function(done) {
      it('should reject the promise if knex fails', function(done) {
        var dataConfig = {
          non_existant_table: {
            foo: 'bar'
          }
        };

        this.fixtureGenerator.create(dataConfig).then(function(result) {
          done(new Error('should not have succeeded'));
        }, function(err) {
          expect(err).to.exist;
          expect(err.toString()).to.contain('non_existant');
          done();
        });
      });

      it('should call the callback with an error if knex fails', function(done) {
        var dataConfig = {
          non_existant_table: {
            foo: 'bar'
          }
        };

        this.fixtureGenerator.create(dataConfig, function(err, result) {
          expect(err).to.exist;
          expect(err.toString()).to.contain('non_existant');
          done();
        });
      });
    });

    describe('calling the callback', function() {
      it('should call the callback if provided', function(done) {
        var dataConfig = {
          simple_table: {
            string_column: 'a value'
          }
        };

        this.fixtureGenerator.create(dataConfig, function(err, results) {
          expect(err).to.not.exist;
          expect(results.simple_table[0].string_column).to.eql('a value');
          done();
        });
      });
    });

    describe('providing a knex instance', function() {
      it('should use the provided knex instance', function(done) {
        var myKnex = knex(dbConfig);
        var fixtureGenerator = new FixtureGenerator(myKnex);

        expect(fixtureGenerator.knex).to.equal(myKnex);

        var dataConfig = {
          simple_table: {
            string_column: 'a value'
          }
        };

        fixtureGenerator.create(dataConfig, function(err, results) {
          expect(err).to.not.exist;
          expect(results.simple_table[0].string_column).to.eql('a value');

          myKnex.destroy().nodeify(done);
        });
      });
    });

    describe('reusing the instance', function() {
      it('should reconnect after a destroy', function(done) {
        var dataConfig = {
          simple_table: {
            string_column: 'a value'
          }
        };

        var fixtureGenerator = this.fixtureGenerator;

        fixtureGenerator.create(dataConfig, function(err, results) {
          expect(err).to.not.exist;
          expect(results.simple_table[0].string_column).to.eql('a value');

          fixtureGenerator.destroy(function() {
            fixtureGenerator.create(dataConfig, function(err, results) {
              expect(err).to.not.exist;
              expect(results.simple_table[0].string_column).to.eql('a value');
              done();
            });
          });
        });
      });
    });
  });
};
