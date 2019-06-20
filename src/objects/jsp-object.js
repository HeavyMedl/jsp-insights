/**
 * Plain ol' JavaScript object representing the JSP and its nested JSP(F)
 * inclusions.
 */
class JSPObject {
  /**
   * Creates an instance of JSPObject.
   * @param {Object} fileObj The object containing components of the
   *  JSP object.
   */
  constructor(fileObj) {
    /**
     * The name of the JSP
     * @type {String}
     */
    this.name = fileObj.fileStats.name;
    /**
     * The path of the JSP
     * @type {String}
     */
    this.path = fileObj.filePath;
    /**
     * The nested depth of the JSP (0 = parent)
     * @type {Number}
     */
    this.depth = fileObj.depth || 0;
    /**
     * The parent of the JSP (if not depth = 0)
     * @type {String}
     */
    this.parent = fileObj.parent || undefined;
    /**
     * In the case of a shallow nest, this is the array of nested
     * JSP paths within the JSP. In a deep nest, these strings are
     * transformed into JSP Objects.
     * @type {String[]|JSPObject[]}
     */
    this.nested = fileObj.jsps;
    /**
     * In the case where a circular reference exists, these values
     * would represent the nested paths, replacing "nested" so that we can
     * short circuit the recursion conversion to JSPObjects.
     * @type {String[]}
     */
    this._nested = fileObj._nested || undefined;
    /**
     * If a circular reference exists within the JSP, this would be
     * the object representing it.
     * @type {CiruclarObject}
     */
    this.circular = fileObj.circular || undefined;
  }
}
module.exports = JSPObject;
