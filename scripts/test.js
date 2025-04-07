/*
 * Creates a server for local testing.
 */

const config = require('../config.js');
const express = require('express');
const path = require('path');
const fs = require('fs');
const util = require('./util.js');


/**
 * Creates an express app instance.
 * @param sireDir The site folder.
 * @returns Express app instance.
 */
function createStaticApp(siteDir) {
  const app = express();

  /* Log every request. */
  app.use((req, res, next) => {
    util.log(`${req.method} ${req.path}`);
    next();
  });

  /* Serve the site folder. */
  app.use(express.static(siteDir, { maxAge: 0 }));

  /* Serve index.html page for directories. */
  app.use((req, res, next) => {
    const reqPath = path.join(siteDir, req.path);
    if (fs.existsSync(reqPath) && fs.statSync(reqPath).isDirectory()) {
      return res.redirect(path.join(req.path, 'index.html'));
    }
    next();
  });

  /* If page not found. */
  app.use((req, res, next) => {
    res.status(404);
    const notFoundPage = path.join(siteDir, config.NOT_FOUND_PAGE);
    if (fs.existsSync(notFoundPage) && fs.statSync(notFoundPage).isFile()) {
      return res.sendFile(notFoundPage);
    }
    res.send(
      '404 - Page Not Found. path=' + req.path + '\n' +
      'Sorry, this is not the page you\'re looking for.');
  });

  return app;
}


/**
 * Starts an express app.
 * @param app The express app.
 * @param addr The address where to serve the app.
 * @param port The port where to serve the app.
 */
function startServer(app, addr, port) {
  app.listen(port, addr, () => {
    const hostName = addr.includes(':')
      ? `[${addr}]` : addr;
    console.log(
      `Listening at ${addr} port ${port}\n` +
      `http://${hostName}:${port}/ ...`);
  });
}


module.exports = { createStaticApp, startServer };
