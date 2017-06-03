# sql-fixtures

Easily generate data that gets saved in the database, with foreign key dependencies automatically resolved. Ideal for integration tests and generating dummy data. Uses [knex](http://knexjs.org) internally.

# dormant but stable

sql-fixtures is not actively being worked on anymore, because it's pretty much done. I will still support it if any issues arise.

# Supported Databases

| Database  | Works?   | As of version | Integration Tests? | Usage                                      |
|-----------|----------|---------------|--------------------|--------------------------------------------|
| Postgres  | Yes      | 0.0.0         | [Yes](https://github.com/city41/node-sql-fixtures/blob/master/test/integration/postgres-integration-spec.js) | several projects known   |
| MySQL     | Yes* | 0.4.0         | [Yes](https://github.com/city41/node-sql-fixtures/blob/master/test/integration/mysql-integration-spec.js) | several projects known |
| sqlite3   | Yes* | 0.3.0         | [Yes](https://github.com/city41/node-sql-fixtures/blob/master/test/integration/sqlite-integration-spec.js) | one known project |
| MariaDB   | Yes**  | 0.7.0   | [Yes](https://github.com/city41/node-sql-fixtures/blob/master/test/integration/maria-integration-spec.js) | no known projects :( |

*For MySQL and Maria you can run into issues for [tables that lack a singular primary key](http://city41.github.io/node-sql-fixtures/#no-primary-key-warning).

**For sqlite, you can hit the same issue as MySQL and Maria above if you create your tables using "without rowid"

# Install

`npm install sql-fixtures`

# Simple Example

```javascript
var sqlFixtures = require('sql-fixtures');

// depending on which database engine you are using
// this is a typical PostgreSQL config for the pg driver
var dbConfig = {
  client: 'pg',
  connection: {
    host: 'localhost',
    user: 'testdb',
    password: 'password',
    database: 'testdb',
    port: 15432
  }
};

var dataSpec = {
  users: {
    username: 'Bob',
    email: 'bob@example.com'
  }
};

sqlFixtures.create(dbConfig, dataSpec, function(err, result) {
  // at this point a row has been added to the users table
  console.log(result.users[0].username);
});
```

# Documentation and Examples

Are available at the [sql-fixtures website](http://city41.github.io/node-sql-fixtures)

# Contributing
**NOTE:** I am hesitant to add more features at this point. I feel sql-fixtures is feature complete now and I want to keep it a small, focused module. If you have an idea for a feature you want to implement, please contact me first.

Please fork and send pull requests in the typical fashion.

There are both unit and integration tests. The unit tests are invoked with `gulp test:unit`.

Checkout integration_tests.md for the scoop on the integration tests.
