'use strict';

var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserify = require('browserify');
var watchify = require('watchify');
var babel = require('babelify');

function compile(watch) {
// browserify -r material -x mout -x elements/zen -x elements/base -x prime -x mout -x mout/array/every -x mout/array/indexOf -x mout/lang/toString -x mout/array/filter -x mout/array/forEach -x mout/array/map -x mout/array/every -x mout/lang/kindOf -x mout/number/toInt -x mout/time/now -x mout/string/pascalCase -x elements -x moofx 
	var bundler = watchify(browserify('./lib/index.js', { debug: true })
	.ignore('mout')
	.ignore('prime')
	.ignore('elements')
	.ignore('moofx')
	.transform(babel));

	function rebundle() {
		bundler.bundle()
			.on('error', function(err) { console.error(err); this.emit('end'); })
			.pipe(source('material.js'))
			.pipe(buffer())
			.pipe(sourcemaps.init({ loadMaps: true }))
			.pipe(sourcemaps.write('./'))
			.pipe(gulp.dest('./material'));
	}

	if (watch) {
		bundler.on('update', function() {
			console.log('-> bundling...');
			rebundle();
		});
	}

	rebundle();
}

function watch() {
	return compile(true);
};

gulp.task('build', function() { return compile(); });
gulp.task('watch', function() { return watch(); });

gulp.task('default', ['watch']);