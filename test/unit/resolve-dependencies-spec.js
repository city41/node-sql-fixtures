var resolveDependencies = require('../../lib/resolve-dependencies');

describe('resolve-dependencies', function() {
  it('should leave a non-dependency alone', function() {
    var toBeResolved = {
      Users: [{
        foo: 'bar'
      }]
    };

    var previouslyResolved = {};

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql(toBeResolved);
  });

  it('should resolve the dependency', function() {
    var toBeResolved = {
      Challenges: [{
        foo: 'Users:u0'
      }]
    };

    var previouslyResolved = {
      Users: [{
        id: 4,
        specId: 'u0'
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql({
      Challenges: [{
        foo: 4
      }]
    });
  });

  it('should resolve a non-default property', function() {
    var toBeResolved = {
      Challenges: [{
        foo: 'Users:u0:bar'
      }]
    };

    var previouslyResolved = {
      Users: [{
        bar: 'baz',
        specId: 'u0'
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql({
      Challenges: [{
        foo: 'baz'
      }]
    });
  });

  it('should leave the value alone if no resolution can be found', function() {
    var toBeResolved = {
      Challenges: [{
        foo: 'Users:u1'
      }]
    };

    var previouslyResolved = {
      Users: [{
        id: 6,
        specId: 'u0'
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql(toBeResolved);
  });

  it('should resolve sql strings', function() {
    var toBeResolved = {
      sql: ['foo {Users:u0} {Users:u0}']
    };

    var previouslyResolved = {
      Users: [{
        id: 6,
        specId: 'u0'
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved.sql[0]).to.eql('foo 6 6');
  });

  it('should resolve arrays', function() {
    var toBeResolved = {
      needs_integer: [{
        integers: ['has_integer:hi0:integer', 5]
      }]
    };

    var previouslyResolved = {
      has_integer: [{
        id: 6,
        specId: 'hi0',
        integer: 7
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved.needs_integer[0].integers).to.eql([7, 5]);
  });

  describe('spec ids', function() {
    it('should resolve the spec id', function() {
      var toBeResolved = {
        Challenges: [{
          foo: 'Users:myId'
        }]
      };

      var previouslyResolved = {
        Users: [{
          id: 8,
          specId: 'myId'
        }]
      };

      var resolved = resolveDependencies(previouslyResolved, toBeResolved);
      expect(resolved).to.eql({
        Challenges: [{
          foo: 8
        }]
      });
    });
  });
});
