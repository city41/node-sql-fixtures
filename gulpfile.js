var gulp = require('gulp');
var mocha = require('gulp-mocha');
var shell = require('gulp-shell');
var jshint = require('gulp-jshint');

function runSpecs(path) {
  return gulp.src([
    './test/helpers/*.js',
    path
  ])
  .pipe(mocha());
}

gulp.task('lint', function() {
  return gulp.src(['./lib/**/*.js', './test/**/*.js'])
   .pipe(jshint({ loopfunc: true, expr: true }))
   .pipe(jshint.reporter('default'))
   .pipe(jshint.reporter('fail'));
});

gulp.task('test:unit', ['lint'], function() {
  return runSpecs('./test/unit/*.js');
});

gulp.task('test:integration:postgres', function() {
  return runSpecs('./test/integration/postgres*.js');
});

gulp.task('test:integration:mysql', function() {
  return runSpecs('./test/integration/mysql*.js');
});

gulp.task('test:integration:maria', function() {
  return runSpecs('./test/integration/maria*.js');
});

gulp.task('delete:sqlite', shell.task(['rm -f ./sqlite-integration-spec.db']));

gulp.task('test:integration:sqlite', ['delete:sqlite'], function() {
  return runSpecs('./test/integration/sqlite*.js');
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
