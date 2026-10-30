import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

/* --- PWA / favicon / manifest wiring (runtime, so it works on any origin:
 *     Vercel web root AND the Android WebView appassets origin) --- */
(function pwa() {
  const d = document
  const base = new URL('.', location.href).href
  const add = (tag, attrs) => {
    const el = d.createElement(tag)
    for (const k in attrs) el.setAttribute(k, attrs[k])
    d.head.appendChild(el)
    return el
  }
  add('link', { rel: 'icon', type: 'image/svg+xml', href: base + 'icons/favicon.svg' })
  add('link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: base + 'icons/icon-192.png' })
  add('link', { rel: 'shortcut icon', href: base + 'icons/favicon.ico' })
  add('link', { rel: 'apple-touch-icon', sizes: '180x180', href: base + 'icons/apple-touch-icon.png' })
  add('link', { rel: 'manifest', href: base + 'icons/manifest.webmanifest' })
  add('meta', { name: 'mobile-web-app-capable', content: 'yes' })
  add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
  add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' })
  add('meta', { name: 'apple-mobile-web-app-title', content: 'RetroPlay' })
  add('meta', { name: 'description', content: 'RetroPlay — play retro classics offline and co-op online with friends.' })
})()

createRoot(document.getElementById('root')).render(<App />)
