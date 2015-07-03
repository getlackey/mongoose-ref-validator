/*jslint node:true */
'use strict';

module.exports = function watch(grunt) {
    grunt.loadNpmTasks('grunt-contrib-watch');

    return {
        jslint: {
            files: [
                'lib/**/*.js'
            ],
            tasks: ['jslint']
        }
    };
};