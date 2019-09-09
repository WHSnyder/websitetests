//Still very unsure of why this must be loaded twice...
//Duiplicating this logic inside the rendering promise resolution 
//fixed solved the issue where the console had to be open..
var current_time = 0;

var window_offset = vec2.fromValues(rect.left, rect.bottom);
var window_scale = vec2.fromValues(rect.width, rect.height);
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

    let test1 = vec2.fromValues(pageX, pageY);
    vec2.sub(clip_coords, test1, window_offset);
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

    //console.log("updated...")

    //rect = canvas.getBoundingClientRect();
    //window_offset = vec2.fromValues(rect.left, rect.bottom);
    //window_scale = vec2.fromValues(rect.width, rect.height);

    //reset = true;
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
        //console.log("pressed g...");

        window.requestAnimationFrame(updateWorld);
    }
    else if (event.keyCode == 84){
        cont = 0;
        keyMap.set(71, false);
        //updateRect();
    }
    else if (event.keyCode == 87){
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


window.addEventListener("mousedown", function(){down = true}, false);
window.addEventListener("mouseup", function(){down = false; reset = true}, false);
window.addEventListener("mousemove", trackMovement, false);


