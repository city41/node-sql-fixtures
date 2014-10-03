var prioritize = require('../../lib/prioritize');

describe('prioritize', function() {
  describe('prioritizing', function() {
    it('should prioritize a simple case', function() {
      var config = {
        Users: {
          username: 'bob'
        }
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob'
        }]
      }]);
    });

    it('should prioritize with one dependency', function() {
      var config = {
        Users: {
          username: 'bob'
        },
        Challenges: [{
          createdById: 'Users:0',
          name: 'my challenge'
        }]
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob'
        }]
      }, {
        Challenges: [{
          name: 'my challenge',
          createdById: 'Users:0'
        }]
      }]);
    });

    it('should prioritize later dependencies correctly', function() {
      var config = {
        Users: [{
          username: 'bob'
        }, {
          username: 'Challenges:0:name'
        }],
        Challenges: [{
          createdById: 'Users:0',
          name: 'my challenge'
        }]
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob'
        }]
      }, {
        Challenges: [{
          name: 'my challenge',
          createdById: 'Users:0'
        }]
      }, {
        Users: [{
          username: 'Challenges:0:name'
        }]
      }]);
    });

    it('should prioritize sql dependencies correctly', function() {
      var config = {
        Users: {
          username: 'bob'
        },
        Items: {
          name: 'my item',
          userId: 'Users:0'
        },
        sql: 'foo {Users:0} {Items:0}'
      };

      expect(prioritize(config)).to.eql([{
        Users: [{
          username: 'bob'
        }]
      }, {
        Items: [{
          name: 'my item',
          userId: 'Users:0'
        }]
      }, {
        sql: ['foo {Users:0} {Items:0}']
      }]);
    });

    it('should prioritize a more advanced case', function() {
      var config = {
        Users: [
          { username: "bob" }
        ],
        Comments: [{
          comment: 'comment 1',
          createdById: "Users:0",
          userId: "Users:0"
        }, {
          comment: 'child of 1',
          createdById: "Users:0",
          userId: "Users:0",
          parentId: "Comments:0"
        }],
        LikeVotes: [{
          commentId: "Comments:0",
          createdById: "Users:0"
        }, {
           commentId: "Comments:1",
           createdById: "Users:0"
        }]
      };

      debugger;
      expect(prioritize(config)).to.eql([
      {
        Users: [
          { username: "bob" }
        ],
      },
      {
        Comments: [{
          comment: 'comment 1',
          createdById: "Users:0",
          userId: "Users:0"
        }]
      },
      {
        Comments: [{
          comment: 'child of 1',
          createdById: "Users:0",
          userId: "Users:0",
          parentId: "Comments:0"
        }],
        LikeVotes: [{
          commentId: "Comments:0",
          createdById: "Users:0"
        }]
      },
      {
        LikeVotes: [{
          commentId: "Comments:1",
          createdById: "Users:0"
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
          username: 'Challenges:0:name'
        }],
        Challenges: [{
          createdById: 'Users:myId',
          name: 'my challenge'
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
          createdById: 'Users:myId'
        }]
      }, {
        Users: [{
          username: 'Challenges:0:name'
        }]
      }]);
    });
  });

  describe('errors', function() {
    it('should return an error if a dependency does not exist', function() {
      var config = {
        Users: {
          username: 'bob'
        },
        Challenges: [{
          createdById: 'Tasks:0',
          name: 'my challenge'
        }]
      };

      var result = prioritize(config);
      expect(result).to.be.an.instanceOf(Error)
      expect(result.toString()).to.contain("Tasks:0")
    });

    it('should return an error if a dependency is out of bounds', function() {
      var config = {
        Users: {
          username: 'bob'
        },
        Challenges: [{
          createdById: 'Users:1',
          name: 'my challenge'
        }]
      };

      expect(prioritize(config)).to.be.an.instanceOf(Error)
    });
  });
});
