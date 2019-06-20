/**
 * Plain ol' JavaScript object representing a Ciruclar Reference.
 * Contains meta data about the circular reference.
 */
class CircularObject {
  /**
   * Creates an instance of CircularObject.
   * @param {Object} obj The object containing components of the
   *  Circular Object.
   */
  constructor(obj) {
    /**
     * The first included depth number will tell us at what depth, relative
     * to the top-most level (0) and the child JSPObject this Circular object
     * is attached to, where this JSP object was first included
     * in the nested structure, which will identify the circular reference.
     * @type {Number}
     */
    this.firstIncludedDepth = obj.firstIncludedDepth;
    /**
     * Tells us the last JSP(F) to include this JSP(F)
     * @type {String}
     */
    this.lastIncludedBy = obj.lastIncludedBy;
  }
}
module.exports = CircularObject;
