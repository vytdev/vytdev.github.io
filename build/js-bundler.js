import { build, context, version as esbVer } from 'esbuild';
import path from 'path';
import * as util from './util.js';
import config from '../config.js';


const bundlerCfg = {
  entryPoints: [config.CLIENT_ENTRY],
  outfile: path.join(config.OUT, config.CLIENT_OUTPUT),
  bundle: true,
  minify: true,
  sourcemap: true,
  format: 'iife',
  target: ['es2018'],
};

let watchCtx;


/**
 * Build the bundle once.
 * @returns Nothing. A plain Promise.
 */
export async function bundleOnce() {
  await build(bundlerCfg);
  util.log('Built client JS');
}


/**
 * Watch changes in the client source dir and build.
 * Use 'bundleStop()' to stop.
 */
export async function bundleWatch() {
  if (watchCtx)
    throw new Error('There is a currently active watcher');
  watchCtx = await context(bundlerCfg);
  watchCtx.watch();
  util.log('Started long-running JS bundler using esbuild', esbVer);
}


/**
 * Stop bundler from watching source changes.
 */
export async function bundleStop() {
  if (!watchCtx)
    return;
  await watchCtx.dispose();
  watchCtx = null;
  util.log('Stopped long-running JS bundler');
}
