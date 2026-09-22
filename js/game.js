// =========================================================
// KIDS MATH LABYRINTH - GAME ENGINE (1-100 PROGRESSIVE LEVELS)
// Mendukung 100 level deterministik, mekanisme bolak-balik berhitung,
// persistensi progres, dan sistem hint rekomendasi langkah cerdas
// =========================================================

class KidsMathGame {
  constructor() {
    this.canvas = document.getElementById('kids-maze-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.floatingLayer = document.getElementById('floating-emojis-layer');

    // Progress Level (1 s/d 100)
    this.unlockedLevel = parseInt(localStorage.getItem('math_maze_unlocked_level') || '1', 10);
    this.levelStars = JSON.parse(localStorage.getItem('math_maze_level_stars') || '{}');

    // Hero Avatar
    this.currentHero = CHARACTERS[0];

    // State Game
    this.currentLevelIndex = 0;
    this.currentValue = 0;
    this.targetValue = 6;
    this.history = [];
    this.hintStock = 3;
    this.highlightHintCell = null;
    this.finishLockedTimestamp = 0;

    // Posisi Pemain
    this.player = {
      c: 0,
      r: 0,
      curX: 0,
      curY: 0,
      targetX: 0,
      targetY: 0,
      bounceOffset: 0
    };

    this.maze = null;
    this.grid = [];
    this.cellSize = 72;
    this.particles = [];

    this.initScreenNavigation();
    this.initEventListeners();
    this.renderHeroSelectorModal();
    this.updateMenuProgress();
    this.startAnimationLoop();
  }

  // Navigasi Antar Layar
  initScreenNavigation() {
    // 1. Dari Main Menu -> Main Game (Langsung ke level tertinggi terbuka)
    document.getElementById('btn-play-game').addEventListener('click', () => {
      this.switchScreen('screen-gameplay');
      this.loadLevel(this.unlockedLevel - 1);
    });

    // 2. Dari Main Menu -> Pilih Level (1-100)
    document.getElementById('btn-menu-levels').addEventListener('click', () => {
      this.renderLevelMapScreen();
      this.switchScreen('screen-level-select');
    });

    // 3. Dari Level Select -> Kembali ke Main Menu
    document.getElementById('btn-back-to-menu').addEventListener('click', () => {
      this.updateMenuProgress();
      this.switchScreen('screen-main-menu');
    });

    // 4. Dari Gameplay -> Kembali ke Peta Level
    document.getElementById('btn-game-back-to-map').addEventListener('click', () => {
      this.renderLevelMapScreen();
      this.switchScreen('screen-level-select');
    });

    // Menu Hero Change
    document.getElementById('btn-menu-hero').addEventListener('click', () => {
      this.openModal('modal-hero');
    });

    // Menu Guide & Sound
    document.getElementById('btn-menu-guide').addEventListener('click', () => this.openModal('modal-guide'));
    document.getElementById('btn-help-game').addEventListener('click', () => this.openModal('modal-guide'));

    const toggleSound = () => {
      const isMuted = window.soundEngine.toggleMute();
      const txt = isMuted ? '🔇' : '🔊';
      document.getElementById('menu-sound-icon').textContent = txt;
      document.getElementById('btn-sound-game').textContent = txt;
    };

    document.getElementById('btn-menu-sound').addEventListener('click', toggleSound);
    document.getElementById('btn-sound-game').addEventListener('click', toggleSound);
  }

  switchScreen(screenId) {
    document.querySelectorAll('.game-screen').forEach(scr => scr.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'screen-gameplay') {
      setTimeout(() => this.adjustCanvasSize(), 50);
    }
  }

  updateMenuProgress() {
    document.getElementById('menu-level-progress-text').textContent = `🏆 Progres: Level ${this.unlockedLevel} / ${ADVENTURE_LEVELS.length} Terbuka`;
  }

  // Render Peta Level (1 s/d 100 dengan Tabs / Grouping Pulau)
  renderLevelMapScreen() {
    const carousel = document.getElementById('worlds-carousel');
    carousel.innerHTML = '';

    const worlds = {};
    ADVENTURE_LEVELS.forEach((lvl, idx) => {
      if (!worlds[lvl.world]) worlds[lvl.world] = [];
      worlds[lvl.world].push({ ...lvl, index: idx });
    });

    let totalStars = 0;

    Object.keys(worlds).forEach(worldName => {
      const groupCard = document.createElement('div');
      groupCard.className = 'world-group-card';

      const groupHeader = document.createElement('div');
      groupHeader.className = 'world-group-header';
      groupHeader.innerHTML = `
        <div class="world-title-badge">
          <span>${worlds[worldName][0].worldIcon || '🏝️'}</span> ${worldName}
        </div>
        <span style="font-size:0.8rem; font-weight:700; color:#64748b;">
          Level ${worlds[worldName][0].id} - ${worlds[worldName][worlds[worldName].length - 1].id}
        </span>
      `;
      groupCard.appendChild(groupHeader);

      const stagesGrid = document.createElement('div');
      stagesGrid.className = 'world-grid-stages';

      worlds[worldName].forEach(lvl => {
        const isLocked = (lvl.id > this.unlockedLevel);
        const stars = this.levelStars[lvl.id] || (lvl.id < this.unlockedLevel ? 3 : 0);
        if (!isLocked) totalStars += stars;

        const stageItem = document.createElement('div');
        stageItem.className = `stage-card-item ${isLocked ? 'locked' : ''}`;
        if (lvl.id === this.unlockedLevel) stageItem.style.borderColor = '#f59e0b';
        
        let starsDisplay = '☆☆☆';
        if (stars === 3) starsDisplay = '⭐⭐⭐';
        else if (stars === 2) starsDisplay = '⭐⭐☆';
        else if (stars === 1) starsDisplay = '⭐☆☆';

        stageItem.innerHTML = `
          <span class="num-badge">${isLocked ? '🔒' : lvl.id}</span>
          <span class="stars-row">${isLocked ? 'Terkunci' : starsDisplay}</span>
          <span class="stage-name-sub">${lvl.title}</span>
        `;

        if (!isLocked) {
          stageItem.addEventListener('click', () => {
            this.switchScreen('screen-gameplay');
            this.loadLevel(lvl.index);
          });
        }

        stagesGrid.appendChild(stageItem);
      });

      groupCard.appendChild(stagesGrid);
      carousel.appendChild(groupCard);
    });

    document.getElementById('total-stars-count').textContent = `${totalStars} / ${ADVENTURE_LEVELS.length * 3}`;
  }

  // Pasang Event Listener Kontrol
  initEventListeners() {
    window.addEventListener('keydown', (e) => {
      if (!document.getElementById('screen-gameplay').classList.contains('active')) return;
      if (['ArrowUp', 'KeyW'].includes(e.code)) this.movePlayer(0, -1);
      if (['ArrowDown', 'KeyS'].includes(e.code)) this.movePlayer(0, 1);
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.movePlayer(-1, 0);
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.movePlayer(1, 0);
      if (e.code === 'KeyU') this.useUndo();
      if (e.code === 'KeyH') this.useHint();
    });

    document.querySelectorAll('.arrow-pad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.dataset.dir;
        if (dir === 'up') this.movePlayer(0, -1);
        if (dir === 'down') this.movePlayer(0, 1);
        if (dir === 'left') this.movePlayer(-1, 0);
        if (dir === 'right') this.movePlayer(1, 0);
      });
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const c = Math.floor(clickX / this.cellSize);
      const r = Math.floor(clickY / this.cellSize);

      const dc = c - this.player.c;
      const dr = r - this.player.r;

      if (Math.abs(dc) + Math.abs(dr) === 1) {
        this.movePlayer(dc, dr);
      }
    });

    document.getElementById('btn-undo').addEventListener('click', () => this.useUndo());
    document.getElementById('btn-hint').addEventListener('click', () => this.useHint());
    document.getElementById('btn-reset').addEventListener('click', () => this.restartLevel());

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        this.closeModal(modalId);
      });
    });

    // Victory actions
    document.getElementById('btn-win-replay').addEventListener('click', () => {
      this.closeModal('modal-win');
      this.restartLevel();
    });

    document.getElementById('btn-win-map').addEventListener('click', () => {
      this.closeModal('modal-win');
      this.renderLevelMapScreen();
      this.switchScreen('screen-level-select');
    });

    document.getElementById('btn-win-next').addEventListener('click', () => {
      this.closeModal('modal-win');
      if (this.currentLevelIndex + 1 < ADVENTURE_LEVELS.length) {
        this.loadLevel(this.currentLevelIndex + 1);
      } else {
        alert('🏆 LUAR BIASA! Kamu telah menamatkan seluruh 100 level di Petualangan Labirin Angka!');
        this.renderLevelMapScreen();
        this.switchScreen('screen-level-select');
      }
    });

    // Fail actions
    document.getElementById('btn-fail-undo').addEventListener('click', () => {
      this.closeModal('modal-retry-fail');
      this.useUndo();
    });

    document.getElementById('btn-fail-restart').addEventListener('click', () => {
      this.closeModal('modal-retry-fail');
      this.restartLevel();
    });

    window.addEventListener('resize', () => {
      if (document.getElementById('screen-gameplay').classList.contains('active')) {
        this.adjustCanvasSize();
      }
    });
  }

  // Load Level Petualangan (Menggunakan Seeded RNG Deterministik)
  loadLevel(index) {
    this.currentLevelIndex = index;
    const config = ADVENTURE_LEVELS[index];

    this.currentValue = config.startVal || 0;
    this.targetValue = config.targetVal || 6;
    this.history = [];
    this.highlightHintCell = null;

    // Update Header HUD
    document.getElementById('hud-world-tag').textContent = config.world;
    document.getElementById('hud-level-title').textContent = `Level ${config.id}: ${config.title}`;
    document.getElementById('display-target').textContent = this.targetValue;
    document.getElementById('display-current').textContent = this.currentValue;
    document.getElementById('mascot-dialogue').textContent = `"${config.hintText}"`;

    // Buat Labirin Deterministik (Seed menjamin labirin tetap konsisten saat di-refresh!)
    const cols = config.size.cols;
    const rows = config.size.rows;
    this.maze = new KidsMazeGenerator(cols, rows, config.seed);
    this.grid = this.maze.generate(config.loopChance || 0.3);
    this.maze.populateMathTiles(config);

    // Set Posisi Hero ke Start
    this.player.c = 0;
    this.player.r = 0;
    this.player.curX = this.cellSize / 2;
    this.player.curY = this.cellSize / 2;
    this.player.targetX = this.player.curX;
    this.player.targetY = this.player.curY;

    // Simpan history awal
    this.history.push({
      c: 0,
      r: 0,
      val: this.currentValue,
      snippet: `Mulai: ${this.currentValue}`
    });

    this.updateHUD();
    this.adjustCanvasSize();
  }

  adjustCanvasSize() {
    if (!this.grid || this.grid.length === 0) return;
    const cols = this.grid[0].length;
    const rows = this.grid.length;

    const container = document.getElementById('canvas-container');
    const maxWidth = Math.min(container.clientWidth - 20, 640);
    const maxHeight = Math.min(container.clientHeight - 20, 560);

    const sizeByWidth = Math.floor(maxWidth / cols);
    const sizeByHeight = Math.floor(maxHeight / rows);
    this.cellSize = Math.max(46, Math.min(sizeByWidth, sizeByHeight, 95));

    this.canvas.width = cols * this.cellSize;
    this.canvas.height = rows * this.cellSize;

    this.player.curX = this.player.c * this.cellSize + this.cellSize / 2;
    this.player.curY = this.player.r * this.cellSize + this.cellSize / 2;
    this.player.targetX = this.player.curX;
    this.player.targetY = this.player.curY;
  }

  // Gerakkan Karakter Melalui Labirin
  movePlayer(dc, dr) {
    const curCell = this.grid[this.player.r][this.player.c];
    const targetC = this.player.c + dc;
    const targetR = this.player.r + dr;

    // Batas Labirin
    if (targetC < 0 || targetC >= this.grid[0].length || targetR < 0 || targetR >= this.grid.length) {
      return;
    }

    // Tembok Labirin Nyata
    if (dr === -1 && curCell.walls.top) { this.bumpWallSound(); return; }
    if (dr === 1 && curCell.walls.bottom) { this.bumpWallSound(); return; }
    if (dc === -1 && curCell.walls.left) { this.bumpWallSound(); return; }
    if (dc === 1 && curCell.walls.right) { this.bumpWallSound(); return; }

    // Melangkah maju
    const nextCell = this.grid[targetR][targetC];
    nextCell.walkCount = (nextCell.walkCount || 0) + 1;

    this.player.c = targetC;
    this.player.r = targetR;
    this.player.targetX = targetC * this.cellSize + this.cellSize / 2;
    this.player.targetY = targetR * this.cellSize + this.cellSize / 2;

    this.spawnStepStars(this.player.curX, this.player.curY);

    // Jalankan kalkulasi ubin matematika
    this.applyMathTile(nextCell);
    this.updateHUD();

    // Jika tiba di FINISH, periksa apakah nilainya pas sama dengan target
    if (nextCell.isExit) {
      this.checkFinish();
    }
  }

  bumpWallSound() {
    window.soundEngine.playStep();
    document.getElementById('mascot-dialogue').textContent = `"Aduh, ada tembok pembatas! Cari jalan yang terbuka ya!"`;
  }

  // Terapkan kalkulasi dari ubin matematika
  applyMathTile(cell) {
    if (cell.isStart || cell.isExit) {
      // Kotak Start dan Finish tidak mengubah nilai
      window.soundEngine.playStep();
      return;
    }

    let snippet = '';

    if (cell.op === '+') {
      this.currentValue += cell.val;
      snippet = `+${cell.val}`;
      window.soundEngine.playMathChime(true);
      this.popFloatingEmoji(`+${cell.val}`, '#16a34a', '🌱');
    } else if (cell.op === '-') {
      this.currentValue -= cell.val;
      snippet = `-${cell.val}`;
      window.soundEngine.playMathChime(false);
      this.popFloatingEmoji(`-${cell.val}`, '#dc2626', '🍎');
    } else if (cell.op === '×') {
      this.currentValue *= cell.val;
      snippet = `×${cell.val}`;
      window.soundEngine.playMathChime(true);
      this.popFloatingEmoji(`×${cell.val}`, '#9333ea', '⭐');
    } else if (cell.op === '÷') {
      this.currentValue = Math.floor(this.currentValue / cell.val);
      snippet = `÷${cell.val}`;
      window.soundEngine.playMathChime(true);
      this.popFloatingEmoji(`÷${cell.val}`, '#0284c7', '💧');
    }

    this.history.push({
      c: cell.c,
      r: cell.r,
      val: this.currentValue,
      snippet: snippet
    });

    if (this.currentValue === this.targetValue) {
      window.soundEngine.playTargetHit();
      document.getElementById('mascot-dialogue').textContent = `"Hore! Angkamu sudah pas ${this.targetValue}! Ayo melangkah ke kotak FINISH 🏁!"`;
    }
  }

  popFloatingEmoji(text, color, icon) {
    const el = document.createElement('div');
    el.className = 'flying-score-tag';
    el.innerHTML = `${icon} ${text}`;
    el.style.backgroundColor = '#ffffff';
    el.style.color = color;
    el.style.border = `3px solid ${color}`;
    el.style.left = `${this.player.targetX}px`;
    el.style.top = `${this.player.targetY}px`;
    this.floatingLayer.appendChild(el);

    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 850);
  }

  // Pemeriksaan Garis Akhir (Finish)
  // Tidak memunculkan popup yang memblokir layar jika belum sesuai,
  // melainkan menampilkan notifikasi samping dan efek 'Belum Pas', sehingga anak bisa langsung bolak-balik berhitung
  checkFinish() {
    if (this.currentValue === this.targetValue) {
      window.soundEngine.playVictory();
      this.finishLockedTimestamp = 0;

      // Buka level berikutnya
      const nextLvlNum = this.currentLevelIndex + 2;
      if (nextLvlNum > this.unlockedLevel && nextLvlNum <= ADVENTURE_LEVELS.length) {
        this.unlockedLevel = nextLvlNum;
        localStorage.setItem('math_maze_unlocked_level', this.unlockedLevel);
      }
      this.levelStars[this.currentLevelIndex + 1] = 3;
      localStorage.setItem('math_maze_level_stars', JSON.stringify(this.levelStars));

      this.showWinModal();
    } else {
      // Set timestamp untuk efek visual gerbang terkunci berdenyut pada canvas
      this.finishLockedTimestamp = performance.now();

      // Suara petunjuk & notifikasi samping tanpa popup yang memotong gameplay
      window.soundEngine.playError();
      const diff = this.targetValue - this.currentValue;
      
      const notifCard = document.getElementById('mascot-notification-card');
      const dialogue = document.getElementById('mascot-dialogue');
      
      if (diff > 0) {
        dialogue.innerHTML = `
          <div class="notif-title">🔒 PINTU FINISH BELUM TERBUKA!</div>
          <div class="notif-body">Kantongmu (<strong>${this.currentValue}</strong>) masih <strong>kurang ${diff}</strong> dari target <strong>${this.targetValue}</strong>.</div>
          <div class="notif-hint">👉 Cari ubin bertanda (+) di jalur lain! Tekan <em>Ulang Level</em> di sisi jika buntu.</div>
        `;
        this.popFloatingEmoji(`KURANG ${diff}!`, '#f59e0b', '🔒');
      } else {
        dialogue.innerHTML = `
          <div class="notif-title">🔒 PINTU FINISH BELUM TERBUKA!</div>
          <div class="notif-body">Kantongmu (<strong>${this.currentValue}</strong>) <strong>kelebihan ${Math.abs(diff)}</strong> dari target <strong>${this.targetValue}</strong>.</div>
          <div class="notif-hint">👉 Belok ke jalur ubin (-) untuk mengurangi! Tekan <em>Ulang Level</em> di sisi jika buntu.</div>
        `;
        this.popFloatingEmoji(`LEBIH ${Math.abs(diff)}!`, '#ef4444', '🔒');
      }

      // Animasi getar halus & glow pada kartu notifikasi samping
      if (notifCard) {
        notifCard.classList.remove('notif-shake', 'notif-alert-glow');
        void notifCard.offsetWidth; // Force reflow
        notifCard.classList.add('notif-shake', 'notif-alert-glow');
      }
    }
  }

  // Jurus Ajaib: Undo
  useUndo() {
    if (this.history.length <= 1) return;
    window.soundEngine.playPowerup();

    this.history.pop();
    const prev = this.history[this.history.length - 1];

    this.player.c = prev.c;
    this.player.r = prev.r;
    this.player.targetX = prev.c * this.cellSize + this.cellSize / 2;
    this.player.targetY = prev.r * this.cellSize + this.cellSize / 2;
    this.currentValue = prev.val;

    this.popFloatingEmoji('MUNDUR', '#f97316', '↩️');
    document.getElementById('mascot-dialogue').textContent = `"Langkah dibatalkan! Ayo coba jalan lain!"`;
    this.updateHUD();
  }

  // Jurus Ajaib: Smart Recommendation Hint
  // Menganalisis ubin tetangga terbuka mana yang paling mendekatkan nilai pemain ke target
  useHint() {
    if (this.hintStock <= 0) return;
    this.hintStock--;
    document.getElementById('hint-stock').textContent = this.hintStock;
    window.soundEngine.playPowerup();

    const curCell = this.grid[this.player.r][this.player.c];
    const neighbors = this.maze.getConnectedNeighbors(curCell);

    if (neighbors.length > 0) {
      let bestNeighbor = null;
      let minDiff = Infinity;

      neighbors.forEach(nb => {
        let simulatedVal = this.currentValue;
        if (nb.op === '+') simulatedVal += nb.val;
        else if (nb.op === '-') simulatedVal -= nb.val;
        else if (nb.op === '×') simulatedVal *= nb.val;
        else if (nb.op === '÷') simulatedVal = Math.floor(simulatedVal / nb.val);

        const diff = Math.abs(this.targetValue - simulatedVal);
        if (diff < minDiff) {
          minDiff = diff;
          bestNeighbor = nb;
        }
      });

      this.highlightHintCell = bestNeighbor || neighbors[0];
      this.popFloatingEmoji('SARAN JALUR!', '#eab308', '💡');
      document.getElementById('mascot-dialogue').textContent = `"Coba langkahi ubin kuning berkilau untuk mendekati angka target!"`;
    }
  }

  restartLevel() {
    this.loadLevel(this.currentLevelIndex);
  }

  // Update Tampilan HUD
  updateHUD() {
    document.getElementById('display-current').textContent = this.currentValue;

    const diff = this.targetValue - this.currentValue;
    const pill = document.getElementById('diff-status-pill');

    if (diff === 0) {
      pill.textContent = 'PAS & SEMPURNA! ⭐';
      pill.className = 'status-pill perfect';
    } else if (diff > 0) {
      pill.textContent = `Kurang ${diff} lagi!`;
      pill.className = 'status-pill need-more';
    } else {
      pill.textContent = `Kelebihan ${Math.abs(diff)}!`;
      pill.className = 'status-pill need-more';
    }

    const ratio = Math.min(1, Math.max(0, this.currentValue / Math.max(1, this.targetValue)));
    document.getElementById('math-progress-fill').style.width = `${ratio * 100}%`;

    const bubbleContainer = document.getElementById('equation-bubbles');
    bubbleContainer.innerHTML = '';
    this.history.forEach((step, idx) => {
      const bubble = document.createElement('span');
      bubble.className = 'bubble-step';
      if (idx === 0) bubble.classList.add('start');
      else if (step.snippet.startsWith('+')) bubble.classList.add('plus');
      else if (step.snippet.startsWith('-')) bubble.classList.add('minus');
      else if (step.snippet.startsWith('×')) bubble.classList.add('times');
      else if (step.snippet.startsWith('÷')) bubble.classList.add('divide');
      bubble.textContent = step.snippet;
      bubbleContainer.appendChild(bubble);
    });
    bubbleContainer.scrollLeft = bubbleContainer.scrollWidth;
  }

  openModal(id) { document.getElementById(id).classList.remove('hidden'); }
  closeModal(id) { document.getElementById(id).classList.add('hidden'); }

  showWinModal() {
    const config = ADVENTURE_LEVELS[this.currentLevelIndex];
    document.getElementById('win-level-name').textContent = `Level ${config.id}: ${config.title} Selesai!`;

    const formula = this.history.map(h => h.snippet.replace('Mulai: ', '')).join(' ');
    document.getElementById('win-equation-display').textContent = `${formula} = ${this.currentValue}`;

    this.openModal('modal-win');
  }

  renderHeroSelectorModal() {
    const grid = document.getElementById('hero-cards-grid');
    grid.innerHTML = '';
    CHARACTERS.forEach(hero => {
      const card = document.createElement('div');
      card.className = `hero-select-card ${hero.id === this.currentHero.id ? 'active' : ''}`;
      card.innerHTML = `
        <span class="hero-emoji">${hero.emoji}</span>
        <span class="hero-name">${hero.name}</span>
      `;
      card.addEventListener('click', () => {
        this.currentHero = hero;
        document.getElementById('menu-avatar-icon').textContent = hero.emoji;
        document.getElementById('menu-hero-name').textContent = hero.name;
        document.getElementById('mascot-speech-avatar').textContent = hero.emoji;
        this.closeModal('modal-hero');
      });
      grid.appendChild(card);
    });
  }

  spawnStepStars(x, y) {
    for (let i = 0; i < 5; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 1,
        radius: Math.random() * 4 + 2,
        color: ['#fde047', '#4ade80', '#38bdf8', '#f472b6'][Math.floor(Math.random() * 4)],
        alpha: 1
      });
    }
  }

  startAnimationLoop() {
    const loop = (timestamp) => {
      this.player.curX += (this.player.targetX - this.player.curX) * 0.3;
      this.player.curY += (this.player.targetY - this.player.curY) * 0.3;
      this.player.bounceOffset = Math.sin(timestamp / 150) * 3;

      if (document.getElementById('screen-gameplay').classList.contains('active')) {
        this.draw();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // =========================================================
  // RENDER ARENA LABIRIN RAPI, SIMETRIS & BERSIH
  // =========================================================
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.grid || this.grid.length === 0) return;

    const cs = this.cellSize;

    // 1. Gambar Ubin Lantai
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[0].length; c++) {
        const cell = this.grid[r][c];
        const x = c * cs;
        const y = r * cs;

        if (cell.isStart) {
          this.ctx.fillStyle = '#bbf7d0';
        } else if (cell.isExit) {
          // Warna latar Finish adaptif sesuai status kesesuaian target
          if (this.currentValue === this.targetValue) {
            this.ctx.fillStyle = '#86efac';
          } else {
            this.ctx.fillStyle = '#fed7aa';
          }
        } else if (this.highlightHintCell && this.highlightHintCell.c === c && this.highlightHintCell.r === r) {
          this.ctx.fillStyle = '#fef08a';
        } else {
          this.ctx.fillStyle = (c + r) % 2 === 0 ? '#ffffff' : '#f8fafc';
        }

        this.ctx.fillRect(x, y, cs, cs);

        // Efek visual 'Pintu Terkunci' jika baru saja menyentuh Finish tanpa nilai pas
        if (cell.isExit) {
          const now = performance.now();
          if (this.finishLockedTimestamp && (now - this.finishLockedTimestamp < 1800)) {
            const elapsed = now - this.finishLockedTimestamp;
            const pulse = (Math.sin(elapsed / 100) + 1) / 2;
            this.ctx.save();
            this.ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 + pulse * 0.5})`;
            this.ctx.lineWidth = Math.max(3, Math.floor(cs * 0.08));
            this.ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6);
            this.ctx.restore();
          }
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (cell.isStart) {
          this.ctx.font = `bold ${Math.floor(cs * 0.22)}px 'Grandstander', cursive`;
          this.ctx.fillStyle = '#15803d';
          this.ctx.fillText('START', x + cs / 2, y + cs * 0.36);
          this.ctx.font = `${Math.floor(cs * 0.22)}px sans-serif`;
          this.ctx.fillText('🚩', x + cs / 2, y + cs * 0.68);
        } else if (cell.isExit) {
          const isUnlocked = (this.currentValue === this.targetValue);
          this.ctx.font = `bold ${Math.floor(cs * 0.22)}px 'Grandstander', cursive`;
          this.ctx.fillStyle = isUnlocked ? '#15803d' : '#c2410c';
          this.ctx.fillText('FINISH', x + cs / 2, y + cs * 0.36);
          this.ctx.font = `${Math.floor(cs * 0.22)}px sans-serif`;
          this.ctx.fillText(isUnlocked ? '🏁✨' : '🔒', x + cs / 2, y + cs * 0.68);
        } else if (cell.displayText) {
          if (cell.op === '+') this.ctx.fillStyle = '#16a34a';
          else if (cell.op === '-') this.ctx.fillStyle = '#dc2626';
          else if (cell.op === '×') this.ctx.fillStyle = '#9333ea';
          else if (cell.op === '÷') this.ctx.fillStyle = '#0284c7';
          else this.ctx.fillStyle = '#334155';

          this.ctx.font = `bold ${Math.floor(cs * 0.36)}px 'Grandstander', cursive`;
          this.ctx.fillText(cell.displayText, x + cs / 2, y + cs / 2);
        }

        if (cell.isDeadEnd && cell.walkCount > 0) {
          this.ctx.font = `${Math.floor(cs * 0.2)}px sans-serif`;
          this.ctx.fillText('🚫', x + cs - 12, y + 12);
        }
      }
    }

    // 2. Gambar Dinding Labirin Kokoh
    this.ctx.lineWidth = Math.max(4, Math.floor(cs * 0.08));
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = '#334155';

    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.grid[0].length; c++) {
        const cell = this.grid[r][c];
        const x = c * cs;
        const y = r * cs;

        if (cell.walls.top) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x + cs, y);
          this.ctx.stroke();
        }
        if (cell.walls.right) {
          this.ctx.beginPath();
          this.ctx.moveTo(x + cs, y);
          this.ctx.lineTo(x + cs, y + cs);
          this.ctx.stroke();
        }
        if (cell.walls.bottom) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, y + cs);
          this.ctx.lineTo(x + cs, y + cs);
          this.ctx.stroke();
        }
        if (cell.walls.left) {
          this.ctx.beginPath();
          this.ctx.moveTo(x, y);
          this.ctx.lineTo(x, y + cs);
          this.ctx.stroke();
        }
      }
    }

    // 3. Render Partikel
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= 0.04;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 4. Render Avatar Karakter
    const px = this.player.curX;
    const py = this.player.curY + this.player.bounceOffset;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    this.ctx.beginPath();
    this.ctx.ellipse(px, this.player.curY + cs * 0.28, cs * 0.25, cs * 0.12, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(px, py, cs * 0.32, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = this.currentHero.color;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.arc(px, py, cs * 0.32, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.font = `${Math.floor(cs * 0.36)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(this.currentHero.emoji, px, py);

    this.ctx.restore();
  }
}

// Start Game Engine
window.addEventListener('DOMContentLoaded', () => {
  window.kidsMathGame = new KidsMathGame();
});
