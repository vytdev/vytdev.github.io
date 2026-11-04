import {
  BM25Search,
  BM25StageIndex,
  countFrequency,
  makeQuerySet,
} from './search/bm25.js';


const stage = new BM25StageIndex();

stage.add(1, countFrequency('hello this has to work and idk why it has to happen and i trust it will work in my favor since i used pseudo code'.split(/\s+/g)));

stage.add(2, countFrequency('this is another set hello hello it has to work along with the first in my favor since i have made'.split(/\s+/g)));


console.log(stage);

const index = stage.finalize();

const search = new BM25Search(index);



const query = makeQuerySet(countFrequency('first hello'.split(/\s+/g)));

console.log(search.search(query));
