const fs = require('fs');
const src = fs.readFileSync('/home/z/my-project/public/data/emulator.min.js', 'utf8');

function probe(reSource, before, after, max) {
  const re = new RegExp(reSource, 'g');
  let m, count = 0;
  const all = src.match(new RegExp(reSource, 'g')) || [];
  console.log(`\n########## /${reSource}/ — total ${all.length} ##########`);
  while ((m = re.exec(src)) && count < (max || 3)) {
    const s = Math.max(0, m.index - (before || 120));
    const e = Math.min(src.length, m.index + (after || 300));
    console.log(`\n--- @${m.index} ---`);
    console.log(src.slice(s, e));
    count++;
  }
}

// setupKeys — find string->keyCode conversion
probe('setupKeys', 60, 500, 3);
// players 1-3 in the defaults literal (what follows player 0 block)
probe('14:\\{value:"",value2:"LEFT_STICK"\\}', 0, 900, 1);
// full keyChange head (what precedes the loop)
probe('keyChange\\(', 30, 700, 2);
