// NOTE: fixtureGenerator is mostly tested in the integration specs

var fixtureGenerator = require('../../lib/fixture-generator');

describe('fixtureGenerator', function() {
  describe('error handling', function() {
    var impossible = {
      Users: {
        fooId: "DontExist:0"
      }
    };

    it('should return the error in the callback', function(done) {
      fixtureGenerator.create({}, impossible, function(err, result) {
        expect(err).to.be.an.instanceOf(Error);
        expect(result).to.be.undefined;
        done();
      });
    });

    it('should reject the promise', function(done) {
      fixtureGenerator.create({}, impossible).then(function(result) {
        throw new Error("Should not have returned a result");
      }, function(err) {
        expect(err).to.be.an.instanceOf(Error);
        done();
      });
    });
  });
});
