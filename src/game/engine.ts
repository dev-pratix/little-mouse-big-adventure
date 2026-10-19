import * as THREE from "three";
import { soundFX } from "./audio";
import { CheeseField } from "./cheese";
import { checkHiding } from "./collision";
import { FollowCamera } from "./camera";
import { Input } from "./input";
import { loadFurniture, type FurnitureResult } from "./furniture";
import { MouseController, MOUSE } from "./mouse";
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
  private unsub: () => void = () => void 0;
  private lastToken = -1;
  private ro: ResizeObserver;
  // Pointer‑lock state for third‑person mouse‑look camera
  private pointerLocked = false;
  /** Furniture loaded async; colliders merged once resolved. */
  private furnitureResult: FurnitureResult | null = null;

  // Cursor tracking for mouse head look
  private raycaster = new THREE.Raycaster();
  private cursorNDC = new THREE.Vector2();
  private hasCursor = false;
  private headPlane = new THREE.Plane();
  private targetLookPos = new THREE.Vector3();
  private readonly upVector = new THREE.Vector3(0, 1, 0);

  // Event listener references for clean disposal
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerLeave: () => void;
  private onCanvasClick: () => void;
  private onPointerLockChange: () => void;
  private onMouseMove: (e: MouseEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onOrientationChange: () => void;

  constructor(private host: HTMLElement, private store: Store) {
    const isTouch = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // Cap pixel ratio to 1.75 on touch/mobile devices to avoid GPU fill-rate throttling on high-DPI screens
    const maxDPR = isTouch ? 1.75 : 2.0;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDPR));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.style.touchAction = "none";
    host.appendChild(this.renderer.domElement);

    // ----- Pointer‑lock / mouse‑look handling -----
    // Click the canvas to request pointer lock on desktop only (not on mobile touch devices)
    this.onCanvasClick = () => {
      if (!isTouch) {
        this.renderer.domElement.requestPointerLock();
      }
    };
    this.renderer.domElement.addEventListener("click", this.onCanvasClick);

    // Pointer‑lock change events
    this.onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
      if (this.pointerLocked) {
        this.hasCursor = false;
        this.mouse.clearLookTarget();
      }
    };
    document.addEventListener("pointerlockchange", this.onPointerLockChange);

    document.addEventListener("pointerlockerror", () => {
      console.warn("[engine] pointer lock error");
    });

    // Mouse movement while locked controls camera orientation
    this.onMouseMove = (e: MouseEvent) => {
      if (!this.pointerLocked) return;
      // Sensitivity factors – tweak as needed
      this.follow.addYaw(-e.movementX * 0.003);
      this.follow.addPitch(-e.movementY * 0.003);
    };
    document.addEventListener("mousemove", this.onMouseMove);

    // Wheel to zoom (works both locked or not)
    this.onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.follow.addDistance(e.deltaY * 0.01);
    };
    this.renderer.domElement.addEventListener("wheel", this.onWheel);

    // Reset camera with "R" key
    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyR") {
        this.resetCamera();
      }
    };
    window.addEventListener("keydown", this.onKeyDown);

    // Cursor tracking for mouse head look (when not pointer locked)
    this.onPointerMove = (e: PointerEvent) => {
      if (this.pointerLocked) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        this.hasCursor = false;
        this.mouse.clearLookTarget();
        return;
      }
      this.cursorNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.cursorNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.hasCursor = true;
    };
    window.addEventListener("pointermove", this.onPointerMove);

    this.onPointerLeave = () => {
      this.hasCursor = false;
      this.mouse.clearLookTarget();
    };
    this.renderer.domElement.addEventListener("pointerleave", this.onPointerLeave);

    this.world = buildWorld(this.scene);
    this.mouse = new MouseController(this.scene);
    this.cheese = new CheeseField(this.scene, CHEESE_SPOTS);
    this.follow = new FollowCamera(this.camera);
    this.reset();

    // Load Kenney furniture asynchronously — merges extra colliders once done.
    loadFurniture(this.world.group)
      .then((result) => {
        this.furnitureResult = result;
        // Push furniture colliders and walkable platforms into the live arrays
        this.world.colliders.push(...result.colliders);
        this.world.platforms.push(...result.platforms);
        console.log("[engine] colliders count after furniture load:", this.world.colliders.length);
        console.log("[engine] platforms count after furniture load:", this.world.platforms.length);
      })
      .catch((e) => {
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

    this.onOrientationChange = () => {
      setTimeout(() => this.resize(), 60);
      setTimeout(() => this.resize(), 250);
    };
    window.addEventListener("orientationchange", this.onOrientationChange);
    window.addEventListener("resize", this.onOrientationChange);

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
    const w = this.host.clientWidth || 1,
      h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    const aspect = w / h;
    this.camera.aspect = aspect;

    // Mobile portrait view: preserve horizontal field of view so it feels like widescreen horizontal view
    // instead of cropped and cramped vertically.
    const baseVFOV = 60;
    const targetLandscapeAspect = 1.6;
    if (aspect < 1.0) {
      const targetHFOV = 2 * Math.atan(Math.tan((baseVFOV * Math.PI) / 360) * targetLandscapeAspect);
      const portraitVFOV = (2 * Math.atan(Math.tan(targetHFOV / 2) / aspect) * 180) / Math.PI;
      this.camera.fov = Math.min(portraitVFOV, 85);
    } else {
      this.camera.fov = baseVFOV;
    }
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    const s = this.store.get();

    if (s.phase === "playing") {
      this.input.read(this.move);

      // Raycast cursor onto plane passing through mouse head for subtle look tracking
      if (this.hasCursor && !this.pointerLocked) {
        const headY = this.mouse.pos.y + 0.14 * MOUSE.scale;
        this.headPlane.set(this.upVector, -headY);
        this.raycaster.setFromCamera(this.cursorNDC, this.camera);
        if (
          Math.abs(this.raycaster.ray.direction.y) > 0.02 &&
          this.raycaster.ray.intersectPlane(this.headPlane, this.targetLookPos)
        ) {
          this.mouse.setLookTarget(this.targetLookPos.x, this.targetLookPos.y, this.targetLookPos.z);
        } else {
          // If camera ray is near-horizontal, project ahead along ray
          this.targetLookPos
            .copy(this.camera.position)
            .addScaledVector(this.raycaster.ray.direction, this.follow.distance * 1.5);
          this.mouse.setLookTarget(this.targetLookPos.x, this.targetLookPos.y, this.targetLookPos.z);
        }
      } else {
        this.mouse.clearLookTarget();
      }

      this.mouse.update(dt, this.move, this.follow.yaw, this.world.colliders, this.world.platforms);

      // Evaluate hiding shelter under furniture / in burrow
      const hidingInfo = checkHiding(this.mouse.pos);
      this.store.setHiding(hidingInfo.isHiding, hidingInfo.zoneName);

      const got = this.cheese.update(dt, t, this.mouse.pos.x, this.mouse.pos.z);
      for (let i = 0; i < got; i++) {
        this.store.collect();
        soundFX.playCheesePickup(this.store.get().cheese);
      }
      const now = this.store.get();
      if (now.cheese >= now.total && isHome(this.mouse.pos.x, this.mouse.pos.z)) {
        this.store.complete();
        soundFX.playVictoryFanfare();
      }
    } else {
      this.mouse.clearLookTarget();
      this.cheese.update(dt, t, 999, 999);
    }
    const marker = this.world.homeMarker;
    if (marker.visible) marker.scale.setScalar(1 + Math.sin(t * 4) * 0.12);

    const isHiding = this.store.get().isHiding;
    this.follow.update(
      dt,
      this.mouse.pos.x,
      this.mouse.pos.z,
      this.mouse.pos.y,
      this.mouse.yaw,
      this.mouse.speed > 0.2,
      this.move.y,
      isHiding,
    );
    this.renderer.render(this.scene, this.camera);
  };

  /** Debug/test hook: current mouse position. */
  get mousePos() {
    return { ...this.mouse.pos };
  }

  /** Restores camera to default third-person view behind mouse. */
  resetCamera() {
    this.follow.reset(this.mouse.pos.x, this.mouse.pos.z, this.mouse.yaw);
  }

  /** Add camera orbit angle (for touch camera dragging or mouse drag) */
  addCameraLook(deltaYaw: number, deltaPitch: number) {
    this.follow.addYaw(deltaYaw);
    this.follow.addPitch(deltaPitch);
  }

  /** Add camera distance (zoom) */
  addCameraZoom(delta: number) {
    this.follow.addDistance(delta);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.unsub();
    window.removeEventListener("orientationchange", this.onOrientationChange);
    window.removeEventListener("resize", this.onOrientationChange);
    window.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerleave", this.onPointerLeave);
    this.renderer.domElement.removeEventListener("click", this.onCanvasClick);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    document.removeEventListener("mousemove", this.onMouseMove);
    this.renderer.domElement.removeEventListener("wheel", this.onWheel);
    window.removeEventListener("keydown", this.onKeyDown);
    this.input.dispose();
    this.cheese.dispose(this.scene);
    this.mouse.dispose(this.scene);
    this.furnitureResult?.dispose();
    this.world.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
