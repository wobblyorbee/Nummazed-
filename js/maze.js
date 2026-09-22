// =========================================================
// DETERMINISTIC REAL MAZE GENERATOR + "BOLAK-BALIK BERHITUNG" PUZZLE
// Menggunakan Seeded RNG agar bentuk labirin selalu KONSISTEN & PERSISTEN saat di-refresh!
// Menjamin bahwa ubin tersebar acak secara logis, mengharuskan pemain bolak-balik berhitung
// =========================================================

class KidsMazeGenerator {
  constructor(cols, rows, seed = 12345) {
    this.cols = cols;
    this.rows = rows;
    this.rng = new SeededRNG(seed);
    this.grid = [];
  }

  generate(loopChance = 0.4) {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          c, r,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false,
          isStart: false,
          isExit: false,
          isDeadEnd: false,
          op: null, // '+', '-', '×', '÷'
          val: 0,
          displayText: '',
          walkCount: 0
        });
      }
      this.grid.push(row);
    }

    // 1. Algoritma DFS Recursive Backtracker dengan Seeded RNG
    const stack = [];
    let current = this.grid[0][0];
    current.visited = true;

    let unvisitedCount = this.cols * this.rows - 1;

    while (unvisitedCount > 0) {
      const neighbors = this.getUnvisitedNeighbors(current);
      if (neighbors.length > 0) {
        const nextIndex = this.rng.range(0, neighbors.length - 1);
        const next = neighbors[nextIndex];
        this.removeWalls(current, next);
        stack.push(current);
        current = next;
        current.visited = true;
        unvisitedCount--;
      } else if (stack.length > 0) {
        current = stack.pop();
      } else {
        break;
      }
    }

    // Titik Awal & Titik Akhir
    this.grid[0][0].isStart = true;
    this.grid[this.rows - 1][this.cols - 1].isExit = true;

    // 2. Braid Sebagian Jalan Buntu (Ubah lorong buntu menjadi loop terhubung)
    // Memastikan seluruh grid ubin dapat dikunjungi tanpa mengorbankan struktur dinding labirin
    this.braidDeadEnds(0.4);

    // 3. Tambahkan Loop Terarah (Konektivitas Proporsional)
    // Menjaga agar pembatas dinding tetap kokoh dan terasa seperti labirin sejati ("ada jalur"),
    // namun tetap menyediakan rute bolak-balik untuk mengakses seluruh angka di grid
    this.addRichLoops(loopChance);

    // 4. Pastikan kotak FINISH memiliki minimal 2 akses masuk (dari atas dan dari kiri jika memungkinkan)
    const exitR = this.rows - 1;
    const exitC = this.cols - 1;
    if (exitR > 0) {
      this.grid[exitR][exitC].walls.top = false;
      this.grid[exitR - 1][exitC].walls.bottom = false;
    }
    if (exitC > 0) {
      this.grid[exitR][exitC].walls.left = false;
      this.grid[exitR][exitC - 1].walls.right = false;
    }

    this.detectDeadEnds();

    return this.grid;
  }

  getUnvisitedNeighbors(cell) {
    const { c, r } = cell;
    const neighbors = [];
    if (r > 0 && !this.grid[r - 1][c].visited) neighbors.push(this.grid[r - 1][c]);
    if (c < this.cols - 1 && !this.grid[r][c + 1].visited) neighbors.push(this.grid[r][c + 1]);
    if (r < this.rows - 1 && !this.grid[r + 1][c].visited) neighbors.push(this.grid[r + 1][c]);
    if (c > 0 && !this.grid[r][c - 1].visited) neighbors.push(this.grid[r][c - 1]);
    return neighbors;
  }

  removeWalls(a, b) {
    const x = a.c - b.c;
    const y = a.r - b.r;
    if (x === 1) { a.walls.left = false; b.walls.right = false; }
    else if (x === -1) { a.walls.right = false; b.walls.left = false; }
    if (y === 1) { a.walls.top = false; b.walls.bottom = false; }
    else if (y === -1) { a.walls.bottom = false; b.walls.top = false; }
  }

  // Hubungkan sebagian ujung lorong buntu agar seluruh wilayah grid tetap terpakai
  // tanpa menghilangkan dinding lorong ("jalur") labirin
  braidDeadEnds(rate = 0.4) {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell.isStart || cell.isExit) continue;

        let wallCount = 0;
        const closedNeighbors = [];
        if (cell.walls.top && r > 0) { wallCount++; closedNeighbors.push({ dir: 'top', cell: this.grid[r - 1][c] }); }
        if (cell.walls.right && c < this.cols - 1) { wallCount++; closedNeighbors.push({ dir: 'right', cell: this.grid[r][c + 1] }); }
        if (cell.walls.bottom && r < this.rows - 1) { wallCount++; closedNeighbors.push({ dir: 'bottom', cell: this.grid[r + 1][c] }); }
        if (cell.walls.left && c > 0) { wallCount++; closedNeighbors.push({ dir: 'left', cell: this.grid[r][c - 1] }); }

        // Jika sel adalah ujung buntu (3 dinding) dan lolos peluang pembukaan
        if (wallCount >= 3 && closedNeighbors.length > 0 && this.rng.next() < rate) {
          const target = this.rng.choice(closedNeighbors);
          if (target.dir === 'top') { cell.walls.top = false; target.cell.walls.bottom = false; }
          else if (target.dir === 'right') { cell.walls.right = false; target.cell.walls.left = false; }
          else if (target.dir === 'bottom') { cell.walls.bottom = false; target.cell.walls.top = false; }
          else if (target.dir === 'left') { cell.walls.left = false; target.cell.walls.right = false; }
        }
      }
    }
  }

  detectDeadEnds() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell.isStart || cell.isExit) continue;
        let wallCount = 0;
        if (cell.walls.top) wallCount++;
        if (cell.walls.right) wallCount++;
        if (cell.walls.bottom) wallCount++;
        if (cell.walls.left) wallCount++;
        cell.isDeadEnd = (wallCount >= 3);
      }
    }
  }

  addRichLoops(chance) {
    // Membuka sekat dinding secara terkontrol agar lorong tetap rapi dan jelas jalurnya
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.rng.next() < chance) {
          const cell = this.grid[r][c];
          const dirs = [];
          if (r > 0 && cell.walls.top) dirs.push('top');
          if (c < this.cols - 1 && cell.walls.right) dirs.push('right');
          if (r < this.rows - 1 && cell.walls.bottom) dirs.push('bottom');
          if (c > 0 && cell.walls.left) dirs.push('left');

          if (dirs.length > 0) {
            const dir = this.rng.choice(dirs);
            if (dir === 'top') { cell.walls.top = false; this.grid[r - 1][c].walls.bottom = false; }
            else if (dir === 'right') { cell.walls.right = false; this.grid[r][c + 1].walls.left = false; }
            else if (dir === 'bottom') { cell.walls.bottom = false; this.grid[r + 1][c].walls.top = false; }
            else if (dir === 'left') { cell.walls.left = false; this.grid[r][c - 1].walls.right = false; }
          }
        }
      }
    }
  }

  // Cari jalur konektivitas terpendek (BFS)
  findPath(start = { c: 0, r: 0 }, end = { c: this.cols - 1, r: this.rows - 1 }) {
    const queue = [[this.grid[start.r][start.c]]];
    const visited = new Set();
    visited.add(`${start.c},${start.r}`);

    while (queue.length > 0) {
      const path = queue.shift();
      const current = path[path.length - 1];

      if (current.c === end.c && current.r === end.r) {
        return path;
      }

      const connected = this.getConnectedNeighbors(current);
      for (const neighbor of connected) {
        const key = `${neighbor.c},${neighbor.r}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([...path, neighbor]);
        }
      }
    }
    return [];
  }

  getConnectedNeighbors(cell) {
    const { c, r, walls } = cell;
    const neighbors = [];
    if (!walls.top && r > 0) neighbors.push(this.grid[r - 1][c]);
    if (!walls.right && c < this.cols - 1) neighbors.push(this.grid[r][c + 1]);
    if (!walls.bottom && r < this.rows - 1) neighbors.push(this.grid[r + 1][c]);
    if (!walls.left && c > 0) neighbors.push(this.grid[r][c - 1]);
    return neighbors;
  }

  // =========================================================
  // LOGIKA "PUZZLE BOLAK-BALIK MENCARI CARA":
  // Ubin-ubin diisi dengan angka operasional acak terarah.
  // Tidak ada jalur instan sekali lewat langsung selesai, melainkan pemain
  // mengombinasikan ubin (+), ubin (-), (×), (÷) secara bolak-balik hingga pas dengan Target!
  // =========================================================
  populateMathTiles(levelConfig) {
    const allowedOps = levelConfig.ops || ['+', '-'];
    const maxNum = levelConfig.maxNum || 4;

    // 1. Set START & FINISH murni netral
    this.grid[0][0].isStart = true;
    this.grid[0][0].op = null;
    this.grid[0][0].val = 0;
    this.grid[0][0].displayText = 'START';

    const exitCell = this.grid[this.rows - 1][this.cols - 1];
    exitCell.isExit = true;
    exitCell.op = null;
    exitCell.val = 0;
    exitCell.displayText = 'FINISH';

    // 2. Kumpulkan sel yang dapat diberi angka
    const validCells = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if ((r === 0 && c === 0) || (r === this.rows - 1 && c === this.cols - 1)) continue;
        validCells.push(this.grid[r][c]);
      }
    }

    // 3. Distribusikan ubin (+) dan ubin (-) serta operasi lainnya secara seimbang
    // Pastikan ada setidaknya minimal 1-2 ubin plus (+) kecil, plus sedang, dan ubin minus (-)
    validCells.forEach((cell, index) => {
      let op = '+';
      let val = 1;

      // Rasio distribusi deterministik berbasis Seed:
      // ~45% ubin Tambah (+)
      // ~35% ubin Kurang (-)
      // ~10% ubin Kali (x) [jika diizinkan di level tinggi]
      // ~10% ubin Bagi (/) [jika diizinkan di level tinggi]
      const roll = this.rng.next();

      if (allowedOps.includes('×') && roll < 0.15) {
        op = '×';
        val = 2; // Pengali 2 yang nyaman untuk dikombinasikan bolak-balik
      } else if (allowedOps.includes('÷') && roll < 0.25) {
        op = '÷';
        val = 2;
      } else if (roll < 0.60) {
        op = '+';
        val = this.rng.range(1, maxNum);
      } else {
        op = '-';
        val = this.rng.range(1, Math.max(1, Math.min(4, maxNum)));
      }

      cell.op = op;
      cell.val = val;
      cell.displayText = `${op}${val}`;
    });

    // Pastikan minimal ada setidaknya satu ubin +1 dan satu ubin -1 di labirin
    // untuk menjamin pemain SELALU punya cara menyelesaikan angka target berapapun dengan bolak-balik!
    if (validCells.length >= 2) {
      validCells[0].op = '+';
      validCells[0].val = 1;
      validCells[0].displayText = '+1';

      validCells[1].op = '-';
      validCells[1].val = 1;
      validCells[1].displayText = '-1';
    }
  }
}

window.KidsMazeGenerator = KidsMazeGenerator;
