// Engine: renderer, single animation loop, and glue between systems and the game store.
import * as THREE from "three";
import { CheeseField } from "./cheese";
import { FollowCamera } from "./camera";
import { Input } from "./input";
import { loadFurniture, type FurnitureResult } from "./furniture";
import { MouseController } from "./mouse";
import type { Store } from "./state";
import { buildWorld, CHEESE_SPOTS, isHome, START } from "./world";

export class Engine {
  readonly input = new Input();
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.05, 80);
  private world;
  private mouse;
  private cheese;
  private follow;
  private clock = new THREE.Clock();
  private raf = 0;
  private move = { x: 0, y: 0, run: false, jump: false };
  private unsub: () => void;
  private lastToken = -1;
  private ro: ResizeObserver;
  /** Furniture loaded async; colliders merged once resolved. */
  private furnitureResult: FurnitureResult | null = null;

  constructor(private host: HTMLElement, private store: Store) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    host.appendChild(this.renderer.domElement);

    this.world = buildWorld(this.scene);
    this.mouse = new MouseController(this.scene);
    this.cheese = new CheeseField(this.scene, CHEESE_SPOTS);
    this.follow = new FollowCamera(this.camera);
    this.reset();

    // Load Kenney furniture asynchronously — merges extra colliders once done.
    loadFurniture(this.world.group).then((result) => {
      this.furnitureResult = result;
      // Push furniture colliders into the live colliders array so physics picks them up
      this.world.colliders.push(...result.colliders);
    }).catch((e) => {
      console.warn("[engine] furniture load error", e);
    });

    this.input.onPause = () => {
      const p = store.get().phase;
      if (p === "playing") store.pause();
      else if (p === "paused") store.resume();
    };
    this.unsub = store.subscribe(() => {
      const s = store.get();
      if (s.restartToken !== this.lastToken) this.reset();
      this.world.homeMarker.visible = s.cheese >= s.total;
    });

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.loop();
  }

  private reset() {
    this.lastToken = this.store.get().restartToken;
    this.mouse.reset(START.x, START.z, START.yaw);
    this.cheese.reset();
    this.follow.snap(START.x, START.z, START.yaw);
    this.world.homeMarker.visible = false;
  }

  private resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.store.get();

    if (s.phase === "playing") {
      this.input.read(this.move);
      this.mouse.update(dt, this.move, this.follow.yaw, this.world.colliders, this.world.platforms);
      const got = this.cheese.update(dt, t, this.mouse.pos.x, this.mouse.pos.z);
      for (let i = 0; i < got; i++) this.store.collect();
      const now = this.store.get();
      if (now.cheese >= now.total && isHome(this.mouse.pos.x, this.mouse.pos.z)) this.store.complete();
    } else {
      this.cheese.update(dt, t, 999, 999);
    }
    const marker = this.world.homeMarker;
    if (marker.visible) marker.scale.setScalar(1 + Math.sin(t * 4) * 0.12);

    this.follow.update(
      dt,
      this.mouse.pos.x,
      this.mouse.pos.z,
      this.mouse.pos.y,
      this.mouse.yaw,
      this.mouse.speed > 0.2,
      this.move.y,
    );
    this.renderer.render(this.scene, this.camera);
  };

  /** Debug/test hook: current mouse position. */
  get mousePos() {
    return { ...this.mouse.pos };
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.unsub();
    this.input.dispose();
    this.cheese.dispose(this.scene);
    this.mouse.dispose(this.scene);
    this.furnitureResult?.dispose();
    this.world.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
