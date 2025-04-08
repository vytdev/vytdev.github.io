const dec = (x) => decodeURIComponent((x || '').replace(/\+/g, ' '));
const pairs = window.location.search.substring(1).split('&');
const query = module.exports = {};

for (let i = 0; i < pairs.length; i++) {
  const split = pairs[i].split('=');
  query[dec(split[0])] = dec(split[1]);
}
