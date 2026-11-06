import { SearchIndex, SearchStageIndex } from './search/indices/index.js';


const d1_toks = 'hello this has to work and idk why it has to happen and i trust it will work in my favor since i used pseudo code'.split(/\s+/g);
const d2_toks = 'this is another set hello hello it has to work along with the first in my favor since i have made'.split(/\s+/g);



const stage = new SearchStageIndex();
stage.addField('title', 'bm25');
stage.updateDocField('doc1.md', 'title', d1_toks);
stage.updateDocField('doc2.md', 'title', d2_toks);

const obj = stage.finalize();
const index = new SearchIndex(obj);

console.log(stage);
console.log(obj);
const t = (q, f='title') => {
  const result = index.lookupField(f,q);
  console.log(Array.from(result));
};

t('hello');
t('first');
