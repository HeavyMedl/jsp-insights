/**
 * Plain ol' JavaScript object representing the Tiles JSP
 * inclusions.
 */
class TilesJSPObject {
  /**
   * Creates an instance of TilesJSPObject.
   * @param {Object} tilesJSPObject
   */
  constructor(tilesJSPObject) {
    /**
     * The XML file referencing this JSP
     * @type {String}
     */
    this.tilesXML = tilesJSPObject.tilesXML || '';
    /**
     * The JSP path value.
     * @type {String}
     */
    this.path = tilesJSPObject.path || '';
    /**
     * If there's a parent file including this JSP(F), reference it here.
     * No parent indicates a reference to a JSP that is included
     * directly within the tiles-def.xml
     * @type {String}
     */
    this.parent = tilesJSPObject.parent || undefined;
    /**
     * The top-most (root) ancestor of this JSP - meaning the JSP referenced
     * in the tiles-def who is ultimately responsible for including this
     * JSP.
     * @type {String}
     */
    this.rootAncestor = tilesJSPObject.rootAncestor || undefined;
    /**
     * The name of the tile definition that this definitionName extends.
     * @type {String}
     */
    this.rootExtendsDefinition =
      tilesJSPObject.rootExtendsDefinition || undefined;
    /**
     * The name of the tiles definition associated with this JSP
     * @type {String}
     */
    this.rootDefinitionName = tilesJSPObject.rootDefinitionName || undefined;
  }
}
module.exports = TilesJSPObject;
