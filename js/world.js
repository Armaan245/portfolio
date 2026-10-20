// Room layout. World is 1280×860 px; sprites are drawn at their atlas size × scale.
//   s: sprite name (assets/sprites.js)   x,y: top-left   sc: scale
//   layer: 'floor' | 'wall' (baked into the static background) | 'obj' (depth-sorted)
//   solid: true → footprint = bottom `foot` fraction of the sprite; or [dx,dy,w,h]; false = walk-through
//   on: name of another object id this one sits on (sorts just after it)
//   fx: name of a custom draw hook in game.js
window.WORLD = {
  W: 1280, H: 860,
  objectScale: 0.82, // shrink all furniture & decor (1 = original size) for a roomier feel
  cat: [183, 26],     // where the sleeping cat is inside the sofa image (for hearts / z's)
  room: { x0: 44, x1: 1236, top: 30, wallBase: 208, bottom: 792, doorGap: [586, 704] },
  walk: { x0: 66, x1: 1214, y0: 232, y1: 778 },

  objects: [
    // ── rugs & mats ──
    { s: 'rug_blue', x: 470, y: 382, sc: 1.2, layer: 'floor' },
    { s: 'mat_blue', x: 338, y: 646, layer: 'floor' },

    // ── back wall (Authentic Japanese Post-and-Beam & Shoji Architecture) ──
    { id: 'door', s: 'door', x: 56, y: 104, fixed: true, layer: 'wall', customOnly: true, fx: 'japaneseDoor' },
    { id: 'board_build', s: 'board_build', x: 174, y: 106, fixed: true, layer: 'wall', customOnly: true, fx: 'japanesePlaqueBuild' },
    { id: 'win1', s: 'window_wide', x: 292, y: 104, fixed: true, layer: 'wall', customOnly: true, fx: 'japaneseWindowWide' },
    { id: 'board_ideas', s: 'board_ideas', x: 754, y: 106, fixed: true, layer: 'wall', customOnly: true, fx: 'japanesePlaqueIdeas' },
    { id: 'win2', s: 'window_a', x: 852, y: 104, fixed: true, layer: 'wall', customOnly: true, fx: 'japaneseWindowA' },

    // ── desk 1: DATADUKAN (Data Marketplace & Analytics workstation) ──
    { id: 'desk1', s: 'ws_trustyy', x: 294, y: 170, base: 325, solid: [4, 62, 261, 92], fx: 'deskDataDukan' },
    { s: 'ws_trustyy_chair', x: 372, y: 289, solid: [26, 36, 58, 22] },

    // ── centre Japanese bookshelf (Skills & Tools) ──
    { id: 'shelf1', s: 'bookshelf', x: 638, y: 88, solid: [4, 110, 96, 47] },
    { s: 'lamp', x: 650, y: 20, on: 'shelf1', id: 'lamp_shelf' },
    { s: 'vine_b', x: 708, y: 72, on: 'shelf1' },

    // ── desk 2: VAULTDOC (Zero-Knowledge Document Vault workstation) ──
    { id: 'desk2', s: 'ws_gooddex', x: 778, y: 170, base: 325, solid: [4, 62, 268, 92], fx: 'deskVaultDoc' },
    { s: 'ws_gooddex_chair', x: 856, y: 291, solid: [24, 34, 56, 22] },

    // ── music & vinyl corner (Lofi Studio) ──
    { id: 'music_shelf', s: 'low_shelf', x: 1088, y: 232, solid: true, foot: 0.5 },
    { id: 'turntable', s: 'turntable', x: 1086, y: 186, on: 'music_shelf', fx: 'spinRecord' },
    { id: 'guitar', s: 'guitar', x: 1190, y: 212, sc: 0.55, solid: [4, 90, 37, 20] },

    // ── left wall (Cedar shelves & studio decor) ──
    { s: 'plant_a', x: 62, y: 216, solid: [12, 80, 58, 34] },
    { id: 'shelf2', s: 'bookshelf', x: 66, y: 330, solid: [4, 110, 96, 47] },
    { s: 'camera', x: 104, y: 278, on: 'shelf2' },
    { id: 'drawers_l', s: 'drawers_b', x: 70, y: 478, solid: [2, 72, 65, 40] },
    { id: 'globe', s: 'globe', x: 68, y: 392, on: 'drawers_l' },

    { s: 'bottle', x: 362, y: 662, solid: [4, 56, 29, 20] },

    // ── bottom-left ──
    { s: 'plant_big', x: 52, y: 640, solid: [24, 112, 62, 35] },
    { id: 'bench_l', s: 'bench', x: 172, y: 712, solid: true, foot: 0.55 },
    { s: 'radio', x: 186, y: 700, on: 'bench_l' },
    { s: 'plant_tiny', x: 236, y: 680, on: 'bench_l' },

    // ── centre lounge ──
    { id: 'table', s: 'coffee_table', x: 548, y: 440, sc: 1.1, solid: [6, 50, 152, 52] },
    { id: 'laptop', s: 'laptop', x: 566, y: 420, on: 'table' },
    { s: 'plant_tiny', x: 650, y: 428, on: 'table' },
    { s: 'mug_b', x: 622, y: 458, on: 'table' },
    { s: 'red_book', x: 672, y: 440, on: 'table' },
    { id: 'sofa', s: 'sofa_cat', x: 508, y: 602, solid: [4, 52, 235, 58] },
    { id: 'side_l', s: 'drawer_unit', x: 428, y: 640, solid: [4, 40, 69, 36] },
    { s: 'plant_e', x: 440, y: 586, on: 'side_l' },
    { id: 'side_r', s: 'drawers', x: 762, y: 620, solid: [2, 60, 48, 38] },
    { id: 'floor_lamp', s: 'lamp', x: 767, y: 558, on: 'side_r' },

    // ── right side (Studio workstations & terminal) ──
    { id: 'github', s: 'github', x: 860, y: 376, solid: [6, 160, 145, 24], fx: 'githubBoard' },
    { id: 'desk3', s: 'desk', x: 1022, y: 392, sc: 0.75, solid: [4, 30, 198, 60] },
    { id: 'monitor3', s: 'monitor', x: 1068, y: 352, on: 'desk3', fx: 'screenCode' },
    { s: 'mug', x: 1036, y: 414, on: 'desk3' },
    { s: 'keyboard', x: 1086, y: 428, on: 'desk3' },
    { s: 'red_book', x: 1170, y: 402, on: 'desk3' },
    { s: 'chair_brown', x: 1080, y: 444, solid: [14, 62, 62, 34] },
    { id: 'beanbag', s: 'beanbag', x: 940, y: 652, solid: [8, 50, 98, 50] },
    { s: 'robot_vac', x: 1034, y: 612, solid: [6, 30, 70, 36], fx: 'roomba', id: 'roomba' },
    { id: 'shelf3', s: 'bookshelf', x: 1120, y: 600, solid: [4, 110, 96, 47] },
    { s: 'plant_d', x: 1134, y: 528, on: 'shelf3' },

    // ── entrance ──
    { s: 'entrance_mat', x: 584, y: 776, layer: 'floor', fixed: true },
    { s: 'entrance_plant_l', x: 500, y: 748, base: 900 },
    { s: 'entrance_plant_r', x: 722, y: 748, base: 900 },
  ],

  // Night-time light sources: x,y centre, r radius, c glow colour
  lights: [
    { obj: 'lamp_shelf', x: 671, y: 40, r: 190, c: '255,200,110' },   // shelf lamp
    { obj: 'desk2', x: 1006, y: 222, r: 170, c: '255,200,110' }, // desk lamp (in the GOODDEX image)
    { obj: 'floor_lamp', x: 788, y: 575, r: 230, c: '255,190,100' },  // floor lamp
    { obj: 'desk1', x: 428, y: 205, r: 150, c: '120,170,255' },  // monitor 1
    { obj: 'desk2', x: 920, y: 205, r: 150, c: '120,255,180' },  // monitor 2
    { obj: 'monitor3', x: 1124, y: 380, r: 120, c: '120,200,255' }, // code monitor
    { obj: 'np', x: 1122, y: 152, r: 140, c: '140,255,160' }, // now playing
    { obj: 'win1', x: 450, y: 152, r: 150, c: '170,190,255' },  // window (moon)
    { obj: 'win2', x: 928, y: 152, r: 120, c: '170,190,255' },
  ],

  // Interactive spots. rect: clickable/highlight area. at: where the player stands. face: direction.
  hotspots: [
    { id: 'contact', obj: 'door', label: 'Door · Contact', rect: [56, 104, 104, 104], at: [108, 250], face: 'up', panel: 'contact' },
    { id: 'about', obj: 'board_build', label: 'About me', rect: [174, 106, 88, 92], at: [218, 250], face: 'up', panel: 'about' },
    { id: 'datadukan', obj: 'desk1', label: 'DataDukan', rect: [346, 170, 164, 70], rect2: [294, 230, 269, 120], at: [428, 392], face: 'up', panel: 'datadukan' },
    { id: 'skills', obj: 'shelf1', label: 'Skills & tools', rect: [638, 88, 104, 157], at: [690, 262], face: 'up', panel: 'skills' },
    { id: 'ideas', obj: 'board_ideas', label: 'Philosophy', rect: [754, 106, 85, 92], at: [796, 250], face: 'up', panel: 'ideas' },
    { id: 'vaultdoc', obj: 'desk2', label: 'VaultDoc', rect: [830, 170, 164, 70], rect2: [778, 230, 284, 120], at: [920, 392], face: 'up', panel: 'vaultdoc' },
    { id: 'music', obj: 'np', obj2: 'turntable', label: 'Record player', rect: [1040, 106, 164, 92], rect2: [1086, 186, 107, 112], at: [1138, 322], face: 'up', panel: 'music', action: 'music' },
    { id: 'guitar', obj: 'guitar', label: 'Guitar', rect: [1190, 212, 45, 111], at: [1196, 352], face: 'up', action: 'guitar' },
    { id: 'location', obj: 'globe', label: 'Globe', rect: [68, 392, 72, 98], at: [168, 536], face: 'left', panel: 'location' },
    { id: 'resume', obj: 'table', label: 'Laptop · Resume', rect: [548, 418, 164, 129], at: [630, 568], face: 'up', panel: 'resume' },
    { id: 'cat', obj: 'sofa', label: 'Pet the cat', rect: [656, 625, 69, 35], at: [692, 742], face: 'up', action: 'pet' },
    { id: 'lamp', obj: 'floor_lamp', label: 'Lamp · Night mode', rect: [762, 558, 52, 162], at: [790, 742], face: 'up', action: 'night' },
    { id: 'github', obj: 'github', label: 'GitHub', rect: [860, 376, 157, 186], at: [938, 586], face: 'up', panel: 'github' },
    { id: 'experience', obj: 'desk3', label: 'Experience', rect: [1022, 352, 206, 132], at: [1126, 566], face: 'up', panel: 'experience' },
    { id: 'reading', obj: 'shelf3', label: 'Design shelf', rect: [1120, 600, 104, 157], at: [1172, 774], face: 'up', panel: 'reading' },
    { id: 'exit', label: 'Say goodbye', rect: [584, 776, 122, 70], at: [645, 770], face: 'down', panel: 'contact' },
  ],
};
