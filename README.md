# CORGI CAFE SIMULATOR

A first-person pixel sim of San Francisco's only 24/7 cafe, at 9 Claude Ln.

It's **2:47 AM**. You have until **6:00 AM** to ship. Order off the real menu, manage
your caffeine, dodge the GTM pod, and try not to lose sixteen minutes to a thread
about whether agency is downstream of vibes.

**Play:** https://thoughtcrimegpt.github.io/corgi-cafe-sim/

There are no corgis. Please stop asking.

---

## Controls

| | |
|---|---|
| `WASD` | move |
| mouse / click-drag | look |
| `← →` | turn (no mouse needed) |
| `E` / `space` | interact |
| `shift` | sprint |
| `M` | sound on/off |

On phones: left stick to walk, drag the right side to look, `E` button to interact.

## How it works

- **SHIPPED** fills only while you're sitting at a table. It fills faster with caffeine
  and focus, slower with the jitters.
- **FOCUS** drains while you work and regenerates while you're up. At zero you stall.
- **CAFFEINE** decays constantly. Above 86 you get the jitters and lose throughput.
- **CASH** starts at $40. Menu prices are the real ones.
- Ship 100% before 6:00 AM or watch the sun come up through the windows.
- The regulars can help: one does pushups, one dispenses gnosis, one is a dog.
- Music and sound are procedural — no audio files, all synthesized live. `M` toggles.

## Running it locally

```bash
node tools/serve.mjs 8712
```

Then open `http://localhost:8712`. No build step, no dependencies, no bundler —
`three.js` is vendored in `vendor/` and everything else is hand-written ES modules.

## Layout

```
index.html        shell, HUD, all UI
src/main.js       game loop, player, interaction, ordering, scoring
src/world.js      the cafe: geometry, colliders, lighting, the alley outside
src/people.js     NPCs, animation, and everything they say
src/menu.js       the menu, with sim effects attached
src/textures.js   every texture, drawn procedurally on canvas at load
vendor/           three.js (MIT)
```

Everything is generated at runtime — there is not a single image file in this repo.

## Notes

Unofficial fan parody. Not affiliated with the cafe, the company, or any of the
people it gently ribs. Menu items and prices are taken from the public menu;
everything else is a joke.

three.js is MIT licensed, © three.js authors.
