/* ROM system detection: zip inner-name scan + binary header sniffing.
 * Returns EJS core keys: nes, snes, gb, gba, segaMD, segaMS, segaGG,
 * segaCD, psx, n64, arcade, atari7800, atari2600.
 */

const EXT_MAP = {
  nes: 'nes', fds: 'nes',
  smc: 'snes', sfc: 'snes', swc: 'snes',
  gb: 'gb', gbc: 'gb', sgb: 'gb',
  gba: 'gba',
  md: 'segaMD', gen: 'segaMD', smd: 'segaMD',
  sms: 'segaMS',
  gg: 'segaGG',
  cue: 'psx', pbp: 'psx', chd: 'psx', ecm: 'psx', iso: 'psx',
  z64: 'n64', n64: 'n64', v64: 'n64',
  a78: 'atari7800', a26: 'atari2600'
};

function extOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

function mapExt(e) {
  if (e === 'bin') return null; // ambiguous — needs header sniff
  return EXT_MAP[e] || null;
}

/* Scan a zip for the first entry whose extension maps to a system. */
function detectZip(buf) {
  const dv = new DataView(buf);
  if (dv.byteLength < 4 || dv.getUint32(0, true) !== 0x04034b50) return null;
  let p = 0;
  for (let guard = 0; guard < 512 && p + 30 <= dv.byteLength; guard++) {
    if (dv.getUint32(p, true) !== 0x04034b50) break;
    const nameLen = dv.getUint16(p + 26, true);
    const extraLen = dv.getUint16(p + 28, true);
    const compSize = dv.getUint32(p + 18, true);
    if (p + 30 + nameLen > dv.byteLength) break;
    let name = '';
    for (let i = 0; i < nameLen; i++) name += String.fromCharCode(dv.getUint8(p + 30 + i));
    const sys = mapExt(extOf(name));
    if (sys) return sys;
    p += 30 + nameLen + extraLen + compSize;
  }
  return null;
}

/* Binary header sniffing for extension-less / .bin files. */
function detectHeader(buf) {
  const dv = new DataView(buf);
  const ascii = (off, n) => {
    if (off + n > dv.byteLength) return '';
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(dv.getUint8(off + i));
    return s;
  };
  if (ascii(0, 4) === 'NES\x1a') return 'nes';
  if (ascii(0, 7) === 'PS-X EXE') return 'psx';
  if (dv.byteLength > 0x104 && ascii(0x100, 4) === 'SEGA') return 'segaMD';
  if (dv.byteLength > 0x7ff5 && ascii(0x7ff0, 8).indexOf('TMR SEGA') === 0) {
    const c = dv.getUint8(0x7ffd);
    if (c === 0x4c || c === 0x48 || c === 0x58 || c === 0x50 || c === 0x44) return 'segaGG';
    return 'segaMS';
  }
  if (dv.byteLength > 4) {
    const w = dv.getUint32(0);
    // N64 zaps: z64(be), v64(le), n64(byte-swapped)
    if (w === 0x80371240 || w === 0x37804012 || w === 0x40123780) return 'n64';
  }
  if (ascii(1, 9) === 'ATARI7800') return 'atari7800';
  // GameBoy: Nintendo logo at 0x104
  const nlogo = [0xce, 0xed, 0x66, 0x66, 0xcc, 0x0d, 0x00, 0x0b];
  if (dv.byteLength > 0x110) {
    let ok = true;
    for (let i = 0; i < 8; i++) if (dv.getUint8(0x104 + i) !== nlogo[i]) { ok = false; break; }
    if (ok) return 'gb';
  }
  if (dv.byteLength > 4 && dv.getUint32(0) === 0xceed6666) return 'gb';
  // GBA: ARM branch Vector + complementary byte 0x96 at 0xb2
  if (dv.byteLength > 0xb2) {
    const w = dv.getUint32(0);
    if ((w & 0xff000000) === 0xea000000 && dv.getUint8(0xb2) === 0x96) return 'gba';
  }
  return null;
}

export function detectSystem(buf, name) {
  const e = extOf(name);
  if (e === 'zip') { const z = detectZip(buf); if (z) return z; }
  if (e === 'nes') return 'nes';
  const mapped = mapExt(e);
  if (mapped) return mapped;
  const h = detectHeader(buf);
  if (h) return h;
  if (e === 'bin' || e === 'zip' || e === '') return 'nes'; // safe fallback
  return null;
}

export const CORE_LABEL = {
  nes: 'NES / Famicom', snes: 'Super Nintendo', gb: 'Game Boy / Color',
  gba: 'Game Boy Advance', segaMD: 'Mega Drive / Genesis', segaMS: 'Master System',
  segaGG: 'Game Gear', segaCD: 'Sega CD', psx: 'PlayStation 1',
  n64: 'Nintendo 64', arcade: 'Arcade (FBNeo)', atari7800: 'Atari 7800',
  atari2600: 'Atari 2600'
};
