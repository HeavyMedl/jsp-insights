const path = require('path');
const Util = require('./util');

const slash = path.join('/');
/**
 * Use the path module to add specific files to the exclusion list (array) to
 * guarentee they are never removed programmatically.
 */
const absolutePaths = [
  path.join(Util.STORES_WEBCONTENT, 'BigIpHealthCheck.jsp'),
  path.join(Util.STORES_WEBCONTENT, 'companyGLOBALSAS', 'BigIpHealthCheck.jsp'),
  path.join(Util.STORES_WEBCONTENT, 'swagger', 'index.jsp'),
  // There isn't an explicit struts entry for PDP, IBM resolves this
  // under the hood, which we then import a tiles reference
  path.join(
    Util.STORES_WEBCONTENT,
    'companyGLOBALSAS',
    'ShoppingArea',
    'CatalogSection',
    'CatalogEntrySubsection',
    'ProductDisplay.jsp'
  ),
  // Same reason as above for Bundle page.
  path.join(
    Util.STORES_WEBCONTENT,
    'companyGLOBALSAS',
    'ShoppingArea',
    'CatalogSection',
    'CatalogEntrySubsection',
    'BundleDisplay.jsp'
  )
];
/**
 * If a file path contains these patterns it will be exempt from removal.
 * Do file names, directory names, etc. Directory names should use the
 * path module to ensure all-OS compatibility.
 */
const patterns = [
  // Layout Builder JSPs get included dynamically
  'LayoutBuilder',
  // Exclude email templates
  `${slash}Messages${slash}`,
  // Any JSPs that end with this pattern are email templates we want to exclude.
  'HTMLEmail.jsp'
];
module.exports = {
  absolutePaths,
  patterns
};
