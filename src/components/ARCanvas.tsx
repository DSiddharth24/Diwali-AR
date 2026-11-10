/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CrackerDefinition, CRACKER_DEFINITIONS, PlacedCracker } from '../types/crackers';
import { createCracker3DModel, createRangoliReticle } from '../three/crackerModels';
import { ParticleEngine } from '../three/particleEngine';

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
  onCrackerMoved?: (instanceId: string, position: [number, number, number]) => void;
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
  onCrackerMoved,
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
  const pointerPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, -2.2));

  // Screen shake animation
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 });

  // Camera perspective controls for Virtual Mode & AR Mode
  const isDragging = useRef(false);
  const grabbedCrackerId = useRef<string | null>(null);
  const pointerDownCoord = useRef<{ x: number; y: number } | null>(null);
  const prevMousePos = useRef({ x: 0, y: 0 });
  const cameraAngle = useRef({ theta: 0, phi: 0.22 });
  const cameraPitch = useRef(0.18); // Natural eye-level framing showing terrace and night sky
  const cameraDistance = useRef(3.6);

  const currentLookAt = useRef(new THREE.Vector3(0, 1.1, -1.0));
  const desiredLookAt = useRef(new THREE.Vector3(0, 1.1, -1.0));

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

  // Dynamically update desired camera lookAt target for optimal fireworks framing in ALL modes
  useEffect(() => {
    if (isSkyViewActive || selectedCracker.isAerial || hasActiveAerialCracker) {
      // Elevated sky focus: soaring mortar launch + high-altitude bursting blooms in full panoramic view
      desiredLookAt.current.set(0, 2.9, -1.2);
    } else {
      // Balanced ground focus with terrace and skyline backdrop
      desiredLookAt.current.set(0, 0.9, -1.0);
    }
  }, [isSkyViewActive, selectedCracker.isAerial, hasActiveAerialCracker]);

  // Mobile Gyroscope / Device Orientation Support
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return;
      // In portrait: beta is ~75 deg when holding phone upright.
      // Tilting up to the sky reduces beta; tilting down increases it.
      const tiltOffset = (75 - e.beta) * 0.015;
      const clampedTilt = Math.max(-0.35, Math.min(1.2, tiltOffset));
      cameraPitch.current = THREE.MathUtils.lerp(cameraPitch.current, 0.18 + clampedTilt, 0.12);

      if (cameraRef.current) {
        const dist = cameraDistance.current;
        const x = Math.sin(cameraAngle.current.theta) * dist;
        const y = 1.6 + Math.sin(cameraPitch.current) * 1.6;
        const z = Math.cos(cameraAngle.current.theta) * dist;
        cameraRef.current.position.set(x, y, z);
      }

      const skyFactor = (selectedCracker.isAerial || isSkyViewActive || hasActiveAerialCracker) ? 2.9 : 0.9;
      desiredLookAt.current.y = skyFactor + Math.sin(cameraPitch.current) * 2.8;
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isSkyViewActive, selectedCracker.isAerial, hasActiveAerialCracker]);

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

    // Dynamic Environment IBL Lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new RoomEnvironment();
    scene.environment = pmremGenerator.fromScene(envScene, 0.04).texture;

    // Ambient night lighting
    const hemiLight = new THREE.HemisphereLight('#38BDF8', '#1E1B4B', 0.65);
    scene.add(hemiLight);

    // Warm diya glow from terrace edges
    const warmKeyLight = new THREE.DirectionalLight('#F59E0B', 0.9);
    warmKeyLight.position.set(3, 4, 2);
    warmKeyLight.castShadow = !isSoftwareGl;
    warmKeyLight.shadow.mapSize.width = 1024;
    warmKeyLight.shadow.mapSize.height = 1024;
    scene.add(warmKeyLight);

    // Ground Plane for Shadows and Placement
    const groundGeo = new THREE.PlaneGeometry(35, 35);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = !isSoftwareGl;
    groundMesh.position.y = 0;
    scene.add(groundMesh);
    groundMeshRef.current = groundMesh;

    // Interactive Festive Reticle Indicator
    const reticle = createRangoliReticle();
    reticle.visible = false;
    scene.add(reticle);
    reticleRef.current = reticle;

    // Initialize Particle & Fireworks Physics Engine
    const pEngine = new ParticleEngine(scene);
    pEngine.onScreenShake = (intensity: number) => {
      const shakeAmt = intensity * 10;
      setShakeOffset({
        x: (Math.random() - 0.5) * shakeAmt,
        y: (Math.random() - 0.5) * shakeAmt,
      });
      setTimeout(() => {
        setShakeOffset({ x: 0, y: 0 });
      }, 70);
    };
    particleEngineRef.current = pEngine;

    // Resize Handler
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
    let frameId: number;
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

  // Synchronize 3D meshes for placed crackers with authentic distinct models
  useEffect(() => {
    const scene = sceneRef.current;
    const pEngine = particleEngineRef.current;
    if (!scene || !pEngine) return;

    placedCrackers.forEach((placed) => {
      const existingMesh = crackerMeshesMap.current.get(placed.instanceId);
      if (!existingMesh) {
        const def = CRACKER_DEFINITIONS.find((c) => c.id === placed.crackerId) || selectedCracker;
        const mesh = createCracker3DModel(def);
        mesh.position.set(...placed.position);
        mesh.rotation.y = placed.rotationY;
        scene.add(mesh);
        crackerMeshesMap.current.set(placed.instanceId, mesh);
        pEngine.registerCracker(placed, def, mesh);
      } else {
        // Keep mesh position in sync with placed position
        existingMesh.position.set(...placed.position);
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

        ghost.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = child as THREE.Mesh;
            m.castShadow = false;
            m.receiveShadow = false;
            if (m.material) {
              const origMat = m.material as THREE.MeshStandardMaterial;
              m.material = new THREE.MeshStandardMaterial({
                color: origMat.color,
                transparent: true,
                opacity: 0.8,
                emissive: new THREE.Color('#F59E0B'),
                emissiveIntensity: 0.6,
                wireframe: false,
              });
            }
          }
        });
        ghostMeshRef.current = ghost;
      } else {
        ghostMeshRef.current.position.set(pointerPos.current.x, 0.28, pointerPos.current.z);
      }

      if (reticleRef.current) {
        reticleRef.current.position.set(pointerPos.current.x, 0.005, pointerPos.current.z);
        reticleRef.current.visible = true;
      }
    } else {
      if (ghostMeshRef.current) {
        scene.remove(ghostMeshRef.current);
        ghostMeshRef.current = null;
      }
      if (reticleRef.current && !grabbedCrackerId.current) {
        reticleRef.current.visible = false;
      }
    }
  }, [draggedCracker]);

  // Raycast to Ground Plane
  const updatePointerRay = useCallback((clientX: number, clientY: number) => {
    if (!mountRef.current || !cameraRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const normX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const normY = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(new THREE.Vector2(normX, normY), cameraRef.current);

    const hitPoint = new THREE.Vector3();
    if (raycaster.current.ray.intersectPlane(groundPlane.current, hitPoint)) {
      pointerPos.current.copy(hitPoint);

      if (reticleRef.current && (draggedCracker || grabbedCrackerId.current)) {
        reticleRef.current.position.set(hitPoint.x, 0.005, hitPoint.z);
        reticleRef.current.visible = true;
      }

      if (ghostMeshRef.current) {
        ghostMeshRef.current.position.set(hitPoint.x, 0.28, hitPoint.z);
      }

      if (particleEngineRef.current && isSparklerMode) {
        particleEngineRef.current.sparklerPosition.copy(hitPoint).add(new THREE.Vector3(0, 0.25, 0));
      }
    }
  }, [isSparklerMode, draggedCracker, particleEngineRef]);

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

    // Check if clicked directly on an existing cracker to reposition or ignite
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
              const placed = placedCrackers.find((p) => p.instanceId === id);
              if (placed && placed.state === 'idle') {
                grabbedCrackerId.current = id;
                if (reticleRef.current) {
                  reticleRef.current.position.set(placed.position[0], 0.005, placed.position[2]);
                  reticleRef.current.visible = true;
                }
                return;
              } else {
                onIgniteCracker(id);
                return;
              }
            }
          }
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    updatePointerRay(e.clientX, e.clientY);

    // If repositioning an existing cracker: slide it across the terrace floor
    if (isDragging.current && grabbedCrackerId.current) {
      const mesh = crackerMeshesMap.current.get(grabbedCrackerId.current);
      if (mesh) {
        mesh.position.set(pointerPos.current.x, 0, pointerPos.current.z);
      }
      if (reticleRef.current) {
        reticleRef.current.position.set(pointerPos.current.x, 0.005, pointerPos.current.z);
        reticleRef.current.visible = true;
      }
      return;
    }

    // Drag to look around naturally (smooth orbit & pitch) in BOTH Virtual Terrace and AR mode
    if (isDragging.current && !isSparklerMode && !draggedCracker && !grabbedCrackerId.current && cameraRef.current) {
      const deltaX = e.clientX - prevMousePos.current.x;
      const deltaY = e.clientY - prevMousePos.current.y;
      prevMousePos.current = { x: e.clientX, y: e.clientY };

      cameraAngle.current.theta -= deltaX * 0.005;
      cameraPitch.current = Math.max(-0.35, Math.min(1.25, cameraPitch.current - deltaY * 0.005));

      const dist = cameraDistance.current;
      const x = Math.sin(cameraAngle.current.theta) * dist;
      const y = 1.6 + Math.sin(cameraPitch.current) * 1.6;
      const z = Math.cos(cameraAngle.current.theta) * dist;

      cameraRef.current.position.set(x, y, z);
      desiredLookAt.current.y = (selectedCracker.isAerial || isSkyViewActive || hasActiveAerialCracker)
        ? 2.9 + Math.sin(cameraPitch.current) * 2.8
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
    // If we were holding an existing cracker: check if it was dragged or tapped
    if (grabbedCrackerId.current && pointerDownCoord.current) {
      const distMoved = Math.hypot(e.clientX - pointerDownCoord.current.x, e.clientY - pointerDownCoord.current.y);
      const targetId = grabbedCrackerId.current;
      grabbedCrackerId.current = null;

      if (reticleRef.current && !draggedCracker) {
        reticleRef.current.visible = false;
      }

      if (distMoved > 10) {
        // Cracker was repositioned!
        const newPos: [number, number, number] = [pointerPos.current.x, 0, pointerPos.current.z];
        if (onCrackerMoved) {
          onCrackerMoved(targetId, newPos);
        }
        if (particleEngineRef.current) {
          particleEngineRef.current.updateCrackerPosition(targetId, newPos);
        }
      } else {
        // Clean tap: ignite!
        onIgniteCracker(targetId);
      }

      isDragging.current = false;
      pointerDownCoord.current = null;
      return;
    }

    // Only place a new cracker if it was a clean stationary tap on empty space
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
