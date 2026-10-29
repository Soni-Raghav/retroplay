const { chromium } = require('/home/z/my-project/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext()).newPage();
  p.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 250)));
  p.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)));
  p.on('requestfailed', (r) => console.log('[reqfail]', r.url().slice(-60), r.failure() && r.failure().errorText));
  const resp = await p.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('status:', resp.status());
  await p.waitForTimeout(3000);
  console.log('romInput present:', await p.evaluate(() => !!document.getElementById('romInput')));
  console.log('body:', await p.evaluate(() => document.body.innerHTML.slice(0, 200).replace(/\n/g, ' ')));
  await b.close();
})().catch((e) => { console.error('probe crashed:', String(e).split('\n')[0]); process.exit(1); });
