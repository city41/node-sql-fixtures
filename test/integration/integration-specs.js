var _ = require('lodash');
var FixtureGenerator = require('../../lib/fixture-generator');

module.exports = function(dbConfig) {
  describe('FixtureGenerator', function() {
    this.enableTimeouts(false);

    before(function(done) {
      this.fixtureGenerator = new FixtureGenerator(dbConfig);
      var knex = this.knex = this.fixtureGenerator.knex;
      knex.schema.createTable('users', function(table) {
        table.increments('id').primary();
        table.string('username');
        table.string('auto_populated_column').notNullable().defaultTo('autopopulated');
      }).then(function() {
        knex.schema.createTable('items', function(table) {
          table.increments('id').primary();
          table.string('name');
          table.integer('user_id');
        }).then(function() {
          knex.schema.createTable('comments', function(table) {
            table.increments('id').primary();
            table.string('comment');
            table.integer('user_id');
            table.integer('item_id');
            table.integer('parent_id');
            table.integer('created_by_id');
          }).then(function() {
            knex.schema.createTable('like_votes', function(table) {
              table.increments('id').primary();
              table.integer('commentId');
              table.integer('created_by_id');
            }).then(function() {
              knex.schema.createTable('has_no_id_column', function(table) {
                table.integer('foreign_a_id');
                table.integer('foreign_b_id');
                table.string('auto_populated_column').notNullable().defaultTo('autopopulated');
              }).then(function() {
                done();
              });
            });
          });
        });
      });
    });

    after(function(done) {
      this.fixtureGenerator.destroy(done);
    });

    describe("generating fixtures", function() {
      it('should create a fixture with dependencies resolved', function(done) {
        var dataConfig = {
          users: {
            username: 'bob'
          },
          items: {
            name: "bob's item",
            user_id: 'users:0'
          }
        };

        var knex = this.knex;

        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.users[0].username).to.eql('bob');
          expect(results.users[0].specId).to.be.undefined;
          expect(results.items[0].user_id).to.eql(results.users[0].id);
          expect(results.items[0].specId).to.be.undefined;

          // verify the data made it into the database
          knex('users').where('id', results.users[0].id).then(function(result) {
            expect(result[0].username).to.eql('bob');
            done();
          });
        });
      });

      it('should leave the passed in data spec alone', function() {
        var dataConfig = {
          users: {
            username: 'bob'
          },
          items: [
            {
              name: "bob's item",
              user_id: 'users:0'
            }
          ]
        };

        var originalConfig = _.cloneDeep(dataConfig);

        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.users[0].username).to.eql('bob');
          expect(originalConfig).to.eql(dataConfig);
        });
      });

      it('should properly deal with same types at different priorities', function(done) {
        var dataConfig = {
          users: [{
            username: 'bob'
          }, {
            username: "items:0:name"
          }],
          items: {
            name: "bob's item",
            user_id: 'users:0'
          }
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.users[0].id).to.be.a.number;
          expect(results.users[1].id).to.be.a.number;
          expect(results.items[0].id).to.be.a.number;

          expect(results.users[0].username).to.eql('bob');
          expect(results.users[1].username).to.eql("bob's item");
          expect(results.items[0].name).to.eql("bob's item");
          expect(results.items[0].user_id).to.eql(results.users[0].id);

          // verify the data made it into the database
          knex('users').whereIn('id', [results.users[0].id, results.users[1].id]).then(function(result) {
            expect(result[0].username).to.eql('bob');
            expect(result[1].username).to.eql("bob's item");

            knex('items').where('id', results.items[0].id).then(function(result) {
              expect(result[0].name).to.eql("bob's item");
              done();
            });
          });
        });
      });

      it('should properly resolve same types at different priorities', function(done) {
        var dataConfig = {
          users: [
            { username: "bob" }
          ],
          comments: [{
            comment: 'comment 1',
            created_by_id: "users:0",
            user_id: "users:0"
          }, {
            comment: 'child of 1',
            created_by_id: "users:0",
            user_id: "users:0",
            parent_id: "comments:0"
          }],
          like_votes: [{
            commentId: "comments:0",
            created_by_id: "users:0"
          }, {
             commentId: "comments:1",
             created_by_id: "users:0"
          }]
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.comments[1].parent_id).to.be.a('number');
          expect(results.comments[1].parent_id).to.eql(results.comments[0].id);

          expect(results.like_votes[1].commentId).to.be.a('number');
          expect(results.like_votes[1].commentId).to.eql(results.comments[1].id);

          expect(results.like_votes[1].created_by_id).to.be.a('number');
          expect(results.like_votes[1].created_by_id).to.eql(results.users[0].id);

          knex('like_votes').where('id', results.like_votes[1].id).then(function(result) {
            expect(result[0].commentId).to.eql(results.comments[1].id);
            done();
          });
        });
      });

      // this spec asserts that issue #5 is resolved
      // in the below, the prioritization ends up moving the comments around
      // and so before the fix, results.comments[0] is what the user expected to
      // find at results.comments[1]
      it('should properly resolve dependencies that might move around', function(done) {
        var dataConfig = {
          users: [{
            username: 'bob'
          }, {
            username: 'sally'
          }],
          items: [{
            name: 'item 1',
            user_id: 'users:0'
          }],
          comments: [{
            created_by_id: "users:0",
            item_id: "items:0",
            comment: "comment on challenge"
          }, {
            created_by_id: "users:0",
            user_id: "users:1",
            comment: "comment on user 1's wall"
          }]
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.comments[1].comment).to.eql("comment on user 1's wall");
          expect(results.comments[1].user_id).to.eql(results.users[1].id);
          done();
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
            expect(results.has_no_id_column[0].auto_populated_column).to.eql("autopopulated");
            expect(results.has_no_id_column[1].foreign_a_id).to.eql(5);
            expect(results.has_no_id_column[1].foreign_b_id).to.eql(6);
            expect(results.has_no_id_column[1]).to.not.have.property('auto_populated_column');

            knex('has_no_id_column').where('foreign_a_id', 2).then(function(knexResult) {
              expect(knexResult[0].foreign_b_id).to.eql(3);
              expect(knexResult[0].auto_populated_column).to.eql("autopopulated");
              done();
            });
          });
        });
      });

      describe("invoking raw sql", function() {
        it("should invoke raw sql", function(done) {
          var dataConfig = {
            users: [{
              username: 'bob'
            }, {
              username: 'sally'
            }],
            sql: [
              'insert into items (name, user_id) values (\'rawsql0\', {users:0})',
              'insert into items (name, user_id) values (\'rawsql1\', {users:1})'
            ]
          };

          var knex = this.knex;
          this.fixtureGenerator.create(dataConfig).then(function(results) {
            expect(results.users.length).to.eql(2);
            expect(results.items).to.be.undefined;
            knex('items').where('name', 'rawsql0').then(function(knexResult) {
              expect(knexResult[0].user_id).to.eql(results.users[0].id);
              knex('items').where('name', 'rawsql1').then(function(knexResult) {
                expect(knexResult[0].user_id).to.eql(results.users[1].id);
                done();
              });
            });
          });
        });

        it('should allow raw sql in a column', function(done) {
          var knex = this.fixtureGenerator.knex;

          var dataConfig = {
            users: [
              {
                username: knex.raw('?', ['bob'])
              }
            ]
          };

          this.fixtureGenerator.create(dataConfig).then(function(results) {
            expect(results.users[0].username).to.equal('bob');
            done();
          });
        });
      });

      describe('auto populated columns', function() {
        it('should return the auto populated columns in the result', function(done) {
          var dataConfig = {
            users: [
              {
                username: 'bob',
                auto_populated_column: null
              },
              {
                username: 'joe'
              }
            ]
          };

          this.fixtureGenerator.create(dataConfig).then(function(results) {
            expect(results.users[0].auto_populated_column).to.eql('autopopulated');
            expect(results.users[1]).to.not.have.property('auto_populated_column');
            done();
          });
        });
      });
    });

    describe('spec ids', function() {
      it('should resolved spec ids', function(done) {
        var dataConfig = {
          users: {
            specId: 'myUser',
            username: 'bob'
          },
          items: {
            name: "bob's item",
            user_id: 'users:myUser'
          }
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.users[0].username).to.eql('bob');
          expect(results.items[0].user_id).to.eql(results.users[0].id);

          // verify the data made it into the database
          knex('users').where('id', results.users[0].id).then(function(result) {
            expect(result[0].username).to.eql('bob');
            done();
          });
        });
      });
    });

    describe('escaping', function() {
      it('should unescape colons', function(done) {
        var dataConfig = {
          users: {
            username: 'foo::bar'
          }
        };

        var knex = this.knex;
        this.fixtureGenerator.create(dataConfig).then(function(results) {
          expect(results.users[0].username).to.eql('foo:bar');

          // verify the data made it into the database
          knex('users').where('id', results.users[0].id).then(function(result) {
            expect(result[0].username).to.eql('foo:bar');
            done();
          });
        });
      });
    });

    describe('calling the callback', function() {
      it('should call the callback if provided', function(done) {
        var dataConfig = {
          users: {
            username: 'bob'
          }
        };

        this.fixtureGenerator.create(dataConfig, function(err, results) {
          expect(err).to.be.undefined;
          expect(results.users[0].username).to.eql('bob');
          done();
        });
      });
    });

    describe('reusing the instance', function() {
      it('should reconnect after a destroy', function(done) {
        var dataConfig = {
          users: {
            username: 'bob'
          }
        };

        var fixtureGenerator = this.fixtureGenerator;

        fixtureGenerator.create(dataConfig, function(err, results) {
          expect(err).to.be.undefined;
          expect(results.users[0].username).to.eql('bob');

          fixtureGenerator.destroy(function() {
            fixtureGenerator.create(dataConfig, function(err, results) {
              expect(err).to.be.undefined;
              expect(results.users[0].username).to.eql('bob');
              done();
            });
          });
        });
      });
    });
  });
};
