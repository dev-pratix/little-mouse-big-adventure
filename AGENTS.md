<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- The game is vanilla Three.js in `src/game/` (engine, world, mouse, camera, collision, cheese, input, state); React only renders menus/HUD — keeps the 3D loop independent of React re-renders.
- Props and the mouse are procedural builders so each can be swapped for a GLB without touching the controllers.
