/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CrackerCategory = 
  | 'flower_pot'
  | 'ground_chakkar'
  | 'garland'
  | 'bomb'
  | 'rocket'
  | 'aerial_cake';

export type CrackerState = 'idle' | 'burning_fuse' | 'exploding' | 'spent';

export interface CrackerDefinition {
  id: string;
  name: string;
  hindiName: string;
  category: CrackerCategory;
  shortDesc: string;
  fullDesc: string;
  durationSeconds: number;
  burstCount?: number;
  colorScheme: string[];
  soundType: 'anaar' | 'chakkar' | 'garland' | 'atom_bomb' | 'hydro_bomb' | 'rocket' | 'aerial_cake';
  intensity: 'Medium' | 'High' | 'Extreme';
  iconType: string;
  scale: number;
  isAerial: boolean;
  burstDelaySec?: number;
}

export interface PlacedCracker {
  instanceId: string;
  crackerId: string;
  position: [number, number, number]; // x, y, z
  rotationY: number;
  state: CrackerState;
  stateStartTime: number;
  elapsedTime: number;
  burnProgress: number; // 0 to 1
}

export const CRACKER_DEFINITIONS: CrackerDefinition[] = [
  // 1. Flower Pots (Anaar)
  {
    id: 'anaar_golden',
    name: 'Golden Crown Anaar',
    hindiName: 'अनार (गोल्डन)',
    category: 'flower_pot',
    shortDesc: 'Cone fountain shooting golden & amber spark showers 4m high.',
    fullDesc: 'Traditional clay-based conical fountain that erupts into a towering shower of crackling golden sparks with glittering star embers.',
    durationSeconds: 8.5,
    colorScheme: ['#F59E0B', '#FCD34D', '#F97316', '#FFFBEB'],
    soundType: 'anaar',
    intensity: 'High',
    iconType: 'anaar',
    scale: 1.0,
    isAerial: false,
  },
  {
    id: 'anaar_silver',
    name: 'Silver Rain Anaar',
    hindiName: 'चांदी अनार',
    category: 'flower_pot',
    shortDesc: 'Intense magnesium silver spark fountain with crackling tails.',
    fullDesc: 'High-energy silver fountain blasting crisp sparkling titanium-silver showers with rapid crackling pops and glowing ground illumination.',
    durationSeconds: 7.0,
    colorScheme: ['#E0F2FE', '#BAE6FD', '#38BDF8', '#FFFFFF'],
    soundType: 'anaar',
    intensity: 'High',
    iconType: 'anaar',
    scale: 0.95,
    isAerial: false,
  },
  {
    id: 'anaar_tricolor',
    name: 'Tricolor Royal Anaar',
    hindiName: 'शाही तिरंगा अनार',
    category: 'flower_pot',
    shortDesc: 'Multicolor transition fountain: saffron, bright white, emerald.',
    fullDesc: 'Regal cone that transitions through saffron orange, dazzling silver, and emerald green spark plumes with cascading weeping willow trails.',
    durationSeconds: 9.0,
    colorScheme: ['#FF6600', '#FFFFFF', '#048A25', '#FFD700'],
    soundType: 'anaar',
    intensity: 'Extreme',
    iconType: 'anaar',
    scale: 1.1,
    isAerial: false,
  },

  // 2. Ground Chakkars / Wheels
  {
    id: 'chakkar_deluxe',
    name: 'Vishnu Chakkar Deluxe',
    hindiName: 'विष्णु चक्कर',
    category: 'ground_chakkar',
    shortDesc: 'Rapidly spinning ground disc casting whirring golden spiral rings.',
    fullDesc: 'Flat circular disc placed on the ground that spins with blistering angular velocity, spraying tangential streams of glittering golden fire in circular waves.',
    durationSeconds: 9.0,
    colorScheme: ['#F59E0B', '#EF4444', '#FBBF24'],
    soundType: 'chakkar',
    intensity: 'High',
    iconType: 'chakkar',
    scale: 1.0,
    isAerial: false,
  },
  {
    id: 'chakkar_rainbow',
    name: 'Rainbow Multi-Color Wheel',
    hindiName: 'रंग-बिरंगी फिरकी',
    category: 'ground_chakkar',
    shortDesc: 'Dual-phase spinning wheel shifting from ruby red to emerald green.',
    fullDesc: 'Fast whirring disc creating an expanding vortex of crimson, emerald, and sapphire sparks that skims across the pavement with Doppler hum.',
    durationSeconds: 8.0,
    colorScheme: ['#10B981', '#EC4899', '#3B82F6', '#F59E0B'],
    soundType: 'chakkar',
    intensity: 'High',
    iconType: 'chakkar',
    scale: 1.05,
    isAerial: false,
  },

  // 3. Garlands (Ladi)
  {
    id: 'garland_1000',
    name: '1,000 Wala Red Garland',
    hindiName: '1,000 वाला लड़ी',
    category: 'garland',
    shortDesc: 'Continuous chain of 1,000 red firecrackers for rapid roll-crackling.',
    fullDesc: 'Authentic 1,000-shot interconnected red cracker garland laid out on the ground that detonates in a thunderous, rhythmic roll-crackle with flying paper scraps and smoke.',
    durationSeconds: 12.0,
    burstCount: 100,
    colorScheme: ['#DC2626', '#F87171', '#FEF08A'],
    soundType: 'garland',
    intensity: 'Extreme',
    iconType: 'garland',
    scale: 1.2,
    isAerial: false,
  },
  {
    id: 'garland_5000',
    name: '5,000 Wala Mega Garland',
    hindiName: '5,000 वाला महा-लड़ी',
    category: 'garland',
    shortDesc: 'Long coiled garland delivering extended deafening firecracker volleys.',
    fullDesc: 'Extended five-thousand wala string coiled on the floor, producing continuous rapid-fire explosions, dense billowing smoke, and a colossal final climax bomb.',
    durationSeconds: 18.0,
    burstCount: 180,
    colorScheme: ['#DC2626', '#EA580C', '#FEF9C3'],
    soundType: 'garland',
    intensity: 'Extreme',
    iconType: 'garland',
    scale: 1.5,
    isAerial: false,
  },

  // 4. Atom Bombs & Hydro Bombs
  {
    id: 'bomb_atom',
    name: 'Classic Atom Bomb',
    hindiName: 'एटम बम',
    category: 'bomb',
    shortDesc: 'Twine-bound green explosive with deafening concussive blast.',
    fullDesc: 'Dense rectangular jute-twine wound bomb with a slow sizzling red fuse, culminating in a deafening concussive shockwave, ground blast, and smoke puff.',
    durationSeconds: 3.5, // 2.5s fuse + burst
    burstDelaySec: 2.5,
    colorScheme: ['#F59E0B', '#EF4444', '#FEF08A'],
    soundType: 'atom_bomb',
    intensity: 'Extreme',
    iconType: 'bomb',
    scale: 0.9,
    isAerial: false,
  },
  {
    id: 'bomb_hydro',
    name: 'Hydro Bomb (Heavy Blast)',
    hindiName: 'हाइड्रो बम',
    category: 'bomb',
    shortDesc: 'Heavyweight explosive cracker with subterranean bass thud.',
    fullDesc: 'High-density sealed explosive designed for maximum concussion. Delivers an intense ground-shaking sub-bass thud with an expanding distortion shockwave ring.',
    durationSeconds: 3.8,
    burstDelaySec: 2.7,
    colorScheme: ['#06B6D4', '#3B82F6', '#FFFFFF'],
    soundType: 'hydro_bomb',
    intensity: 'Extreme',
    iconType: 'bomb',
    scale: 1.0,
    isAerial: false,
  },

  // 5. Rockets
  {
    id: 'rocket_whistle',
    name: 'Whistling Sky Rocket',
    hindiName: 'सीटी वाला रॉकेट',
    category: 'rocket',
    shortDesc: 'Bottle-launched skyward projectile whistling into a starburst.',
    fullDesc: 'High-velocity wooden stick rocket that screeches skyward with a loud ultrasonic whistle and smoke trail, detonating at apex into a radiant ruby-gold peony burst.',
    durationSeconds: 5.0,
    burstDelaySec: 2.1,
    colorScheme: ['#F59E0B', '#EC4899', '#8B5CF6'],
    soundType: 'rocket',
    intensity: 'High',
    iconType: 'rocket',
    scale: 1.0,
    isAerial: true,
  },
  {
    id: 'rocket_titanium',
    name: 'Titanium Crackling Rocket',
    hindiName: 'रॉकेट टाइटेनियम',
    category: 'rocket',
    shortDesc: 'High-altitude rocket bursting into thousands of crackling stars.',
    fullDesc: 'Powerful sky rocket that shoots 25m into the night sky and bursts with a thunderous sky crackle, showering glowing golden willow branches that gently drift downward.',
    durationSeconds: 5.5,
    burstDelaySec: 2.3,
    colorScheme: ['#FDE047', '#A855F7', '#EF4444', '#00F0FF', '#FB923C'],
    soundType: 'rocket',
    intensity: 'Extreme',
    iconType: 'rocket',
    scale: 1.1,
    isAerial: true,
  },

  // 6. Aerial Shot Cakes
  {
    id: 'cake_fan_12',
    name: '12-Shot Fan Cake',
    hindiName: '12 शॉट पंखा केक',
    category: 'aerial_cake',
    shortDesc: 'Multi-tube battery launching towering multi-color concentric chrysanthemums.',
    fullDesc: 'Heavy mortar cake with fanned tubes that fires consecutive mortar shells in a wide sky spread, exploding into towering dual-ring violet-crimson chrysanthemums, ruby-cyan rings, and golden brocade willows.',
    durationSeconds: 12.0,
    burstCount: 12,
    colorScheme: ['#9333EA', '#EF4444', '#00F0FF', '#F59E0B', '#10B981', '#EC4899', '#2563EB', '#F43F5E'],
    soundType: 'aerial_cake',
    intensity: 'Extreme',
    iconType: 'aerial_cake',
    scale: 1.25,
    isAerial: true,
  },
  {
    id: 'cake_grand_25',
    name: '25-Shot Sky Symphony',
    hindiName: '25 शॉट स्काई केक',
    category: 'aerial_cake',
    shortDesc: 'Grand multi-shot aerial battery with tiered multi-color volleys & cascading willows.',
    fullDesc: 'Professional multi-shot aerial battery firing continuous high-altitude mortar shells with deep launch thuds, blossoming into royal violet pistils, ruby-sapphire bi-color rings, and crackling golden waterfalls.',
    durationSeconds: 16.0,
    burstCount: 25,
    colorScheme: ['#9333EA', '#FF0055', '#F59E0B', '#00F0FF', '#10B981', '#FF4500', '#C084FC', '#FDE047'],
    soundType: 'aerial_cake',
    intensity: 'Extreme',
    iconType: 'aerial_cake',
    scale: 1.4,
    isAerial: true,
  },
];
