import { renderMarkdown } from './markdown.js';
import fs from 'fs';

const path = process.argv[2];

if (!path)
  process.exit('path to md file!');

const cont = fs.readFileSync(path, { encoding: 'utf8' });
const env = {};
console.log(renderMarkdown(cont, env), env);
