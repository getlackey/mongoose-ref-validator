/*jslint node:true */
'use strict';

module.exports = function mocha_istanbul(grunt) {
    // Load task
    grunt.loadNpmTasks('grunt-mocha-istanbul');

    // Options
    return {
        coverage: {
            src: 'tests', // a folder works nicely
            options: {
                mask: '*.js'
            }
        }
    };
};