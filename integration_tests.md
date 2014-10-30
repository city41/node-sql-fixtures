# Integration Tests

There is a simple integration test suite that runs against Postgres, sqlite and MySQL.

It is located at `test/integration`. The actual specs live in `integration-specs.js`, and each of the database specific suites invoke these specs, passing in their database specific knex config.

## Need a quick smoke test?

sqlite is your friend, `gulp test:integration:sqlite` is a quick easy way to run tests that hit an actual database. It should require no setup, just call it.

## Setting up Postgres

The postgres databse is handled via Vagrant. This should be temporary and it should be a Docker container soon, when I get a chance to make the switch.

To run the postgres tests:

1. Install [Vagrant](https://www.vagrantup.com/)
  * You probably need [VirtualBox too](https://www.virtualbox.org/)
1. Sadly you will need a `psql` installed on your main box as well. That's generally done by installing Postgres for your OS. I hope to remove this dependency, as it sucks.
1. `vagrant up`
  * This can take a while the first time, but should succeed
1. `gulp test:integration:postgres`
1. `vagrant halt` (or `vagrant destroy`)


## MySQL

MySQL is setup via Docker. Here's what you need to do

1. Install `mysql` on your main box
1. `git submodule init`
1. Install [Docker](https://docs.docker.com/installation/) for your OS
1. start up docker (and boot2docker if needed)
1. `docker build -t tutum/mysql docker/mysql/5.5/`
1. `docker run -d -p 3306:3306 -e MYSQL_PASS="password" tutum/mysql`
1. `gulp test:integration:mysql`

To stop docker

1. `docker ps` -- find the id of the mysql container
2. `docker stop <the id>`

## TODO

1. Don't require mysql and postgres to be installed on the main box [#13](https://github.com/city41/node-sql-fixtures/issues/13)
1. Switch Postgres over to Docker [#12](https://github.com/city41/node-sql-fixtures/issues/12)
1. Automate starting Docker containers

## Not feeling this madness?

I understand, it's a lot to ask to set all this up. But if you are hacking on sql-fixtures, at the very least please run `gulp test:integration:sqlite` and `gulp test:unit`, that should be painless and easy. I can ensure MySql and Postgres are happy before cutting a new release.
