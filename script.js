const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const stateEl = document.getElementById("state");

// Elementos de Overlay / UI
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySubtitle = document.getElementById("overlaySubtitle");
const actionBtn = document.getElementById("actionBtn");
const highScoreInputContainer = document.getElementById("highScoreInputContainer");
const initialsInput = document.getElementById("initialsInput");
const leaderboard = document.getElementById("leaderboard");
const leaderboardList = document.getElementById("leaderboardList");

const CELL = 24;
const COLS = canvas.width / CELL;
const ROWS = canvas.height / CELL;
const TICK_MS = 110;

const STATES = { READY: "PRONTO", PLAYING: "JOGANDO", PAUSED: "PAUSA", OVER: "GAME OVER" };

let state = STATES.READY;
let snake = [];
let dir = { x: 1, y: 0 };
let nextDir = { x: 1, y: 0 };
let food = { x: 10, y: 10 };

// Fruta Especial Dourada
let specialFood = null; // { x, y, spawnTime, duration: 6000 }
const SPECIAL_FOOD_DURATION = 7000; // 7 segundos de duração
let nextSpecialFoodTimer = 10000; // Tempo em ms para tentar spawnar a próxima

// Obstáculos
let obstacles = [];

let score = 0;
let acc = 0;
let last = 0;
let pendingHighScore = false;

// Gerenciamento de Highscores no localStorage
function getHighScores() {
    return JSON.parse(localStorage.getItem("wyrm-scores") || "[]");
}

function saveHighScore(initials, pts) {
    const scores = getHighScores();
    scores.push({ initials: initials.toUpperCase(), score: pts });
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 5); // Mantém os 5 melhores
    localStorage.setItem("wyrm-scores", JSON.stringify(topScores));
}

function updateBestDisplay() {
    const scores = getHighScores();
    const topScore = scores.length > 0 ? scores[0].score : 0;
    bestEl.textContent = topScore;
}

function renderLeaderboard() {
    const scores = getHighScores();
    leaderboardList.innerHTML = "";
    if (scores.length === 0) {
        leaderboard.classList.add("hidden");
        return;
    }
    leaderboard.classList.remove("hidden");
    scores.forEach((entry) => {
        const li = document.createElement("li");
        li.innerHTML = `<span class="name">${entry.initials}</span> <span>${entry.score} pts</span>`;
        leaderboardList.appendChild(li);
    });
}

// Inicialização das estrelas ao redor
function createStars() {
    const container = document.getElementById("starsContainer");
    container.innerHTML = "";
    const count = 70;
    for (let i = 0; i < count; i++) {
        const star = document.createElement("div");
        star.classList.add("star");
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.setProperty("--duration", `${Math.random() * 3 + 2}s`);
        container.appendChild(star);
    }
}

// Gerar Obstáculos em locais estratégicos no mapa
function createObstacles() {
    obstacles = [
        // Bloco superior esquerdo
        { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 6 },
        // Bloco inferior direito
        { x: 14, y: 14 }, { x: 15, y: 14 }, { x: 15, y: 13 },
        // Barreira central superior
        { x: 9, y: 4 }, { x: 10, y: 4 }, { x: 11, y: 4 },
        // Barreira central inferior
        { x: 9, y: 16 }, { x: 10, y: 16 }, { x: 11, y: 16 }
    ];
}

function isOccupied(x, y) {
    const inSnake = snake.some((s) => s.x === x && s.y === y);
    const inObstacle = obstacles.some((o) => o.x === x && o.y === y);
    const inFood = food && food.x === x && food.y === y;
    const inSpecialFood = specialFood && specialFood.x === x && specialFood.y === y;
    return inSnake || inObstacle || inFood || inSpecialFood;
}

function reset() {
    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);
    
    snake = [
        { x: midX, y: midY },
        { x: midX - 1, y: midY },
        { x: midX - 2, y: midY },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    scoreEl.textContent = score;

    createObstacles();
    specialFood = null;
    nextSpecialFoodTimer = 8000 + Math.random() * 5000; // Primeiros 8-13s
    
    spawnFood();
    state = STATES.READY;
    stateEl.textContent = state;
    pendingHighScore = false;
    
    showOverlayReady();
}

function spawnFood() {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS),
        };
    } while (isOccupied(pos.x, pos.y));
    food = pos;
}

function spawnSpecialFood(now) {
    let pos;
    do {
        pos = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * ROWS),
        };
    } while (isOccupied(pos.x, pos.y));
    
    specialFood = {
        x: pos.x,
        y: pos.y,
        spawnTime: now,
        duration: SPECIAL_FOOD_DURATION
    };
}

function setDirection(x, y) {
    if (dir.x + x === 0 && dir.y + y === 0) return; // Impede 180°
    nextDir = { x, y };
}

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
        e.preventDefault();
    }

    if (key === "arrowup" || key === "w") setDirection(0, -1);
    if (key === "arrowdown" || key === "s") setDirection(0, 1);
    if (key === "arrowleft" || key === "a") setDirection(-1, 0);
    if (key === "arrowright" || key === "d") setDirection(1, 0);

    if (key === " ") {
        if (state === STATES.PLAYING) {
            state = STATES.PAUSED;
            stateEl.textContent = state;
            showOverlayPause();
        } else if (state === STATES.PAUSED) {
            state = STATES.PLAYING;
            stateEl.textContent = state;
            hideOverlay();
        }
    }

    if (state === STATES.READY && ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"].includes(key)) {
        startGame();
    }
});

function startGame() {
    state = STATES.PLAYING;
    stateEl.textContent = state;
    hideOverlay();
}

function tick() {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    const hitWall = head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS;
    const hitBody = snake.some((s) => s.x === head.x && s.y === head.y);
    const hitObstacle = obstacles.some((o) => o.x === head.x && o.y === head.y);

    if (hitWall || hitBody || hitObstacle) {
        state = STATES.OVER;
        stateEl.textContent = state;
        handleGameOver();
        return;
    }

    snake.unshift(head);

    // Comer fruta normal
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        spawnFood();
    } 
    // Comer fruta especial dourada
    else if (specialFood && head.x === specialFood.x && head.y === specialFood.y) {
        score += 30; // Mais pontos!
        scoreEl.textContent = score;
        specialFood = null; // Some ao ser comida
    } 
    else {
        snake.pop();
    }
}

function handleGameOver() {
    const scores = getHighScores();
    const isHighScore = scores.length < 5 || score > (scores[scores.length - 1]?.score || 0);

    overlayTitle.textContent = "GAME OVER";
    overlaySubtitle.textContent = `Sua pontuação final: ${score}`;
    actionBtn.textContent = "JOGAR NOVAMENTE";

    if (isHighScore && score > 0) {
        pendingHighScore = true;
        highScoreInputContainer.classList.remove("hidden");
        initialsInput.value = "";
        initialsInput.focus();
    } else {
        pendingHighScore = false;
        highScoreInputContainer.classList.add("hidden");
    }

    renderLeaderboard();
    overlay.classList.remove("hidden");
}

function showOverlayReady() {
    overlayTitle.textContent = "Wyrm";
    overlaySubtitle.textContent = "Pronto para jogar?";
    actionBtn.textContent = "JOGAR";
    highScoreInputContainer.classList.add("hidden");
    renderLeaderboard();
    overlay.classList.remove("hidden");
}

function showOverlayPause() {
    overlayTitle.textContent = "PAUSADO";
    overlaySubtitle.textContent = "Pressione Espaço para continuar";
    actionBtn.textContent = "CONTINUAR";
    highScoreInputContainer.classList.add("hidden");
    renderLeaderboard();
    overlay.classList.remove("hidden");
}

function hideOverlay() {
    overlay.classList.add("hidden");
}

actionBtn.addEventListener("click", () => {
    if (state === STATES.OVER && pendingHighScore) {
        const initials = initialsInput.value.trim().substring(0, 3) || "WYR";
        saveHighScore(initials, score);
        updateBestDisplay();
    }

    if (state === STATES.PAUSED) {
        state = STATES.PLAYING;
        stateEl.textContent = state;
        hideOverlay();
    } else {
        reset();
        startGame();
    }
});

// Desenho dos elementos
function drawFood() {
    ctx.fillStyle = "#f87171";
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(
        food.x * CELL + CELL / 2,
        food.y * CELL + CELL / 2,
        CELL / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawSpecialFood(now) {
    if (!specialFood) return;

    const elapsed = now - specialFood.spawnTime;
    const remaining = specialFood.duration - elapsed;

    if (remaining <= 0) {
        specialFood = null; // Expirou
        return;
    }

    const centerX = specialFood.x * CELL + CELL / 2;
    const centerY = specialFood.y * CELL + CELL / 2;

    // Desenha Fruta Dourada Reluzente
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "#eab308";
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Desenha anel do timer expirando ao redor da fruta
    const progress = remaining / specialFood.duration;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
        centerX,
        centerY,
        CELL / 2 + 1,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress
    );
    ctx.stroke();
}

function drawObstacles() {
    obstacles.forEach((o) => {
        ctx.fillStyle = "#4c1d95";
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 1.5;

        const x = o.x * CELL + 1;
        const y = o.y * CELL + 1;
        const w = CELL - 2;

        ctx.beginPath();
        ctx.roundRect(x, y, w, w, 4);
        ctx.fill();
        ctx.stroke();
    });
}

function drawSnake() {
    snake.forEach((s, i) => {
        // Calculation de degradê roxo (#8b5cf6) -> azul (#3b82f6)
        const factor = i / Math.max(snake.length - 1, 1);
        const r = Math.round(139 + (59 - 139) * factor);
        const g = Math.round(92 + (130 - 92) * factor);
        const b = Math.round(246 + (246 - 246) * factor);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, 6);
        ctx.fill();

        // Desenhar olhos na cabeça
        if (i === 0) {
            ctx.fillStyle = "#000000";
            const eyeRadius = 2.5;
            let eye1 = { x: 0, y: 0 };
            let eye2 = { x: 0, y: 0 };

            if (dir.x === 1) { // Direita
                eye1 = { x: s.x * CELL + CELL - 6, y: s.y * CELL + 6 };
                eye2 = { x: s.x * CELL + CELL - 6, y: s.y * CELL + CELL - 6 };
            } else if (dir.x === -1) { // Esquerda
                eye1 = { x: s.x * CELL + 6, y: s.y * CELL + 6 };
                eye2 = { x: s.x * CELL + 6, y: s.y * CELL + CELL - 6 };
            } else if (dir.y === -1) { // Cima
                eye1 = { x: s.x * CELL + 6, y: s.y * CELL + 6 };
                eye2 = { x: s.x * CELL + CELL - 6, y: s.y * CELL + 6 };
            } else { // Baixo
                eye1 = { x: s.x * CELL + 6, y: s.y * CELL + CELL - 6 };
                eye2 = { x: s.x * CELL + CELL - 6, y: s.y * CELL + CELL - 6 };
            }

            ctx.beginPath();
            ctx.arc(eye1.x, eye1.y, eyeRadius, 0, Math.PI * 2);
            ctx.arc(eye2.x, eye2.y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function draw(now) {
    // Limpar Canvas
    ctx.fillStyle = "#070a12";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid discreto
    ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
    for (let x = 0; x < canvas.width; x += CELL) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += CELL) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    drawObstacles();
    drawFood();
    drawSpecialFood(now);
    drawSnake();
}

function loop(ts) {
    const dt = ts - last;
    last = ts;

    if (state === STATES.PLAYING) {
        acc += dt;
        while (acc >= TICK_MS) {
            tick();
            acc -= TICK_MS;
        }

        // Lógica de spawn da fruta especial
        nextSpecialFoodTimer -= dt;
        if (nextSpecialFoodTimer <= 0 && !specialFood) {
            spawnSpecialFood(ts);
            // Define o próximo tempo de spawn (entre 12s e 20s)
            nextSpecialFoodTimer = 12000 + Math.random() * 8000;
        }
    }

    draw(ts);
    requestAnimationFrame(loop);
}

// Inicialização
createStars();
updateBestDisplay();
reset();
requestAnimationFrame(loop);