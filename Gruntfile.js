module.exports = function(grunt) {

	require('./tasks/watch.js')(grunt);
	require('./tasks/less.js')(grunt);
	require('./tasks/deploy.js')(grunt);

};
