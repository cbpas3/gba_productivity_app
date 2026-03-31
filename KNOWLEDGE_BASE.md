# GBA Productivity App — Knowledge Base

> **Purpose**: Complete project context for LLM handoff. Covers architecture, Gen III save format, active bugs, and session history.

---

## 1. Project Overview

A **Vite + React + TypeScript** web app that embeds the mGBA Game Boy Advance emulator (via WASM) and grants real in-game Pokemon rewards when the user completes productivity tasks.

- **Stack**: Vite 5, React 18, TypeScript 5.9, Zustand 4, vitest 2
- **Emulator**: `@thenick775/mgba-wasm` ^2.4.1 — Emscripten-compiled mGBA with an IndexedDB-backed virtual filesystem (VFS)
- **Run dev**: `npm run dev` (from `/Users/cbpas/Projects/gba_productivity_app`)
- **Tests**: `npx vitest run` — 6 test files, 94 tests, all passing as of session

---

## 2. Directory Structure

```
src/
  App.tsx                      # Root component, bootstraps services
  main.tsx
  components/
    EmulatorView/              # GBA canvas + ROM/save loader UI
    Layout/                    # AppLayout shell
    RewardPanel/               # Displays pending/applied rewards
    TaskManager/               # TaskList.tsx + TaskItem.tsx
  hooks/
    useKeyboardInput.ts        # Global GBA keyboard passthrough
    useRewards.ts              # Subscribes to reward:applied events
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
    rewardBridge.ts            # eventBus listener: reward:apply → SaveFileService → reward:applied
    saveFileService.ts         # Orchestrates read→parse→modify→write→reload pipeline
  store/
    eventBus.ts                # Typed event bus (EventMap)
    taskStore.ts               # Zustand tasks store (persisted as 'gba-tasks')
    rewardStore.ts             # Zustand reward queue/history (persisted as 'gba-rewards')
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
```

---

## 3. Reward Pipeline (End-to-End)

```
User clicks "DONE" on a task
  → TaskItem.tsx: completeTask(task.id)
  → taskStore.completeTask(id)
      Builds Reward via buildReward(priority) → add_experience_percent with EXP_PERCENT[priority]
      Marks task.status = 'completed', rewardClaimed = true
      eventBus.emit('task:completed', ...)
      eventBus.emit('reward:apply', { reward })

  → bootstrap.ts listener: addPending(reward)    [shows in RewardPanel UI]
  → rewardBridge.ts listener: saveFileService.applyReward(reward)
      1. emulatorService.getCurrentSave()        → Uint8Array (131 072 bytes)
      2. cryptoService.parseSaveFile(data)        → SaveFile (detects game variant)
      3. cryptoService.readPartyPokemon(save, slot) → Pokemon | null
      4. cryptoService.applyReward(pokemon, reward) → modified Pokemon
      5. cryptoService.writePartyPokemon(save, slot, pokemon) → Uint8Array (131 072 bytes)
      6. cryptoService.recalculateSectionChecksum(data)  → pass-through (checksum already done in step 5)
      7. emulatorService.writeSaveAndReload(finalSave)
           - FS.writeFile(currentSavePath, data)
           - FSSync() to IndexedDB
           - fullReload(): quitGame() → setTimeout(0) → loadGame(romPath)
  → eventBus.emit('reward:applied', { reward, success, error })
  → useRewards hook in React updates UI
```

---

## 4. Task Priority → Reward Mapping

Defined in `src/store/taskStore.ts → buildReward()`. All rewards target **party slot 0** (lead Pokemon). All priorities grant EXP as a **percentage of the gap to the next level**.

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

### Reload Strategy
`writeSaveAndReload` uses a **full quit + reload** cycle (not `quickReload`) after writing save data:
```
quitGame() → setTimeout(0) → FS.writeFile(romPath, romData) → loadGame(romPath)
```
`currentRomData` is captured in memory at `loadRom()` so the ROM can be re-written to VFS after quit.

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

### `src/services/emulatorService.ts`
- `initialize(canvas)` — checks COI, imports WASM, FSInit, creates VFS dirs
- `loadRom(file)` — writes to VFS, calls loadGame, captures `saveName` + `romData`
- `getCurrentSave()` — tries `getSave()` first, falls back to VFS read
- `writeSaveAndReload(data)` — uses the **double-write pattern**:
  1. `toggleInput(false)` — prevent focusEventHandlerFunc crash during quitGame
  2. `FS.writeFile(savePath, ourData)` (first write)
  3. `quitGame()` → C core starts flushing save to VFS
  4. wait 1000ms for async pthread flush to finish
  5. `FS.writeFile(savePath, ourData)` (second write, wins race)
  6. Delete `.ss` auto-save state file + disable snapshot capture
  7. `loadGame(romPath, savePath)`
  8. Re-enable snapshot settings + `toggleInput(true)` + `FSSync()`

---

## 9. Zustand Stores

### `taskStore` (persisted as `'gba-tasks'`)
```ts
tasks: Task[]
addTask(title, description, priority)  // emits task:created
completeTask(id)                        // emits task:completed + reward:apply
deleteTask(id)                          // emits task:deleted
```

### `rewardStore` (persisted as `'gba-rewards'`)
```ts
pendingRewards: Reward[]
rewardHistory: RewardHistoryEntry[]
addPending(reward)
markApplied(reward, success)
clearHistory()
```

### `eventBus`
Typed, singleton event bus. Events:
- `task:created` / `task:completed` / `task:deleted`
- `reward:apply` → triggers save modification pipeline
- `reward:applied` → carries `{ reward, success, error? }`
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
- Fix: Capture `this.currentSavePath = this.module.saveName ?? savePath` after `loadGame`. Use `fullReload()` (quit + reload cycle).

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

---

## 14. Next Steps (Suggested)

1. **Test the percentage EXP rewards end-to-end** — verify that low (10%), medium (20%), high (50%), and critical (100%) all produce correct EXP amounts for different Pokemon at different levels. The `addExperiencePercent` function has unit test coverage via the rewards test suite but has not been confirmed visually in-game across all priorities.

2. **Add UI feedback** — show the user a visual "Game reloading with reward..." overlay while the 1-second save injection delay is running so they don't think the app froze.

3. **Explore WASM memory pointer** — future optimization: mGBA WASM exposes the raw C heap. If we could locate the save chip pointer in memory, we could write the 128KB payload directly to RAM without forcing a game restart. This would allow truly seamless background rewards without kicking the player to the title screen.

4. **Re-enable other reward types** — the legacy reward types (heal, items, IVs, EVs, moves) are still fully implemented in the crypto service. They could be surfaced as bonus rewards, achievement unlocks, or selectable options alongside the EXP rewards.

