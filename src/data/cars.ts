import { CarSpec } from '../types/game';

export const CAR_SPECS: CarSpec[] = [
  {
    id: 'phoenix-gt',
    name: 'Phoenix GT',
    team: 'red',
    topSpeed: 255,
    accel: 52,
    handling: 78,
    nitroPower: 85,
    primaryColor: '#ef4444',
    accentColor: '#f97316',
    description: 'High-torque combustion beast with blazing acceleration and explosive nitro burn.'
  },
  {
    id: 'scarlet-phantom',
    name: 'Scarlet Phantom',
    team: 'red',
    topSpeed: 270,
    accel: 46,
    handling: 85,
    nitroPower: 75,
    primaryColor: '#dc2626',
    accentColor: '#fbbf24',
    description: 'Aerodynamic wind-tunnel tuned racer engineered for high top speed and sharp lane cuts.'
  },
  {
    id: 'cobalt-vortex',
    name: 'Cobalt Vortex',
    team: 'blue',
    topSpeed: 258,
    accel: 50,
    handling: 84,
    nitroPower: 82,
    primaryColor: '#3b82f6',
    accentColor: '#06b6d4',
    description: 'Twin-turbo all-wheel drive platform with surgical grip and responsive handling.'
  },
  {
    id: 'apex-pulse',
    name: 'Apex Pulse',
    team: 'blue',
    topSpeed: 268,
    accel: 48,
    handling: 80,
    nitroPower: 88,
    primaryColor: '#2563eb',
    accentColor: '#38bdf8',
    description: 'Formula prototype hybrid with immense top-end velocity and sustained nitro thrusters.'
  }
];

export const QUICK_RADIO_MESSAGES = [
  '⚡ Nitro fired!',
  '💨 Catch me if you can!',
  '⚠️ Watch the oil slick!',
  '🤝 Nice move!',
  '🏁 See you at the finish line!',
  '🔥 Need more speed!',
  '🏎️ Eat my dust!',
  '💥 Good race!'
];
