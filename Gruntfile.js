/*jslint node:true */

module.exports = function (grunt) {
  'use strict';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      metrics: {
        files: {
          'metric.js': ['src/metric.js']
        }
      },
      options: {
        browserifyOptions: {
          debug: true
        }
      }
    },
    jshint: {
      all: ['src/*.js']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('build', ['browserify']);
  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('default', ['build', 'test']);
};
