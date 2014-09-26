var gulp = require('gulp');
var mocha = require('gulp-mocha');


gulp.task('test:unit', function() {
  return gulp.src([
    './test/helpers/*.js',
    './test/unit/*.js'
  ])
    .pipe(mocha());
});
