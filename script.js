/**
 * Pac-Man Classic Web - script.js
 * Implementation for a high-quality, grid-based Pac-Man game.
 */

const CONFIG = {
    TILE_SIZE: 20,
    FPS: 60,
    INITIAL_LIVES: 3,
    GHOST_RELEASE_INTERVAL: 3000, // ms
    POWER_PELLET_DURATION: 10000, // ms
    COLORS: {
        WALL: '#2121ff',
        PELLET: '#ffb8ae',
        POWER_PELLET: '#fff',
        PACMAN: '#fefe00',
        GHOSTS: {
            blinkey: '#ff0000',
            pinky: '#ffb8ff',
            inky: '#00ffff',
            clyde: '#ffb852',
            frightened: '#0000ff',
            eaten: '#333'
        }
    }
};

// 1: Wall, 0: Pellet, 3: Power Pellet, 5: Empty, 6: Pacman, 4: Ghost House, 7: Ghost Door
const MAZE_LAYOUT = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 3, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 3, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0, 1, 1, 1, 5, 1, 5, 1, 1, 1, 0, 1, 1, 1, 1],
    [5, 5, 5, 1, 0, 1, 5, 5, 5, 5, 5, 5, 5, 1, 0, 1, 5, 5, 5],
    [1, 1, 1, 1, 0, 1, 5, 1, 1, 7, 1, 1, 5, 1, 0, 1, 1, 1, 1],
    [5, 5, 5, 5, 0, 5, 5, 1, 4, 4, 4, 1, 5, 5, 0, 5, 5, 5, 5],
    [1, 1, 1, 1, 0, 1, 5, 1, 1, 1, 1, 1, 5, 1, 0, 1, 1, 1, 1],
    [5, 5, 5, 1, 0, 1, 5, 5, 5, 5, 5, 5, 5, 1, 0, 1, 5, 5, 5],
    [1, 1, 1, 1, 0, 1, 5, 1, 1, 1, 1, 1, 5, 1, 0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1],
    [1, 3, 0, 1, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 1, 0, 3, 1],
    [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
    [1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const DIRECTION = {
    UP: { x: 0, y: -1, angle: Math.PI * 1.5 },
    DOWN: { x: 0, y: 1, angle: Math.PI * 0.5 },
    LEFT: { x: -1, y: 0, angle: Math.PI },
    RIGHT: { x: 1, y: 0, angle: 0 },
    STATIONARY: { x: 0, y: 0, angle: 0 }
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesContainer = document.getElementById('lives');

        this.score = 0;
        this.highScore = localStorage.getItem('pacman-highscore') || 0;
        this.lives = CONFIG.INITIAL_LIVES;
        this.gameState = 'START'; // START, PLAYING, PAUSED, GAMEOVER

        this.setupCanvas();
        this.init();
        this.bindEvents();
        this.updateStats();

        requestAnimationFrame(() => this.loop());
    }

    setupCanvas() {
        this.rows = MAZE_LAYOUT.length;
        this.cols = MAZE_LAYOUT[0].length;
        this.canvas.width = this.cols * CONFIG.TILE_SIZE;
        this.canvas.height = this.rows * CONFIG.TILE_SIZE;
    }

    init() {
        this.maze = JSON.parse(JSON.stringify(MAZE_LAYOUT));
        this.pacman = new Pacman(this);
        this.ghosts = [
            new Ghost(this, 'blinkey', 9, 8),
            new Ghost(this, 'pinky', 9, 9),
            new Ghost(this, 'inky', 8, 9),
            new Ghost(this, 'clyde', 10, 9)
        ];
        this.frightenedTimer = 0;
    }

    bindEvents() {
        document.getElementById('start-button').addEventListener('click', () => this.startGame());
        document.getElementById('restart-button').addEventListener('click', () => this.restartGame());
        document.getElementById('resume-button').addEventListener('click', () => this.resumeGame());

        window.addEventListener('keydown', (e) => {
            if (this.gameState !== 'PLAYING') return;

            switch (e.key.toLowerCase()) {
                case 'arrowup': case 'w': this.pacman.setNextDirection(DIRECTION.UP); break;
                case 'arrowdown': case 's': this.pacman.setNextDirection(DIRECTION.DOWN); break;
                case 'arrowleft': case 'a': this.pacman.setNextDirection(DIRECTION.LEFT); break;
                case 'arrowright': case 'd': this.pacman.setNextDirection(DIRECTION.RIGHT); break;
                case 'p': case 'escape': this.pauseGame(); break;
            }
        });
    }

    startGame() {
        document.getElementById('start-screen').classList.add('hidden');
        this.gameState = 'PLAYING';
    }

    pauseGame() {
        this.gameState = 'PAUSED';
        document.getElementById('pause-screen').classList.remove('hidden');
    }

    resumeGame() {
        this.gameState = 'PLAYING';
        document.getElementById('pause-screen').classList.add('hidden');
    }

    restartGame() {
        this.score = 0;
        this.lives = CONFIG.INITIAL_LIVES;
        this.init();
        this.updateStats();
        this.gameState = 'PLAYING';
        document.getElementById('game-over-screen').classList.add('hidden');
    }

    gameOver() {
        this.gameState = 'GAMEOVER';
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('game-over-screen').classList.remove('hidden');

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('pacman-highscore', this.highScore);
            this.updateStats();
        }
    }

    updateStats() {
        this.scoreElement.innerText = this.score.toString().padStart(4, '0');
        document.getElementById('high-score').innerText = this.highScore.toString().padStart(4, '0');

        this.livesContainer.innerHTML = '';
        for (let i = 0; i < this.lives; i++) {
            const life = document.createElement('div');
            life.className = 'life-icon';
            this.livesContainer.appendChild(life);
        }
    }

    handlePowerPellet() {
        this.frightenedTimer = Date.now() + CONFIG.POWER_PELLET_DURATION;
        this.ghosts.forEach(g => g.becomeFrightened());
    }

    loop() {
        if (this.gameState === 'PLAYING') {
            this.update();
        }
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        this.pacman.update();

        if (this.frightenedTimer && Date.now() > this.frightenedTimer) {
            this.frightenedTimer = 0;
            this.ghosts.forEach(g => g.stopFrightened());
        }

        this.ghosts.forEach(ghost => {
            ghost.update();

            // Collision detection
            const dist = Math.hypot(this.pacman.x - ghost.x, this.pacman.y - ghost.y);
            if (dist < CONFIG.TILE_SIZE * 0.8) {
                if (ghost.state === 'FRIGHTENED') {
                    ghost.beEaten();
                    this.score += 200;
                    this.updateStats();
                } else if (ghost.state !== 'EATEN') {
                    this.handleDeath();
                }
            }
        });

        // Check level complete
        let remainingPellets = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.maze[r][c] === 0 || this.maze[r][c] === 3) remainingPellets++;
            }
        }
        if (remainingPellets === 0) {
            this.init(); // Reset level
        }
    }

    handleDeath() {
        this.lives--;
        this.updateStats();
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.pacman.reset();
            this.ghosts.forEach(g => g.reset());
        }
    }

    draw() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMaze();
        this.pacman.draw(this.ctx);
        this.ghosts.forEach(g => g.draw(this.ctx));
    }

    drawMaze() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.maze[r][c];
                const x = c * CONFIG.TILE_SIZE;
                const y = r * CONFIG.TILE_SIZE;

                if (tile === 1) { // Wall
                    this.ctx.strokeStyle = CONFIG.COLORS.WALL;
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(x + 2, y + 2, CONFIG.TILE_SIZE - 4, CONFIG.TILE_SIZE - 4);
                } else if (tile === 0) { // Pellet
                    this.ctx.fillStyle = CONFIG.COLORS.PELLET;
                    this.ctx.beginPath();
                    this.ctx.arc(x + CONFIG.TILE_SIZE / 2, y + CONFIG.TILE_SIZE / 2, 2, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (tile === 3) { // Power Pellet
                    this.ctx.fillStyle = CONFIG.COLORS.POWER_PELLET;
                    this.ctx.beginPath();
                    this.ctx.arc(x + CONFIG.TILE_SIZE / 2, y + CONFIG.TILE_SIZE / 2, 5, 0, Math.PI * 2);
                    this.ctx.fill();
                } else if (tile === 7) { // Ghost door
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(x, y + CONFIG.TILE_SIZE / 2);
                    this.ctx.lineTo(x + CONFIG.TILE_SIZE, y + CONFIG.TILE_SIZE / 2);
                    this.ctx.stroke();
                }
            }
        }
    }
}

class Entity {
    constructor(game, x, y, color) {
        this.game = game;
        this.startX = x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.startY = y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.x = this.startX;
        this.y = this.startY;
        this.color = color;
        this.speed = 2;
        this.dir = DIRECTION.STATIONARY;
        this.nextDir = DIRECTION.STATIONARY;
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.dir = DIRECTION.STATIONARY;
        this.nextDir = DIRECTION.STATIONARY;
    }

    getTilePos() {
        return {
            r: Math.floor(this.y / CONFIG.TILE_SIZE),
            c: Math.floor(this.x / CONFIG.TILE_SIZE)
        };
    }

    canMove(dir) {
        const nextX = this.x + dir.x * (CONFIG.TILE_SIZE / 2 + 2);
        const nextY = this.y + dir.y * (CONFIG.TILE_SIZE / 2 + 2);
        const r = Math.floor(nextY / CONFIG.TILE_SIZE);
        const c = Math.floor(nextX / CONFIG.TILE_SIZE);

        if (r < 0 || r >= this.game.rows || c < 0 || c >= this.game.cols) return false;
        const tile = this.game.maze[r][c];
        return tile !== 1 && tile !== 7; // Walls and Door
    }

    isAtCenter() {
        const cx = Math.floor(this.x / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const cy = Math.floor(this.y / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        return Math.abs(this.x - cx) < this.speed && Math.abs(this.y - cy) < this.speed;
    }

    snapToCenter() {
        this.x = Math.floor(this.x / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.y = Math.floor(this.y / CONFIG.TILE_SIZE) * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    }
}

class Pacman extends Entity {
    constructor(game) {
        super(game, 9, 15, CONFIG.COLORS.PACMAN);
        this.mouthOpen = 0;
        this.mouthDir = 1;
    }

    setNextDirection(dir) {
        this.nextDir = dir;
    }

    update() {
        if (this.isAtCenter()) {
            if (this.canMove(this.nextDir)) {
                this.dir = this.nextDir;
            } else if (!this.canMove(this.dir)) {
                this.dir = DIRECTION.STATIONARY;
            }
            this.snapToCenter();
            this.eat();
        }

        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;

        // Teleportation
        if (this.x < 0) this.x = this.game.canvas.width;
        if (this.x > this.game.canvas.width) this.x = 0;

        // Animation
        this.mouthOpen += 0.1 * this.mouthDir;
        if (this.mouthOpen > 0.4 || this.mouthOpen < 0) this.mouthDir *= -1;
    }

    eat() {
        const pos = this.getTilePos();
        const tile = this.game.maze[pos.r][pos.c];
        if (tile === 0) { // Pellet
            this.game.maze[pos.r][pos.c] = 5;
            this.game.score += 10;
            this.game.updateStats();
        } else if (tile === 3) { // Power Pellet
            this.game.maze[pos.r][pos.c] = 5;
            this.game.score += 50;
            this.game.handlePowerPellet();
            this.game.updateStats();
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        const angle = this.dir.angle;
        ctx.moveTo(this.x, this.y);
        ctx.arc(this.x, this.y, CONFIG.TILE_SIZE / 2 - 2,
            angle + this.mouthOpen * Math.PI,
            angle + (2 - this.mouthOpen) * Math.PI);
        ctx.fill();
    }
}

class Ghost extends Entity {
    constructor(game, type, x, y) {
        super(game, x, y, CONFIG.COLORS.GHOSTS[type]);
        this.type = type;
        this.state = 'CHASE'; // CHASE, SCATTER, FRIGHTENED, EATEN
        this.target = { r: 0, c: 0 };
    }

    reset() {
        super.reset();
        this.state = 'CHASE';
    }

    becomeFrightened() {
        if (this.state !== 'EATEN') {
            this.state = 'FRIGHTENED';
            this.speed = 1;
            // Reverse direction
            this.dir = { x: -this.dir.x, y: -this.dir.y, angle: 0 };
        }
    }

    stopFrightened() {
        if (this.state === 'FRIGHTENED') {
            this.state = 'CHASE';
            this.speed = 2;
        }
    }

    beEaten() {
        this.state = 'EATEN';
        this.speed = 4;
    }

    update() {
        if (this.isAtCenter()) {
            this.snapToCenter();
            this.chooseNextDirection();
        }

        this.x += this.dir.x * this.speed;
        this.y += this.dir.y * this.speed;

        // Return home if eaten
        if (this.state === 'EATEN') {
            const homePos = { r: 9, c: 9 };
            const curr = this.getTilePos();
            if (curr.r === homePos.r && curr.c === homePos.c) {
                this.state = 'CHASE';
                this.speed = 2;
            }
        }
    }

    chooseNextDirection() {
        const possibleDirs = [DIRECTION.UP, DIRECTION.DOWN, DIRECTION.LEFT, DIRECTION.RIGHT];
        const validDirs = possibleDirs.filter(d => {
            // Can't go back unless forced
            if (d.x === -this.dir.x && d.y === -this.dir.y && this.dir !== DIRECTION.STATIONARY) return false;
            return this.canMove(ghostFriendlyDir(d, this.state));
        });

        // Helper to allow ghosts into house
        function ghostFriendlyDir(d, state) {
            return d; // Simplified for now
        }

        if (validDirs.length === 0) {
            this.dir = { x: -this.dir.x, y: -this.dir.y };
            return;
        }

        if (this.state === 'FRIGHTENED') {
            this.dir = validDirs[Math.floor(Math.random() * validDirs.length)];
        } else {
            // Simple target-seeking logic
            this.updateTarget();
            let bestDir = validDirs[0];
            let minDist = Infinity;

            validDirs.forEach(d => {
                const nextR = Math.floor(this.y / CONFIG.TILE_SIZE) + d.y;
                const nextC = Math.floor(this.x / CONFIG.TILE_SIZE) + d.x;
                const dist = Math.hypot(nextR - this.target.r, nextC - this.target.c);
                if (dist < minDist) {
                    minDist = dist;
                    bestDir = d;
                }
            });
            this.dir = bestDir;
        }
    }

    updateTarget() {
        const pPos = this.game.pacman.getTilePos();

        if (this.state === 'EATEN') {
            this.target = { r: 9, c: 9 };
            return;
        }

        switch (this.type) {
            case 'blinkey': // Aggressive chase
                this.target = pPos;
                break;
            case 'pinky': // Intercept
                this.target = {
                    r: pPos.r + this.game.pacman.dir.y * 4,
                    c: pPos.c + this.game.pacman.dir.x * 4
                };
                break;
            case 'inky': // Erratic (simplified)
                this.target = {
                    r: pPos.r + (Math.random() > 0.5 ? 2 : -2),
                    c: pPos.c + (Math.random() > 0.5 ? 2 : -2)
                };
                break;
            case 'clyde': // Shy
                const dist = Math.hypot(this.getTilePos().r - pPos.r, this.getTilePos().c - pPos.c);
                this.target = dist > 8 ? pPos : { r: 18, c: 0 };
                break;
        }
    }

    draw(ctx) {
        let drawColor = this.color;
        if (this.state === 'FRIGHTENED') drawColor = CONFIG.COLORS.GHOSTS.frightened;
        if (this.state === 'EATEN') drawColor = 'rgba(255,255,255,0.2)';

        ctx.fillStyle = drawColor;

        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y - 2, CONFIG.TILE_SIZE / 2 - 2, Math.PI, 0);
        ctx.lineTo(this.x + CONFIG.TILE_SIZE / 2 - 2, this.y + CONFIG.TILE_SIZE / 2 - 2);
        ctx.lineTo(this.x - CONFIG.TILE_SIZE / 2 + 2, this.y + CONFIG.TILE_SIZE / 2 - 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.arc(this.x + 4, this.y - 4, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.x - 4 + this.dir.x * 2, this.y - 4 + this.dir.y * 2, 1.5, 0, Math.PI * 2);
        ctx.arc(this.x + 4 + this.dir.x * 2, this.y - 4 + this.dir.y * 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Start the game
window.onload = () => {
    new Game();
};
