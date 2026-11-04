import {
  TagSearch,
  TagStageIndex,
} from './search/tags.js';


const stage = new TagStageIndex();

stage.add(1, 'hello this has to work and idk why it has to happen and i trust it will work in my favor since i used pseudo code'.split(/\s+/g));

stage.add(2, 'this is another set hello hello it has to work along with the first in my favor since i have made'.split(/\s+/g));


console.log(stage);

const index = stage.finalize();
const search = new TagSearch(index, true);

const t = (q) => console.log(q, search.lookup(q));

t('hello');
t('first');
