# PATCH NOTES

## V1.0.1 (2026-07-28)

- `image-rendering: pixelated` now wins the cascade in Chrome, so the upscale is
  properly nearest-neighbour instead of falling back to smoothing.
- The low-res buffer is clamped, so a zero-width viewport can't collapse the
  canvas to 0px.
- Split the animation-frame callback from the simulation step so a frame can be
  driven directly — that's how the full shift was verified end to end.

## V1.0 — "THE MACHINE IS ALWAYS HOT" (2026-07-28)

First build. A walkable 3D Corgi Cafe at 2:47 AM.

**The room**
- 25×10m interior modelled on the real place: orange chairs, white tables, the
  banquette and picture rail, structural piers between the window bays, the warm
  orange ceiling cove, track lights, hanging pothos, a stack of CLEAR PET COLD
  DRINK CUPS in the corner, and the Trudy poster.
- A wall clock that shows the actual in-game time.
- Windows onto the alley with the blue-and-red mural. Through the front door:
  Claude Lane — asphalt, the painted orange street graphic, string lights, lit
  shopfronts and fire escapes opposite, a neon sign, low fog.
- Sunrise ramps in over the last 55 minutes of the shift.

**Look**
- Renders at 328p and upscales with nearest-neighbour — chunky pixels by design.
  All textures are drawn procedurally on canvas; the repo contains no image files.
- Dust motes in the light, steam curling off the cups, blinking NPCs with faces.

**The shift**
- Clock runs 2:47 AM → 6:00 AM. Ship 100% or don't.
- SHIPPED / FOCUS / CAFFEINE / CASH. Jitters above 86 caffeine.
- Sit at any free table to work. Get up to recover focus.
- Random interruptions while you're heads-down: cofounder calls, speaker phones,
  the grinder, the timeline. Occasionally a genuinely good idea.

**The menu**
- The real menu, real prices — coffees, drinks, snacks, the exclusive drinks,
  the $14 smoothies, and the add-ons.
- Multi-item cart: stack a whole order, pick regular or large, add Boosters,
  Wire In, or Creatine. One barista, so bigger orders take longer.
- Special behaviour: Hello World (Anything) rolls a random drink, ZEROCLICK has
  no wait, SECUR-I-TEA blocks one interruption, Simple Reset clears the jitters,
  Brexspresso refunds half, Qodo Code Brew ships 3% on the spot.

**The regulars**
- NICO behind the counter. First espresso is on the house.
- ATLAS, who will make you do twenty reps and cost you twelve minutes.
- SQUIRTLE in the corner. Going deeper is a coin flip between gnosis and losing
  sixteen minutes.
- The GTM pod, working the room at 3 AM.
- A VC in the aisle, not investing tonight, just in the watering hole.
- TRUDY comes downstairs partway through the night. Pet the dog.
- Something small and green is watching from the top of the cup boxes.

**Ship it**
- Win/lose screens with a full stat card, achievements, and a post-to-X button.
- Touch controls, arrow-key turning, and click-drag look for when pointer lock
  is unavailable.
