/*jslint node:true */
'use strict';

module.exports = function (grunt) {
    // Load the project's grunt tasks from a directory
    require('grunt-config-dir')(grunt, {
        configDir: require('path').resolve('tasks')
    });

    // Register group tasks
    grunt.registerTask('test', [
        'jslint',
        'mocha_istanbul'
    ]);

    // keeps watching for file changes
    grunt.registerTask('default', [
        'jslint',
        'watch'
    ]);
};