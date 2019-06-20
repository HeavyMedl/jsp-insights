const path = require('path');
const fs = require('fs');
const Util = require('../utility/util');
const Tiles = require('./tiles');
const StrutsJSPObject = require('../objects/struts-jsp-object');
const logger = require('../utility/logger')(
  {
    id: 'struts.js'
  },
  'verbose'
);
/**
 * Fetches all of the JSPs included in the struts XMLs. Creates
 * "struts JSP Objects" to inform the client about attributes of each
 * JSP (which struts XML, forward name, forward path its associated with).
 * Writes struts.json to the processor-output directory.
 */
class Struts {
  /**
   * Creates an instance of Struts.
   * @memberof Struts
   */
  constructor() {
    /**
     * Array of deep struts JSP objects. These are struts-jsp-objects and
     * deep-object
     * @type {Object[]}
     */
    this.deepStrutsJSPObjects = [];
    /**
     * Struts entries that point to Tiles definitions.
     * @type {StrutsJSPObject[]}
     */
    this.tilesStrutsJSPObjects = [];
  }

  /**
   * Returns the list of struts files from the Stores/WEB-INF
   * directory.
   *
   * @return {Promise}
   * @memberof Struts
   */
  getStrutsFiles() {
    return Util.readDirPromise(Util.STORES_WEBINF).then(data => {
      const strutsPaths = [];
      data.files.forEach(file => {
        const ext = Util.getExt(file);
        if (file.includes('struts-') && ext === 'xml') {
          strutsPaths.push(path.join(Util.STORES_WEBINF, file));
        }
      });
      return strutsPaths;
    });
  }

  /**
   * For each struts path, read the file, pull all of the forwards from the
   * file and resolve an object representing the strutsFile + strutsForwards
   *
   * @param {String[]} strutsPaths
   * @return {Promise} Resolves object representing the strutsFile +
   *  strutsForwards.
   * @memberof Struts
   */
  getForwardsFromStrutsFiles(strutsPaths) {
    return Promise.all(
      strutsPaths.map(strutsFileName => {
        return Util.readFilePromise(strutsFileName)
          .then(data => {
            let fileData = data.fileData;
            // Remove line breaks from the file content as
            // getTagContextRegex requires this to work properly.
            fileData = fileData.replace(/\r\n|\n|\r/g, '');
            let strutsForwards = [];
            strutsForwards = (
              fileData.match(Util.getTagContentsRegex('forward')) || []
            ).concat(this.getForwardsFromActionMappings(fileData));
            return {
              strutsFileName,
              strutsForwards
            };
          })
          .catch(error => {
            logger.error('getTopLevelStrutsJSPObjects', error);
          });
      })
    );
  }

  /**
   * An alternate forward pattern is in the form of
   * <action path="/StorePreviewLinkView"
   *  forward="/tools/preview/StorePreviewLink.jsp" />
   *
   * This function fetches instances and converts them to <forwards/>
   * so we can reuse the logic in {@link createStrutsObjects}. So the above
   * becomes:
   * <forward name="StorePreviewLinkView"
   *  path="/tools/preview/StorePreviewLink.jsp">
   *
   * @param {String} fileData
   * @return {String[]} forwards
   * @memberof Struts
   */
  getForwardsFromActionMappings(fileData) {
    const forwards = [];
    const actionMappings =
      fileData.match(Util.getTagContentsRegex('action-mappings')) || [];
    actionMappings.forEach(actionMapping => {
      const actionTags = actionMapping.match(Util.getTagRegex('action')) || [];
      const actionTagsWithForwards = actionTags.filter(x =>
        x.includes('forward=')
      );
      actionTagsWithForwards.forEach(x => {
        let name = x.match(Util.getPropertyValue('path'));
        name = Util.getCleanedStr(name.length > 0 ? name[0] : '');
        name = Util.removeFirstSlash(name);

        let _path = x.match(Util.getPropertyValue('forward'));
        _path = Util.getCleanedStr(_path.length > 0 ? _path[0] : '');

        const forward = `<forward name="${name}" path="${_path}">`;
        forwards.push(forward);
      });
    });
    return forwards;
  }

  /**
   * Creates struts JSP objects using the struts forwards from each
   * struts XML files. Some of these objects are irrelevant, however, as some
   * of them map to non-Stores based directories like ExtendedSiteHubs/
   * Accelerator, therefore the objects should be filtered appropriately.
   *
   * @param {Object[]} strutsData Contains struts file name and associated
   *  forwards scraped from the file.
   * @return {StrutsJSPObject[]} Raw struts JSP objects to be processed fruther.
   * @memberof Struts
   */
  createStrutsObjects(strutsData) {
    const strutsJSPObjects = [];
    strutsData.forEach(struts => {
      struts.strutsForwards.forEach(forwardBlock => {
        const forwardTag = forwardBlock.match(Util.getTagRegex('forward'));
        // The name of the forward
        let forwardName =
          (forwardTag[0] || '').match(Util.getPropertyValue('name')) || [];
        forwardName = Util.getCleanedStr(
          forwardName.length > 0 ? forwardName[0] : ''
        );
        // The path of the forward
        let forwardPath =
          (forwardTag[0] || '').match(Util.getPropertyValue('path')) || [];
        forwardPath = Util.getCleanedStr(
          forwardPath.length > 0 ? forwardPath[0] : ''
        );

        const forwardNameComponents = forwardName.split('/');
        const storeDir = Util.getStoreDirById(forwardNameComponents[1]);
        const deviceFormat = Util.getDeviceTypeByFmtId(
          forwardNameComponents[2]
        );
        const forwardPathResolved = Util.resolveNestedJSPPath(
          undefined,
          path.join(storeDir, forwardPath)
        );
        const extension = Util.getExt(forwardPath);

        // If the forward path is a JSP(F), we're not using tiles,
        // so we want to reference the absolute path of the JSP, otherwise,
        // we want to show the tiles definition name (we presume this is
        // a tiles definition name).
        forwardPath =
          extension === 'jsp' || extension === 'jspf'
            ? forwardPathResolved
            : forwardPath;

        strutsJSPObjects.push(
          new StrutsJSPObject({
            strutsXML: struts.strutsFileName,
            forwardName,
            path: forwardPath,
            forwardPath,
            deviceTypeId: deviceFormat,
            storeDir
          })
        );
      });
    });
    return strutsJSPObjects;
  }

  /**
   * Checks the file path (forwardPath) of each struts JSP object
   * generated from the previous step to see if the JSP(F) exists
   * in the Stores project.
   *
   * @param {StrutsJSPObject[]} strutsJSPObjects
   * @return {Promise} Resolves strutsJSPObjects that have been filtered
   *  based on the criteria that they exist.
   * @memberof Struts
   */
  filterExistingFiles(strutsJSPObjects) {
    return Tiles.getDefinitionNames().then(names => {
      return Promise.all(
        strutsJSPObjects.map(strutsJSPObject => {
          return Util.statPromise(strutsJSPObject.forwardPath)
            .then(data => strutsJSPObject)
            .catch(error => {
              // ex. companyGLOBALSAS.memberRestricted
              const forwardPath = `${strutsJSPObject.storeDir}.${
                strutsJSPObject.forwardPath
              }`;
              // Check if the forwardPath matches any of the
              // "names", this would imply its a tiles definition, push this
              // result to the tilesStrutsJSPObjects array.
              const defintionNameIndex = names.findIndex(name => {
                return name == forwardPath;
              });
              if (defintionNameIndex > -1) {
                strutsJSPObject.forwardPath = names[defintionNameIndex];
                this.tilesStrutsJSPObjects.push(strutsJSPObject);
              }
            });
        })
      ).then(strutsJSPObjects =>
        strutsJSPObjects.filter(strutsJSPObject => {
          // filter undefined
          return typeof strutsJSPObject !== 'undefined';
        })
      );
    });
  }

  /**
   * Returns an array of deep "Struts" JSPObjects derived from the
   * strutsJSPObject.forwardPath property. Each struts JSP object has a
   * "forwardPath" which maps to the deep JSP object "path".
   *
   * @param {StrutsJSPObject[]} strutsJSPObjects
   * @return {Promise} Resolves the deep Struts JSP Objects derived from
   *  {@link strutsJSPObjects}.
   * @memberof Struts
   */
  getDeepStrutsJSPObjects(strutsJSPObjects) {
    logger.info(
      'getDeepStrutsJSPObjects: Aggregating array of deep struts JSPObjects'
    );
    return new Promise((resolve, reject) => {
      Util.readStream({
        file: Util.processorOutput('deep.json'),
        onData: data => {
          const deepJSPObject = data.value;
          const indexOfPath = strutsJSPObjects.findIndex(strutsJSPObject => {
            return strutsJSPObject.forwardPath === deepJSPObject.path;
          });
          if (indexOfPath > -1) {
            // At this point we want to merge the properties specific to
            // "struts" object into the deep JSP Object. Creating a monster
            // object of great meta value. deep jsp object <-- struts jsp object
            const deepStrutsJSPObject = Object.assign(
              deepJSPObject,
              strutsJSPObjects[indexOfPath]
            );
            this.deepStrutsJSPObjects.push(deepStrutsJSPObject);
          }
        },
        onEnd: () => {
          const deepPaths = this.deepStrutsJSPObjects.map(deepJSP => {
            return deepJSP.path;
          });
          const strutsJSPPaths = strutsJSPObjects.map(
            strutsJSPObject => strutsJSPObject.forwardPath
          );
          const missing = strutsJSPPaths.filter(x => !deepPaths.includes(x));
          let objs = [];
          if (missing.length > 0) {
            // Reverse lookup object(s).
            objs = strutsJSPObjects.filter(obj => {
              return missing.includes(obj.forwardPath);
            });
            const _method = 'getDeepStrutsJSPObjects:';
            const _missing = JSON.stringify(missing, null, 2);
            const _message = `Couldn't get deep JSPObject for ${_missing}.\n`;
            const _info1 = 'Possibly an orphaned file or deprecated reference.';
            const _info2 = 'Did you pull from develop and not re-run index.js?';
            logger.warn(`${_method} ${_message} ${_info1} ${_info2}`, objs);
          }
          logger.info(
            'getDeepStrutsJSPObjects:',
            'Completed. Returing array of deep struts JSPObjects'
          );
          resolve({
            deepStrutsJSPObjects: this.deepStrutsJSPObjects,
            warningObjs: objs
          });
        },
        onError: error => {
          reject(error);
        }
      });
    });
  }

  /**
   * Returns the unique struts jsp objects derived from the
   * deepStrutsJSPObjects.
   *
   * @param {Object[]} deepStrutsJSPObjects The deep StrutsJSPObjects
   *  to pull JSP paths from.
   * @return {StrutsJSPObject[]} The unique struts JSP objects
   * @memberof Struts
   */
  getStrutsJSPObjectsFromDeepJSPObject(deepStrutsJSPObjects) {
    const strutsJSPObjects = Util.getStrutsJSPObjectsFromDeepStrutsJSPObjectArray(
      deepStrutsJSPObjects
    );
    // TODO: Do we really want this?
    // Give me the occurences of objects whose 'path' values are unique.
    const uniqueStrutsJSPObjects = Util.uniqueObjArray(
      strutsJSPObjects.concat(this.tilesStrutsJSPObjects),
      'strutsXML',
      'forwardName',
      'forwardPath',
      'path',
      'deviceTypeId',
      'storeDir'
    );
    return uniqueStrutsJSPObjects;
  }

  /**
   * Writes the {@link uniqueStrutsJSPObjects} to the procoessor-output
   * directory as struts.json.
   *
   * @param {Object[]} uniqueStrutsJSPObjects The struts JSP Objects to write
   *  to disk.
   * @return {Promise} Resolves {
   *  strutsJSPObjects: {@link uniqueStrutsJSPObjects},
   *  tilesStrutsJSPObjects: {@link tilesStrutsJSPObjects}
   * }
   * @memberof Struts
   */
  writeStrutsJSPObjectsToDisk(uniqueStrutsJSPObjects) {
    return new Promise((resolve, reject) => {
      fs.writeFile(
        Util.processorOutput('struts.json'),
        JSON.stringify(uniqueStrutsJSPObjects, null, 1),
        'utf8',
        err => {
          if (err) {
            reject(err);
          }
          logger.info(
            'writeStrutsJSPObjectsToDisk:',
            'Wrote struts.json to disk'
          );
          resolve({
            strutsJSPObjects: uniqueStrutsJSPObjects,
            tilesStrutsJSPObjects: this.tilesStrutsJSPObjects
          });
        }
      );
    });
  }

  /**
   * The entry point for this class.
   *
   * @param {Boolean} hasReport If the hasReport flag is passed, we write
   *  any warnings generated by this processor to report.json. Driven
   *  by the CLI flag --report.
   * @return {Promise}
   * @memberof Struts
   */
  execute(hasReport) {
    return this.getStrutsFiles()
      .then(this.getForwardsFromStrutsFiles.bind(this))
      .then(this.createStrutsObjects.bind(this))
      .then(this.filterExistingFiles.bind(this))
      .then(this.getDeepStrutsJSPObjects.bind(this))
      .then(data => {
        return hasReport
          ? Util.appendWarningsToReport(
              data.warningObjs,
              'struts',
              this.deepStrutsJSPObjects
            )
          : this.deepStrutsJSPObjects;
      })
      .then(this.getStrutsJSPObjectsFromDeepJSPObject.bind(this))
      .then(this.writeStrutsJSPObjectsToDisk.bind(this));
  }
}
module.exports = Struts;
