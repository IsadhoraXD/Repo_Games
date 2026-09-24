const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d");

const player = {x: 40, y: 160, w: 32, h:32, vx:120}

let last = 0;

function update(dt){
    player.x += player.vx * dt;
    if (player.x < 0 || player.x + player.w > canvas.width){
        player.vx *= -1;
    }
}

function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(player.x, player.y, player.h, player.w);

    ctx.fillStyle = "#fff";
    ctx.fillRect(player.x, player.y, player.h, player.w);
    
    ctx.fillText("O Deltaine - dt independente de taxa de quadros", 12, 20);
}

function loop(ts){
    if(!last) last = ts;

    const dt = Math.min(0.05, (ts - last/1000)); // ms = segundo
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop); // Executar o primeiro disparo