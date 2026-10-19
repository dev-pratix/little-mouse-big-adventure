# Credits & Third-Party Asset Attributions

*Little Mouse, Big Adventure* is built using a combination of original procedural systems, open-source web technologies, and public domain 3D game assets.

---

## 3D Models & Visual Assets

### 1. Kenney Furniture Kit (v2.0)
- **Creator**: Kenney ([www.kenney.nl](https://www.kenney.nl))
- **Source**: [https://kenney.nl/assets/furniture-kit](https://kenney.nl/assets/furniture-kit)
- **License**: [Creative Commons Zero (CC0 1.0 Universal - Public Domain Dedication)](http://creativecommons.org/publicdomain/zero/1.0/)
- **Attribution Notice**: Attribution is not legally required under CC0, but enthusiastically given in recognition of Kenney's exceptional contributions to the game development community.
- **Assets Utilized**:
  - `loungeSofaCorner.glb`, `loungeDesignChair.glb`, `tableCoffee.glb`, `televisionModern.glb`, `cabinetTelevision.glb`
  - `loungeChairRelax.glb`, `bookcaseClosedWide.glb`, `bookcaseOpenLow.glb`, `sideTableDrawers.glb`
  - `desk.glb`, `chairRounded.glb`, `computerScreen.glb`
  - `bedDouble.glb`
  - `lampRoundFloor.glb`, `lampRoundTable.glb`, `pottedPlant.glb`, `plantSmall1.glb`, `plantSmall2.glb`, `plantSmall3.glb`, `books.glb`
- **Modifications**: Meshes are loaded directly at runtime using Three.js `GLTFLoader`, with dynamic contact shadow decals and PBR materials configured in code.

### 2. Kenney Building Kit (v1.0)
- **Creator**: Kenney ([www.kenney.nl](https://www.kenney.nl))
- **Source**: [https://kenney.nl/assets/building-kit](https://kenney.nl/assets/building-kit)
- **License**: [Creative Commons Zero (CC0 1.0 Universal - Public Domain Dedication)](http://creativecommons.org/publicdomain/zero/1.0/)
- **Attribution Notice**: Unrestricted public domain dedication.
- **Assets Utilized**: Bundled in `public/assets/kenney_building-kit/` for architectural reference assets.
- **Modifications**: None; distributed in original format with bundled license file.

### 3. Mouse Character Model
- **Creator**: Original procedural model created in `src/game/mouse.ts`.
- **Source**: Built directly with Three.js primitives (`SphereGeometry`, `CylinderGeometry`, `ConeGeometry`, `TubeGeometry`, `CatmullRomCurve3`).
- **License**: Covered under the project's codebase license.
- **Status**: Verified original code. No external 3D mesh files downloaded or imported.

### 4. Textures & Decorative Materials
- **Creator**: Procedural canvas generators in `src/game/textures.ts`.
- **Source**: Generated at runtime using HTML5 2D Canvas contexts (hardwood floor grain, bump & roughness maps, living room wallpaper, matchbox cover, patchwork blanket, stamp tablecloth, thread spool, framed miniature portraits).
- **License**: Covered under the project's codebase license.
- **Status**: Verified original procedural code. Zero external raster image files imported.

---

## Audio & Sound Effects

### Procedural Web Audio Synthesizer
- **Creator**: Original code in `src/game/audio.ts`.
- **Source**: Synthesized at runtime using native browser Web Audio API oscillators (`sine` and `triangle` wave harmonics with envelope decay).
- **Features**: Progressive cheese pickup arpeggio chimes and harmonic victory fanfare.
- **License**: Covered under the project's codebase license.
- **Status**: Verified original code. Zero third-party audio files (.mp3, .wav, .ogg) are bundled or required.

---

## Typography

- **Fredoka**:
  - **Designer**: Milena Brandao
  - **Source**: [Google Fonts](https://fonts.google.com/specimen/Fredoka)
  - **License**: [SIL Open Font License, Version 1.1 (OFL-1.1)](https://openfontlicense.org/)
- **Nunito**:
  - **Designer**: Vernon Adams
  - **Source**: [Google Fonts](https://fonts.google.com/specimen/Nunito)
  - **License**: [SIL Open Font License, Version 1.1 (OFL-1.1)](https://openfontlicense.org/)

---

## Core Open-Source Libraries

- **[Three.js](https://threejs.org/)** — 3D WebGL rendering engine.  
  *License*: MIT (Copyright © 2010-2026 Three.js authors: Ricardo Cabello / Mr.doob and Three.js contributors).
- **[React](https://react.dev/)** — User interface components.  
  *License*: MIT (Copyright © Meta Platforms, Inc. and affiliates).
- **[TanStack Router & TanStack Start](https://tanstack.com/)** — Full-stack type-safe routing.  
  *License*: MIT (Copyright © Tanner Linsley).
- **[Tailwind CSS](https://tailwindcss.com/)** — Utility-first styling engine.  
  *License*: MIT (Copyright © Tailwind Labs, Inc.).
- **[Radix UI](https://www.radix-ui.com/)** — Accessible UI primitives.  
  *License*: MIT (Copyright © WorkOS).
- **[Lucide Icons](https://lucide.dev/)** — Icon set.  
  *License*: ISC (Copyright © Lucide Contributors).
- **[Vitest](https://vitest.dev/)** — Unit & integration test runner.  
  *License*: MIT (Copyright © Anthony Fu and Vitest contributors).
- **[Vite](https://vitejs.dev/)** — Frontend build tooling.  
  *License*: MIT (Copyright © Evan You and Vite contributors).
