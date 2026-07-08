// Types and interfaces for the "Vie et Carrière 3D" game

export interface GameState {
  lives: number;
  score: number;
  phase: number;
  isPlaying: boolean;
  isPregnant: boolean;
  condonCaught: boolean;
  isBerserk: boolean;
  distance: number;
  highScore: number;
}

export interface DialogueState {
  text: string;
  visible: boolean;
  duration: number;
}

export type EntityType =
  | 'bonnet'
  | 'bulletin'
  | 'biere'
  | 'seringue'
  | 'condon'
  | 'gars'
  | 'bourse'
  | 'pere'
  | 'guichet'
  | 'police'
  | 'monstre'
  | 'bac'
  | 'cone'
  | 'bureau'
  | 'pieton';

export interface PhaseConfig {
  id: number;
  title: string;
  fatherDialogue: string;
  instruction: string;
  spawnZOffset: number; // offset relative to current player.z
  items: Array<{
    type: EntityType;
    x: number; // lateral coordinate
    zOffset: number; // offset relative to phase start
    y?: number; // optional vertical coordinate (defaults to 0 or floating)
  }>;
}
