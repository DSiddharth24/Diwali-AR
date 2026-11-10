/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CrackerDefinition, PlacedCracker } from '../types/crackers';
import { createCracker3DModel, createRangoliReticle } from '../three/crackerModels';
import { ParticleEngine } from '../three/particleEngine';
import { Eye } from 'lucide-react';

export interface ARCanvasHandle {
  getGroundPositionFromScreen: (clientX: number, clientY: number) => [number, number, number];
}

interface ARCanvasProps {
  selectedCracker: CrackerDefinition;
  isARCameraMode: boolean;
  isSparklerMode: boolean;
  placedCrackers: PlacedCracker[];
  onCrackerPlaced: (cracker: PlacedCracker) => void;
  onIgniteCracker: (instanceId: string) => void;
  onSparklerTouchCracker?: (instanceId: string) => void;
  onTakeSnapshotReady?: (canvas: HTMLCanvasElement) => void;
  particleEngineRef: React.MutableRefObject<ParticleEngine | null>;
  draggedCracker: CrackerDefinition | null;
  dragPointer: { x: number; y: number } | null;
  canvasHandleRef?: React.Ref<ARCanvasHandle>;
  isSkyViewActive?: boolean;
}

export const ARCanvas: React.FC<ARCanvasProps> = ({
  selectedCracker,
  isARCameraMode,
  isSparklerMode,
  placedCrackers,
  onCrackerPlaced,
  onIgniteCracker,
  particleEngineRef,
  draggedCracker,
  dragPointer,
  canvasHandleRef,
  isSkyViewActive = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groundMeshRef = useRef<THREE.Mesh | null>(null);
  const reticleRef = useRef<THREE.Group | null>(null);
  const ghostMeshRef = useRef<THREE.Group | null>(null);
  const crackerMeshesMap = useRef<Map<string, THREE.Group>>(new Map());

  // Ground raycast plane
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const raycaster = useRef(new THREE.Raycaster());
  const mouseCoords = useRef(new THREE.Vector2(0, 0));
  const pointerPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -2.5));

  // Screen shake animation
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  // Camera perspective controls for Virtual Mode
  const isDragging = useRef(false);
  const pointerDownCoord = useRef<{ x: number; y: number } | null>(null);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const cameraAngle = useRef({ theta: 0, phi: 0.22 });
  const cameraPitch = useRef(0.18); // Natural eye-level framing showing terrace and night sky
  const cameraDistance = useRef(3.8);

  const currentLookAt = useRef(new THREE.Vector3(0, 1.2, -1.0));
  const desiredLookAt = useRef(new THREE.Vector3(0, 1.2, -1.0));

  // Expose ground raycasting handle to parent
  useImperativeHandle(canvasHandleRef, () => ({
    getGroundPositionFromScreen: (clientX: number, clientY: number): [number, number, number] => {
      if (!mountRef.current || !cameraRef.current) {
        return [0, 0, -2.0];
      }
      const rect = mountRef.current.getBoundingClientRect();
      const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const normY = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(new THREE.Vector2(normX, normY), cameraRef.current);
      const hit = new THREE.Vector3();
      if (raycaster.current.ray.intersectPlane(groundPlane.current, hit)) {
        return [hit.x, 0, hit.z];
      }
      return [0, 0, -2.0];
    },
  }));

  // Check if any aerial crackers are currently active or exploding
  const hasActiveAerialCracker = placedCrackers.some((p) => {
    const isBurning = p.state === 'burning_fuse' || p.state === 'exploding';
    const isAerial = p.crackerId.startsWith('cake_') || p.crackerId.startsWith('rocket_');
    return isBurning && isAerial;
  });

  // Dynamically update desired camera lookAt target for optimal fireworks framing
  useEffect(() => {
    if (isARCameraMode) return;

    if (isSkyViewActive || selectedCracker.isAerial || hasActiveAerialCracker) {
      // Elevated sky focus: soaring mortar launch + high-altitude bursting blooms in full panoramic view
      desiredLookAt.current.set(0, 3.4, -1.5);
    } else {
      // Balanced ground focus with terrace and skyline backdrop
      desiredLookAt.current.set(0, 0.9, -1.0);
    }
  }, [isSkyViewActive, selectedCracker.isAerial, hasActiveAerialCracker, isARCameraMode]);

  // Initialize Scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Detect software WebGL per Three.js guidelines
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.1, 100);
    camera.position.set(0, 1.6, 3.2);
    camera.lookAt(0, 1.1, -0.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    rendererRef.current = renderer;
    canvasRef.current = renderer.domElement;
    mountRef.current.appendChild(renderer.domElement);

    // Mandatory Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Lighting rig: Warm directional key light + cool hemisphere ambient
    const keyLight = new THREE.DirectionalLight('#FFEDD5', 1.8);
    keyLight.position.set(3, 8, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight('#38BDF8', '#78350F', 0.85);
    scene.add(hemiLight);

    const amberAmbi = new THREE.AmbientLight('#F59E0B', 0.45);
    scene.add(amberAmbi);

    // Ground Plane for Shadow & Raycasting
    const groundGeo = new THREE.PlaneGeometry(50, 50);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);
    groundMeshRef.current = ground;

    // Glowing Placement Reticle
    const reticle = createRangoliReticle();
    reticle.position.set(0, 0.005, -2.5);
    scene.add(reticle);
    reticleRef.current = reticle;

    // Particle Engine initialization
    const pEngine = new ParticleEngine(scene);
    particleEngineRef.current = pEngine;
    pEngine.onScreenShake = (intensity: number) => {
      let step = 0;
      const shakeInterval = setInterval(() => {
        step++;
        if (step > 8) {
          clearInterval(shakeInterval);
          setShakeOffset({ x: 0, y: 0 });
        } else {
          const decay = (8 - step) / 8;
          setShakeOffset({
            x: (Math.random() - 0.5) * 20 * intensity * decay,
            y: (Math.random() - 0.5) * 20 * intensity * decay,
          });
        }
      }, 25);
    };

    // Responsive Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Render Loop
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Smooth camera lookAt damping
      currentLookAt.current.lerp(desiredLookAt.current, delta * 3.5);
      if (cameraRef.current) {
        cameraRef.current.lookAt(currentLookAt.current);
      }

      // Animate Reticle pulse
      if (reticleRef.current) {
        const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 3.5) * 0.08;
        reticleRef.current.scale.set(pulse, pulse, pulse);
        reticleRef.current.rotation.y += delta * 0.6;
      }

      // Animate Drag Ghost Mesh
      if (ghostMeshRef.current) {
        ghostMeshRef.current.rotation.y += delta * 2.0;
        ghostMeshRef.current.position.y = 0.28 + Math.sin(clock.getElapsedTime() * 6.0) * 0.06;
      }

      // Update particle physics
      pEngine.update(delta);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (isSoftwareGl) clearTimeout(frameId);
      else cancelAnimationFrame(frameId);

      pEngine.clearAll();
      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [particleEngineRef]);

  // Sync Environment Mode (Camera AR vs Festive Courtyard)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (isARCameraMode) {
      scene.background = null;
      if (groundMeshRef.current) {
        (groundMeshRef.current.material as THREE.Material).dispose();
        groundMeshRef.current.material = new THREE.ShadowMaterial({ opacity: 0.45 });
      }
    } else {
      const textureLoader = new THREE.TextureLoader();

      textureLoader.load('/src/assets/images/diwali_night_skyline_1794286906321.jpg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = tex;
      });

      textureLoader.load('/src/assets/images/diwali_rangoli_ground_1794286905548.jpg', (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 8);
        if (groundMeshRef.current) {
          groundMeshRef.current.material = new THREE.MeshStandardMaterial({
            map: tex,
            roughness: 0.8,
            metalness: 0.1,
          });
        }
      });
    }
  }, [isARCameraMode]);

  // Synchronize 3D meshes for placed crackers
  useEffect(() => {
    const scene = sceneRef.current;
    const pEngine = particleEngineRef.current;
    if (!scene || !pEngine) return;

    placedCrackers.forEach((placed) => {
      if (!crackerMeshesMap.current.has(placed.instanceId)) {
        const mesh = createCracker3DModel(selectedCracker);
        mesh.position.set(...placed.position);
        mesh.rotation.y = placed.rotationY;
        scene.add(mesh);
        crackerMeshesMap.current.set(placed.instanceId, mesh);
        pEngine.registerCracker(placed, selectedCracker, mesh);
      }
    });

    crackerMeshesMap.current.forEach((mesh, id) => {
      const exists = placedCrackers.some((p) => p.instanceId === id);
      if (!exists) {
        scene.remove(mesh);
        pEngine.unregisterCracker(id);
        crackerMeshesMap.current.delete(id);
      }
    });
  }, [placedCrackers, selectedCracker, particleEngineRef]);

  // Manage Drag Ghost Preview in 3D Space
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (draggedCracker) {
      if (!ghostMeshRef.current) {
        const ghost = createCracker3DModel(draggedCracker);
        ghost.position.set(pointerPos.current.x, 0.28, pointerPos.current.z);
        scene.add(ghost);
        ghostMeshRef.current = ghost;
      }
    } else {
      if (ghostMeshRef.current) {
        scene.remove(ghostMeshRef.current);
        ghostMeshRef.current = null;
      }
    }
  }, [draggedCracker]);

  // Update pointer ray
  const updatePointerRay = useCallback((clientX: number, clientY: number) => {
    if (!mountRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    mouseCoords.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseCoords.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouseCoords.current, cameraRef.current);
    const hitPoint = new THREE.Vector3();
    const hit = raycaster.current.ray.intersectPlane(groundPlane.current, hitPoint);

    if (hit) {
      pointerPos.current.copy(hitPoint);
      if (reticleRef.current) {
        reticleRef.current.position.set(hitPoint.x, 0.005, hitPoint.z);
      }
      if (ghostMeshRef.current) {
        ghostMeshRef.current.position.set(hitPoint.x, 0.28, hitPoint.z);
      }
      if (particleEngineRef.current && isSparklerMode) {
        particleEngineRef.current.sparklerPosition.copy(hitPoint).add(new THREE.Vector3(0, 0.25, 0));
      }
    }
  }, [isSparklerMode, particleEngineRef]);

  useEffect(() => {
    if (dragPointer) {
      updatePointerRay(dragPointer.x, dragPointer.y);
    }
  }, [dragPointer, updatePointerRay]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    pointerDownCoord.current = { x: e.clientX, y: e.clientY };
    prevMousePos.current = { x: e.clientX, y: e.clientY };
    updatePointerRay(e.clientX, e.clientY);

    if (particleEngineRef.current) {
      particleEngineRef.current.isSparklerActive = isSparklerMode;
    }

    // Check if clicked directly on an existing cracker to ignite
    if (sceneRef.current && cameraRef.current) {
      const intersects = raycaster.current.intersectObjects(sceneRef.current.children, true);
      for (const hit of intersects) {
        let rootGroup: THREE.Object3D | null = hit.object;
        while (rootGroup && rootGroup.parent !== sceneRef.current) {
          rootGroup = rootGroup.parent;
        }
        if (rootGroup) {
          for (const [id, mesh] of crackerMeshesMap.current.entries()) {
            if (mesh === rootGroup) {
              onIgniteCracker(id);
              return;
            }
          }
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updatePointerRay(e.clientX, e.clientY);

    // In Virtual Terrace mode: drag to look around naturally (smooth orbit & pitch)
    if (isDragging.current && !isARCameraMode && !isSparklerMode && !draggedCracker && cameraRef.current) {
      const deltaX = e.clientX - prevMousePos.current.x;
      const deltaY = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      cameraAngle.current.theta -= deltaX * 0.005;
      cameraPitch.current = Math.max(-0.25, Math.min(1.15, cameraPitch.current - deltaY * 0.005));

      const dist = cameraDistance.current;
      const x = Math.sin(cameraAngle.current.theta) * dist;
      const y = 1.6 + Math.sin(cameraPitch.current) * 1.6;
      const z = Math.cos(cameraAngle.current.theta) * dist;

      cameraRef.current.position.set(x, y, z);
      desiredLookAt.current.y = (selectedCracker.isAerial || isSkyViewActive || hasActiveAerialCracker)
        ? 3.4 + Math.sin(cameraPitch.current) * 3.2
        : 0.9 + Math.sin(cameraPitch.current) * 2.5;
    }

    // If sparkler is active, check proximity to light nearby crackers
    if (isSparklerMode && particleEngineRef.current) {
      particleEngineRef.current.sparklerPosition.set(pointerPos.current.x, 0.25, pointerPos.current.z);

      placedCrackers.forEach((p) => {
        if (p.state === 'idle') {
          const dist = Math.hypot(p.position[0] - pointerPos.current.x, p.position[2] - pointerPos.current.z);
          if (dist < 0.45) {
            onIgniteCracker(p.instanceId);
          }
        }
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only place cracker if it was a clean stationary tap (not a camera drag)
    if (pointerDownCoord.current && !isSparklerMode && !draggedCracker) {
      const distMoved = Math.hypot(e.clientX - pointerDownCoord.current.x, e.clientY - pointerDownCoord.current.y);
      if (distMoved < 10) {
        const newPlaced: PlacedCracker = {
          instanceId: `cracker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          crackerId: selectedCracker.id,
          position: [pointerPos.current.x, 0, pointerPos.current.z],
          rotationY: Math.random() * Math.PI * 2,
          state: 'idle',
          stateStartTime: performance.now() / 1000,
          elapsedTime: 0,
          burnProgress: 0,
        };
        onCrackerPlaced(newPlaced);
      }
    }

    isDragging.current = false;
    pointerDownCoord.current = null;
    if (particleEngineRef.current) {
      particleEngineRef.current.isSparklerActive = false;
    }
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden touch-none"
      style={{
        transform: `translate3d(${shakeOffset.x}px, ${shakeOffset.y}px, 0)`,
        transition: 'transform 0.05s ease-out',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};
