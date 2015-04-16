var path = require('path');

var gitStatus = require('./git-status.js');
var gitCommit = require('./git-commit.js');

module.exports = function (repoPath){

  return {
    status : function (callback){
      return gitStatus(repoPath, callback);
    },
    commit : function (msg, list, callback){
      return gitCommit(repoPath, msg, list, callback);
    }
  }

}