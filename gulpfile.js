var gulp = require('gulp');
var mocha = require('gulp-mocha');
var shell = require('gulp-shell');
var jshint = require('gulp-jshint');

gulp.task('lint', function() {
  return gulp.src(['./lib/**/*.js', './test/**/*.js'])
   .pipe(jshint({ loopfunc: true, expr: true }))
   .pipe(jshint.reporter('default'))
   .pipe(jshint.reporter('fail'));
});

gulp.task('test:unit', ['lint'], function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/unit/*.js'
  ])
    .pipe(mocha());
});

gulp.task('reset:db:postgres', shell.task([
    'PGUSER=testdb PGPASSWORD=password psql -h localhost -p 15432 postgres -c "drop database if exists testdb"',
    'PGUSER=testdb PGPASSWORD=password psql -h localhost -p 15432 postgres -c "create database testdb with owner testdb"'
  ])
);

gulp.task('reset:db:mysql', shell.task([
    'mysql -h 192.168.59.103 -u admin -ppassword -e "drop database if exists testdb; create database testdb;"'
  ])
);

gulp.task('test:integration:postgres', ['reset:db:postgres'], function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/integration/postgres*.js'
  ])
    .pipe(mocha());
});

gulp.task('test:integration:mysql', ['reset:db:mysql'], function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/integration/mysql*.js'
  ])
    .pipe(mocha());
});

gulp.task('delete:sqlite', shell.task(['rm -f ./sqlite-integration-spec.db']));

gulp.task('test:integration:sqlite', ['delete:sqlite'], function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/integration/sqlite*.js'
  ])
  .pipe(mocha());
});

gulp.task('test:integration', [
  'test:integration:sqlite',
  'test:integration:postgres',
  'test:integration:mysql'
])

gulp.task('test', [
  'lint',
  'test:unit',
  'test:integration'
]);
