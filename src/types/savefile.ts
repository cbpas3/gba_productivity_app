/** Gen III save file section structure */
export interface SaveSection {
  data: Uint8Array; // 3968 bytes of section data
  sectionId: number; // which section (0-13)
  checksum: number; // u16
  signature: number; // 0x08012025
  saveIndex: number; // u32
}

/** Detected Gen III game variant — determines save layout offsets. */
export type GameVariant = 'ruby_sapphire' | 'emerald' | 'firered_leafgreen';

/** Parsed save file with both blocks */
export interface SaveFile {
  raw: Uint8Array; // full 128KB save
  activeBlock: 'A' | 'B';
  sections: SaveSection[]; // 14 sections from the active block
  gameVariant: GameVariant;
}

/** Party Pokemon location within save */
export interface PartyLocation {
  sectionIndex: number; // Section 1 in save block
  offset: number; // 0x0234 = party count, 0x0238 = first pokemon
  count: number; // number of pokemon in party (1-6)
}
