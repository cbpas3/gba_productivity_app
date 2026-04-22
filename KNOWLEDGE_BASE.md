# Game Productivity App — Knowledge Base

> **Purpose**: Complete project context for LLM handoff. Covers architecture, Gen III save format, Supabase cloud sync, active bugs, and session history.
> **Last updated**: Session 31 (Pokemon Unbound / CFRU compatibility: game variant detection fix, unknown species EXP fallback)

---

## 1. Project Overview

**App name**: **Productivity Boy** (rebranded from "Game Productivity App"). localStorage keys intentionally kept as `gba-*` to avoid wiping existing user data.

A **Vite + React + TypeScript** progressive web app (PWA) that embeds the mGBA Game Boy Advance emulator (via WASM) and grants real in-game rewards when the user completes productivity tasks. Installable on iOS via Safari "Add to Home Screen" and on Android/desktop via browser install prompt.

- **Stack**: Vite 5, React 18, TypeScript 5.9, Zustand 4, vitest 2, `@supabase/supabase-js`
- **Emulator**: `@thenick775/mgba-wasm` ^2.4.1 — Emscripten-compiled mGBA with an IndexedDB-backed virtual filesystem (VFS)
- **PWA**: Service worker (`public/sw.js`) + web app manifest (`public/manifest.webmanifest`) for offline caching and installability
- **Cloud sync**: Supabase (Postgres + Auth + Storage). Configured via `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env.local`. App runs fully offline when env vars are absent.
- **Run dev**: `npm run dev` (from `/Users/cbpas/Projects/gba_productivity_app`)
- **Tests**: `npx vitest run` — 7 test files, 121 tests, all passing as of session 14
- **Fonts**: Self-hosted (Press Start 2P + VT323 woff2 in `src/styles/fonts/`) — works fully offline

---

## 2. Directory Structure

```
src/
  App.tsx                      # Root component: bootstraps services, auth init, cloud hydration on sign-in
  main.tsx
  components/
    Auth/
      AccountModal.tsx         # Sign-in / sign-up / sign-out modal; shows sync status when logged in
      index.ts
    ErrorBoundary.tsx           # React error boundary — catches render errors, shows recovery UI
    EmulatorView/              # GBA canvas + ROM/save loader UI (with file size validation)
      ScreenPositionControls.tsx  # Floating ▲/◎/▼ overlay to reposition screen in fullscreen portrait+controller mode
    GamepadMapper/             # Web Gamepad API integration
      GamepadMapperModal.tsx   # Per-button remapping UI (GBA buttons + app actions); modal with always-visible footer
      GamepadStatus.tsx        # Toolbar button showing controller connection state; opens mapper
      index.ts                 # Barrel export
    Layout/
      AppLayout.tsx            # Shell: Header + NavBar + tab views (tasks/play) + modals
      Header.tsx               # Title, emulator status dot, game name, desktop “+ ADD QUEST” button
      NavBar.tsx               # Tab bar (Tasks / Play / Theme toggle / Account); fixed bottom on mobile, sticky top on desktop
      PlayRoom.tsx             # Emulator panel + RewardDisplay; volume slider, restart, fullscreen, multi-speed toolbar
      TaskDashboard.tsx        # RewardPoolBar + inline KanbanBoard (5 columns, drag-and-drop) + “+ ADD QUEST” button
    PlayRoom/
      SyncStatus.tsx           # Manual sync button + last-synced label (only shown when logged in)
    RewardPanel/               # Displays pending rewards with per-reward selection + “CLAIM X REWARDS” button
    TaskManager/               # TaskList.tsx + TaskItem.tsx + TaskBoardModal (Add Quest form modal) + BulkImportModal
    TutorialModal.tsx          # First-time onboarding overlay
  hooks/
    useKeyboardInput.ts        # Global GBA keyboard passthrough
    useGamepad.ts              # RAF polling loop for Web Gamepad API; skips emulator input when mapper is open
    useRewards.ts              # Subscribes to rewards:claimed events
  lib/
    gen3/                      # ALL Gen III save-file crypto lives here
      itemRewards.ts           # Selectable custom reward options (ITEM_REWARD_OPTIONS, IV_REWARD_OPTIONS, EV_REWARD_OPTIONS, ALL_REWARD_OPTIONS, findItemOption)
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
    supabaseClient.ts          # Supabase singleton + isSupabaseConfigured flag
    syncService.ts             # All Supabase data-access: tasks, profile (pending rewards), .sav storage
    syncBootstrap.ts           # hydrateFromCloud(userId): pulls tasks + pending rewards from cloud on sign-in
  store/
    authStore.ts               # Zustand auth store: user, session, initialize(), signIn(), signUp(), signOut()
    eventBus.ts                # Typed event bus (EventMap)
    emulatorStore.ts           # Zustand emulator status + gameSpeed(1-5) + isTurboA/B + isFullscreen + volume + pushSave/pullSave/isSyncing
    gamepadStore.ts            # Zustand gamepad state (persisted as 'gba-gamepad'): mapping (ButtonMapping+AxisMapping+ActionMapping)
    rewardStore.ts             # Zustand reward queue/history (persisted as 'gba-rewards'), claimAll(), claimSelected(), isClaiming
    taskStore.ts               # Zustand tasks store (persisted as 'gba-tasks'), addTask/completeTask/deleteTask/bulkAddTasks/hydrateTasks()
    uiStore.ts                 # Zustand UI prefs (persisted as 'gba-ui-prefs'): activeTab, modals, alignment, account, theme, screenVerticalOffset
  types/
    emulator.ts                # IEmulatorService interface, GbaButton, EmulatorStatus
    events.ts                  # EventMap interface
    gamepad.ts                 # GamepadMapping, GamepadButtonMapping, GamepadAxisMapping, GamepadActionMapping, AppAction, DEFAULT_GAMEPAD_MAPPING
    pokemon.ts                 # Pokemon, GrowthSubstructure, AttacksSubstructure, etc.
    reward.ts                  # Reward, RewardType, RewardPayload, EvStat, IVSet
    savefile.ts                # SaveFile, SaveSection, GameVariant, PartyLocation
    task.ts                    # Task, TaskPriority, TaskStatus, recurrence includes 'repeatable'
  utils/
    crossOriginCheck.ts        # assertCrossOriginIsolated (needed for SharedArrayBuffer/WASM)
supabase/
  schema.sql                   # Full Supabase schema: tasks table, profiles table, saves storage bucket + RLS
public/
  manifest.webmanifest         # PWA manifest (name: "Productivity Boy", short_name: "Prod Boy", icons, display: standalone)
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

### Additional reward types (supported in code; available as custom rewards via `itemRewards.ts`)
| Type | Effect | Used by |
|---|---|---|
| `heal_pokemon` | statusCondition = 0, currentHp = maxHp | Not currently surfaced in UI |
| `add_experience` | Flat +N EXP (capped at 0x00FFFFFF) | Not currently surfaced in UI |
| `give_item` | Sets held item to itemId | `ITEM_REWARD_OPTIONS` (Rare Candy, vitamins) |
| `set_ivs` | Sets IVs (partial or full) | `IV_REWARD_OPTIONS` (set one stat to 31) |
| `boost_evs` | Adds EVs to a stat (respects 255/510 caps) | `EV_REWARD_OPTIONS` (+50 EVs per stat) |
| `teach_move` | Sets move + 15 PP in slot 0–3 | Not currently surfaced in UI |

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
- `quickReload()` — CPU/GPU soft-reset only; **does NOT re-read VFS save** (save chip stays in C heap). Used by `restart()` to simulate the hardware Reset button. Do NOT use for save injection — write staged saves to VFS before `loadGame()` instead.
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

**Implication for staged cloud saves**: Write staged save to VFS *before* calling `loadGame()` — `loadGame` then reads it directly into the C heap. Writing after `loadGame` + `quickReload()` does not work because `quickReload()` never re-reads VFS.

**Implication for reward injection**: To inject a modified save and have `loadGame` pick it up safely around the async C-heap flush:
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
- `loadRom(file)` — if staged save exists, **pre-writes it to VFS before `loadGame()`** so it's read directly into C heap; then calls `loadGame`, captures `saveName` + `romData`
- `getCurrentSave()` — tries `getSave()` first, falls back to VFS read
- `restart()` — calls `quickReload()` (CPU soft-reset, save chip preserved); simulates hardware Reset button. No-op when not running.
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
// Task.recurrence: 'none' | 'daily' | 'weekly' | 'repeatable'
// Task.customReward?: Reward  — overrides priority-based EXP reward when set
addTask(title, description, priority, recurrence?, customReward?)  // emits task:created; pushes to Supabase if logged in
bulkAddTasks(rawTasks)                              // validates + upserts batch; pushes to Supabase if logged in
completeTask(id)                                    // emits task:completed, pools reward; pushes to Supabase
                                                    // 'repeatable' tasks: reward is given then status instantly resets to 'pending'
deleteTask(id)                                      // emits task:deleted; deletes from Supabase
updateTaskPriority(id, newPriority)                 // pushes updated task to Supabase
resetRecurringTasks()                               // resets daily/weekly tasks; pushes reset tasks to Supabase
hydrateTasks(tasks)                                 // replace local list with cloud data (called by syncBootstrap)
```

### `rewardStore` (localStorage key: `'gba-rewards'`)
```ts
pendingRewards: Reward[]
rewardHistory: RewardHistoryEntry[]   // capped at 100 entries
isClaiming: boolean                    // true while batch claim is in progress
addPending(reward)                     // called by taskStore; syncs pending pool to Supabase profile
claimAll()                             // emits 'rewards:claim' with all pending, sets isClaiming=true
claimSelected(indices: number[])       // emits 'rewards:claim' with only the selected pending rewards by index
markBatchApplied(rewards, success)     // removes only claimed rewards from pending (first-match strategy for duplicates);
                                       // syncs remaining pending to Supabase profile; moves claimed → history
clearHistory()
hydratePendingRewards(rewards)         // replace pending rewards with cloud data (called by syncBootstrap)
```

On rehydrate (page load), stale `pendingRewards` are cleared locally — but cloud profile may still hold them. `hydrateFromCloud` restores pending rewards from `profiles.pending_exp` after sign-in.

### `authStore` (not persisted — Supabase session is auto-restored from cookie/localStorage)
```ts
user: User | null
session: Session | null
isLoading: boolean
initialize()        // restores session + subscribes to auth changes; called once in App.tsx
signIn(email, pw)   // returns error string | null
signUp(email, pw)   // returns error string | null
signOut()           // clears user/session
_setSession(s)      // internal setter used by auth listener
```

### `uiStore` (localStorage key: `'gba-ui-prefs'`)
```ts
hasSeenTutorial: boolean
mobileControlAlignment: 'default' | 'left' | 'right'
isTaskBoardOpen: boolean
isBulkImportOpen: boolean
isAccountOpen: boolean
isGamepadMapperOpen: boolean        // true while GamepadMapperModal is open; useGamepad skips emulator input when true
activeTab: 'tasks' | 'play'
theme: 'dark' | 'light'            // persisted; toggled by NavBar button
toggleTheme()                       // flips dark ↔ light
screenVerticalOffset: number        // -40 to +40; translateY applied to canvas screen-wrap in fullscreen; default 0
setScreenVerticalOffset(n)          // clamps to ±40 automatically
```

### `gamepadStore` (localStorage key: `'gba-gamepad'`)
```ts
// Only `mapping` is persisted — connection state is runtime-only
isConnected: boolean
gamepadId: string | null
mapping: GamepadMapping   // buttonMappings + axisMappings + actionMappings
setConnected(id)
setDisconnected()
setMapping(mapping)       // persisted
resetMapping()            // resets to DEFAULT_GAMEPAD_MAPPING
// NOTE: persist uses `merge` migration to backfill actionMappings: [] on old saved data
```

### `emulatorStore` (not persisted)
```ts
status: EmulatorStatus
romLoaded: boolean
gameName: string | null
errorMessage: string | null
gameSpeed: 1 | 2 | 3 | 4 | 5   // emulation speed multiplier; default 1
setGameSpeed(speed)              // updates store + calls emulatorService.setGameSpeed()
cycleGameSpeed()                 // 1→2→3→4→5→1
isTurboA: boolean                // latching turbo on A button
isTurboB: boolean                // hold-to-turbo on B button
toggleTurboA() / toggleTurboB()
isFullscreen: boolean
setIsFullscreen(isFs)
volume: number                   // 0–100; default 100; calls emulatorService.setVolume() on change
setVolume(percent)               // mutates store + forwards to emulatorService immediately
lastSaveSyncTime: number | null  // Unix ms timestamp of last successful push or pull
isSyncing: boolean               // true while pushSave() or pullSave() is in flight
lastSyncStatus: 'success' | 'error' | null  // set after each push/pull; cleared after 3s by SyncStatus
setSyncStatus(s)                 // called by pushSave/pullSave to signal result to UI
pushSave()                       // uploads current save via emulatorService.getCurrentSave() + uploadSave()
pullSave()                       // downloads cloud save + calls writeSaveAndReload (or stageSaveForNextLoad if no ROM)
```

### `eventBus`
Typed, singleton event bus. Events:
- `task:created` / `task:completed` / `task:deleted`
- `reward:apply` → (legacy, no longer emitted by taskStore)
- `reward:applied` → (legacy, no longer emitted)
- `rewards:claim` → triggers batch save modification pipeline (from `rewardStore.claimAll()`)
- `rewards:claimed` → carries `{ rewards, success, error? }` (from `rewardBridge`)
- `emulator:status` / `emulator:save-modified`

---

## 9a. Cloud Sync Architecture (Session 15)

Supabase is the cloud backend. The app works fully offline when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set — `isSupabaseConfigured` gates every network call.

### Supabase Tables & Storage

| Resource | Purpose |
|---|---|
| `public.tasks` | Per-user task rows (upserted by id, RLS: owner only) |
| `public.profiles` | One row per user: `pending_exp` (Reward[] JSON) + `settings_json` |
| `storage.saves` bucket | One file per user at `{userId}/game.sav` (private, 256 KB limit) |

See `supabase/schema.sql` for full DDL + RLS policies. A Postgres trigger `on_auth_user_created` auto-creates a `profiles` row on sign-up.

### Auth Flow
```
App.tsx mounts
  → useAuthStore.initialize()         restores existing Supabase session from cookie
  → if user exists: hydrateFromCloud(userId)
  → supabase.auth.onAuthStateChange   listens for future SIGNED_IN events
      → on SIGNED_IN: hydrateFromCloud(userId)

AccountModal → signIn / signUp / signOut via useAuthStore
```

### Task Sync
Every mutating action in `taskStore` (add, complete, delete, priority update, bulk add, recurring reset) calls the appropriate `syncService` function immediately after updating local state. `fetchTasks` on hydration replaces local state (cloud wins).

### Pending Reward Sync
`rewardStore.addPending` pushes the full `pendingRewards` array to `profiles.pending_exp` after every addition. `markBatchApplied` clears it to `[]`. `syncBootstrap.hydrateFromCloud` restores pending rewards from the profile row after sign-in.

### .sav File Sync (in `emulatorStore.ts` + `SyncStatus.tsx`)

There is no auto-upload. All sync is explicit via two buttons in `SyncStatus`.

| Direction | Trigger | Detail |
|---|---|---|
| **↑ PUSH** | User clicks PUSH in `SyncStatus` | `emulatorStore.pushSave()` — reads `getCurrentSave()`, calls `uploadSave(userId, data)`, stamps `lastSaveSyncTime` + sets `lastSyncStatus` |
| **↓ PULL** | User clicks PULL in `SyncStatus` | `emulatorStore.pullSave()` — downloads cloud save, calls `writeSaveAndReload` if ROM loaded (or `stageSaveForNextLoad` if not), stamps `lastSaveSyncTime` |
| **Download on init** | Emulator init | `downloadSave(userId)` → `emulatorService.stageSaveForNextLoad(data)` — pre-written to VFS *before* `loadGame()` so it loads directly into C heap |

`uploadSave` copies the WASM-backed `Uint8Array` into a plain `ArrayBuffer` before creating a `Blob` (WASM may use `SharedArrayBuffer` which `Blob` rejects).

### `SyncStatus` component (`src/components/PlayRoom/SyncStatus.tsx`)
- Renders `null` when no user is logged in (hides entirely for offline users)
- Displays a `Synced: <time>` label formatted by `formatSyncTime()` (or "Never" if null):
  - `< 1 min` → "Just now"
  - `< 60 min` → "N mins ago"
  - Same calendar day → "Today at H:MM AM/PM"
  - Previous day → "Yesterday at H:MM AM/PM"
  - Older → "Mon D at H:MM AM/PM"
- Shows a `✓` (green) or `✗` (red) indicator when `lastSyncStatus` is set; auto-cleared after 3 seconds
- **`↑ PUSH` button** — calls `pushSave()`; disabled while `isSyncing`
- **`↓ PULL` button** — calls `pullSave()`; disabled while `isSyncing`
- Positioned in a flex header row (`.play-room__emu-header`) alongside the "EMULATOR" section title in `PlayRoom.tsx`

### NavBar Account Button
- Only rendered when `isSupabaseConfigured === true`
- Shows `🔒 SYNCED` (green) when logged in, `👤 SIGN IN` otherwise
- Opens `AccountModal` via `uiStore.isAccountOpen`

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

### ✅ Fixed: On-screen controls hidden in mobile landscape fullscreen (Session 14)
- **Root cause**: `@media (min-width: 769px)` in `AppLayout.tsx` detected "desktop" and hid mobile touch controls in fullscreen. A phone in landscape has a viewport width ≥ 844px, triggering that rule and making the on-screen controller disappear.
- **Fix 1** (`AppLayout.tsx`): Changed the two width-based breakpoints to pointer-type queries — `@media (pointer: fine)` (mouse/trackpad devices, hides controls in fullscreen) and `@media (pointer: coarse)` (touch devices, shows ghost-overlay controls). Pointer type is orientation-independent.
- **Fix 2** (`GbaControls.tsx`): Same change — `@media (max-width: 768px)` → `@media (pointer: coarse)` for all mobile-specific layout styles (alignment toggle visibility, body `justify-content` variants, center cluster absolute positioning).
- **Fix 3** (`AppLayout.tsx`): Added `isPortrait` state (`window.matchMedia('(orientation: portrait)')` with a `change` listener) and `isTouchDevice` ref (`window.matchMedia('(pointer: coarse)').matches`). When `isFullscreen && isTouchDevice.current && isPortrait`, renders a non-blocking rotate-hint overlay (spinning phone icon + "ROTATE FOR BEST EXPERIENCE") with `pointer-events: none` so it doesn't interfere with touch input.

### ✅ Fixed: Recurring task shows stale completion timestamp after reset (Session 9)
- **Root cause**: `resetRecurringTasks` reset `status` and `lastCompletedAt` but left `completedAt` intact. `TaskItem` renders `task.completedAt` unconditionally, so a reset task showed "PENDING" badge alongside a completion time.
- **Fix**: Added `completedAt: undefined` to the reset object in `taskStore.resetRecurringTasks`.

### ✅ Fixed: Weekly recurring tasks may not reset across DST transitions (Session 9)
- **Root cause**: `thisMondayStart = todayStart - daysSinceMonday * 86400000` uses raw ms. In DST-observing locales where the clocks change mid-week, a "day" is 23 or 25 hours, shifting the computed Monday boundary by ±1 hour.
- **Fix**: Changed to `new Date(y, m, d - daysSinceMonday).getTime()` (same calendar arithmetic already used for `todayStart`).

### ✅ Fixed: GBA control buttons drop on slight finger movement (Session 9)
- **Root cause**: `handlePointerLeave` in `ControlButton` unconditionally called `releaseButton`. Per the Pointer Events spec, `pointerLeave` fires on the capturing element even while pointer capture is active (e.g. when a finger drifts slightly off a button). This caused held buttons to release prematurely on any touch drift.
- **Fix**: Added `hasPointerCapture(e.pointerId)` guard — `pointerLeave` only releases when capture is not active; captured sessions are released by `pointerUp` / `pointerCancel`.

### ✅ Fixed: Text input blocked locally but works on Vercel (Session 9)
- **Root cause**: React StrictMode (dev only) double-invokes `useEffect`. In `AppLayout`, `initialized.current` was only set to `true` inside the async `.then()`. Both StrictMode invocations saw `initialized.current === false` before the first async call resolved, so `initEmulator()` was called twice, racing to call `mGBA({ canvas })`. This created two SDL2 instances — the second overwrote `this.module`, but the orphaned first instance kept its DOM keyboard event listeners active. `toggleInput(false)` only reached the second instance, leaving the first's SDL2 capture unaffected. Typing in text fields was blocked by the zombie instance. Production (Vercel) uses no StrictMode double-invocation, so only one instance was ever created.
- **Fix 1** (`AppLayout.tsx`): Set `initialized.current = true` **synchronously** before calling `initEmulator()` so the second StrictMode invocation hits the guard and bails out immediately.
- **Fix 2** (`emulatorService.ts`): Added `private initializing: boolean` flag as a service-level safeguard. `initialize()` returns early if `this.initializing` is already true, preventing a concurrent call from creating a second mGBA instance regardless of caller.

### ✅ Fixed: `bulkAddTasks` accepts invalid enum strings, corrupting persisted state (Session 10)
- **Root cause**: `priority: rt.priority || 'low'` uses `||` which only guards against falsy values — strings like `"urgent"` or `"monthly"` pass through untouched. An unrecognised `priority` value produces `undefined` in `EXP_PERCENT[priority]`, propagating into the reward pipeline with `percent: undefined`.
- **Fix** (`taskStore.ts`): Added `VALID_PRIORITIES` and `VALID_RECURRENCES` sets; unknown strings now coerce to `'low'` / `'none'` instead of passing through.

### ✅ Fixed: `BulkImportModal` auto-close timer wipes `inputData` mid-type (Session 10)
- **Root cause**: The 1-second success `setTimeout` was not stored or cleared. If the user closed and re-opened the modal before it fired, the timer would call `setInputData('')` on the newly-opened modal, silently deleting whatever they'd started typing.
- **Fix** (`BulkImportModal.tsx`): Timer reference stored in `successTimerRef`. Cleared in `handleClose` and in the `useEffect` cleanup.

### ✅ Fixed: Drag-to-Complete on Task Board has no status guard (Session 10)
- **Root cause**: `handleDropCompleted` called `completeTask(id)` unconditionally for any task dropped on the Completed column. While the store guard prevents double-completion, a `pending` task could be completed by an accidental mis-drop with no undo.
- **Fix** (`TaskBoardModal.tsx`): Added `task.status === 'pending'` check before calling `completeTask`.

### ✅ Fixed: `in-progress` tasks silently invisible on Task Board (Session 10)
- **Root cause**: `priorityTasks` filter only included `pending` and `completed+recurring`. Any task with `status === 'in-progress'` matched neither set and disappeared from the board without any indication.
- **Fix** (`TaskBoardModal.tsx`): Added `t.status === 'in-progress'` to the `priorityTasks` filter so those tasks appear in their priority column.

### ✅ Fixed: `isFullscreen` store permanently de-syncs when `exitFullscreen()` rejects (Session 11)
- **Root cause**: `handleToggleFullscreen` relied solely on `fullscreenchange` to sync the store. If `exitFullscreen()` threw (e.g. no active fullscreen, Safari quirk), no event fired and `isFullscreen` stayed `true` — locking the UI in fullscreen layout with no exit path visible.
- **Fix** (`AppLayout.tsx`): Added `setIsFullscreen(!!document.fullscreenElement)` in the outer `catch` block to force-sync from the actual browser state. Added `setIsFullscreen` to the `useCallback` dep array.

### ✅ Fixed: Fullscreen layout flashes unstyled on entry (Session 11)
- **Root cause**: The `position: relative` rule (required to anchor the absolutely-positioned toolbar and controls) was only applied via the `.is-fullscreen` class, which is set by React after the `fullscreenchange` event. In the brief gap between the browser entering fullscreen and React re-rendering, the layout was unstyled.
- **Fix** (`AppLayout.tsx`): Added `:fullscreen` and `:-webkit-full-screen` pseudo-class selectors alongside `.is-fullscreen` on the base rule so the layout is correct immediately on entry.

### ✅ Fixed: Fast-forward state not applied after emulator init or RETRY (Session 11)
- **Root cause**: The `useEffect` that calls `emulatorService.setFastForward(isFastForward)` fires at mount before the mGBA module is ready (the service guards with `module === null` and silently returns). If `isFastForward` was `true` in persisted store on load — or if the user toggled it before a RETRY — the module would start at 1x while the button showed 2x.
- **Fix** (`AppLayout.tsx`): `emulatorService.setFastForward(useEmulatorStore.getState().isFastForward)` called at the end of the `initialize().then()` callback, ensuring the correct speed is always applied to a freshly ready module.

### ✅ Fixed: `initializing` flag never reset on success, blocking future re-init (Session 11)
- **Root cause**: `EmulatorServiceImpl.initializing` was reset to `false` in the `catch` block but not on the success path. While `module !== null` covers the normal re-entry guard, if `module` were ever cleared the stuck `true` flag would silently block re-initialization with no error or log.
- **Fix** (`emulatorService.ts`): Added `this.initializing = false` on the success path before `setStatus("idle")`.

### ✅ Fixed: Fullscreen button does nothing on iOS PWA and Chrome (Session 13)
- **Root cause**: iOS Safari (including PWA mode) does not implement the Fullscreen API — `document.fullscreenEnabled` is `false` and `requestFullscreen` is undefined. Calling it threw silently and fell into the catch, which only synced the store from `document.fullscreenElement` (always `null` on iOS), leaving the UI unchanged.
- **Fix 1** (`AppLayout.tsx`, JS): `handleToggleFullscreen` now checks `document.fullscreenEnabled` before calling the API. When `false`, it takes a simulated-fullscreen path: toggles `isFullscreen` in the store directly, then attempts `screen.orientation.lock('landscape')` (still no-ops on iOS without error). `isFullscreen` added to `useCallback` deps since the simulated path reads it.
- **Fix 2** (`AppLayout.tsx`, CSS): Split the former combined selector into two rules. `.is-fullscreen` now uses `position: fixed; inset: 0; z-index: 9999` — this makes the element cover the viewport in normal document flow (required for simulated mode). `:fullscreen` / `:-webkit-full-screen` keep `position: relative; width: 100%; height: 100%` and appear *after* in the sheet, so when native fullscreen is active and the class is also set, the native rule's `position: relative` wins (the browser's fullscreen context already handles sizing).

### ✅ Fixed: Service worker caches stale assets in dev, blocking updates (Session 17)
- **Root cause**: `main.tsx` registered `sw.js` unconditionally — including during `npm run dev`. The SW's cache-first strategy for static assets served cached bundles on every refresh. "Clearing the cache" only worked for one load; the SW re-cached everything immediately and served those copies on the next refresh. Additionally, `CACHE_NAME = 'gba-quest-v1'` was hardcoded — the activate handler only evicts caches with *different* names, so no old entries were ever evicted in production either.
- **Fix 1** (`main.tsx`): Wrapped SW registration in `import.meta.env.PROD` — SW is never registered during `npm run dev`.
- **Fix 2** (`public/sw.js`): Bumped `CACHE_NAME` to `'gba-quest-v2'` to evict all `v1` cached assets on next deploy.

### ✅ Fixed: Cloud save (staged) overridden by local VFS save on ROM load (Session 17)
- **Root cause**: `emulatorService.loadRom()` called `loadGame()` first (which reads the existing local VFS save into the C heap save chip), then wrote the staged cloud save to VFS and called `quickReload()`. But `quickReload()` is a CPU-only reset — it never re-reads VFS. The C heap retained the local save; the cloud save write was immediately overwritten on the next in-game save flush.
- **Fix** (`emulatorService.ts`): Staged save is now pre-written to VFS *before* `loadGame()`. `loadGame` reads it directly into C heap. No `quickReload()` needed. The `this.stagedSaveData = null` clear is also moved to before `loadGame` so a `loadGame` failure doesn't leave stale staged data.

### ✅ Fixed: Save callback lost after `writeSaveAndReload` (Session 18)
- **Root cause**: `loadGame()` inside `writeSaveAndReload` clears mGBA's core callback registry. After any PULL or reward claim, the callback was gone.
- **Fix** (`emulatorService.ts`): Added step 13 — `addCoreCallbacks({ saveDataUpdatedCallback: this.saveCallback })` after `loadGame`, matching `loadRom`.

### ✅ Fixed: RST restores emulator save state instead of simulating hardware reset (Session 18)
- **Root cause**: `quickReload()` respects `restoreAutoSaveStateOnLoad` by default — it resumes from mGBA's `.ss` auto-save snapshot rather than booting the game cold from the title screen.
- **Fix** (`emulatorService.restart()`): Before calling `quickReload()`, disables `restoreAutoSaveStateOnLoad` via `setCoreSettings` and deletes the `.ss` snapshot file from VFS. Re-enables the setting after reload. Save chip in C heap is preserved throughout (matching real GBA hardware behaviour).

### ✅ Fixed: Pokemon Unbound / CFRU ROM hacks fail on reward claim (Session 31)
- **Root cause 1 — Wrong game variant detected**: `detectGameVariant()` read a u32 at Section 0 offset `0xAC` and treated value `1` as FireRed/LeafGreen, otherwise RS/E. CFRU (the engine Unbound is built on) repurposed that field for `gcnLinkFlags`. For players who never used a GameCube link cable, `gcnLinkFlags = 0`, so Unbound was detected as RS/E. Party data was then read from offsets `0x0234`/`0x0238` instead of the correct FRLG offsets `0x0034`/`0x0038` — producing garbage party count and garbage Pokemon bytes.
- **Root cause 2 — Unknown species crash**: Unbound adds 400+ species beyond the Gen III dex (species IDs > 386). `addExperiencePercent` called `getBaseStats(species)` which silently returned a generic neutral-stat fallback for unknown IDs, causing incorrect EXP calculations. `recalculatePartyStats` had the same issue — it would write incorrect cached stats back to the save.
- **Fix 1** (`saveFileParser.ts`): `detectGameVariant` now uses a two-step check. Step 1: vanilla `gameCode === 1` at offset `0xAC` → FRLG (unchanged). Step 2: if gameCode is 0, read the CFRU `encryptionKey` at Section 0 offset `0xF20`. Vanilla games leave this region as zeroed padding; CFRU writes a non-zero key there. Non-zero → CFRU/Unbound → force FRLG offsets. Zero → RS/E (unchanged). Safe for all vanilla games.
- **Fix 2** (`rewards.ts`): `addExperiencePercent` now explicitly checks `species <= 0 || species > 386` before calling `getBaseStats`. Unknown species receive flat `500 × percent / 100` EXP so the reward still fires correctly.
- **Fix 3** (`statCalc.ts`): `recalculatePartyStats` does the same range check and returns the Pokemon unchanged for unknown species, avoiding incorrect cached stat values being written into the save.

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
- Pokémon FireRed / LeafGreen ✅ (confirmed working)
- **Pokemon Unbound** ✅ (CFRU-based ROM hack; detected via `encryptionKey` at Section 0 `0xF20`; species > 386 get flat EXP fallback)

**ROM hack compatibility notes**:
- CFRU-based hacks (Unbound, others): game variant now correctly detected; EXP rewards work for all species; IV/EV/item rewards work if the Pokemon struct format is unchanged from vanilla FRLG (CFRU preserves this)
- Non-CFRU hacks with heavily modified save structures may still fail — no general solution without per-hack reverse engineering
- The section checksum byte-count difference between CFRU and vanilla (CFRU uses variable sizes per section) is not yet addressed; this may cause issues if CFRU validates checksums more strictly than vanilla

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

### Session 9: Bug Fixes — Text Input, Recurring Tasks, One-Handed Mode
49. **StrictMode double-init fix**: Diagnosed and fixed a bug where text fields (task title, description) could not be typed in when running locally (`npm run dev`) but worked fine on Vercel. Root cause was React StrictMode double-invoking `useEffect` in `AppLayout`, causing two concurrent `mGBA({ canvas })` calls and creating an orphaned SDL2 instance that kept capturing keyboard events. Fix: set `initialized.current = true` synchronously before the async call in `AppLayout.tsx`, plus added `initializing` guard flag in `EmulatorServiceImpl.initialize()`.
50. **Recurring Tasks feature**: Implemented Daily and Weekly recurring quests. Updated `Task` type and `taskStore` with `recurrence` and `lastCompletedAt`. Replaced checkmarks on completed recurring quests with "🔁 Resets Tomorrow" or "🔁 Resets Next Week" locked states. Added `resetRecurringTasks` called in `AppLayout` on mount and window focus to automatically recycle quests based on local midnight/Monday bounds.
51. **Recurring task stale `completedAt`**: After a daily/weekly task reset, `completedAt` was not cleared — the task showed as "PENDING" but still displayed the old completion timestamp in its footer. Fix: added `completedAt: undefined` to the reset object in `taskStore.resetRecurringTasks`.
52. **DST-unsafe weekly reset boundary**: `thisMondayStart` was computed by subtracting raw milliseconds (`daysSinceMonday * 86400000`) from today's midnight. Across a DST transition a "day" is 23 or 25 hours, which could skew the boundary by ±1 hour and cause weekly tasks to fail to reset. Fix: switched to calendar arithmetic — `new Date(y, m, d - daysSinceMonday).getTime()`, matching how `todayStart` is already computed.
53. **`pointerLeave` prematurely released GBA buttons on mobile**: `handlePointerLeave` in `ControlButton` unconditionally called `releaseButton`. With pointer capture active (set on `pointerDown`), `pointerLeave` still fires per spec when a finger drifts outside the element bounds — causing a held button to drop on any slight touch movement. Fix: guard with `hasPointerCapture(e.pointerId)` — only release in `pointerLeave` when capture is not active; active captures are released by `pointerUp`/`pointerCancel`.
### Session 10: Task Board + Bulk Import Features and Fixes
54. **Desktop Quest Board Modal**: Built a full HTML5 drag-and-drop Kanban modal overlay (`TaskBoardModal.tsx`). Added `isTaskBoardOpen` to `uiStore` and `updateTaskPriority` to `taskStore`. Five columns: four priority tiers + Completed. Dragging a pending task to a priority column updates its priority/reward. Dragging to Completed triggers `completeTask`. Recurring tasks show as locked (🔁) in their column until the next reset cycle.
55. **Bulk JSON Import feature**: Implemented a JSON ingestion modal (`BulkImportModal.tsx`). Added `bulkAddTasks` to `taskStore` — assigns fresh UUIDs, forces `status: 'pending'`, and resets all metadata. Exposed via `isBulkImportOpen` in `uiStore`, triggered by a `[ JSON ]` button next to the Add Quest form.
56. **`bulkAddTasks` enum validation**: Invalid `priority`/`recurrence` strings (e.g. `"urgent"`, `"monthly"`) now coerce to safe defaults instead of passing through and corrupting state or producing `undefined` reward percentages.
57. **`BulkImportModal` setTimeout leak fixed**: Auto-close timer stored in `successTimerRef` and cleared in `handleClose` + `useEffect` cleanup, preventing mid-type data loss on re-open.
58. **Task Board `handleDropCompleted` status guard**: Drop onto Completed column now checks `task.status === 'pending'` before calling `completeTask`, preventing accidental mis-drop completions.
59. **Task Board `in-progress` visibility**: Added `t.status === 'in-progress'` to `priorityTasks` filter so tasks in that state are no longer silently excluded from all board columns.

### Session 11: Fullscreen + Fast-Forward Features and Fixes
60. **Fullscreen mode**: Added fullscreen support to the emulator panel. `emulatorWrapRef` targets the inner emulator div; `requestFullscreen()` is called on it with an attempted `screen.orientation.lock('landscape')` on mobile. `fullscreenchange` event listener keeps `emulatorStore.isFullscreen` in sync with browser state. Toggle button in the emulator toolbar shows current state.
61. **Fast-forward (2x speed)**: Added `setFastForward(enabled)` to `emulatorService` — tries `setFastForwardMultiplier`, falls back to `setFastForwardRatio`, then `setCoreSettings`. `isFastForward` persisted in `emulatorStore`. Toolbar button toggles between `▶ 1x` and `⏩ 2x`.
62. **Mobile fullscreen controls**: In fullscreen on mobile, the on-screen controller overlay now has no background, no border, and all buttons are ghosted to `opacity: 0.35` (brightening to `0.9` on press). One-handed toggle hidden. Layout always spreads to `space-between` regardless of alignment setting.
63. **Desktop fullscreen controls**: On desktop, the on-screen controller is hidden entirely in fullscreen — keyboard input handles all GBA buttons.
64. **`isFullscreen` de-sync fix**: `handleToggleFullscreen` catch block now force-syncs store from `document.fullscreenElement`; `setIsFullscreen` added to `useCallback` deps.
65. **Fullscreen flash fix**: `:fullscreen` / `:-webkit-full-screen` pseudo-class selectors added alongside `.is-fullscreen` on the base layout rule so `position: relative` applies immediately on entry before React re-renders.
66. **Fast-forward post-init fix**: `setFastForward` now called inside `initialize().then()` so persisted 2x state is always applied to a fresh or retried module.
67. **`initializing` flag success-path reset**: `this.initializing = false` added on the success path in `emulatorService.initialize()`.

### Session 12: Global Style System Overhaul
68. **Dark theme system**: Refactored `globals.css` to a modern, high-contrast dark palette — backgrounds in near-black blue-tinted slates (`#0D0F14` → `#161B26`), accent colors reduced from neon-saturated to muted sky/emerald/amber/rose (`#38BDF8`, `#34D399`, `#FBBF24`, `#F87171`), purple system moved from heavy neon to indigo-based (`#6366F1` primary). Shadows changed from flat color-glow to elevation-based with subtle colored halos.
69. **Typography stack**: `--font-ui` and `--font-retro` both changed from VT323 / custom fonts to `system-ui, -apple-system, ...` for clean, legible body text. `--font-pixel` retains Press Start 2P exclusively for GBA-identity elements (button labels, section headers). Headings (`h1–h6`) still use `--font-pixel`.
70. **Font smoothing**: Added `-webkit-font-smoothing: antialiased` and `text-rendering: optimizeLegibility`. Removed `image-rendering: pixelated` and `font-smoothing: none` that were applied globally.
71. **GBA button palette updated**: Button colors aligned to new accent system — A button `#F43F5E`, B button `#FBBF24`, D-pad `#1E293B`, L/R `#293548`, Select/Start `#334155`.

### Session 13: iOS PWA Fullscreen Fallback
72. **iOS fullscreen fallback**: iOS Safari (including PWA mode) does not implement the Fullscreen API — `document.fullscreenEnabled` is `false` and `requestFullscreen` is undefined. The button previously did nothing on iOS.
73. **Fix — JS path** (`AppLayout.tsx`): `handleToggleFullscreen` checks `document.fullscreenEnabled` first. When `false` (iOS/Safari), it takes a simulated-fullscreen path: toggles `isFullscreen` in the store directly, then attempts `screen.orientation.lock('landscape')` (best-effort, still no-ops on iOS without error). `isFullscreen` added to `useCallback` deps.
74. **Fix — CSS split** (`AppLayout.tsx`): `.is-fullscreen` now uses `position: fixed; inset: 0; z-index: 9999` (covers viewport in normal document flow — required for simulated mode). `:fullscreen` / `:-webkit-full-screen` keep `position: relative; width: 100%; height: 100%` and appear *after* in the stylesheet, so when native fullscreen is active and the class is also set, the native rule's `position: relative` wins (the browser's fullscreen context already handles sizing).

### Session 14: Mobile Landscape Fullscreen Fix
75. **Root cause diagnosed**: Width-based media query `@media (min-width: 769px)` in `AppLayout.tsx` was used to detect "desktop" and hide mobile controls in fullscreen. Phones in landscape orientation have viewport widths ≥ 844px, so they matched the desktop rule and the on-screen controller disappeared.
76. **Pointer-type media queries** (`AppLayout.tsx`): Replaced `@media (min-width: 769px)` → `@media (pointer: fine)` (mouse/trackpad) and `@media (max-width: 768px)` → `@media (pointer: coarse)` (touch) throughout fullscreen control visibility rules. Pointer type is orientation-independent.
77. **Same fix in `GbaControls.tsx`**: `@media (max-width: 768px)` → `@media (pointer: coarse)` for all mobile-specific layout styles (alignment toggle, body layout, center cluster absolute positioning).
78. **Rotate hint overlay** (`AppLayout.tsx`): Added `isTouchDevice` ref (`window.matchMedia('(pointer: coarse)').matches`) and `isPortrait` state from `window.matchMedia('(orientation: portrait)')` with a `change` listener. When `isFullscreen && isTouchDevice.current && isPortrait`, a non-blocking overlay with a spinning phone icon and "ROTATE FOR BEST EXPERIENCE" text is shown using `pointer-events: none` so it never interferes with touch input. Since iOS cannot be programmatically rotated, this politely prompts the user to tilt the phone.

### Session 15: Cloud Sync + Auth
79. **Supabase integration**: Added `@supabase/supabase-js`. Created `supabaseClient.ts` with a singleton client and `isSupabaseConfigured` flag — app behaves identically offline when env vars are absent.
80. **`supabase/schema.sql`**: Full DDL for `tasks` table (bigint ms timestamps, enum CHECK constraints, RLS), `profiles` table (`pending_exp` jsonb, `settings_json` jsonb, auto-create trigger), and `saves` storage bucket (private, 256 KB limit, 4 RLS policies for SELECT/INSERT/UPDATE/DELETE keyed by `{userId}/` folder prefix).
81. **`syncService.ts`**: Thin Supabase data-access layer with `pushTask`, `pushTaskBatch`, `deleteTask`, `fetchTasks` (tasks table), `pushProfile`, `fetchProfile` (profiles table), `uploadSave`, `downloadSave` (saves storage bucket). All functions are no-ops when `!isSupabaseConfigured`.
82. **`authStore.ts`**: New Zustand store (not persisted). Holds `user`, `session`, `isLoading`. `initialize()` restores the session on startup and subscribes to auth state changes. `signIn` / `signUp` / `signOut` delegate to Supabase Auth.
83. **`syncBootstrap.ts`**: `hydrateFromCloud(userId)` fetches tasks and profile in parallel, replacing local task list (cloud wins when tasks exist) and restoring pending rewards from `profiles.pending_exp`.
84. **`App.tsx` updated**: Calls `useAuthStore.initialize()` on mount, hydrates from cloud for any existing session, and registers an `onAuthStateChange` listener to re-hydrate on future sign-ins.
85. **`taskStore.ts` updated**: All 6 mutating actions now call `syncService` after updating local state. Added `hydrateTasks(tasks)` action for cloud hydration.
86. **`rewardStore.ts` updated**: `addPending` syncs full pending pool to `profiles.pending_exp`. `markBatchApplied` clears it. Added `hydratePendingRewards(rewards)` for cloud hydration.
87. **`AccountModal.tsx`** (new component at `src/components/Auth/`): Email/password sign-in and sign-up form. Shows signed-in state with user email + "Cloud sync is active" notice + SIGN OUT button. Shows unconfigured notice when Supabase env vars are missing.
88. **`NavBar.tsx` updated**: New Account tab button (only shown when `isSupabaseConfigured`). Shows `🔒 SYNCED` (green) when logged in, `👤 SIGN IN` otherwise. Pushes to right via `margin-left: auto`. Tapping opens `AccountModal`.
89. **`uiStore.ts` updated**: Added `isAccountOpen` / `setIsAccountOpen` fields. Added `activeTab: 'tasks' | 'play'` for tab switching.
90. **`AppLayout.tsx` refactored**: Now a thin shell — Header + NavBar + tab views (`TaskDashboard` / `PlayRoom` toggled via `display: none`) + all modals. Both views always mounted to preserve emulator canvas state across tab switches. Mounts `<AccountModal />`.
91. **`PlayRoom.tsx`** (new/extracted): Contains all emulator lifecycle logic (init, fast-forward, fullscreen, rotate hint). Registers `setSaveCallback(scheduleSaveUpload)` — a 5-second debounced `uploadSave` call. On init, downloads cloud `.sav` and stages it via `emulatorService.stageSaveForNextLoad`.
92. **`TaskDashboard.tsx`** (new): Renders `RewardPoolBar` (EXP% fill bar, `🎮 Ready to Play?` button) + Quest Log section (TaskForm + TaskList).
93. **`Header.tsx` updated**: Displays `gameName` from `emulatorStore`. Desktop-only `📋 BOARD` button (visible at `≥ 1024px`) opens `TaskBoardModal`.

### Session 16: Manual Save Sync + SyncStatus UI
94. **`emulatorStore` extended**: Added `lastSaveSyncTime: number | null`, `isSyncingSave: boolean`, `setLastSaveSyncTime(ts)`, and `forceSyncSave()`. The store now imports `emulatorService` and `uploadSave` directly so the force-sync action is self-contained.
95. **`forceSyncSave()` action**: Reads the current save via `emulatorService.getCurrentSave()`, calls `uploadSave(userId, data)`, and on success stamps `lastSaveSyncTime = Date.now()`. Sets `isSyncingSave = true` for the duration; resets to `false` in both success and error paths.
96. **Auto-sync timestamp**: `PlayRoom.scheduleSaveUpload` now chains `.then(() => setLastSaveSyncTime(Date.now()))` after a successful debounced upload, so both upload paths keep `lastSaveSyncTime` current.
97. **`SyncStatus.tsx`** (new at `src/components/PlayRoom/SyncStatus.tsx`): Self-contained component that gates on `useAuthStore.user` — returns `null` for offline/unauthenticated users. Shows a formatted last-synced label and a `☁ SYNC` icon button. Button disables and animates (CSS `rotate` keyframe on the `↻` character) while `isSyncingSave` is true. Date formatting uses native `Intl.DateTimeFormat` with relative bucketing ("Just now" / "N mins ago" / "Today at…" / "Yesterday at…" / absolute date).
98. **`PlayRoom.tsx` integration**: Emulator card header refactored into `.play-room__emu-header` (flex row, `justify-content: space-between`) holding the "EMULATOR" title and `<SyncStatus />` side-by-side. Import path: `../PlayRoom/SyncStatus`.

### Session 17: SW Dev Fix, Staged Save Fix, Restart Button
99. **Service worker dev bypass** (`main.tsx`): SW registration now guarded by `import.meta.env.PROD`. In dev (`npm run dev`) no SW is ever registered, so Vite's dev server always serves live files. Cache name bumped to `gba-quest-v2` to bust all `v1` entries on next production deploy.
100. **Staged save pre-write fix** (`emulatorService.loadRom`): Cloud save (from `stageSaveForNextLoad`) is now written to VFS *before* `loadGame()` is called, not after. Previously the save was written after `loadGame` and `quickReload()` was called, but `quickReload()` is a CPU-only reset that never re-reads VFS — so the local desktop save in C heap always survived. Now `loadGame` reads the cloud save directly into C heap. `this.stagedSaveData` is cleared before `loadGame` to avoid stale data on failure.
101. **`restart()` method** (`IEmulatorService` + `emulatorService.ts`): New method wrapping `quickReload()`. Simulates pressing the hardware Reset button — CPU/GPU soft-reset with save chip preserved (matching real GBA behavior). No-op when not running.
102. **Restart button** (`PlayRoom.tsx`): `↺ RST` button added to the emulator toolbar between fast-forward and fullscreen. Disabled when `romLoaded` is false. Calls `emulatorService.restart()` directly.

### Session 18: Save Sync Fixes, Pull Save, Upload Indicator
103. **Save callback re-registration** (`emulatorService.writeSaveAndReload`): Added step 13 — `addCoreCallbacks({ saveDataUpdatedCallback })` after `loadGame()`. Without this, every PULL SAVE or reward claim silently killed the auto-upload pipeline for the rest of the session because `loadGame` clears mGBA's core callback registry.
104. **`uploadNow` extracted** (`PlayRoom.tsx`): Upload logic split out from `scheduleSaveUpload` into its own `uploadNow` callback. Debounce reduced 5s → 2s. `uploadNow` is reused by both the debounce timer and the flush handlers.
105. **Page-hide flush** (`PlayRoom.tsx`): `visibilitychange` (hidden) and `pagehide` listeners call `uploadNow` immediately, cancelling any pending debounce. Prevents the upload timer being killed when the user switches apps or locks the screen on mobile.
106. **`forceSyncSave` direction reversed** (`emulatorStore.ts`): Now downloads from cloud (`downloadSave`) and applies via `writeSaveAndReload` (or `stageSaveForNextLoad` if no ROM loaded). Was incorrectly uploading the local save. Added `lastSyncStatus` field (`'success' | 'error' | null`) set by both `forceSyncSave` and `uploadNow`.
107. **SYNC button renamed to PULL SAVE** (`SyncStatus.tsx`): Clarifies that the button pulls from cloud, not pushes. Loading state shows "LOADING…".
108. **Upload toast indicator** (`SyncStatus.tsx`): `lastSyncStatus` drives a fading `✓ Saved to cloud` / `✗ Upload failed` toast that appears after every auto-upload and PULL SAVE, then fades and self-clears via a 3-second timeout calling `setSyncStatus(null)`.
109. **`restart()` save-state fix** (`emulatorService.ts`): Disables `restoreAutoSaveStateOnLoad` and deletes the `.ss` snapshot before `quickReload()`, then re-enables the setting. Previously RST resumed the emulator save state instead of booting cold from the title screen.

### Session 19: Remove Auto-Upload, Explicit PUSH/PULL Buttons
110. **Auto-upload removed** (`PlayRoom.tsx`): Removed `scheduleSaveUpload`, `uploadNow`, `uploadNowRef`, the debounce timer, and the `visibilitychange`/`pagehide` flush handlers. `emulatorService.setSaveCallback(null)` no longer registered. `uploadSave` import removed from PlayRoom.
111. **`pushSave()` action** (`emulatorStore.ts`): New action — reads `getCurrentSave()`, calls `uploadSave(userId, data)`, stamps `lastSaveSyncTime`, sets `lastSyncStatus`. Replaces the old `forceSyncSave` upload path.
112. **`pullSave()` action** (`emulatorStore.ts`): Renamed/cleaned from old `forceSyncSave` — downloads cloud save, calls `writeSaveAndReload` or `stageSaveForNextLoad`. Sets `lastSaveSyncTime` and `lastSyncStatus` on completion.
113. **Store simplified** (`emulatorStore.ts`): Removed `isAutoUploading`, `setIsAutoUploading`, `setLastSaveSyncTime`, `forceSyncSave`. Renamed `isSyncingSave` → `isSyncing`. Now only has `pushSave`, `pullSave`, `setSyncStatus`.
114. **`SyncStatus.tsx` rewritten**: Two explicit buttons — `↑ PUSH` and `↓ PULL` — both disabled while `isSyncing`. Label shows `Synced: <time>` or "Synced: Never". `✓`/`✗` indicator appears for 3s after each operation.

### Session 20: Theme Toggle, Volume Control, Emulator Toolbar Polish
115. **Dark/light theme toggle** (`uiStore.ts`): Added `theme: 'dark' | 'light'` (default `'dark'`) and `toggleTheme()` to `UiState`. Both persisted in `'gba-ui-prefs'`. Exported `Theme` type.
116. **NavBar theme button**: New `☀️ LIGHT` / `🌙 DARK` toggle button rendered between the Play tab and the Account button. Uses `nav-bar__tab--theme` class with `margin-left: auto` to push it (and Account) to the right on desktop. Account button's own `margin-left: auto` removed (it now sits adjacent to the theme button).
117. **Volume control** (`emulatorStore.ts`): Added `volume: number` (default `100`) and `setVolume(percent)`. `setVolume` calls `emulatorService.setVolume(percent)` immediately then updates store state — no effect if module not yet initialised (service guards internally).
118. **`emulatorService.setVolume(percent)`** (`emulatorService.ts`): New method clamps 0–100 and calls `this.module.setVolume(...)`. No-op when module is null.
119. **`emulatorService.restart()`** (`emulatorService.ts`): New method (documented in Session 17 but now wired end-to-end). Disables `restoreAutoSaveStateOnLoad`, deletes `.ss` snapshot, calls `quickReload()`, re-enables setting. No-op when `status !== 'running'`.
120. **`emulatorService.getStatus()`** (`emulatorService.ts`): New method — returns `this.status`. Used by `emulatorStore.pullSave()` to decide between `writeSaveAndReload` and `stageSaveForNextLoad`.
121. **Volume slider in toolbar** (`PlayRoom.tsx`): New `<label class="emu-toolbar__volume">` containing a volume emoji icon (🔇/🔉/🔊 based on level) and a `<input type="range" min=0 max=100 step=5>` slider. `onChange` calls `setVolume`. Initial volume applied via `emulatorService.setVolume(volume)` inside `initialize().then()`.
122. **`emulatorService.setVolume` called on init** (`PlayRoom.tsx`): `initEmulator` now calls `emulatorService.setVolume(useEmulatorStore.getState().volume)` alongside `setFastForward`, so persisted volume is applied to every fresh or retried module.

### Session 21: Light Theme Professional Redesign
123. **Full light-theme CSS variable overhaul** (`globals.css`): Colors migrated to a Slate/Zinc neutral palette — backgrounds `#F4F6F8`, cards `#FFFFFF`, surfaces `#F1F5F9`–`#E2E8F0`. Accent system shifted from Indigo-purple to Blue-600/700 (`#2563EB`/`#1D4ED8`) for an enterprise-grade, never-neon feel. Text tokens moved to Slate: primary `#0F172A` (Slate-900), secondary `#475569` (Slate-600), muted `#94A3B8` (Slate-400).
124. **`--font-pixel` overridden in light mode** (`globals.css`): Inside `[data-theme="light"]`, `--font-pixel` is set to the system-sans stack. All section headings, nav tabs, and labels that use `var(--font-pixel)` automatically render in a clean professional typeface. The GBA game controller UI retains the pixel font via component-level inline styles.
125. **Glow effects removed in light mode** (`globals.css`): `--glow-text-purple` and `--glow-text-cyan` set to `none`. All `.glow-text--*` utility classes scoped under `[data-theme="light"]` produce flat ink-coloured text with no blur or neon shadow.
126. **Professional elevation shadow system** (`globals.css`): All `--shadow-*` variables in `[data-theme="light"]` replaced with pure Slate-based `box-shadow` values (no coloured outer glows). Uses a two-layer system (1–2 px tight contact shadow + 6–16 px ambient lift) matching modern SaaS elevation conventions.
127. **Light-theme scoped block overrides** (`globals.css`): Added a `/* Light-theme targeted overrides */` section at end of file. Rules scoped to `[data-theme="light"]`: `h1–h4` (font-weight 700, letter-spacing −0.01em), `.card` (white bg + ink border + elevation shadow), `.pixel-border` (solid Slate-14% ring), `.glow-text--*` (flat colour, `text-shadow: none`), `.input:focus` (Blue-600 ring), `.pixel-divider` (10% Slate), `.btn--primary` (Blue-600 fill, white text), `.btn--secondary` (white bg, ink border), `.btn--ghost` (transparent, ink border hover → Slate tint).
128. **Header light-mode override** (`Header.tsx`): `[data-theme="light"] .app-header` renders as a clean white bar with 1px Slate bottom border and two-layer elevation shadow. The neon horizontal accent line is hidden (`display: none`). Title overridden to font-weight 800, letter-spacing −0.02em, Slate-900. Tagline set to Slate-600 / 400 weight. Ornament elements hidden.
129. **NavBar light-mode override** (`NavBar.tsx`): `[data-theme="light"] .nav-bar` uses white background, bottom border, no glow shadow. Active tab indicator switches from cyan neon to solid Blue-600 fill + underline. Hover state uses Slate-100 tint. Mobile bottom bar gets `backdrop-filter: blur(12px)` with 97% white background.

### Session 22: Board on Homepage, Form in Modal
130. **`TaskDashboard.tsx` restructured**: Removed `<TaskForm />` and `<TaskList />` from the inline Quest Log section. Replaced with inline `<KanbanBoard />` — draggable 5-column board (Low / Medium / High / Critical / Completed) rendered directly on the Tasks page. Max-width expanded from 720 px to 1200 px to accommodate the board grid.
131. **`KanbanBoard` component** (new, inside `TaskDashboard.tsx`): Self-contained Kanban inside `TaskDashboard`. Shares drag logic with the old `TaskBoardModal`. Header row has the `QUEST BOARD` pixel title and a `+ ADD QUEST` primary button (opens `TaskBoardModal`). Grid responsive: 5 col ≥ 901 px, 3 col ≥ 601 px, 2 col on mobile. Each column shows `"Drop here"` dashed placeholder when empty.
132. **`TaskBoardModal.tsx` rewritten**: Was the full Kanban board in a modal. Now a focused `"ADD QUEST"` form modal hosting `<TaskForm onSubmitSuccess={close} />`. Max-width 520 px, slides in with CSS `modal-slide-up` animation, closes on backdrop click, auto-closes 900 ms after form success. Mobile: renders as a bottom sheet (full-width, rounded top corners only).
133. **`TaskForm` extended** (`TaskForm.tsx`): Added optional `onSubmitSuccess?: () => void` prop. Called 900 ms after a successful `addTask` (after the "QUEST ADDED!" flash), giving the parent modal time to show feedback before closing.
134. **Header button relabelled** (`Header.tsx`): Desktop `aria-label="Open Kanban Quest Board"` / label `📋 BOARD` changed to `aria-label="Add a new quest"` / label `+ ADD QUEST`. Opens the same `TaskBoardModal` (now the Add Quest modal).

### Session 23: Bulk Add Modal Rewrite & Button Rename
135. **Button renamed** (`TaskForm.tsx`): `[ JSON ]` → `📥 BULK ADD`. Tooltip updated to `"Bulk-add multiple quests from a JSON array"`.
136. **`BulkImportModal.tsx` rewritten**: Complete overhaul of instructions and UX.
   - **Description**: Explains the feature in plain English with inline `code` styling on `title`.
   - **Supported fields table**: Four-column table (Field / Type / Required / Accepted values) documenting all 4 schema fields: `title` (required), `description`, `priority` (`"low"` / `"medium"` / `"high"` / `"critical"`, default `"medium"`), `recurrence` (`"none"` / `"daily"` / `"weekly"`, default `"none"`).
   - **Example JSON**: Updated to demonstrate all 4 fields including `description` and `recurrence`.
   - **Validation**: Improved error messages — distinguishes empty input, non-array, missing/invalid `title` (reports index), and JSON syntax errors.
   - **Success state**: Shows `"✓ N quest(s) added!"` with actual count; button disabled during flash; auto-closes after 1.2 s.
   - **Styling**: Slide-up entrance animation, light-theme overrides for table/example/error, mobile bottom-sheet layout.

### Session 24: Global Font-Size Readability Pass
**Root cause**: All `font-family: var(--font-pixel)` sizes had been calibrated for _Press Start 2P_, which renders large and visually bold even at small `rem` values (e.g. `0.45rem` in Press Start 2P is still readable). After Session 21 overrode `--font-pixel` to system-sans in light mode, those same numeric values became near-invisible in system-sans (7–8 px). Dark mode was also affected at certain viewport scales. Fix: raised every sub-threshold size to a legible floor while preserving the pixelated aesthetic.

137. **`NavBar.tsx` font sizes fixed**: Tab base (`font-size` on `.nav-bar__tab` and `.nav-bar__tab-label`): `0.5rem` → `0.8rem`; letter-spacing reduced from `0.1em` to `0.05em`. Theme and Account buttons: `0.42rem` → `0.8rem`. Notification badge: `0.35rem` → `0.65rem`. Mobile tab label: `0.38rem` → `0.72rem`.
138. **`TaskDashboard.tsx` font sizes fixed**: Reward bar icon/title/pct: `0.65–0.75rem` → `0.8rem` each. Board title: `0.6rem` → `0.875rem`; letter-spacing `0.15em` → `0.08em`. Column headers: `0.45rem` → `0.72rem`; `white-space: nowrap` → `normal` so long labels wrap. Empty-state: `0.7rem` → `0.85rem`. Card title: `0.875rem` → `0.9375rem`. Card badge: `0.35rem` → `0.65rem`; padding `2px 5px` → `3px 6px`.
139. **`Header.tsx` font sizes fixed**: Status text (IDLE label): `0.4rem` → `0.75rem`; letter-spacing `0.1em` → `0.06em`. Desktop board button: `0.5rem` → `0.8rem`.

### Session 25: Repeatable Tasks + Custom Item Rewards

140. **`repeatable` recurrence type** (`task.ts`, `taskStore.ts`, `TaskForm.tsx`, `TaskItem.tsx`, `TaskBoardModal.tsx`): New recurrence option alongside `none`/`daily`/`weekly`. Repeatable tasks give their reward and instantly reset to `pending` — no time check needed. Fast-path in `completeTask`: after pooling the reward, status is immediately set back to `'pending'` and `completedAt`/`lastCompletedAt` are cleared. Supabase CHECK constraint updated to include `'repeatable'` (migration required: drop + re-add constraint). TaskItem renders "🔁 Repeatable" badge.

141. **Custom item rewards** (`src/lib/gen3/itemRewards.ts` new): Defines three arrays of selectable `Reward` objects:
    - `ITEM_REWARD_OPTIONS` — 7 `give_item` rewards: Rare Candy (68), HP Up (81), Protein (82), Iron (83), Carbos (84), Calcium (85), Zinc (86) — FRLG item IDs
    - `IV_REWARD_OPTIONS` — 6 `set_ivs` rewards, one per stat set to 31
    - `EV_REWARD_OPTIONS` — 6 `boost_evs` rewards, +50 EVs per stat
    - `ALL_REWARD_OPTIONS` — concat of all three; used by `findItemOption(reward)` for display labels
    - `findItemOption(reward)` — matches by `reward.type` + `JSON.stringify(reward.payload)` for label lookup

142. **`customReward` field on Task** (`task.ts`, `taskStore.ts`): Optional `customReward?: Reward` stored on the task. `completeTask` uses `task.customReward ?? buildReward(task.priority)` — custom reward takes precedence over priority-based EXP.

143. **`TaskForm.tsx` reward selector**: Dropdown to optionally choose a custom item/IV/EV reward instead of the default priority EXP. Selecting an item from `ALL_REWARD_OPTIONS` sets `customReward` on the new task.

### Session 26: Multi-Speed Emulation + Turbo A/B Buttons

144. **Multi-speed emulation** (`emulatorStore.ts`, `emulatorService.ts`, `PlayRoom.tsx`): Replaced binary fast-forward toggle with a 5-speed cycle. `gameSpeed: 1|2|3|4|5` in store; `cycleGameSpeed()` steps 1→2→3→4→5→1. `emulatorService.setGameSpeed(speed)` calls `setFastForwardMultiplier` (or `setFastForwardRatio` / `setCoreSettings` fallbacks). Toolbar button shows `▶ 1×` at normal speed and `⏩ Nx` when accelerated. Speed applied on init and RETRY.

145. **Turbo A button (latch mode)** (`GbaControls.tsx` → `TurboButton` component): Wraps the A button. Tap once → starts firing A every 50ms (`setInterval`). Tap again → stops. Toggle pill shows `TA` (off) or `⚡A` (on, gold glow). Uses `turboLatch` prop — only A uses latching behavior; stopping turbo via the pill toggle also stops the interval via a `useEffect` watching `turboActive`.

146. **Turbo B button (hold mode)** (`GbaControls.tsx` → `TurboButton` component): Wraps the B button. Hold down → fires B every 50ms. Release (pointer up/cancel/unmount) → stops. Toggle pill shows `TB` / `⚡B`. Uses hold-to-fire pattern (no latching). Both A and B use `turboActiveRef` pattern to avoid stale closure — ref is updated every render.

### Session 27: D-pad Thumbstick + Touch Interaction Polish

147. **D-pad thumbstick** (`GbaControls.tsx` → `DPad` component): Replaced 4 individual `ControlButton` instances with a single 120×120px unified capture zone (3×3 CSS grid cross-shape, corners are transparent gaps). `pointerdown` captures the pointer; `pointermove` resolves direction in real time using `atan2` from center offset — sliding thumb from Up → Left transitions input without lifting. 8 sectors (4 cardinal + 4 diagonal, each 45°). 16px dead zone at center fires no input. Diagonal sectors press two buttons simultaneously (e.g. Up+Right). Active cell highlight applied via direct DOM class mutation — no React re-render on move. `DPAD_SIZE = 120`, `DEAD_ZONE = 16` constants at top of component.

148. **Kanban card touch polish** (`globals.css`): `.kanban-card` gets `user-select: none; -webkit-user-select: none; -webkit-touch-callout: none` — prevents text selection highlight and iOS long-press context menu during drag-and-drop.

149. **Input font size floor** (`globals.css`): `.input` uses `font-size: 1rem` (16px). Must stay ≥ 16px — iOS Safari auto-zooms the page on focus when an input has `font-size < 16px`.

### Session 28: Web Gamepad API Integration

150. **`src/types/gamepad.ts`** (new): Defines all gamepad types — `GamepadButtonMapping` (button index → GBA button), `GamepadAxisMapping` (axis + direction → GBA button), `GamepadActionMapping` (button index → AppAction), `GamepadMapping` (name + all three arrays), `AppAction = 'turbo_a' | 'turbo_b' | 'speed_up'`. `DEFAULT_GAMEPAD_MAPPING` uses DualShock-style button indices. `GBA_BUTTONS`, `APP_ACTIONS`, `APP_ACTION_LABELS` exported.

151. **`src/store/gamepadStore.ts`** (new): Persisted Zustand store (`gba-gamepad`). Only `mapping` is persisted (connection state is runtime-only). `merge` migration backfills `actionMappings: []` for users with old persisted data predating the field.

152. **`src/hooks/useGamepad.ts`** (new): RAF polling loop mounted once in `PlayRoom` (PlayRoom is always mounted via `display: none` trick). Each frame: clones gamepad snapshot with deep-copy (`Array.from(gp.buttons).map(b => ({pressed, value}))`), diffs against previous frame for button transitions. GBA buttons are held while pressed (not edge-triggered). App actions (turbo_a/b, speed_up) are edge-triggered — fire once on button-down via `actionDownRef`. Dead zone = 0.3 for axes. Checks `useUiStore.getState().isGamepadMapperOpen` each frame — releases all held buttons and skips input when mapper is open.

153. **`src/components/GamepadMapper/GamepadStatus.tsx`** (new): Toolbar button showing `🎮 PAD ●` (connected) or `🎮 PAD` (disconnected). Click opens `GamepadMapperModal` via `uiStore.setIsGamepadMapperOpen(true)`.

154. **`src/components/GamepadMapper/GamepadMapperModal.tsx`** (new): Button remapping UI. Two sections: **GBA BUTTONS** (assign button index or axis to each GBA button) and **APP ACTIONS** (assign button index to turbo A/B/speed cycle; ✕ to clear). "Listening…" state — press any gamepad button/axis to assign. Uses discriminated union `ListeningTarget: { kind: 'gba'; gba: GbaButton } | { kind: 'action'; action: AppAction } | null`. Sticky footer (RESET DEFAULTS / SAVE) always visible using `gpm-overlay` class with `padding-bottom: 80px` and `align-items: flex-end` on mobile. Three-region flex layout: fixed header, scrollable `gpm-body`, `flex-shrink: 0` footer.

155. **Critical bug — deep clone of GamepadButton** (`GamepadMapperModal.tsx`): `[...gp.buttons]` only shallow-copies live `GamepadButton` references. Both prev and current snapshot frames point to the same live objects, so the diff never detects any transition. Fixed by `cloneSnapshot()`: `Array.from(gp.buttons).map(b => ({ pressed: b.pressed, value: b.value }))`.

156. **Critical bug — game receiving input during remapping** (`useGamepad.ts`): RAF loop kept sending button presses to emulator even with mapper modal open. Fixed by checking `useUiStore.getState().isGamepadMapperOpen` at the top of each poll frame — releases all currently-held buttons, clears `pressedRef` and `actionDownRef`, then returns early without processing input.

### Session 29: GBA Screen Vertical Position Control

157. **`screenVerticalOffset` in `uiStore`** (`uiStore.ts`): New persisted field `screenVerticalOffset: number` (default 0, clamped ±40). `setScreenVerticalOffset(n)` applies clamping automatically. Represents a `translateY` percentage applied to the canvas screen-wrap.

158. **Canvas offset applied** (`EmulatorCanvas.tsx`): Reads `isFullscreen` and `screenVerticalOffset` from stores. When fullscreen and offset ≠ 0, applies `transform: translateY(${offset}%)` as inline style to `.emulator-canvas__screen-wrap`.

159. **`ScreenPositionControls` component** (`src/components/EmulatorView/ScreenPositionControls.tsx` new): Floating ▲ / ◎ / ▼ button strip, right-edge absolute positioned in the fullscreen inner div. Only renders when `isFullscreen && isPortrait && isConnected` (controller connected). NUDGE = 5% per tap; ◎ resets to 0. Auto-fades after 3s via `visible` state + CSS opacity transition (`FADE_DELAY = 3000`). Wakes (becomes visible) automatically when conditions first become active via `useEffect`.

### Session 30: Rebranding + Mobile UI Fixes + Selective Reward Claiming

160. **Rebranded to "Productivity Boy"**: `index.html` title → "Productivity Boy", `apple-mobile-web-app-title` → "Productivity Boy", `public/manifest.webmanifest` name → "Productivity Boy" / short_name → "Prod Boy", `Header.tsx` h1 → "Productivity Boy", `package.json` name → "productivity-boy". localStorage keys unchanged (`gba-*`) to preserve existing user data.

161. **Toolbar overflow fix** (`PlayRoom.tsx`): Added `flex-wrap: wrap` to `.emu-toolbar` so buttons reflow to a second line on narrow viewports instead of overflowing horizontally.

162. **Rotate hint removed** (`PlayRoom.tsx`, previously in `AppLayout.tsx`): Removed the "ROTATE FOR BEST EXPERIENCE" overlay that appeared in fullscreen portrait mode. It blocked touch input even with `pointer-events: none` on some devices and was considered unnecessary UX noise.

163. **Portrait mobile layout — canvas to top** (`PlayRoom.tsx`): On mobile portrait (`max-width: 768px` + `orientation: portrait`), the emulator card uses CSS `order` to push the canvas section to the top of the card and the header/divider below it. `play-room__emulator-inner` gets `order: 1`, header gets `order: 3`, divider gets `order: 4`. No DOM restructuring needed.

164. **Selective reward claiming** (`rewardStore.ts`, `RewardDisplay.tsx`): Users can now choose which pending rewards to claim instead of always claiming all at once. `claimSelected(indices: number[])` emits `rewards:claim` with only the indexed rewards. `markBatchApplied` was updated to remove only the claimed rewards from `pendingRewards` using a first-match splice strategy (important for duplicate rewards). `RewardDisplay` shows a checkbox (▣/▢) per pending reward, SELECT ALL / DESELECT ALL button, scrollable pending list, and button label `CLAIM X / N REWARDS`.

165. **Continuous task creation** (`TaskBoardModal.tsx`): Removed `onSubmitSuccess={() => setIsOpen(false)}` — the Add Quest modal no longer auto-closes after adding a task. Users can add multiple tasks in sequence without reopening the modal.

166. **`font-size: 1rem` on `.input`** (`globals.css`): Enforced globally to prevent iOS Safari auto-zoom on text input focus (Safari zooms in when `font-size < 16px`).

### Session 31: Pokemon Unbound / CFRU Compatibility

167. **CFRU game variant detection** (`saveFileParser.ts`): `detectGameVariant` repaired for CFRU-based ROM hacks (Pokemon Unbound). CFRU repurposes Section 0 offset `0xAC` (vanilla `gameCode`) for `gcnLinkFlags`, so Unbound saves read as `0` and were misclassified as RS/E — causing party data to be read from the wrong offsets (`0x0234`/`0x0238` instead of `0x0034`/`0x0038`). Fix: added a secondary fingerprint check at Section 0 offset `0xF20` (CFRU's `encryptionKey` field). Vanilla games leave this region zeroed; CFRU writes a non-zero value. Detection order: `gameCode === 1` → FRLG; `cfruKey !== 0` → CFRU/Unbound (force FRLG offsets); otherwise → RS/E. All vanilla games unaffected.

168. **Unknown species EXP fallback** (`rewards.ts`): `addExperiencePercent` now guards `species <= 0 || species > 386` before calling `getBaseStats`. Unbound adds 400+ species beyond the Gen III dex; `getBaseStats` previously returned a silent neutral-stat fallback for these, producing incorrect EXP calculations. Unknown species now receive flat `500 × percent / 100` EXP (e.g. 50 EXP for a low-priority task), ensuring the reward fires without relying on stats we don't have.

169. **Unknown species stat recalc guard** (`statCalc.ts`): `recalculatePartyStats` applies the same `species > 386` range check and returns the Pokemon unchanged for unknown species, preventing incorrect cached stat values (HP, attack, etc.) from being written into the save file.

---

## 13a. Supabase Schema Change Log

| Session | Change | Migration SQL needed |
|---|---|---|
| 15 | Initial schema (tasks, profiles, saves) | `supabase/schema.sql` |
| 25 | Added `'repeatable'` to `recurrence` CHECK | `ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_recurrence_check; ALTER TABLE public.tasks ADD CONSTRAINT tasks_recurrence_check CHECK (recurrence IN ('none', 'daily', 'weekly', 'repeatable'));` |

> **Warning**: Any new `recurrence` value added to the TypeScript type **must** also be added to the DB CHECK constraint or Supabase will silently reject the push and `hydrateFromCloud` will overwrite localStorage with cloud data (dropping the local task).

---

## 14. Next Steps (Suggested)

1. **Explore WASM memory pointer** — future optimization: mGBA WASM exposes the raw C heap. If we could locate the save chip pointer in memory, we could write the 128KB payload directly to RAM without forcing a game restart. This would allow truly seamless background rewards without kicking the player to the title screen.

2. **Expand custom reward UI** — `give_item`, `set_ivs`, and `boost_evs` are now selectable as task rewards via `itemRewards.ts`. The remaining types (`heal_pokemon`, `teach_move`, `add_experience`) could also be surfaced. Consider a richer reward picker UI in `TaskForm`.

3. **PWA enhancements** — add offline fallback page, background sync for task persistence, push notifications for task reminders, and app update prompts when the service worker detects a new version.

4. **Service worker cache versioning** — `CACHE_NAME = 'gba-quest-v1'` is hardcoded in `public/sw.js`. Consider updating the name to match the new branding and/or injecting a build hash at build time (or using `vite-plugin-pwa`) for automatic cache busting on deploys.

5. **`vercel.json` COOP/COEP headers** — for production deployment, add `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers via a `vercel.json` file (currently only configured in `vite.config.ts` for dev).

6. **Cloud sync conflict resolution** — currently "cloud always wins" on initial hydration (if cloud has tasks). A merge strategy (e.g. union by id, latest `created_at` wins) would be safer for users who use multiple devices or add tasks while offline.

7. **`settings_json` sync** — `profiles.settings_json` is written to the DB but never read back. Wiring `syncBootstrap` to hydrate `uiStore` from this field would sync preferences (e.g. `mobileControlAlignment`) across devices.

8. **Email confirmation flow** — after sign-up, the user sees a "Check your email to confirm" message but has no in-app feedback when they've confirmed and can now sign in. A polling or deep-link flow would improve UX.

9. **`.sav` download on ROM load** — currently the cloud save is staged on emulator init (before the user picks a ROM). If the user signs in *after* loading a ROM the cloud save won't be applied until they reload. Triggering a re-stage on `SIGNED_IN` events would fix this.
