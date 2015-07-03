/*jslint node:true */
'use strict';

module.exports = function jslint(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-jslint');

    // Options
    return {
        src: [
            'lib/**/*.js'
        ]
    };
};