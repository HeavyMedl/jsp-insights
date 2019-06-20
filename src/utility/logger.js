const winston = require('winston');
const moment = require('moment');
const path = require('path');

module.exports = (_module, level) => {
  /**
   * Create a logger in your module by doing the following
   * const logger = require('path/to/logger.js')('module_name')
   * where module name maps to the definition in ./config.json OR can map
   * directly to the winston logger level strings ('error','warn','info',etc.)
   */
  const logger = new winston.Logger({
    handleExceptions: false,
    transports: [
      new winston.transports.Console({
        colorize: true,
        prettyPrint: true,
        label: path.basename(_module.id),
        timestamp() {
          return moment().format('YYYY-MM-DD HH:mm:ss.SSSS');
        }
      })
    ]
  });
  logger.level = level;
  return logger;
};
