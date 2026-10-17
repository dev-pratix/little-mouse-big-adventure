# Mouse Game — Project Guide for Antigravity

> **Project philosophy: Gameplay first. Visual polish second. Small, tested improvements over rewrites.**

## 1. Project Overview

We are building a small, playable, browser-based 3D game in which the player controls a mouse exploring a human-sized environment.

The game should make ordinary household objects feel large from the mouse's perspective. Furniture becomes part of the environment to explore, jump around, and eventually climb.

The immediate goal is not to build a complete commercial-quality game. It is to develop a fun, functional gameplay foundation that we can improve incrementally.

### Core vision

- A small mouse explores a human-sized room.
- The mouse can run, turn, jump, and navigate around obstacles.
- Furniture and room geometry create opportunities for exploration.
- The environment should feel cohesive rather than like a collection of unrelated objects.
- Future character models and gameplay systems should be replaceable or extensible without requiring a rewrite.

The game should run directly in a browser.

## 2. Technology Stack

The project was initially created using Lovable.

Known technologies:

- **React** — application and UI structure.
- **TypeScript** — typed application code.
- **Vite** — development server and production build tooling.
- **Three.js** — 3D rendering and scene management.

The exact implementation details, installed packages, physics approach, and file structure must be verified by inspecting the existing project.

### Important rules

1. Reuse the current architecture wherever possible.
2. Inspect `package.json` before adding dependencies.
3. Prefer existing systems over introducing alternatives.
4. Do not introduce a new physics engine without demonstrating why it is necessary.
5. Do not rewrite the game from scratch to implement a small feature.
6. Do not assume that a library or utility is installed without checking.

## 3. Current Project Status

The existing game is already functional at a basic level.

### Implemented or currently working

- Existing React application and Three.js scene.
- Existing mouse character or placeholder representation.
- Basic mouse movement.
- Jumping.
- Existing room environment created by Lovable.
- Existing cheese collectibles and HUD.

These features must be inspected and tested before changes are made. Do not assume that every detail of their implementation is known.

### Current environment limitation

The current room primarily uses the original environment geometry. Downloaded Kenney assets have been added to the project, but they have not yet been fully integrated into the scene.

### Current development milestone

**Upgrade the existing room using real Kenney assets while preserving the existing gameplay.**

Do not add new gameplay mechanics during this milestone.

## 4. Development Priorities

Follow this order when deciding what to work on.

### Priority 1 — Preserve existing functionality

The game already runs, and basic movement and jumping work.

Do not sacrifice working gameplay to achieve a visual improvement.

### Priority 2 — Improve the environment

Use the downloaded building and furniture assets to create a cohesive room with appropriate proportions and usable space.

### Priority 3 — Improve gameplay feel

After the environment is stable, improve movement, collision behavior, jumping, camera follow, and landing as needed.

### Priority 4 — Add new mechanics

Climbing and other mechanics will be considered only after the current movement and environment are reliable.

### Priority 5 — Visual polish

Custom mouse models, advanced animations, sound design, and additional decorations can come later.

Do not jump ahead to later priorities while the current milestone has unresolved problems.

## 5. Downloaded Assets

Two Kenney asset packs have been downloaded.

Expected project paths:

```text
public/
└── assets/
    ├── furniture-kit/
    └── building-kit/
```

The original downloads are:

- `kenney_furniture-kit`
- `kenney_building-kit`

Verify the actual extracted directory names and contents before using them. If the directories are named differently, use the paths that actually exist rather than creating duplicate copies.

### Furniture Kit

Use suitable available assets for objects such as:

- Tables
- Chairs
- Beds
- Cabinets
- Other furniture included in the pack

These are examples of possible objects, not a guarantee that every item exists in the downloaded pack.

### Building Kit

Inspect the available models for room construction elements such as:

- Floor pieces
- Walls
- Corners
- Doors and windows, if included
- Other structural pieces

Again, only use models that actually exist in the downloaded files.

### Asset integration rules

1. Inspect the pack before selecting models.
2. Identify actual file formats and dependencies.
3. Preserve the internal folder structure, textures, and supporting files.
4. Do not invent asset filenames or paths.
5. Reuse loaded resources when appropriate.
6. Avoid loading the same model repeatedly when reusable instances are suitable.
7. Keep the application lightweight enough for browser gameplay.
8. Do not download additional assets unless a concrete requirement cannot be met with the existing assets.
9. Preserve applicable licence and attribution information.

### Asset loading

The files are expected to be served from Vite's `public` directory.

For example, a file physically located at:

`public/assets/example/model.glb`

would normally be referenced by its public URL:

`/assets/example/model.glb`

These are illustrative paths only. Use the actual filename and directory structure discovered in the project.

Select the appropriate loader for the real asset format. Do not assume that every model is a GLB file.

## 6. Environment Design Principles

The room should feel like a space designed for a tiny mouse.

### Scale and proportions

- Furniture should appear large relative to the mouse.
- The mouse should remain visible and controllable.
- Objects should rest naturally on the floor.
- Walls, floors, and furniture should align correctly.
- Avoid obvious intersections between unrelated objects.
- Keep sufficient open space for movement and jumping.

### Layout

Build a coherent room instead of scattering objects randomly.

Prioritize:

1. A playable floor area.
2. Room boundaries.
3. A few appropriately placed furniture pieces.
4. Clear paths around obstacles.
5. Furniture that can eventually support interesting traversal.

Do not fill every empty space with decorations.

### Lighting and presentation

Use the existing scene and lighting as the starting point.

Improve lighting and shadows only as needed. Avoid expensive visual effects that negatively affect browser performance.

## 7. Gameplay Rules

### Movement

The existing movement implementation must be inspected before being modified.

The intended movement experience is:

- Responsive directional movement.
- Natural turning.
- Consistent speed in all directions.
- No unintended acceleration caused by frame-rate differences.
- Optional sprinting when implemented.
- Movement constrained by room boundaries and obstacles.

Do not reimplement movement simply because another approach looks cleaner.

### Jumping

Jumping currently works and must be preserved.

The intended behavior is:

- A responsive jump.
- Gravity and natural falling.
- Reliable landing.
- No unintended repeated jumping while airborne.
- Correct interaction with floors and supported platforms.
- No passing through solid geometry.

### Collision handling

Visual geometry and collision geometry must agree.

For example:

- A table should not look solid while the mouse passes through it.
- An invisible collision box should not block a large area unnecessarily.
- The mouse should not become stuck inside furniture.
- Room boundaries should prevent the mouse from escaping the playable space.

Prefer simple collision shapes where appropriate. Do not add complex physics to every decorative object without a clear need.

### Camera

Preserve the existing camera behavior unless a specific problem is identified.

The camera should keep the mouse visible, follow movement smoothly, and avoid excessive shaking or sudden snapping.

Avoid unnecessary camera rewrites during environment integration.

## 8. Explicitly Out of Scope for the Current Milestone

Do not implement these features yet:

- Food collection or additional food mechanics.
- Eating animations or health restoration.
- Inventory.
- Selling items or an economy.
- Enemies or cat-chase mechanics.
- Climbing.
- Complex character animation systems.
- A custom final mouse model.
- Multiplayer.
- New menus or a large UI redesign.
- Unrelated gameplay features.

Some of these may be added later. Their exclusion is intentional, not an indication that they are unwanted permanently.

**The current task is environment integration, not feature expansion.**

## 9. Character Replacement Strategy

The current mouse representation may be a placeholder.

Do not make the entire game dependent on one specific character model.

Where practical, keep character rendering separate from gameplay logic so that a better model can be integrated later.

Movement, jumping, collision handling, and camera behavior should not depend unnecessarily on the visual mesh.

Do not build an elaborate character abstraction layer solely for this purpose. Keep the implementation proportional to the project.

The eventual replacement model should be able to support the existing movement system without requiring a complete gameplay rewrite.

## 10. How Antigravity Should Work

Follow an inspect → plan → implement → verify workflow.

### Before changing code

1. Inspect the relevant source files.
2. Understand the existing implementation.
3. Identify the smallest set of changes required.
4. Identify potential regressions.
5. Explain any significant architectural changes before making them.

### While implementing

- Make focused changes.
- Reuse existing utilities and components.
- Avoid unrelated refactoring.
- Avoid duplicating functionality.
- Preserve existing interfaces unless changes are necessary.
- Keep TypeScript types accurate.
- Do not suppress errors merely to make the build pass.
- Do not install dependencies without justification.

### After implementing

1. Run the existing development workflow.
2. Run the available build and type checks.
3. Inspect browser console errors where possible.
4. Test movement and jumping.
5. Verify collision behavior.
6. Verify the environment assets load correctly.
7. Check that existing collectibles and HUD still work.
8. Report any tests that could not be performed.

Never claim that a feature has been verified unless it has actually been tested.

## 11. Regression Checklist

After an environment change, verify the following.

- [ ] The application starts successfully.
- [ ] The room loads without missing models or textures.
- [ ] Furniture and building assets are visibly integrated.
- [ ] The mouse remains controllable.
- [ ] Jumping still works.
- [ ] The mouse lands correctly.
- [ ] Furniture collisions behave correctly.
- [ ] Room boundaries remain functional.
- [ ] The camera remains usable.
- [ ] Existing cheese collectibles still work.
- [ ] The existing HUD still works.
- [ ] No new TypeScript or build errors are introduced.
- [ ] Asset URLs are compatible with the Vite production build.

If a check fails, investigate and fix the regression before adding unrelated features.

## 12. Project Scope and Performance

This is an incremental browser-game project.

Prefer:

- Reusable assets.
- Simple collision geometry.
- Efficient resource loading.
- Reasonable polygon counts.
- Limited unnecessary dependencies.
- Clear TypeScript code.
- Small, reversible changes.

Do not optimize prematurely, but avoid obviously wasteful implementations.

Do not replace working code just to make the architecture more sophisticated.

## 13. Future Roadmap

This roadmap is directional, not permission to implement everything at once.

### Phase 1 — Environment integration

- Integrate Kenney furniture assets.
- Improve the room using available building assets.
- Preserve movement and jumping.
- Verify collisions and existing functionality.

### Phase 2 — Movement polish

- Refine acceleration, turning, sprinting, and jump feel.
- Improve landing and platform interactions.
- Fix any collision or camera issues.

### Phase 3 — Basic traversal

- Introduce suitable low platforms.
- Implement a simple, reliable way to reach elevated surfaces.
- Consider climbing only after basic traversal works well.

### Phase 4 — Character upgrade

- Replace the placeholder with a suitable mouse model.
- Integrate animations incrementally.
- Preserve gameplay behavior during the replacement.

### Phase 5 — Gameplay systems

- Reintroduce food collection.
- Add eating and health mechanics.
- Add inventory or other progression only when appropriate.

### Phase 6 — Polish and release

- Improve sound and visual feedback.
- Test browser performance.
- Verify production builds.
- Prepare the game for deployment.

Do not implement future roadmap phases automatically.

## 14. Working Agreement

The following principles take precedence over convenience:

1. **Working gameplay is more important than a large amount of new code.**
2. **Use the assets already downloaded before searching for more.**
3. **Preserve existing behavior unless a specific defect requires a change.**
4. **Do not expand the scope without a clear reason.**
5. **Inspect before modifying.**
6. **Test before declaring success.**
7. **Explain important trade-offs in plain language.**
8. **Ask before performing destructive or broad architectural changes.**
9. **Keep temporary solutions replaceable where practical.**
10. **Build the game in small, verifiable milestones.**

## 15. Immediate Instruction

For the current task:

Inspect the existing project and both Kenney asset directories. Identify suitable assets, integrate them into the existing room, and make the environment feel more complete and appropriately scaled for a small mouse.

Preserve the existing movement, jumping, camera, collision behavior, collectibles, and HUD.

Do not implement climbing or unrelated features.

Make the smallest reliable set of changes, run the available checks, and report exactly what changed and what remains unverified.

**Definition of success:** The existing game still works, but its room now uses the downloaded assets and provides a better environment for running and jumping.

---

*This document describes the intended project direction and currently known status. Always verify the actual codebase before assuming that a particular file, component, dependency, or feature exists.*