/**
 * Needed for the Debug Stick download page.
 */

const events = require('../events.js');
const util = require('../util.js');


const token = 'c2b59980d2030d5b5a7acaf6ef769fd56dc739b2ffcde64aefd715cc4d7dd130';

const versions = [
  { ver: 'v1.16.0', mc: ['1.21.80', '1.21.81/82', '1.21.90',
                         '1.21.92', '1.21.93/94'] },
  { ver: 'v1.15.0', mc: ['1.21.70', '1.21.71', '1.21.72'] },
  { ver: 'v1.14.1', mc: ['1.21.60', '1.21.61', '1.21.62'] },
  { ver: 'v1.14.0', mc: ['1.21.60', '1.21.61', '1.21.62'] },
  { ver: 'v1.13.0', mc: ['1.21.50', '1.21.51'] },
  { ver: 'v1.12.0', mc: ['1.21.40', '1.21.41', '1.21.43', '1.20.44'] },
  { ver: 'v1.11.0', mc: ['1.21.30'] },
  { ver: 'v1.10.1', mc: ['1.21.20', '1.21.21', '1.21.22', '1.21.23'] },
  { ver: 'v1.10.0', mc: ['1.21.20', '1.21.21', '1.21.22', '1.21.23'] },
  { ver: 'v1.9.0',  mc: ['1.21.0'] },
  { ver: 'v1.8.0',  mc: ['1.20.80'] },
  { ver: 'v1.7.0',  mc: ['1.20.70', '1.20.71'] },
  { ver: 'v1.6.0',  mc: ['1.20.60'] },
  { ver: 'v1.5.0',  mc: ['1.20.60'] },
  { ver: 'v1.4.0',  mc: ['1.20.50', '1.20.51'] },
  { ver: 'v1.3.1',  mc: ['1.20.40', '1.20.41'] },
  { ver: 'v1.3.0',  mc: ['1.20.40', '1.20.41'] },
  { ver: 'v1.2.0',  mc: ['1.20.30', '1.20.31', '1.20.32'] },
  { ver: 'v1.1.2',  mc: ['1.20.10', '1.20.12', '1.20.15'] },
  { ver: 'v1.1.1',  mc: ['1.20.10', '1.20.12'] },
  { ver: 'v1.1.0',  mc: ['1.20.10', '1.20.12'] },
  { ver: 'v1.0.0',  mc: ['1.20.0', '1.20.1'] }
];


/**
 * Check whether the user came from linkvertise.
 * @param hash The hash.
 * @returns A Promise which resolves in a boolean.
 */
function checkValidity(hash) {
  return new Promise((res, rej) => {
    if (token.length != 64 || hash?.length != 64)
      return res(false);

    const xhr = new XMLHttpRequest();
    let url = 'https://publisher.linkvertise.com/api/v1/anti_bypassing';
    url += '?token=' + encodeURIComponent(token)
         + '&hash=' + encodeURIComponent(hash);
    xhr.open('POST', url, true);

    xhr.onload = () => {
      const text = xhr.responseText?.toLowerCase();
      res(xhr.status === 200 && text.includes('true'));
    };

    xhr.onerror = (err) => {
      rej(err);
    };

    xhr.send();
  });
}


/**
 * Creates the version table.
 * @param list The version list.
 * @returns An HTML table string.
 */
function createTable(list) {
  let contents = '';

  list.forEach(item => {
    const dlMcpack = 'https://github.com/vytdev/debug-stick/releases/download/' +
               item.ver + '/debug-stick.mcpack';
    const dlZip = 'https://github.com/vytdev/debug-stick/releases/download/' +
               item.ver + '/debug-stick.zip';

    contents += `<tr>
      <td style="text-align:center">${item.mc.join(', ')}</td>
      <td style="text-align:center">
        <a href="${dlMcpack}" target="_blank">${item.ver} mcpack</a></td>
      <td style="text-align:center">
        <a href="${dlZip}" target="_blank">${item.ver} zip</a></td>
    </tr>`;
  });

  return `<div class="table-container"><table>
      <thead><tr>
        <th style="text-align:center">Minecraft Version</th>
        <th style="text-align:center"><code>.mcpack</code> Download</th>
        <th style="text-align:center"><code>.zip</code> Download</th>
      </tr></thead>
      <tbody>
        ${contents}
      </tbody>
    </table></div>`;
}

/**
 * Do stuff on load.
 */
events.globalEvents.once('load', () => {
  if (pageInfo.relRoot != './' || pageInfo.path != 'download-debug-stick.html')
    return;
  const cont = document.getElementById('version-list');

  /* temp */
  cont.innerHTML = createTable(versions);

  /* Check whether the user came from Linkvertise. */
  checkValidity(util.query['hash'] ?? '')
    .then(isValid => {
      cont.innerHTML += '<p>Ignore this: ' + isValid + '</p>';
      /*
      if (isValid)
        cont.innerHTML = createTable(versions);*/
    })
    .catch(err => {
      cont.innerHTML += '<p>Error: could not access APIs</p>';
    });
});
