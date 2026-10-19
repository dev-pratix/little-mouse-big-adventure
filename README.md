# Little Mouse, Big Adventure

> **Status: Early Development Build / Work in Progress**  
> *Little Mouse, Big Adventure* is an independent, non-commercial game project in active development. Features, controls, and visual details are being continuously refined.

A cozy, third-person 3D mouse exploration game set inside a human-sized house from a miniature perspective. Explore rooms, sneak beneath towering furniture, collect scattered cheese wedges, and return safely to your home burrow.

---

## 1. Project Introduction

*Little Mouse, Big Adventure* is a browser-based 3D exploration and stealth-lite platformer built directly with WebGL (Three.js) and React.

The game is designed around scale: ordinary household items—sofas, tables, coffee mugs, floor lamps, and bookshelves—become colossal landmarks for a mouse measuring just a few centimeters tall. The player slips through mouse holes, scampers across carpets, and ducks under furniture aprons to hide from open view.

---

## 2. Current Gameplay Features

- **Playable Mouse Character**:
  - Full movement with walk, sprint, turning, jumping, and step-up ledge navigation.
  - Quadruped diagonal trot animation with speed-responsive cadence (up to 10 strides/sec).
  - Ground-clamped foot placement with lift during swing phase to prevent sliding.
  - Interactive cursor head tracking on desktop (neck pitch and yaw).
- **Four Furnished House Rooms + Mouse Burrow**:
  - **Living Room**: Corner sofa, coffee table, TV console, armchair, and custom woven rug.
  - **Library**: Reading chair, low and tall bookcases, side table with teacup and succulent, reading lamp.
  - **Study / Workstation**: Wooden desk, office chair, workstation monitor, and cozy study corner.
  - **Bedroom**: Double bed with mattress clearance, bedside drawers, reading lamp, and wall art.
  - **Mouse Burrow**: Secret sanctuary behind the living room wall with matchbox bed, stamp tablecloth, thread spool stool, and miniature wall portraits.
- **Hiding & Stealth Mechanic**:
  - 5 designated hiding zones: Under Sofa, Under Coffee Table, Under Bed, Under Desk, and Mouse Burrow.
  - Dynamic HUD stealth badge (`🐾 Hidden · Under Furniture`).
  - Adaptive camera: lowers pitch and zooms in closer when sheltering under low-clearance furniture.
- **Mission Flow ("A Mouse's First Heist")**:
  - 3 cheese wedges placed across rooms with golden beacon markers and pulsing point lights.
  - Web Audio pickup chimes with rising musical pitches.
  - Objective tracker updating to prompt return to the burrow upon collecting all cheese.
  - Safe burrow return triggers victory fanfare and celebration modal with heist stats.
- **Responsive & Mobile-Ready**:
  - Virtual analog movement joystick on mobile with deadzone filtering.
  - Right-side touch drag surface for 360° third-person camera orbiting.
  - Thumb-accessible Jump and Hold-to-Sprint controls.
  - Automatic portrait orientation blocker with phone rotation animation.

---

## 3. Controls

### Desktop Controls

| Action | Control |
|---|---|
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or Arrow Keys |
| **Scurry / Sprint** | Hold <kbd>Shift</kbd> |
| **Jump** | <kbd>Space</kbd> |
| **Orbit Camera** | Click canvas to lock pointer & move mouse (or drag) |
| **Camera Zoom** | Mouse Wheel |
| **Reset Camera** | <kbd>R</kbd> |
| **Pause / Resume** | <kbd>Esc</kbd> or <kbd>P</kbd> |

### Mobile Touch Controls

| Action | Control |
|---|---|
| **Move** | Left virtual analog joystick (supports all 360° directions) |
| **Orbit Camera** | Touch drag on the right half of the screen |
| **Jump** | Tap the <kbd>🐾 Jump</kbd> thumb button |
| **Sprint** | Hold the <kbd>⚡ Sprint</kbd> thumb button |
| **Pause** | Tap the <kbd>II</kbd> pause button at the top right |

*Note: The game is designed for landscape mode. If launched vertically on a mobile phone, a prompt will ask you to rotate your device.*

---

## 4. Screenshots

> *Screenshots from current in-engine development builds:*

```
[ Title Screen / Early Access Welcome ]
  └── Planned screenshot: Welcome modal with cheese accents and game start options

[ Living Room & Burrow Entrance ]
  └── Planned screenshot: Mouse standing at the wooden baseboard hole looking into the living room

[ Hiding Under the Bed ]
  └── Planned screenshot: Adaptive low-pitch camera peeking beneath the double bed

[ Mobile Landscape HUD & Touch Controls ]
  └── Planned screenshot: Virtual joystick and thumb action buttons during active play
```

*(Screenshots will be captured and added to `docs/screenshots/` prior to public release).*

---

## 5. Technology Stack

Verified directly from the project's codebase:

- **3D Graphics & Scene**: [Three.js](https://threejs.org/) (`v0.186.1`) with WebGL, ACES Filmic tone mapping, PCF soft shadow maps, and GLTFLoader.
- **Application Framework**: [React 19](https://react.dev/) (`v19.2.0`) + [TanStack Start](https://tanstack.com/) (`v1.168.60`) & [TanStack Router](https://tanstack.com/router) (`v1.170.41`).
- **Server / Build Tooling**: [Vite](https://vitejs.dev/) (`v8.1.5`) with [Nitro](https://nitro.unjs.io/) full-stack bundling and [Tailwind CSS v4](https://tailwindcss.com/).
- **Audio**: Procedural Web Audio API synthesizer (zero external audio files).
- **Testing**: [Vitest](https://vitest.dev/) (`v4.1.10`) with [Testing Library](https://testing-library.com/) and JSDOM.
- **Language**: [TypeScript](https://www.typescriptlang.org/) (`v5.8.3`).

---

## 6. Prerequisites & Local Setup

### Prerequisites

- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **npm**: `v10.x` or higher (or `bun` / `pnpm`)

### Installation & Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/<your-username>/mousechief.git
   cd mousechief
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open your browser to the URL displayed in the console (typically `http://localhost:3000` or `http://localhost:5173`).

---

## 7. Build & Test Commands

Commands configured in [`package.json`](file:///C:/Users/nehab/Desktop/codecrafters/three-js/mousechief/package.json):

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite development server with hot module reloading |
| `npm run build` | Compiles client and SSR bundles into `.output/` |
| `npm run preview` | Previews the production build locally via Vite |
| `npm test` | Runs the full Vitest automated test suite once (`vitest run`) |
| `npm run test:watch` | Starts the Vitest interactive watch runner |
| `npm run lint` | Runs ESLint across all TypeScript and React files |
| `npm run format` | Formats all code with Prettier |

---

## 8. Project Structure & Architecture

```
mousechief/
├── public/
│   ├── assets/
│   │   ├── kenney_furniture-kit/   # CC0 3D furniture models (GLTF/GLB)
│   │   └── kenney_building-kit/    # CC0 architectural reference kit
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── game/
│   │   │   ├── GameViewport.tsx    # Mounts Three.js canvas & binds engine lifecycle
│   │   │   ├── Joystick.tsx        # Virtual analog joystick & mobile touch buttons
│   │   │   └── Overlays.tsx        # Welcome screen, HUD, pause, victory, & orientation blocker
│   │   └── ui/                     # Radix UI building blocks
│   ├── game/
│   │   ├── audio.ts                # Web Audio API synthesized sound effects
│   │   ├── camera.ts               # Third-person orbit follow camera with hiding adaptation
│   │   ├── cheese.ts               # Collectibles with beacon markers & pickup animation
│   │   ├── collision.ts            # Axis-aligned bounding box collision, platforms & hiding zones
│   │   ├── engine.ts               # Main animation loop, resize observer & pointer-lock
│   │   ├── furniture.ts            # Asynchronous Kenney asset loader & collider placement
│   │   ├── input.ts                # Unified keyboard and touch input consumer
│   │   ├── mouse.ts                # Procedural character mesh, diagonal gait, & head tracking
│   │   ├── state.ts                # Observable reactive game state store
│   │   ├── textures.ts             # Procedural 2D canvas textures (wood grain, wallpaper, art)
│   │   └── world.ts                # Room dimensions, walls, partitions, and lighting
│   ├── routes/
│   │   ├── __root.tsx              # HTML shell, fonts, and viewport-fit configuration
│   │   └── index.tsx               # Primary game route connecting engine and UI
│   └── test/
│       ├── app-routing.test.tsx    # TanStack router page resolution test
│       ├── mouse-grounding.test.ts # Platform and rug step-up tests
│       ├── phase7-rooms.test.ts    # Room geometry & lighting baseline tests
│       ├── phase8-gameplay.test.ts # Gait cycle, hiding detection, and collision clearance tests
│       └── phase9-mobile.test.tsx  # Touch controls, orientation prompt, and HUD tests
├── CREDITS.md                      # Complete third-party asset licenses and attributions
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── vite.config.ts                  # Vite + TanStack Start configuration
```

### Architectural Principles

1. **Decoupled 3D Loop & React UI**: The Three.js animation loop operates independently in `src/game/engine.ts`. React is solely responsible for menus, dialogs, and HUD overlays via an observable store (`src/game/state.ts`), avoiding performance degradation from React re-renders.
2. **Procedural First**: Character mesh, textures, and sound are generated procedurally, eliminating large external audio or texture download dependencies.
3. **PBR Lighting & Grounding**: Furniture pieces use baked contact shadow planes to ensure objects feel grounded rather than floating.

---

## 9. Current Limitations & Known Issues

- **Hardware Acceleration**: Requires a WebGL 2.0-compatible browser. Older mobile chipsets may experience reduced framerates.
- **Physical Device Touch Testing**: Automated touch simulation verifies math and event handling, but ergonomic touch tuning on varied Android screen sizes is ongoing.
- **Orientation Lock Permissions**: Some mobile browsers restrict automatic programmatic orientation locking without full-screen user engagement; the visual rotation blocker serves as the primary fallback.
- **Shadow Cost**: Dynamic directional shadows with PCF soft filtering are optimized for desktop and modern phones, but may require lower shadow map resolutions on low-power devices.

---

## 10. Asset Credits & Licensing

- **3D Furniture & Building Assets**: Created by [Kenney](https://kenney.nl) and released under the **Creative Commons Zero (CC0 1.0 Universal)** public domain dedication.
- **Fonts**: *Fredoka* and *Nunito* are licensed under the **SIL Open Font License (OFL-1.1)** via Google Fonts.
- **Original Code & Assets**: Procedural mouse mesh, procedural textures, Web Audio synthesizer, and gameplay code are project originals.

For full, verified asset attributions, see [CREDITS.md](CREDITS.md).

*(Note: If you are forking or redistributing this project, please refer to the project code license discussion before choosing a license for your own distribution).*

---

## 11. Development Roadmap

- [x] Mouse movement, jumping, and sprinting physics.
- [x] Dynamic quadruped walk cycle with foot grounding.
- [x] Interactive cursor head tracking.
- [x] 4 furnished rooms (Living Room, Library, Study, Bedroom) + Mouse Burrow.
- [x] Hiding system under furniture with adaptive camera framing.
- [x] Cheese heist mission flow, beacons, and victory state.
- [x] Procedural Web Audio chimes and fanfare.
- [x] Mobile touch controls (joystick, camera look drag, jump, hold-to-sprint).
- [x] Landscape orientation enforcement on mobile devices.
- [ ] Climbing and vertical traversal mechanics (bookshelf hops, curtain climbs).
- [ ] Human presence hazard (feet/footsteps to sneak past).
- [ ] Sound settings / volume sliders in pause menu.
- [ ] Additional missions and collectible variety.

---

## 12. Disclaimer

*Little Mouse, Big Adventure* is an independent, educational, and creative personal project. It is not an officially released commercial product, and is not affiliated with or endorsed by any commercial game publisher.
