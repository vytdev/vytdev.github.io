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
 * @returns A Promise which resolves after build. Use '.dispose()' to stop
 * the watcher.
 */
export async function watchAndBundle() {
  const ctx = await context(bundlerCfg);
  ctx.watch();
  util.log('Started long-running JS bundler using esbuild', esbVer);
  return ctx;
}
