// THE TERMINAL — Corgi runs an ETF trust now. That part is real. The tickers,
// expense ratios, and buffer caps below are the published ones; the prices are
// whatever a closed market dreams at 3am. Play money only. Positions lock at
// purchase and settle at 6:00 — liquidity is a distraction.

// vol is per game-minute; er is the real annual expense ratio.
export const FUNDS = [
  // the 2x daily shelf. cheapest on the name, listed on anything.
  { id: 'nvda2', tk: '2x NVDA', name: 'NVIDIA 2x Daily', type: 'lev', er: 0.0020, vol: 0.0030 },
  { id: 'pltr2', tk: '2x PLTR', name: 'Palantir 2x Daily', type: 'lev', er: 0.0020, vol: 0.0035 },
  { id: 'mstr2', tk: '2x MSTR', name: 'Strategy 2x Daily', type: 'lev', er: 0.0020, vol: 0.0045 },
  { id: 'mnst2', tk: '2x MNST', name: 'Monster Beverage 2x Daily', type: 'lev', er: 0.0045, vol: 0.0022, caff: true },
  { id: 'cart2', tk: '2x CART', name: 'Instacart 2x Daily', type: 'lev', er: 0.0045, vol: 0.0028 },
  { id: 'tpl2', tk: '2x TPL', name: 'Texas Pacific Land 2x Daily', type: 'lev', er: 0.0045, vol: 0.0032 },
  // the buffer shelf, july series. caps are the real filed numbers,
  // pro-rated to one trading day because the shift is one trading day.
  { id: 'cjul', tk: 'CJUL', name: 'U.S. Equities 15% Buffer', type: 'buf', er: 0.0030, vol: 0.0010, cap: 0.14, buf: 0.15 },
  { id: 'julc', tk: 'JULC', name: 'U.S. Equities 10% Buffer', type: 'buf', er: 0.0030, vol: 0.0010, cap: 0.182, buf: 0.10 },
  { id: 'qqjl', tk: 'QQJL', name: 'Growth & Tech 15% Buffer', type: 'buf', er: 0.0030, vol: 0.0013, cap: 0.201, buf: 0.15 },
];

const MIN_PER_YEAR = 525960;     // for fee math that shows up in the fourth decimal
const TRADING_DAYS = 252;        // one shift = one day of a one-year outcome period

// u: cumulative underlying multiplier. nav: the fund, path-dependent for 2x
// (per-minute compounding is where the volatility drag lives).
const M = {};
for (const f of FUNDS) M[f.id] = { u: 1, nav: 1 };

export const positions = [];     // {fid, amt, navIn, uIn, minIn}

let carry = 0;
let g2 = null;
function gauss() {
  // box-muller, pairs cached
  if (g2 !== null) { const v = g2; g2 = null; return v; }
  const a = Math.random() || 1e-9, b = Math.random();
  const r = Math.sqrt(-2 * Math.log(a));
  g2 = r * Math.sin(2 * Math.PI * b);
  return r * Math.cos(2 * Math.PI * b);
}

export function capTonight(f) { return f.cap / TRADING_DAYS; }

// buffer payoff as a function of cumulative underlying return. over three
// hours the underlying will not find the buffer, which is the joke.
function bufNav(f, u) {
  const r = u - 1;
  const rf = r >= 0 ? Math.min(r, capTonight(f))
    : r >= -f.buf ? 0
    : r + f.buf;
  return 1 + rf;
}

export function navOf(f) {
  const m = M[f.id];
  return f.type === 'buf' ? bufNav(f, m.u) : m.nav;
}

// advance the market by dtMin game-minutes. caf: monster beverage tracks
// local demand. nobody can prove it doesn't.
export function tick(dtMin, caf) {
  carry += dtMin;
  while (carry >= 1) {
    carry -= 1;
    for (const f of FUNDS) {
      const m = M[f.id];
      let dr = gauss() * f.vol;
      if (f.caff) dr += ((caf - 50) / 50) * 0.0004;
      m.u *= 1 + dr;
      if (f.type === 'lev') m.nav *= 1 + 2 * dr - f.er / MIN_PER_YEAR;
    }
  }
}

export function buy(fid, amt, cash, nowMin) {
  if (amt > cash) return { ok: false, msg: 'declined. (the card, not the thesis.)' };
  const f = FUNDS.find(x => x.id === fid);
  const m = M[fid];
  positions.push({ fid, amt, navIn: navOf(f), uIn: m.u, minIn: nowMin });
  return { ok: true, f };
}

export function investedIn(fid) {
  return positions.filter(p => p.fid === fid).reduce((s, p) => s + p.amt, 0);
}

export function liveValue(p) {
  const f = FUNDS.find(x => x.id === p.fid);
  return p.amt * (navOf(f) / p.navIn);
}

export function pctChange(f) { return (navOf(f) - 1) * 100; }

// 6:00 AM. everything marks to a market that never opened.
export function settle(nowMin) {
  const rows = [];
  let fees = 0, net = 0, drag = false, capped = false;
  let allBuf = positions.length > 0, totalIn = 0;
  for (const p of positions) {
    const f = FUNDS.find(x => x.id === p.fid);
    const fee = p.amt * f.er * ((nowMin - p.minIn) / MIN_PER_YEAR);
    const val = liveValue(p) - fee;
    const pnl = val - p.amt;
    const rf = val / p.amt - 1, ru = M[p.fid].u / p.uIn - 1;
    if (f.type === 'lev') {
      allBuf = false;
      if (rf < -0.0002 && ru >= 0) drag = true;         // the underlying was fine. you weren't.
    } else if (ru > capTonight(f) && rf > 0) capped = true;
    fees += fee; net += pnl; totalIn += p.amt;
    rows.push({ tk: f.tk, amt: p.amt, val, pnl });
  }
  return { rows, fees, net, flags: { drag, capped, buffered: allBuf && totalIn >= 20 } };
}

// the little screen on the wall
export function drawTicker(cv) {
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.fillStyle = '#07100a'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#e8552f';
  g.fillRect(0, 0, W, 22);
  g.fillStyle = '#ffe9dc';
  g.font = '700 13px ui-monospace, monospace';
  g.textAlign = 'left';
  g.fillText('CORGI MKTS', 8, 16);
  g.textAlign = 'right';
  g.font = '600 10px ui-monospace, monospace';
  g.fillText('MARKET: CLOSED', W - 8, 15);
  let y = 36;
  for (const f of FUNDS) {
    const c = pctChange(f);
    g.textAlign = 'left';
    g.fillStyle = '#9fb8a4';
    g.font = '700 11px ui-monospace, monospace';
    g.fillText(f.tk, 8, y);
    g.textAlign = 'right';
    g.fillStyle = c >= 0 ? '#6fe08a' : '#ff6f61';
    g.fillText((c >= 0 ? '+' : '') + c.toFixed(2) + '%', W - 8, y);
    y += 13;
  }
}
