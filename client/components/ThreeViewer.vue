<template>
  <div class="three-viewer-container" ref="containerRef">
    <canvas ref="canvasRef" class="viewer-canvas" />
    <div class="viewer-controls">
      <button v-for="ctrl in controls" :key="ctrl.key" class="ctrl-btn" :class="{ active: ctrl.active }" :title="ctrl.label" :aria-label="ctrl.label" @click="ctrl.action">
        <span class="ctrl-icon">{{ ctrl.icon }}</span>
        <span class="ctrl-label">{{ ctrl.label }}</span>
      </button>
    </div>
    <div v-if="loading" class="viewer-overlay">
      <div class="spinner" />
      <p>{{ $t('three_viewer.loading') }}</p>
    </div>
    <div v-if="error" class="viewer-overlay error">
      <p>{{ error }}</p>
      <button @click="retry" :aria-label="$t('three_viewer.retry')">{{ $t('three_viewer.retry') }}</button>
    </div>
    <div class="viewer-info" v-if="modelInfo">
      <span>{{ $t('three_viewer.vertices') }}: {{ modelInfo.vertices }}</span>
      <span>{{ $t('three_viewer.faces') }}: {{ modelInfo.faces }}</span>
      <span>{{ $t('three_viewer.materials') }}: {{ modelInfo.materials }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">

let _THREE: any = null;
let _OrbitControls: any = null;
let _GLTFLoader: any = null;

const props = defineProps<{
  modelUrl?: string;
  autoRotate?: boolean;
  bgColor?: string;
  wireframe?: boolean;
}>();

const emit = defineEmits<{
  (e: 'loaded', info: { vertices: number; faces: number; materials: number }): void;
  (e: 'error', msg: string): void;
}>();

const containerRef = ref<HTMLDivElement>();
const canvasRef = ref<HTMLCanvasElement>();
const loading = ref(false);
const error = ref('');

let renderer: any = null;
let scene: any = null;
let camera: any = null;
let orbitControls: any = null;
let model: any = null;
let animationId = 0;
let autoRotateActive = props.autoRotate !== false;

const modelInfo = ref<{ vertices: number; faces: number; materials: number } | null>(null);

	const { t } = useI18n()

	const controls = computed(() => [
	  { key: 'rotate', icon: '🔄', label: t('three_viewer.auto_rotate'), active: autoRotateActive, action: toggleRotate },
	  { key: 'wireframe', icon: '🔲', label: t('three_viewer.wireframe'), active: false, action: toggleWireframe },
	  { key: 'reset', icon: '🏠', label: t('three_viewer.reset'), active: false, action: resetView },
	  { key: 'top', icon: '⬆', label: t('three_viewer.top'), active: false, action: () => setView('top') },
	  { key: 'front', icon: '👁', label: t('three_viewer.front'), active: false, action: () => setView('front') },
	]);

function initScene() {
  if (!containerRef.value || !canvasRef.value) return;

  const width = containerRef.value.clientWidth;
  const height = containerRef.value.clientHeight;

  renderer = new _THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = _THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  scene = new _THREE.Scene();
  scene.background = new _THREE.Color(props.bgColor || '#1a1a2e');

  camera = new _THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(3, 2, 5);

  orbitControls = new _OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.08;
  orbitControls.autoRotate = autoRotateActive;
  orbitControls.autoRotateSpeed = 1.5;
  orbitControls.minDistance = 1;
  orbitControls.maxDistance = 20;
  orbitControls.target.set(0, 0.5, 0);

  // Lighting
  const ambientLight = new _THREE.AmbientLight('#ffffff', 1.5);
  scene.add(ambientLight);

  const keyLight = new _THREE.DirectionalLight('#ffffff', 3);
  keyLight.position.set(5, 5, 5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const fillLight = new _THREE.DirectionalLight('#8888ff', 1);
  fillLight.position.set(-3, 2, -2);
  scene.add(fillLight);

  const rimLight = new _THREE.DirectionalLight('#ff8866', 1.5);
  rimLight.position.set(0, -1, 3);
  scene.add(rimLight);

  // Grid helper
  const grid = new _THREE.GridHelper(4, 20, '#333355', '#222244');
  scene.add(grid);

  animate();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  orbitControls?.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

function loadModel(url: string) {
  if (!scene) return;
  loading.value = true;
  error.value = '';

  // Remove existing model
  if (model) {
    scene.remove(model);
    model.traverse((child: _THREE.Object3D) => {
      if ((child as _THREE.Mesh).geometry) (child as _THREE.Mesh).geometry.dispose();
      if ((child as _THREE.Mesh).material) {
        const mat = (child as _THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    });
    model = null;
  }

  const loader = new _GLTFLoader();
  const modelUrl = url.startsWith('http') ? url : `/api/${url.replace(/^\//, '')}`;

  loader.load(
    modelUrl,
    (gltf) => {
      model = gltf.scene;
      if (!model) return;
      // Center and scale
      const box = new _THREE.Box3().setFromObject(model);
      const center = box.getCenter(new _THREE.Vector3());
      const size = box.getSize(new _THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = maxDim > 0 ? 2 / maxDim : 1;
      model.scale.setScalar(scale);
      model.position.sub(center.multiplyScalar(scale));

      model.traverse((child: _THREE.Object3D) => {
        if ((child as _THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      if (scene) scene.add(model);

      // Count vertices, faces, materials
      let vertices = 0, faces = 0;
      const materials = new Set<string>();
      model.traverse((child: _THREE.Object3D) => {
        if ((child as _THREE.Mesh).isMesh) {
          const geom = (child as _THREE.Mesh).geometry;
          if (geom) {
            vertices += geom.attributes.position?.count || 0;
            faces += geom.index ? geom.index.count / 3 : (geom.attributes.position?.count || 0) / 3;
          }
          const mat = (child as _THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => materials.add(m.name || m.type));
          else materials.add(mat.name || mat.type);
        }
      });

      modelInfo.value = { vertices: Math.round(vertices), faces: Math.round(faces), materials: materials.size };
      emit('loaded', modelInfo.value);
      loading.value = false;
    },
    (progress: { loaded: number; total: number }) => {
      if (progress.total > 0) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        loading.value = pct < 100;
      }
    },
    (err: Error) => {
      const msg = `模型加载失败: ${err?.message || '未知错误'}`;
      error.value = msg;
      loading.value = false;
      emit('error', msg);
    },
  );
}

function toggleRotate() {
  autoRotateActive = !autoRotateActive;
  if (orbitControls) orbitControls.autoRotate = autoRotateActive;
  controls.value[0].active = autoRotateActive;
}

function toggleWireframe() {
  controls.value[1].active = !controls.value[1].active;
  if (model) {
    model.traverse((child: _THREE.Object3D) => {
      if ((child as _THREE.Mesh).isMesh) {
        const mat = (child as _THREE.Mesh).material;
        if (Array.isArray(mat)) mat.forEach((m) => (m.wireframe = controls.value[1].active));
        else mat.wireframe = controls.value[1].active;
      }
    });
  }
}

function resetView() {
  if (camera && orbitControls) {
    camera.position.set(3, 2, 5);
    orbitControls.target.set(0, 0.5, 0);
    orbitControls.update();
  }
}

function setView(dir: 'top' | 'front') {
  if (!camera || !orbitControls) return;
  if (dir === 'top') {
    camera.position.set(0, 5, 0.1);
    orbitControls.target.set(0, 0, 0);
  } else {
    camera.position.set(0, 1, 5);
    orbitControls.target.set(0, 0.5, 0);
  }
  orbitControls.update();
}

function retry() {
  if (props.modelUrl) loadModel(props.modelUrl);
}

function onResize() {
  if (!containerRef.value || !renderer || !camera) return;
  const w = containerRef.value.clientWidth;
  const h = containerRef.value.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

watch(() => props.modelUrl, (url) => {
  if (url) nextTick(() => loadModel(url));
});

watch(() => props.bgColor, (color) => {
  if (scene && color) scene.background = new _THREE.Color(color);
});

onMounted(async () => {
  try {
    _THREE = await import('three');
    _OrbitControls = (await import('three/examples/jsm/controls/OrbitControls.js')).OrbitControls;
    _GLTFLoader = (await import('three/examples/jsm/loaders/GLTFLoader.js')).GLTFLoader;
  } catch (e) {
    error.value = t('three_viewer.engine_load_failed');
    return;
  }
  nextTick(() => {
    initScene();
    if (props.modelUrl) loadModel(props.modelUrl);
  });
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onResize);
  renderer?.dispose();
  orbitControls?.dispose();
});
</script>

<style scoped>
.three-viewer-container {
  position: relative;
  width: 100%;
  height: 500px;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a2e;
}
.viewer-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.viewer-controls {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(12px);
  border-radius: 10px;
  padding: 6px 10px;
  z-index: 10;
}
.ctrl-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: transparent;
  border: 1px solid transparent;
  color: #767676;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
}
.ctrl-btn:hover { color: #fff; background: rgba(255,255,255,0.1); }
.ctrl-btn.active { color: #6c5ce7; border-color: #6c5ce7; background: rgba(108,92,231,0.15); }
.ctrl-icon { font-size: 18px; }
.ctrl-label { font-size: 10px; white-space: nowrap; }
.viewer-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 46, 0.85);
  z-index: 20;
  color: #767676;
  gap: 12px;
}
.viewer-overlay.error { color: #ff6b6b; }
.viewer-overlay button {
  background: #6c5ce7;
  color: #fff;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #333;
  border-top-color: #6c5ce7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.viewer-info {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 12px;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #767676;
  z-index: 10;
}
</style>
