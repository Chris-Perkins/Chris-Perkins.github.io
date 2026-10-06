# Frying Panguin

A small, silly, fully overhead Arctic PvE game. The pan swings itself. You supply the questionable penguin decisions.

## Play

Open `index.html` in a modern browser, or serve this directory:

```sh
cd fryingpanguin
npm start
```

Open `http://127.0.0.1:8765/`. When serving the parent website, use `/fryingpanguin/`. Playing needs no installation, build step or external assets.

- Move with WASD, arrow keys or the right-hand mobile analog joystick. Hold and drag its thumb to steer; release to stop. The frying pan attacks automatically.
- Walk toward one of the three safe-shop displays. Press Space or tap its label above the display to purchase the next permanent tier. The in-range label shows the actual offer, benefit, price and state. A second finger can tap it while the joystick stays held. Release before buying again.
- Lives adds one, two and three maximum hearts over the starting three, giving four, five and six. Walk adds 33%, 66% and 100% of base movement speed. Swing gives +50%, +100% and +150% attack rate over its base by shortening both pan motion and recovery, without adding damage. Each upgrade has three tiers; each display shows one advertised benefit and its actual gold price, or just a light-red price when unaffordable. Complete upgrades show their actual current benefit and MAX. The final Swing upgrade gives the pan a gold finish.
- Leave through the shop door to begin an outing. The shop is closed until you return.
- For an older save, the last valid saved gadget effect stays active automatically. G selection and its equipment badge are removed. Other owned choices remain archived and cannot be selected; an active drawback cannot be switched off. A save with no selection stays neutral.
- If an older save holds a packed powerup, press Q or tap its icon during an outing. Timed socks, pancake frenzy and jelly refresh their timer to eight seconds, including when already active. Old saved cocoa stock is retired without spending gold; the remaining unused stock survives reloads. The new shop sells only the three permanent upgrades.
- The game fills the viewport immediately. Sound starts when browser playback is available, using an ordinary key or tap if activation is required.

Lives costs 250, 500 and 1000 gold; every tier can be bought as soon as you can afford it, with no completed-outing requirement. Walk costs 150, 400 and 1250 gold. Swing costs 100, 500 and 1500 gold. Collecting gold and surviving are separate; completed-outing progress remains saved.

## Outings

After defeat, a brief frozen beat leads to the Summary while surviving enemies continue harmless silly movement and abilities. Result icons bounce in sequence, then keep stretching and squeezing while you wait; the penguin makes a brief hop; the loss-screen hero lies on its side with its pan beside it, while the surviving hero stays upright. The totals and Continue control stay fixed. Reduced motion keeps this presentation still. Wait for the readiness cue, then use a fresh key or tap to return to the healed shop.

Outings last up to three minutes. The original difficulty ramp reaches its previous peak at90seconds and continues scaling through the second half. Smash cute wooden boxes and gold-veined rocks, lure physical coins into a waddling magnetic parade, and bonk nippy chicks, sliding penguins and pajama bears. Coins accelerate toward you and deposit on arrival; attracted coins keep following while you run.

The pan has a slightly larger reach and can bonk enemies touching or overlapping the penguin from any direction. Outside close contact, strikes still face forward. The moving pan shows the direction of its admitted swing while you turn.

Pan-bonked enemies become friendly bowling balls, including after a knockout. Aim them through enemies, chests and rocks for breakfast chain reactions. Snowbirds arrive in complete flocks, circle and take turns swooping. Their flight, swoops and orbit rotation are now50% faster. Frequent snowmen stay visible at fixed anchors and throw fast, committed snowballs. One damaging hit defeats a snowman; three join each opening group of nine. Snowballs fly across the pond while genuine solid cover still stops them. Change direction during warnings, interrupt attackers with the pan or use solid cover. Crashing charges leave a dazed counterattack opening.

Blocked enemies keep a stable direction rather than flickering between poses. Their bodies follow coherent movement, while committed attacks and their recovery face the actual attack direction.

The opening has nine enemies, about30% fewer than the previous thirteen. Mixed reinforcements begin at70% of the previous early rate and reach the accepted nine actors per3.2seconds at90seconds. Requested arrivals ramp to150% of that90-second rate by150seconds, then hold until the three-minute endpoint; legal placement and the26-living-enemy cap bound actual arrivals. Each return changes the island, shoreline, pond and scenery across three seeded layouts. Substantial snowbanks break apart; tiny snow bumps are decoration.

An accepted hit gives the penguin a solid red flash for0.22seconds and a distinct short hurt cue when sound is enabled. Blocked hits and the0.85-second damage grace do not repeat it. Lethal damage uses the same red cue on the fallen pose; reduced motion keeps the cue stationary.

Ocean waves follow the changing shoreline. The pond stays still, and reduced motion keeps the ocean waves still too.

The penguin uses a basic waddle with small flat feet tucked under its belly, tiny alternating shuffles and a slight side-to-side shift. There are no visible legs or hopping. Walking responds to actual travel, settles when blocked or stopped, and stays readable with reduced motion. Walking across snow leaves alternating footprints that gradually fade.

Sparse retro snow drifts quietly behind the actors and attack warnings. Density follows the visible viewport, with at most32flakes; reduced motion keeps a smaller3–8flake field still. Snow is cosmetic and continues through the shop, outing and Summary.

Socks give eight seconds of controllable 1.75× movement. Pancake frenzy gives eight seconds of stronger, faster bonks, with five times the nominal damage per recovery interval. Rubber Lunch jelly gives newly bowled enemies four times the bounded flight and one scenery rebound. Each has distinct activation feedback. Active effects show only small icons above the penguin, each surrounded by a circular duration ring. Rings start full and drain as their actual timers run; there are no backing plates or visible countdown numbers. The row stays centered at a fixed offset above the penguin and follows its rendered position, including camera movement and resizing. Expired effects disappear immediately; equipment and packed stock remain separate. Additional timed pickups reset the timer to eight seconds without increasing strength; ongoing buffs clear between outings. These role-specific advantages do not guarantee five times the gold or knockouts.

Use SHARE in the Summary to share its result URL through your device or copy it. If sharing or clipboard access is unavailable, use COPY LINK or select the visible Result URL manually. Sharing keeps the Summary open; use a fresh key or tap outside its sharing controls to continue. The public preview contains survival time and outcome only, showing the fallen penguin and pan for defeat and the original upright penguin for full survival, and works independently of this browser’s save. It does not verify scores.

An ended outing shows conquered enemies, arrived gold and time survived. Death fixes those totals immediately and puts the penguin in a still fallen pose, with its pan beside it. One cream flash and crisp outward waves of red play over1.05seconds before Summary. Reduced motion keeps the red bands still. The penguin stays fallen behind a death Summary until return; surviving the timeout freezes the last game frame while gold beams burst outward from the penguin and circle the screen for1.5seconds, then reveals victory results. Reduced motion holds a still gold composition for the same interval. The Summary stays locked for its first visible half-second; its hourglass changes to an arrow when ready. Release a held key or touch, then use a fresh press or tap to return to the healed shop. The continuing action cannot move or purchase.

Older saves retain purchased pan damage, archived gadget ownership and the last valid selected effect, golden-pan benefits, unused stock and tickets. Banana Republic lays peels while socks are active but slows pan recovery; Rocky Road Sundae fires friendly snowballs when rocks break; Honk If Greedy draws coins and curious enemies from farther away. An unused Bear Market Bonds ticket starts its marked-chest challenge on departure. These retained purchases are separate from the three new offers.

Gold, permanent tiers and retained market progress persist locally in this browser and origin. The versioned save migrates older progress once. The browser stores the canonical record in IndexedDB. Purchases use a transaction and shared lock, reject a stale price or tier, and apply benefits after commit. Older local records migrate once; localStorage becomes a compatibility mirror. An unavailable persistent purchase is visibly disabled; an unavailable local store is reported explicitly. Session-only progress does not survive closing or reloading the page.

Sound uses synthesized toy instruments, footsteps, pan swishes, species voices and coin chimes. Defeat adds a short pan clink, snow thud and descending retro cue before Summary. When enabled, shop music begins while you stand still. If the browser requires an interaction first, an ordinary key press or tap starts it. Sound stops when the page loses focus or becomes hidden and settles into silence in the Summary.

An outing pauses while its document is hidden. Returning resumes the same gameplay clocks without counting hidden time and clears held movement. A visible window that loses focus keeps running. Saving and legitimate account reconciliation continue; already committed packed-powerup and ticket effects wait until the game is visible.

## Development

The game has zero npm dependencies. `engine.js` contains the DOM-free simulation, `art.js` draws cached artwork using shared geometry, `audio.js` synthesizes the soundtrack, and `game.js` connects rendering, input, audio and the HUD. Run `npm start` for a local preview.

Test suites, browser harnesses, comparison tools and fixtures have been removed from the project at the user's request. Historical validation evidence remains described in `VALIDATION.md`.

Bear stomp warnings retain their fixed danger boundary while a thin inner circle sweeps inward once across the full windup before release. Reduced motion shows stationary inward chevrons; the delayed damaging ring still expands from the actual attack geometry.

Enemy preparation rings fill from empty to full as attacks approach release. A full coral ring means the attack is imminent; reduced motion shows fixed quarter marks instead of a growing arc. The locked attack lanes and footprints still show where to dodge or seek solid cover.

Polar bears are larger, slower heavy threats, with a brief shake at the outgoing ring’s first expansion. Their physical radius is13 and base pace62; attack damage, timing and fixed shockwave geometry stay the same. Reduced motion uses a quiet ring-rim cue. PBM-01 closed with5/5 independent acceptance on its historical frozen candidate.

The game is also hosted at https://frying-panguin-results.chrisfromtemporary50.chatgpt.site; opening a shared link starts your own game beside a labelled external-result preview, while Discord can read the same server-rendered embed metadata. Original v1 assets, fallen-loss images and build instructions are in `share-preview-site/PACKAGING.md`.

The shop doorway has no decorative outward V; walking through it starts the outing as before.

Powerup pickups and arriving enemy waves do not show toast notifications. Active buff icons, duration rings and accessible announcements remain, along with unrelated purchase, contract, expiry and return messages.

Decorative Summary cycles pause when the document is hidden and clear when the Summary closes; they never delay a fresh Continue action. Reduced motion stays still.

Wood boxes come in honey brace-planks, blush corner-planks and sage party-ribbon variants. Opened boxes leave flat matching planks; the party ribbon/pancake and marked-box contract stamp retain their existing meaning.

Healing cocoa has been removed. Existing saved cocoa stock clears without refunds or changes to other progress. Non-jelly random powerups now split evenly between socks and frenzy; jelly eligibility, source drop chances and the first-chest socks guarantee are unchanged. Removing the cocoa selector draw changes later seeded reward sequences. Lives receipts and healed-return feedback reuse the existing heart artwork.
