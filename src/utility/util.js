const fs = require('fs');
const path = require('path');
const walk = require('walk');
const JSONStream = require('JSONStream');
const figlet = require('figlet');
const moment = require('moment');
const StreamArray = require('stream-json/streamers/StreamArray');
const TilesJSPObject = require('../objects/tiles-jsp-object');
const StrutsJSPObject = require('../objects/struts-jsp-object');
const RawJSPFileObject = require('../objects/raw-jsp-file-object');
const logger = require('./logger')(
  {
    id: 'util.js'
  },
  'info'
);
/**
 * General purpose utility class for the application.
 */
class Util {
  /**
   * Creates an instance of Util.
   */
  constructor() {}

  /**
   * Walk the stores directory, performing the
   * "operation".
   *
   * @static
   * @param {String} directory
   * @param {Object} operation
   * @return {Promise}
   * @memberof Util
   */
  static directoryWalk(directory, operation) {
    const fileData = {};
    fileData.dirCount = 0;
    fileData.fileCount = 0;
    fileData.extensionCount = {};
    fileData.emptyDirectories = [];
    return new Promise((resolve, reject) => {
      logger.info(`directoryWalk: Walking ${directory}`);
      logger.info(operation.startMessage);
      const walker = walk.walk(directory);
      walker.on('file', (root, fileStats, next) => {
        fileData.fileCount++;
        Util.updateExtensionMap(fileStats, fileData.extensionCount);
        operation.action(root, fileStats, next);
      });
      walker.on('directory', (root, dirStats, next) => {
        // Check if directory is empty
        const pathToDir = path.join(root, dirStats.name);
        fs.readdir(pathToDir, (err, files) => {
          if (err) {
            logger.error('directoryWalk: Error', err);
          } else if (!files.length) {
            fileData.emptyDirectories.push(pathToDir);
          }
          next();
        });
        fileData.dirCount++;
      });
      walker.on('errors', (root, nodeStatsArray, next) => {
        operation.error(root, nodeStatsArray, next);
        reject(nodeStatsArray);
      });
      walker.on('end', () => {
        logger.info(
          `directoryWalk: ${directory} File Stats ${JSON.stringify(fileData)}`
        );
        // Converts the
        fileData.extensionCount = Util.convertExtensionMapToArray(
          fileData.extensionCount
        );
        if (fileData.emptyDirectories.length > 0) {
          logger.warn(
            `directoryWalk: ${
              fileData.emptyDirectories.length
            } empty directories.`,
            fileData.emptyDirectories
          );
        }
        logger.info(`directoryWalk: Finished walking ${directory}`);
        if (operation.end) {
          operation.end.call(operation, fileData, resolve);
        } else {
          logger.info(operation.endMessage);
          resolve(operation.resolve);
        }
      });
    });
  }

  /**
   * Takes the extension count object and coverts it to an array of
   * objects representing the extension name/count.
   *
   * @static
   * @param {Object} map
   * @return {Array} The converted extension array.
   * @memberof Util
   */
  static convertExtensionMapToArray(map) {
    const arr = [];
    for (const [extension, count] of Object.entries(map)) {
      arr.push({
        extensionName: extension,
        extensionCount: count
      });
    }
    return arr.sort((a, b) => {
      return a.extensionCount > b.extensionCount ? -1 : 1;
    });
  }

  /**
   * Resolves an array of raw jsp file objects.
   *
   * @static
   * @param {Boolean} hasReport If the hasReport flag is passed, after
   *  the directory is walked, we write fileData to reports.json. Driven
   *  by the CLI flag --report.
   * @param {Boolean} isClearReport isClearReport If true, clears reports.json
   *  to start fresh. Driven by the CLI flag --clear-report
   * @return {Promise}
   * @memberof Util
   */
  static getRawJSPFileObjects(hasReport, isClearReport) {
    const rawJSPFileObjects = [];
    return this.directoryWalk(Util.STORES, {
      startMessage:
        'getRawJSPObjects:' +
        ' Aggregating raw JSP file data objects for processing.',
      endMessage:
        'getRawJSPObjects:' +
        ' Completed. Resolving array of raw JSP file data objects.',
      action: (root, fileStats, next) => {
        const ext = Util.getExt(fileStats.name).toLowerCase();
        switch (ext) {
          case 'jsp':
          case 'jspf':
            const filePath = path.join(root, fileStats.name);
            rawJSPFileObjects.push(
              new RawJSPFileObject({
                fileStats,
                root,
                filePath
              })
            );
            break;
          default:
            break;
        }
        next();
      },
      error: (root, nodeStatsArray, next) => {
        logger.verbose(
          'getRawJSPFileObjects: There was error walking',
          nodeStatsArray
        );
        next();
      },
      end(fileData, resolve) {
        logger.info(this.endMessage);
        if (hasReport) {
          return Util.clearSiteReports(isClearReport)
            .then(data =>
              Util.generateReport(
                {
                  date: moment().format(),
                  fullDateTime: moment().format('LLLL'),
                  iso8601date: moment().format('YYYY-MM-DD'),
                  fileNameDateTime: moment().format('YYYY-MM-DDTH-mm-ss-SSS'),
                  fileData,
                  // Prepare the fileData object to house some properties that
                  // will be populated by their respective processor.
                  // These represent missing references or files reported by
                  // [struts/tiles].js
                  warnings: {
                    tiles: [],
                    struts: []
                  }
                },
                isClearReport
              )
            )
            .then(data => resolve(this.resolve));
        }
        resolve(this.resolve);
      },
      resolve: rawJSPFileObjects
    });
  }

  /**
   * Removes all json/html files that are prefixed with 'report' from site/_data
   * and site/
   *
   * @static
   * @param {Boolean} isClearReport
   * @return {Promise}
   * @memberof Util
   */
  static clearSiteReports(isClearReport) {
    const siteDataPath = Util.siteDataDir('');
    return Util.readDirPromise(siteDataPath)
      .then(dirObj => {
        return Promise.all(
          dirObj.files.map(file => {
            const htmlFile = `${file.split('.').shift()}.html`;
            return file.includes('report') && isClearReport
              ? Util.unlinkPromise(Util.siteDataDir(file))
                  .then(data =>
                    Util.unlinkPromise(
                      path.resolve(__dirname, '../../', 'site', htmlFile)
                    )
                  )
                  .catch(error => console.warn(error))
              : {};
          })
        );
      })
      .catch(error => console.warn(error));
  }

  /**
   * Get the last item in the report, and add something to it. The last report
   * in reports (reports.json) represents the latest run, and therefore is
   * always what we want to modify.
   *
   * @static
   * @param {String} key The key to add to the report
   * @param {*} value The value associated with the {@link key}.
   * @param {*} resolveData The data to resolve when the process is finished
   *  writing to the report.
   * @return {Promise} Resolves the last report with new modification.
   * @memberof Util
   */
  static appendToReport(key, value, resolveData) {
    const reports = Util.REPORTS;
    const lastReport = reports.pop();
    lastReport[key] = value;
    reports.push(lastReport);
    // Write it to disk.
    return Util.genericWrite({
      path: Util.processorOutput('reports.json'),
      serializedData: JSON.stringify(reports, null, 1),
      message: `appendToReport: Appending ${key} to report.`,
      resolveData
    });
  }

  /**
   * Creates reports.json if it doesn't already exist. If it does,
   * this function will append {@link data} to reports.json
   *
   * @static
   * @param {*} data The data to build the report from.
   * @param {Boolean} isClearReport If true, clears reports.json to start fresh.
   * @return {Promise} Resolves the data passed.
   * @memberof Util
   */
  static generateReport(data, isClearReport) {
    const reportPath = Util.processorOutput('reports.json');
    return (
      Util.statPromise(reportPath)
        // reports.json exists, append to existing array.
        .then(stat => {
          let reports = Util.REPORTS;
          // Add the new report to the report array
          reports.push(data);
          // If isClearReport is passed, we're starting fresh.
          // Wipes reports.json.
          if (isClearReport) {
            reports = [data];
          }
          // Write it to disk.
          return Util.genericWrite({
            path: reportPath,
            serializedData: JSON.stringify(reports, null, 1),
            message:
              `generateReport: ${typeof isClearReport}` !== 'undefined' &&
              isClearReport === true
                ? 'Reports cleared. Writing reports.json to disk.' //
                : 'Appending report to reports.',
            resolveData: data
          });
        })
        // Otherwise, we're generating the report and adding the data to it.
        .catch(error => {
          return Util.genericWrite({
            path: reportPath,
            serializedData: JSON.stringify([data], null, 1),
            message: 'generateReport: Writing reports.json to disk.',
            resolveData: data
          });
        })
    );
  }

  /**
   * A promisified fs.writeFile which can be used in any context.
   *
   * @static
   * @param {Object} options Object that contains relevant data for writing.
   * @return {Promise}
   * @memberof Util
   */
  static genericWrite(options) {
    return new Promise((resolve, reject) => {
      fs.writeFile(options.path, options.serializedData, 'utf8', err => {
        if (err) {
          reject(err);
        }
        logger.info(options.message);
        resolve(options.resolveData);
      });
    });
  }

  /**
   * Writes the raw JSP File Objects to
   * ../processor-output/jsp.json and returns
   * the rawJSPFileObjects for further piping
   *
   * @static
   * @param {Array} rawJSPFileObjects
   * @return {Array}
   * @memberof Util
   */
  static writeJSPFileObjectsToFile(rawJSPFileObjects) {
    /**
     * Output jsp.json file.
     * @type {TransformStream}
     */
    const transformStream = JSONStream.stringify('[', ',', ']');
    transformStream.pipe(
      fs.createWriteStream(Util.processorOutput('jsp.json'))
    );
    rawJSPFileObjects.forEach(jspFileObj => {
      transformStream.write(JSON.stringify(jspFileObj, null, 1));
    });
    transformStream.end();
    logger.info('writeJSPFileObjectsToFile: Wrote jsp.json to disk.');
    return rawJSPFileObjects;
  }

  /**
   * Updates the extensionCount map to show how many of
   * each type of extension are within a directory.
   *
   * @static
   * @param {Object} fileStats
   * @param {Object} extensionCount
   * @memberof Util
   */
  static updateExtensionMap(fileStats, extensionCount) {
    const ext = Util.getExt(fileStats.name).toLowerCase();
    if (extensionCount.hasOwnProperty(ext)) {
      extensionCount[ext]++;
    } else {
      extensionCount[ext] = 1;
    }
  }

  /**
   * Bootstrap the program by creating shared logging files (error.log, etc.)
   * used by the other classes.
   *
   * @static
   * @memberof Util
   */
  static bootstrap() {
    logger.info('Bootstrapping application. Generating shared error.log file.');
    // fs.createWriteStream(Util.logOutput('error.log'));
  }

  /**
   * The 'Stores' directory
   *
   * @readonly
   * @static
   * @return {String} the static directory path of 'Stores'
   * @memberof Util
   */
  static get STORES() {
    return path.join(Util.REPOBASEDIR, 'WebCommerce', 'Stores');
  }

  /**
   * Gets the array of objects representing the reports for the
   * processor runs.
   *
   * @readonly
   * @static
   * @return {Object[]}
   * @memberof Util
   */
  static get REPORTS() {
    const resolvePath = Util.processorOutput('reports.json');
    // Need this as every subsequent call was returning cached
    // data that we don't want as this report is being built during run time.
    delete require.cache[require.resolve(resolvePath)];
    return require(resolvePath);
  }

  /**
   * Gets the last object in the reports.json
   *
   * @readonly
   * @static
   * @return {Object}
   * @memberof Util
   */
  static get LAST_REPORT() {
    return Util.REPORTS.pop();
  }

  /**
   * Returns the repository base directory path as a string.
   *
   * @readonly
   * @static
   * @return {String} The string representing the repository directory path.
   * @memberof Util
   */
  static get REPOBASEDIR() {
    return path.resolve(__dirname, '../../../../');
  }

  /**
   * The Stores/WebContent directory
   *
   * @readonly
   * @static
   * @return {String} The static directory path of 'WebContent'
   * @memberof Util
   */
  static get STORES_WEBCONTENT() {
    const WEBCONTENT = path.join(Util.STORES, 'WebContent');
    return WEBCONTENT;
  }

  /**
   * The tiles-def XMLs. Theoretically, these should be the only JSPs that
   * matter after responsive redesign.
   *
   * @readonly
   * @static
   * @return {Array} The array of strings representing tiles-def file paths
   * @memberof Util
   */
  static get TILES() {
    const TILES = [
      path.join(Util.STORES_WEBCONTENT, 'WEB-INF', 'tiles-defs-checkout.xml'),
      path.join(Util.STORES_WEBCONTENT, 'WEB-INF', 'tiles-defs-json.xml'),
      path.join(Util.STORES_WEBCONTENT, 'WEB-INF', 'tiles-defs-myaccount.xml'),
      path.join(Util.STORES_WEBCONTENT, 'WEB-INF', 'tiles-defs-rx-json.xml'),
      path.join(Util.STORES_WEBCONTENT, 'WEB-INF', 'tiles-defs-rx.xml'),
      path.join(Util.STORES_WEBCONTENT, 'WEB-INF', 'tiles-defs.xml')
    ];
    return TILES;
  }

  /**
   * Returns the directory path housing the Stores struts files.
   *
   * @readonly
   * @static
   * @return {String} The directory path housing the Stores struts files.
   * @memberof Util
   */
  static get STORES_WEBINF() {
    return path.join(Util.STORES_WEBCONTENT, 'WEB-INF');
  }

  /**
   * The hard coded spreadsheet ID that this application works with.
   *
   * @readonly
   * @static
   * @return {String} The spreadsheet ID
   * @memberof Util
   */
  static get SPREADSHEET_ID() {
    const spreadsheetId = '19N4e0xtjKnovz7ppMGqdPGql3mq8dfGl4tN-x4yyL_E';
    return spreadsheetId;
  }

  /**
   * The hard coded audit Sheet ID that this application works with.
   *
   * @readonly
   * @static
   * @return {String} The audit sheet ID
   * @memberof Util
   */
  static get AUDIT_SHEET_ID() {
    const auditSheetId = '2017230126';
    return auditSheetId;
  }

  /**
   * The RegExs for finding nested JSP references will pull a few invalid
   * JSP names. For example,
   * \\Widgets\\Product\\${richMediaFileParam}&immediate_load - This filter
   * will remove these from an array.
   *
   * @static
   * @param {String} jsp The JSP string to test
   * @return  {Boolean} If the JSP doesn't include any of these specific
   *  variables.
   * @memberof Util
   */
  static validJSPs(jsp) {
    return (
      !jsp.includes('${richMediaFileParam}') &&
      !jsp.includes('${element.elementInnerContent.objectId}') &&
      !jsp.includes('${jsp_name}')
    );
  }

  /**
   * Returns the extension of the filename, provided it has one.
   *
   * @static
   * @param {String} fileName The file name to get the extension from
   * @return {String} The string representing the extension
   * @memberof Util
   */
  static getExt(fileName) {
    return fileName.split('.').pop();
  }

  /**
   * Constructs the RegEx used to find occurences of jsp / jspf
   * by property name.
   *
   * @static
   * @param {String} property
   * @return {RegExp}
   * @memberof Util
   */
  static getJSPRegex(property) {
    const regex = new RegExp(
      `${property}\\s*=(".*\.jsp"|".*\.jspf"|'.*\.jsp'|'.*\.jspf'|[^"'][^\s]*)`,
      'g'
    );
    return regex;
  }

  /**
   * Constructs the RegEx used to find occurences of jsp / jspf
   * by property name.
   *
   * @static
   * @param {String} property
   * @return {RegExp}
   * @memberof Util
   */
  static getJSPRegexAlt(property) {
    const jspQuote = `${property}\\s*=\\s*"(.*\.jsp?)\\s*"`;
    const jspTick = `${property}\\s*=\\s*'(.*\.jsp?)\\s*'`;
    const jspfQuote = `${property}\\s*=\\s*"(.*\.jspf?)\\s*"`;
    const jspfTick = `${property}\\s*=\\s*'(.*\.jspf?)\\s*'`;
    const regex = new RegExp(
      `${jspQuote}|${jspTick}|${jspfQuote}|${jspfTick}`,
      'g'
    );
    return regex;
  }

  /**
   * Uses @property to get values from a property.
   *
   * @static
   * @param {String} property
   * @return {RegEx}
   * @memberof Util
   */
  static getPropertyValue(property) {
    const regex = new RegExp(`${property}\\s*=\\s*"(.*?)\\s*"`, 'g');
    return regex;
  }

  /**
   * Returns an escaped String.
   *
   * @static
   * @param {String} str
   * @return {String}
   * @memberof Util
   */
  static escape(str) {
    return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  /**
   * Used to fetch the JSPObjects from the shallow.json file.
   *
   * @static
   * @param {Object} jspObj
   * @return {RegExp} jspObjRegEx
   * @memberof Util
   */
  static getJSPObjectRegEx(jspObj) {
    let nestedFilePaths = '';
    for (let i = 0, len = jspObj.nested.length; i < len; i++) {
      nestedFilePaths += Util.escape(jspObj.nested[i]);
      if (i != len - 1) {
        nestedFilePaths += '|';
      }
    }
    const jspObjRegEx = new RegExp(
      `{.*?path":.*"(${nestedFilePaths})".*?}`,
      'g'
    );
    return jspObjRegEx;
  }

  /**
   * Get tag RegEx by name.
   *
   * @static
   * @param {String} tag
   * @return {RegExp}
   * @memberof Util
   */
  static getTagRegex(tag) {
    const regex = new RegExp(`<\\s*${tag}.*?>`, 'g');
    return regex;
  }

  /**
   * Get tag + content RegEx by name. Requires
   * that you remove newline characters.
   *
   * @static
   * @param {String} tag
   * @return {RegExp}
   * @memberof Util
   */
  static getTagContentsRegex(tag) {
    const regex = new RegExp(
      `<\\s*${tag}[^>]*\/\\s*>|<\\s*${tag}[^>]*>(.*?)<\\s*\/\\s*${tag}>`,
      'g'
    );
    return regex;
  }

  /**
   * Removes " from string.
   *
   * @static
   * @param {String} str
   * @return {String}
   * @memberof Util
   */
  static getCleanedStr(str) {
    const removedQuotes =
      str.length > 0 ? str.split('=')[1].replace(/"/g, '') : str;
    return removedQuotes;
  }

  /**
   * Removes the first slash from a path String.
   * /path/to/file -> path/to/file
   *
   * @static
   * @param {String} str
   * @return {String}
   * @memberof Util
   */
  static removeFirstSlash(str) {
    let strArray = str.split('/');
    if (strArray[0] == '') {
      strArray.shift();
    }
    str = strArray.join('/');
    strArray = str.split('\\');
    if (strArray[0] == '') {
      strArray.shift();
    }
    return strArray.join('\\');
  }

  /**
   * Case if jsp include path starts with "/". This means we're starting at
   * /WebContent/....
   *
   * @static
   * @param {String} jsp
   * @return {boolean}
   * @memberof Util
   */
  static startsAtWebContent(jsp) {
    let bool = false;
    try {
      if (jsp.split('/')[0] == '' || jsp.split(path.join('/'))[0] == '') {
        bool = true;
      }
    } catch (e) {
      console.error(e);
    }
    return bool;
  }

  /**
   * Versioned path variables like ${jspEsitesStoreDir} need to be replaced
   * with appropriate string paths. Each ${jspEsitesStoreDir} will produce
   * several strings.. eg
   * "${jspEsitesStoreDir}/file" -> "companyUSStorefrontAssetStore/file" and
   * "companyCAStorefrontAssetStore/file". After replacing variablesd
   *
   * @static
   * @param {Array} jspArray [description]
   * @param {Object} fileObj [desc]
   * @return {Array} resultantArray
   * @memberof Util
   */
  static sanitizeJSPs(jspArray, fileObj) {
    let resultantArray = [];
    jspArray.forEach(jsp => {
      jsp = Util.getCleanedStr(jsp);
      if (jsp.includes('${jspEsitesStoreDir}')) {
        // There are four store front asset stores..
        resultantArray.push(
          path.join(
            'companyUSStorefrontAssetStore',
            jsp.split('${jspEsitesStoreDir}')[1]
          )
        );
        resultantArray.push(
          path.join(
            'companyCAStorefrontAssetStore',
            jsp.split('${jspEsitesStoreDir}')[1]
          )
        );
        // These should be deprecated.
        resultantArray.push(
          path.join(
            'companyUSBCCatalogAssetStore',
            jsp.split('${jspEsitesStoreDir}')[1]
          )
        );
        resultantArray.push(
          path.join(
            'companyCABCCatalogAssetStore',
            jsp.split('${jspEsitesStoreDir}')[1]
          )
        );
      } else {
        // Otherwise just add it to the array for future processing.
        resultantArray.push(jsp);
      }
    });
    resultantArray = resultantArray.map(jsp => {
      return Util.resolveNestedJSPPath(fileObj, jsp);
    });
    return resultantArray;
  }

  /**
   * Given a jsp file path string that contains variables
   * or is a relative path, this function returns an absolute
   * path to the jsp by substituting those undesirables.
   *
   * @static
   * @param {Object} fileObj
   * @param {String} jsp
   * @return {String} The resolved JSP path as a string
   * @memberof Util
   */
  static resolveNestedJSPPath(fileObj, jsp) {
    let resolvedPath = '';
    /*
     * JSPs can reference the parent Catalog without going upstream aka
     * ../../companyGLOBALSAS/file - they can instead reference directly with
     * /companyGLOBALSAS/file. This first case handles that.
     */
    if (
      jsp.includes('CABC') ||
      jsp.includes('companyCABCCatalogAssetStore') ||
      jsp.includes('companyCABCStorefrontAssetStore') ||
      jsp.includes('companyCAStorefrontAssetStore') ||
      jsp.includes('companyGLOBALSAS') ||
      jsp.includes('companyUSBCCatalogAssetStore') ||
      jsp.includes('companyUSBCStorefrontAssetStore') ||
      jsp.includes('companyUSStorefrontAssetStore') ||
      jsp.includes('USBC')
    ) {
      resolvedPath = path.join(Util.STORES_WEBCONTENT, jsp.split('../').pop());
    } else if (jsp.includes('${StyleDir}')) {
      resolvedPath = path.join(
        Util.STORES_WEBCONTENT,
        'companyGLOBALSAS',
        'include',
        'styles',
        'style1',
        jsp.split('${StyleDir}')[1]
      );
    } else if (jsp.includes('${jspStoreDir}')) {
      // jspStoreDir is relative to the store directory we're nested
      // under. Therefore, we need to ensure we resolve jspStoreDir to the
      // correct name i.e. companyGLOBALSAS, companyUSStorefrontAssetStore, etc.
      const storeDir = Util.getStoreDir(fileObj.root);
      resolvedPath = path.join(
        Util.STORES_WEBCONTENT,
        storeDir,
        jsp.split('${jspStoreDir}')[1]
      );
    } else if (Util.startsAtWebContent(jsp)) {
      resolvedPath = path.join(
        Util.STORES_WEBCONTENT,
        Util.removeFirstSlash(jsp)
      );
    } else if (fileObj && fileObj.root) {
      resolvedPath = path.resolve(fileObj.root, jsp);
    } else {
      resolvedPath = jsp;
    }
    return resolvedPath;
  }

  /**
   * Recursively traverses a jspObject.nested
   * array property and inspects if there's a circular object
   * present. If so, returns true - meaning this JSP
   * contains a Circular reference.
   *
   * @static
   * @param {object} jspObj
   * @return {boolean}
   * @memberof Util
   */
  static hasCircular(jspObj) {
    let hasCircular = false;
    if (jspObj.hasOwnProperty('circular')) {
      hasCircular = true;
    } else {
      for (let i = 0, len = jspObj.nested.length; i < len; i++) {
        hasCircular = Util.hasCircular(jspObj.nested[i]);
        if (hasCircular) {
          break;
        }
      }
    }
    return hasCircular;
  }

  /**
   * Returns an array of struts JSP objects from an
   * array of deep struts JSPObjects. Recurses all children to get all objects.
   *
   * @static
   * @param {Object[]} deepStrutsJSPObjects The array of deep nested struts
   *  JSPObjects.
   * @return {StrutsJSPObject[]} strutsJSPObjects
   * @memberof Util
   */
  static getStrutsJSPObjectsFromDeepStrutsJSPObjectArray(deepStrutsJSPObjects) {
    const strutsJSPObjects = [];
    deepStrutsJSPObjects.forEach(deepStrutsJSPObject => {
      strutsJSPObjects.push(
        this.getStrutsJSPObjectFromDeepStrutsJSPObject(
          deepStrutsJSPObject,
          // Properties of the struts jsp object
          {
            strutsXML: deepStrutsJSPObject.strutsXML,
            forwardName: deepStrutsJSPObject.forwardName,
            forwardPath: deepStrutsJSPObject.forwardPath,
            deviceTypeId: deepStrutsJSPObject.deviceTypeId,
            storeDir: deepStrutsJSPObject.storeDir
          }
        )
      );
    });
    // Flatten the array of arrays.
    return strutsJSPObjects.reduce((acc, arr) => acc.concat(arr));
  }

  /**
   * Builds each struts JSPObject from the given deepStrutsJSPObject
   *
   * @static
   * @param {Object} deepStrutsJSPObject
   * @param {Object} strutsPropertiesObj
   * @param {Array} strutsJSPObjects
   * @return {void}
   * @memberof Util
   */
  static getStrutsJSPObjectFromDeepStrutsJSPObject(
    deepStrutsJSPObject,
    strutsPropertiesObj,
    strutsJSPObjects
  ) {
    strutsJSPObjects = strutsJSPObjects || [];
    // strutsJSPObjects.push(deepStrutsJSPObject.path);
    strutsJSPObjects.push(
      new StrutsJSPObject({
        strutsXML: strutsPropertiesObj.strutsXML,
        forwardName: strutsPropertiesObj.forwardName,
        forwardPath: strutsPropertiesObj.forwardPath,
        deviceTypeId: strutsPropertiesObj.deviceTypeId,
        storeDir: strutsPropertiesObj.storeDir,
        path: deepStrutsJSPObject.path,
        parent: deepStrutsJSPObject.parent
      })
    );
    if (deepStrutsJSPObject.nested.length > 0) {
      for (let i = 0; i < deepStrutsJSPObject.nested.length; i++) {
        const nestedJSPObject = deepStrutsJSPObject.nested[i];
        strutsJSPObjects.concat(
          this.getStrutsJSPObjectFromDeepStrutsJSPObject(
            nestedJSPObject,
            strutsPropertiesObj,
            strutsJSPObjects
          )
        );
      }
    }
    return strutsJSPObjects;
  }

  /**
   * Returns an array of tiles JSP objects from an
   * array of deep tiles JSPObjects. Recurses all children to get all objects.
   *
   * @static
   * @param {Array} deepTilesJSPObjects The array of deep nested tiles
   *  JSPObjects.
   * @return {Array} tilesJSPObjects
   * @memberof Util
   */
  static getTilesJSPObjectsFromDeepTilesJSPObjectArray(deepTilesJSPObjects) {
    const tilesJSPObjects = [];
    deepTilesJSPObjects.forEach(deepTilesJSPObject => {
      tilesJSPObjects.push(
        this.getTilesJSPObjectFromDeepTilesJSPObject(
          deepTilesJSPObject,
          // Properties of the tiles jsp object
          {
            tilesXML: deepTilesJSPObject.tilesXML,
            rootExtendsDefinition: deepTilesJSPObject.rootExtendsDefinition,
            rootDefinitionName: deepTilesJSPObject.rootDefinitionName,
            rootAncestor: deepTilesJSPObject.path
          }
        )
      );
    });
    // Flatten the array of arrays.
    return tilesJSPObjects.reduce((acc, arr) => acc.concat(arr));
  }

  /**
   * Builds each tiles JSPObject from the given deepTilesJSPObject
   *
   * @static
   * @param {Object} deepTilesJSPObject
   * @param {Object} tilesPropertiesObj
   * @param {Array} tilesJSPObjects
   * @return {void}
   * @memberof Util
   */
  static getTilesJSPObjectFromDeepTilesJSPObject(
    deepTilesJSPObject,
    tilesPropertiesObj,
    tilesJSPObjects
  ) {
    tilesJSPObjects = tilesJSPObjects || [];
    // tilesJSPObjects.push(deepTilesJSPObject.path);
    tilesJSPObjects.push(
      new TilesJSPObject({
        tilesXML: tilesPropertiesObj.tilesXML,
        path: deepTilesJSPObject.path,
        parent: deepTilesJSPObject.parent,
        rootExtendsDefinition: tilesPropertiesObj.rootExtendsDefinition,
        rootDefinitionName: tilesPropertiesObj.rootDefinitionName,
        rootAncestor: tilesPropertiesObj.rootAncestor
      })
    );
    if (deepTilesJSPObject.nested.length > 0) {
      for (let i = 0; i < deepTilesJSPObject.nested.length; i++) {
        const nestedJSPObject = deepTilesJSPObject.nested[i];
        tilesJSPObjects.concat(
          this.getTilesJSPObjectFromDeepTilesJSPObject(
            nestedJSPObject,
            tilesPropertiesObj,
            tilesJSPObjects
          )
        );
      }
    }
    return tilesJSPObjects;
  }

  /**
   * Returns a store directory name derived from
   * the root path.
   *
   * @static
   * @param {String} root
   * @return {String} storeDir
   * @memberof Util
   */
  static getStoreDir(root) {
    let storeDir = 'companyGLOBALSAS';
    let storeDirTemp = Util.getDirAfterWebContent(root, path.join('/'));
    if (!storeDirTemp) {
      // If we windows, forward slash action
      storeDirTemp = Util.getDirAfterWebContent(root, '\\\\');
    }
    if (
      storeDirTemp == 'CABC' ||
      storeDirTemp == 'USBC' ||
      storeDirTemp == 'companyCABCCatalogAssetStore' ||
      storeDirTemp == 'companyCABCStorefrontAssetStore' ||
      storeDirTemp == 'companyCAStorefrontAssetStore' ||
      storeDirTemp == 'companyUSBCCatalogAssetStore' ||
      storeDirTemp == 'companyUSBCStorefrontAssetStore' ||
      storeDirTemp == 'companyUSStorefrontAssetStore' ||
      storeDirTemp == 'companyGLOBALSAS'
    ) {
      storeDir = storeDirTemp;
    }
    return storeDir;
  }

  /**
   * Fetch the store directory name from STORE using the STORE_ID
   *
   * @static
   * @param {String} id The EWASDBSV.STORE.STORE_ID
   * @return {String} The directory name
   * @memberof Util
   */
  static getStoreDirById(id) {
    id = id || '0';
    const storeMap = {
      '': path.join('/'),
      '0': path.join('/'),
      '10001': 'ExtendedSitesHub', // Not used
      '10051': 'AssetStoreOrganization', // Not used
      '10101': 'companyUSBCCatalogAssetStore',
      '10151': 'companyCABCCatalogAssetStore',
      '10201': 'companyUSStorefrontAssetStore',
      '10251': 'companyCAStorefrontAssetStore',
      '10301': 'USBC',
      '10302': 'CABC',
      '10801': 'companyGLOBALCAS',
      '10851': 'companyGLOBALSAS'
    };
    // If storeMap doesn't contain the id, return a default "Stores" value
    return storeMap.hasOwnProperty(id) ? storeMap[id] : storeMap['0'];
  }

  /**
   * Fetches the store directory absolute path from STORE using the STORE_ID
   *
   * @static
   * @param {String} id The store ID
   * @return {String} The absolute path to the store directory
   * @memberof Util
   */
  static getStoreDirPathById(id) {
    const storeDir = Util.getStoreDirById(id);
    const storeDirPathMap = {
      '': Util.STORES_WEBCONTENT,
      Stores: Util.STORES_WEBCONTENT,
      companyUSBCCatalogAssetStore: path.join(
        Util.STORES_WEBCONTENT,
        'companyUSBCCatalogAssetStore'
      ),
      companyCABCCatalogAssetStore: path.join(
        Util.STORES_WEBCONTENT,
        'companyCABCCatalogAssetStore'
      ),
      companyUSStorefrontAssetStore: path.join(
        Util.STORES_WEBCONTENT,
        'companyUSStorefrontAssetStore'
      ),
      companyCAStorefrontAssetStore: path.join(
        Util.STORES_WEBCONTENT,
        'companyCAStorefrontAssetStore'
      ),
      USBC: path.join(Util.STORES_WEBCONTENT, 'USBC'),
      CABC: path.join(Util.STORES_WEBCONTENT, 'CABC'),
      companyGLOBALCAS: path.join(Util.STORES_WEBCONTENT, 'companyGLOBALCAS'),
      companyGLOBALSAS: path.join(Util.STORES_WEBCONTENT, 'companyGLOBALSAS')
    };
    return storeDirPathMap[storeDir];
  }

  /**
   * The identifier of the device to which the view will be sent.
   * The default device format is -1, which represents an HTTP Web browser.
   *
   * @static
   * @param {String} id The device format ID
   * @return {String}
   * @memberof Util
   */
  static getDeviceTypeByFmtId(id) {
    id = id || '-1';
    const deviceFormatMap = {
      '-21': 'MOBILE-BROWSER',
      '-10000': 'XMLHTTP',
      '-10001': 'ECSAXXMLHTTP',
      '-20000': 'XMLMQ',
      '-10003': 'SOAPHTTP',
      '-10': 'webservices',
      '-1': 'BROWSER',
      '-2': 'I_MODE',
      '-3': 'E-mail',
      '-4': 'MQXML',
      '-5': 'MQNC',
      '-7': 'SMS',
      '-8': 'AlertPortlet'
    };
    // If deviceFormatMap doesn't contain the id, return a default "BROWSER"
    // value
    return deviceFormatMap.hasOwnProperty(id)
      ? deviceFormatMap[id]
      : deviceFormatMap['-1'];
  }

  /**
   * Returns the directory name after WebContent of a file
   * path. Example:
   *  /Stores/WebContent/companyCABCStorefrontAssetStore/include/styles/style1
   * returns companyCABCStorefrontAssetStore
   *
   * @static
   * @param {String} root he file path to extract the dir name from
   * @param {String} splitDelim The delimiter to split
   *  the directory string. *nix based system paths will need
   *  to be split by '/' while windows splits by '\\'
   * @return {String} dirAfterWebContent
   * @memberof Util
   */
  static getDirAfterWebContent(root, splitDelim) {
    let dirAfterWebContent = '';
    root = root || '';
    const rootArray = root.split(splitDelim) || [];
    if (typeof rootArray[rootArray.indexOf('WebContent') + 1] !== undefined) {
      dirAfterWebContent = rootArray[rootArray.indexOf('WebContent') + 1];
    }
    return dirAfterWebContent;
  }

  /**
   * Get an array of JSPs strings nested in the file
   *
   * @static
   * @param {String} fileData The string representing the file data.
   * @param {Object} fileObj Object containing stats about the read file.
   * @return {Array} The array of nested JSPS.
   * @memberof Util
   */
  static getNestedJSPs(fileData, fileObj) {
    let nestedJsps = [];
    nestedJsps =
      // Get pattern file="...jsp(f)"
      (fileData.match(Util.getJSPRegexAlt('file')) || [])
        // Get pattern url="...jsp(f)"
        .concat(fileData.match(Util.getJSPRegexAlt('url')) || [])
        // Get pattern page="...jsp(f)"
        .concat(fileData.match(Util.getJSPRegexAlt('page')) || [])
        // Get pattern value="...jsp(f)"
        .concat(fileData.match(Util.getJSPRegexAlt('value')) || [])
        // Filter out invalid JSPs.
        .filter(Util.validJSPs);
    // If any versioned path variables exist, get them, then clean the
    // resultant array of JSP paths.
    nestedJsps = Util.sanitizeJSPs(nestedJsps, fileObj);
    return nestedJsps;
  }

  /**
   * Get an array of JSPs strings nested in the tile file
   *
   * @static
   * @param {String} fileData
   * @return {Array}
   * @memberof Util
   */
  static getJSPsInTile(fileData) {
    let jsps = [];
    jsps = (fileData.match(Util.getJSPRegexAlt('path')) || [])
      // Get pattern value="...jsp(f)"
      .concat(
        // Get pattern value="...jsp(f)"
        fileData.match(Util.getJSPRegexAlt('value')) || []
      )
      .map(jsp => {
        // Remove the attribute prefix/suffix
        // Splitting is necessary because some of the JSON tiles have multiple
        // jsps for a single value attribute.
        return Util.getCleanedStr(jsp).split(',');
      })
      .reduce((a, b) => a.concat(b), [])
      .map(jsp => {
        return Util.resolveNestedJSPPath(undefined, jsp);
      });
    return jsps;
  }

  /**
   * Takes a "definitionBlock" which is a string representing a tiles-def
   * definition entry and pulls the JSP references out of it using regex
   * matches on "path" and "value" properties and then filtering them by
   * extension.
   *
   * @static
   * @param {String} definitionBlock
   * @return {Array}
   * @memberof Util
   */
  static getJSPsFromDefinition(definitionBlock) {
    let jsps = [];
    jsps =
      // Get pattern path="..."
      (definitionBlock.match(Util.getPropertyValue('path')) || [])
        // Get pattern value="..."
        .concat(definitionBlock.match(Util.getPropertyValue('value')) || [])
        // Remove the attribute prefix/suffix
        // Splitting is necessary because some of the JSON tiles have multiple
        // jsps for a single value attribute.
        .map(val => {
          // Remove the attribute prefix/suffix
          // Splitting is necessary because some of the JSON tiles have multiple
          // jsps for a single value attribute.
          return Util.getCleanedStr(val).split(',');
        })
        // Flatten the nested arrays from the previous split operation.
        .reduce((a, b) => a.concat(b), [])
        // Filter out only values with .jsp/.jspf extensions
        .filter(val => {
          const ext = (Util.getExt(val) || '').toLowerCase();
          return ext === 'jsp' || ext === 'jspf';
        })
        // Resolve the absolute path of the filtered JSPs
        .map(jsp => {
          return Util.resolveNestedJSPPath(undefined, jsp);
        });
    return jsps;
  }

  /**
   * Get the tile definitions within a specific tiles-defs.xml.
   * => [
   *  ...
   *  "<definition name="companyGLOBALSAS.siteLayout" path="a.jsp">
   *    <put name="title" value="INDEX_TITLE"/>
   *  </definition>"
   *  ...
   * ]
   *
   * @static
   * @param {String} fileData
   * @return {Array}
   * @memberof Util
   */
  static getTileDefinitions(fileData) {
    // Remove line breaks from the file content as
    // getTagContextRegex requires this to work properly.
    fileData = fileData.replace(/\r\n|\n|\r/g, '');
    let tilesDefinitions = [];
    tilesDefinitions =
      fileData.match(Util.getTagContentsRegex('definition')) || [];
    return tilesDefinitions;
  }

  /**
   * Returns an array of variables set by the interrogated JSP(F) file
   *
   * Tags that set variables
   * <wcf:getData var=""/>
   * <wcf:getContextData />
   * <wcf:url var=""/>
   * <wcf:rest var=""/>
   * <wc:appconfig var=""/>
   * <wc:urldecode var=""/>
   * <seo:url var=""/>
   * <c:set var=""/>
   * <c:import var=""/>
   * <c:catch var=""/>
   * <c:remove var=""/>
   * <c:url var=""/>
   * <ctl:cache var=""/>
   * <ctl:preview var=""/>
   * <fmt:formatNumber var=""/>
   * <fmt:parseNumber var=""/>
   * <fmt:setBundle var=""/>
   * <fmt:formatDate var=""/>
   * <fmt:message var=""/>
   *
   * Parameter setting tags:
   * <wcf:param name="" value=""/>
   * <c:param name="" value=""/>
   * <seo:param name="" value=""/>
   *
   * Scope attribute:
   * - "page" -> Local to JSP(F)
   * - "request" -> Global
   * The scope attribute has the semantics defined in the JSP specification,
   * and takes the same values as the ones allowed in the <jsp:useBean>
   * action; i.e. page, request, session, application. If no value is
   * specified for scope, page scope is the default unless otherwise specified.
   *
   * @static
   * @param {String} fileData
   * @param {Object} fileObj
   * @return {Array}
   * @memberof Util
   */
  static getVariablesSet(fileData, fileObj) {
    let nestedVariables = [];
    nestedVariables =
      // Get pattern wcbase:useBean
      (fileData.match(Util.getTagRegex('wcbase:useBean')) || [])
        // Get pattern jsp:useBean
        .concat(fileData.match(Util.getTagRegex('jsp:useBean')) || [])
        // Get pattern wcf:useBean
        .concat(fileData.match(Util.getTagRegex('wcf:useBean')) || []);
    if (nestedVariables.length > 0) {
      logger.verbose('util.js.getVariablesSet: File', fileObj.filePath);
      logger.verbose(`util.js.getVariablesSet: Variables`, nestedVariables);
    }
    return nestedVariables;
  }

  /**
   * Stream a JSON file and perform some operation on it.
   *
   * @static
   * @param {Object} options Object that contains event handler functions
   *  and the actual file name we want to read.
   * @memberof Util
   */
  static readStream(options) {
    const transformStream = JSONStream.parse(options.delim || '*');
    const inputStream = fs.createReadStream(options.file);
    inputStream
      .pipe(transformStream)
      // Each "data" event will emit one item in our record-set.
      .on('data', function handleRecord(data) {
        const _data = {};
        try {
          _data.key = data.key;
          _data.value = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          logger.error('readStream', e);
        }
        if (options.onData) {
          options.onData(_data);
        }
      })
      // Once the JSONStream has parsed all the input, let's indicate done.
      .on('end', function handleEnd() {
        if (options.onEnd) {
          options.onEnd();
        }
      });
  }

  /**
   * stream-json variant for reading JSON arrays.
   *
   * @static
   * @param {Object} options
   * @memberof Util
   */
  static readJSONArrayStream(options) {
    const pipeline = fs
      .createReadStream(options.file)
      .pipe(StreamArray.withParser());
    pipeline.on('data', data => {
      const _data = {};
      try {
        _data.key = data.key;
        _data.value =
          typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      } catch (e) {
        logger.error('readJSONArrayStream', e);
      }
      if (options.onData) {
        options.onData(_data);
      }
    });
    pipeline.on('end', () => {
      if (options.onEnd) {
        options.onEnd();
      }
    });
    pipeline.on('error', error => {
      logger.error('readJSONArrayStream: Error', error);
      if (options.onError) {
        options.onError(error);
      }
    });
  }

  /**
   * Generic read file promise.
   *
   * @static
   * @param {String} filePath
   * @return {Promise}
   * @memberof Util
   */
  static readFilePromise(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            filePath,
            fileData: data
          });
        }
      });
    });
  }

  /**
   * Generic file stat promise
   *
   * @static
   * @param {String} filePath
   * @return {Promise}
   * @memberof Util
   */
  static statPromise(filePath) {
    return new Promise((resolve, reject) => {
      fs.stat(filePath, (err, stat) => {
        if (err) {
          reject(err);
        } else {
          resolve(stat);
        }
      });
    });
  }

  /**
   * Generic read directory promise.
   *
   * @static
   * @param {String} directory
   * @return {Promise} Resolves files of the {@link directory}
   * @memberof Util
   */
  static readDirPromise(directory) {
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (error, files) => {
        if (error) {
          reject(error);
        } else {
          resolve({
            directory,
            files
          });
        }
      });
    });
  }

  /**
   * Generic unlink (remove) file promise.
   *
   * @static
   * @param {String} filePath
   * @return {Promise}
   * @memberof Util
   */
  static unlinkPromise(filePath) {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, err => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  /**
   * Sort by path name
   *
   * @static
   * @param {Object} a JSPObject
   * @param {Object} b JSPObject
   * @return {Number}
   * @memberof Util
   */
  static byPath(a, b) {
    // ignore upper and lowercase
    const nameA = (a.name || a.filePath).toUpperCase();
    // ignore upper and lowercase
    const nameB = (b.name || b.filePath).toUpperCase();
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }
    // names must be equal
    return 0;
  }

  /**
   * Builds the path to the processor output folder.
   *
   * @static
   * @param {String} fileName
   * @return {String}
   * @memberof Util
   */
  static processorOutput(fileName) {
    return path.resolve(__dirname, '../../', 'processor-output', fileName);
  }

  /**
   * Builds the path to the site/_data folder.
   *
   * @static
   * @param {String} fileName
   * @return {String}
   * @memberof Util
   */
  static siteDataDir(fileName) {
    return path.resolve(__dirname, '../../', 'site', '_data', fileName);
  }

  /**
   * Builds the path to the site-templates folder.
   *
   * @static
   * @param {String} fileName
   * @return {String}
   * @memberof Util
   */
  static siteTemplateDir(fileName) {
    return path.resolve(__dirname, '../../', 'site-templates', fileName);
  }

  /**
   * Builds the path to the logs output folder.
   *
   * @static
   * @param {String} fileName
   * @return {String}
   * @memberof Util
   */
  static logOutput(fileName) {
    return path.resolve(__dirname, '../../', 'logs', fileName);
  }

  /**
   * Determines which objects from @_array are unique using the
   * set of property (...properties) values.
   *
   * @example
   * For example, if I pass an @_array of objects and several properties:
   * @array = [
   *  {'name': 'robert', 'role': 'dev'},
   *  {'name': 'robert', 'role': 'dev'},
   *  {'name': 'robert', 'role': 'qa'},
   *  {'name': 'kurt', 'role': 'dev'},
   * ]
   * @properties = 'name', 'role'
   *
   * This function would return the set of objects containing
   * unique values for all of the properties passed.
   * uniqueObjArray(@array, 'name', 'role')
   * => [
   *  {'name': 'robert', 'role': 'dev'},
   *  {'name': 'robert', 'role': 'qa'},
   *  {'name': 'kurt', 'role': 'dev'},
   * ]
   *
   * Whereas calling uniqueObjArray(@array, 'name') would yield:
   * => [
   *  {'name': 'robert', 'role': 'dev'},
   *  {'name': 'kurt', 'role': 'dev'},
   * ]
   *
   * @static
   * @param {Array} _array The array of objects to test uniqueness against
   * @param {...string} properties Arbitrary number of properties to
   *  determine uniqueness using each property's value.
   * @return {Array}
   * @memberof Util
   */
  static uniqueObjArray(_array, ...properties) {
    const uniqueArray = [];
    (_array || []).forEach(_arrayObj => {
      let propertiesMatch = true;
      (properties || []).forEach(property => {
        // MA-MA-MA-MONSTER LOOP... 3 nested loops lulz.
        const index = uniqueArray.findIndex(uniqueArrayObj => {
          return uniqueArrayObj[property] === _arrayObj[property];
        });
        if (index === -1) {
          propertiesMatch = false;
        }
      });
      // If any of the properties returned false, add to unique array.
      if (!propertiesMatch) {
        uniqueArray.push(_arrayObj);
      }
    });
    return uniqueArray;
  }

  /**
   * Converts {@link text} to ascii, prints to console, then resolves
   * the ascii in a promise.
   *
   * @static
   * @param {String} text To convert to ascii representation
   * @return {Promise}
   * @memberof Util
   */
  static ascii(text) {
    return new Promise((resolve, reject) => {
      figlet.text(text, (err, data) => {
        if (err) {
          reject(err);
        }
        console.log(data);
        resolve();
      });
    });
  }

  /**
   * Returns the list of tiles files from the Stores/WEB-INF
   * directory.
   *
   * @static
   * @return {Promise}
   * @memberof Tiles
   */
  static getTilesFiles() {
    return Util.readDirPromise(Util.STORES_WEBINF).then(data => {
      const tilesPaths = [];
      data.files.forEach(file => {
        const ext = Util.getExt(file);
        if (file.includes('tiles-defs') && ext === 'xml') {
          tilesPaths.push(path.join(Util.STORES_WEBINF, file));
        }
      });
      return tilesPaths;
    });
  }

  /**
   * Returns the name of a file from a filepath.
   * /Widgets/PrescriptionDetail/PrescriptionDetail.jsp
   * => PrescriptionDetail.jsp
   *
   * @static
   * @param {String} filePath
   * @return {String}
   * @memberof Util
   */
  static getFileName(filePath) {
    const splitFilePath = filePath.split(path.join('/'));
    return splitFilePath[splitFilePath.length - 1];
  }

  /**
   * Appends the warning objects to the last report in reports.json.
   *
   * @static
   * @param {TilesJSPObject[]} warningObjs The warning objects to append
   *  to the report
   * @param {String} processor The type of warning derived from this processor
   *  (tiles/struts)
   * @param {*} resolveData What are resolving after we write to report?
   * @return {Promise} Resolves the deepTilesJSPOBjects to contine chaining.
   * @memberof Tiles
   */
  static appendWarningsToReport(warningObjs, processor, resolveData) {
    const reports = Util.REPORTS;
    const lastReport = reports.pop();
    lastReport.warnings[processor] = warningObjs;
    reports.push(lastReport);
    return Util.genericWrite({
      path: Util.processorOutput('reports.json'),
      serializedData: JSON.stringify(reports, null, 1),
      message: `appendWarningsToReport: Writing warning objects to report.`,
      resolveData
    });
  }

  /**
   * Copies the ../processor-output/reports.json to the ../site/_data directory
   * to be sourced in the reports static html. Also writes each report from
   * reports.json as an individual report.
   *
   * @static
   * @param {*} data Any data you want to resolve. Pipe to the next promise
   * @param {Boolean} hasReport If the hasReport flag is passed, we write
   *  to site/_data.
   * @return {Promise} Resolves {@link data}
   * @memberof Util
   */
  static copyReportsToSiteData(data, hasReport) {
    if (hasReport) {
      const reports = Util.REPORTS;
      return Util.genericWrite({
        path: Util.siteDataDir('reports.json'),
        serializedData: JSON.stringify(reports, null, 1),
        message: `copyReportsToSiteData: Writing reports.json to site/_data`,
        resolveData: data
      }).then(data => {
        // Write individual reports to site/_data
        return Promise.all(
          reports.map(report => {
            const fileName = `report-${report.fileNameDateTime}.json`;
            return Util.genericWrite({
              path: Util.siteDataDir(fileName),
              serializedData: JSON.stringify(report, null, 1),
              message: `copyReportsToSiteData: Writing ${fileName} to site/_data`,
              resolveData: {}
            });
          })
        ).then(uselessData => data);
      });
    }
    return data;
  }

  /**
   * For each report in ../processor-output/reports.json, create a unique
   * report by using ./site-templates/report-template.html as a base and
   * substitutes the report file name.
   *
   * @static
   * @param {*} data Any data you want to resolve. Pipe to the next promise
   * @param {Boolean} hasReport If the hasReport flag is passed, we write
   *  to site/_data.
   * @return {Promise} Resolves {@link data}
   * @memberof Util
   */
  static createReportsHTML(data, hasReport) {
    if (hasReport) {
      const reports = Util.REPORTS;
      // Write individual reports to site/_data
      return Util.readFilePromise(
        Util.siteTemplateDir('report-template.html')
      ).then(result => {
        return Promise.all(
          reports.map((report, i) => {
            const fileName =
              i === reports.length - 1
                ? 'reports.html'
                : `report-${report.fileNameDateTime}.html`;
            const html = result.fileData.replace(
              /{& reportFileName &}/gi,
              report.fileNameDateTime
            );
            return Util.genericWrite({
              path: path.resolve(__dirname, '../../', 'site', fileName),
              serializedData: html,
              message: `createReportsHTML: Writing ${fileName} to site`,
              resolveData: {}
            });
          })
        ).then(uselessData => data);
      });
    }
    return data;
  }
}
module.exports = Util;
