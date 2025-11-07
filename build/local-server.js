import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import * as util from './util.js';
import config from '../config.js';


/**
 * Creates an express app instance.
 * @param sireDir The site folder.
 * @returns Express app instance.
 */
export function createStaticApp(siteDir) {
  const app = express();

  /* Log every request. */
  app.use((req, _, next) => {
    util.log(`${req.method} ${req.path}`);
    next();
  });

  /* Serve the site folder. */
  app.use(express.static(siteDir, { maxAge: 0 }));

  /* Serve index.html page for directories. */
  app.use(async (req, res, next) => {
    const reqPath = path.join(siteDir, req.path);
    try {
      if ((await fs.stat(reqPath)).isDirectory())
        return res.redirect(path.join(req.path, 'index.html'));
    } catch {}
    next();
  });

  /* If page not found. */
  app.use(async (req, res) => {
    res.status(404);
    const notFoundPg = path.join(siteDir, config.NOT_FOUND_PAGE);
    try {
      if ((await fs.stat(notFoundPg)).isFile())
        return res.sendFile(notFoundPg);
    } catch {}
    res.send(
      '404 - Page Not Found. path=' + req.path + '\n' +
      'Sorry, this is not the page you\'re looking for.');
  });

  return app;
}


/**
 * Starts an express app. Close the app using 'stopServer(app)'.
 * @param app The express app.
 * @param addr The address where to serve the app.
 * @param port The port where to serve the app.
 * @returns A Promise which resolves to the server instance.
 */
export async function startServer(app, addr, port) {
  return new Promise((res, rej) => {
    const srv = app.listen(port, addr, (err) => {

      if (err) {
        util.log('Could not start a local test server');
        rej(err);
        return;
      }

      const hostName = addr.includes(':')
        ? `[${addr}]` : addr;
      util.log(`Listening at ${hostName} port ${port}`);
      res(srv);

    });
  });
}


/**
 * Stops an express app.
 * @param srv The express server instance.
 * @returns A Promise which resolves once the server is fully stopped.
 */
export async function stopServer(srv) {
  return new Promise((res, rej) => {
    srv.close((err) => {

      if (err) {
        util.log('Could not stop local test server');
        rej(err);
        return;
      }

      util.log('Local test server closed');
      res();
    });
  })
}
