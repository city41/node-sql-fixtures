# sql-fixtures

Easily generate data that gets saved in the database, with foreign key dependencies automatically resolved. Ideal for integration tests and generating dummy data. Uses [knex](http://knexjs.org) internally.

# Supported Databases

| Database  | Works?   | As of version | Details                                                         |
|-----------|----------|---------------|-----------------------------------------------------------------|
| Postgres  | Yes      | 0.0.0         | Integration tests and several known projects using it   |
| MySQL     | Yes | 0.4.0         | Integration tests for MySQL exist, and several known projects using it |
| sqlite3   | Yes | 0.3.0         | Integration tests for sqlite exist, and one known project using it |
| MariaDB   | Probably  | 0.7.0   | Integration tests for Maria exist, no known projects using sql-fixtures with Maria |

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
Please fork and send pull requests in the typical fashion.

There are both unit and integration tests. The unit tests are invoked with `gulp test:unit`.

Checkout integration_tests.md for the scoop on the integration tests.

# Road to 1.0.0

These things remain to accomplish "one point oh"

* better error reporting when a dependency can't be resolved
* MySQL, Maria and SQLite can fail in some unusual scenarios due to the way they do inserts. Finding a solid fix for this would be good. So far the fixes just minimize the number of broken use cases, but there are is still at least one broken scenario lurking.
