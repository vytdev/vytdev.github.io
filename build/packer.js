import { readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import JSZip from 'jszip';
import * as util from './util.js';
import config from '../config.js';


/**
 * Zip an entire directory.
 * @param folderPath The folder to zip.
 * @param outPath Where to save the zip file.
 */
export async function zipFolder(folderPath, outPath) {
  const zip = new JSZip();

  function addDirToZip(zipObj, folder) {
    const items = readdirSync(folder);
    for (const item of items) {
      const fullPath = path.join(folder, item);
      const stats = statSync(fullPath);
      if (stats.isDirectory()) {
        const subFolder = zipObj.folder(item);
        addDirToZip(subFolder, fullPath);
      } else {
        const data = readFileSync(fullPath);
        zipObj.file(item, data);
      }
      util.log(`pack: ${path.relative(config.OUT, fullPath)}`);
    }
  }

  addDirToZip(zip, folderPath);

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  writeFileSync(outPath, content);
}


/**
 * Zip the dist folder.
 */
export async function zipOut() {
  try {
    await zipFolder(config.OUT, `${config.SITE}.zip`)
    util.log('Output has been packed');
  }
  catch (e) {
    util.log('Failed to zip folder');
    console.log(e);
  }
}
