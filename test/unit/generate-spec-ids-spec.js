var generateSpecIds = require('../../lib/generate-spec-ids');

describe('generate-spec-ids', function() {
  describe('generating spec ids', function() {
    it('should generate ids for a simple case', function() {
      var config = {
        Users: {
          username: 'bob'
        }
      };

      var generated = generateSpecIds(config);

      expect(generated).not.to.equal(config);
      expect(generated.Users.username).to.eql('bob');
      expect(generated.Users.specId).to.be.a('string');
    });

    it('should generate ids for a dependency case', function() {
      var config = {
        Users: {
          username: 'bob'
        },
        Items: [{
          userId: "Users:0",
          name: "my item"
        }, {
          name: "Items:0:name"
        }]
      };

      var generated = generateSpecIds(config);

      expect(generated).not.to.equal(config);
      expect(generated.Users.username).to.eql('bob');
      expect(generated.Items[0].name).to.eql('my item');
      expect(generated.Users.specId).to.be.a('string');

      var expectedUserId = "Users:" + generated.Users.specId;
      expect(generated.Items[0].userId).to.eql(expectedUserId);


      expect(generated.Items[0].specId).to.be.a('string');
      var expectedNameId = "Items:" + generated.Items[0].specId + ":name";
      expect(generated.Items[1].name).to.eql(expectedNameId);
    });

    it('should generate ids for sql strings', function() {
      var config = {
        Users: [{
          username: 'bob'
        }, {
          username: 'sally'
        }],
        sql: 'foo {Users:0} {Users:0} {Users:1}'
      };

      var generated = generateSpecIds(config);
      var user0SpecId = generated.Users[0].specId;
      var user1SpecId = generated.Users[1].specId;
      var expectedSql = 'foo {Users:' + user0SpecId +'} {Users:' + user0SpecId +'} {Users:' + user1SpecId + '}';
      expect(generated.sql).to.eql(expectedSql);
    });

    it('should generate ids for array values', function() {
      var config = {
        has_integer: [{
          integer: 9
        }],
        needs_integer: [{
          integers: ['has_integer:0:integer', 4]
        }]
      };

      var generated = generateSpecIds(config);

      var expectedSpecId = generated.has_integer[0].specId;
      expect(generated.needs_integer[0].integers).to.eql([
        'has_integer:' + expectedSpecId + ':integer',
        4
      ]);
    });
  });
});
