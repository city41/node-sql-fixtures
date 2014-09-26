var resolveDependencies = require('../../lib/resolve-dependencies');

describe('resolve-dependencies', function() {
  it("should leave a non-dependency alone", function() {
    var toBeResolved = [{
      foo: 'bar'
    }];

    var previouslyResolved = {};

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql(toBeResolved);
  });

  it("should resolve the dependency", function() {
    var toBeResolved = [{
      foo: 'user:0'
    }];

    var previouslyResolved = {
      user: [{
        id: 4
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql([{
      foo: 4
    }]);
  });

  it("should resolve a non-default property", function() {
    var toBeResolved = [{
      foo: 'user:0:bar'
    }];

    var previouslyResolved = {
      user: [{
        bar: "baz"
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql([{
      foo: "baz"
    }]);
  });

  it("should leave the value alone if no resolution can be found", function() {
    var toBeResolved = [{
      foo: 'user:1'
    }];

    var previouslyResolved = {
      user: [{
        id: 6
      }]
    };

    var resolved = resolveDependencies(previouslyResolved, toBeResolved);
    expect(resolved).to.eql([{
      foo: 'user:1'
    }]);
  });
});
