/** Decrypted, parsed Pokemon structure (100 bytes for party) */
export interface Pokemon {
  personalityValue: number; // u32
  otId: number; // u32
  nickname: Uint8Array; // 10 bytes (Gen III encoding)
  language: number;
  miscFlags: number;
  otName: Uint8Array; // 7 bytes
  markings: number;
  // Substructure data (decrypted)
  growth: GrowthSubstructure;
  attacks: AttacksSubstructure;
  evs: EvsConditionSubstructure;
  misc: MiscSubstructure;
  // Party-only data
  statusCondition: number;
  level: number;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  spAttack: number;
  spDefense: number;
}

export interface GrowthSubstructure {
  species: number;
  heldItem: number;
  experience: number;
  ppBonuses: number;
  friendship: number;
}

export interface AttacksSubstructure {
  moves: [number, number, number, number];
  pp: [number, number, number, number];
}

export interface EvsConditionSubstructure {
  hpEv: number;
  attackEv: number;
  defenseEv: number;
  speedEv: number;
  spAtkEv: number;
  spDefEv: number;
  coolness: number;
  beauty: number;
  cuteness: number;
  smartness: number;
  toughness: number;
  feel: number;
}

export interface MiscSubstructure {
  pokerus: number;
  metLocation: number;
  originsInfo: number;
  ivsEggAbility: number; // packed u32
  ribbons: number;
}
