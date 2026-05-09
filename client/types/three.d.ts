declare module 'three' {
  export class WebGLRenderer { constructor(opts?: Record<string, unknown>); domElement: HTMLCanvasElement; setSize(w: number, h: number): void; setPixelRatio(r: number): void; render(scene: unknown, camera: unknown): void; dispose(): void; shadowMap: { enabled: boolean }; toneMapping: number; toneMappingExposure: number; }
  export class Scene { add(...objs: unknown[]): this; remove(...objs: unknown[]): this; background: Color | null; traverse(cb: (obj: Object3D) => void): void; }
  export class PerspectiveCamera { constructor(fov: number, aspect: number, near: number, far: number); position: Vector3; aspect: number; updateProjectionMatrix(): void; }
  export class Object3D { castShadow: boolean; receiveShadow: boolean; position: Vector3; scale: Vector3; traverse(cb: (obj: Object3D) => void): void; }
  export class Group extends Object3D { scale: Vector3; position: Vector3; }
  export class Mesh extends Object3D { geometry: BufferGeometry; material: Material | Material[]; isMesh: boolean; }
  export class Color { constructor(c: string); }
  export class Vector3 { constructor(x?: number, y?: number, z?: number); x: number; y: number; z: number; set(x: number, y: number, z: number): this; setScalar(s: number): this; sub(v: Vector3): this; multiplyScalar(s: number): this; }
  export class Vector2 { constructor(x?: number, y?: number); x: number; y: number; }
  export class BufferGeometry { attributes: Record<string, { count: number }>; index: { count: number } | null; dispose(): void; }
  export class Material { name: string; type: string; dispose(): void; wireframe: boolean; }
  export class Box3 { setFromObject(obj: Object3D): this; getCenter(v: Vector3): Vector3; getSize(v: Vector3): Vector3; }
  export class GridHelper extends Object3D { constructor(size: number, divs: number, color1?: string, color2?: string); }
  export class AmbientLight { constructor(color: string, intensity?: number); }
  export class DirectionalLight { constructor(color: string, intensity?: number); position: Vector3; castShadow: boolean; }
  export class EventDispatcher { addEventListener(t: string, cb: (...a: unknown[]) => void): void; removeEventListener(t: string, cb: (...a: unknown[]) => void): void; dispatchEvent(e: { type: string }): void; }
  export const ACESFilmicToneMapping: number;
}

declare module 'three/examples/jsm/controls/OrbitControls.js' {
  import { Camera } from 'three';
  export class OrbitControls {
    constructor(object: Camera, domElement?: HTMLElement);
    enableDamping: boolean;
    dampingFactor: number;
    autoRotate: boolean;
    autoRotateSpeed: number;
    minDistance: number;
    maxDistance: number;
    target: { set(x: number, y: number, z: number): void };
    update(): boolean;
    dispose(): void;
  }
}

declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class GLTFLoader {
    load(url: string, onLoad: (gltf: any) => void, onProgress?: (p: { loaded: number; total: number }) => void, onError?: (e: Error) => void): void;
  }
}
