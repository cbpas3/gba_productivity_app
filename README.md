<div align="center">
  <h1>🎮 GBA Productivity Quest</h1>
  <p><strong>Turn your real-world tasks into in-game Pokemon rewards.</strong></p>
  
  [![Live Demo](https://img.shields.io/badge/Play_Now-Live_Demo-00E5FF?style=for-the-badge)](https://gbaproductivityapp.vercel.app/)
</div>

---

## 📖 About The Project

Building a truly engaging game from scratch for a productivity app is incredibly difficult. **GBA Productivity Quest** bypasses this problem entirely by letting you play beloved, existing Game Boy Advance titles and directly injecting rewards into your real save file when you complete your real-life tasks.

By running an embedded mGBA WASM emulator directly in your browser, the app tracks your productivity and alters your `.sav` file on the fly—giving your Pokémon free EXP as a reward for staying focused!

## ✨ Features

- **In-Browser Emulation**: Play your game directly in the web app via WebAssembly.
- **Save File Injection**: The app intercepts and modifies your actual Game Boy Advance save file data.
- **Dynamic Rewards**: Completing tasks grants scaling rewards (e.g., 10% to 100% EXP to next level).
- **Mobile Responsive**: Custom on-screen D-pad and action buttons optimized for iOS & Android.

## 🎮 Supported Games

Because the app performs precise binary modifications to the save data, it only supports specific Gen III engine games. _You must provide your own legally obtained `.gba` ROM file_

- ✅ **Pokémon FireRed**
- ✅ **Pokémon LeafGreen**
- ✅ **Pokémon Emerald**
- ✅ **Pokémon Ruby**
- ✅ **Pokémon Sapphire**

_(Note: Gen I/II and Gen IV+ formats are not supported)._

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **State Management**: Zustand
- **Emulation**: `mGBA` (via Emscripten/WASM)
- **Styling**: Custom CSS (Pixel Art Aesthetic)
- **Deployment**: Vercel

## 🚀 Running Locally

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev
   ```
   _(Note: The emulator requires `SharedArrayBuffer` for WebAssembly threads. The Vite dev server is already configured to emit the necessary Cross-Origin Isolation headers)._
