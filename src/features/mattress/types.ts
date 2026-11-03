/**
 * src/features/mattress/types.ts
 * Types and clinical posture data for the SmartGRID 3D Mattress & Posture Simulation Lab.
 */

export type SimulationMode = 'comfort' | 'split';

export type MattressModelId = 
  | 'smart-ortho-pro'
  | 'smart-ortho'
  | 'smart-ortho-royale'
  | 'smart-ortho-hybrid'
  | 'smart-luxe-pro'
  | 'smart-luxe-royale';

export interface MattressModelInfo {
  id: MattressModelId;
  name: string;
  tagline: string;
  firmnessScore: string;
  recommendedFor: string;
}

export const MATTRESS_MODELS: MattressModelInfo[] = [
  {
    id: 'smart-ortho-pro',
    name: 'Smart Ortho Pro Mattress',
    tagline: "India's #1 Orthopedic Mattress with 5-Zone / 7-Zone Posture Support",
    firmnessScore: 'Medium Firm (7.5/10)',
    recommendedFor: 'Back pain, lumbar lordosis correction, and all-night spinal alignment'
  },
  {
    id: 'smart-ortho',
    name: 'Smart Ortho Mattress',
    tagline: 'Classic Patented SmartGRID with Orthopedic Balance',
    firmnessScore: 'Medium Firm (7/10)',
    recommendedFor: 'Daily ergonomic posture, side sleepers, and general back comfort'
  },
  {
    id: 'smart-ortho-royale',
    name: 'Smart Ortho Royale Mattress',
    tagline: 'Luxury Quilted Orthopedic Comfort with Euro-Top Finish',
    firmnessScore: 'Plush Firm (7/10)',
    recommendedFor: 'Pressure point relief with luxury contouring'
  },
  {
    id: 'smart-ortho-hybrid',
    name: 'Smart Ortho Hybrid Mattress',
    tagline: 'SmartGRID Combined with Pocketed Anti-Sag Spring Coils',
    firmnessScore: 'Responsive Firm (8/10)',
    recommendedFor: 'Zero motion transfer and active rebound support'
  },
  {
    id: 'smart-luxe-pro',
    name: 'Smart Luxe Pro Mattress',
    tagline: 'Cloud-Like Plush Comfort with Underlying Ortho Support',
    firmnessScore: 'Plush Soft (6/10)',
    recommendedFor: 'Side sleepers and sensitive joints'
  },
  {
    id: 'smart-luxe-royale',
    name: 'Smart Luxe Royale Mattress',
    tagline: 'Ultra-Luxury Hotel Experience with Patented Grid Innovation',
    firmnessScore: 'Royal Plush (6.5/10)',
    recommendedFor: 'Deep muscle relaxation and luxury posture care'
  }
];

export interface ZoneClinicalInfo {
  id: string;
  zoneNumber: number;
  name: string;
  medicalRegion: string;
  xPercent: number; // Positioning along figure from head to foot
  smartGridBenefit: string;
  ordinaryFoamDrawback: string;
}

export const SEVEN_ZONES_DATA: ZoneClinicalInfo[] = [
  {
    id: 'head-neck',
    zoneNumber: 1,
    name: 'Head & Cervical Spine',
    medicalRegion: 'C1 - C7 Vertebrae',
    xPercent: 12,
    smartGridBenefit: 'Isolates head mass while supporting cervical lordosis. Prevents morning neck stiffness and tension headaches.',
    ordinaryFoamDrawback: 'Traps body heat and creates an unsupportive crater, forcing the cervical neck to bend backward.'
  },
  {
    id: 'shoulder-thoracic',
    zoneNumber: 2,
    name: 'Shoulders & Upper Thoracic',
    medicalRegion: 'T1 - T6 Vertebrae',
    xPercent: 26,
    smartGridBenefit: 'Grid walls collapse intelligently under broad shoulder pressure, eliminating arm numbness and pins-and-needles.',
    ordinaryFoamDrawback: 'Rigid memory foam resists shoulder width, pushing the upper spine laterally and pinching thoracic nerves.'
  },
  {
    id: 'mid-back',
    zoneNumber: 3,
    name: 'Mid-Back & Ribcage',
    medicalRegion: 'T7 - T12 Vertebrae',
    xPercent: 40,
    smartGridBenefit: 'Maintains flat, balanced support across the thoracic-lumbar junction, aiding deep diaphragm breathing.',
    ordinaryFoamDrawback: 'Lacks adaptive firmness, letting the mid-torso hammock into soft lower layers.'
  },
  {
    id: 'lumbar-lordosis',
    zoneNumber: 4,
    name: 'Lumbar Spine & Lower Back',
    medicalRegion: 'L1 - L5 Lordotic Curve',
    xPercent: 54,
    smartGridBenefit: 'Transitional ortho core provides active upward reactive support to fill the lower back gap and relax spinal erector muscles.',
    ordinaryFoamDrawback: 'Heavier pelvic sink pulls the lumbar spine downward, leaving back muscles strained and aching after 4+ hours.'
  },
  {
    id: 'pelvis-hips',
    zoneNumber: 5,
    name: 'Pelvis & Sacroiliac Joint',
    medicalRegion: 'Sacrum & Hip Rotators',
    xPercent: 68,
    smartGridBenefit: 'Cradles the heaviest human pivot zone with zero counter-pressure, keeping the pelvic tilt completely neutral.',
    ordinaryFoamDrawback: 'Bottoms out directly against the rigid base board, triggering chronic hip bursitis and sciatica discomfort.'
  },
  {
    id: 'thighs-knees',
    zoneNumber: 6,
    name: 'Thighs & Femoral Region',
    medicalRegion: 'Femur & Patellar Joint',
    xPercent: 82,
    smartGridBenefit: 'Graduated support balances leg weight to prevent pelvic rotation while side-sleeping.',
    ordinaryFoamDrawback: 'Uneven foam sink twists the knees and stresses the lower lumbar facet joints.'
  },
  {
    id: 'calves-feet',
    zoneNumber: 7,
    name: 'Calves, Ankles & Feet',
    medicalRegion: 'Achilles & Plantar Fascia',
    xPercent: 94,
    smartGridBenefit: 'Gentle pressure relief elevates lower extremities, promoting venous blood return throughout the night.',
    ordinaryFoamDrawback: 'Heels press against rigid lower foam, causing tender heel pressure points by morning.'
  }
];

export interface LayerMetadata {
  id: 'smartgrid' | 'foam' | 'base';
  title: string;
  subtitle: string;
  color: string;
  heightMm: string;
  bullet1: string;
  bullet2: string;
}

export const MATTRESS_LAYERS: LayerMetadata[] = [
  {
    id: 'smartgrid',
    title: 'Patented SmartGRID™ Layer',
    subtitle: "India's 1st and Only Patented SmartGRID technology",
    color: '#00d2ff',
    heightMm: '45 mm',
    bullet1: 'Hyper-elastic polymer grid collapses under pressure points while staying firm under posture curves.',
    bullet2: '2,500+ air channels keep the mattress 2-3°C cooler than memory foam all night.'
  },
  {
    id: 'foam',
    title: 'Ortho Relief Foam',
    subtitle: 'High-Density Transitional Orthopedic Foam',
    color: '#0d9488',
    heightMm: '35 mm',
    bullet1: 'Balances firmness and pressure relief, preventing the body from bottoming out.',
    bullet2: 'Evenly distributes dynamic micro-movements so turning over feels effortless.'
  },
  {
    id: 'base',
    title: '7-Zone Body Support Base',
    subtitle: 'Targeted Orthopedic Support across 7 Body Zones',
    color: '#1e3a8a',
    heightMm: '120 mm',
    bullet1: 'Engineered CNC grooves provide varying firmness for head, shoulders, lumbar, and hips.',
    bullet2: 'Maintains neutral horizontal spinal alignment throughout all 8 hours of sleep.'
  }
];
