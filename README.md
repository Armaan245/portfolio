# 🏯 Araman Mujawar — Interactive Japanese Pixel Studio Portfolio

An interactive, gamified 2D pixel art developer & digital artist portfolio rendered on an HTML5 Canvas. Explore an authentic Japanese-inspired studio apartment, interact with workstations, listen to lofi beats, inspect design projects, and pet the studio cat.



---

## ✨ Features

- **🎮 2D Gamified Room Navigation**: Walk around with arrow keys / WASD, click/tap anywhere on the floor with intelligent A* pathfinding, or use keyboard shortcuts.
- **🏯 Authentic Japanese Architecture**:
  - Handcrafted Post-and-Beam structure with Hinoki cedar beams and warm Tatami matting.
  - Sliding Japanese lattice door (*Koshi-do / Shoji-do*).
  - Sunlit *Yukimi Shoji-mado* (snow-viewing windows) overlooking a golden morning Mount Fuji, cherry blossoms (*Sakura*), and stone garden lantern.
  - Center lounge featuring a low table, warm Tatami rug, and studio cat **Bug** 🐱.
- **💻 Interactive Workstations**:
  - **DataDukan**: Decentralized Data Marketplace & Analytics Suite with live cyber database monitors.
  - **VaultDoc**: Zero-Knowledge Encrypted Document Vault with high-security terminal graphics.
- **📻 Lofi Music Player & Synthesizer**: Built-in procedural Web Audio synthesizer playing relaxing studio lofi tunes and interactive 8-bit sound effects.
- **📊 Live GitHub Activity Board**: Real-time GitHub contribution graph, active streaks, and repository tracker.
- **🌓 Dynamic Day & Night Mode**: Syncs automatically with the visitor's local clock or toggled manually, with realistic ambient lighting, lantern glows, and starry skies.
- **📱 Fully Responsive**: Seamless experience across mobile, tablet, and ultra-wide desktop monitors.

---

## 🛠️ Tech Stack

- **Core Engine**: Vanilla HTML5 Canvas (`<canvas>`) & Modern JavaScript (ESNext)
- **Audio**: Web Audio API (real-time procedural sound synthesis, zero external audio assets)
- **Pathfinding**: Grid-based A* pathfinding with coarse raycast string-pulling
- **Styling**: Pixel-perfect CSS & Google Fonts (`Pixelify Sans`, `Silkscreen`)
- **Tooling & Bundler**: [Vite](https://vitejs.dev/)

---

## 🕹️ Controls

| Action | Controls |
| :--- | :--- |
| **Move** | `Arrow Keys` or `W`, `A`, `S`, `D` |
| **Interact / Open** | `E`, `Space`, `Enter` or click/tap directly on items |
| **Point & Click** | Click anywhere on the floor to navigate automatically |
| **Toggle Day / Night** | `N` or click the Moon/Sun button |
| **Toggle Music** | `M` or click the Music button |
| **Mute SFX** | Click the Sound button in the top navigation |
| **Menu Drawer** | `Escape` or click the Menu button |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18+ recommended)
- `npm` or `pnpm` / `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Armaan245/portfolio.git
   cd portfolio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## 📂 Project Structure

```text
portfolio/
├── assets/
│   ├── media/          # Project artwork, videos, and portfolio showcase images
│   ├── sprites.png     # Studio sprite sheet atlas
│   └── sprites.js      # Atlas coordinates and sprite bounding boxes
├── css/
│   └── style.css       # Retro pixel UI styles, HUD, modals, and typography
├── js/
│   ├── content.js      # Portfolio projects, case studies, bio, and social links
│   ├── world.js        # Studio room coordinates, collision bounds, and hotspots
│   └── game.js         # Canvas rendering engine, input handlers, audio, and FX
├── index.html          # Main HTML entry point
├── package.json        # Dependencies and scripts
└── vite.config.js      # Vite build configuration
```

---

## 📬 Contact & Connect

- **Portfolio**: [armaan245.github.io](https://armaan245.github.io)
- **Twitter / X**: [@Araman245](https://x.com/Araman245)
- **Discord**: `armaan245`
- **GitHub**: [@Armaan245](https://github.com/Armaan245)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
