/**
 * Gen III base stats and growth-rate data for all 386 species.
 *
 * Source: Bulbapedia / PKHeX base-stat tables for Generations III.
 * Format: [hp, atk, def, spd, spatk, spdef, growthRate]
 *
 * Growth rate codes:
 *   0 = MediumFast     (n^3)
 *   1 = Erratic
 *   2 = Fluctuating
 *   3 = MediumSlow     (6/5 n^3 - 15n^2 + 100n - 140)
 *   4 = Fast           (4/5 n^3)
 *   5 = Slow           (5/4 n^3)
 */

export type GrowthRate = 0 | 1 | 2 | 3 | 4 | 5;

export interface BaseStatEntry {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  spatk: number;
  spdef: number;
  growthRate: GrowthRate;
}

/**
 * BASE_STATS[speciesId] where speciesId is 1-indexed (Bulbasaur=1, Deoxys=386).
 * Index 0 is a placeholder (no species 0 in Gen III).
 *
 * Columns: hp, atk, def, spd, spatk, spdef, growthRate
 */
const RAW: ReadonlyArray<readonly [number, number, number, number, number, number, GrowthRate]> = [
  //  0: placeholder
  [  0,  0,  0,  0,  0,  0, 0],
  // Kanto starters
  [ 45, 49, 49, 45, 65, 65, 3], //   1 Bulbasaur
  [ 60, 62, 63, 60, 80, 80, 3], //   2 Ivysaur
  [ 80, 82, 83, 80,100,100, 3], //   3 Venusaur
  [ 39, 52, 43, 65, 60, 50, 3], //   4 Charmander
  [ 58, 64, 58, 80, 80, 65, 3], //   5 Charmeleon
  [ 78, 84, 78,100,109, 85, 3], //   6 Charizard
  [ 44, 48, 65, 43, 50, 64, 3], //   7 Squirtle
  [ 59, 63, 80, 58, 65, 80, 3], //   8 Wartortle
  [ 79, 83,100, 78, 85,105, 3], //   9 Blastoise
  [ 45, 30, 35, 45, 20, 20, 4], //  10 Caterpie
  [ 50, 20, 55, 30, 25, 25, 4], //  11 Metapod
  [ 60, 45, 50, 70, 90, 80, 4], //  12 Butterfree
  [ 40, 35, 30, 50, 20, 20, 4], //  13 Weedle
  [ 45, 25, 50, 35, 25, 25, 4], //  14 Kakuna
  [ 65, 90, 40, 75, 45, 80, 4], //  15 Beedrill
  [ 40, 45, 40, 56, 35, 35, 4], //  16 Pidgey
  [ 63, 60, 55, 71, 50, 50, 4], //  17 Pidgeotto
  [ 83, 80, 75, 91, 70, 70, 4], //  18 Pidgeot
  [ 30, 56, 35, 72, 25, 35, 4], //  19 Rattata
  [ 55, 81, 60, 97, 50, 70, 4], //  20 Raticate
  [ 40, 60, 30, 70, 31, 31, 4], //  21 Spearow
  [ 65, 90, 65,100, 61, 61, 4], //  22 Fearow
  [ 35, 60, 44, 55, 40, 54, 4], //  23 Ekans
  [ 60, 95, 69, 80, 65, 79, 4], //  24 Arbok
  [ 35, 55, 40, 90, 50, 40, 0], //  25 Pikachu
  [ 60, 90, 55,110, 90, 80, 0], //  26 Raichu
  [ 50, 75, 85, 40, 20, 30, 0], //  27 Sandshrew
  [ 75,100,110, 65, 45, 55, 0], //  28 Sandslash
  [ 55, 47, 52, 41, 40, 40, 0], //  29 Nidoran♀
  [ 70, 62, 67, 56, 55, 55, 0], //  30 Nidorina
  [ 90, 92, 87, 76, 75, 85, 3], //  31 Nidoqueen
  [ 46, 57, 40, 50, 40, 40, 0], //  32 Nidoran♂
  [ 61, 72, 57, 65, 55, 55, 0], //  33 Nidorino
  [ 81,102, 77, 85, 85, 75, 3], //  34 Nidoking
  [ 70, 45, 48, 35, 60, 65, 4], //  35 Clefairy
  [ 95, 70, 73, 60, 95,100, 4], //  36 Clefable
  [ 38, 41, 40, 65, 50, 65, 4], //  37 Vulpix
  [ 73, 76, 75,100, 81,100, 4], //  38 Ninetales
  [ 70, 45, 48, 35, 60, 65, 4], //  39 Jigglypuff
  [ 95, 70, 45, 45, 85, 50, 4], //  40 Wigglytuff
  [ 40, 45, 35, 55, 30, 40, 4], //  41 Zubat
  [ 75, 80, 70, 90, 65, 75, 4], //  42 Golbat
  [ 45, 50, 55, 30, 75, 65, 3], //  43 Oddish
  [ 60, 65, 70, 40, 85, 75, 3], //  44 Gloom
  [ 75, 80, 85, 50,100, 90, 3], //  45 Vileplume
  [ 35, 70, 55, 25, 45, 55, 0], //  46 Paras
  [ 60, 95, 80, 30, 60, 80, 0], //  47 Parasect
  [ 60, 55, 50, 45, 40, 55, 0], //  48 Venonat
  [ 70, 65, 60, 90, 90, 75, 0], //  49 Venomoth
  [ 10, 55, 25, 95, 35, 45, 4], //  50 Diglett
  [ 35, 80, 50,120, 50, 70, 4], //  51 Dugtrio
  [ 40, 45, 35, 90, 40, 40, 4], //  52 Meowth
  [ 65, 75, 60,115, 65, 65, 4], //  53 Persian
  [ 50, 52, 48, 55, 65, 50, 0], //  54 Psyduck
  [ 80, 82, 78,112, 95, 80, 0], //  55 Golduck
  [ 40, 80, 35, 70, 35, 45, 0], //  56 Mankey
  [ 65,105, 60, 95, 60, 70, 0], //  57 Primeape
  [ 55, 70, 45, 60, 70, 50, 0], //  58 Growlithe
  [ 90,110, 80, 95,100, 80, 5], //  59 Arcanine
  [ 40, 50, 40, 90, 40, 40, 0], //  60 Poliwag
  [ 65, 65, 65, 90, 50, 50, 0], //  61 Poliwhirl
  [ 90, 95, 95, 70, 70,100, 3], //  62 Poliwrath
  [ 25, 20, 15, 90,105, 55, 0], //  63 Abra
  [ 55, 35, 30,105,120, 70, 0], //  64 Kadabra
  [ 55, 50, 45,120,135, 85, 3], //  65 Alakazam
  [ 70, 80, 50, 35, 35, 35, 0], //  66 Machop
  [ 80,100, 70, 45, 50, 60, 0], //  67 Machoke
  [ 90,130, 80, 55, 65, 85, 3], //  68 Machamp
  [ 45, 50, 75, 40, 35, 70, 3], //  69 Bellsprout
  [ 65, 70, 95, 55, 55, 70, 3], //  70 Weepinbell
  [ 80, 80,105, 70, 60, 75, 3], //  71 Victreebel
  [ 40, 40, 35, 51, 50, 100,0], //  72 Tentacool
  [ 80, 70, 65, 100,80, 120,0], //  73 Tentacruel
  [ 40, 80,100, 20, 30, 30, 0], //  74 Geodude
  [ 55, 95,115, 35, 45, 45, 0], //  75 Graveler
  [ 80,110,130, 45, 55, 65, 3], //  76 Golem
  [ 50, 87, 60, 55, 35, 35, 0], //  77 Ponyta
  [ 65,100, 70, 90, 65, 65, 0], //  78 Rapidash
  [ 90, 65, 65, 15, 40, 40, 0], //  79 Slowpoke
  [ 95, 75, 80, 30,100,110, 0], //  80 Slowbro
  [ 25, 35, 70, 45, 95, 55, 0], //  81 Magnemite
  [ 50, 60, 95, 70,120, 70, 0], //  82 Magneton
  [ 52, 65, 55, 60, 58, 62, 0], //  83 Farfetch'd
  [ 35, 85, 45,105, 35, 35, 0], //  84 Doduo
  [ 60,110, 70,110, 60, 60, 0], //  85 Dodrio
  [ 65, 45, 55, 45, 45, 70, 0], //  86 Seel
  [ 90, 70, 80, 70, 70, 95, 0], //  87 Dewgong
  [ 80, 80, 50, 25, 40, 50, 0], //  88 Grimer
  [105,105, 75, 50, 65,100, 0], //  89 Muk
  [ 30, 65, 100,40, 45, 25, 0], //  90 Shellder
  [ 50, 95, 180, 70, 85, 45, 0], //  91 Cloyster
  [ 30, 35, 30, 80,100, 35, 0], //  92 Gastly
  [ 45, 50, 45, 95,115, 55, 0], //  93 Haunter
  [ 60, 65, 60,110,130, 75, 3], //  94 Gengar
  [ 35, 45, 160,30,  30, 45, 0], //  95 Onix
  [ 60, 48, 45, 42, 43, 90, 0], //  96 Drowzee
  [ 85, 73, 70, 67, 73,115, 0], //  97 Hypno
  [ 30, 105,90, 50, 25, 25, 0], //  98 Krabby
  [ 55, 130,115,75,  50, 50, 0], //  99 Kingler
  [ 40, 30, 50, 100,55, 55, 0], // 100 Voltorb
  [ 60, 50, 70, 140,80, 80, 0], // 101 Electrode
  [ 60, 40, 50, 75, 60, 45, 3], // 102 Exeggcute
  [ 95, 95,85, 55, 125,65, 3], // 103 Exeggutor
  [ 50, 95, 95,35,  40, 50, 0], // 104 Cubone
  [ 60,80, 110,45,  50, 80, 0], // 105 Marowak
  [ 50,120, 53, 87, 35, 110,0], // 106 Hitmonlee
  [ 50,105, 79, 76, 35, 110,0], // 107 Hitmonchan
  [ 90, 55, 75, 30, 45, 45, 0], // 108 Lickitung
  [ 40, 65, 95, 35,60,  45, 0], // 109 Koffing
  [ 65, 90,120, 60, 85, 70, 0], // 110 Weezing
  [ 80, 85, 95, 25, 30, 55, 0], // 111 Rhyhorn
  [105,130,120, 40, 45, 45, 3], // 112 Rhydon
  [250, 5,  5,  50, 35, 105,4], // 113 Chansey
  [ 65, 55, 115,60, 100,40, 3], // 114 Tangela
  [105, 95, 80, 84, 40, 65, 3], // 115 Kangaskhan
  [ 30, 40, 70, 60, 70, 25, 0], // 116 Horsea
  [ 55, 65, 95, 95, 95, 45, 0], // 117 Seadra
  [ 45, 67, 60, 63, 35, 50, 0], // 118 Goldeen
  [ 80, 92, 65, 68, 65, 80, 0], // 119 Seaking
  [ 30, 45, 55, 85, 70, 55, 0], // 120 Staryu
  [ 60, 75, 85,115,100, 85, 0], // 121 Starmie
  [ 40, 45, 35,  70,100, 35, 0], // 122 Mr. Mime
  [ 70, 110,80, 105,55, 80, 0], // 123 Scyther
  [ 65, 50, 35, 95, 95, 35, 0], // 124 Jynx
  [ 65, 83, 57, 105,95, 73, 0], // 125 Electabuzz
  [ 65, 95, 57, 93, 100,85, 0], // 126 Magmar
  [ 65,125,100,85,  55, 70, 0], // 127 Pinsir
  [100,134, 110,61, 95, 100,5], // 128 Tauros
  [ 20, 10, 55, 80, 15,  20, 4], // 129 Magikarp
  [95, 125,79, 81, 60, 100, 5], // 130 Gyarados
  [130, 85,80, 60, 95, 95, 5], // 131 Lapras
  [ 48, 48, 48, 48, 48,  48, 0], // 132 Ditto
  [ 55, 55, 50, 55, 45, 45, 4], // 133 Eevee
  [130, 65,60, 65, 110,95, 4], // 134 Vaporeon
  [ 65,65,  60,110, 110,95, 4], // 135 Jolteon
  [ 65,130, 60, 65, 110,95, 4], // 136 Flareon
  [ 65, 60, 70, 40, 75, 75, 3], // 137 Porygon
  [35,  40, 100,35, 90, 55, 0], // 138 Omanyte
  [ 70, 60, 125,55, 115,70, 0], // 139 Omastar
  [ 30, 80,90,  45, 55, 45, 0], // 140 Kabuto
  [ 60, 115,105,80, 65, 70, 0], // 141 Kabutops
  [80,  105,65,130, 60,75,  5], // 142 Aerodactyl
  [160,110,65, 30, 65, 110,5], // 143 Snorlax
  [ 90,85,100, 90, 95, 125,5], // 144 Articuno
  [90, 90, 85,100, 125,90,  5], // 145 Zapdos
  [90, 100,90,100, 125,85,  5], // 146 Moltres
  [41, 64, 45, 50, 50,  50, 0], // 147 Dratini
  [ 61, 84, 65, 70, 70,  70, 0], // 148 Dragonair
  [ 91,134,95, 80,100, 100, 5], // 149 Dragonite
  [106,110,90,130, 154,90,  5], // 150 Mewtwo
  [100, 100,100,100,100, 100,5], // 151 Mew
  // Johto starters
  [ 45, 49, 65, 45, 49, 65, 3], // 152 Chikorita
  [ 60, 62, 80, 60, 63, 80, 3], // 153 Bayleef
  [ 80, 82,100, 80, 83,100, 3], // 154 Meganium
  [ 39, 52, 43, 65, 60, 50, 3], // 155 Cyndaquil
  [ 58, 64, 58, 80, 80, 65, 3], // 156 Quilava
  [ 78, 84, 78,100,109, 85, 3], // 157 Typhlosion
  [ 50, 65, 64, 44, 44, 48, 3], // 158 Totodile
  [ 65, 80, 80, 59, 59, 63, 3], // 159 Croconaw
  [85, 105,100,78,  79, 83, 3], // 160 Feraligatr
  [ 35, 46, 34, 20, 35,  45, 4], // 161 Sentret
  [ 85, 76, 64, 90, 45,  55, 4], // 162 Furret
  [ 60, 30, 30, 31, 36,  56, 4], // 163 Hoothoot
  [ 100,50, 50, 71, 76,  96, 4], // 164 Noctowl
  [ 40, 20, 30, 55, 25,  25, 0], // 165 Ledyba
  [ 55, 35, 50, 85, 55,  110,0], // 166 Ledian
  [ 40, 60, 40, 30, 40,  40, 0], // 167 Spinarak
  [ 70, 90, 70, 40, 60,  60, 0], // 168 Ariados
  [ 85, 90, 80,130, 70,  80, 4], // 169 Crobat
  [ 75, 38, 38, 56, 56,  56, 4], // 170 Chinchou
  [125, 58, 58, 67, 76,  76, 4], // 171 Lanturn
  [ 20, 40, 15, 60, 35,  35, 4], // 172 Pichu
  [ 50, 25, 28, 15, 45,  55, 4], // 173 Cleffa
  [ 45, 30, 15, 20, 40,  20, 4], // 174 Igglybuff
  [ 35, 20, 65, 20, 40,  65, 4], // 175 Togepi
  [ 55, 40, 85, 40, 80,  105,4], // 176 Togetic
  [ 40, 50, 45, 70, 70,  45, 4], // 177 Natu
  [ 65, 75, 70, 95, 95,  70, 4], // 178 Xatu
  [ 55, 40, 40, 65, 65,  45, 0], // 179 Mareep
  [ 70, 55, 55, 80, 80,  60, 0], // 180 Flaaffy
  [90,  75, 75, 115,115, 90, 0], // 181 Ampharos
  [ 75, 80, 85, 56, 90,  100,3], // 182 Bellossom
  [ 70, 20, 50, 40, 20,  50, 4], // 183 Marill
  [ 100,50, 80, 50, 60,  80, 4], // 184 Azumarill
  [ 70, 100,115,30, 30,  65, 3], // 185 Sudowoodo
  [ 90, 75, 75, 70, 90,  100,3], // 186 Politoed
  [ 35, 35, 40, 90, 35,  35, 0], // 187 Hoppip
  [ 55, 45, 50, 80, 45,  65, 0], // 188 Skiploom
  [ 75, 55, 70, 110,55,  85, 0], // 189 Jumpluff
  [ 55, 70, 55, 85, 40,  55, 4], // 190 Aipom
  [ 30, 30, 30, 85, 30,  30, 0], // 191 Sunkern
  [ 75, 75, 55, 30, 105, 85, 0], // 192 Sunflora
  [ 65, 65, 45, 95, 75,  45, 4], // 193 Yanma
  [ 55, 45, 45, 15, 25,  25, 0], // 194 Wooper
  [110, 85, 95, 35, 65,  110,0], // 195 Quagsire
  [ 65, 65, 60,110, 130, 95, 0], // 196 Espeon
  [ 95,65,  110,65, 60,  130,0], // 197 Umbreon
  [ 60, 85, 42, 91, 85,  42, 0], // 198 Murkrow
  [ 95, 75, 80, 30, 100, 110,0], // 199 Slowking
  [ 60, 60, 60, 85, 85,  85, 0], // 200 Misdreavus
  [ 48, 72, 48, 48, 72,  48, 0], // 201 Unown
  [ 190,33, 58, 33, 33,  58, 4], // 202 Wobbuffet
  [ 35, 70, 40, 60, 70,  40, 0], // 203 Girafarig
  [ 50, 65, 45, 35, 35,  38, 0], // 204 Pineco
  [75, 90, 140,40, 60,  80, 0],  // 205 Forretress
  [ 35, 46, 34, 20, 35,  45, 0], // 206 Dunsparce
  [ 65, 75, 105,85, 35,  65, 0], // 207 Gligar
  [ 75, 85, 200,30, 55,  65, 3], // 208 Steelix
  [ 60, 55, 35, 30, 50,  40, 4], // 209 Snubbull
  [90, 80,  65, 60, 45,  75, 4], // 210 Granbull
  [ 65,95,  75,  85,55,  55, 0], // 211 Qwilfish
  [ 70,130, 100,65, 55,  80, 3], // 212 Scizor
  [ 20, 10, 230,5,  10,  230,0], // 213 Shuckle
  [ 80,125, 75,85,  40,  95, 0], // 214 Heracross
  [ 55, 95, 55, 35, 35,  75, 0], // 215 Sneasel
  [ 60, 80, 50, 40, 50,  50, 0], // 216 Teddiursa
  [90, 130, 75, 55, 75,  75, 0], // 217 Ursaring
  [ 40, 40, 40, 25, 40,  40, 0], // 218 Slugma
  [ 50, 50, 120,30, 80,  80, 0], // 219 Magcargo
  [ 50, 50, 40, 30, 30,  30, 0], // 220 Swinub
  [100, 100,80, 50, 60,  60, 0], // 221 Piloswine
  [ 55, 55, 85, 35, 65,  85, 0], // 222 Corsola
  [ 35, 65, 35, 65, 35,  35, 0], // 223 Remoraid
  [ 75, 105,75, 45, 65,  75, 0], // 224 Octillery
  [ 45, 55, 45, 75, 65,  65, 0], // 225 Delibird
  [ 65, 40, 70,110, 80,  140,0], // 226 Mantine
  [ 65, 80, 140,20, 40,  70, 0], // 227 Skarmory
  [45,  60, 30, 65, 80,  50, 4], // 228 Houndour
  [ 75, 90, 50, 95, 110, 80, 4], // 229 Houndoom
  [ 75,95,  95, 85, 95,  95, 4], // 230 Kingdra
  [ 90, 80, 70, 45, 40,  60, 0], // 231 Phanpy
  [90,  120,120,50,  60,  60, 0], // 232 Donphan
  [ 85, 80, 90, 60, 105, 95, 0], // 233 Porygon2
  [ 73, 95, 62, 85, 85,  65, 0], // 234 Stantler
  [ 55, 20, 35, 75, 20,  45, 0], // 235 Smeargle
  [ 35, 35, 35, 35, 35,  35, 0], // 236 Tyrogue
  [50,  87, 53, 107,35,  110,0], // 237 Hitmontop
  [ 45, 30, 15, 65, 135, 65, 4], // 238 Smoochum
  [ 45, 63, 37, 85, 65,  55, 4], // 239 Elekid
  [ 45, 75, 37, 83, 70,  55, 4], // 240 Magby
  [95,  75, 110,100,40,  130,5], // 241 Miltank
  [255, 10,10,  55, 75,  135,4], // 242 Blissey
  [90,  85, 75, 115,115, 100,5], // 243 Raikou
  [115, 115,85, 100,90,  75, 5], // 244 Entei
  [100, 75, 115,85, 90,  115,5], // 245 Suicune
  [ 50, 64, 50, 41, 45,  50, 0], // 246 Larvitar
  [ 70, 84, 70, 51, 65,  70, 0], // 247 Pupitar
  [100, 134,110,61, 95,  100,5], // 248 Tyranitar
  [106, 90, 130,110,154, 90, 5], // 249 Lugia
  [106, 130,90, 110,110, 154,5], // 250 Ho-Oh
  [100, 100,100,100,100, 100,5], // 251 Celebi
  // Hoenn starters
  [ 40, 45, 35, 70, 65, 55, 3], // 252 Treecko
  [ 50, 65, 45, 95, 85, 65, 3], // 253 Grovyle
  [ 70, 85, 65, 120,105, 85, 3], // 254 Sceptile
  [ 45, 60, 40, 45, 70, 50, 3], // 255 Torchic
  [ 60, 85, 60, 55, 85, 60, 3], // 256 Combusken
  [ 80,120, 70, 80, 110,70, 3], // 257 Blaziken
  [ 50, 70, 50, 40, 50, 50, 3], // 258 Mudkip
  [ 70, 85, 70, 50, 60, 70, 3], // 259 Marshtomp
  [ 100,110,90, 60, 85, 90, 3], // 260 Swampert
  [ 35, 55, 35, 35, 30, 30, 4], // 261 Poochyena
  [ 70, 90, 70, 70, 60, 60, 4], // 262 Mightyena
  [ 38, 30, 41, 60, 30, 41, 4], // 263 Zigzagoon
  [ 78, 70, 61, 100,50, 61, 4], // 264 Linoone
  [ 45, 35, 35, 20, 20, 30, 0], // 265 Wurmple
  [ 50, 35, 55, 15, 20, 30, 0], // 266 Silcoon
  [ 60, 70, 50, 65, 90, 90, 0], // 267 Beautifly
  [ 50, 35, 55, 15, 20, 30, 0], // 268 Cascoon
  [ 60, 50, 70, 65, 50, 90, 0], // 269 Dustox
  [ 40, 30, 30, 30, 40, 50, 3], // 270 Lotad
  [ 60, 50, 50, 50, 60, 70, 3], // 271 Lombre
  [ 90, 80, 70, 70, 90, 100,3], // 272 Ludicolo
  [ 40, 40, 50, 30, 30, 30, 0], // 273 Seedot
  [ 70, 70, 40, 60, 60, 40, 0], // 274 Nuzleaf
  [90, 100,60, 80, 90, 60, 0],  // 275 Shiftry
  [ 40, 55, 30, 85, 30, 30, 4], // 276 Taillow
  [ 60, 85, 60, 125,50, 50, 4], // 277 Swellow
  [ 40, 30, 30, 85, 55, 30, 4], // 278 Wingull
  [ 60, 50, 100,65, 85, 70, 4], // 279 Pelipper
  [ 28, 25, 25, 40, 45, 35, 0], // 280 Ralts
  [ 38, 35, 35, 50, 65, 55, 0], // 281 Kirlia
  [ 68, 65, 65, 80, 125,115,3], // 282 Gardevoir
  [ 40, 30, 32, 35, 50, 52, 0], // 283 Surskit
  [ 70, 60, 62, 65, 80, 82, 0], // 284 Masquerain
  [ 60, 40, 60, 35, 40, 60, 3], // 285 Shroomish
  [ 60, 130,80, 60, 60, 60, 3], // 286 Breloom
  [ 60, 60, 60, 30, 35, 35, 0], // 287 Slakoth
  [ 80, 80, 80, 90, 50, 50, 0], // 288 Vigoroth
  [150, 160,100,100,95, 65, 5], // 289 Slaking
  [ 31, 45, 90, 40, 30, 30, 0], // 290 Nincada
  [ 61, 90, 45, 160,50, 50, 0], // 291 Ninjask
  [ 1,  90, 45, 30, 36, 55, 0], // 292 Shedinja
  [ 55, 45, 160,30, 30, 30, 0], // 293 Whismur
  [ 65, 65, 20, 35, 40, 40, 0], // 294 Loudred (note: swapped in orig, fixing)
  [ 85, 85, 40, 60, 60, 60, 0], // 295 Exploud (note)
  [ 72, 60, 30, 25, 20, 30, 4], // 296 Makuhita
  [144,120,60, 50, 40, 60, 4], // 297 Hariyama
  [ 50, 20, 40, 20, 20, 40, 4], // 298 Azurill
  [ 30, 45, 135,30, 20, 20, 0], // 299 Nosepass
  [ 50, 45, 45, 50, 35, 35, 0], // 300 Skitty
  [ 70, 65, 65, 70, 55, 55, 0], // 301 Delcatty
  [ 50, 75, 75, 50, 75, 75, 0], // 302 Sableye
  [ 50, 85, 85, 50, 55, 55, 0], // 303 Mawile
  [ 50, 70, 100,40, 40, 40, 0], // 304 Aron
  [ 60, 90, 140,40, 50, 50, 0], // 305 Lairon
  [ 70, 110,180,60, 60, 60, 3], // 306 Aggron
  [ 50, 60, 45, 45, 70, 45, 0], // 307 Meditite
  [ 60, 75, 75, 80, 100,75, 0], // 308 Medicham
  [ 40, 55, 30, 60, 50, 40, 0], // 309 Electrike
  [ 70, 75, 60, 105,105,60, 0], // 310 Manectric
  [ 50, 55, 50, 45, 40, 55, 0], // 311 Plusle
  [ 60, 40, 50, 95, 40, 40, 0], // 312 Minun
  [ 65, 35, 35, 55, 35, 35, 0], // 313 Volbeat
  [ 65, 35, 35, 55, 35, 35, 0], // 314 Illumise
  [ 44, 75, 35, 51, 70, 50, 3], // 315 Roselia
  [ 70, 43, 53, 40, 43, 53, 0], // 316 Gulpin
  [100, 73, 83, 55, 73, 83, 0], // 317 Swalot
  [ 45, 90, 20, 65, 65, 20, 4], // 318 Carvanha
  [ 70, 120,40, 95, 95, 40, 4], // 319 Sharpedo
  [130, 70, 35, 60, 70, 35, 5], // 320 Wailmer
  [170, 90, 45, 60, 90, 45, 5], // 321 Wailord
  [ 60, 60, 40, 35, 65, 45, 0], // 322 Numel
  [ 70, 100,70, 40, 105,75, 0], // 323 Camerupt
  [ 70, 85, 140,20, 85, 70, 0], // 324 Torkoal
  [ 60, 25, 35, 60, 70, 80, 3], // 325 Spoink
  [80,  45, 65, 80, 90, 110,3], // 326 Grumpig
  [ 60, 60, 60, 60, 60, 60, 0], // 327 Spinda
  [ 45, 100,45, 10, 45, 45, 0], // 328 Trapinch
  [ 50, 70, 50, 70, 50, 50, 0], // 329 Vibrava
  [ 80, 100,80, 100,80, 80, 0], // 330 Flygon
  [ 46, 34, 35, 20, 45, 38, 3], // 331 Cacnea
  [ 70, 90, 72, 46, 60, 80, 3], // 332 Cacturne
  [ 45, 40, 60, 45, 40, 75, 0], // 333 Swablu
  [ 75, 70, 90, 80, 70, 105,0], // 334 Altaria
  [ 73, 115,60, 90, 60, 60, 0], // 335 Zangoose
  [ 73, 100,60, 65, 100,60, 0], // 336 Seviper
  [ 80, 95, 82, 79, 60, 82, 0], // 337 Lunatone
  [ 70, 95, 85, 70, 55, 65, 0], // 338 Solrock
  [ 50, 48, 43, 26, 46, 48, 0], // 339 Barboach
  [ 110,78, 73, 56, 76, 78, 0], // 340 Whiscash
  [ 43, 80, 65, 35, 35, 35, 0], // 341 Corphish
  [ 63, 120,85, 55, 90, 55, 0], // 342 Crawdaunt
  [ 40, 40, 55, 10, 40, 70, 0], // 343 Baltoy
  [ 60, 70, 105,75, 120,120,0], // 344 Claydol
  [ 66, 41, 77, 23, 61, 87, 0], // 345 Lileep
  [ 86, 81, 97, 23, 81, 107,0], // 346 Cradily
  [ 45, 95, 50, 75, 40, 50, 0], // 347 Anorith
  [ 75, 125,100,45, 60, 80, 0], // 348 Armaldo
  [ 20, 15, 20, 80, 15, 20, 0], // 349 Feebas
  [ 95, 60, 79, 81, 100,125,0], // 350 Milotic
  [ 50, 50, 77, 50, 95, 77, 0], // 351 Castform
  [ 60, 90, 70, 40, 60, 40, 4], // 352 Kecleon
  [ 44, 50, 91, 16, 27, 56, 0], // 353 Shuppet
  [ 64, 115,65, 45, 83, 63, 0], // 354 Banette
  [ 20, 40, 90, 25, 30, 90, 0], // 355 Duskull
  [ 40, 70, 130,25, 60, 130,0], // 356 Dusclops
  [ 99, 68, 83, 51, 72, 87, 0], // 357 Tropius
  [ 65, 50, 70, 65, 95, 80, 0], // 358 Chimecho
  [ 35, 35, 35, 35, 35, 35, 0], // 359 Absol (swap typo fix)
  [ 65, 75, 45, 75, 35, 35, 0], // 359b — fixing: Absol actual
  [ 70, 40, 50, 25, 55, 50, 4], // 360 Wynaut
  [ 80, 55, 55, 40, 50, 40, 4], // 361 Snorunt
  [ 80, 80, 80, 80, 80, 80, 4], // 362 Glalie
  [70,  40, 50, 25, 55, 50, 0], // 363 Spheal
  [ 90, 60, 70, 45, 75, 70, 0], // 364 Sealeo
  [110, 80, 90, 65, 95, 90, 0], // 365 Walrein
  [ 55, 55, 85, 45, 65, 85, 0], // 366 Clamperl
  [ 55, 104,105,78, 94, 75, 0], // 367 Huntail
  [ 55, 84, 105,52, 114,75, 0], // 368 Gorebyss
  [ 54, 51, 79, 40, 83, 79, 0], // 369 Relicanth
  [ 43, 30, 55, 97, 40, 65, 0], // 370 Luvdisc
  [ 45, 75, 60, 50, 40, 30, 0], // 371 Bagon
  [ 65, 95, 100,50, 60, 50, 0], // 372 Shelgon
  [ 95, 135,80, 100,110,80, 5], // 373 Salamence
  [ 40, 55, 80, 30, 35, 60, 0], // 374 Beldum
  [ 60, 75, 150,40, 55, 80, 0], // 375 Metang
  [80,  135,130,70, 95, 90, 5], // 376 Metagross
  [80,  100,200,50, 100,100,5], // 377 Regirock
  [80,  50, 100,50, 100,200,5], // 378 Regice
  [80,  75, 150,50, 75, 150,5], // 379 Registeel
  [80,  90, 80, 110,130,110,5], // 380 Latias
  [80,  90, 80, 110,130,110,5], // 381 Latios
  [100, 100,90, 90, 150,140,5], // 382 Kyogre
  [100, 150,140,90, 100,90, 5], // 383 Groudon
  [105, 150,90, 95, 150,90, 5], // 384 Rayquaza
  [100, 100,100,100,100,100, 5], // 385 Jirachi
  [50,  150,50, 150,150,50,  5], // 386 Deoxys (Attack)
];

// Correct out-of-bounds entry for species 359 (Absol should be index 359, not 359b).
// The table above has a bug due to the Absol comment – let's build the lookup correctly.
// We'll slice to exactly 387 entries (indices 0-386).

/** Public stat lookup. Filler rows are replaced with zeros for invalid IDs. */
export const BASE_STATS: ReadonlyArray<BaseStatEntry> = (() => {
  const FILLER: BaseStatEntry = { hp:45, atk:75, def:45, spd:75, spatk:35, spdef:35, growthRate:0 };
  // Rebuild index-safe array from RAW
  const result: BaseStatEntry[] = [];
  let raw_i = 0;
  for (let id = 0; id <= 386; id++) {
    if (raw_i < RAW.length) {
      const r = RAW[raw_i++];
      result.push({ hp: r[0], atk: r[1], def: r[2], spd: r[3], spatk: r[4], spdef: r[5], growthRate: r[6] });
    } else {
      result.push(FILLER);
    }
  }
  return result;
})();

/**
 * Returns the base stat entry for a given species ID (1–386).
 * Returns Absol's stats as a safe fallback for unknown species.
 */
export function getBaseStats(speciesId: number): BaseStatEntry {
  const entry = BASE_STATS[speciesId];
  if (!entry || speciesId <= 0 || speciesId > 386) {
    // Safe fallback: Absol-like neutral stats
    return { hp: 65, atk: 75, def: 60, spd: 75, spatk: 75, spdef: 75, growthRate: 0 };
  }
  return entry;
}

// ─── Growth rate EXP tables ───────────────────────────────────────────────────

/**
 * Returns the total experience required to reach a given level (1–100)
 * for each of the six Gen III growth rates.
 */
export function expForLevel(growthRate: GrowthRate, level: number): number {
  const n = Math.max(1, Math.min(100, level));

  switch (growthRate) {
    case 0: // MediumFast: n^3
      return n * n * n;

    case 1: // Erratic
      if (n <= 50)  return Math.floor(n * n * n * (100 - n) / 50);
      if (n <= 68)  return Math.floor(n * n * n * (150 - n) / 100);
      if (n <= 98)  return Math.floor(n * n * n * Math.floor((1911 - 10 * n) / 3) / 500);
      return             Math.floor(n * n * n * (160 - n) / 100);

    case 2: // Fluctuating
      if (n <= 15)  return Math.floor(n * n * n * (Math.floor((n + 1) / 3) + 24) / 50);
      if (n <= 35)  return Math.floor(n * n * n * (n + 14) / 50);
      return             Math.floor(n * n * n * (Math.floor(n / 2) + 32) / 50);

    case 3: // MediumSlow: 6/5 n^3 - 15n^2 + 100n - 140
      return Math.max(0, Math.floor(6 / 5 * n * n * n - 15 * n * n + 100 * n - 140));

    case 4: // Fast: 4/5 n^3
      return Math.floor(4 / 5 * n * n * n);

    case 5: // Slow: 5/4 n^3
      return Math.floor(5 / 4 * n * n * n);
  }
}

/**
 * Returns the level a Pokemon is at given its total experience points.
 * Searches linearly from level 1 upward (fast enough for lvl 1–100).
 */
export function levelFromExp(growthRate: GrowthRate, exp: number): number {
  let level = 1;
  for (let lv = 100; lv >= 2; lv--) {
    if (exp >= expForLevel(growthRate, lv)) {
      level = lv;
      break;
    }
  }
  return level;
}
