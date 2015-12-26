'use strict';

var gulp = require('gulp');

gulp.task('concat', function() {
  return gulp.src('lib/**/*.js')
    .pipe(concat({ path: 'build/concat.js', stat: { mode: '0666' }}))
    .pipe(gulp.dest('./build'));
});