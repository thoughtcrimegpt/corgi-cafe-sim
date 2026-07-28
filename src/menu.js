// The real Corgi Cafe menu (corgicafe.com), with sim effects attached.
// caf = caffeine, foc = focus, ship = instant % of progress, prep = seconds at the bar.

const d = (name, price, hi, caf, foc, extra = {}) =>
  ({ name, price, hi, caf, foc, prep: 6, kind: 'drink', ...extra });
const s = (name, price, hi, foc, extra = {}) =>
  ({ name, price, hi, caf: 0, foc, prep: 3, kind: 'food', ...extra });

export const MENU = [
  {
    name: 'Coffees',
    items: [
      d('Mocha', 6.50, 7.30, 22, 10),
      d('Americano', 5.00, 5.80, 26, 2),
      d('Latte', 6.00, 6.80, 24, 6),
      d('Cappuccino', 5.50, null, 22, 6),
      d('Cortado', 5.00, null, 24, 4),
      d('Espresso', 3.25, null, 30, 2, { prep: 4, tag: 'wire in' }),
      d('Cold Brew', 5.50, 6.50, 34, 4, { tag: 'long taper' }),
    ],
  },
  {
    name: 'Drinks',
    items: [
      d('Tea', 5.00, 5.30, 10, 12),
      d('Thai Tea', 5.30, 6.00, 12, 14),
      d('Milk', 2.50, 3.50, 0, 8, { tag: 'at 3am? ok' }),
      d('Hot Chocolate', 5.00, 5.75, 4, 16),
      d('Chai Latte', 5.30, 6.00, 14, 12),
    ],
  },
  {
    name: 'Snacks',
    items: [
      s('Chocolate Croissant', 5.25, null, 18),
      s('Ham & Cheese Croissant', 7.50, null, 26),
      s('Cookie', 4.00, null, 14),
      s('Brownie', 4.00, null, 14),
      s('Uncrustables', 3.00, null, 12, { tag: 'engineer fuel' }),
      s('Bangers Chips', 3.49, null, 10),
      s('Morning Bun', 4.50, null, 16),
      s('Cinnamon Roll', 4.50, null, 18),
    ],
  },
  {
    name: 'Exclusive Drinks',
    items: [
      d('ElevenLatte', 5.80, null, 24, 8, { tag: 'it says your name back' }),
      d('Brexspresso', 7.50, null, 32, 4, { special: 'expense', tag: 'expensable' }),
      d('Qodo Code Brew', 6.50, null, 28, 4, { ship: 3, tag: '+3% shipped' }),
      d('Brew Daytona', 7.00, null, 36, 2),
      d('Hello World (Anything)', 14.00, null, 0, 0, { special: 'random', tag: 'the barista decides' }),
      d('The ZEROCLICK', 6.50, null, 26, 4, { prep: 0, tag: 'zero wait' }),
      d('MCP Matcha Berry', 7.50, null, 20, 18, { tag: 'Composio' }),
      d('The Pentagon', 14.00, null, 40, 20, { tag: 'classified' }),
      d('SECUR-I-TEA', 8.00, null, 8, 22, { special: 'shield', tag: 'VioletX — blocks one interrupt' }),
      d('Simple Reset', 8.00, null, 6, 25, { special: 'reset', tag: 'SimpleClosure — clears the jitters' }),
    ],
  },
  {
    name: 'Corgi Smoothies',
    items: [
      d('The FiDi — Choc PB', 14.00, null, 6, 30, { prep: 9, protein: 41, tag: '41g protein' }),
      d('The Ocean Beach — Blue Power', 14.00, null, 6, 30, { prep: 9, protein: 41, tag: '41g protein' }),
      d('The Sunset — Berry Glow', 14.00, null, 4, 26, { prep: 9, protein: 21, tag: '21g protein' }),
      d('The Hayes Valley — Green Glow', 14.00, null, 4, 26, { prep: 9, protein: 21, tag: '21g protein' }),
    ],
  },
];

export const ADDONS = [
  { id: 'boost', name: 'Boosters', price: 1.99, foc: 8, caf: 0 },
  { id: 'wire', name: 'Wire In (espresso shot)', price: 1.99, foc: 0, caf: 12 },
  { id: 'creatine', name: 'Creatine', price: 1.99, foc: 6, caf: 0, protein: 5 },
];

export function priceOf(item, large) {
  return large && item.hi ? item.hi : item.price;
}

export function allItems() {
  return MENU.flatMap(sec => sec.items.map(i => ({ ...i, section: sec.name })));
}

// "Hello World (Anything)" — the barista picks for you.
export function rollHelloWorld() {
  const pool = allItems().filter(i => !i.special && i.price < 14);
  return pool[(Math.random() * pool.length) | 0];
}
