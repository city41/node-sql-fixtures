// NOTE: fixtureGenerator is mostly tested in the integration specs

var _ = require('lodash');
var fixtureGenerator = require('../../lib/fixture-generator');

var dbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'testdb',
    password: 'password',
    database: 'testdb',
    port: 5432
  }
};

describe('fixtureGenerator', function() {
  describe('error handling', function() {
    var impossible = {
      Users: {
        fooId: "DontExist:0"
      }
    };

    it('should reject invalid database config', function(done) {
      fixtureGenerator.create({}, impossible)
        .catch(function(err) {
          expect(err).to.be.an.instanceOf(Error);
          expect(err.toString()).to.contain('DontExist');
          done();
        });
    });

    it('should reject the promise', function(done) {
      fixtureGenerator.create(dbConfig, impossible).then(function(result) {
        throw new Error("Should not have returned a result");
      }, function(err) {
        expect(err).to.be.an.instanceOf(Error);
        done();
      });
    });
  });

  describe('disconnect alias', function() {
    it('should be an alias to destroy', function() {
      expect(fixtureGenerator.disconnect === fixtureGenerator.destroy).to.be.true;
    });
  });
});
