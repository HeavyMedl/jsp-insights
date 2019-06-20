const git = require('simple-git');
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const Util = require('../utility/util');
const logger = require('../utility/logger')(
  {
    id: 'file-remover.js'
  },
  'verbose'
);
const exclusionList = require('../utility/exclusion-list');
/**
 * Iterates through ../../processor-output/merged-jsp-objects
 * and based on a set of criteria, removes a file from version control.
 *
 * TODO:
 *  1. Do we have an empty directory? Remove that too.
 */
class FileRemover {
  /**
   * Creates an instance of FileRemover.
   * @param {String} repoPath The absolute path to the repository
   * @memberof FileRemover
   */
  constructor(repoPath) {
    if (!repoPath) {
      throw new Error('No repository path provided.');
    }
    /**
     * The simple-git instance ready to execute commands against.
     * @type {Object}
     */
    this.git = git().cwd(path.resolve(repoPath));
    /**
     * Files ready for removal.
     * @type {MergedJSPObject[]}
     */
    this.stagedForRemoval = [];
    /**
     * The array of objects representing jsps that have been removed
     * @type {Object[]}
     */
    this.audited = [];
  }

  /**
   * Describes the components this {@link mergedJSPObject} doesn't have.
   *
   * @param {MergedJSPObject} mergedJSPObject
   * @return {String}
   * @memberof FileRemover
   */
  getMessage(mergedJSPObject) {
    let message = '';
    if (!mergedJSPObject.tilesJSPObject) {
      message += 'No tiles definition association. ';
    }
    if (!mergedJSPObject.strutsJSPObject) {
      message += 'No struts entry association. ';
    }
    if (!mergedJSPObject.gitJSPObject) {
      message += 'No git log association. '; // impossible.
    }
    if (mergedJSPObject.responseObject) {
      if (
        !(obj.responseObject.responses || []).some(response => {
          return (
            response.responseStatusCode >= 200 &&
            response.responseStatusCode < 400
          );
        })
      ) {
        message +=
          'No successful response status codes derived from ' +
          'making requests to the struts forward names against the domains.';
      }
    } else {
      message += 'There were no struts forward names to test.';
    }
    return message;
  }

  /**
   * Reads the MergedJSPObjects one by one, if the file
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  stageFilesForRemoval() {
    logger.info('stageFilesForRemoval:', 'Fetching files for removal.');
    return new Promise((resolve, reject) => {
      Util.readStream({
        file: Util.processorOutput('merged-jsp-objects.json'),
        onData: mergedJSPObject => {
          mergedJSPObject = mergedJSPObject.value;
          // Picking the "low point" JSPs.
          if (mergedJSPObject.points === 1) {
            this.stagedForRemoval.push(mergedJSPObject);
          }
        },
        onEnd: () => {
          resolve(this.stagedForRemoval);
        },
        onError: error => {
          reject(error);
        }
      });
    });
  }

  /**
   * Pushes an object with meta data related to the file that was removed
   * from version control to an array that eventually gets written to disk.
   *
   * @param {MergedJSPObject} mergedJSPObject
   * @memberof FileRemover
   */
  audit(mergedJSPObject) {
    this.audited.push({
      name: mergedJSPObject.name,
      filePath: mergedJSPObject.filePath,
      timeRemoved: new Date().toISOString(),
      size: mergedJSPObject._size,
      reason: this.getMessage(mergedJSPObject)
    });
  }

  /**
   * Stages a "git rm" and "git commit" operation for each file.
   *
   * @param {MergedJSPObject[]} stagedMergedJSPObjects
   * @return {Promise}
   * @memberof FileRemover
   */
  removeFiles(stagedMergedJSPObjects) {
    stagedMergedJSPObjects = stagedMergedJSPObjects.filter(obj => {
      return !this.isInExclusionList(obj);
    });
    this.bar = new ProgressBar('[:bar] :rate/Removes/PS :percent :etas :n', {
      complete: '=',
      incomplete: ' ',
      width: 20,
      total: stagedMergedJSPObjects.length
    });
    logger.info(
      'removeFiles:',
      `Removing ${stagedMergedJSPObjects.length} staged files`
    );
    return Promise.all(
      stagedMergedJSPObjects.map((mergedJSPObject, i) => {
        return this.remove(mergedJSPObject.filePath)
          .then(this.commit(mergedJSPObject))
          .then(this.audit(mergedJSPObject));
      })
    );
  }

  /**
   * Stages a "git rm" and "git commit" operation for each file.
   *
   * @param {MergedJSPObject[]} stagedMergedJSPObjects
   * @return {Promise}
   * @memberof FileRemover
   */
  stagedFilesRemoveAudit(stagedMergedJSPObjects) {
    stagedMergedJSPObjects = stagedMergedJSPObjects.filter(obj => {
      return !this.isInExclusionList(obj);
    });
    logger.info(
      'removeFiles:',
      `Removing ${stagedMergedJSPObjects.length} staged files`
    );
    return Promise.all(
      stagedMergedJSPObjects.map((mergedJSPObject, i) => {
        return this.audit(mergedJSPObject);
      })
    );
  }

  /**
   * Checks if a file is part of the exclusion file names or contains an
   * exclusion pattern
   *
   * @param {MergedJSPObject} mergedJSPObject
   * @return {Boolean}
   * @memberof FileRemover
   */
  isInExclusionList(mergedJSPObject) {
    let isInExcList =
      exclusionList.absolutePaths.indexOf(mergedJSPObject.filePath) >= 0;
    if (!isInExcList) {
      // If the file path wasn't found, test the pattern
      isInExcList = exclusionList.patterns.some(pattern => {
        return mergedJSPObject.filePath.includes(pattern);
      });
    }
    if (isInExcList) {
      logger.silly(
        'isInExclusionList:',
        `${mergedJSPObject.filePath} was found in the exclusion list.`
      );
    }
    return isInExcList;
  }

  /**
   * Perfors a "git rm <{@link file}>" operation.
   *
   * @param {String} file
   * @return {Promise}
   * @memberof FileRemover
   */
  remove(file) {
    return new Promise((resolve, reject) => {
      this.git.rm(file, (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  /**
   * Performs a "git commit" operation.
   *
   * @param {MergedJSPObject} mergedJSPObject
   * @return {Promise}
   * @memberof FileRemover
   */
  commit(mergedJSPObject) {
    return new Promise((resolve, reject) => {
      const title = 'JSP Insights CLI Programmatic Removal\n\n';
      const filePath = `File:\n\t${mergedJSPObject.filePath}\n\n`;
      const reason = `Reason:\n\t${this.getMessage(mergedJSPObject)}`;
      const message = `${title}${filePath}${reason}`;
      this.git.commit(message, mergedJSPObject.filePath, (err, result) => {
        this.bar.tick({
          n: mergedJSPObject.name
        });
        if (err) {
          reject(err);
        }
        resolve(result);
      });
    });
  }

  /**
   * Writes the audit objects to disk
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  writeAuditObjectsToDisk() {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        Util.processorOutput('audited-objects.json'),
        JSON.stringify(this.audited, null, 1),
        'utf8',
        err => {
          if (err) {
            reject(err);
          }
          logger.info(
            'writeAuditObjectsToDisk:',
            'Wrote audited-objects.json to disk'
          );
          logger.info('Please review before pushing to remote.');
          resolve(this.audited);
        }
      );
    });
  }

  /**
   * Takes the curated list of JSP(F)s ready for removal and appends the
   * hardcoded scriptlet to it to allow Splunk to gather any JSP(F)s that
   * were wrongly idenfitied as unused by JSP Insights CLI tool.
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  appendStagingScriptlet() {
    logger.info(
      'appendStagingScriptlet:',
      'Appending scriptlet to JSP(F)s ready to be removed.'
    );
    const scriptlet = `\n<%
  /*
  * This scriptlet block was automatically appended to this JSP(F) 
  * because it was programmatically determined to be useless. If this was 
  * in error, this block will print relevant data in the SystemOut.log, 
  * which will in turn be aggregated into Splunk for review. Any JSP(F) 
  * that is still relevant will be added to an exclusion list.
  */
  try {
    StringBuffer requestUrl = request.getRequestURL();
    String servletName = config.getServletName();
    System.out.println(
      "STRY0145770: Servlet: "+servletName+"; Request URL: "+requestUrl);
  } catch (Exception e) {
    System.out.println("STRY0145770: Error: " + e);
  }
%>\n`;
    return Promise.all(
      this.audited.map(readyForRemoval => {
        return new Promise((resolve, reject) => {
          fs.appendFile(readyForRemoval.filePath, scriptlet, err => {
            if (err) reject(err);
            resolve();
          });
        });
      })
    );
  }

  /**
   * Removes the scriptlet tag appended to the curated list of JSP(F)s ready
   * for removal
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  removeStagingScriptlet() {
    const beforeLines = 12;
    const afterLines = 5;
    const pattern = 'STRY0145770: Servlet:';
    return Promise.all(
      this.audited.map(readyForRemoval => {
        return Util.readFilePromise(readyForRemoval.filePath)
          .then(obj => {
            const lines = obj.fileData.split('\n');
            const indexOfPattern = lines.findIndex(line =>
              line.includes(pattern)
            );
            return lines
              .filter(
                (line, i) =>
                  i < indexOfPattern - beforeLines ||
                  i > indexOfPattern + afterLines
              )
              .join('\n');
          })
          .then(fileString =>
            Util.genericWrite({
              path: readyForRemoval.filePath,
              serializedData: fileString,
              message: `removeStagingScriptlet: Removing scriptlet tag from ${
                readyForRemoval.filePath
              }`,
              resolveData: readyForRemoval
            })
          );
      })
    );
  }

  /**
   * Alternate entry point for this class.
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  executeRemoveStagingScriptlet() {
    return this.stageFilesForRemoval()
      .then(this.stagedFilesRemoveAudit.bind(this))
      .then(this.writeAuditObjectsToDisk.bind(this))
      .then(this.removeStagingScriptlet.bind(this));
  }

  /**
   * Alternate entry point for this class.
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  executeStagingScriptlet() {
    return this.stageFilesForRemoval()
      .then(this.stagedFilesRemoveAudit.bind(this))
      .then(this.writeAuditObjectsToDisk.bind(this))
      .then(this.appendStagingScriptlet.bind(this));
  }

  /**
   * Alternate entry point for this class.
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  executeAudit() {
    return this.stageFilesForRemoval()
      .then(this.stagedFilesRemoveAudit.bind(this))
      .then(this.writeAuditObjectsToDisk.bind(this));
  }

  /**
   * The entry point for this class.
   *
   * @return {Promise}
   * @memberof FileRemover
   */
  execute() {
    return this.stageFilesForRemoval()
      .then(this.removeFiles.bind(this))
      .then(this.writeAuditObjectsToDisk.bind(this));
  }
}
module.exports = FileRemover;
