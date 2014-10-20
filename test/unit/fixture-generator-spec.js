// NOTE: fixtureGenerator is mostly tested in the integration specs

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

    it('should throw on invalid database config', function(done) {
      function invalidConfig() {
        fixtureGenerator.create({}, impossible, function(err, result) {});
      }

      expect(invalidConfig).to.throw(Error);
      done();
    });

    it('should return the error in the callback', function(done) {
      fixtureGenerator.create(dbConfig, impossible, function(err, result) {
        expect(err).to.be.an.instanceOf(Error);
        expect(result).to.be.undefined;
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
