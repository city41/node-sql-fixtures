# sql-fixtures

Easily generate data that gets saved in the database, with foreign key dependencies automatically resolved. Ideal for integration tests and generating dummy data

# Supported Databases

Internally sql-fixtures uses [Knex.js](http://knexjs.org/) and so it supports any database Knex.js does: sqlite, MySQL, MariaDB and PostgreSQL. However, so far only PostgreSQL has been tested directly. If you use this on other databases, please let me know if you have problems or successes.

# Install

`npm install sql-fixtures`

# Examples
## Hello World Example

```javascript
var sqlFixtures = require('sql-fixtures');

var dataSpec = {
  // the key must exactly match the name
  // of the table in the database
  Users: {
    // these properties must match column names exactly
    username: 'bob'
  }
};

var dbConfig = {...}; // see "Connecting to the database" below

sqlFixtures.create(dbConfig, dataSpec, function(err, result) {
  // database now contains one more row in the Users table

  // result contains an in memory representation of what
  // got placed into the database
  console.log(result.Users[0].username);
});
```

## Multiple Records
Just turn the object into an array if more than one is needed

```javascript
var dataSpec = {
  Users: [{
    username: 'bob'
  }, {
    username: 'sally'
  }]
};
```

## Records with Foreign Key Dependencies (1 to many)
This is the real reason this library exists

```javascript
var dataSpec = {
  Users: {
    username: 'bob'
  },
  Items: {
    // this resolves to bob's id
    // at creation time
    userId: 'Users:0',
    name: 'shovel'
  }
};

var dbConfig = {...}; // see below
sqlFixtures.create(dbConfig, dataSpec, function(err, result) {
  console.log(result.Items[0].userId == result.Users[0].id); // true
});
```

This resolution can be arbitrarily complex

```javascript
var dataSpec = {
  Users: {
    username: 'bob'
  },
  Items: {
    // this resolves to bob's id
    // at creation time
    userId: 'Users:0',
    name: 'shovel'
  },
  Price: {
    userId: 'Users:0',
    itemId: 'Items:0',
    value: 12
  }
};
```

## Resolving other properties
When using a resolution string (ie `Users:0`), it assumes you want the `id` property. (See below for more info on "id" columns)

If you want to resolve to another column, add it to the string:

```javascript
var dataSpec = {
  Users: [{
    username: 'bob'
  }, {
    username: 'Users:0:username'
  }]
};
```

Both of the above users will have the username "bob".

## Arbitrary SQL

Arbitrary sql can be invoked with the `sql` key. It also supports resolution. The SQL is truly arbitrary and must be in the format of whatever database you are using. Once any needed resolution happens, the resulting string is handed as is to the database.

```javascript
var dataSpec = {
  Users: {
    username: 'bob'
  },
  sql: 'insert into "Items" ("name", "userId") values (\'shovel\', {Users:0})'
};
```

**IMPORTANT:** The result of the arbitrary sql is not returned to you at all. In the above example the returned `result` object will have `Users` on it, but no sign of `Items` anywhere.

## Many to Many Relations
Many to many through a join table is doable

```javascript
var dataSpec = {
  Items: [
    { name: 'apple' },
    { name: 'tomato' }
  ],
  Categories: [
    { name: 'fruit' },
    { name: 'vegetable' }
  ],
  Categories_Items: [
    { itemId: 'Items:0', categoryId: 'Categories:0' },
    { itemId: 'Items:1', categoryId: 'Categories:0' },
    { itemId: 'Items:1', categoryId: 'Categories:1' }
  ]
};
```

# Promises and Callbacks

Both are supported, promises created by [Bluebird](https://github.com/petkaantonov/bluebird) are returned

```javascript
sqlFixtures.create(dbConfig, dataSpec, function(err, result) {
});

// ... or ...

// both then and done are available, internally
sqlFixtures.create(dbConfig, dataSpec).done(function(result) {
}, function(err) {
});
```
# Connecting to the database
`sqlFixtures.create()`'s first argument is a dbConfig object. This is passed directly to Knex. See [Knex's docs on configuration](http://knexjs.org/#Installation-client) for the details, but generally you just need to do this:

```javascript
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

sqlFixtures.create(dbConfig, dataSpec) ...
```

# Disconnecting from the database

sqlFixtures opens a connection to your database using Knex and does not attempt to ever close it. You can close it yourself by calling `sqlFixtures.disconnect(callback)`. `disconnect` takes a callback and also returns a promise.

# Assumptions and Limitations

* sql-fixtures assumes your tables have an "id" column which is that table's primary key. Any other primary key approach will not work.
* sql-fixtures has no means of deleting data, tables or databases. If you want to use Knex for that, you can always grab it at `sqlFixtures.knex`.
* sql-fixtures is not secure at all, it assumes it's always working on a dev/test database where security is not necessary

# Contributing
Please fork and send pull requests in the typical fashion.

There are both unit and integration tests. The unit tests are invoked with `gulp test:unit`.

## Integration tests

The integration tests use PostgreSQL. Vagrant is used to bring up a pg server.

```
vagrant up
gulp test:integration
vagrant halt (or destroy)
```

`gulp test` will run both unit and integration tests
