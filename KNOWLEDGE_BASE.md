# Game Productivity App — Knowledge Base

> **Purpose**: Complete project context for LLM handoff. Covers architecture, Gen III save format, active bugs, and session history.

---

## 1. Project Overview

A **Vite + React + TypeScript** progressive web app (PWA) that embeds the mGBA Game Boy Advance emulator (via WASM) and grants real in-game rewards when the user completes productivity tasks. Installable on iOS via Safari "Add to Home Screen" and on Android/desktop via browser install prompt.

- **Stack**: Vite 5, React 18, TypeScript 5.9, Zustand 4, vitest 2
- **Emulator**: `@thenick775/mgba-wasm` ^2.4.1 — Emscripten-compiled mGBA with an IndexedDB-backed virtual filesystem (VFS)
- **PWA**: Service worker (`public/sw.js`) + web app manifest (`public/manifest.webmanifest`) for offline caching and installability
- **Run dev**: `npm run dev` (from `/Users/cbpas/Projects/gba_productivity_app`)
- **Tests**: `npx vitest run` — 7 test files, 121 tests, all passing as of session 6
- **Fonts**: Self-hosted (Press Start 2P + VT323 woff2 in `src/styles/fonts/`) — works fully offline

---

## 2. Directory Structure

```
src/
  App.tsx                      # Root component, bootstraps services, wraps in ErrorBoundary
  main.tsx
  components/
    ErrorBoundary.tsx           # React error boundary — catches render errors, shows recovery UI
    EmulatorView/              # GBA canvas + ROM/save loader UI (with file size validation)
    Layout/                    # AppLayout shell (with emulator init retry)
    RewardPanel/               # Displays pending rewards + "CLAIM REWARDS" button
    TaskManager/               # TaskList.tsx + TaskItem.tsx
  hooks/
    useKeyboardInput.ts        # Global GBA keyboard passthrough
    useRewards.ts              # Subscribes to rewards:claimed events
  lib/
    gen3/                      # ALL Gen III save-file crypto lives here
      saveFileParser.ts        # Parse/write 128KB save, detect game variant
      pokemonParser.ts         # Read/write 100-byte Pokemon structs
      crypto.ts                # XOR encrypt/decrypt (PV ^ OTID key)
      checksum.ts              # Section & Pokemon checksum algos
      substructures.ts         # Unshuffle/reshuffle 4 substructures by PV
      ivUtils.ts               # Pack/unpack 30-bit IV field
      rewards.ts               # Pure functions: addExperience, setIVs, etc.
      types.ts                 # (minor internal types)
      __tests__/               # Full unit test suite
  services/
    bootstrap.ts               # Wires crypto → saveFile → rewardBridge at startup
    emulatorService.ts         # mGBA singleton: initialize, loadRom, getCurrentSave, writeSaveAndReload
    mgbaAdapter.ts             # MgbaModule type defs + VFS helpers + deriveFileNames
    pokemonCrypto.ts           # PokemonCryptoService class (delegates to lib/gen3)
    rewardBridge.ts            # eventBus listener: rewards:claim → SaveFileService.applyBatchRewards → rewards:claimed
    saveFileService.ts         # Orchestrates read→parse→modify→write→reload pipeline (batch + single)
  store/
    eventBus.ts                # Typed event bus (EventMap)
    taskStore.ts               # Zustand tasks store (persisted as 'gba-tasks'), pools rewards on completion
    rewardStore.ts             # Zustand reward queue/history (persisted as 'gba-rewards'), claimAll(), isClaiming
    emulatorStore.ts           # Zustand emulator status
  types/
    emulator.ts                # IEmulatorService interface, GbaButton, EmulatorStatus
    events.ts                  # EventMap interface
    pokemon.ts                 # Pokemon, GrowthSubstructure, AttacksSubstructure, etc.
    reward.ts                  # Reward, RewardType, RewardPayload, EvStat, IVSet
    savefile.ts                # SaveFile, SaveSection, GameVariant, PartyLocation
    task.ts                    # Task, TaskPriority, TaskStatus
  utils/
    crossOriginCheck.ts        # assertCrossOriginIsolated (needed for SharedArrayBuffer/WASM)
public/
  manifest.webmanifest         # PWA manifest (name: "Game Productivity App", icons, display: standalone)
  sw.js                        # Service worker: precache app shell, cache-first assets, network-first navigation
  icon.svg                     # GBA-themed SVG icon (pixel checkmark, D-pad, A/B, "EXP+")
  icon-192.png                 # 192×192 PNG icon for Android/manifest
  icon-512.png                 # 512×512 PNG icon for Android splash
  apple-touch-icon.png         # 180×180 PNG icon for iOS home screen
  styles/
    fonts/
      PressStart2P.woff2       # Self-hosted pixel font (offline PWA)
      VT323.woff2              # Self-hosted retro font (offline PWA)
```

---

## 3. Reward Pipeline (End-to-End)

Rewards are **pooled** — completing tasks queues rewards without restarting the game. The user clicks "CLAIM REWARDS" to apply all pending rewards in a single game reload.

### Step 1: Task completion pools a reward (no game reset)
```
User clicks "DONE" on a task
  → TaskItem.tsx: completeTask(task.id)
  → taskStore.completeTask(id)
      Builds Reward via buildReward(priority) → add_experience_percent with EXP_PERCENT[priority]
      Marks task.status = 'completed', rewardClaimed = true
      eventBus.emit('task:completed', ...)
      useRewardStore.getState().addPending(reward)   ← reward sits in pool, NO game reset
```

### Step 2: User claims all pooled rewards (single game reload)
```
User clicks "CLAIM REWARDS" button (in RewardDisplay)
  → rewardStore.claimAll()
      Sets isClaiming = true, emits 'rewards:claim' event with all pending rewards

  → rewardBridge.ts listener: saveFileService.applyBatchRewards(rewards)
      1. emulatorService.getCurrentSave()           → Uint8Array (131 072 bytes)
      2. cryptoService.parseSaveFile(data)           → SaveFile (detects game variant)
      3. Group rewards by targetSlot
      4. For each slot:
         a. cryptoService.readPartyPokemon(save, slot) → Pokemon | null
         b. For each reward in group: cryptoService.applyReward(pokemon, reward)
         c. cryptoService.writePartyPokemon(save, slot, pokemon)
      5. cryptoService.recalculateSectionChecksum(data)
      6. emulatorService.writeSaveAndReload(finalSave)  ← SINGLE game reload
  → rewardStore.markBatchApplied(rewards, success)      ← pending → history
  → eventBus.emit('rewards:claimed', { rewards, success, error })
```

**Key design benefit**: Eliminates the race condition where two rapid task completions could overwrite each other's save modifications. All rewards are applied atomically in one read→modify→write cycle.

---

## 4. Task Priority → Reward Mapping

Defined in `src/store/taskStore.ts → buildReward()`. All rewards target **party slot 0** (lead party member). All priorities grant EXP as a **percentage of the gap to the next level**.

| Priority | Reward Type | Effect |
|---|---|---|
| `low` | `add_experience_percent` | 10% of EXP needed for next level |
| `medium` | `add_experience_percent` | 20% of EXP needed for next level |
| `high` | `add_experience_percent` | 50% of EXP needed for next level |
| `critical` | `add_experience_percent` | 100% of EXP needed (guaranteed level-up) |

The `EXP_PERCENT` lookup in `taskStore.ts` maps `TaskPriority → number`. The `buildReward` function emits a single reward type (`add_experience_percent`) with the percentage in the payload.

**How percentage EXP works** (`src/lib/gen3/rewards.ts → addExperiencePercent`):
1. Looks up the species' growth rate from `BASE_STATS[species]`
2. Calculates `gap = expForLevel(growthRate, level + 1) - expForLevel(growthRate, level)`
3. Grants `floor(gap * percent / 100)` EXP (minimum 1)
4. No-op at level 100

> **Note**: After `add_experience`, `add_experience_percent`, `set_ivs`, or `boost_evs` rewards, `PokemonCryptoService.applyReward` calls `recalculatePartyStats()` to update the party-cached stat block (level, maxHp, attack, defense, speed, spAttack, spDefense) using the Gen III stat formula. This is required because the game reads stats from the cached block, not from the encrypted substructure.

### Legacy reward types (still supported in code, not currently used by task system)
| Type | Effect |
|---|---|
| `heal_pokemon` | statusCondition = 0, currentHp = maxHp |
| `add_experience` | Flat +N EXP (capped at 0x00FFFFFF) |
| `give_item` | Sets held item to itemId |
| `set_ivs` | Sets IVs (partial or full) |
| `boost_evs` | Adds EVs to a stat (respects 255/510 caps) |
| `teach_move` | Sets move + 15 PP in slot 0–3 |

---

## 5. Gen III Save File Format

### Layout (131 072 bytes = 128 KB)

```
0x00000 – 0x0DFFF  Block A (14 sections × 4096 bytes = 57 344 bytes)
0x0E000 – 0x1BFFF  Block B (same layout)
0x1C000 – 0x1FFFF  Hall of Fame + misc (16 384 bytes, preserved but not parsed)
```

The **active block** is whichever of A or B has the higher `saveIndex` in its physical section 0.

### Section Layout (4096 bytes each)

```
bytes    0–3967  section data    (3968 bytes, used)
bytes 3968–4083  padding         (116 bytes, ignored)
bytes 4084–4085  section ID      u16 LE  (0–13, shuffled physical position)
bytes 4086–4087  checksum        u16 LE
bytes 4088–4091  signature       u32 LE  (must be 0x08012025)
bytes 4092–4095  save index      u32 LE
```

### Game Variant Detection

Section 0 at offset `0xAC` contains a u32 game code:
- `0` → Ruby/Sapphire or Emerald (same party offsets)
- `1` → FireRed/LeafGreen

### Party Data Offsets (in Section ID 1's data area)

| Variant | Party Count Offset | Party Data Start |
|---|---|---|
| Ruby/Sapphire | `0x0234` | `0x0238` |
| Emerald | `0x0234` | `0x0238` |
| FireRed/LeafGreen | `0x0034` | `0x0038` |

**This was a critical bug fixed in session**: FR/LG offset mismatch caused `getPartyPokemon` to always return an empty array.

---

## 6. Pokemon Binary Format (100 bytes, party slot)

```
0x00  4   Personality Value (PV)     u32 LE   — encryption key component
0x04  4   OT Trainer ID (OTID)       u32 LE   — encryption key component
0x08 10   Nickname                   bytes (Gen III encoding)
0x12  1   Language                   u8
0x13  1   Misc flags                 u8
0x14  7   OT Name                    bytes
0x1B  1   Markings                   u8
0x1C  2   Checksum                   u16 LE   — over decrypted substructures
0x1E  2   Padding                    (zeros)
0x20 48   Encrypted data block       (4 × 12-byte substructures, XOR encrypted)
0x50  4   Status condition           u32 LE   (party only, 0 = healthy)
0x54  1   Level                      u8       (party only, cached)
0x55  1   Mail ID                    u8       (ignored)
0x56  2   Current HP                 u16 LE
0x58  2   Max HP                     u16 LE
0x5A  2   Attack                     u16 LE
0x5C  2   Defense                    u16 LE
0x5E  2   Speed                      u16 LE
0x60  2   Sp. Attack                 u16 LE
0x62  2   Sp. Defense                u16 LE
```

### Encryption

The 48-byte block at `0x20` is XOR-encrypted with key `pv ^ otId`, applied as u32 words over 12 iterations.

### Substructure Shuffling

The 48-byte decrypted block contains 4 × 12-byte substructures in order determined by `pv % 24`. The 24 permutations map (Growth, Attacks, EVs, Misc) to physical positions [0,1,2,3].

### Substructure Contents

| Name | Size | Key fields |
|---|---|---|
| Growth | 12B | species (u16), heldItem (u16), experience (u32), ppBonuses (u8), friendship (u8) |
| Attacks | 12B | moves[4] (u16 each), pp[4] (u8 each) |
| EVs/Condition | 12B | hpEv, attackEv, defenseEv, speedEv, spAtkEv, spDefEv, + 6 contest stats (u8 each) |
| Misc | 12B | pokerus (u8), metLocation (u8), originsInfo (u16), ivsEggAbility (u32 packed), ribbons (u32) |

---

## 7. mGBA WASM Integration

### VFS Paths
```
/data/games/<romname>.gba   — ROM files
/data/saves/<romname>.sav   — Save files
```

### Key MgbaModule Methods (from `mgba.d.ts` + actual `mgba.js` source)
- `FSInit()` — mounts IndexedDB-backed VFS (must await before anything else)
- `FSSync()` — flushes VFS MEMFS to IndexedDB
- `loadGame(romPath, savePathOverride?)` → `boolean` — cold-loads ROM, **re-reads VFS save from `savePathOverride ?? derived path`**
- `quitGame()` — stops game; C core **flushes save chip to VFS** as part of teardown
- `quickReload()` — CPU/GPU soft-reset only; **does NOT re-read VFS save** (save chip stays in C heap)
- `getSave()` → `Uint8Array | null` — calls `FS.readFile(saveName)` — always a VFS copy, not live memory
- `uploadSaveOrSaveState(file, callback?)` — writes file to VFS only; **does NOT trigger any reload**
- `setCoreSettings({restoreAutoSaveStateOnLoad: bool, ...})` — disable snapshot restore before save injection
- `addCoreCallbacks({saveDataUpdatedCallback: fn})` — fires immediately when C core writes save chip to VFS
- `toggleInput(bool)` — enable/disable DOM input + focus event handlers (SDL2 level)
- `saveName?: string` — actual save path mGBA chose after loadGame
- `FS.writeFile / readFile / unlink / mkdir` — Emscripten MEMFS API

### Critical mGBA WASM Save Chip Architecture

```
Game start (loadGame)
  → C core reads VFS saveName into in-memory save chip buffer

During gameplay
  → Game reads/writes save chip buffer in C heap (EWRAM has live party data)
  → VFS save file NOT updated until game manually saves OR quitGame

getSave() → FS.readFile(saveName) — reads VFS, NOT the live C heap buffer
quickReload() → CPU reset only; save chip C buffer unchanged
quitGame() → flushes C save chip buffer → VFS → fires saveDataUpdatedCallback
loadGame() → re-reads VFS save into new C save chip buffer
```

**Implication**: To inject a modified save and have `loadGame` pick it up safely around the async C-heap flush:
1. Disable `restoreAutoSaveStateOnLoad` and `autoSaveStateEnable`
2. **Double-write pattern**: `FS.writeFile(save)` → `quitGame()` → wait 1000ms → `FS.writeFile(save)` again (guarantees our write survives the async flush)
3. Delete `autoSaveStateName` (.ss file) so mGBA can't restore old EWRAM party data
4. Call `loadGame(romPath, savePath)` → reads our modified save
5. Restore `autoSaveStateEnable` and `restoreAutoSaveStateOnLoad`

### Cross-Origin Isolation
mGBA needs `SharedArrayBuffer` (WASM threads). The dev server **must** send:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```
`vite.config.ts` configures this. The app shows a warning banner if isolation is missing.

### Reload Strategy — 12-Step `writeSaveAndReload`

`writeSaveAndReload` uses a **full quit + reload** cycle with the **double-write pattern** and 12 numbered diagnostic log steps:

```
Step  1: setCoreSettings({ restoreAutoSaveStateOnLoad: false })
Step  2: FS.writeFile(savePath, saveData)   — pre-quit write
Step  3: toggleInput(false)                 — prevent focusEventHandlerFunc crash
Step  4: quitGame()                         — C core flushes save to VFS asynchronously
Step  5: wait 1000ms                        — let async pthread flush complete
Step  6: FS.writeFile(savePath, saveData)   — post-flush write (wins the race)
Step  7: FS.writeFile(romPath, romData)     — re-stage ROM in VFS
Step  8: delete .ss auto-save state file + disable autoSaveStateEnable
Step  9: loadGame(romPath, savePath)        — reads our modified save
Step 10: toggleInput(true)                  — re-enable keyboard/touch input
Step 11: re-enable autoSaveStateEnable + restoreAutoSaveStateOnLoad
Step 12: FSSync()                           — flush to IndexedDB
```

`currentRomData` is captured in memory at `loadRom()` so the ROM can be re-written to VFS after quit. Each step has a `console.log` for debugging.

---

## 8. Key Source Files — Function Reference

### `src/lib/gen3/saveFileParser.ts`
- `parseSaveFile(data: Uint8Array): SaveFile` — parses full 128KB buffer, detects game variant, finds active block
- `getPartyPokemon(saveFile: SaveFile): Pokemon[]` — reads party from Section 1 using variant-correct offsets
- `setPartyPokemon(saveFile, slot, pokemon): Uint8Array` — writes Pokemon into clone of raw buffer, recalculates section checksum

### `src/lib/gen3/pokemonParser.ts`
- `readPokemon(raw: Uint8Array): Pokemon` — decrypt → unshuffle → parse → return Pokemon
- `writePokemon(pokemon: Pokemon): Uint8Array` — serialize → reshuffle → checksum → encrypt → 100 bytes

### `src/lib/gen3/baseStats.ts` *(new)*
- `BASE_STATS[speciesId]` — lookup for all 386 Gen III species: `{hp,atk,def,spd,spatk,spdef,growthRate}`
- `getBaseStats(speciesId)` — safe accessor with fallback for invalid IDs
- `expForLevel(growthRate, level)` — EXP threshold for a given level (all 6 growth rate curves)
- `levelFromExp(growthRate, exp)` — inverse: level from total EXP
- Growth rates: 0=MediumFast, 1=Erratic, 2=Fluctuating, 3=MediumSlow, 4=Fast, 5=Slow

### `src/lib/gen3/statCalc.ts` *(new)*
- `recalculatePartyStats(pokemon): Pokemon` — recalculates all party-cached stat fields using Gen III formula, preserving proportional HP
- **HP formula**: `floor((2×base + iv + floor(ev/4)) × level / 100) + level + 10`
- **Other stats**: `floor((floor((2×base + iv + floor(ev/4)) × level / 100) + 5) × natureMod)`
- Nature derived from `pv % 25`. Full 25-entry nature table (boosted/reduced stat pairs)
- HP is preserved proportionally if not at full; if at full HP, new maxHp = new maxHp

### `src/lib/gen3/rewards.ts`
- `addExperience(pokemon, amount)` — adds flat EXP, caps at `0x00FFFFFF`
- `addExperiencePercent(pokemon, percent)` — calculates EXP gap to next level from species growth rate, grants `floor(gap * percent / 100)` (min 1). No-op at level 100. **This is the function used by all current task rewards.**
- `giveHeldItem(pokemon, itemId)` — sets `growth.heldItem`
- `boostEvs(pokemon, stat, amount)` — respects 255 per stat + 510 total cap
- `setIVs(pokemon, partialIVs)` — unpack → merge → repack IV bits, preserves egg/ability flags
- `healPokemon(pokemon)` — clears status, restores HP
- `teachMove(pokemon, moveId, slot)` — sets move + 15 PP in slot 0–3

### `src/services/pokemonCrypto.ts` (`PokemonCryptoService`)
Thin adapter class that implements `IPokemonCryptoService`, delegating to `lib/gen3`:
- `parseSaveFile` → `saveFileParser.parseSaveFile`
- `readPartyPokemon(save, slot)` → `getPartyPokemon(save)[slot] ?? null`
- `applyReward(pokemon, reward)` → switch on `reward.type`, calls `lib/gen3/rewards.*`; then calls `recalculatePartyStats()` for `add_experience`, `add_experience_percent`, `set_ivs`, `boost_evs`
- `writePartyPokemon` → `setPartyPokemon`
- `recalculateSectionChecksum` → pass-through (already done inside `setPartyPokemon`)

### `src/services/saveFileService.ts`
- `applyBatchRewards(rewards)` — reads save once, groups rewards by `targetSlot`, applies all per slot, writes save once, reloads once. **This is the primary method used by the reward pipeline.**
- `applyReward(reward)` — delegates to `applyBatchRewards([reward])` for backward compat
- `getRawSave()` — reads raw save bytes without modifying
- `isCryptoReady()` — checks if crypto service is injected

### `src/services/emulatorService.ts`
- `initialize(canvas)` — checks COI, imports WASM, FSInit, creates VFS dirs
- `loadRom(file)` — writes to VFS, calls loadGame, captures `saveName` + `romData`
- `getCurrentSave()` — tries `getSave()` first, falls back to VFS read
- `writeSaveAndReload(data)` — uses the **double-write pattern** (steps 2, 6, 7 throw on failure; other steps warn-and-continue):
  1. `setCoreSettings({ restoreAutoSaveStateOnLoad: false })`
  2. `FS.writeFile(savePath, ourData)` (first write — **critical, throws on failure**)
  3. `toggleInput(false)` — prevent focusEventHandlerFunc crash during quitGame
  4. `quitGame()` → C core starts flushing save to VFS
  5. wait 1000ms for async pthread flush to finish
  6. `FS.writeFile(savePath, ourData)` (second write — **critical, throws on failure**)
  7. `FS.writeFile(romPath, romData)` (re-stage ROM — **critical, throws on failure**)
  8. Delete `.ss` auto-save state file + disable snapshot capture
  9. `loadGame(romPath, savePath)` — **critical, throws on failure**
  10. `toggleInput(true)` + re-enable snapshot settings + `FSSync()`

---

## 9. Zustand Stores

### `taskStore` (localStorage key: `'gba-tasks'`)
```ts
tasks: Task[]
addTask(title, description, priority)  // emits task:created
completeTask(id)                        // emits task:completed, pools reward via rewardStore.addPending()
deleteTask(id)                          // emits task:deleted
```

### `rewardStore` (localStorage key: `'gba-rewards'`)
```ts
pendingRewards: Reward[]
rewardHistory: RewardHistoryEntry[]   // capped at 100 entries
isClaiming: boolean                    // true while batch claim is in progress
addPending(reward)                     // called by taskStore on task completion
claimAll()                             // emits 'rewards:claim' with all pending, sets isClaiming=true
markBatchApplied(rewards, success)     // moves batch from pending → history, resets isClaiming
clearHistory()
```

On rehydrate (page load), stale `pendingRewards` are cleared — any reward pending before a refresh is unrecoverable.

### `eventBus`
Typed, singleton event bus. Events:
- `task:created` / `task:completed` / `task:deleted`
- `reward:apply` → (legacy, no longer emitted by taskStore)
- `reward:applied` → (legacy, no longer emitted)
- `rewards:claim` → triggers batch save modification pipeline (from `rewardStore.claimAll()`)
- `rewards:claimed` → carries `{ rewards, success, error? }` (from `rewardBridge`)
- `emulator:status` / `emulator:save-modified`

---

## 10. Known Issues / Open Work

### ✅ Fixed: EXP reward shows in save but game doesn't visually update stats
- **Root cause**: `addExperience` modifies `growth.experience` in the encrypted substructure but the **party-cached stats** (level, maxHp, attack, etc.) at offsets `0x50–0x63` were NOT recalculated.
- **Fix (Session 2)**: Implemented `recalculatePartyStats()` in `statCalc.ts`. Uses the Gen III stat formula with nature modifiers, base stats, IVs, EVs. Called automatically by `PokemonCryptoService.applyReward` after any EXP/IV/EV reward.

### ✅ Fixed: Save file truncation (114 688 vs 131 072 bytes)
- Old code set `SAVE_SIZE = 4096 * 14 * 2 = 114 688`. The real Gen III save is 128KB (131 072).
- Fix: `parseSaveFile` now preserves the full input buffer (`raw = new Uint8Array(data)`) and `setPartyPokemon` writes into that full clone.

### ✅ Fixed: FireRed/LeafGreen party offset mismatch
- FR/LG party count at `0x0034`, data at `0x0038` (not `0x0234`/`0x0238`).
- Fix: Added `detectGameVariant()` using game code at Section 0 offset `0xAC`. Added `PARTY_OFFSETS` lookup keyed by `GameVariant`.

### ✅ Fixed: Wrong save path / quickReload unreliability
- Old code defaulted save path to `/data/saves/game.sav`. mGBA uses `module.saveName`.
- Old code used `quickReload()` which doesn't reliably pick up externally-modified saves.
- Fix: Capture `this.currentSavePath = this.module.saveName ?? savePath` after `loadGame`. Use full quit + reload cycle.

### ✅ Fixed: Concurrent reward race condition (Session 6)
- Two rapid task completions triggered concurrent `applyReward()` calls. The second read the save before the first wrote, so the second reward overwrote the first.
- Fix: Rewards are now **pooled** — task completion queues rewards without triggering a game reload. All rewards are applied atomically in a single `applyBatchRewards()` call when the user clicks "CLAIM REWARDS".

### ✅ Fixed: Silent error swallowing in `writeSaveAndReload` (Session 6)
- 11 of 12 steps caught and swallowed errors. A failed VFS write meant `loadGame` loaded stale data but the caller saw `success: true`.
- Fix: Steps 2, 6, 7, 9 (the critical write/load steps) now throw on failure. Non-critical steps (toggleInput, delete .ss, FSSync) remain warn-and-continue.

### ✅ Fixed: No recovery from emulator init failure (Session 6)
- `initialized.current = true` was set before `await emulatorService.initialize()`. If init failed, no retry was possible.
- Fix: Flag set only after success. Added RETRY button in error state.

### ✅ Fixed: Google Fonts breaking offline PWA (Session 6)
- `globals.css` imported Press Start 2P + VT323 from Google Fonts via network. Broke offline use.
- Fix: Downloaded woff2 files, self-hosted in `src/styles/fonts/`, replaced `@import url(...)` with local `@font-face`.

### ✅ Fixed: GbaControls stuck button on pointer cancel (Session 6)
- `onPointerCancel` and `onTouchCancel` called `preventDefault()` but never `releaseButton()`. Button stayed pressed forever after an OS interruption.
- Fix: Both cancel handlers now call `emulatorService.releaseButton(button)`.

### ✅ Fixed: Text input blocked locally but works on Vercel (Session 9)
- **Root cause**: React StrictMode (dev only) double-invokes `useEffect`. In `AppLayout`, `initialized.current` was only set to `true` inside the async `.then()`. Both StrictMode invocations saw `initialized.current === false` before the first async call resolved, so `initEmulator()` was called twice, racing to call `mGBA({ canvas })`. This created two SDL2 instances — the second overwrote `this.module`, but the orphaned first instance kept its DOM keyboard event listeners active. `toggleInput(false)` only reached the second instance, leaving the first's SDL2 capture unaffected. Typing in text fields was blocked by the zombie instance. Production (Vercel) uses no StrictMode double-invocation, so only one instance was ever created.
- **Fix 1** (`AppLayout.tsx`): Set `initialized.current = true` **synchronously** before calling `initEmulator()` so the second StrictMode invocation hits the guard and bails out immediately.
- **Fix 2** (`emulatorService.ts`): Added `private initializing: boolean` flag as a service-level safeguard. `initialize()` returns early if `this.initializing` is already true, preventing a concurrent call from creating a second mGBA instance regardless of caller.

### ⚠️ Known: FireRed first-save incomplete sections
- FireRed's very first in-game save may not write all 14 sections to the save file. Section ID 1 (party data) can be missing, causing `readPartyPokemon` to return null.
- **Workaround**: The user must save in-game at least **twice** before rewards will work. The app shows a descriptive error: *"No Pokemon in party slot X. Try saving in-game again — early saves may be incomplete."*
- Second save and all subsequent saves work correctly.

---

## 11. Game Compatibility

Tested game: **FireRed** (working as of last session except stat display issue above).

Supported games (all Gen III, 128KB save, same crypto):
- Pokémon Ruby / Sapphire
- Pokémon Emerald
- Pokémon FireRed / LeafGreen ✅ (confirmed working with fix)

**Not supported**: Gen I/II (Game Boy, different format), Gen IV+ (DS, different format).

---

## 12. Test Setup

```bash
npx vitest run        # run all tests once
npx vitest            # watch mode
npx tsc --noEmit      # type check only
```

Test files in `src/lib/gen3/__tests__/`:
- `checksum.test.ts` (9 tests)
- `crypto.test.ts` (7 tests)
- `rewards.test.ts` (34 tests)
- `pokemonParser.test.ts` (15 tests)
- `substructures.test.ts` (14 tests)
- `saveFileParser.test.ts` (15 tests)
- `statCalc.test.ts` (27 tests) *(new — covers expForLevel, levelFromExp, getBaseStats, recalculatePartyStats)*

**Total: 121 tests, all passing.**

Tests use synthetic save buffers with R/S-style offsets (game code 0). `detectGameVariant` returns `ruby_sapphire` for zeroed Section 0.

---

## 13. Session History

### Session 1
1. **Game compatibility**: Confirmed Gen III only (RS/E/FRLG). Parser has no game-specific branching initially.
2. **Save location**: mGBA VFS, not real disk. Read via `module.getSave()` with VFS fallback.
3. **Save truncation bug**: Fixed — `SAVE_SIZE` was 114 688 not 131 072.
4. **FR/LG offset bug**: Confirmed by logs (`party count at offset 0x234 = 0`). Fixed `detectGameVariant` + `PARTY_OFFSETS`.
5. **Reward pipeline logging**: Added console logging to `rewardBridge` and `saveFileService`.
6. **Save reload reliability**: Switched from `quickReload()` to full `quit + loadGame` cycle. Fixed save path capture from `module.saveName`.

### Session 2
7. **Party stat recalculation**: Implemented `baseStats.ts` (386 species, 6 growth rate curves) and `statCalc.ts` (Gen III stat formula, 25-nature table, `recalculatePartyStats`). Wired into `PokemonCryptoService.applyReward` after `add_experience`/`set_ivs`/`boost_evs`. 27 new tests. 121 total passing.
8. **mGBA WASM internals investigation**: Read `mgba.js` source. Key findings:
   - `getSave()` = `FS.readFile(saveName)` — VFS copy, not live C heap
   - `quickReload()` = CPU reset only, save chip stays in C heap unchanged
   - `quitGame()` flushes C save chip → VFS asynchronously in pthread
   - `loadGame()` re-reads VFS save into new C save chip buffer, but **restores auto-save state (.ss) by default**, rolling back EWRAM party data
9. **Save injection approach (Final)**: Implemented reliable **double-write pattern**: write VFS → `quitGame()` → wait 1s for async flush → write VFS again → delete `.ss` snapshot → `loadGame(romPath, savePath)`.
10. **quitGame crash**: `focusEventHandlerFunc` crashed when DOM focus events fired during quitGame teardown (`stringToUTF8Array` gets null). Fixed by calling `toggleInput(false)` before `quitGame()`.
11. **Auto-save state conflict**: Discovered mGBA automatically captures snapshots every 30s. If an `.ss` file existed, `loadGame` restored it instead of reading our modified `.sav`, reverting in-game stats. Fixed by deleting `.ss` before load and disabling snapshot capture during reload.

### Session 3: Mobile Layout & Responsiveness (continued by different LLM)
12. **Mobile Flex Ordering**: The `AppLayout` was restructured internally on screens ≤ 768px. Using `flex-direction: column` originally pushed the Emulator canvas below the Quest Log. This was fixed by applying `order: -1` to the `.app-layout__right-panel`, prioritizing gameplay at the top of the mobile viewport.
13. **Strict Touch Controls**: iOS Safari aggressively scrolls the web page when mashing on-screen touch D-pads. Resolved by explicitly binding `onTouchStart`, `onTouchEnd`, `onTouchMove`, and `onTouchCancel` events on the `<ControlButton>` components that trigger `e.preventDefault()`, halting native touch-action completely.
14. **Canvas Width Inheritence**: On mobile, the emulator screen stayed artificially small despite `width: 100%` because its flex-parent `.emulator-canvas` was shrinking-to-fit the native canvas `240px` size. Fixed by ensuring `.emulator-canvas` is also `width: 100%`.
15. **Button Overflow**: Reduced mobile padding on the container `.card` and moved the `SELECT`/`START` buttons to the bottom of the `GbaControls` component to give the D-pad and A/B buttons enough horizontal space.

### Session 4: Percentage-Based EXP Rewards
16. **Reward system overhaul**: Replaced the mixed reward types (heal/flat EXP/item/IVs) with a unified percentage-based EXP system. All four task priorities now grant EXP as a percentage of the gap to the next level: low=10%, medium=20%, high=50%, critical=100%.
17. **New reward type `add_experience_percent`**: Added to `RewardType`, `RewardPayload` (new `experience_percent` kind with `percent` field), `rewards.ts` (`addExperiencePercent` function), `PokemonCryptoService.applyReward` (new case + stat recalc), and all UI components (`RewardDisplay`, `RewardLog`, `TaskForm`, `TaskItem`).
18. **`addExperiencePercent` implementation** (`rewards.ts`): Looks up species growth rate from `BASE_STATS`, calculates `expForLevel(level+1) - expForLevel(level)`, grants `floor(gap * percent / 100)` (min 1). No-op at level 100. Delegates to `addExperience` for the actual mutation + cap.
19. **Backward compatibility**: The old reward types (`heal_pokemon`, `add_experience`, `give_item`, `set_ivs`, `boost_evs`, `teach_move`) are still fully supported in the crypto service — they're just not used by `buildReward()` anymore. They can be re-enabled by changing `taskStore.ts`.
20. **UI labels updated**: `TaskForm` hints and `TaskItem` reward labels now show "10% EXP to next level" etc. instead of the old mixed descriptions. `RewardLog` shows "%EXP" with the percentage in the detail line.

### Session 5: iOS Debugging & PWA Conversion
21. **FireRed first-save edge case**: Diagnosed why reward pipeline failed on first attempt on iOS. FireRed's very first in-game save doesn't write all 14 sections — Section ID 1 (party data) can be missing. This is a game-level behavior, not iOS-specific. Works after a second in-game save. Added descriptive error message and logging of which section IDs are present.
22. **12-step diagnostic logging**: Added numbered `console.log` statements to every step of `writeSaveAndReload` for easier debugging of the save injection pipeline across platforms.
23. **PWA conversion**: Made the app installable as a standalone app on iOS and Android:
    - Created `public/manifest.webmanifest` — app name, theme color (#7c3aed), dark background (#1a0a2e), standalone display, icons at SVG/192/512/180 sizes.
    - Created `public/sw.js` — service worker with precache of app shell URLs on install, cache-first strategy for static assets (.js/.css/.wasm/.png/.svg), network-first with cache fallback for navigation requests, `skipWaiting()` + `clients.claim()` for immediate activation.
    - Created `public/icon.svg` — GBA-themed SVG icon with pixel checkmark, D-pad, A/B buttons, "EXP+" text.
    - Generated `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` from SVG.
    - Updated `index.html` — added `<link rel="manifest">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` (black-translucent), `apple-mobile-web-app-title`, `apple-touch-icon`, `theme-color`, `viewport-fit=cover`.
    - Updated `src/main.tsx` — service worker registration on page load.
24. **iOS PWA note**: Installation requires Safari (not Chrome on iOS, since Chrome/iOS doesn't support "Add to Home Screen"). Use Safari → Share → "Add to Home Screen".

### Session 6: Production Readiness — Pooled Rewards, Error Handling, Hardening
25. **Pooled reward system**: Completing a task no longer triggers an immediate game reload. Rewards are pooled in `rewardStore.pendingRewards`. The user clicks a "CLAIM REWARDS" button (in `RewardDisplay`) to apply all pending rewards in a single `applyBatchRewards()` call and one game reload. This eliminates the concurrent-reward race condition by design.
26. **`applyBatchRewards` in `saveFileService.ts`**: Reads save once, groups rewards by `targetSlot`, applies all rewards per slot sequentially, writes save once, reloads once. Falls back to `applyBatchRewards([reward])` for single-reward backward compat.
27. **`rewardStore` overhaul**: Added `claimAll()` (emits `rewards:claim`, sets `isClaiming=true`), `markBatchApplied(rewards, success)` (moves batch to history, caps at 100 entries), `onRehydrateStorage` callback (clears stale pending rewards on page load).
28. **`taskStore` change**: `completeTask()` now calls `useRewardStore.getState().addPending(reward)` directly instead of emitting `reward:apply`. No game reset on task completion.
29. **`rewardBridge` change**: Listens for `rewards:claim` instead of `reward:apply`. Calls `saveFileService.applyBatchRewards(rewards)`. Calls `rewardStore.markBatchApplied()` on completion. Emits `rewards:claimed`.
30. **`bootstrap.ts` simplified**: Removed the `reward:apply` → `addPending` listener (no longer needed since `taskStore` calls `addPending` directly).
31. **Critical error propagation in `writeSaveAndReload`**: Steps 2, 6, 7 (VFS writes) and step 9 (`loadGame`) now throw on failure instead of silently continuing. Non-critical steps remain warn-and-continue.
32. **Dead code removal**: Deleted unused `fullReload()` private method from `emulatorService.ts`.
33. **React Error Boundary**: New `ErrorBoundary.tsx` class component wraps `<AppLayout>` in `App.tsx`. Catches render-time errors and shows "SOMETHING WENT WRONG" with a "RELOAD APP" button.
34. **Emulator init retry**: `initialized.current` is now set to `true` only after successful `emulatorService.initialize()`. On failure, a RETRY button is shown in the emulator panel.
35. **Self-hosted fonts**: Downloaded Press Start 2P and VT323 woff2 files to `src/styles/fonts/`. Replaced Google Fonts `@import url(...)` with local `@font-face` declarations. App now renders correctly offline.
36. **GbaControls pointer/touch cancel fix**: Added `onPointerCancel` handler and updated `onTouchCancel` to call `emulatorService.releaseButton(button)`. Prevents stuck buttons after OS interruptions (phone calls, notifications).
37. **ROM/save file size validation**: `RomLoader.tsx` now checks file sizes before reading: ROM max 32 MB, save max 256 KB. Shows descriptive error if exceeded.
38. **Reward history cap**: `rewardStore.markBatchApplied()` trims `rewardHistory` to the last 100 entries to prevent unbounded localStorage growth.

### Session 7: Legal / Branding Cleanup
39. **Project renamed**: App is now **Game Productivity App** (was "GBA Productivity Quest"). Updated in `index.html` (title, iOS PWA title), `public/manifest.webmanifest` (name, short_name, description), `Header.tsx` (h1, tagline), `package.json` (name field), and `README.md`.
40. **"Pokemon" removed from user-facing copy**: Tagline changed from "Power up your Pokemon" → "Level up your party". Manifest description no longer references Pokemon. README about/features sections updated. "Pokemon" is retained only in the supported games list (game titles) and internal technical docs (Gen III binary format sections).
41. **In-UI ROM disclaimer added** (`RomLoader.tsx`): *"You must own a legal copy of any ROM file you load. This app does not distribute ROM files."* displayed below the format hint.
42. **mGBA attribution footer added** (`AppLayout.tsx`): Persistent footer crediting mGBA (MPL-2.0) and mgba-wasm, font authors (Press Start 2P by Christian Robertson, VT323 by Peter Hull, both SIL OFL 1.1), and a Nintendo non-affiliation disclaimer.
43. **README Credits & Licenses section added**: Full attribution for mGBA, both fonts, Pokémon trademark notice, and Game Boy Advance trademark notice.
44. **Trademark notices**: "Game Boy Advance" is a trademark of Nintendo Co., Ltd. — noted in footer and README. "Pokémon" is a registered trademark of Nintendo/Creatures Inc./GAME FREAK inc. — noted in README credits.

### Session 8: UI Polish and Onboarding
45. **Reward Center Visual Fixes**: Fixed a bug where percentage values were not displayed alongside the '%EXP' label in the Queued Rewards list. Additionally, corrected the pulse animation on the 'PENDING' numeric value from a red box-shadow (`badge-pulse`) to a proper yellow text glow (`text-pulse-yellow`).
46. **Tutorial Modal Addition**: Implemented a first-time visitor onboarding `TutorialModal` overlay explaining the core mechanics (load ROM, complete tasks, claim rewards).
47. **UI Zustand Store**: Created `useUiStore` using `persist` middleware mapped to `gba-ui-prefs` in localStorage to track when a user checks "Never show this again" on the tutorial modal.
48. **One-Handed Mode**: Implemented a `mobileControlAlignment` setting in `useUiStore` (defaulting to 'default', with 'left' and 'right' options). Added a toggle button in `GbaControls.tsx` visible only on mobile, pushing the D-pad and Action buttons entirely to the left or right side with CSS Flexbox for ergonomic one-handed use, while retaining strict touch handling.

### Session 9: Bug Fix — Text Input Blocked in Dev Mode
49. **StrictMode double-init fix**: Diagnosed and fixed a bug where text fields (task title, description) could not be typed in when running locally (`npm run dev`) but worked fine on Vercel. Root cause was React StrictMode double-invoking `useEffect` in `AppLayout`, causing two concurrent `mGBA({ canvas })` calls and creating an orphaned SDL2 instance that kept capturing keyboard events. Fix: set `initialized.current = true` synchronously before the async call in `AppLayout.tsx`, plus added `initializing` guard flag in `EmulatorServiceImpl.initialize()`.
50. **Recurring Tasks**: Implemented Daily and Weekly recurring quests. Updated `Task` type and `taskStore` with `recurrence` and `lastCompletedAt`. Replaced checkmarks on completed recurring quests with "🔁 Resets Tomorrow" or "🔁 Resets Next Week" locked states. Added `resetRecurringTasks` hook to `AppLayout` triggered on mount and window focus to automatically recycle quests based on local midnight/Monday bounds.

---

## 14. Next Steps (Suggested)

1. **Explore WASM memory pointer** — future optimization: mGBA WASM exposes the raw C heap. If we could locate the save chip pointer in memory, we could write the 128KB payload directly to RAM without forcing a game restart. This would allow truly seamless background rewards without kicking the player to the title screen.

2. **Re-enable other reward types** — the legacy reward types (heal, items, IVs, EVs, moves) are still fully implemented in the crypto service. They could be surfaced as bonus rewards, achievement unlocks, or selectable options alongside the EXP rewards.

3. **PWA enhancements** — add offline fallback page, background sync for task persistence, push notifications for task reminders, and app update prompts when the service worker detects a new version.

4. **Service worker cache versioning** — `CACHE_NAME = 'gba-quest-v1'` is hardcoded in `public/sw.js`. Consider updating the name to match the new branding and/or injecting a build hash at build time (or using `vite-plugin-pwa`) for automatic cache busting on deploys.

