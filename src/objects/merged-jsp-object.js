/**
 * Plain ol' JavaScript object representing the JSP and its tiles/struts
 * compliments.
 */
class MergedJSPObject {
  /**
   * Creates an instance of MergedJSPObject.
   * @param {Object} obj The object containing components of the
   *  MergedJSPObject.
   */
  constructor(obj) {
    /**
     * The points associated with this object. The higher the points,
     * the greater the likelihood of a meaningful JSP.
     * @type {Number}
     */
    this.points = obj.points || 0;
    /**
     * The size of this JSP file in bytes.
     * @type {String}
     */
    this._size = obj._size;
    /**
     * The human readable size of this JSP file.
     * @type {String}
     */
    this.size = obj.size;
    /**
     * The name of the JSP without any pathing.
     * @type {String}
     */
    this.name = obj.name;
    /**
     * The root directory for this JSP
     * @type {String}
     */
    this.root = obj.root;
    /**
     * The path of the JSP
     * @type {String}
     */
    this.filePath = obj.filePath;
    /**
     * The TIlesJSPObject associated with this JSP
     * @type {TilesJSPObject}
     */
    this.tilesJSPObject = obj.tilesJSPObject || undefined;
    /**
     * The StrutsJSPObject associated with this JSP
     * @type {StrutsJSPObject}
     */
    this.strutsJSPObject = obj.strutsJSPObject || undefined;
    /**
     * The GitJSPObject wrapper associated with this JSP
     * @type {GitJSPObjectWrapper}
     */
    this.gitJSPObject = obj.gitJSPObject || undefined;
    /**
     * The ResponseObject associated with this JSP
     * @type {ResponseObject}
     */
    this.responseObject = obj.responseObject || undefined;
  }
}
module.exports = MergedJSPObject;
