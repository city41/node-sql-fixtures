var gulp = require('gulp');
var mocha = require('gulp-mocha');


gulp.task('test', function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/specs/*.js'
  ])
    .pipe(mocha());
});
