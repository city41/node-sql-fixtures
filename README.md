# sql-fixtures

Easily generate data that gets saved in the database, with foreign key dependencies automatically resolved. Ideal for integration tests and generating dummy data. Uses [knex](http://knexjs.org) internally.

# Supported Databases

| Database  | Works?   | As of version | Details                                                         |
|-----------|----------|---------------|-----------------------------------------------------------------|
| Postgres  | Yes      | 0.0.0         | Integration tests and two known projects using it (using 9.3)   |
| MySQL     | Yes | 0.4.0         | Integration tests for MySQL exist, and one known project using it |
| sqlite3   | Yes | 0.3.0         | Integration tests for sqlite exist, and one known project using it |
| MariaDB   | Probably  | 0.7.0   | Integration tests for Maria exist, no known projects using sql-fixtures with Maria |

# Install

`npm install sql-fixtures`

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
