const canvas = document.getElementById("game")
const ctx = canvas.getContext("2d");

const player = {x: 40, y: 160, r:40, vx:120, vy:120}

let last = 0;

function update(dt){ // Eu usei dt porque ele normaliza a velocidade, 
// fazendo com que o player (nesse caso a bola) se mova da mesma forma independente do FPS. 
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    if (player.x - player.r < 0 || player.x + player.r > canvas.width){
        player.vx *= -1;
    }    
    if (player.y - player.r < 0 || player.y + player.r > canvas.height){
        player.vy *= -1;
    }
}

function draw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";    
    ctx.fillText("Delta time - dt independente de taxa de quadros", 12, 20);
}

function loop(ts){
    if(!last) last = ts;

    const dt = Math.min(0.05, (ts - last)/1000); // ms = segundo
    last = ts;
    update(dt);
    draw();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop); // Executar o primeiro disparo