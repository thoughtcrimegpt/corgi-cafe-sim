// THE WALL — dark-souls-style notes by the front door.
// Nobody types prose. A note = a curated phrase + your run's stats + a
// twitter handle that the DATABASE validates (^[A-Za-z0-9_]{1,15}$), so the
// content surface stays fully under the game's control.

// Same Supabase project as the rest of the thoughtcrimegpt games; the
// publishable key is public-safe by design.
const DB = {
  url: 'https://kqodzsghumdqgpovlosq.supabase.co',
  key: 'sb_publishable_TRsn9kUJMD0xJ_MrPKNh0w_9sr9raSw',
};

export const PHRASES = [
  'i was here. still am, probably.',
  'shipped before sunrise. barely.',
  'the sun came up. running it back.',
  'do we have a binder?',
  'the pentagon changed me.',
  'trudy sat with me. everyone saw.',
  'there are no corgis. i checked.',
  'still pre-revenue. spiritually rich.',
  'day 41 of saying day 41.',
  'the machine is always hot.',
  'gnosis acquired at table six.',
  'my loss ratio is my business.',
  'filed three claims. zero regrets.',
  'wired in. do not perceive me.',
  'the smoothie was dinner. worth it.',
  'took the meeting. took the check.',
  'the moat is vibes.',
  'heads down until further notice.',
  'the deadline was real. so was i.',
  'my premium went up and i understand why.',
  'commits: many. progress: unclear.',
  'the 5am crowd knows.',
  'ordered a hello world. no regrets.',
  'creatine in the latte. innovation.',
  'sat by the window. became data.',
  'left to touch grass. came back.',
  'nico remembered my order.',
  'squirtle told me something true.',
  'the window seat is undefeated.',
  'the gtm team found me anyway.',
  'adverse selection brought us together.',
  'paid $14 for a smoothie and peace.',
  'the frog watched me the whole time.',
  'paw prints lead nowhere. checked twice.',
  'renewal pricing is real. ask me.',
  'shipped it. it = unclear.',
  'here until the sun or the demo.',
  '9 claude ln is a state of mind.',
  'the receipt is my resume.',
  'zero deductible. full send.',
  'we are all substrate.',
  'the corgis in the paintings fly.',
  'closed my laptop. opened it again.',
  'one more espresso and i fix it.',
  'the barista is the ceo. the ceo is the barista.',
  'my cofounder thinks i am asleep.',
  'this counts as networking.',
  'the wifi is a covenant.',
  'long 2x monster at 3am. felt correct.',
  'volatility drag knows where i live.',
  'hit the buffer cap. two cents. framing it.',
  'the terminal remembers me now.',
  'reached takeoff on the corner machine. my latte did not.',
  'lost $4 to the claw. worth it.',
  'the bus is still out there. hazards on.',
];

export const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

const headers = {
  apikey: DB.key,
  Authorization: 'Bearer ' + DB.key,
  'Content-Type': 'application/json',
};

// newest-first, paged — the reading panel can walk the whole wall
export async function fetchNotes(offset = 0, limit = 100) {
  const r = await fetch(
    `${DB.url}/rest/v1/cafe_notes?select=id,handle,phrase,ship,tmin,shift,won,claims` +
    `&order=id.desc&offset=${offset}&limit=${limit}`,
    { headers: { ...headers, Prefer: 'count=exact' } }
  );
  if (!r.ok) throw new Error('wall unavailable (' + r.status + ')');
  const total = +((r.headers.get('content-range') || '').split('/')[1]) || 0;
  return { rows: await r.json(), total };
}

export async function pinNote(n) {
  const r = await fetch(`${DB.url}/rest/v1/cafe_notes`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      handle: n.handle,
      phrase: n.phrase,
      ship: Math.round(n.ship),
      tmin: Math.round(n.tmin),
      shift: n.shift,
      won: !!n.won,
      claims: n.claims | 0,
    }),
  });
  if (!r.ok) throw new Error('pin rejected (' + r.status + ')');
}
