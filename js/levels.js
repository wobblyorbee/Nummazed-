// =========================================================
// 100 PROGRESSIVE LEVELS CONFIGURATION & SEEDED RANDOM GENERATOR
// Level 1-100 dengan kurva kesulitan bertahap, deterministik (seeded),
// dan prinsip "Puzzle Bolak-Balik Mencari Rumus Matematika"
// =========================================================

// PRNG (Pseudo-Random Number Generator) deterministik berbasis Seed (Mulberry32)
// Menjamin bahwa ketika level di-refresh / di-restart, bentuk labirin & susunan angka SELALU SAMA PERSIS!
class SeededRNG {
  constructor(seed) {
    this.seed = seed;
  }
  
  next() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice(arr) {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// Generator konfigurasi 100 level secara prosedural bertahap
function generate100Levels() {
  const levels = [];
  
  const worlds = [
    { name: 'Taman Angka Ceria', color: '#4ade80', icon: '🌱' },      // Lv 1-25: Tambah & Kurang Dasar
    { name: 'Lembah Pelangi Ajaib', color: '#38bdf8', icon: '🌈' },    // Lv 26-50: Labirin Sedang & Pengurangan Taktis
    { name: 'Hutan Bintang Perkalian', color: '#fbbf24', icon: '⭐' }, // Lv 51-75: Pengenalan Perkalian (×2, ×3)
    { name: 'Kastil Awan Master', color: '#c084fc', icon: '🏰' }       // Lv 76-100: Operasi Lengkap (+, -, ×, ÷)
  ];

  for (let i = 1; i <= 100; i++) {
    const worldIndex = Math.min(3, Math.floor((i - 1) / 25));
    const world = worlds[worldIndex];

    // Ukuran Labirin Bertahap:
    // Level 1-10: 3x3 (Ruang kecil, sedikit sekat, fokus bolak-balik berhitung)
    // Level 11-25: 4x4 (Mulai ada lorong sekat labirin)
    // Level 26-50: 5x5 (Labirin sedang dengan jalan buntu dan rute bolak-balik)
    // Level 51-75: 6x6 (Labirin besar + perkalian)
    // Level 76-100: 7x7 s/d 8x8 (Tantangan master labirin)
    let cols = 3;
    let rows = 3;
    if (i > 10 && i <= 25) { cols = 4; rows = 4; }
    else if (i > 25 && i <= 50) { cols = 5; rows = 5; }
    else if (i > 50 && i <= 75) { cols = 6; rows = 6; }
    else if (i > 75) { cols = (i > 90 ? 8 : 7); rows = (i > 90 ? 8 : 7); }

    // Dinding & Loop (Braid Chance):
    // Level 1-10: Loop tinggi (0.45) agar banyak jalur terbuka untuk bolak-balik
    // Level tinggi: Semakin sedikit loop (0.1 - 0.2) sehingga esensi labirin & lorong buntu terasa nyata
    let loopChance = 0.45;
    if (i > 10 && i <= 25) loopChance = 0.35;
    else if (i > 25 && i <= 50) loopChance = 0.25;
    else if (i > 50 && i <= 75) loopChance = 0.20;
    else if (i > 75) loopChance = 0.15;

    // Operasi Hitung yang Digunakan:
    let ops = ['+', '-'];
    let maxNum = Math.min(3 + Math.floor(i / 10), 9);
    let startVal = 0;
    let targetVal = 5 + (i * 2); // Target bertambah bertahap

    if (i >= 51 && i <= 75) {
      ops = ['+', '-', '×'];
      targetVal = 20 + ((i - 50) * 3);
    } else if (i >= 76) {
      ops = ['+', '-', '×', '÷'];
      targetVal = 30 + ((i - 75) * 4);
    }

    let title = `Tantangan #${i}`;
    if (i === 1) title = 'Langkah Awal: Bolak-Balik Angka';
    else if (i === 10) title = 'Ujian Taman Angka';
    else if (i === 25) title = 'Gerbang Lembah Pelangi';
    else if (i === 50) title = 'Puncak Lembah Pelangi';
    else if (i === 75) title = 'Raja Bintang Perkalian';
    else if (i === 100) title = 'Juara Agung Labirin 100';

    levels.push({
      id: i,
      seed: 1000 + (i * 7919), // Seed angka prima unik & deterministik tiap level
      world: world.name,
      worldIcon: world.icon,
      worldColor: world.color,
      title: title,
      size: { cols, rows },
      startVal,
      targetVal,
      ops,
      maxNum,
      loopChance,
      hintText: i <= 10 
        ? 'Kamu bisa jalan bolak-balik menginjak ubin yang sama untuk menambah / mengurangi angka!'
        : 'Rancang rute bolak-balikmu dan perhatikan dinding labirin!'
    });
  }

  return levels;
}

const ADVENTURE_LEVELS = generate100Levels();

// Pilihan Karakter Sahabat Petualang
const CHARACTERS = [
  { id: 'fox', name: 'Kiki Si Rubah', emoji: '🦊', color: '#ff7849', desc: 'Cepat & Cerdas' },
  { id: 'bunny', name: 'Mimi Si Kelinci', emoji: '🐰', color: '#f472b6', desc: 'Lincah Melompat' },
  { id: 'bear', name: 'Bobi Si Beruang', emoji: '🐻', color: '#fbbf24', desc: 'Kuat & Teliti' },
  { id: 'frog', name: 'Koko Si Katak', emoji: '🐸', color: '#4ade80', desc: 'Ahli Labirin' },
  { id: 'cat', name: 'Lili Si Kucing', emoji: '🐱', color: '#c084fc', desc: 'Ceria & Suka Belajar' }
];

window.SeededRNG = SeededRNG;
window.ADVENTURE_LEVELS = ADVENTURE_LEVELS;
window.CHARACTERS = CHARACTERS;
