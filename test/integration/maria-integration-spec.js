var bluebird = require('bluebird');
var FixtureGenerator = require('../../lib/fixture-generator');
var specs = require('./integration-specs');

var dbConfig = {
  client: 'mysql',
  connection: {
    host: process.env.DOCKER_IP || 'maria',
    user: 'testdb',
    password: 'password',
    database: 'testdb',
    port: Number(process.env.DOCKER_PORT || 3306)
  }
};

describe("maria integration tests", function() {
  this.timeout(0);

  specs(dbConfig);

  // issue 31 was reported against Maria, may not be Maria specific
  // TODO: make this a general spec for all databases

  describe("issue 31", function() {
    before(function() {
      this.fixtureGenerator = new FixtureGenerator(dbConfig);
      this.knex = this.fixtureGenerator.knex;
    });

    after(function(done) {
      this.fixtureGenerator.destroy(done);
    });

    beforeEach(function(done) {
      var knex = this.knex;

      var dropPromises = [
        knex.schema.dropTableIfExists('C'),
        knex.schema.dropTableIfExists('B'),
        knex.schema.dropTableIfExists('A')
      ];

      bluebird.all(dropPromises).then(function() {
        knex.raw([
          'create table A(',
            'id tinyint unsigned auto_increment primary key,',
            'title varchar(30) not null,',
            'unique(title)',
          ')'
        ].join(' ')).then(function() {
          knex.raw([
            'create table B(',
              'id smallint unsigned auto_increment primary key,',
              'title varchar(30) not null,',
              'description varchar(500) not null,',
              'created datetime not null,',
              'a_id tinyint unsigned not null,',
              'unique(title),',
              'constraint B_A_a_id_id',
              'foreign key (a_id)',
              'references A (id)',
              'on delete cascade',
              'on update restrict',
            ')'
          ].join(' ')).then(function() {
            knex.raw([
              'create table C(',
                'id smallint unsigned not null,',
                'b_id smallint unsigned not null,',
                'data varchar(1000) not null,',
                'primary key (id, b_id),',
                'constraint C_B_b_id_id',
                'foreign key (b_id)',
                'references B (id)',
                'on delete cascade',
                'on update restrict',
              ')'
            ].join(' ')).then(function() {
              done();
            });
          });
        });
      });
    });

    it('should insert the data', function(done) {
      var dataSpec = {
        A: [
          { title: 'A1' },
          { title: 'A2' },
          { title: 'A3' }
        ],
        B: [
          { title: 'B1', description: 'D1', created: new Date(), a_id: 'A:0' },
          { title: 'B2', description: 'D2', created: new Date(), a_id: 'A:0' },
          { title: 'B3', description: 'D3', created: new Date(), a_id: 'A:1' },
          { title: 'B4', description: 'D4', created: new Date(), a_id: 'A:1' },
          { title: 'B5', description: 'D5', created: new Date(), a_id: 'A:2' }
        ],
        C: [
          { id: 1, b_id: 'B:0', data: 'Test 1' },
          { id: 2, b_id: 'B:0', data: 'Test 2' },
          { id: 3, b_id: 'B:0', data: 'Test 3' },
          { id: 4, b_id: 'B:0', data: 'Test 4' },
          { id: 5, b_id: 'B:0', data: 'Test 5' }
        ]
      };

      this.fixtureGenerator.create(dataSpec).bind(this).then(function(results) {
        this.knex('C').where('id', results.C[0].id).then(function(result) {
          expect(result[0].id).to.eql(1);
          expect(result[0].b_id).to.eql(results.B[0].id);
          expect(result[0].data).to.eql('Test 1');

          expect(results.B[2].title).to.eql('B3');
          expect(results.B[2].description).to.eql('D3');
          expect(results.B[2].a_id).to.eql(results.A[1].id);
          done();
        });
      });
    });
  });
});
