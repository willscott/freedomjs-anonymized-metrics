/*jslint node:true */

module.exports = function (grunt) {
  'use strict';
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      metrics: {
        files: {
          'dist/metric.js': ['src/metric.js']
        }
      },
      options: {
        browserifyOptions: {
          debug: true,
        },
        require: ['./src/crypto:crypto']
      }
    },
    copy: {
      dist: {
        src: 'anonmetrics.json',
        dest: 'dist/'
      }
    },
    jshint: {
      all: ['src/*.js']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.registerTask('build', ['browserify', 'copy:dist']);
  grunt.registerTask('test', ['jshint']);
  grunt.registerTask('default', ['build', 'test']);
};
