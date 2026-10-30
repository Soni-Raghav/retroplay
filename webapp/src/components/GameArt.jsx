import React, { useMemo } from 'react'

/* GameArt — deterministic, offline "cover art" for a ROM.
 * Every game gets its own colorful card artwork derived from its name hash:
 * system-styled silhouette + per-game hue gradient + initials + sparkles.
 * Same game -> same art, every load. No network, no stored images. */

const SYS = {
  nes:        { short: 'NES', base: 8,   shape: 'cart' },
  snes:       { short: 'SNES', base: 258, shape: 'cart' },
  gb:         { short: 'GB', base: 96,  shape: 'handheld' },
  gba:        { short: 'GBA', base: 210, shape: 'gba' },
  segaMD:     { short: 'MD', base: 340, shape: 'cart' },
  segaMS:     { short: 'SMS', base: 24,  shape: 'cart' },
  segaGG:     { short: 'GG', base: 190, shape: 'gg' },
  segaCD:     { short: 'CD', base: 186, shape: 'disc' },
  psx:        { short: 'PS1', base: 44,  shape: 'disc' },
  n64:        { short: 'N64', base: 148, shape: 'cart' },
  arcade:     { short: 'ARC', base: 52,  shape: 'cabinet' },
  atari2600:  { short: '2600', base: 30, shape: 'joystick' },
  atari7800:  { short: '7800', base: 16, shape: 'joystick' }
}

/* djb2 -> stable 32-bit */
function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name) {
  const words = String(name || '?').replace(/\[.*?\]|\(.*?\)/g, ' ').trim()
    .split(/[^A-Za-z0-9]+/).filter(Boolean)
  if (!words.length) return '??'
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  const w = words[0]
  return (w.length >= 2 ? w[0] + w[1] : w[0]).toUpperCase()
}

/* Console silhouettes drawn in a 96x96 box, centered, ~56px wide */
function Shape({ shape }) {
  switch (shape) {
    case 'cart': return (
      <g>
        <rect x="30" y="18" width="36" height="60" rx="4" />
        <rect x="36" y="30" width="24" height="26" rx="2" opacity=".35" />
        <rect x="33" y="66" width="30" height="8" rx="2" opacity=".35" />
      </g>)
    case 'handheld': return (
      <g>
        <rect x="33" y="14" width="30" height="68" rx="5" />
        <rect x="38" y="20" width="20" height="16" rx="2" opacity=".35" />
        <circle cx="43" cy="62" r="4" opacity=".5" />
        <circle cx="53" cy="58" r="4" opacity=".5" />
        <rect x="44" y="70" width="8" height="4" rx="1" opacity=".5" />
      </g>)
    case 'gba': return (
      <g>
        <rect x="14" y="32" width="68" height="32" rx="10" />
        <rect x="22" y="38" width="24" height="18" rx="3" opacity=".35" />
        <circle cx="62" cy="52" r="4" opacity=".5" />
        <circle cx="72" cy="46" r="4" opacity=".5" />
        <rect x="40" y="58" width="14" height="3" rx="1.5" opacity=".5" />
      </g>)
    case 'gg': return (
      <g>
        <rect x="30" y="20" width="36" height="56" rx="8" />
        <rect x="36" y="26" width="24" height="18" rx="2" opacity=".35" />
        <circle cx="42" cy="60" r="4" opacity=".5" />
        <circle cx="54" cy="60" r="4" opacity=".5" />
      </g>)
    case 'disc': return (
      <g>
        <circle cx="48" cy="48" r="30" />
        <circle cx="48" cy="48" r="9" opacity=".55" />
        <circle cx="48" cy="48" r="3" opacity=".9" />
        <path d="M48 18 a30 30 0 0 1 26 15 l-13 7 a15 15 0 0 0 -13 -8 z" opacity=".3" />
      </g>)
    case 'cabinet': return (
      <g>
        <path d="M30 14 h36 l6 66 a4 4 0 0 1 -4 4 H28 a4 4 0 0 1 -4 -4 z" />
        <rect x="34" y="24" width="28" height="20" rx="2" opacity=".35" />
        <circle cx="42" cy="56" r="3.4" opacity=".55" />
        <circle cx="52" cy="56" r="3.4" opacity=".55" />
        <rect x="36" y="66" width="24" height="5" rx="2" opacity=".5" />
      </g>)
    case 'joystick': return (
      <g>
        <rect x="24" y="52" width="48" height="26" rx="6" />
        <rect x="42" y="24" width="12" height="30" rx="4" />
        <circle cx="48" cy="24" r="10" />
        <circle cx="62" cy="62" r="4" opacity=".5" />
      </g>)
    default: return (
      <g>
        <rect x="30" y="18" width="36" height="60" rx="4" />
        <rect x="36" y="30" width="24" height="26" rx="2" opacity=".35" />
      </g>)
  }
}

export default function GameArt({ name, system, size = 60, className = '' }) {
  const art = useMemo(() => {
    const cfg = SYS[system] || { short: 'ROM', base: 260, shape: 'cart' }
    const h = hash(String(name || '') + '|' + system)
    const hue = (cfg.base + (h % 140)) % 360          // ±70° around the system base
    const hue2 = (hue + 38 + (h % 26)) % 360
    const c1 = `hsl(${hue} 78% 44%)`
    const c2 = `hsl(${hue2} 85% 58%)`
    const s1 = `hsl(${hue} 90% 72%)`
    const s2 = `hsl(${(hue + 180) % 360} 92% 66%)`
    const gid = 'g' + h.toString(36)
    const pat = 'p' + h.toString(36)
    const spark = [
      [10 + (h % 9), 12 + ((h >> 3) % 8)],
      [78 - ((h >> 5) % 10), 14 + ((h >> 7) % 7)],
      [12 + ((h >> 9) % 7), 76 - ((h >> 11) % 8)]
    ]
    return { cfg, c1, c2, s1, s2, gid, pat, spark }
  }, [name, system])

  const { cfg, c1, c2, s1, s2, gid, pat, spark } = art
  return (
    <svg className={'game-art ' + className} width={size} height={size}
         viewBox="0 0 96 96" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
        <pattern id={pat} width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="1.2" fill="#ffffff" opacity=".05" />
        </pattern>
      </defs>
      <rect width="96" height="96" rx="14" fill={`url(#${gid})`} />
      <rect width="96" height="96" rx="14" fill={`url(#${pat})`} />
      <path d="M0 34 L34 0 H96 V10 L10 96 H0 Z" fill="#ffffff" opacity=".10" />
      <g fill="#ffffff" opacity=".30">
        <Shape shape={cfg.shape} />
      </g>
      <text x="48" y="56" textAnchor="middle" fontSize="27" fontWeight="900"
            fontFamily="system-ui, sans-serif" fill="#ffffff"
            stroke="rgba(0,0,0,.28)" strokeWidth="1" paintOrder="stroke"
            style={{ letterSpacing: '1px' }}>
        {initials(name)}
      </text>
      <rect x="22" y="64" width="52" height="15" rx="7.5" fill="rgba(6,8,20,.55)" />
      <text x="48" y="75" textAnchor="middle" fontSize="9.5" fontWeight="800"
            fontFamily="system-ui, sans-serif" fill="#ffffff" opacity=".92"
            style={{ letterSpacing: '1.6px' }}>
        {cfg.short}
      </text>
      {spark.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="3.4" height="3.4"
              fill={i % 2 ? s1 : s2} opacity=".95" />
      ))}
      <rect x="1" y="1" width="94" height="94" rx="13" fill="none"
            stroke="#ffffff" strokeOpacity=".25" strokeWidth="2" />
    </svg>
  )
}
