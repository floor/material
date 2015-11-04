module.exports = function(grunt) {
	'use strict';

	grunt.config.merge({
		watch: {
			caoutchouc: {
				files: ['Source/skin/**/**/*.less'],
				tasks: ['less:caoutchouc']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.registerTask('default', ['watch']);
};
