/**
 * Plain ol' JavaScript object representing the Struts forwards.
 */
class StrutsJSPObject {
  /**
   * Creates an instance of StrutsJSPObject.
   * @param {Object} strutsJSPObject
   */
  constructor(strutsJSPObject) {
    /**
     * The struts XML this object is derived from
     * @type {String}
     */
    this.strutsXML = strutsJSPObject.strutsXML;
    /**
     * The raw forward name. Will typically have a pattern like
     * {URL name of the View}/{Store Id}/{Device Format Type}
     * @type {String}
     */
    this.forwardName = strutsJSPObject.forwardName;
    /**
     * The reference to the JSP or tiles definition that this forward name
     * resolves to.
     * @type {String}
     */
    this.forwardPath = strutsJSPObject.forwardPath;
    /**
     * The JSP path value.
     * @type {String}
     */
    this.path = strutsJSPObject.path || '';
    /**
     * The device type represents which device this forward is meant for
     * aka BROWSER, MOBILE-BROWSER, EMAIL, etc.
     * @type {String}
     */
    this.deviceTypeId = strutsJSPObject.deviceTypeId;
    /**
     * The store directory associate with the forward path.
     * @type {String}
     */
    this.storeDir = strutsJSPObject.storeDir;
    /**
     * If there's a parent file including this JSP(F), reference it here.
     * No parent indicates a reference to a JSP that is included
     * directly within the struts XML
     * @type {String}
     */
    this.parent = strutsJSPObject.parent || undefined;
  }
}
module.exports = StrutsJSPObject;
