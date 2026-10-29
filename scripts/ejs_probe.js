const fs = require('fs');
const src = fs.readFileSync('/home/z/my-project/public/data/emulator.min.js', 'utf8');
console.log('file length:', src.length);

function probe(reSource, before, after, max) {
  const re = new RegExp(reSource, 'g');
  let m, count = 0;
  const all = src.match(new RegExp(reSource, 'g')) || [];
  console.log(`\n########## /${reSource}/ — total ${all.length} match(es) ##########`);
  while ((m = re.exec(src)) && count < (max || 5)) {
    const s = Math.max(0, m.index - (before || 120));
    const e = Math.min(src.length, m.index + (after || 280));
    console.log(`\n--- match @${m.index} ---`);
    console.log(src.slice(s, e));
    count++;
  }
}

// 1) How EJS reads the default controls option
probe('EJS_defaultControls', 100, 400, 3);
// 2) keyboard event handling — which player index gets simulated
probe('keydown', 150, 350, 4);
// 3) where simulateInput is called from keyboard/gamepad paths
probe('simulateInput', 120, 200, 6);
// 4) localStorage persistence of controls
probe('localStorage', 80, 220, 8);
// 5) all EJS_ option names read from window (discover available options)
const opts = [...new Set(src.match(/EJS_[A-Za-z]+/g) || [])].sort();
console.log('\n########## all EJS_* option identifiers ##########');
console.log(opts.join('\n'));
