# sql-fixtures

Easily generate data that gets saved in the database, with foreign key dependencies automatically resolved. Ideal for integration tests and generating dummy data

# Supported Databases

PostgreSQL, MySQL, MariaDB and sqlite

Thanks to using [Knex.js](http:/www.knexjs.org) internally.

**NOTE:** I've only used this on postgres 9.3, works great. If you use it on another database, please let me know how it goes.

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
  Users: [
    { username: 'bob' },
    { username: 'sally' }
  ]
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
  console.log(result.Items[0].userId === result.Users[0].id); // true
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

## Resolving using spec ids

If you are generating a lot of data, indices can become tedious. You can use a `specId` instead.

```javascript
var dataSpec = {
  Users: {
    username: 'bob',
    specId: 'mySpecialUser'
  },
  Items: {
    // this resolves to bob's id
    // at creation time
    userId: 'Users:mySpecialUser',
    name: 'shovel'
  }
};

var dbConfig = {...}; // see below
sqlFixtures.create(dbConfig, dataSpec, function(err, result) {
  console.log(result.Items[0].userId === result.Users[0].id); // true
});
```

## Resolving other properties
When using a resolution string (ie `Users:0`), it assumes you want the `id` property. (See below for more info on "id" columns)

If you want to resolve to another column, add it to the string:

```javascript
var dataSpec = {
  Users: [
    { username: 'bob' },
    { username: 'Users:0:username' }
  ]
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

**IMPORTANT:** Currently the result of the arbitrary sql is not returned to you at all. In the above example the returned `result` object will have `Users` on it, but no sign of `Items` anywhere.

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

## String values with colons in them

If you need a literal colon in your string value, double it up to escape it:

```javascript
var dataSpec = {
  Website: {
    // https://github.com is what gets written to the database
    url: 'https:://github.com'
  }
};
```

# Promises and Callbacks

Both are supported, promises created by [Bluebird](https://github.com/petkaantonov/bluebird) are returned

```javascript
sqlFixtures.create(dbConfig, dataSpec, function(err, result) {
});

// ... or ...

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

# Cleaning up and disconnecting from the database

__Warning: Destructive__

If you want to clean up the data added to the database in your `after` block, you can use the `destroy` method. This
will __cascade truncate__ the tables sqlFixtures inserted data into before disconnecting from the database.
`destroy` takes a callback and also returns a promise.

# Creating an instance of sql-fixtures
If you need Knex right away, you can create an instance of a sql-fixtures object

```javascript
  var sqlFixtures = require('sql-fixtures');
  var fixtureCreator = new sqlFixtures(dbConfig);
  // fixtureCreator.knex is now available and ready to go
  fixtureCreator.create(dataSpec, callback); // like normal, minus the dbConfig argument
```

If you don't need this, ignore it, just use sql-fixtures in the normal fashion

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
