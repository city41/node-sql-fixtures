# Integration Tests

There is a simple integration test suite that runs against Postgres, MySQL, Maria and sqlite.

It is located at `test/integration`. The actual specs live in `integration-specs.js`, and each of the database specific suites invoke these specs, passing in their database specific knex config.

Each database specific spec file can also have its own specs, postgres does this to test out array support for example.

## Need a quick smoke test?

sqlite is your friend, `gulp test:integration:sqlite` is a quick easy way to run tests that hit an actual database. It should require no setup, just call it.

## Running Postgres, MySQL and/or Maria integration tests using Docker and Fig

Docker containers provide the database engines. Getting these running is not too bad, but will take a while the first time.

1. [Install Fig](http://www.fig.sh/install.html) -- these instructions also show how to install Docker, which you will also need.
  * If you are on OSX, run `$(boot2docker shellinit)` to get your shell set up to talk with the Docker VM
1. from the root of sql-fixtures, run `fig up`
  * go get some coffee, this will take a long time the first time
  * You should see a lot of output, including running all the tests

## Running the tests ad hoc

For example, to just run the postgres tests: `fig run node gulp test:integration:postgres`

This will spin up Docker containers as needed then run the postgres integration tests inside the Node container.

Fig will spin up a new container, run the command, then leave the container hanging around. To delete it do `docker rm <container id>`, and you can get the id from `docker ps -a`. If you just want to clean up all containers, then `docker rm $(docker ps -q -a)`

## Cleaning things up

To clean up the containers Fig is managing: `fig stop && fig rm`

To clean up all Docker containers: `docker rm $(docker ps -q -a)`

## Debugging with node-inspector

To do this, you need to run the db you're working with inside Docker, and the tests outside of Docker.

1. fig up -d <pg or mysql>
1. `node-inspector`
1. `DOCKER_IP=<host ip> DOCKER_PORT=<port> node --debug-brk $(which gulp) test:integration:<postgres, mysql or maria>`
  * where ...
    * DOCKER_IP is `localhost` on linux or whatever `boot2docker ip` tells you for OSX
    * on OSX, you can do this `DOCKER_HOST=$(boot2docker ip 2> /dev/null)`
    * DOCKER_PORT is `15432` for postgres or `13306` for mysql or `13307` for Maria
1. Head to node-inspector and debug as usual.
