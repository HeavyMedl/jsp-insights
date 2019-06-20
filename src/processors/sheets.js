const SheetsAPI = require('sheets-api');
const prettyBytes = require('pretty-bytes');
const path = require('path');
const Util = require('../utility/util');
const logger = require('../utility/logger')(
  {
    id: 'sheets.js'
  },
  'verbose'
);

const credentialsPath = path.resolve(__dirname, '../../credentials.json');
/**
 * Class for interacting with Goolge Sheets API.
 * @extends {SheetsAPI}
 */
class Sheets extends SheetsAPI {
  /**
   * Creates an instance of Sheets.
   * @param {String} spreadsheetId The spreadsheet Id that
   *  we're working with.
   * @param {String} auditSheetId The sheet Id where the audited object
   *  metadata will be appended to.
   */
  constructor(spreadsheetId, auditSheetId) {
    super(credentialsPath);
    this.spreadsheetId = spreadsheetId;
    this.auditSheetId = auditSheetId;
    logger.info(
      `See spreadsheet: https://docs.google.com/spreadsheets/d/${
        this.spreadsheetId
      }/`
    );
    // =ArrayFormula(COUNTIF('Tiles JSPs'!A:A,B2:B))
  }

  /**
   * Returns an object that represents a "clear operation"
   * which will clear the spreadsheet of all values.
   *
   * @param {Object} options Optional options to specify
   *  sheetId, startRowIndex, and fields.
   * @return {Object}
   * @memberof Sheets
   */
  getClearOperation(options) {
    return {
      // Clear operation.
      updateCells: {
        range: {
          sheetId: (options && options.sheetId) || 0,
          startRowIndex: (options && options.startRowIndex) || 0
        },
        fields: (options && options.fields) || 'userEnteredValue'
      }
    };
  }

  /**
   * Returns an object that represents a "append operation"
   * which will append rows of values to a given spreadsheet.
   *
   * @param {Object} options Optional options to specify sheetId
   *  and fields
   * @return {Object}
   * @memberof Sheets
   */
  getAppendOperation(options) {
    return {
      appendCells: {
        sheetId: (options && options.sheetId) || 0,
        rows: [],
        fields: (options && options.fields) || '*'
      }
    };
  }

  /**
   * Wrapper for creating row content.
   *
   * @return {Object}
   * @memberof Sheets
   */
  getRowObject() {
    return {
      values: []
    };
  }

  /**
   * The object used to create a string cell.
   *
   * @param {String} str The string that represents a cell value
   * @return {Object}
   * @memberof Sheets
   */
  getStringCell(str) {
    return {
      userEnteredValue: {
        stringValue: typeof str === 'string' ? str : 'Missing'
      }
    };
  }

  /**
   * Returns the top level batch update operation object
   * that holds the requests to make against spreadsheetId.
   *
   * @return {Object}
   * @memberof Sheets
   */
  getBatchUpdate() {
    return {
      spreadsheetId: this.spreadsheetId,
      resource: {
        requests: []
      }
    };
  }

  /**
   * Returns a batchUpdate request object that appends the all of the metadata
   * associated with the merged JSP object.
   *
   * @param {MergedJSPObject[]} mergedJSPObjects The merged JSP objects
   * @return {Object}
   * @memberof Sheets
   */
  getMergedJSPObjectBatchRequest(mergedJSPObjects) {
    const batchUpdateObj = this.getBatchUpdate();
    // First we'll clear the JSP sheet
    batchUpdateObj.resource.requests.push(this.getClearOperation());
    const appendOperation = this.getAppendOperation();
    // Create header labels
    const row = this.getRowObject();
    row.values.push(this.getStringCell('JSP(F) Name'));
    row.values.push(this.getStringCell('Path'));
    row.values.push(this.getStringCell('Size'));
    row.values.push(this.getStringCell('Points'));
    row.values.push(this.getStringCell('Tiles: XML'));
    row.values.push(this.getStringCell('Tiles: Parent'));
    row.values.push(this.getStringCell('Tiles: Root Ancestor'));
    row.values.push(this.getStringCell('Tiles: Root Definition Name'));
    row.values.push(this.getStringCell('Tiles: Root Extends Definition'));
    row.values.push(this.getStringCell('Struts: XML'));
    row.values.push(this.getStringCell('Struts: Forward Name'));
    row.values.push(this.getStringCell('Struts: Forward Path'));
    row.values.push(this.getStringCell('Struts: Path'));
    row.values.push(this.getStringCell('Struts: Device Type ID'));
    row.values.push(this.getStringCell('Struts: Parent'));
    row.values.push(this.getStringCell('Struts: Store Directory'));
    row.values.push(this.getStringCell('GIT: Created: Relative Time'));
    row.values.push(this.getStringCell('GIT: Created: ISO8601'));
    row.values.push(this.getStringCell('GIT: Created: Hash'));
    row.values.push(this.getStringCell('GIT: Created: Author'));
    row.values.push(this.getStringCell('GIT: Last Modified: Relative Time'));
    row.values.push(this.getStringCell('GIT: Last Modified: ISO8601'));
    row.values.push(this.getStringCell('GIT: Last Modified: Hash'));
    row.values.push(this.getStringCell('GIT: Last Modified: Author'));
    row.values.push(this.getStringCell('Struts Forward Name Responses'));
    appendOperation.appendCells.rows.push(row);

    mergedJSPObjects.forEach((m, i) => {
      const t = m.tilesJSPObject || {};
      const s = m.strutsJSPObject || {};
      const g = m.gitJSPObject || {};
      const gc = g.created || {};
      const gl = g.lastModified || {};
      const r = m.responseObject || {};

      const row = this.getRowObject();
      const name = this.getStringCell(m.name);
      const filePath = this.getStringCell(m.filePath);
      const size = this.getStringCell(m.size);
      const points = this.getStringCell(m.points.toString());
      const tilesXML = this.getStringCell(t.tilesXML);
      const tilesParent = this.getStringCell(t.parent);
      const tilesRootAncestor = this.getStringCell(t.rootAncestor);
      const tilesRootExtendsDefinition = this.getStringCell(
        t.rootExtendsDefinition
      );
      const tilesRootDefinitionName = this.getStringCell(t.rootDefinitionName);
      const strutsXML = this.getStringCell(s.strutsXML);
      const strutsForwardName = this.getStringCell(s.forwardName);
      const strutsforwardPath = this.getStringCell(s.forwardPath);
      const strutsPath = this.getStringCell(s.path);
      const strutsDeviceTypeId = this.getStringCell(s.deviceTypeId);
      const strutsParent = this.getStringCell(s.parent);
      const strutsStoreDir = this.getStringCell(s.storeDir);
      const gitCreatedTime = this.getStringCell(gc.relativeTime);
      const gitCreatedIso = this.getStringCell(gc.iso8601);
      const gitCreatedHash = this.getStringCell(gc.commitHash);
      const gitCreatedAuthor = this.getStringCell(gc.author);
      const gitLastModTime = this.getStringCell(gl.relativeTime);
      const gitLastModIso = this.getStringCell(gl.iso8601);
      const gitLastModHash = this.getStringCell(gl.commitHash);
      const gitLastModAuthor = this.getStringCell(gl.author);
      row.values.push(name);
      row.values.push(filePath);
      row.values.push(size);
      row.values.push(points);
      row.values.push(tilesXML);
      row.values.push(tilesParent);
      row.values.push(tilesRootAncestor);
      row.values.push(tilesRootExtendsDefinition);
      row.values.push(tilesRootDefinitionName);
      row.values.push(strutsXML);
      row.values.push(strutsForwardName);
      row.values.push(strutsforwardPath);
      row.values.push(strutsPath);
      row.values.push(strutsDeviceTypeId);
      row.values.push(strutsParent);
      row.values.push(strutsStoreDir);
      row.values.push(gitCreatedTime);
      row.values.push(gitCreatedIso);
      row.values.push(gitCreatedHash);
      row.values.push(gitCreatedAuthor);
      row.values.push(gitLastModTime);
      row.values.push(gitLastModIso);
      row.values.push(gitLastModHash);
      row.values.push(gitLastModAuthor);
      let responseCellStr = '';
      (r.responses || []).forEach((resp, i) => {
        responseCellStr += `${resp.domain}: ${resp.responseStatusCode}; `;
      });
      row.values.push(this.getStringCell(responseCellStr));
      appendOperation.appendCells.rows.push(row);
    });
    batchUpdateObj.resource.requests.push(appendOperation);
    return batchUpdateObj;
  }

  /**
   * Appends the MergedJSPObject data to the spreadsheetId
   *
   * @param {MergedJSPObject[]} mergedJSPObjects Array of merged JSP Objects.
   * @return {Promise}
   * @memberof Sheets
   */
  appendMergedJSPObjects(mergedJSPObjects) {
    logger.info(
      'appendMergedJSPObjects: Appending MergedJSPObject data to spreadsheet.'
    );
    return (
      this.authorize()
        .then(auth =>
          this.spreadsheets(
            'batchUpdate',
            auth,
            this.getMergedJSPObjectBatchRequest(mergedJSPObjects)
          )
        )
        .catch(error => logger.error(error))
        // For further piping, return the objects for the next handler.
        .then(() => mergedJSPObjects)
    );
  }

  /**
   * Alternate entry for this class. Takes the audited-objects.json objects
   * and appends to the audited sheet of {@link spreadsheetId}
   *
   * @param {Object[]} auditedObjects The aray of objects representing jsps
   *  that have, or will be removed.
   * @return {Promise}
   * @memberof Sheets
   */
  audit(auditedObjects) {
    return this.appendAuditedObjects(auditedObjects);
  }

  /**
   * Appends the audited objects to the spreadsheetId
   *
   * @param {Object[]} auditedObjects
   * @return {Promise}
   * @memberof Sheets
   */
  appendAuditedObjects(auditedObjects) {
    logger.info(
      'appendAuditedObjects: Appending audited object data to spreadsheet.'
    );
    return (
      this.authorize()
        .then(auth =>
          this.spreadsheets(
            'batchUpdate',
            auth,
            this.getAuditedObjectBatchRequest(auditedObjects)
          )
        )
        .catch(error => logger.error(error))
        // For further piping, return the objects for the next handler.
        .then(() => auditedObjects)
    );
  }

  /**
   * Returns a batchUpdate request object that appends all of the audited
   * objects to the specified audit sheet ID.
   *
   * @param {Object[]} auditedObjects
   * @return {Object}
   * @memberof Sheets
   */
  getAuditedObjectBatchRequest(auditedObjects) {
    const batchUpdateObj = this.getBatchUpdate();
    // First we'll clear the JSP sheet
    batchUpdateObj.resource.requests.push(
      this.getClearOperation({
        sheetId: this.auditSheetId
      })
    );
    const appendOperation = this.getAppendOperation({
      sheetId: this.auditSheetId
    });
    // Create header labels
    const row = this.getRowObject();
    row.values.push(this.getStringCell('JSP(F) Name'));
    row.values.push(this.getStringCell('JSP(F) Path'));
    row.values.push(this.getStringCell('Time Removed'));
    row.values.push(this.getStringCell('Size'));
    row.values.push(this.getStringCell('Reason'));
    row.values.push(this.getStringCell('Keep?'));
    appendOperation.appendCells.rows.push(row);

    auditedObjects.forEach(auditedObject => {
      const row = this.getRowObject();
      const name = this.getStringCell(auditedObject.name);
      const filePath = this.getStringCell(auditedObject.filePath);
      const timeRemoved = this.getStringCell(auditedObject.timeRemoved);
      const size = this.getStringCell(prettyBytes(auditedObject.size));
      const reason = this.getStringCell(auditedObject.reason);

      row.values.push(name);
      row.values.push(filePath);
      row.values.push(timeRemoved);
      row.values.push(size);
      row.values.push(reason);
      row.values.push(this.getStringCell('N'));
      appendOperation.appendCells.rows.push(row);
    });
    batchUpdateObj.resource.requests.push(appendOperation);
    return batchUpdateObj;
  }

  /**
   * Entry point for this class.
   *
   * @return {Promise}
   * @memberof Sheets
   */
  execute() {
    const mergedJSPObjects = require(Util.processorOutput(
      'merged-jsp-objects.json'
    ));
    return this.appendMergedJSPObjects(mergedJSPObjects);
  }
}
module.exports = Sheets;
