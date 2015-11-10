
module.exports = function(grunt) {
	'use strict';

	grunt.config.merge({
		browserify: {
		  dist: {
			files: {
			  'dist/demo/bundle.js': 'dist/demo/main.js'
			},
			options: {
				debug: 'd'
			}
		  }
		}
	});


	grunt.registerTask('browserify', ['browserify:dist']);
	grunt.loadNpmTasks('grunt-browserify');
}

