'use strict';

const gulp = require('gulp');
const ngAnnotate = require('gulp-ng-annotate');
const minify = require('gulp-minify');
const uglify = require('gulp-uglify');

gulp.task('build', () => {
  const client = gulp
   .src([ 'src/client/**.js' ],
     { base: './src/client' })
   .pipe(ngAnnotate())
   .pipe(minify())
   .pipe(uglify())
   .pipe(gulp.dest('public/js'));
});
