/**
 * src/features/mattress/types.ts
 * Types and posture data for the SmartGRID 3D Mattress & Posture Lab.
 *
 * Metric scores are illustrative product-comparison values chosen to mirror
 * the reference experience. They are not clinical measurements.
 */

export type SimulationMode = 'comfort' | 'split';

export type LayerId = 'smartgrid' | 'foam' | 'base';

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
  /** Compact label for the one-handed zone strip. Never truncates the name. */
  shortName: string;
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
    shortName: 'Head',
    medicalRegion: 'C1 - C7 Vertebrae',
    xPercent: 12,
    smartGridBenefit: 'Isolates head mass while supporting cervical lordosis. Prevents morning neck stiffness and tension headaches.',
    ordinaryFoamDrawback: 'Traps body heat and creates an unsupportive crater, forcing the cervical neck to bend backward.'
  },
  {
    id: 'shoulder-thoracic',
    zoneNumber: 2,
    name: 'Shoulders & Upper Thoracic',
    shortName: 'Shoulders',
    medicalRegion: 'T1 - T6 Vertebrae',
    xPercent: 26,
    smartGridBenefit: 'Grid walls collapse intelligently under broad shoulder pressure, eliminating arm numbness and pins-and-needles.',
    ordinaryFoamDrawback: 'Rigid memory foam resists shoulder width, pushing the upper spine laterally and pinching thoracic nerves.'
  },
  {
    id: 'mid-back',
    zoneNumber: 3,
    name: 'Mid-Back & Ribcage',
    shortName: 'Mid-Back',
    medicalRegion: 'T7 - T12 Vertebrae',
    xPercent: 40,
    smartGridBenefit: 'Maintains flat, balanced support across the thoracic-lumbar junction, aiding deep diaphragm breathing.',
    ordinaryFoamDrawback: 'Lacks adaptive firmness, letting the mid-torso hammock into soft lower layers.'
  },
  {
    id: 'lumbar-lordosis',
    zoneNumber: 4,
    name: 'Lumbar Spine & Lower Back',
    shortName: 'Lumbar',
    medicalRegion: 'L1 - L5 Lordotic Curve',
    xPercent: 54,
    smartGridBenefit: 'Transitional ortho core provides active upward reactive support to fill the lower back gap and relax spinal erector muscles.',
    ordinaryFoamDrawback: 'Heavier pelvic sink pulls the lumbar spine downward, leaving back muscles strained and aching after 4+ hours.'
  },
  {
    id: 'pelvis-hips',
    zoneNumber: 5,
    name: 'Pelvis & Sacroiliac Joint',
    shortName: 'Pelvis',
    medicalRegion: 'Sacrum & Hip Rotators',
    xPercent: 68,
    smartGridBenefit: 'Cradles the heaviest human pivot zone with zero counter-pressure, keeping the pelvic tilt completely neutral.',
    ordinaryFoamDrawback: 'Bottoms out directly against the rigid base board, triggering chronic hip bursitis and sciatica discomfort.'
  },
  {
    id: 'thighs-knees',
    zoneNumber: 6,
    name: 'Thighs & Femoral Region',
    shortName: 'Thighs',
    medicalRegion: 'Femur & Patellar Joint',
    xPercent: 82,
    smartGridBenefit: 'Graduated support balances leg weight to prevent pelvic rotation while side-sleeping.',
    ordinaryFoamDrawback: 'Uneven foam sink twists the knees and stresses the lower lumbar facet joints.'
  },
  {
    id: 'calves-feet',
    zoneNumber: 7,
    name: 'Calves, Ankles & Feet',
    shortName: 'Calves, Ankles & Feet',
    medicalRegion: 'Achilles & Plantar Fascia',
    xPercent: 94,
    smartGridBenefit: 'Gentle pressure relief elevates lower extremities, promoting venous blood return throughout the night.',
    ordinaryFoamDrawback: 'Heels press against rigid lower foam, causing tender heel pressure points by morning.'
  }
];

export interface LayerMetadata {
  id: LayerId;
  title: string;
  subtitle: string;
  description: string;
  detail: string;
  color: string;
  heightMm: string;
}

/**
 * Headers and headline copy follow the reference experience.
 * The detail line keeps the supporting product facts from the previous build.
 */
export const MATTRESS_LAYERS: LayerMetadata[] = [
  {
    id: 'smartgrid',
    title: 'SMART GRID',
    subtitle: "India's 1st and Only Patented SmartGRID technology",
    description: 'Soft comfort with firm back support for peaceful sleep',
    detail: 'Hyper-elastic polymer grid · 2,500+ air channels · 45 mm',
    color: '#00e5ff',
    heightMm: '45 mm'
  },
  {
    id: 'foam',
    title: 'ORTHORELIEF FOAM',
    subtitle: 'Advanced orthopedic support for peaceful sleep',
    description: 'Balances firmness and pressure relief',
    detail: 'High-density transitional orthopedic foam · 35 mm',
    color: '#2dd4bf',
    heightMm: '35 mm'
  },
  {
    id: 'base',
    title: '7 ZONE BODY SUPPORT',
    subtitle: 'Targeted Orthopedic Support across 7 key body zones',
    description: 'Adapts to pressure points & aligns spine for peaceful sleep',
    detail: 'CNC-contoured seven-zone support base · 120 mm',
    color: '#3b82f6',
    heightMm: '120 mm'
  }
];

export interface MetricScore {
  key: 'adaptive' | 'back' | 'firm' | 'relief';
  label: string;
  score: number;
  flagged: boolean;
}

export interface MetricState {
  scores: MetricScore[];
  /** Human readable state used by the compact status pill. */
  status: string;
  tone: 'good' | 'warning' | 'critical';
}

/**
 * Illustrative scores mirroring the reference video:
 *  - all layers:      7 / 9 / 8 / 9
 *  - no SmartGRID:    5 / 5 / 4 / 5  (back support flagged)
 *  - no 7-zone base:  8 / 7 / 6 / 8  (firm support flagged)
 */
export function getMetricState(hasSmartGrid: boolean, hasSevenZone: boolean): MetricState {
  if (!hasSmartGrid) {
    return {
      scores: [
        { key: 'adaptive', label: 'ADAPTIVE SUPPORT', score: 5, flagged: false },
        { key: 'back', label: 'BACK SUPPORT', score: 5, flagged: true },
        { key: 'firm', label: 'FIRM SUPPORT', score: 4, flagged: false },
        { key: 'relief', label: 'TARGETED PRESSURE RELIEF', score: 5, flagged: false }
      ],
      status: 'Ordinary memory foam',
      tone: 'critical'
    };
  }

  if (!hasSevenZone) {
    return {
      scores: [
        { key: 'adaptive', label: 'ADAPTIVE SUPPORT', score: 8, flagged: false },
        { key: 'back', label: 'BACK SUPPORT', score: 7, flagged: false },
        { key: 'firm', label: 'FIRM SUPPORT', score: 6, flagged: true },
        { key: 'relief', label: 'TARGETED PRESSURE RELIEF', score: 8, flagged: false }
      ],
      status: '7-zone base removed',
      tone: 'warning'
    };
  }

  return {
    scores: [
      { key: 'adaptive', label: 'ADAPTIVE SUPPORT', score: 7, flagged: false },
      { key: 'back', label: 'BACK SUPPORT', score: 9, flagged: false },
      { key: 'firm', label: 'FIRM SUPPORT', score: 8, flagged: false },
      { key: 'relief', label: 'TARGETED PRESSURE RELIEF', score: 9, flagged: false }
    ],
    status: 'SmartGRID active',
    tone: 'good'
  };
}
