var prioritize = require('../../lib/prioritize');

describe('prioritize', function() {
  describe('prioritizing', function() {
    it('should prioritize a simple case', function() {
      var config = {
        Users: {
          username: 'bob',
          specId: 'u0'
        }
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob',
          specId: 'u0'
        }]
      }]);
    });

    it('should prioritize with one dependency', function() {
      var config = {
        Users: {
          username: 'bob',
          specId: 'u0'
        },
        Challenges: [{
          createdById: 'Users:u0',
          name: 'my challenge',
          specId: 'c0'
        }]
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob',
          specId: 'u0'
        }]
      }, {
        Challenges: [{
          name: 'my challenge',
          createdById: 'Users:u0',
          specId: 'c0'
        }]
      }]);
    });

    it('should prioritize later dependencies correctly', function() {
      var config = {
        Users: [{
          username: 'bob',
          specId: 'u0'
        }, {
          username: 'Challenges:c0:name',
          specId: 'u1'
        }],
        Challenges: [{
          createdById: 'Users:u0',
          name: 'my challenge',
          specId: 'c0'
        }]
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob',
          specId: 'u0'
        }]
      }, {
        Challenges: [{
          name: 'my challenge',
          createdById: 'Users:u0',
          specId: 'c0'
        }]
      }, {
        Users: [{
          username: 'Challenges:c0:name',
          specId: 'u1'
        }]
      }]);
    });

    it('should prioritize sql dependencies correctly', function() {
      var config = {
        Users: {
          username: 'bob',
          specId: 'u0'
        },
        Items: {
          name: 'my item',
          userId: 'Users:u0',
          specId: 'i0'
        },
        sql: 'foo {Users:u0} {Items:i0}'
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob',
          specId: 'u0'
        }]
      }, {
        Items: [{
          name: 'my item',
          userId: 'Users:u0',
          specId: 'i0'
        }]
      }, {
        sql: ['foo {Users:u0} {Items:i0}']
      }]);
    });

    it('should prioritize a more advanced case', function() {
      var config = {
        Users: [{
          username: "bob",
          specId: 'u0'
        }],
        Comments: [{
          comment: 'comment 1',
          createdById: "Users:u0",
          userId: "Users:u0",
          specId: 'c0'
        }, {
          comment: 'child of 1',
          createdById: "Users:u0",
          userId: "Users:u0",
          parentId: "Comments:c0",
          specId: 'c1'
        }],
        LikeVotes: [{
          commentId: "Comments:c0",
          createdById: "Users:u0",
          specId: 'lv0'
        }, {
           commentId: "Comments:c1",
           createdById: "Users:u0",
           specId: 'lv1'
        }]
      };

      expect(prioritize(config)).to.eql([
      {
        Users: [{
          username: "bob",
          specId: 'u0'
        }],
      },
      {
        Comments: [{
          comment: 'comment 1',
          createdById: "Users:u0",
          userId: "Users:u0",
          specId: 'c0'
        }]
      },
      {
        Comments: [{
          comment: 'child of 1',
          createdById: "Users:u0",
          userId: "Users:u0",
          parentId: "Comments:c0",
          specId: 'c1'
        }],
        LikeVotes: [{
          commentId: "Comments:c0",
          createdById: "Users:u0",
          specId: 'lv0'
        }]
      },
      {
        LikeVotes: [{
          commentId: "Comments:c1",
          createdById: "Users:u0",
          specId: 'lv1'
        }]
      }]);
    });
  });

  describe('spec ids', function() {
    it('should utilize spec ids when prioritizing', function() {
      var config = {
        Users: [{
          username: 'bob',
          specId: 'myId'
        }, {
          username: 'Challenges:c0:name',
          specId: 'u1'
        }],
        Challenges: [{
          createdById: 'Users:myId',
          name: 'my challenge',
          specId: 'c0'
        }]
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob',
          specId: 'myId'
        }]
      }, {
        Challenges: [{
          name: 'my challenge',
          createdById: 'Users:myId',
          specId: 'c0'
        }]
      }, {
        Users: [{
          username: 'Challenges:c0:name',
          specId: 'u1'
        }]
      }]);
    });
  });

  describe('arrays', function() {
    it('should take arrays into account when prioritizing', function() {
      var config = {
        has_integer: {
          integer: 9,
          specId: 'hi0'
        },
        needs_integer: [{
          integers: ['has_integer:hi0:integer', 4],
          specId: 'ni0'
        }]
      };

      expect(prioritize(config)).to.eql([{
        has_integer: [{
          integer: 9,
          specId: 'hi0'
        }]
      }, {
        needs_integer: [{
          integers: ['has_integer:hi0:integer', 4],
          specId: 'ni0'
        }]
      }]);
    });
  });

  describe('errors', function() {
    it('should return an error if a dependency does not exist', function() {
      var config = {
        Users: {
          username: 'bob',
          specId: 'u0'
        },
        Challenges: [{
          createdById: 'Tasks:t0',
          name: 'my challenge',
          specId: 'c0'
        }]
      };

      var result = prioritize(config);
      expect(result).to.be.an.instanceOf(Error);
      expect(result.toString()).to.contain("Tasks:t0");
    });

    it('should return an error if a dependency is out of bounds', function() {
      var config = {
        Users: {
          username: 'bob',
          specId: 'u0'
        },
        Challenges: [{
          createdById: 'Users:u1',
          name: 'my challenge',
          specId: 'c0'
        }]
      };

      expect(prioritize(config)).to.be.an.instanceOf(Error);
    });
  });
});
