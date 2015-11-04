module.exports = function(grunt) {
	'use strict';

	grunt.config.merge({
		concat: {
			ui: {
				src: ['dist/**/*.js'],
				dest: 'dist/material-min.js',
			},
		},
	});

	grunt.config.merge({
		clean: {
			js: {
				src: ['dist/**/*', '!dist/material-min.js']
			}
		}
	});

	grunt.config.merge({
		requirejs: {
			ui: {
				options: {
					//optimize: 'none',
					preserveLicenseComments: false,
					baseUrl: 'lib',
					//appDir: 'Source',
					dir: 'dist',
					paths: {
						UI: './'
					},
					/**
					 * @ignore
					 */
					onBuildWrite: function(name, path, contents) {
						//console.log('Writing: ' + name);

						/*if (name === 'UI') {
							contents = contents.replace('define(', "define('" + name + "', ");
						} else {
							contents = contents.replace('define(', "define('UI/" + name + "', ");
						}*/
						contents = contents.replace('define(', "define('material/" + name + "', ");

						return contents;
					},
				}
			}
		}
	});

	grunt.registerTask('deploy', ['requirejs:ui', 'concat:ui', 'clean:js']);

	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-clean');
};
