var gitCommand = require('./git-command.js');

module.exports = function (repoPath, callback){

  gitCommand('git status --porcelain', repoPath, function (code, stdout, stderr){

    if (!code){
      callback(false, parse(stdout));
    } else {
      callback(code, stderr);
    }


  });

  function parse (text){

    var files = {};
    var clean = text.length === 0;

    var lines = text.split('\n');

    for (var i = 0; i < lines.length; i++){
      var line = lines[i];
      if (!line.length){
        continue;
      }
      var file = line.substr(3);
      var type = line.substr(0, 2);

      files[file] = {
        staged : line[0] !== " " && line[0] !== "?",
        tracked : line[0] !== "?"
      };

      if (type !== "??"){
        files[file].type = type.trim();

      }

    }

    return files;

  }


}