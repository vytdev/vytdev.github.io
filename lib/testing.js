import {
  BM25Search,
  BM25StageIndex,
} from './search/bm25.js';


const d1_toks = 'hello this has to work and idk why it has to happen and i trust it will work in my favor since i used pseudo code'.split(/\s+/g);
const d2_toks = 'this is another set hello hello it has to work along with the first in my favor since i have made'.split(/\s+/g);



const stage = new BM25StageIndex();
stage.add(1, countTF(d1_toks));
stage.add(2, countTF(d2_toks));
console.log(stage);

const index = stage.finalize();
const search = new  BM25Search(index);

const t = (q) => console.log(q, search.lookup(q));

t('hello');
t('first');





function countTF(arr) {
  const TFs = Object.create(null);
  for (const t of arr)
    TFs[t] = (TFs[t] || 0) + 1;
  return TFs;
}
