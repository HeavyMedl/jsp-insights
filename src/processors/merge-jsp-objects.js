const prettyBytes = require('pretty-bytes');
const fs = require('fs');
const Util = require('../utility/util');
const MergedJSPObject = require('../objects/merged-jsp-object');
const logger = require('../utility/logger')(
  {
    id: 'merge-jsp-objects.js'
  },
  'verbose'
);
/**
 * Merges a RawJSPFileObject with its TilesJSPObject,
 * StrutsJSPObject, GitJSPObject, and ResponseObject compliments,
 * given they exist.
 * This assumes the following files exist:
 *  1. jsp.json -> util.js.writeJSPFileObjectsToFile
 *  2. tiles.json -> tiles.js.execute
 *  3. struts.json -> struts.js.execute
 *  4. git-jsp-objects.json -> git-jsp-stats.js.execute
 *  5. response-objects.json -> response-checker.js.execute
 */
class MergeJSPObjects {
  /**
   * Creates an instance of MergeJSPObjects. Initializes
   * @memberof MergeJSPObjects
   */
  constructor() {
    /**
     * This collection represents the MergedJSPObjects that have
     * a defined tilesJSPObject and a strutsJSPObject.
     * @type {MergedJSPObject[]}
     */
    this.tilesAndStrutsMergedJSPObjects = [];
    /**
     * This collection represents the MergedJSPObjects that have
     * only a tilesJSPObject defined (no strutsJSPObject).
     * @type {MergedJSPObject[]}
     */
    this.tilesMergedJSPObjects = [];
    /**
     * This collection represents the MergedJSPObjects that have
     * only a strutsJSPObject defined (no tilesJSPObject).
     * @type {MergedJSPObject[]}
     */
    this.strutsMergedJSPObjects = [];
    /**
     * This collection represents the MergedJSPObjects that have
     * neither a tilesJSPObject or a strutsJSPObject.
     * @type {MergedJSPObject[]}
     */
    this.orphanedMergedJSPObjects = [];
    /**
     * The rawJSPFileObjects loaded from ../processor-output/jsp.json
     * @type {RawJSPFileObject[]}
     */
    this.rawJSPFileObjects = [];
    /**
     * The total size of all of the JSP(F)s in bytes.
     * @type {Number}
     */
    this._totalSize = 0;
  }

  /**
   * The entry point for this class.
   *
   * @param {Boolean} hasReport If the hasReport flag is passed, we write
   *  any warnings generated by this processor to report.json. Driven
   *  by the CLI flag --report.
   * @return {Promise}
   * @memberof MergeJSPObjects
   */
  execute(hasReport) {
    this.processJSPObjects();
    return this.writeMergedJSPObjectsToDisk().then(data => {
      return hasReport
        ? Util.appendToReport(
            'jsp',
            {
              count: this.rawJSPFileObjects.length,
              _size: this._totalSize,
              size: prettyBytes(this._totalSize),
              tilesAndStrutsJSPs: this.tilesAndStrutsMergedJSPObjects.length,
              tilesJSPs: this.tilesMergedJSPObjects.length,
              strutsJSPs: this.strutsMergedJSPObjects.length,
              orphanedJSPs: this.orphanedMergedJSPObjects.length
            },
            data
          )
        : data;
    });
  }

  /**
   * Read ../processor-output/jsp.json, for each RawJSPFileObject,
   * get the associated TilesJSPObject, StrutsJSPObject, GitJSPObject,
   * and ResponseObject then create MergedJSPObject.
   *
   * @memberof MergeJSPObjects
   */
  processJSPObjects() {
    // Load it all up in memory. Not the best idea but at this point we've
    // widdled everything down to a small subset.
    this.rawJSPFileObjects = require(Util.processorOutput('jsp.json')) || [];
    // Load the tiles and struts json arrays into memory.
    const tilesJSPObjects = require(Util.processorOutput('tiles.json')) || [];
    const strutsJSPObjects = require(Util.processorOutput('struts.json')) || [];
    const gitJSPObjects =
      require(Util.processorOutput('git-jsp-objects.json')) || [];
    const responseObjects =
      require(Util.processorOutput('response-objects.json')) || [];
    // O(N^2)
    for (let rawJSPObject of this.rawJSPFileObjects) {
      rawJSPObject = JSON.parse(rawJSPObject);
      // Attempt to find the TilesJSPObject
      const tilesJSPObject = tilesJSPObjects.find(tilesJSPObj => {
        // tilesJSPObj = JSON.parse(tilesJSPObj);
        return rawJSPObject.filePath === tilesJSPObj.path;
      });
      // Attempt to find the strutsJSPObject
      const strutsJSPObject = strutsJSPObjects.find(strutsJSPObj => {
        // strutsJSPObj = JSON.parse(strutsJSPObj);
        return (
          rawJSPObject.filePath === strutsJSPObj.path ||
          // Is there a relationship between the tiles entry and the
          // struts entry?
          (typeof tilesJSPObject !== 'undefined' &&
            strutsJSPObj.forwardPath === tilesJSPObject.rootDefinitionName)
        );
      });
      // Attempt to find the ResponseObject
      const responseObject = responseObjects.find(respObj => {
        return (
          strutsJSPObject && strutsJSPObject.forwardName === respObj.forwardName
        );
      });
      // Attempt to find the GitJSPObject
      const gitJSPObject = gitJSPObjects.find(gitJSPObj => {
        return rawJSPObject.filePath === gitJSPObj.filePath;
      });
      rawJSPObject._size = rawJSPObject.fileStats.size;
      this._totalSize += rawJSPObject._size;
      rawJSPObject.size = prettyBytes(rawJSPObject.fileStats.size);
      rawJSPObject.tilesJSPObject = tilesJSPObject;
      rawJSPObject.strutsJSPObject = strutsJSPObject;
      rawJSPObject.responseObject = responseObject;
      rawJSPObject.gitJSPObject = gitJSPObject;
      rawJSPObject.points = this.getPoints(rawJSPObject);
      rawJSPObject.name = Util.getFileName(rawJSPObject.filePath);
      const mergedJSPObject = new MergedJSPObject(rawJSPObject);
      // Now, put this mergedJSPObject into the right bucket...
      if (
        // Case where we have both a tilesJSPObject and a strutsJSPObject
        typeof rawJSPObject.tilesJSPObject !== 'undefined' &&
        typeof rawJSPObject.strutsJSPObject !== 'undefined'
      ) {
        this.tilesAndStrutsMergedJSPObjects.push(mergedJSPObject);
      } else if (
        // Case where we have a tilesJSPObject but not a strutsJSPObject
        typeof rawJSPObject.tilesJSPObject !== 'undefined' &&
        typeof rawJSPObject.strutsJSPObject === 'undefined'
      ) {
        this.tilesMergedJSPObjects.push(mergedJSPObject);
      } else if (
        // Case where we have a strutsJSPObject but not a tilesJSPObject
        typeof rawJSPObject.tilesJSPObject === 'undefined' &&
        typeof rawJSPObject.strutsJSPObject !== 'undefined'
      ) {
        this.strutsMergedJSPObjects.push(mergedJSPObject);
      } else if (
        // Case where we have neither a tilesJSPObject or a strutsJSPObject
        typeof rawJSPObject.tilesJSPObject === 'undefined' &&
        typeof rawJSPObject.strutsJSPObject === 'undefined'
      ) {
        this.orphanedMergedJSPObjects.push(mergedJSPObject);
      } else {
        logger.warn(
          'processJSPObject:',
          "Couldn't classify the",
          'MergedJSPObject',
          mergedJSPObject
        );
      }
    }
    logger.info(
      'processJSPObjects:',
      'Number of JSPs associated with a tiles definition and an accompanying',
      'struts entry:',
      this.tilesAndStrutsMergedJSPObjects.length
    );
    logger.info(
      'processJSPObjects:',
      'Number of JSPs associated with a tiles definition but without a',
      'accompanying struts entry:',
      this.tilesMergedJSPObjects.length
    );
    logger.info(
      'processJSPObjects:',
      'Number of JSPs not associated with a tiles definition but with a',
      'accompanying struts entry:',
      this.strutsMergedJSPObjects.length
    );
    logger.info(
      'processJSPObjects:',
      'Number of JSPs not associated with a tiles definition and without a',
      'accompanying struts entry:',
      this.orphanedMergedJSPObjects.length
    );
  }

  /**
   * Returns the points associated with this object. The higher the points,
   * the greater the likelihood of a meaningful JSP. Points are determined
   * using several qualifiers:
   *
   * 1. A particular object exists. (1 point)
   * 2.
   *
   * @param {Object} obj
   * @return {Number} The points associated with this object.
   * @memberof MergeJSPObjects
   */
  getPoints(obj) {
    let points = 0;
    if (obj.tilesJSPObject) points++;
    if (obj.strutsJSPObject) points++;
    if (obj.gitJSPObject) {
      points++;
    }
    if (obj.responseObject) {
      points++;
      if (
        (obj.responseObject.responses || []).some(response => {
          return (
            response.responseStatusCode >= 200 &&
            response.responseStatusCode < 400
          );
        })
      ) {
        // If we have at least one 200 or 302 response in the array
        points++;
      }
    }
    return points;
  }

  /**
   * Writes the merged jsp objects to disk
   *
   * @return {Promise}
   * @memberof MergeJSPObjects
   */
  writeMergedJSPObjectsToDisk() {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        Util.processorOutput('merged-jsp-objects.json'),
        JSON.stringify(
          this.tilesAndStrutsMergedJSPObjects
            .concat(this.tilesMergedJSPObjects)
            .concat(this.strutsMergedJSPObjects)
            .concat(this.orphanedMergedJSPObjects),
          null,
          1
        ),
        'utf8',
        err => {
          if (err) {
            reject(err);
          }
          logger.info(
            'writeMergedJSPObjectsToDisk:',
            'Wrote merged-jsp-objects.json to disk'
          );
          resolve({
            tilesAndStrutsMergedJSPObjects: this.tilesAndStrutsMergedJSPObjects,
            tilesMergedJSPObjects: this.tilesMergedJSPObjects,
            strutsMergedJSPObjects: this.strutsMergedJSPObjects,
            orphanedMergedJSPObjects: this.orphanedMergedJSPObjects
          });
        }
      );
    });
  }
}
module.exports = MergeJSPObjects;