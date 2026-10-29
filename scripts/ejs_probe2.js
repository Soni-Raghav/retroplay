const fs = require('fs');
const src = fs.readFileSync('/home/z/my-project/public/data/emulator.min.js', 'utf8');

function probe(reSource, before, after, max) {
  const re = new RegExp(reSource, 'g');
  let m, count = 0;
  const all = src.match(new RegExp(reSource, 'g')) || [];
  console.log(`\n########## /${reSource}/ — total ${all.length} ##########`);
  while ((m = re.exec(src)) && count < (max || 4)) {
    const s = Math.max(0, m.index - (before || 120));
    const e = Math.min(src.length, m.index + (after || 300));
    console.log(`\n--- @${m.index} ---`);
    console.log(src.slice(s, e));
    count++;
  }
}

// 1) What is EJS_KEYS?
probe('EJS_KEYS', 200, 300, 3);
// 2) The default controls literal (arrow keys as strings or keyCodes?)
probe('up arrow', 60, 450, 2);
// 3) how this.controls is initialized / getDefaultController
probe('controls=', 100, 300, 4);
// 4) control settings menu player selector
probe('Player ":', 150, 300, 2);
probe('controlPlayer|playerSelector|Player [0-9]', 100, 250, 4);
