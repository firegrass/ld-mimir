var gitCommand = require('./git-command.js');

module.exports = function (repoPath, msg, list, callback){

  list.forEach(function (item, index){

    list[index] = item.replace(/\s/g, '\\ ');

  })

  console.log('git add -A ' + list.join(' '));

  gitCommand('git add -A ' + list.join(' '), repoPath, function (code, stdout, stderr){

    console.log(stdout, stderr);

    if (!code){

      gitCommand('git commit -m "' + msg + '"', repoPath, function (code, stdout, stderr){

        console.log(stdout, stderr);

        if (!code){
          callback(false, stdout);
        } else {
          callback(code, stderr);
        }

      });

    } else {
      callback(code, stderr);
    }


  });

}