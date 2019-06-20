const path = require('path');
const fs = require('fs');
const git = require('simple-git');
const ProgressBar = require('progress');
const Util = require('../utility/util');
const GitJSPObject = require('../objects/git-jsp-object');
const logger = require('../utility/logger')(
  {
    id: 'git-jsp-stats.js'
  },
  'verbose'
);
/**
 * Takes the output of several "git log <file>" commands, builds an object,
 * then outputs to the git-jsp-stats.json file. Requires a git repo and
 * jsp.json to be built.
 *
 * WARNING:
 * This is long running process as we do two logs
 * against remote.
 */
class GitJSPObjects {
  /**
   * Creates an instance of GitJSPObjects. Requires a repository path by which
   * to "git log <file>" against.
   *
   * @param {String} repoPath The absolute path to the repository
   * @param {String} branch The git repository branch.
   * @memberof GitJSPObjects
   */
  constructor(repoPath, branch) {
    if (!repoPath) {
      throw new Error('No repository path provided.');
    }
    /**
     * The repo branch we want to look at
     * @type {String}
     */
    this.branch = branch || 'develop';
    logger.info('Setting git repository path:', repoPath);
    logger.info('Setting branch:', this.branch);
    /**
     * The simple-git instance ready to execute commands against.
     * @type {Object}
     */
    this.git = git().cwd(path.resolve(repoPath));
    /**
     * The collection of GitJSPObjects
     * @type {Object[GitJSPObject]}
     */
    this.gitJSPObjectsWrappers = [];
    /**
     * The rawJSPFileObjects loaded from ../processor-output/jsp.json
     * @type {RawJSPFileObject[]}
     */
    this.rawJSPFileObjects = [];
  }

  /**
   * Fetches Last Modified and Created logs for each JSP
   *
   * @param {RawJSPFileObject[]} rawJSPFileObjects
   * @return {Promise} Resolves the GitJSPObjects
   * @memberof GitJSPObjects
   */
  getLogsForFiles(rawJSPFileObjects) {
    logger.info(
      'getLogsForFiles:',
      "Fetching 'Last Modified' commit and 'Created' commit from",
      this.branch ? `origin/${this.branch}` : 'local checked out branch.',
      'Grab some coffee, this will take some time...'
    );
    // Loading this up in memory. Not the best idea.
    this.rawJSPFileObjects = rawJSPFileObjects;
    this.bar = new ProgressBar('[:bar] :rate/Logs/PS :percent :etas :n', {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: this.rawJSPFileObjects.length * 2
    });
    return Promise.all(
      this.rawJSPFileObjects.map(rawJSPFileObject => {
        // rawJSPFileObject = JSON.parse(rawJSPFileObject);
        return this.getLastModifiedLog(rawJSPFileObject)
          .then(gitJspObj => this.getCreatedLog(rawJSPFileObject, gitJspObj))
          .catch(error => logger.error(error));
      })
    ).then(data => {
      this.gitJSPObjectsWrappers = data;
    });
  }

  /**
   *
   * Raw command:
   * git log origin/develop -n 1
   *  --pretty=format:'%cr | %cI | %h | %aN | %s' -- lib/jenkins.js
   *
   * @param {RawJSPFileObject} rawJSPFileObject
   * @return {Promise}
   * @memberof GitJSPObjects
   */
  getLastModifiedLog(rawJSPFileObject) {
    return new Promise((resolve, reject) => {
      this.git.raw(
        [
          'log',
          this.branch ? `origin/${this.branch}` : '',
          '-n 1',
          '--pretty=format: %cr |delim| %cI |delim| %h |delim| %aN |delim| %s',
          '--',
          rawJSPFileObject.filePath
        ],
        (err, result) => {
          const message = "Getting 'Last Modified' log for:";
          this.bar.tick({
            n: `${message} ${rawJSPFileObject.fileStats.name}`
          });
          if (err) {
            reject(err);
          }
          result = (result || '').trim();
          const components = result.split('|delim|') || [];
          resolve(
            new GitJSPObject({
              relativeTime: (components[0] || '').trim(),
              iso8601: (components[1] || '').trim(),
              commitHash: (components[2] || '').trim(),
              author: (components[3] || '').trim(),
              commitMessage: (components[4] || '').trim()
            })
          );
        }
      );
    });
  }

  /**
   *
   * Raw command:
   * git log origin/develop --diff-filter=A --follow
   *  --format='%cr |delim| %cI |delim| %h |delim| %aN |delim| %s'
   * -- lib/jenkins.js | tail -1
   *
   * @param {RawJSPFileObject} rawJSPFileObject
   * @param {GitJSPObject} lastModifiedGitJSPObject
   * @return {Promise}
   * @memberof GitJSPObjects
   */
  getCreatedLog(rawJSPFileObject, lastModifiedGitJSPObject) {
    return new Promise((resolve, reject) => {
      this.git.raw(
        [
          'log',
          this.branch ? `origin/${this.branch}` : '',
          '--diff-filter=A',
          '--format=%cr |delim| %cI |delim| %h |delim| %aN |delim| %s',
          // '--follow',
          '--',
          rawJSPFileObject.filePath,
          'tail -1'
        ],
        (err, result) => {
          const message = "Getting 'Created' log for:";
          this.bar.tick({
            n: `${message} ${rawJSPFileObject.fileStats.name}`
          });
          if (err) {
            reject(err);
          }
          result = (result || '').trim();
          const components = result.split('|delim|') || [];
          resolve({
            filePath: rawJSPFileObject.filePath,
            created: new GitJSPObject({
              relativeTime: (components[0] || '').trim(),
              iso8601: (components[1] || '').trim(),
              commitHash: (components[2] || '').trim(),
              author: (components[3] || '').trim(),
              commitMessage: (components[4] || '').trim()
            }),
            lastModified: lastModifiedGitJSPObject
          });
        }
      );
    });
  }

  /**
   * Writes the GitJSPObject wrappers to disk
   *
   * @return {Promise}
   * @memberof GitJSPObjects
   */
  writeGitJSPObjectsToDisk() {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        Util.processorOutput('git-jsp-objects.json'),
        JSON.stringify(this.gitJSPObjectsWrappers, null, 1),
        'utf8',
        err => {
          if (err) {
            reject(err);
          }
          logger.info(
            'writeGitJSPObjectsToDisk:',
            'Wrote git-jsp-objects.json to disk'
          );
          resolve({
            gitJSPObjectsWrappers: this.gitJSPObjectsWrappers,
            rawJSPFileObjects: this.rawJSPFileObjects
          });
        }
      );
    });
  }

  /**
   * The entry point for this class.
   *
   * @param {RawJSPFileObject} rawJSPFileObjects
   * @return {Promise}
   * @memberof GitJSPObjects
   */
  execute(rawJSPFileObjects) {
    return this.getLogsForFiles(rawJSPFileObjects).then(
      this.writeGitJSPObjectsToDisk.bind(this)
    );
  }
}
module.exports = GitJSPObjects;
