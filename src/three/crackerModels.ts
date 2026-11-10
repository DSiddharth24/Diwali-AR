/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { CrackerDefinition } from '../types/crackers';

// Helper to generate procedural canvas texture for cracker wrappers
function createCrackerWrapperTexture(
  primaryColor: string,
  accentColor: string,
  title: string,
  subtext: string,
  pattern: 'stripes' | 'spiral' | 'mandala' | 'twine' = 'mandala'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = primaryColor;
  ctx.fillRect(0, 0, 512, 512);

  // Decorative pattern
  if (pattern === 'mandala') {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    for (let r = 20; r <= 220; r += 24) {
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Petals
    ctx.fillStyle = accentColor;
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      const x = 256 + Math.cos(angle) * 160;
      const y = 256 + Math.sin(angle) * 160;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'spiral') {
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 14;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 10; a += 0.1) {
      const r = a * 15;
      const x = 256 + Math.cos(a) * r;
      const y = 256 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else if (pattern === 'twine') {
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 4;
    for (let y = 0; y < 512; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + (Math.sin(y * 0.1) * 8));
      ctx.stroke();
    }
    for (let x = 0; x < 512; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.cos(x * 0.1) * 8), 512);
      ctx.stroke();
    }
  }

  // Border accents
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, 512, 24);
  ctx.fillRect(0, 488, 512, 24);

  // Label Banner
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(20, 200, 472, 112);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 200, 472, 112);

  // Text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 250);

  ctx.fillStyle = '#FBBF24';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(subtext, 256, 288);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Procedural Contact Shadow
function createContactShadow(radius: number = 0.4): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.65)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.3)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.002;
  return mesh;
}

// 1. Build Flower Pot (Anaar) 3D Model
export function buildAnaarModel(def: CrackerDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `anaar_${def.id}`;

  const isSilver = def.id === 'anaar_silver';
  const mainCol = isSilver ? '#38BDF8' : '#D97706';
  const accentCol = isSilver ? '#E0F2FE' : '#FFD700';

  const wrapperTex = createCrackerWrapperTexture(mainCol, accentCol, def.name, 'SPECIAL FLOWER POT', 'mandala');

  // Part 1: Terracotta Clay Base Stand
  const baseGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.04, 32);
  const baseMat = new THREE.MeshStandardMaterial({
    color: '#854D0E',
    roughness: 0.85,
    metalness: 0.08,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.02;
  baseMesh.castShadow = true;
  group.add(baseMesh);

  // Part 2: Conical Main Body (The Anaar Cone)
  const coneGeo = new THREE.ConeGeometry(0.22, 0.6, 32, 1, true);
  const coneMat = new THREE.MeshStandardMaterial({
    map: wrapperTex,
    roughness: 0.35,
    metalness: 0.25,
  });
  const coneMesh = new THREE.Mesh(coneGeo, coneMat);
  coneMesh.position.y = 0.34;
  coneMesh.castShadow = true;
  group.add(coneMesh);

  // Part 3: Gold Foil Collar Base Trim
  const collarGeo = new THREE.TorusGeometry(0.22, 0.02, 12, 32);
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#F59E0B',
    roughness: 0.2,
    metalness: 0.85,
  });
  const collarMesh = new THREE.Mesh(collarGeo, goldMat);
  collarMesh.rotation.x = Math.PI / 2;
  collarMesh.position.y = 0.04;
  group.add(collarMesh);

  // Part 4: Top Neck / Ejection Choke Ring
  const neckGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.05, 24);
  const neckMesh = new THREE.Mesh(neckGeo, goldMat);
  neckMesh.position.y = 0.65;
  group.add(neckMesh);

  // Part 5: Fuse Cord (Coiled top stem)
  const fuseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.66, 0),
    new THREE.Vector3(0.02, 0.72, 0.01),
    new THREE.Vector3(0.01, 0.78, -0.01),
  ]);
  const fuseGeo = new THREE.TubeGeometry(fuseCurve, 16, 0.007, 8, false);
  const fuseMat = new THREE.MeshStandardMaterial({
    color: '#78350F',
    roughness: 0.9,
    metalness: 0.0,
  });
  const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
  fuseMesh.name = 'fuse';
  group.add(fuseMesh);

  // Part 6: Red Sulfur Fuse Tip
  const tipGeo = new THREE.SphereGeometry(0.012, 12, 12);
  const tipMat = new THREE.MeshStandardMaterial({
    color: '#EF4444',
    emissive: '#B91C1C',
    emissiveIntensity: 0.4,
    roughness: 0.5,
  });
  const tipMesh = new THREE.Mesh(tipGeo, tipMat);
  tipMesh.name = 'fuseTip';
  tipMesh.position.set(0.01, 0.78, -0.01);
  group.add(tipMesh);

  // Ground Contact Shadow
  group.add(createContactShadow(0.35));

  group.scale.setScalar(def.scale);
  return group;
}

// 2. Build Ground Chakkar / Wheel 3D Model
export function buildChakkarModel(def: CrackerDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `chakkar_${def.id}`;

  const isRainbow = def.id === 'chakkar_rainbow';
  const mainCol = isRainbow ? '#059669' : '#DC2626';
  const accentCol = isRainbow ? '#F59E0B' : '#FDE047';
  const wheelTex = createCrackerWrapperTexture(mainCol, accentCol, 'CHAKKAR', 'VISHNU WHEEL', 'spiral');

  // Part 1: Outer Flat Beveled Disc
  const discGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.04, 48);
  const discMat = new THREE.MeshStandardMaterial({
    map: wheelTex,
    roughness: 0.25,
    metalness: 0.35,
  });
  const discMesh = new THREE.Mesh(discGeo, discMat);
  discMesh.name = 'spinningDisc';
  discMesh.position.y = 0.025;
  discMesh.castShadow = true;
  group.add(discMesh);

  // Part 2: Glowing Emissive Fiery Rim
  const rimGeo = new THREE.TorusGeometry(0.27, 0.018, 16, 48);
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#FF6B00',
    emissive: '#FF4500',
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.025;
  rimMesh.name = 'emissiveRim';
  discMesh.add(rimMesh);

  // Part 3: Metallic Center Pivot Rivet
  const rivetGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.055, 20);
  const brassMat = new THREE.MeshStandardMaterial({
    color: '#D97706',
    metalness: 0.95,
    roughness: 0.15,
  });
  const rivetMesh = new THREE.Mesh(rivetGeo, brassMat);
  rivetMesh.position.y = 0.045;
  group.add(rivetMesh);

  // Part 4: Tangential High-Velocity Jet Nozzles (4 rocket thruster exhaust ports)
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI * 2) / 4;
    const jetGeo = new THREE.CylinderGeometry(0.016, 0.02, 0.05, 16);
    const jetMat = new THREE.MeshStandardMaterial({ color: '#78350F', metalness: 0.8, roughness: 0.3 });
    const jetMesh = new THREE.Mesh(jetGeo, jetMat);
    jetMesh.rotation.z = Math.PI / 2;
    jetMesh.rotation.y = angle;
    jetMesh.position.set(Math.cos(angle) * 0.24, 0.025, Math.sin(angle) * 0.24);

    // Glowing orange interior nozzle core
    const flameCoreGeo = new THREE.SphereGeometry(0.012, 10, 10);
    const flameCoreMat = new THREE.MeshBasicMaterial({ color: '#FFFBEB' });
    const flameCore = new THREE.Mesh(flameCoreGeo, flameCoreMat);
    flameCore.position.x = 0.025;
    jetMesh.add(flameCore);

    discMesh.add(jetMesh);
  }

  // Part 5: Ground Fiery Halo / Spinning Scorched Ring
  const ringCanvas = document.createElement('canvas');
  ringCanvas.width = 256;
  ringCanvas.height = 256;
  const rCtx = ringCanvas.getContext('2d')!;
  const rGrad = rCtx.createRadialGradient(128, 128, 40, 128, 128, 126);
  rGrad.addColorStop(0, 'rgba(255, 220, 120, 0)');
  rGrad.addColorStop(0.5, 'rgba(255, 120, 0, 0.85)');
  rGrad.addColorStop(0.8, 'rgba(255, 60, 0, 0.45)');
  rGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  rCtx.fillStyle = rGrad;
  rCtx.fillRect(0, 0, 256, 256);
  const ringTex = new THREE.CanvasTexture(ringCanvas);
  ringTex.colorSpace = THREE.SRGBColorSpace;

  const groundFireGeo = new THREE.PlaneGeometry(1.6, 1.6);
  const groundFireMat = new THREE.MeshBasicMaterial({
    map: ringTex,
    transparent: true,
    opacity: 0.0, // starts invisible, flares up during spin in particleEngine!
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const groundFireMesh = new THREE.Mesh(groundFireGeo, groundFireMat);
  groundFireMesh.rotation.x = -Math.PI / 2;
  groundFireMesh.position.y = 0.008;
  groundFireMesh.name = 'groundFireHalo';
  group.add(groundFireMesh);

  // Center Lighting Fuse
  const fuseGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8);
  const fuseMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.9 });
  const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
  fuseMesh.name = 'fuse';
  fuseMesh.position.set(0.04, 0.06, 0);
  fuseMesh.rotation.z = 0.4;
  group.add(fuseMesh);

  // Contact Shadow
  group.add(createContactShadow(0.42));

  group.scale.setScalar(def.scale);
  return group;
}

// 3. Build Garland (Ladi) 3D Model - Reworked with dense double-row serpentine segments & destructible crackers
export function buildGarlandModel(def: CrackerDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `garland_${def.id}`;

  const isMega = def.id === 'garland_5000';
  const pairCount = isMega ? 42 : 26; // 52 to 84 individual firecrackers in interlocking pairs!

  // Shared Materials
  const redMat = new THREE.MeshStandardMaterial({
    color: '#DC2626',
    roughness: 0.35,
    metalness: 0.15,
  });
  const goldBandMat = new THREE.MeshStandardMaterial({
    color: '#F59E0B',
    roughness: 0.2,
    metalness: 0.85,
  });
  const greenFuseMat = new THREE.MeshStandardMaterial({
    color: '#15803D',
    roughness: 0.85,
    metalness: 0.0,
  });

  const bodyGroup = new THREE.Group();
  bodyGroup.name = 'garlandSegments';

  const crackerGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.11, 14);
  const bandGeo = new THREE.CylinderGeometry(0.0165, 0.0165, 0.024, 14);

  const length = isMega ? 2.0 : 1.3;
  const step = length / pairCount;
  const splinePoints: THREE.Vector3[] = [];

  // Generate authentic serpentine S-curve layout
  for (let i = 0; i < pairCount; i++) {
    const t = i / (pairCount - 1);
    const x = (i - pairCount / 2) * step;
    // Winding snake curve along floor
    const z = Math.sin(t * Math.PI * 3.2) * 0.14;
    splinePoints.push(new THREE.Vector3(x, 0.022, z));

    // Pair of interlocking crackers (Left & Right)
    for (let side = -1; side <= 1; side += 2) {
      const crackerMesh = new THREE.Mesh(crackerGeo, redMat);
      crackerMesh.name = `cracker_seg_${i}_${side > 0 ? 'r' : 'l'}`;
      crackerMesh.rotation.x = Math.PI / 2;
      crackerMesh.rotation.z = (Math.PI / 2) + side * 0.45 + (Math.random() - 0.5) * 0.15;
      crackerMesh.position.set(x + (Math.random() - 0.5) * 0.01, 0.018, z + side * 0.05);
      crackerMesh.castShadow = true;

      const bandMesh = new THREE.Mesh(bandGeo, goldBandMat);
      crackerMesh.add(bandMesh);

      bodyGroup.add(crackerMesh);
    }
  }
  group.add(bodyGroup);

  // Central Braided Green Fuse Rope running through all segments
  const ropeCurve = new THREE.CatmullRomCurve3(splinePoints);
  const ropeGeo = new THREE.TubeGeometry(ropeCurve, 64, 0.007, 8, false);
  const ropeMesh = new THREE.Mesh(ropeGeo, greenFuseMat);
  ropeMesh.name = 'garlandRope';
  group.add(ropeMesh);

  // Big Red Climax "Grand Finale Bomb" at the tail end
  const bigBombGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.24, 20);
  const bigBombMesh = new THREE.Mesh(bigBombGeo, redMat);
  bigBombMesh.name = 'climaxBigBomb';
  bigBombMesh.rotation.x = Math.PI / 2;
  const lastPt = splinePoints[splinePoints.length - 1];
  bigBombMesh.position.set(lastPt.x + 0.14, 0.045, lastPt.z);
  bigBombMesh.castShadow = true;

  const bigBandMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.05, 20), goldBandMat);
  bigBombMesh.add(bigBandMesh);

  // Red paper tassels on the climax bomb
  const tasselGeo = new THREE.ConeGeometry(0.035, 0.08, 12);
  const tasselMat = new THREE.MeshStandardMaterial({ color: '#991B1B', roughness: 0.6 });
  const tasselMesh = new THREE.Mesh(tasselGeo, tasselMat);
  tasselMesh.rotation.z = Math.PI / 2;
  tasselMesh.position.set(0.14, 0, 0);
  bigBombMesh.add(tasselMesh);

  group.add(bigBombMesh);

  // Lead Fuse at starting end
  const firstPt = splinePoints[0];
  const startFuseGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.14, 8);
  const startFuse = new THREE.Mesh(startFuseGeo, greenFuseMat);
  startFuse.name = 'fuse';
  startFuse.position.set(firstPt.x - 0.06, 0.05, firstPt.z);
  startFuse.rotation.z = -0.55;
  group.add(startFuse);

  // Contact Shadow
  group.add(createContactShadow(isMega ? 1.2 : 0.85));

  group.scale.setScalar(def.scale);
  return group;
}

// 4. Build Atom Bomb & Hydro Bomb 3D Model
export function buildBombModel(def: CrackerDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `bomb_${def.id}`;

  const isHydro = def.id === 'bomb_hydro';
  const twineTex = createCrackerWrapperTexture(
    isHydro ? '#0E7490' : '#15803D',
    '#F59E0B',
    isHydro ? 'HYDRO BOMB' : 'ATOM BOMB',
    'EXTREME BLAST',
    'twine'
  );

  // Part 1: Heavy Jute-Twine Wrapped Explosive Body
  const bodyGeo = new THREE.BoxGeometry(0.18, 0.16, 0.18);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: twineTex,
    roughness: 0.8,
    metalness: 0.1,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.y = 0.08;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // Part 2: Red Hazard Center Seal
  const sealGeo = new THREE.BoxGeometry(0.184, 0.04, 0.184);
  const sealMat = new THREE.MeshStandardMaterial({
    color: '#DC2626',
    roughness: 0.4,
    metalness: 0.2,
  });
  const sealMesh = new THREE.Mesh(sealGeo, sealMat);
  sealMesh.position.y = 0.08;
  group.add(sealMesh);

  // Part 3: Woven Hemp Top Knot
  const knotGeo = new THREE.TorusGeometry(0.03, 0.012, 10, 16);
  const knotMat = new THREE.MeshStandardMaterial({ color: '#B45309', roughness: 0.9 });
  const knotMesh = new THREE.Mesh(knotGeo, knotMat);
  knotMesh.rotation.x = Math.PI / 2;
  knotMesh.position.y = 0.165;
  group.add(knotMesh);

  // Part 4: Thick Burning Fuse
  const fuseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.165, 0),
    new THREE.Vector3(0.02, 0.24, 0.01),
    new THREE.Vector3(-0.01, 0.32, -0.01),
  ]);
  const fuseGeo = new THREE.TubeGeometry(fuseCurve, 16, 0.008, 8, false);
  const fuseMat = new THREE.MeshStandardMaterial({ color: '#78350F', roughness: 0.9 });
  const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
  fuseMesh.name = 'fuse';
  group.add(fuseMesh);

  // Fuse glowing tip
  const tipGeo = new THREE.SphereGeometry(0.014, 12, 12);
  const tipMat = new THREE.MeshStandardMaterial({
    color: '#EF4444',
    emissive: '#B91C1C',
    emissiveIntensity: 0.5,
  });
  const tipMesh = new THREE.Mesh(tipGeo, tipMat);
  tipMesh.name = 'fuseTip';
  tipMesh.position.set(-0.01, 0.32, -0.01);
  group.add(tipMesh);

  // Contact Shadow
  group.add(createContactShadow(0.25));

  group.scale.setScalar(def.scale);
  return group;
}

// 5. Build Sky Rocket 3D Model
export function buildRocketModel(def: CrackerDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `rocket_${def.id}`;

  const isTitanium = def.id === 'rocket_titanium';
  const wrapperTex = createCrackerWrapperTexture(
    isTitanium ? '#4F46E5' : '#B91C1C',
    '#F59E0B',
    isTitanium ? 'TITANIUM' : 'MOON ROCKET',
    'SKY HIGH BURST',
    'mandala'
  );

  // Stand/Base: Ceramic Bottle or Launch Stand
  const bottleGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.35, 24);
  const bottleMat = new THREE.MeshStandardMaterial({
    color: '#334155',
    roughness: 0.3,
    metalness: 0.3,
  });
  const bottleMesh = new THREE.Mesh(bottleGeo, bottleMat);
  bottleMesh.position.y = 0.175;
  bottleMesh.castShadow = true;
  group.add(bottleMesh);

  // Rocket Projectile Group (which ascends upon launch!)
  const projectile = new THREE.Group();
  projectile.name = 'rocketProjectile';
  // Slanted slightly for realistic launch
  projectile.rotation.z = -0.08;
  projectile.position.y = 0.2;

  // Part 1: Long Bamboo Stabilizer Stick
  const stickGeo = new THREE.CylinderGeometry(0.008, 0.008, 1.1, 8);
  const stickMat = new THREE.MeshStandardMaterial({ color: '#D97706', roughness: 0.85 });
  const stickMesh = new THREE.Mesh(stickGeo, stickMat);
  stickMesh.position.set(-0.02, 0.45, 0);
  projectile.add(stickMesh);

  // Part 2: Rocket Motor Cylinder
  const bodyGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.38, 24);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: wrapperTex,
    roughness: 0.35,
    metalness: 0.2,
  });
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.position.set(0, 0.75, 0);
  bodyMesh.castShadow = true;
  projectile.add(bodyMesh);

  // Part 3: Golden Aerodynamic Nose Cone
  const coneGeo = new THREE.ConeGeometry(0.05, 0.18, 24);
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#F59E0B',
    metalness: 0.8,
    roughness: 0.2,
  });
  const coneMesh = new THREE.Mesh(coneGeo, goldMat);
  coneMesh.position.set(0, 1.03, 0);
  projectile.add(coneMesh);

  // Part 4: Nozzle Rim
  const nozzleGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.04, 16);
  const nozzleMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5 });
  const nozzleMesh = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzleMesh.position.set(0, 0.54, 0);
  projectile.add(nozzleMesh);

  // Part 5: Hanging Green Fuse
  const fuseGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.12, 8);
  const fuseMat = new THREE.MeshStandardMaterial({ color: '#16A34A', roughness: 0.9 });
  const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
  fuseMesh.name = 'fuse';
  fuseMesh.position.set(0, 0.46, 0.02);
  fuseMesh.rotation.x = 0.3;
  projectile.add(fuseMesh);

  group.add(projectile);

  // Contact Shadow
  group.add(createContactShadow(0.28));

  group.scale.setScalar(def.scale);
  return group;
}

// 6. Build Aerial Shot Cake 3D Model
export function buildAerialCakeModel(def: CrackerDefinition): THREE.Group {
  const group = new THREE.Group();
  group.name = `cake_${def.id}`;

  const isGrand = def.id === 'cake_grand_25';
  const rows = isGrand ? 5 : 3;
  const cols = isGrand ? 5 : 4;
  const totalTubes = rows * cols;

  const wrapperTex = createCrackerWrapperTexture(
    '#991B1B',
    '#F59E0B',
    def.name,
    `${totalTubes} SHOT MULTI-BURST CAKE`,
    'mandala'
  );

  // Part 1: Heavy Cardboard Base Box
  const width = cols * 0.08 + 0.06;
  const depth = rows * 0.08 + 0.06;
  const height = 0.28;

  const boxGeo = new THREE.BoxGeometry(width, height, depth);
  const boxMat = new THREE.MeshStandardMaterial({
    map: wrapperTex,
    roughness: 0.4,
    metalness: 0.15,
  });
  const boxMesh = new THREE.Mesh(boxGeo, boxMat);
  boxMesh.position.y = height / 2;
  boxMesh.castShadow = true;
  group.add(boxMesh);

  // Part 2: Recessed Top Grid Plate
  const topPlateGeo = new THREE.BoxGeometry(width - 0.02, 0.02, depth - 0.02);
  const topPlateMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.9 });
  const topPlate = new THREE.Mesh(topPlateGeo, topPlateMat);
  topPlate.position.y = height + 0.005;
  group.add(topPlate);

  // Part 3: Tube Array with Gold Rings
  const tubeGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.08, 16);
  const tubeMat = new THREE.MeshStandardMaterial({ color: '#0F172A', roughness: 0.8 });
  const ringGeo = new THREE.TorusGeometry(0.026, 0.004, 8, 16);
  const goldMat = new THREE.MeshStandardMaterial({ color: '#F59E0B', metalness: 0.7, roughness: 0.3 });

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 0.08;
      const z = (r - (rows - 1) / 2) * 0.08;

      const tube = new THREE.Mesh(tubeGeo, tubeMat);
      // Fan out slightly on outer columns for fan cakes
      if (!isGrand && cols === 4) {
        tube.rotation.z = (c - 1.5) * 0.12;
      }
      tube.position.set(x, height + 0.04, z);

      const ring = new THREE.Mesh(ringGeo, goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.04;
      tube.add(ring);

      group.add(tube);
    }
  }

  // Part 4: Main Lighting Fuse on Side
  const fuseCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(width / 2, 0.14, 0),
    new THREE.Vector3(width / 2 + 0.04, 0.2, 0.02),
    new THREE.Vector3(width / 2 + 0.03, 0.26, 0),
  ]);
  const fuseGeo = new THREE.TubeGeometry(fuseCurve, 12, 0.007, 6, false);
  const fuseMat = new THREE.MeshStandardMaterial({ color: '#15803D', roughness: 0.9 });
  const fuseMesh = new THREE.Mesh(fuseGeo, fuseMat);
  fuseMesh.name = 'fuse';
  group.add(fuseMesh);

  // Contact Shadow
  group.add(createContactShadow(Math.max(width, depth) * 0.8));

  group.scale.setScalar(def.scale);
  return group;
}

// Master Factory function to instantiate any cracker 3D model
export function createCracker3DModel(def: CrackerDefinition): THREE.Group {
  switch (def.category) {
    case 'flower_pot':
      return buildAnaarModel(def);
    case 'ground_chakkar':
      return buildChakkarModel(def);
    case 'garland':
      return buildGarlandModel(def);
    case 'bomb':
      return buildBombModel(def);
    case 'rocket':
      return buildRocketModel(def);
    case 'aerial_cake':
      return buildAerialCakeModel(def);
    default:
      return buildAnaarModel(def);
  }
}

// Ground Placement Reticle (Glowing Indian Floral Rangoli Disc)
export function createRangoliReticle(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rangoliReticle';

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Intricate rangoli star / petals
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(128, 128, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#EC4899';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 85, 0, Math.PI * 2);
  ctx.stroke();

  // 8 Petals
  ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.arc(128 + Math.cos(angle) * 60, 128 + Math.sin(angle) * 60, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FEF08A';
    ctx.stroke();
  }

  // Center lotus
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(128, 128, 20, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  const geo = new THREE.PlaneGeometry(0.8, 0.8);
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.005;
  group.add(mesh);

  return group;
}
