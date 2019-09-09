var current_time = 0;

var window_offset = vec2.create();
var window_scale = vec2.create();
var clip_coords = vec2.create();

var dir = 0;
var n = 0;

var currTime, timePassed;
var clicktime = 0;
var clickpos = vec3.fromValues(0.0,0.0,6.7);

var mouseInitialized = false;
var deltamX = 0, delatmY = 0;
var mouseRead = false;

var down = false,up = false;
var lastX = 0,lastY = 0;



function getClipCoords(pageX, pageY){

    let test = vec2.fromValues(pageX, pageY);
    let rect = canvas.getBoundingClientRect();

    window_offset = vec2.fromValues(rect.left, rect.bottom);
    window_scale = vec2.fromValues(rect.width, rect.height);

    vec2.sub(clip_coords, test, window_offset);
    vec2.div(clip_coords, clip_coords, window_scale);

    vec2.multiply(clip_coords, clip_coords, vec2.fromValues(2,-2));
    vec2.sub(clip_coords, clip_coords, vec2.fromValues(1,1));

    return clip_coords;
}


function trackMovement(e){

    if (down){
        let init = getClipCoords(e.pageX, e.pageY)

        if (reset){
            mouseData[0] = init;
            mouseData[1] = init;
            reset = false;
        }
        else if (mouseData[0] == null){
            mouseData[0] = vec2.clone(mouseData[1]);
            mouseData[1] = init;
        }
        else {
            mouseData[1] = init;
        }
    }
}



function updateClick(){
    clicktime = performance.now()/1000;
    vec3.add(clickpos, player.focusVec, player.eyePt);

    clickData.set(0, clicktime)
	.set(1, clickpos)
	.update()
}



function mouseHandler(e){

    mouseRead = false;

    if (!mouseInitialized){
        deltamX = 0;
        deltamY = 0;
        mouseInitialized = true;
    }
    else {
        deltamX = e.pageX - mouseX;
        deltamY = e.pageY - mouseY;
    }
    mouseX = e.pageX;
    mouseY = e.pageY;
}


function updateRect(){

    let canvas1 = document.getElementById("view");
    let rect1 = canvas1.getBoundingClientRect();
    window_offset = vec2.fromValues(rect1.left, rect1.bottom);
    window_scale = vec2.fromValues(rect1.width, rect1.height);

    console.log("rec update to (w by h)..." + rect1.width + " x " + rect1.height);

    mat4.perspective(projMatrix, Math.PI / 2, rect1.width / rect1.height, 0.9, 2.5);

    mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);
    sceneUniformBuffer.set(0, viewProjMatrix);
}


var keyMap = new Map();

keyMap.set(87, false);//forward
keyMap.set(65, false);//left
keyMap.set(68, false);//right
keyMap.set(83, false);//backward
keyMap.set(71, false);//go
keyMap.set(84, false);//terminate

function keydown(event) {
    if (event.keyCode == 71 && !keyMap.get(71)){
        cont = 1;
        console.log("pressed g...");
        window.requestAnimationFrame(updateWorld);
    }
    else if (event.keyCode == 84){
        cont = 0;
        keyMap.set(71, false);
    }
    else if (event.keyCode == 87){
        //updatefps = 1;
        cut = true;
    }
    keyMap.set(event.keyCode, true);
}


function keyup(event) {
    if (event.keyCode != 71){
        keyMap.set(event.keyCode, false);
    }
}


window.addEventListener("keydown", keydown, false);
window.addEventListener("keyup", keyup, false);

if (mode == 1){
    window.addEventListener("mousedown", function(){down = true}, false);
    window.addEventListener("mouseup", function(event){
        down = false; 
        reset = true;
        console.log("WebGL coords, from: " + getClipCoords(event.pageX, event.pageY));
    }, false);
    window.onresize = updateRect;
    canvas.addEventListener("resize", updateRect);
    window.addEventListener("mousemove", trackMovement, false);
}
else {
    window.addEventListener("mouseup", function(event) {
        mouseX = event.clientX;
        mouseY = event.clientY;
        picked = true; 
    });
    window.addEventListener("mousemove", mouseHandler, false);
    window.addEventListener("click", updateClick, false);
}

cont = 1;