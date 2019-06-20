/**
 * Plain ol' JavaScript object representing the response status codes
 * fetched from making HTTP requests to a series of domains using
 * struts forward names.
 */
class ResponseObject {
  /**
   * Creates an instance of ResponseObject.
   * @param {Object} obj
   * @memberof ResponseObject
   */
  constructor(obj) {
    /**
     * The forward name we're making requests against. Derived
     * from struts.json.
     * @type {String}
     */
    this.forwardName = obj.forwardName;
    /**
     * The array of objects representing the response to each
     * domain from requests to the {@link this.forwardName}. If theres
     * a read/open/response timeout, the object will contain an
     * error property.
     * @type {Object[]}
     */
    this.responses = obj.responses;
  }
}
module.exports = ResponseObject;
