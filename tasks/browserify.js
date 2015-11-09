
module.exports = function(grunt) {
	'use strict';

	grunt.config.merge({
		browserify: {
		  dist: {
			files: {
			  'public/demo/bundle.js': 'public/demo/main.js'
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

