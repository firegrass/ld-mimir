module.exports = function (grunt){

  grunt.initConfig({
    watch: {
      server: {
        files: [
          'server.js',
          'lib/*.js'
        ],
        tasks: ['develop'],
        options: { nospawn: true }
      },
      client : {
        files : [
          'client-src/entry.js',
          'client-src/**/*.js'
        ],
        tasks : ['browserify']
      },
      deps : {
        files : [
          'package.json'
        ],
        tasks : ['npm-install', 'develop', 'browserify'],
        options : { nospawn : true}
      }
    },
    develop: {
      server: {
        file: 'server.js'
      }
    },
    browserify : {
      app : {
          src : "./client-src/entry.js",
          dest : "./public/scripts/build.js",
          options : {
              browserifyOptions : {
                  debug : true
              }                   
          }

      }
    }
  });

  grunt.loadNpmTasks('grunt-develop');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-npm-install');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['develop', 'watch']);

}

