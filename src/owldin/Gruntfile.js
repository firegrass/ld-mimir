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
              },
              external : ['brace', 'brace/mode/json', 'brace/mode/markdown', 'brace/theme/monokai']                
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

