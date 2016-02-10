# Integration Tests

There is a simple integration test suite that runs against Postgres, MySQL, Maria and sqlite.

It is located at `test/integration`. The actual specs live in `integration-specs.js`, and each of the database specific suites invoke these specs, passing in their database specific knex config.

Each database specific spec file can also have its own specs, postgres does this to test out array support for example.

## Need a quick smoke test?

sqlite is your friend, `gulp test:integration:sqlite` is a quick easy way to run tests that hit an actual database. It should require no setup, just call it.

## Setting up the environment

Docker containers provide the database engines. Getting these running is not too bad, but will take a while the first time.

1. [Install Fig](http://www.fig.sh/install.html) -- these instructions also show how to install Docker, which you will also need.
  * If you are on OSX, run `$(boot2docker shellinit)` to get your shell set up to talk with the Docker VM
1. from the root of sql-fixtures, run `fig up -d`
  * go get some coffee, this will take a long time the first time


## Running the tests

Once the environment is up, you can run the tests with, where DOCKER_IP is `localhost` on linux or whatever `boot2docker ip` tells you for OSX (I've never tried any of this on Windows).

### postgres
DOCKER_IP=<DOCKER_IP> DOCKER_PORT=15432 gulp test:integration:postgres

### mysql
DOCKER_IP=<DOCKER_IP> DOCKER_PORT=13306 gulp test:integration:mysql

### maria
DOCKER_IP=<DOCKER_IP> DOCKER_PORT=13307 gulp test:integration:maria

## Cleaning things up

To clean up the containers Fig is managing: `fig stop && fig rm`

To clean up all Docker containers: `docker rm $(docker ps -q -a)`

## Debugging with node-inspector

1. fig up -d
1. `node-inspector`
1. `DOCKER_IP=<host ip> DOCKER_PORT=<port> node --debug-brk $(which gulp) test:integration:<postgres, mysql or maria>`
  * see above section for database specific values
1. Head to node-inspector and debug as usual.
