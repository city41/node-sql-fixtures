var prioritize = require('../../lib/prioritize');

describe('prioritize', function() {
  it('should prioritize a simple case', function() {
    var config = {
      user: {
        username: 'bob'
      }
    };

    expect(prioritize(config)).to.eql([
      [{
        __type__: 'user',
        username: 'bob'
      }]
    ]);
  });

  it('should prioritize with one dependency', function() {
    var config = {
      user: {
        username: 'bob'
      },
      challenge: [{
        createdById: 'user:0',
        name: 'my challenge'
      }]
    };

    expect(prioritize(config)).to.eql([
      [{
        __type__: 'user',
        username: 'bob'
      }],
      [{
        __type__: 'challenge',
        name: 'my challenge',
        createdById: 'user:0'
      }]
    ]);
  });

  it('should return an error if a dependency does not exist', function() {
    var config = {
      user: {
        username: 'bob'
      },
      challenge: [{
        createdById: 'task:0',
        name: 'my challenge'
      }]
    };

    expect(prioritize(config)).to.be.an.instanceOf(Error)
  });

  it('should return an error if a dependency is out of bounds', function() {
    var config = {
      user: {
        username: 'bob'
      },
      challenge: [{
        createdById: 'user:1',
        name: 'my challenge'
      }]
    };

    expect(prioritize(config)).to.be.an.instanceOf(Error)
  });
});
