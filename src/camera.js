import * as THREE from 'three';

const VIEW_TILES = 22;

// Classic isometric offset: 45° yaw, ~35° pitch feels close to Tibia.
const OFFSET = new THREE.Vector3(18, 22, 18);

export function createIsometricCamera() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const half = VIEW_TILES / 2;
  const camera = new THREE.OrthographicCamera(
    -half * aspect,
    half * aspect,
    half,
    -half,
    0.1,
    500,
  );
  camera.position.copy(OFFSET);
  camera.lookAt(0, 0, 0);
  return camera;
}

export function resizeCamera(camera) {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const half = VIEW_TILES / 2;
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
}

const tmpTarget = new THREE.Vector3();
const tmpDesired = new THREE.Vector3();

export function followTarget(camera, targetPos /* dt unused */) {
  // Snap the camera to the player's horizontal position each frame.
  // The player interpolates smoothly during a step, so following
  // exactly is smooth too and avoids the smoothing-lag "shake" that
  // was showing on top of the character's step.
  tmpTarget.set(targetPos.x, 0, targetPos.z);
  tmpDesired.copy(tmpTarget).add(OFFSET);
  camera.position.copy(tmpDesired);
  camera.lookAt(tmpTarget);
}
