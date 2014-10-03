var gulp = require('gulp');
var mocha = require('gulp-mocha');
var shell = require('gulp-shell');
var jshint = require('gulp-jshint');

gulp.task('lint', function() {
  return gulp.src(['./lib/**/*.js', './test/**/*.js'])
   .pipe(jshint({ loopfunc: true, expr: true }))
   .pipe(jshint.reporter('default'));
});

gulp.task('test:unit', function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/unit/*.js'
  ])
    .pipe(mocha());
});

gulp.task('reset:db', shell.task(
  [
    'PGUSER=testdb PGPASSWORD=password psql -h localhost -p 15432 postgres -c "drop database testdb"',
    'PGUSER=testdb PGPASSWORD=password psql -h localhost -p 15432 postgres -c "create database testdb with owner testdb"'
  ])
);

gulp.task('test:integration', ['reset:db'], function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/integration/*.js'
  ])
    .pipe(mocha());
});

gulp.task('test', [
  'lint',
  'test:unit',
  'test:integration'
]);
