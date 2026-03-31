export type RewardType =
  | 'give_item'
  | 'add_experience'
  | 'add_experience_percent'
  | 'boost_evs'
  | 'set_ivs'
  | 'heal_pokemon'
  | 'teach_move';

export type EvStat = 'hp' | 'atk' | 'def' | 'spd' | 'spatk' | 'spdef';

export interface IVSet {
  hp: number; // 0-31
  atk: number;
  def: number;
  spd: number;
  spatk: number;
  spdef: number;
}

export type RewardPayload =
  | { kind: 'item'; itemId: number }
  | { kind: 'experience'; amount: number }
  | { kind: 'experience_percent'; percent: number }
  | { kind: 'evs'; stat: EvStat; amount: number }
  | { kind: 'ivs'; values: Partial<IVSet> }
  | { kind: 'heal' }
  | { kind: 'move'; moveId: number; slot: number };

export interface Reward {
  type: RewardType;
  targetSlot: number; // 0-5, party slot index
  payload: RewardPayload;
}
