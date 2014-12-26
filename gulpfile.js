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

gulp.task('test:integration:postgres', function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/integration/postgres*.js'
  ])
    .pipe(mocha());
});

gulp.task('test:integration:mysql', function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/integration/mysql*.js'
  ])
    .pipe(mocha());
});

gulp.task('test:integration:maria', function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/integration/maria*.js'
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
  'test:integration:mysql',
  'test:integration:maria'
])

gulp.task('test', [
  'lint',
  'test:unit',
  'test:integration'
]);
