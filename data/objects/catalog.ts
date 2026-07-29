import type { BimUnit, CadShape, EntityKind, Id } from "@/types/domain";

export type ObjectCategory =
  | "Sitzmöbel"
  | "Bauteile"
  | "Wasser"
  | "Beleuchtung"
  | "Freizeit"
  | "Ausstattung"
  | "Architektur"
  | "Öffnungen";

export type ObjectDefinition = {
  id: Id;
  name: string;
  category: ObjectCategory;
  icon: string;
  kind: EntityKind;
  shape: CadShape;
  width: number;
  depth: number;
  height: number;
  materialId?: Id;
  layerId: Id;
  classification: string;
  unit: BimUnit;
  unitPrice: number;
  carbonKgPerUnit: number;
  maintenanceCycle: "keine" | "monatlich" | "quartalsweise" | "jährlich" | "mehrjährig";
  keywords: string[];
  objectType: string;
  color?: string;
  hostRequired?: boolean;
  sillHeight?: number;
};

function item(
  id: string,
  name: string,
  category: ObjectCategory,
  icon: string,
  kind: EntityKind,
  shape: CadShape,
  size: [number, number, number],
  materialId: string | undefined,
  layerId: string,
  classification: string,
  unitPrice: number,
  objectType: string,
  keywords: string[] = [],
  carbonKgPerUnit = 10,
  maintenanceCycle: ObjectDefinition["maintenanceCycle"] = "jährlich",
  unit: BimUnit = "Stk.",
  hostRequired = false,
  sillHeight = 0
): ObjectDefinition {
  return {
    id,
    name,
    category,
    icon,
    kind,
    shape,
    width: size[0],
    depth: size[1],
    height: size[2],
    materialId,
    layerId,
    classification,
    unit,
    unitPrice,
    carbonKgPerUnit,
    maintenanceCycle,
    keywords,
    objectType,
    hostRequired,
    sillHeight
  };
}

export const OBJECT_CATALOG: ObjectDefinition[] = [
  item("obj-bench-wood", "Gartenbank Holz", "Sitzmöbel", "▰", "furniture", "rectangle", [1.8, .65, .85], "mat-thermowood", "layer-furniture", "AGD-41.10", 380, "bench", ["bank", "sitzen", "holz"]),
  item("obj-bench-metal", "Parkbank Metall", "Sitzmöbel", "▰", "furniture", "rectangle", [1.9, .7, .85], "mat-anthracite-metal", "layer-furniture", "AGD-41.11", 760, "bench", ["bank", "metall", "öffentlich"]),
  item("obj-lounge-sofa", "Outdoor Lounge-Sofa", "Sitzmöbel", "▣", "furniture", "rectangle", [2.2, .9, .75], "mat-anthracite-metal", "layer-furniture", "AGD-41.20", 1250, "sofa", ["lounge", "sofa", "terrasse"]),
  item("obj-lounge-chair", "Outdoor Loungesessel", "Sitzmöbel", "▣", "furniture", "rectangle", [.9, .85, .78], "mat-anthracite-metal", "layer-furniture", "AGD-41.21", 520, "chair", ["sessel", "stuhl", "lounge"]),
  item("obj-dining-table", "Gartentisch 6 Personen", "Sitzmöbel", "▭", "furniture", "rectangle", [2, 1, .76], "mat-thermowood", "layer-furniture", "AGD-41.30", 980, "table", ["tisch", "essen", "terrasse"]),
  item("obj-chair", "Gartenstuhl", "Sitzmöbel", "□", "furniture", "rectangle", [.55, .58, .9], "mat-anthracite-metal", "layer-furniture", "AGD-41.31", 170, "chair", ["stuhl", "sitzen"]),
  item("obj-sun-lounger", "Sonnenliege", "Sitzmöbel", "▱", "furniture", "rectangle", [1.95, .72, .42], "mat-thermowood", "layer-furniture", "AGD-41.40", 390, "lounger", ["liege", "pool", "sonne"]),
  item("obj-sunshade", "Sonnenschirm", "Sitzmöbel", "◉", "furniture", "circle", [3, 3, 2.5], "mat-fabric", "layer-furniture", "AGD-41.50", 480, "sunshade", ["schirm", "schatten", "terrasse"]),

  item("obj-pergola-wood", "Pergola Holz", "Bauteile", "⌂", "building", "rectangle", [3.5, 3, 2.6], "mat-thermowood", "layer-building", "AGD-22.10", 5600, "pergola", ["pergola", "überdachung", "holz"], 280, "jährlich"),
  item("obj-pergola-metal", "Pergola Aluminium", "Bauteile", "⌂", "building", "rectangle", [4, 3.5, 2.7], "mat-anthracite-metal", "layer-building", "AGD-22.11", 9800, "pergola", ["pergola", "lamellen", "aluminium"], 420, "jährlich"),
  item("obj-pavilion", "Gartenpavillon", "Bauteile", "⌂", "building", "polygon", [3.5, 3.5, 3], "mat-thermowood", "layer-building", "AGD-22.20", 7200, "pavilion", ["pavillon", "dach", "sitzplatz"], 380),
  item("obj-carport-single", "Carport Einzel", "Bauteile", "▥", "building", "rectangle", [5.5, 3.2, 2.7], "mat-thermowood", "layer-building", "AGD-22.30", 8900, "carport", ["auto", "carport", "stellplatz"], 520),
  item("obj-carport-double", "Carport Doppel", "Bauteile", "▥", "building", "rectangle", [6, 5.5, 2.8], "mat-anthracite-metal", "layer-building", "AGD-22.31", 16800, "carport", ["auto", "doppelcarport", "stellplatz"], 860),
  item("obj-garden-shed", "Gartenhaus", "Bauteile", "⌂", "building", "rectangle", [3.2, 2.6, 2.5], "mat-thermowood", "layer-building", "AGD-22.40", 6200, "shed", ["gartenhaus", "geräte", "lager"], 390),
  item("obj-raised-bed", "Hochbeet", "Bauteile", "▤", "furniture", "rectangle", [2, 1, .75], "mat-thermowood", "layer-furniture", "AGD-42.10", 540, "raised-bed", ["hochbeet", "gemüse", "pflanzen"]),
  item("obj-planter-large", "Pflanzkübel groß", "Bauteile", "▣", "furniture", "rectangle", [.8, .8, .75], "mat-corten", "layer-furniture", "AGD-42.11", 480, "planter", ["kübel", "pflanzgefäß", "corten"]),
  item("obj-screen", "Sichtschutz 2 m", "Bauteile", "▥", "wall", "line", [2, .12, 1.8], "mat-thermowood", "layer-building", "AGD-23.10", 720, "screen", ["sichtschutz", "wand", "holz"], 38, "mehrjährig", "m"),
  item("obj-fence-wood", "Holzzaun 2 m", "Bauteile", "╫", "wall", "line", [2, .1, 1.2], "mat-thermowood", "layer-building", "AGD-23.20", 260, "fence", ["zaun", "holz", "grenze"], 22, "mehrjährig", "m"),
  item("obj-fence-metal", "Doppelstabmattenzaun 2,5 m", "Bauteile", "╫", "wall", "line", [2.5, .08, 1.4], "mat-anthracite-metal", "layer-building", "AGD-23.21", 310, "fence", ["zaun", "metall", "grenze"], 34, "mehrjährig", "m"),
  item("obj-gate", "Gartentor", "Bauteile", "▯", "wall", "rectangle", [1.2, .15, 1.5], "mat-anthracite-metal", "layer-building", "AGD-23.30", 980, "gate", ["tor", "zugang", "metall"]),
  item("obj-retaining-wall", "Stützwand", "Bauteile", "▥", "wall", "line", [3, .3, 1.2], "mat-natural-stone", "layer-building", "AGD-23.40", 980, "retaining-wall", ["mauer", "stützwand", "gelände"], 95, "mehrjährig", "m"),
  item("obj-stairs", "Gartentreppe 5 Stufen", "Bauteile", "▰", "building", "rectangle", [1.5, 1.6, .85], "mat-natural-stone", "layer-building", "AGD-24.10", 2600, "stairs", ["treppe", "stufen", "höhe"], 160),
  item("obj-ramp", "Rampe", "Bauteile", "▱", "building", "rectangle", [1.5, 4, .6], "mat-concrete", "layer-building", "AGD-24.20", 2400, "ramp", ["rampe", "barrierefrei", "zugang"], 240),

  item("obj-pool-rect", "Pool rechteckig 8 × 4 m", "Wasser", "▭", "water", "rectangle", [8, 4, 1.5], "mat-water", "layer-water", "AGD-51.10", 34000, "pool", ["pool", "schwimmen", "wasser"], 1100, "monatlich"),
  item("obj-pool-compact", "Pool kompakt 5 × 3 m", "Wasser", "▭", "water", "rectangle", [5, 3, 1.4], "mat-water", "layer-water", "AGD-51.11", 22000, "pool", ["pool", "klein", "wasser"], 760, "monatlich"),
  item("obj-pool-round", "Rundpool Ø 4 m", "Wasser", "○", "water", "circle", [4, 4, 1.2], "mat-water", "layer-water", "AGD-51.12", 9800, "pool", ["pool", "rund", "wasser"], 430, "monatlich"),
  item("obj-pond", "Naturteich", "Wasser", "≈", "water", "ellipse", [5, 3.5, .6], "mat-water", "layer-water", "AGD-52.10", 8200, "pond", ["teich", "biotop", "naturnah"], 160, "quartalsweise"),
  item("obj-water-basin", "Wasserbecken", "Wasser", "▭", "water", "rectangle", [2.5, 1.2, .45], "mat-water", "layer-water", "AGD-52.20", 4200, "water-basin", ["becken", "wasser", "modern"], 120, "monatlich"),
  item("obj-fountain", "Gartenbrunnen", "Wasser", "◉", "water", "circle", [1.6, 1.6, 1.1], "mat-natural-stone", "layer-water", "AGD-52.30", 2800, "fountain", ["brunnen", "wasser", "fontäne"], 85, "monatlich"),
  item("obj-spring-stone", "Quellstein", "Wasser", "◆", "water", "circle", [1, 1, .7], "mat-natural-stone", "layer-water", "AGD-52.40", 1450, "spring-stone", ["quellstein", "wasser", "naturstein"], 45, "monatlich"),

  item("obj-bollard-light", "Pollerleuchte", "Beleuchtung", "⚑", "furniture", "circle", [.18, .18, .8], "mat-anthracite-metal", "layer-lighting", "AGD-61.10", 220, "bollard-light", ["licht", "poller", "weg"]),
  item("obj-path-light", "Wegeleuchte", "Beleuchtung", "✦", "furniture", "circle", [.22, .22, .55], "mat-anthracite-metal", "layer-lighting", "AGD-61.11", 180, "path-light", ["licht", "weg", "led"]),
  item("obj-pole-light", "Mastleuchte", "Beleuchtung", "⚑", "furniture", "circle", [.25, .25, 3.2], "mat-anthracite-metal", "layer-lighting", "AGD-61.20", 780, "pole-light", ["licht", "mast", "platz"]),
  item("obj-ground-spot", "Bodenspot", "Beleuchtung", "⊙", "furniture", "circle", [.16, .16, .08], "mat-anthracite-metal", "layer-lighting", "AGD-61.30", 130, "ground-spot", ["spot", "boden", "baum"]),
  item("obj-wall-light", "Wandleuchte", "Beleuchtung", "◐", "furniture", "rectangle", [.28, .15, .35], "mat-anthracite-metal", "layer-lighting", "AGD-61.40", 190, "wall-light", ["licht", "wand", "fassade"]),
  item("obj-light-chain", "Lichterkette 5 m", "Beleuchtung", "•••", "annotation", "line", [5, .04, 2.4], "mat-anthracite-metal", "layer-lighting", "AGD-61.50", 160, "light-chain", ["licht", "kette", "pergola"], 6, "jährlich", "m"),

  item("obj-swing", "Doppelschaukel", "Freizeit", "⌁", "building", "rectangle", [3.2, 2.2, 2.4], "mat-thermowood", "layer-furniture", "AGD-71.10", 1450, "swing", ["schaukel", "kinder", "spiel"]),
  item("obj-slide", "Rutsche", "Freizeit", "▱", "building", "rectangle", [3.1, .8, 1.8], "mat-anthracite-metal", "layer-furniture", "AGD-71.20", 980, "slide", ["rutsche", "kinder", "spiel"]),
  item("obj-sandbox", "Sandkasten", "Freizeit", "▣", "furniture", "rectangle", [2, 2, .3], "mat-thermowood", "layer-furniture", "AGD-71.30", 520, "sandbox", ["sand", "kinder", "spiel"]),
  item("obj-trampoline", "Trampolin Ø 3 m", "Freizeit", "◎", "furniture", "circle", [3, 3, .75], "mat-anthracite-metal", "layer-furniture", "AGD-71.40", 890, "trampoline", ["trampolin", "sport", "kinder"]),
  item("obj-firepit", "Feuerstelle", "Freizeit", "◉", "furniture", "circle", [1.4, 1.4, .35], "mat-corten", "layer-furniture", "AGD-72.10", 780, "firepit", ["feuer", "grill", "sitzen"]),
  item("obj-grill", "Gasgrill", "Freizeit", "▦", "furniture", "rectangle", [1.5, .7, 1.2], "mat-anthracite-metal", "layer-furniture", "AGD-72.20", 1150, "grill", ["grill", "kochen", "terrasse"]),
  item("obj-outdoor-kitchen", "Outdoor-Küche", "Freizeit", "▤", "furniture", "rectangle", [3, .75, .95], "mat-anthracite-metal", "layer-furniture", "AGD-72.30", 6800, "outdoor-kitchen", ["küche", "grill", "kochen"]),

  item("obj-bike-rack", "Fahrradständer 5 Plätze", "Ausstattung", "⋂", "furniture", "rectangle", [2.2, .65, .55], "mat-anthracite-metal", "layer-furniture", "AGD-81.10", 520, "bike-rack", ["fahrrad", "ständer", "abstellen"]),
  item("obj-mailbox", "Briefkastenstele", "Ausstattung", "▥", "furniture", "rectangle", [.45, .25, 1.25], "mat-anthracite-metal", "layer-furniture", "AGD-81.20", 650, "mailbox", ["briefkasten", "eingang", "post"]),
  item("obj-bin-box", "Mülltonnenbox 3-fach", "Ausstattung", "▤", "furniture", "rectangle", [2.1, .9, 1.25], "mat-anthracite-metal", "layer-furniture", "AGD-81.30", 1800, "bin-box", ["müll", "tonne", "box"]),
  item("obj-composter", "Komposter", "Ausstattung", "▣", "furniture", "rectangle", [1, 1, 1], "mat-thermowood", "layer-furniture", "AGD-81.40", 230, "composter", ["kompost", "garten", "bio"]),
  item("obj-rain-barrel", "Regentonne 500 l", "Ausstattung", "◉", "furniture", "circle", [.85, .85, 1.1], "mat-anthracite-metal", "layer-water", "AGD-81.50", 320, "rain-barrel", ["regen", "wasser", "speicher"]),
  item("obj-robot-station", "Mähroboter-Station", "Ausstattung", "⌂", "furniture", "rectangle", [.85, .7, .45], "mat-anthracite-metal", "layer-furniture", "AGD-81.60", 280, "robot-station", ["mähroboter", "rasen", "technik"]),
  item("obj-rock", "Findling", "Ausstattung", "◆", "furniture", "polygon", [1.4, 1, .7], "mat-natural-stone", "layer-site", "AGD-82.10", 480, "rock", ["stein", "findling", "deko"], 12, "keine"),

  item("obj-door-entry", "Haustür 1,10 m", "Öffnungen", "🚪", "opening", "rectangle", [1.1, .18, 2.15], "mat-thermowood", "layer-building", "AGD-25.10", 3400, "door", ["tür", "haustür", "eingang", "anschlag"], 95, "jährlich", "Stk.", true, 0),
  item("obj-door-interior", "Tür 90 cm", "Öffnungen", "▯", "opening", "rectangle", [.9, .14, 2.01], "mat-thermowood", "layer-building", "AGD-25.11", 980, "door", ["tür", "innentür", "durchgang", "anschlag"], 42, "jährlich", "Stk.", true, 0),
  item("obj-sliding-door", "Hebeschiebetür 2,80 m", "Öffnungen", "▥", "opening", "rectangle", [2.8, .2, 2.25], "mat-glass", "layer-building", "AGD-25.20", 7800, "sliding-door", ["schiebetür", "glas", "terrasse", "öffnung"], 220, "jährlich", "Stk.", true, 0),
  item("obj-window-standard", "Fenster 1,20 × 1,35 m", "Öffnungen", "▣", "opening", "rectangle", [1.2, .18, 1.35], "mat-glass", "layer-building", "AGD-26.10", 1250, "window", ["fenster", "glas", "brüstung", "fassade"], 58, "jährlich", "Stk.", true, .9),
  item("obj-window-full-height", "Fenster bodentief 1,20 m", "Öffnungen", "▥", "opening", "rectangle", [1.2, .18, 2.25], "mat-glass", "layer-building", "AGD-26.20", 1950, "window", ["fenster", "bodentief", "glas", "fassade"], 82, "jährlich", "Stk.", true, 0),
  item("obj-garage-gate", "Garagentor 2,50 m", "Öffnungen", "▤", "opening", "rectangle", [2.5, .22, 2.25], "mat-anthracite-metal", "layer-building", "AGD-27.10", 4200, "gate", ["tor", "garage", "sektionaltor", "öffnung"], 180, "jährlich", "Stk.", true, 0),
  item("obj-wall-opening", "Freier Durchgang 1,20 m", "Öffnungen", "⬚", "opening", "rectangle", [1.2, .18, 2.2], undefined, "layer-building", "AGD-27.20", 480, "opening", ["durchgang", "öffnung", "aussparung", "wand"], 12, "keine", "Stk.", true, 0),

  item("obj-wintergarden", "Wintergarten", "Architektur", "⌂", "building", "rectangle", [4, 3, 2.8], "mat-glass", "layer-building", "AGD-21.10", 28500, "wintergarden", ["wintergarten", "glas", "haus"], 920),
  item("obj-balcony", "Balkon", "Architektur", "▱", "building", "rectangle", [3.5, 1.8, .2], "mat-concrete", "layer-building", "AGD-21.20", 9200, "balcony", ["balkon", "haus", "terrasse"], 480),
  item("obj-railing", "Geländer 3 m", "Architektur", "╫", "wall", "line", [3, .1, 1.05], "mat-anthracite-metal", "layer-building", "AGD-21.30", 960, "railing", ["geländer", "absturz", "metall"], 58, "mehrjährig", "m"),
  item("obj-column", "Stütze", "Architektur", "▮", "building", "rectangle", [.3, .3, 2.8], "mat-concrete", "layer-building", "AGD-21.40", 620, "column", ["stütze", "säule", "tragwerk"], 75),
  item("obj-glass-wall", "Glaswand 2 m", "Architektur", "▥", "wall", "line", [2, .08, 1.8], "mat-glass", "layer-building", "AGD-21.50", 1500, "glass-wall", ["glas", "wand", "windschutz"], 52, "mehrjährig", "m")
];

export const OBJECT_CATEGORIES: ObjectCategory[] = [
  "Sitzmöbel",
  "Bauteile",
  "Wasser",
  "Beleuchtung",
  "Freizeit",
  "Ausstattung",
  "Architektur",
  "Öffnungen"
];

export const ARCHITECTURE_OPENING_CATALOG = OBJECT_CATALOG.filter(item => item.hostRequired);
