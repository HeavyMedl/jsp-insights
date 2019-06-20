const fs = require('fs');
const JSONStream = require('JSONStream');
const JSPObject = require('../objects/jsp-object');
const Util = require('../utility/util');
const logger = require('../utility/logger')(
  {
    id: 'shallow-nest.js'
  },
  'verbose'
);
/**
 * Creates an intermediate JSON file that represents each JSP(F) and its first
 * level of nested JSP(F)s (within Stores project).
 */
class ShallowNest {
  /**
   * Creates an instance of ShallowNest. Creates an error write stream
   * and initializes a bunch of file state properties. Should probably
   * be decoupled and moved to a different file.
   */
  constructor() {
    this.shallowJSPObjects = [];
    /**
     * The error log. Created by Util, appended to by this class.
     * @type {WriteStream}
     */
    // this.errorStream = fs.createWriteStream(Util.logOutput('error.log'), {
    //   flags: 'a',
    // });
    /**
     * When fetching the nested jsp references of a JSP(F), if the program
     * detects any EL variables "${...}", it will notify at the end of the run.
     * These values need to be subtituted with real paths.
     * @type {Array}
     */
    this.substitutes = [];
  }

  /**
   * Variant of writeShallowJSPObject that returns a promise
   * when the read operation is done.
   *
   * @param {Object} fileObj
   * @return {Promise}
   * @memberof ShallowNest
   */
  writeShallowJSPObjectPromise(fileObj) {
    return new Promise((resolve, reject) => {
      fs.readFile(fileObj.filePath, 'utf8', (error, data) => {
        let jspObj = {};
        let jsps = [];
        // let variablesSet = [];
        try {
          // TODO: Replace occurrences of getJSPRegex with getPropertyValue
          // As this regex is pulling JavaScript variables from JSPs
          jsps = Util.getNestedJSPs(data, fileObj);
          // global / local(?) variablesSet
          // variablesSet = Util.getVariablesSet(data, fileObj);
        } catch (err) {
          logger.error('writeShallowJSPObject', err);
          // this.errorStream.write(`writeShallowJSPObject
          //   ${JSON.stringify(err, null, 2)}`);
        } finally {
          // Attach the nested jsps to the fileObj
          fileObj.jsps = jsps;
          // Create the model of the JSP.
          jspObj = new JSPObject(fileObj);
          // In memory test...
          // this.shallowJSPObjects[jspObj.path] = jspObj.nested;
          this.shallowJSPObjects.push(jspObj);
          // Write the JSPObject to disk.
          this.transformStream.write(JSON.stringify(jspObj, null, 1));
          // Signal to proceed with the next file.
          resolve(jspObj);
        }
      });
    });
  }

  /**
   * Entry point for this class.
   *
   * @param {Array} rawJSPFileObjects
   * @return {Promise} Chainable promise.
   * @memberof ShallowNest
   */
  execute(rawJSPFileObjects) {
    /**
     * Output shallow.json file.
     * @type {TransformStream}
     */
    this.transformStream = JSONStream.stringify('[', ',', ']');
    this.transformStream.pipe(
      fs.createWriteStream(Util.processorOutput('shallow.json'))
    );
    const shallowJSPObjectPromises = [];
    rawJSPFileObjects.forEach(fileObj => {
      shallowJSPObjectPromises.push(this.writeShallowJSPObjectPromise(fileObj));
    });
    return Promise.all(shallowJSPObjectPromises).then(jspObjs => {
      logger.info(
        'execute: Wrote all shallow nested JSPObjects to shallow.json'
      );
      this.transformStream.end();
      this.shallowJSPObjects.sort(Util.byPath);
      return this.shallowJSPObjects;
    });
  }
}
module.exports = ShallowNest;
