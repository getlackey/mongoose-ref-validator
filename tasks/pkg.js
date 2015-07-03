/*jslint node:true */
'use strict';

module.exports = function pkg(grunt) {
    // Options
    return grunt.file.readJSON('package.json');
};