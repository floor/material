module.exports = function(grunt) {
	'use strict';

	grunt.config.merge({
		plato: {
			material: {
				files: {
					'dist/reports/lib': ['lib/**/*.js']
				}
			}
		}
	});

	grunt.registerTask('plato', ['plato']);

	grunt.loadNpmTasks('grunt-plato');
};
