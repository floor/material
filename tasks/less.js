
module.exports = function(grunt) {
	'use strict';

	grunt.config.merge({
		less: {
			caoutchouc: {
				files: {
					'public/demo/styles.css': 'lib/skin/base/base.less'
				}
			}
		}
	});

	grunt.registerTask('styles', ['less']);
	grunt.loadNpmTasks('grunt-contrib-less');
};
