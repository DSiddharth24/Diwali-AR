/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CrackerDefinition, PlacedCracker } from '../types/crackers';
import { fireworkAudio } from '../audio/fireworkAudio';

// Reusable math scratchpads to prevent garbage collection in render loop
const _vec3 = new THREE.Vector3();
const _color = new THREE.Color();

// Generic Spark Particle structure
interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
  bounceFloor: boolean;
}

// Active Cracker Simulation Runtime State
export interface CrackerSim {
  placed: PlacedCracker;
  def: CrackerDefinition;
  rootMesh: THREE.Group;
  particles: Particle[];
  startTime: number;
  fuseLight?: THREE.PointLight;
  burstLight?: THREE.PointLight;
  isSpent: boolean;
  soundStopper?: () => void;
  // Specific cracker state trackers
  aerialRockets?: {
    mesh: THREE.Object3D;
    initialPos: THREE.Vector3;
    launchTime: number;
    targetApex: number;
    burstDone: boolean;
    targetY: number;
    angleZ: number;
  }[];
  cakeVolleys?: {
    launchTime: number;
    exploded: boolean;
    apexPos: THREE.Vector3;
    color: string;
    coreColors: string[];
    outerColors: string[];
    isWillow: boolean;
  }[];
  nextGarlandIndex?: number;
}

export class ParticleEngine {
  private scene: THREE.Scene;
  private particleGeos: THREE.BufferGeometry[] = [];
  private particleMats: THREE.PointsMaterial[] = [];
  private pointsMesh: THREE.Points | null = null;
  private maxGlobalParticles = 28000;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;

  // Active particle pools
  private activeParticles: Particle[] = [];
  public activeSims: Map<string, CrackerSim> = new Map();

  // Screen Shake callback
  public onScreenShake?: (intensity: number) => void;

  // Sparkler tool state
  public isSparklerActive: boolean = false;
  public sparklerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.positions = new Float32Array(this.maxGlobalParticles * 3);
    this.colors = new Float32Array(this.maxGlobalParticles * 3);
    this.sizes = new Float32Array(this.maxGlobalParticles);
    this.alphas = new Float32Array(this.maxGlobalParticles);

    this.initParticleSystem();
  }

  private initParticleSystem() {
    // Generate soft circular glowing particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 230, 150, 0.9)');
    grad.addColorStop(0.7, 'rgba(255, 120, 20, 0.4)');
    grad.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.18,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.pointsMesh = new THREE.Points(geometry, material);
    this.pointsMesh.frustumCulled = false;
    this.scene.add(this.pointsMesh);
  }

  // Ignite a placed cracker (fast snappy fuse for instant auto-ignition)
  public igniteCracker(instanceId: string) {
    const sim = this.activeSims.get(instanceId);
    if (!sim || sim.placed.state !== 'idle') return;

    sim.placed.state = 'burning_fuse';
    sim.placed.stateStartTime = performance.now() / 1000;

    // Add glowing fuse light
    const fuseLight = new THREE.PointLight('#F59E0B', 3.0, 2.0);
    fuseLight.position.set(
      sim.placed.position[0],
      sim.placed.position[1] + 0.5,
      sim.placed.position[2]
    );
    this.scene.add(fuseLight);
    sim.fuseLight = fuseLight;

    // Fast snappy fuse so user doesn't wait (0.35s for instant satisfaction, or 1.2s for aerial rocket)
    const fuseTime = sim.def.isAerial ? 1.0 : (sim.def.category === 'bomb' ? 1.4 : 0.35);
    fireworkAudio.playFuseBurn(fuseTime);

    // Schedule explosion/firing
    setTimeout(() => {
      this.triggerExplosion(sim);
    }, fuseTime * 1000);
  }

  private triggerExplosion(sim: CrackerSim) {
    if (sim.isSpent) return;
    sim.placed.state = 'exploding';
    sim.placed.stateStartTime = performance.now() / 1000;

    if (sim.fuseLight) {
      this.scene.remove(sim.fuseLight);
      sim.fuseLight = undefined;
    }

    // Add main burst illumination light
    const isChakkar = sim.def.category === 'ground_chakkar';
    const burstLight = new THREE.PointLight(
      isChakkar ? '#FF7700' : (sim.def.colorScheme[0] || '#F59E0B'),
      isChakkar ? 12.0 : 4.0,
      isChakkar ? 10.0 : 6.0
    );
    burstLight.position.set(
      sim.placed.position[0],
      sim.placed.position[1] + (sim.def.isAerial ? 3 : 0.6),
      sim.placed.position[2]
    );
    this.scene.add(burstLight);
    sim.burstLight = burstLight;

    // Trigger corresponding audio & setup sim
    switch (sim.def.category) {
      case 'flower_pot': {
        const isSilver = sim.def.id === 'anaar_silver';
        sim.soundStopper = fireworkAudio.playAnaar(sim.def.durationSeconds, isSilver);
        break;
      }
      case 'ground_chakkar': {
        fireworkAudio.playChakkar(sim.def.durationSeconds);
        // Activate ground fire halo
        const halo = sim.rootMesh.getObjectByName('groundFireHalo') as THREE.Mesh;
        if (halo && halo.material) {
          (halo.material as THREE.MeshBasicMaterial).opacity = 0.85;
        }
        break;
      }
      case 'garland': {
        const count = sim.def.burstCount || 120;
        fireworkAudio.playGarland(sim.def.durationSeconds, count);
        sim.nextGarlandIndex = 0;
        break;
      }
      case 'bomb': {
        const isHydro = sim.def.id === 'bomb_hydro';
        fireworkAudio.playBomb(isHydro ? 'hydro' : 'atom');
        this.emitBombBlast(sim);
        if (this.onScreenShake) this.onScreenShake(isHydro ? 1.0 : 0.7);
        break;
      }
      case 'rocket': {
        fireworkAudio.playRocket(sim.def.durationSeconds * 0.4);
        const projectile = sim.rootMesh.getObjectByName('rocketProjectile');
        if (projectile) {
          // Elevated high-altitude rocket apex (6.2m to 7.8m)
          const targetApex = 6.2 + Math.random() * 1.6;
          sim.aerialRockets = [{
            mesh: projectile,
            initialPos: projectile.position.clone(),
            launchTime: performance.now() / 1000,
            targetApex,
            burstDone: false,
            targetY: targetApex,
            angleZ: (Math.random() - 0.5) * 0.12,
          }];
        }
        break;
      }
      case 'aerial_cake': {
        const count = sim.def.burstCount || 12;
        sim.cakeVolleys = [];
        const isGrand = sim.def.id === 'cake_grand_25';
        const interval = (sim.def.durationSeconds - 2.5) / count;

        // Authentic Professional Aerial Shell Presets (Directly matching user reference image)
        const SHELL_PRESETS = [
          // Preset 0: Concentric Violet/Fuchsia Pistil + Fiery Ruby-Crimson Outer Petals (Top-Right in reference)
          {
            coreColors: ['#9333EA', '#C084FC', '#A855F7', '#EC4899', '#F43F5E'],
            outerColors: ['#EF4444', '#F97316', '#FBBF24', '#FEF08A', '#DC2626'],
            isWillow: false,
          },
          // Preset 1: Deep Ruby-Red Core + Electric Cobalt & Cyan Outer Ring (Bottom-Right in reference)
          {
            coreColors: ['#DC2626', '#FF1744', '#F43F5E', '#E11D48'],
            outerColors: ['#2563EB', '#00F0FF', '#38BDF8', '#67E8F9', '#FFFFFF'],
            isWillow: false,
          },
          // Preset 2: Gilded Brocade Cascading Weeping Willow (Top-Left in reference)
          {
            coreColors: ['#FEF08A', '#FFFFFF', '#FDE047'],
            outerColors: ['#F59E0B', '#FBBF24', '#D97706', '#FEF08A', '#FCD34D'],
            isWillow: true,
          },
          // Preset 3: Neon Emerald & Vivid Coral Peony
          {
            coreColors: ['#FF1493', '#F43F5E', '#FB7185', '#FDA4AF'],
            outerColors: ['#00FF66', '#10B981', '#34D399', '#059669', '#FDE047'],
            isWillow: false,
          },
          // Preset 4: Rainbow Multi-Tier Grand Chrysanthemum Bouquet
          {
            coreColors: ['#A855F7', '#EC4899', '#06B6D4', '#C084FC'],
            outerColors: ['#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#FF0055', '#FDE047'],
            isWillow: false,
          },
        ];

        for (let i = 0; i < count; i++) {
          const launchT = i * interval;
          // Wide majestic fanned spread angle
          const fanIdx = (i % 5) - 2; // -2, -1, 0, 1, 2
          const fanAngle = fanIdx * 0.18;
          // High-altitude tiered apex heights (5.8m to 8.5m) for majestic towering sky barrages
          const tier = isGrand ? Math.floor(i / 6) : (i % 3);
          const apexY = isGrand
            ? (5.6 + tier * 0.95 + (Math.random() - 0.5) * 0.4)
            : (5.8 + tier * 0.8 + (Math.random() - 0.5) * 0.35);
          const apexX = sim.placed.position[0] + Math.sin(fanAngle) * 3.6 + (Math.random() - 0.5) * 0.4;
          const apexZ = sim.placed.position[2] - 1.2 + (Math.random() - 0.5) * 0.6;

          const preset = SHELL_PRESETS[i % SHELL_PRESETS.length];

          sim.cakeVolleys.push({
            launchTime: launchT,
            exploded: false,
            apexPos: new THREE.Vector3(apexX, apexY, apexZ),
            color: preset.outerColors[0],
            coreColors: preset.coreColors,
            outerColors: preset.outerColors,
            isWillow: preset.isWillow,
          });
        }
        break;
      }
    }

    // Schedule mark spent
    setTimeout(() => {
      this.markSpent(sim);
    }, sim.def.durationSeconds * 1000);
  }

  private markSpent(sim: CrackerSim) {
    sim.isSpent = true;
    sim.placed.state = 'spent';
    if (sim.burstLight) {
      this.scene.remove(sim.burstLight);
      sim.burstLight = undefined;
    }
    if (sim.soundStopper) {
      sim.soundStopper();
    }
  }

  // Atom Bomb & Hydro Bomb - High-Intensity Concussive Blast & Visual Shockwave
  private emitBombBlast(sim: CrackerSim) {
    const origin = new THREE.Vector3(...sim.placed.position);
    origin.y += 0.08;

    const isHydro = sim.def.id === 'bomb_hydro';

    // 1. Hide bomb 3D geometry instantly
    sim.rootMesh.visible = false;

    // 2. Blinding White-Hot Flash Light (28.0 intensity flash bulb)
    const flashLight = new THREE.PointLight(isHydro ? '#E0F2FE' : '#FFFFFF', 28.0, 22.0);
    flashLight.position.copy(origin).add(new THREE.Vector3(0, 0.4, 0));
    this.scene.add(flashLight);

    let flashInt = 28.0;
    const fadeFlash = () => {
      flashInt *= 0.72;
      flashLight.intensity = flashInt;
      if (flashInt > 0.1) {
        requestAnimationFrame(fadeFlash);
      } else {
        this.scene.remove(flashLight);
        flashLight.dispose();
      }
    };
    requestAnimationFrame(fadeFlash);

    // 3. Ground Scorch Soot Decal (Burn mark left on floor)
    const scorchCanvas = document.createElement('canvas');
    scorchCanvas.width = 128;
    scorchCanvas.height = 128;
    const sCtx = scorchCanvas.getContext('2d')!;
    const sGrad = sCtx.createRadialGradient(64, 64, 12, 64, 64, 60);
    sGrad.addColorStop(0, 'rgba(15, 12, 10, 0.85)');
    sGrad.addColorStop(0.5, 'rgba(40, 25, 15, 0.55)');
    sGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = sGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const scorchTex = new THREE.CanvasTexture(scorchCanvas);
    const scorchMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({
        map: scorchTex,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })
    );
    scorchMesh.rotation.x = -Math.PI / 2;
    scorchMesh.position.set(origin.x, 0.004, origin.z);
    this.scene.add(scorchMesh);

    // 4. Dual Expanding Concussive Shockwave Rings
    // Ring A: Primary blazing ground shockwave ring
    const ringGeoA = new THREE.RingGeometry(0.12, 0.32, 40);
    const ringMatA = new THREE.MeshBasicMaterial({
      color: isHydro ? '#38BDF8' : '#FEF08A',
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringMeshA = new THREE.Mesh(ringGeoA, ringMatA);
    ringMeshA.rotation.x = -Math.PI / 2;
    ringMeshA.position.set(origin.x, 0.025, origin.z);
    this.scene.add(ringMeshA);

    // Ring B: Secondary fiery compression shockwave ring
    const ringGeoB = new THREE.RingGeometry(0.18, 0.45, 36);
    const ringMatB = new THREE.MeshBasicMaterial({
      color: isHydro ? '#0284C7' : '#EF4444',
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const ringMeshB = new THREE.Mesh(ringGeoB, ringMatB);
    ringMeshB.rotation.x = -Math.PI / 2;
    ringMeshB.position.set(origin.x, 0.035, origin.z);
    this.scene.add(ringMeshB);

    let scaleA = 1.0;
    let scaleB = 1.0;
    const ringAnim = () => {
      scaleA += 0.36; // Fast explosive expansion
      scaleB += 0.28;
      ringMeshA.scale.set(scaleA, scaleA, 1);
      ringMeshB.scale.set(scaleB, scaleB, 1);
      ringMatA.opacity -= 0.055;
      ringMatB.opacity -= 0.045;

      if (ringMatA.opacity > 0 || ringMatB.opacity > 0) {
        requestAnimationFrame(ringAnim);
      } else {
        this.scene.remove(ringMeshA);
        this.scene.remove(ringMeshB);
        ringGeoA.dispose();
        ringGeoB.dispose();
        ringMatA.dispose();
        ringMatB.dispose();
      }
    };
    requestAnimationFrame(ringAnim);

    // 5. Multi-Tier High-Intensity Burst Particles (Over 800+ particles)

    // Tier 1: High-Velocity White-Hot Shrapnel (Searing high-speed explosive spikes)
    const tier1Count = 300;
    for (let i = 0; i < tier1Count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() * 0.9) * Math.PI;
      const speed = 15.0 + Math.random() * 13.0; // 15 to 28 m/s!

      const vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.sin(elevation) * speed + 2.5,
        Math.sin(angle) * Math.cos(elevation) * speed
      );

      const colorHex = i % 4 === 0
        ? '#FFFFFF'
        : (isHydro ? (i % 2 === 0 ? '#E0F2FE' : '#38BDF8') : (i % 2 === 0 ? '#FEF08A' : '#F59E0B'));

      this.activeParticles.push({
        pos: origin.clone(),
        vel,
        color: new THREE.Color(colorHex),
        size: 0.22 + Math.random() * 0.16,
        alpha: 1.0,
        life: 0,
        maxLife: 0.6 + Math.random() * 0.5,
        gravity: -10.5,
        drag: 0.92, // rapid atmospheric deceleration leaving streak trails
        bounceFloor: true,
      });
    }

    // Tier 2: Concussive Ground Skimmer Ring (Horizontal blast wave skimming the floor)
    const tier2Count = 240;
    for (let i = 0; i < tier2Count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 12.0 + Math.random() * 12.0;

      this.activeParticles.push({
        pos: origin.clone().add(new THREE.Vector3(Math.cos(angle) * 0.1, 0.02, Math.sin(angle) * 0.1)),
        vel: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.15 + Math.random() * 0.6,
          Math.sin(angle) * speed
        ),
        color: new THREE.Color(isHydro ? '#7DD3FC' : (i % 2 === 0 ? '#FDE047' : '#EF4444')),
        size: 0.16 + Math.random() * 0.1,
        alpha: 1.0,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        gravity: -4.0,
        drag: 0.93,
        bounceFloor: true,
      });
    }

    // Tier 3: Fiery Burning Debris & Jute Shrapnel (Arcing explosive chunks)
    const tier3Count = 180;
    for (let i = 0; i < tier3Count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = (0.2 + Math.random() * 0.7) * Math.PI;
      const speed = 6.0 + Math.random() * 10.0;

      this.activeParticles.push({
        pos: origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.05, (Math.random() - 0.5) * 0.1)),
        vel: new THREE.Vector3(
          Math.cos(angle) * Math.cos(elevation) * speed,
          Math.sin(elevation) * speed,
          Math.sin(angle) * Math.cos(elevation) * speed
        ),
        color: new THREE.Color(isHydro ? '#0284C7' : (i % 3 === 0 ? '#DC2626' : '#B45309')),
        size: 0.18 + Math.random() * 0.14,
        alpha: 1.0,
        life: 0,
        maxLife: 1.1 + Math.random() * 0.8,
        gravity: -9.8,
        drag: 0.95,
        bounceFloor: true,
      });
    }

    // Tier 4: Volumetric Billowing Mushroom Smoke Plume (Charcoal & lingering smoke)
    const tier4Count = 120;
    for (let i = 0; i < tier4Count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const rad = Math.random() * 0.35;
      const isStem = i < 40;

      this.activeParticles.push({
        pos: origin.clone().add(new THREE.Vector3(Math.cos(angle) * rad, 0.1, Math.sin(angle) * rad)),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * (isStem ? 1.0 : 2.4),
          isStem ? (2.2 + Math.random() * 2.2) : (1.4 + Math.random() * 1.8),
          (Math.random() - 0.5) * (isStem ? 1.0 : 2.4)
        ),
        color: new THREE.Color(
          0.18 + Math.random() * 0.1,
          0.16 + Math.random() * 0.1,
          0.14 + Math.random() * 0.1
        ),
        size: 0.45 + Math.random() * 0.5,
        alpha: 0.8,
        life: 0,
        maxLife: 2.8 + Math.random() * 1.2,
        gravity: 0.35, // Buoyant upward lift
        drag: 0.95,
        bounceFloor: false,
      });
    }

    // Screen Concussive Jolt
    if (this.onScreenShake) {
      this.onScreenShake(isHydro ? 1.35 : 1.15);
    }
  }

  // Aerial Skyburst (for Rockets and Cakes) - Multi-Layer Concentric Chrysanthemums & Bi-Color Rings
  public triggerAerialSkyburst(
    origin: THREE.Vector3,
    colorScheme: string[],
    count = 380,
    isWillow = false,
    preset?: { coreColors: string[]; outerColors: string[]; isWillow: boolean }
  ) {
    const coreColors = preset?.coreColors || colorScheme.slice(0, 3);
    const outerColors = preset?.outerColors || colorScheme;
    const willDroop = preset ? preset.isWillow : isWillow;
    const primaryColor = preset ? preset.coreColors[0] : (colorScheme[0] || '#9333EA');

    // Dynamic Saturated Atmospheric Sky Flash that lights up the scene, terrace, and skyline
    const burstLight = new THREE.PointLight(primaryColor, 24.0, 50.0);
    burstLight.position.copy(origin);
    this.scene.add(burstLight);

    setTimeout(() => {
      this.scene.remove(burstLight);
    }, 600);

    // Layer 1: Dense Radiant Pistil Core (Vibrant Neon Core matching violet & ruby center in photo)
    const coreCount = Math.floor(count * 0.35);
    for (let i = 0; i < coreCount; i++) {
      const phi = Math.acos(1 - 2 * (i / coreCount));
      const theta = Math.PI * (1 + 5 ** 0.5) * i;
      const speed = 2.4 + Math.random() * 2.8;

      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const hex = coreColors[Math.floor(Math.random() * coreColors.length)];

      this.activeParticles.push({
        pos: origin.clone(),
        vel,
        color: new THREE.Color(hex),
        size: 0.28,
        alpha: 1.0,
        life: 0,
        maxLife: 1.5 + Math.random() * 0.5,
        gravity: -2.0,
        drag: 0.965,
        bounceFloor: false,
      });
    }

    // Layer 2: Main Concentric Chrysanthemum Shell (Outward radiating vivid petals)
    const shellCount = Math.floor(count * 0.52);
    for (let i = 0; i < shellCount; i++) {
      const phi = Math.acos(1 - 2 * (i / shellCount));
      const theta = Math.PI * (1 + 5 ** 0.5) * i;
      const speed = willDroop ? (4.2 + Math.random() * 5.5) : (7.0 + Math.random() * 8.5);

      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const hex = outerColors[Math.floor(Math.random() * outerColors.length)];

      this.activeParticles.push({
        pos: origin.clone(),
        vel,
        color: new THREE.Color(hex),
        size: willDroop ? 0.27 : 0.23,
        alpha: 1.0,
        life: 0,
        maxLife: willDroop ? (2.6 + Math.random() * 1.2) : (1.6 + Math.random() * 0.7),
        gravity: willDroop ? -2.2 : -4.0, // Graceful droop
        drag: 0.965,
        bounceFloor: false,
      });
    }

    // Layer 3: Glittering Cascading Willow Tendrils / Golden Stardust Trails (Matching reference photo)
    const willowCount = Math.floor(count * 0.18);
    for (let w = 0; w < willowCount; w++) {
      const phi = Math.acos(1 - 2 * (w / willowCount));
      const theta = Math.PI * (1 + 5 ** 0.5) * w;
      const speed = 3.2 + Math.random() * 4.8;

      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.8 + 1.2,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      this.activeParticles.push({
        pos: origin.clone(),
        vel,
        color: new THREE.Color(Math.random() > 0.3 ? '#FBBF24' : '#FEF08A'),
        size: 0.22,
        alpha: 1.0,
        life: 0,
        maxLife: 2.2 + Math.random() * 1.0,
        gravity: -2.4,
        drag: 0.95,
        bounceFloor: false,
      });
    }

    // Layer 4: Crackling Strobe Flash Stars in center
    const strobeCount = 45;
    for (let c = 0; c < strobeCount; c++) {
      const cSpeed = 1.0 + Math.random() * 3.5;
      const cAngle = Math.random() * Math.PI * 2;
      this.activeParticles.push({
        pos: origin.clone(),
        vel: new THREE.Vector3(
          Math.cos(cAngle) * cSpeed,
          (Math.random() - 0.5) * cSpeed,
          Math.sin(cAngle) * cSpeed
        ),
        color: new THREE.Color('#FFFFFF'),
        size: 0.3,
        alpha: 1.0,
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
        gravity: -1.2,
        drag: 0.94,
        bounceFloor: false,
      });
    }
  }

  // Update loop called every frame from requestAnimationFrame
  public update(delta: number) {
    const nowSec = performance.now() / 1000;

    // 1. Process Active Cracker Sims
    this.activeSims.forEach((sim) => {
      if (sim.isSpent) return;

      const elapsed = nowSec - sim.placed.stateStartTime;
      const pos = new THREE.Vector3(...sim.placed.position);

      // Light flicker
      if (sim.fuseLight) {
        sim.fuseLight.intensity = 1.5 + Math.sin(nowSec * 35) * 0.8;
      }
      if (sim.burstLight) {
        sim.burstLight.intensity = 3.5 + Math.sin(nowSec * 25) * 1.5;
      }

      // State: Burning Fuse
      if (sim.placed.state === 'burning_fuse') {
        // Emit spark sizzle at fuse tip
        const fuseTip = sim.rootMesh.getObjectByName('fuseTip') || sim.rootMesh.getObjectByName('fuse');
        const tipPos = new THREE.Vector3();
        if (fuseTip) {
          fuseTip.getWorldPosition(tipPos);
        } else {
          tipPos.copy(pos).add(new THREE.Vector3(0, 0.3, 0));
        }

        for (let i = 0; i < 4; i++) {
          this.activeParticles.push({
            pos: tipPos.clone(),
            vel: new THREE.Vector3(
              (Math.random() - 0.5) * 1.2,
              0.8 + Math.random() * 1.2,
              (Math.random() - 0.5) * 1.2
            ),
            color: new THREE.Color('#FDE047'),
            size: 0.08,
            alpha: 1.0,
            life: 0,
            maxLife: 0.25,
            gravity: -4.0,
            drag: 0.95,
            bounceFloor: false,
          });
        }
      }

      // State: Exploding
      if (sim.placed.state === 'exploding') {
        // --- FLOWER POT (ANAAR) ---
        if (sim.def.category === 'flower_pot') {
          const coneTip = pos.clone().add(new THREE.Vector3(0, 0.65 * sim.def.scale, 0));
          // Eruption intensity envelope: grows high, sustains, tapers
          const normProgress = Math.min(1, elapsed / sim.def.durationSeconds);
          const fountainHeightFactor = normProgress < 0.2 ? normProgress / 0.2 : (normProgress > 0.85 ? (1 - normProgress) / 0.15 : 1.0);
          const pRate = Math.floor(25 * fountainHeightFactor);

          const isSilver = sim.def.id === 'anaar_silver';
          const isTricolor = sim.def.id === 'anaar_tricolor';

          for (let i = 0; i < pRate; i++) {
            const spread = 0.28 + Math.random() * 0.15;
            const angle = Math.random() * Math.PI * 2;
            const vSpeed = (4.5 + Math.random() * 5.5) * fountainHeightFactor;

            let colorHex = sim.def.colorScheme[Math.floor(Math.random() * sim.def.colorScheme.length)];
            if (isTricolor) {
              if (normProgress < 0.33) colorHex = '#FF6600'; // Saffron
              else if (normProgress < 0.66) colorHex = '#FFFFFF'; // White
              else colorHex = '#048A25'; // Green
            }

            this.activeParticles.push({
              pos: coneTip.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.04)),
              vel: new THREE.Vector3(
                Math.cos(angle) * spread * vSpeed * 0.35,
                vSpeed,
                Math.sin(angle) * spread * vSpeed * 0.35
              ),
              color: new THREE.Color(colorHex),
              size: isSilver ? (0.12 + Math.random() * 0.12) : (0.15 + Math.random() * 0.1),
              alpha: 1.0,
              life: 0,
              maxLife: 1.2 + Math.random() * 0.8,
              gravity: -9.8,
              drag: 0.98,
              bounceFloor: true,
            });
          }
        }

        // --- GROUND CHAKKAR (WHEEL) - Intense Spinning Fire & Dramatic Lighting ---
        if (sim.def.category === 'ground_chakkar') {
          const disc = sim.rootMesh.getObjectByName('spinningDisc');
          const spinSpeed = 46; // High-velocity realistic angular spin
          if (disc) {
            disc.rotation.y += delta * spinSpeed;
          }

          // Dynamic pulsating roaring fire light
          if (sim.burstLight) {
            sim.burstLight.intensity = 11.0 + Math.sin(nowSec * 28) * 5.0;
            sim.burstLight.position.set(pos.x, pos.y + 0.35, pos.z);
          }

          // Animate ground fiery halo
          const halo = sim.rootMesh.getObjectByName('groundFireHalo') as THREE.Mesh;
          if (halo && halo.material) {
            halo.rotation.z += delta * 12;
            (halo.material as THREE.MeshBasicMaterial).opacity = Math.min(1.0, 0.65 + Math.sin(nowSec * 25) * 0.35);
          }

          // Emissive rim glow pulsation
          const rim = sim.rootMesh.getObjectByName('emissiveRim') as THREE.Mesh;
          if (rim && rim.material) {
            (rim.material as THREE.MeshStandardMaterial).emissiveIntensity = 2.2 + Math.sin(nowSec * 32) * 1.2;
          }

          // Subtle physical haptic rumble during peak spin
          if (this.onScreenShake && Math.random() < 0.1 && elapsed < 5.5) {
            this.onScreenShake(0.16);
          }

          const rimRadius = 0.28 * sim.def.scale;

          // Tier 1: 4 Tangential High-Velocity Jet Flame Streams (spraying from nozzles)
          for (let nozzle = 0; nozzle < 4; nozzle++) {
            const baseTheta = nowSec * spinSpeed + (nozzle * Math.PI * 2) / 4;
            const jetX = pos.x + Math.cos(baseTheta) * rimRadius;
            const jetZ = pos.z + Math.sin(baseTheta) * rimRadius;
            const tangentX = -Math.sin(baseTheta);
            const tangentZ = Math.cos(baseTheta);

            for (let s = 0; s < 7; s++) {
              const speed = 7.5 + Math.random() * 5.0;
              const spread = (Math.random() - 0.5) * 0.35;
              const colorHex = sim.def.colorScheme[Math.floor(Math.random() * sim.def.colorScheme.length)];

              this.activeParticles.push({
                pos: new THREE.Vector3(jetX, 0.03 + Math.random() * 0.02, jetZ),
                vel: new THREE.Vector3(
                  (tangentX + spread) * speed,
                  0.25 + Math.random() * 0.8,
                  (tangentZ + spread) * speed
                ),
                color: new THREE.Color(colorHex),
                size: 0.16 + Math.random() * 0.1,
                alpha: 1.0,
                life: 0,
                maxLife: 0.5 + Math.random() * 0.35,
                gravity: -4.5,
                drag: 0.94,
                bounceFloor: true,
              });
            }
          }

          // Tier 2: Blazing Molten Inner Spiral Core (white-yellow hot sparks near center)
          for (let i = 0; i < 16; i++) {
            const r = (0.04 + Math.random() * 0.14) * sim.def.scale;
            const a = nowSec * spinSpeed * 0.8 + Math.random() * Math.PI * 2;
            const spd = 2.0 + Math.random() * 3.5;
            this.activeParticles.push({
              pos: new THREE.Vector3(pos.x + Math.cos(a) * r, 0.035, pos.z + Math.sin(a) * r),
              vel: new THREE.Vector3(-Math.sin(a) * spd, 0.4 + Math.random() * 1.2, Math.cos(a) * spd),
              color: new THREE.Color(Math.random() > 0.4 ? '#FFFBEB' : '#FEF08A'),
              size: 0.14,
              alpha: 1.0,
              life: 0,
              maxLife: 0.35,
              gravity: -3.0,
              drag: 0.96,
              bounceFloor: false,
            });
          }

          // Tier 3: Floor Skimming Golden Embers (long-lived embers creating glowing outer spiral rings)
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 6.0 + Math.random() * 4.5;
            this.activeParticles.push({
              pos: new THREE.Vector3(pos.x + Math.cos(a) * rimRadius, 0.02, pos.z + Math.sin(a) * rimRadius),
              vel: new THREE.Vector3(-Math.sin(a) * spd, 0.05, Math.cos(a) * spd),
              color: new THREE.Color('#F59E0B'),
              size: 0.12,
              alpha: 1.0,
              life: 0,
              maxLife: 0.75 + Math.random() * 0.3,
              gravity: -1.0,
              drag: 0.96,
              bounceFloor: true,
            });
          }

          // Tier 4: Swirling Smoke Ring Puffs
          if (Math.random() < 0.4) {
            const a = Math.random() * Math.PI * 2;
            this.activeParticles.push({
              pos: new THREE.Vector3(pos.x + Math.cos(a) * (rimRadius + 0.3), 0.05, pos.z + Math.sin(a) * (rimRadius + 0.3)),
              vel: new THREE.Vector3(-Math.sin(a) * 1.5, 0.6 + Math.random() * 0.8, Math.cos(a) * 1.5),
              color: new THREE.Color(0.25, 0.22, 0.2),
              size: 0.35 + Math.random() * 0.25,
              alpha: 0.5,
              life: 0,
              maxLife: 1.8,
              gravity: 0.3,
              drag: 0.96,
              bounceFloor: false,
            });
          }
        }

        // --- GARLAND (LADI) - Continuous Violent Chain Reaction, Flying Confetti & Climax Boom ---
        if (sim.def.category === 'garland') {
          const totalDuration = sim.def.durationSeconds;
          const count = sim.def.burstCount || 120;
          const ratePerSec = count / totalDuration;
          const currentExpectedIndex = Math.floor(elapsed * ratePerSec);

          const isMega = sim.def.id === 'garland_5000';
          const pairCount = isMega ? 42 : 26;
          const garlandLen = isMega ? 2.0 : 1.3;

          if (sim.nextGarlandIndex !== undefined && sim.nextGarlandIndex < currentExpectedIndex) {
            sim.nextGarlandIndex = currentExpectedIndex;
            const progress = Math.min(1.0, currentExpectedIndex / count);

            // Calculate current burning point along the serpentine spline
            const pairIdx = Math.floor(progress * (pairCount - 1));
            const step = garlandLen / pairCount;
            const burstX = pos.x + (pairIdx - pairCount / 2) * step;
            const burstZ = pos.z + Math.sin((pairIdx / (pairCount - 1)) * Math.PI * 3.2) * 0.14;
            const burstPos = new THREE.Vector3(burstX, 0.035, burstZ);

            // Move roving burst light along burning front & create strobe flashes
            if (sim.burstLight) {
              sim.burstLight.position.copy(burstPos);
              sim.burstLight.position.y += 0.2;
              sim.burstLight.intensity = Math.random() > 0.4 ? 14.0 : 2.0; // Strobe effect
              sim.burstLight.color.set(Math.random() > 0.3 ? '#FEF08A' : '#EF4444');
            }

            // Disintegrate/Hide the corresponding cracker meshes in 3D scene
            const crackerL = sim.rootMesh.getObjectByName(`cracker_seg_${pairIdx}_l`);
            const crackerR = sim.rootMesh.getObjectByName(`cracker_seg_${pairIdx}_r`);
            if (crackerL) crackerL.visible = false;
            if (crackerR) crackerR.visible = false;

            // 1. Pop Flash Sparks (intense spherical firecracker burst)
            for (let k = 0; k < 22; k++) {
              const ang = Math.random() * Math.PI * 2;
              const elev = (Math.random() - 0.2) * Math.PI;
              const spd = 2.0 + Math.random() * 4.5;
              this.activeParticles.push({
                pos: burstPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.04)),
                vel: new THREE.Vector3(
                  Math.cos(ang) * Math.cos(elev) * spd,
                  Math.sin(elev) * spd + 1.2,
                  Math.sin(ang) * Math.cos(elev) * spd
                ),
                color: new THREE.Color(k % 3 === 0 ? '#FFFFFF' : (k % 2 === 0 ? '#FEF08A' : '#DC2626')),
                size: 0.15,
                alpha: 1.0,
                life: 0,
                maxLife: 0.35 + Math.random() * 0.2,
                gravity: -8.5,
                drag: 0.95,
                bounceFloor: true,
              });
            }

            // 2. Flying Red Paper Confetti (shredded red wrappers tumbling into air)
            for (let c = 0; c < 8; c++) {
              const cAng = Math.random() * Math.PI * 2;
              const cSpd = 1.2 + Math.random() * 2.8;
              this.activeParticles.push({
                pos: burstPos.clone(),
                vel: new THREE.Vector3(
                  Math.cos(cAng) * cSpd,
                  1.5 + Math.random() * 2.5,
                  Math.sin(cAng) * cSpd
                ),
                color: new THREE.Color(Math.random() > 0.2 ? '#DC2626' : '#991B1B'),
                size: 0.18 + Math.random() * 0.1,
                alpha: 1.0,
                life: 0,
                maxLife: 1.2 + Math.random() * 0.6,
                gravity: -4.0, // floats down like paper
                drag: 0.92,
                bounceFloor: true,
              });
            }

            // 3. Dense Rolling Diwali Smoke Cloud
            for (let m = 0; m < 3; m++) {
              this.activeParticles.push({
                pos: burstPos.clone(),
                vel: new THREE.Vector3(
                  (Math.random() - 0.5) * 0.8,
                  0.5 + Math.random() * 0.8,
                  (Math.random() - 0.5) * 0.8
                ),
                color: new THREE.Color(0.85, 0.85, 0.85),
                size: 0.35 + Math.random() * 0.3,
                alpha: 0.65,
                life: 0,
                maxLife: 2.2 + Math.random() * 1.0,
                gravity: 0.2, // slow rising smoke haze
                drag: 0.95,
                bounceFloor: false,
              });
            }

            // Climax finale detonation at the end of the chain!
            if (progress >= 0.98) {
              const bigBomb = sim.rootMesh.getObjectByName('climaxBigBomb');
              if (bigBomb && bigBomb.visible) {
                bigBomb.visible = false;
                const endPos = burstPos.clone().add(new THREE.Vector3(0.14, 0.1, 0));

                // Huge shockwave flash
                for (let b = 0; b < 240; b++) {
                  const bAng = Math.random() * Math.PI * 2;
                  const bElev = Math.random() * Math.PI;
                  const bSpd = 4.0 + Math.random() * 9.0;
                  this.activeParticles.push({
                    pos: endPos.clone(),
                    vel: new THREE.Vector3(
                      Math.cos(bAng) * Math.cos(bElev) * bSpd,
                      Math.sin(bElev) * bSpd,
                      Math.sin(bAng) * Math.cos(bElev) * bSpd
                    ),
                    color: new THREE.Color(b % 2 === 0 ? '#FEF08A' : '#EF4444'),
                    size: 0.22,
                    alpha: 1.0,
                    life: 0,
                    maxLife: 0.9 + Math.random() * 0.6,
                    gravity: -7.0,
                    drag: 0.95,
                    bounceFloor: true,
                  });
                }

                if (this.onScreenShake) {
                  this.onScreenShake(0.85);
                }
              }
            }
          }
        }

        // --- ROCKET ---
        if (sim.def.category === 'rocket' && sim.aerialRockets) {
          for (const rkt of sim.aerialRockets) {
            if (!rkt.burstDone) {
              const ascentElapsed = nowSec - rkt.launchTime;
              const ascentProgress = Math.min(1, ascentElapsed / (sim.def.burstDelaySec || 2.1));

              // Ascend rocket model upward
              const curY = rkt.initialPos.y + ascentProgress * rkt.targetApex;
              rkt.mesh.position.y = curY;
              rkt.mesh.position.x = rkt.initialPos.x + Math.sin(ascentProgress * Math.PI) * rkt.angleZ * 4;

              // Tail exhaust sparks
              const exhaustPos = new THREE.Vector3();
              rkt.mesh.getWorldPosition(exhaustPos);
              exhaustPos.y -= 0.3;

              for (let k = 0; k < 6; k++) {
                this.activeParticles.push({
                  pos: exhaustPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05)),
                  vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, -2.5 - Math.random() * 2.0, (Math.random() - 0.5) * 0.8),
                  color: new THREE.Color('#F59E0B'),
                  size: 0.12,
                  alpha: 1.0,
                  life: 0,
                  maxLife: 0.4,
                  gravity: -4.0,
                  drag: 0.95,
                  bounceFloor: false,
                });
              }

              // Detonation at apex
              if (ascentProgress >= 1.0) {
                rkt.burstDone = true;
                rkt.mesh.visible = false;
                const isTitanium = sim.def.id === 'rocket_titanium';
                this.triggerAerialSkyburst(rkt.mesh.position.clone(), sim.def.colorScheme, 320, isTitanium);
                if (this.onScreenShake) this.onScreenShake(0.6);
              }
            }
          }
        }

        // --- AERIAL SHOT CAKE ---
        if (sim.def.category === 'aerial_cake' && sim.cakeVolleys) {
          for (const volley of sim.cakeVolleys) {
            if (!volley.exploded && elapsed >= volley.launchTime) {
              volley.exploded = true;
              fireworkAudio.playMortarThump();

              const startPos = pos.clone().add(new THREE.Vector3(0, 0.35, 0));
              const apex = volley.apexPos;
              const flightTime = 0.94; // Graceful soaring high-altitude ascent

              // 1. Muzzle Flash & Smoke at cake mortar tube opening
              for (let m = 0; m < 16; m++) {
                const spd = 3.0 + Math.random() * 4.5;
                const mAngle = Math.random() * Math.PI * 2;
                this.activeParticles.push({
                  pos: startPos.clone(),
                  vel: new THREE.Vector3(
                    Math.cos(mAngle) * 0.45,
                    spd,
                    Math.sin(mAngle) * 0.45
                  ),
                  color: new THREE.Color(Math.random() > 0.4 ? '#F59E0B' : '#FEF08A'),
                  size: 0.18 + Math.random() * 0.08,
                  alpha: 1.0,
                  life: 0,
                  maxLife: 0.25 + Math.random() * 0.15,
                  gravity: -6.0,
                  drag: 0.94,
                  bounceFloor: false,
                });
              }

              // Muzzle smoke puff
              for (let s = 0; s < 7; s++) {
                this.activeParticles.push({
                  pos: startPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.1, (Math.random() - 0.5) * 0.1)),
                  vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.7, (Math.random() - 0.5) * 0.6),
                  color: new THREE.Color(0.3, 0.28, 0.26),
                  size: 0.3,
                  alpha: 0.7,
                  life: 0,
                  maxLife: 0.9,
                  gravity: 0.2,
                  drag: 0.95,
                  bounceFloor: false,
                });
              }

              // 2. Animate Luminous Comet Tracer rising with streaming tail
              const tracerStart = nowSec;
              const updateTracer = () => {
                const trElapsed = performance.now() / 1000 - tracerStart;
                const frac = Math.min(1, trElapsed / flightTime);
                const curPos = startPos.clone().lerp(apex, frac);
                // Graceful high-altitude ballistic parabola
                curPos.y += Math.sin(frac * Math.PI) * 1.5;

                // Blazing incandescent comet core
                this.activeParticles.push({
                  pos: curPos.clone(),
                  vel: new THREE.Vector3((Math.random() - 0.5) * 0.15, -0.2, (Math.random() - 0.5) * 0.15),
                  color: new THREE.Color('#FFFFFF'),
                  size: 0.25,
                  alpha: 1.0,
                  life: 0,
                  maxLife: 0.28,
                  gravity: -1.0,
                  drag: 0.96,
                  bounceFloor: false,
                });

                // Streaming golden spark trail (3-4 sparks per frame)
                for (let k = 0; k < 4; k++) {
                  this.activeParticles.push({
                    pos: curPos.clone(),
                    vel: new THREE.Vector3(
                      (Math.random() - 0.5) * 0.6,
                      -1.4 - Math.random() * 1.6,
                      (Math.random() - 0.5) * 0.6
                    ),
                    color: new THREE.Color(Math.random() > 0.3 ? volley.color : '#FDE047'),
                    size: 0.15,
                    alpha: 1.0,
                    life: 0,
                    maxLife: 0.5,
                    gravity: -3.0,
                    drag: 0.94,
                    bounceFloor: false,
                  });
                }

                if (frac < 1.0) {
                  requestAnimationFrame(updateTracer);
                } else {
                  // 3. High-Altitude Multi-Layer Celestial Skyburst
                  const isGrand = sim.def.id === 'cake_grand_25';
                  fireworkAudio.playAerialBurst(isGrand ? 'grand' : 'medium');
                  this.triggerAerialSkyburst(
                    apex,
                    volley.outerColors,
                    isGrand ? 480 : 380,
                    volley.isWillow,
                    {
                      coreColors: volley.coreColors,
                      outerColors: volley.outerColors,
                      isWillow: volley.isWillow,
                    }
                  );
                  if (this.onScreenShake) this.onScreenShake(0.55);
                }
              };
              requestAnimationFrame(updateTracer);
            }
          }
        }
      }
    });

    // 2. Interactive Sparkler (Phuljhadi) tool
    if (this.isSparklerActive) {
      fireworkAudio.playSparklerSpark();
      for (let i = 0; i < 7; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.8 + Math.random() * 1.5;
        this.activeParticles.push({
          pos: this.sparklerPosition.clone(),
          vel: new THREE.Vector3(
            Math.cos(ang) * spd,
            (Math.random() - 0.5) * 1.5,
            Math.sin(ang) * spd
          ),
          color: new THREE.Color(Math.random() > 0.3 ? '#FDE047' : '#F59E0B'),
          size: 0.1,
          alpha: 1.0,
          life: 0,
          maxLife: 0.28,
          gravity: -5.0,
          drag: 0.96,
          bounceFloor: false,
        });
      }
    }

    // 3. Update & Recycle All Active Particles
    let pIdx = 0;
    const len = this.activeParticles.length;

    for (let i = len - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life += delta;

      if (p.life >= p.maxLife || pIdx >= this.maxGlobalParticles) {
        // Fast swap-pop removal
        this.activeParticles[i] = this.activeParticles[this.activeParticles.length - 1];
        this.activeParticles.pop();
        continue;
      }

      // Physics integration
      p.vel.y += p.gravity * delta;
      p.vel.x *= p.drag;
      p.vel.z *= p.drag;

      p.pos.x += p.vel.x * delta;
      p.pos.y += p.vel.y * delta;
      p.pos.z += p.vel.z * delta;

      // Floor bounce for grounded sparks
      if (p.bounceFloor && p.pos.y < 0.01) {
        p.pos.y = 0.01;
        p.vel.y = -p.vel.y * 0.4;
        p.vel.x *= 0.7;
        p.vel.z *= 0.7;
      }

      const lifeFrac = p.life / p.maxLife;
      const alpha = 1.0 - lifeFrac;

      // Write into BufferAttributes
      const i3 = pIdx * 3;
      this.positions[i3] = p.pos.x;
      this.positions[i3 + 1] = p.pos.y;
      this.positions[i3 + 2] = p.pos.z;

      this.colors[i3] = p.color.r * alpha;
      this.colors[i3 + 1] = p.color.g * alpha;
      this.colors[i3 + 2] = p.color.b * alpha;

      this.sizes[pIdx] = p.size * (1.0 - lifeFrac * 0.5);

      pIdx++;
    }

    // Clear unused buffer elements
    for (let j = pIdx; j < this.maxGlobalParticles; j++) {
      const j3 = j * 3;
      this.positions[j3] = 0;
      this.positions[j3 + 1] = -1000; // park offscreen
      this.positions[j3 + 2] = 0;
      this.sizes[j] = 0;
    }

    if (this.pointsMesh) {
      const geo = this.pointsMesh.geometry;
      geo.attributes.position.needsUpdate = true;
      geo.attributes.color.needsUpdate = true;
      geo.attributes.size.needsUpdate = true;
    }
  }

  // Register a new placed cracker
  public registerCracker(placed: PlackerInstance, def: CrackerDefinition, rootMesh: THREE.Group) {
    this.activeSims.set(placed.instanceId, {
      placed,
      def,
      rootMesh,
      particles: [],
      startTime: performance.now() / 1000,
      isSpent: false,
    });
  }

  // Remove a cracker instance
  public unregisterCracker(instanceId: string) {
    const sim = this.activeSims.get(instanceId);
    if (sim) {
      if (sim.fuseLight) this.scene.remove(sim.fuseLight);
      if (sim.burstLight) this.scene.remove(sim.burstLight);
      if (sim.soundStopper) sim.soundStopper();
      this.scene.remove(sim.rootMesh);
      this.activeSims.delete(instanceId);
    }
  }

  // Clear all spent crackers
  public clearAllSpent() {
    this.activeSims.forEach((sim, id) => {
      if (sim.isSpent) {
        this.unregisterCracker(id);
      }
    });
  }

  // Clear everything
  public clearAll() {
    this.activeSims.forEach((_, id) => {
      this.unregisterCracker(id);
    });
    this.activeParticles = [];
  }
}

export type PlackerInstance = PlacedCracker;
