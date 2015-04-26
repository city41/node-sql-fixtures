var isPostgres = require('../../lib/is-postgres');

describe('is-postgres', function() {
  describe('not a knex object', function() {
    it('should say it is not postgres', function() {
      expect(isPostgres({})).to.be.false;

      var notKnex = {
        client: {}
      };

      expect(isPostgres(notKnex)).to.be.false;
    });
  });

  describe('dialect', function() {
    it('should indicate it is postgres if the dialect says so', function() {
      var knex = {
        client: {
          connectionSettings: true,
          dialect: "postgresql"
        }
      };

      expect(isPostgres(knex)).to.be.true;
    });

    it('should not say it is postgres if the dialect is something else', function() {
      var knex = {
        client: {
          connectionSettings: true,
          dialect: "mysql"
        }
      };

      expect(isPostgres(knex)).to.be.false;
    });

    it('should indicate it is postgres if the dialect says so but other things dont', function() {
      var knex = {
        client: {
          connectionSettings: "somethingelse",
          dialect: "postgresql"
        }
      };

      expect(isPostgres(knex)).to.be.true;
    });
  });

  describe('host object', function() {
    it('should indicate it is postgres if found in the host', function() {
      var knex = {
        client: {
          connectionSettings: {
            host: "postgres:foobar"
          }
        }
      };

      expect(isPostgres(knex)).to.be.true;
    });

    it('should not indicate it is postgres if not found in the host', function() {
      var knex = {
        client: {
          connectionSettings: {
            host: "somethingelse"
          }
        }
      };

      expect(isPostgres(knex)).to.be.false;
    });
  });

  describe('string connectionSettings', function() {
    it('should indicate it is postgres if it is found in the connection string', function() {
      var knex = {
        client: {
          connectionSettings: "postgres:foobar"
        }
      };

      expect(isPostgres(knex)).to.be.true;
    });

    it('should not indicate it is postgres if not found in the connection string', function() {
      var knex = {
        client: {
          connectionSettings: "mysql:foobar"
        }
      };

      expect(isPostgres(knex)).to.be.false;
    });
  });
});

