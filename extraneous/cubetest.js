var vert_shader = `

precision mediump float;

attribute vec3 vertpos;
attribute vec3 vertcolor;
attribute vec2 texCoord;

uniform mat4 viewmat;
uniform float timevar;
uniform mat4 frust;


/*struct Data {
  vec2 tex;
  vec3 color;
};

varying Data out;*/

varying vec2 tex;
varying vec3 color;


void main(){

    //gl_Position = vec4(vertpos.x, sin(timevar+vertpos.x)*vertpos.y, 1.0, 1.0 + abs(cos(timevar)));
    //fragcolor = vec3(abs(sin(timevar + vertcolor.x)), abs(sin(timevar + .5 + vertpos.y)), abs(sin(timevar + 1.0)));

    //fragcolor = vertcolor;
    //gl_Position = vec4(vertpos, 1.0);

    //fragcolor = vec3(abs(sin(timevar + vertcolor.x)), abs(sin(timevar + .5 + vertpos.y)), abs(sin(timevar + 1.0)));
    gl_Position = frust * viewmat * vec4(vertpos, 1.0);

    tex = texCoord;
    color = vertcolor;
}`;



var frag_shader = `

precision mediump float;
uniform sampler2D sampler;

//varying Data out;

varying vec2 tex;
varying vec3 color;

void main(){
    gl_FragColor = vec4(color, 1.0) * texture2D(sampler, tex);
}`;





/*
class Vert {

    coords;
    color;
    uv;
    normal;

    constructor(xp, yp, zp, rp, gp, bp, sp, tp){

        this.x = xp;
        this.y = yp;
        this.z = zp;
        this.r = rp;
        this.g = gp;
        this.b = bp;
        this.s = sp;
        this.t = tp;
    }

    constructor(xp,yp,zp){
        this.x = xp;
        this.y = yp;
        this.z = zp;
        this.r = 0;
        this.g = 0;
        this.b = 0;
        this.s = 0;
        this.t = 0;
    }


    constructor(xp,yp,zp, rp, gp, bp){
        this.x = xp;
        this.y = yp;
        this.z = zp;
        this.r = rp;
        this.g = gp;
        this.b = bp;
        this.s = 0;
        this.t = 0;
    }

    toArray(){
        return [x, y, z, r, g, b, s, t];
    }
}


class Triangle {

    one, two, three;

    constructor(onep, twop, threep){

        this.one = onep;
        this.two = twop;
        this.three = threep;
    }
}


class Obj {

    tris = [];

    constructor(){
        tris = [];
    }

    addTri(tri){

        tris.push(tri);
    }

    toArray(){
        //
    }
}


*/




var mat4 = glMatrix.mat4;
var vec3 = glMatrix.vec3;
var quat = glMatrix.quat;

function initGL(gl, canvas){
    if (!gl){
        alert("Dude get hip");
        return -1;
    }
  gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    return 0;
}

function initShader(gl, shaderVar, shaderText){

    gl.shaderSource(shaderVar, shaderText);
    gl.compileShader(shaderVar);

    if (!gl.getShaderParameter(shaderVar, gl.COMPILE_STATUS)){
        console.error("shader compilation failed", gl.getShaderInfoLog(shaderVar));
        return -1;
    }
    return 0;
}

var eyeCoord = vec3.fromValues(0,3,0);
var focusPt = vec3.fromValues(0,0,-3);
var upDir = vec3.fromValues(0,1,0);
var recv = vec3.create();
var rotationQuat = quat.create(); 
quat.fromEuler(rotationQuat, 0,0,0);

var toOrg = vec3.create();
vec3.sub(toOrg, focusPt, vec3.create());
var scale = vec3.fromValues(1,1,1);
var dummyTransl = vec3.create();
var gl;
var angle = 0;
var frust = mat4.create();
mat4.perspective(frust, Math.PI/2, 4/3, .5, 10);

var viewmatrix =  mat4.create();
var viewmat, frustmat, rotmat;
var timemem, time;
var samplermem;

var cont = 1;
var dir = 0;

var n = 0;

var currTime;

function render(){

    var timePassed;

    if (cont == 0){
        return;
    }

    timePassed = performance.now() - currTime;
    //currTime = performance.now();

    quat.fromEuler(rotationQuat, 0, timePassed/10000 * Math.PI/4 * dir, 0);

    mat4.fromRotationTranslationScaleOrigin(rotmat, rotationQuat, dummyTransl, scale, toOrg);
    vec3.transformMat4(eyeCoord, eyeCoord, rotmat);

    mat4.lookAt(viewmatrix, eyeCoord, focusPt, upDir);

    gl.uniformMatrix4fv(viewmat,false, viewmatrix);
    gl.uniform1f(timeMem, (timePassed/1000) % 5000);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //gl.drawArrays(gl.TRIANGLES, 0, 9);
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);

    window.requestAnimationFrame(render);
}




document.onkeydown = function(ev){ trigger(ev); };
    
function trigger(ev) {

    if (ev.keyCode == 39){
        dir += 1;
    }
    else if (ev.keyCode == 37){
        dir -= 1;
    }
    else if (ev.keyCode == 81){//q
        cont = 0;
    }
    else if (ev.keyCode == 87){//w

        cont = 1;
        currTime = performance.now();
        window.requestAnimationFrame(render);
    }
    else {return;}
};




function loadTexture(gl, img){

    console.log("up here width is: " + img.width);

    var texture = gl.createTexture();


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // Flip the image's y axis

    //var image = createTextureFromImage(gl, img);
    //^^texImg2D called in that func


    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    //gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.uniform1i(samplermem, 0);
}



function initTexture(gl){

    var img = new Image();

    img.onload = function(){ loadTexture(gl, img);};

    img.crossOrigin = "anonymous"; 
    img.src = "./images/foam.jpg";
}






var cubedemo = function () {

    var canvas = document.getElementById("view");    

    gl = canvas.getContext("webgl");

    initGL(gl, canvas);

    var vshader = gl.createShader(gl.VERTEX_SHADER);
    var fshader = gl.createShader(gl.FRAGMENT_SHADER);

    initShader(gl, vshader, vert_shader);
    initShader(gl, fshader, frag_shader);

    prog = gl.createProgram();
    gl.attachShader(prog, vshader);
    gl.attachShader(prog, fshader);

    gl.linkProgram(prog);

    gl.useProgram(prog);

    gl.enable(gl.DEPTH_TEST);


    var verts = new Float32Array([
    // Vertex coordinates and color
        -1.0,  0.0,  -5.0,     1.0,  1.0,  1.0,  0.0,0.0,// v0 White
        1.0,  0.0,  -5.0,     1.0,  0.0,  1.0,  1.0,0.0,// v1 Magenta
        0.0,   3.0,  -3.0,    1.0,  0.0,  0.0,  0.0,0.0,// v2 Red
        -1.0, 0.0,  -1.0,     1.0,  1.0,  0.0,  0.0,1.0,// v3 Yellow
        1.0,  0.0, -1.0,     0.0,  1.0,  0.0,  1.0,1.0// v4 Green
    ]);

    // Indices of the vertices
    var indices = new Uint8Array([
        0, 1, 3,   1, 3, 4,    // front
        0, 3, 2,   0, 1, 2,    // right
        3, 4, 2,   1, 4, 2,    // up
    ]);

    var vertBuf = gl.createBuffer();
    var indBuf = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    var elSize = Float32Array.BYTES_PER_ELEMENT;

    var posMem = gl.getAttribLocation(prog, 'vertpos');
    var colorMem = gl.getAttribLocation(prog, 'vertcolor');
    var texMem = gl.getAttribLocation(prog, 'texCoord');

    samplermem = gl.getUniformLocation(prog, 'sampler');

    gl.vertexAttribPointer(posMem, 3, gl.FLOAT, gl.FALSE, elSize * 8, 0);
    gl.vertexAttribPointer(colorMem, 3, gl.FLOAT, gl.FALSE, elSize * 8, 3 * elSize);
    gl.vertexAttribPointer(texMem, 2, gl.FLOAT, gl.FALSE, elSize * 8, 6 * elSize);

    gl.enableVertexAttribArray(posMem);
    gl.enableVertexAttribArray(colorMem);

    initTexture(gl);

    gl.enableVertexAttribArray(texMem);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    n = indices.length;

    viewmat = gl.getUniformLocation(prog, 'viewmat');
    frustmat = gl.getUniformLocation(prog, 'frust');
    

    gl.uniformMatrix4fv(frustmat, false, frust);

    rotmat = mat4.create();


    mat4.fromRotationTranslationScaleOrigin(rotmat, rotationQuat, dummyTransl, scale, toOrg);

    recv = vec3.transformMat4(recv, eyeCoord, rotmat);

    timeMem = gl.getUniformLocation(prog, 'timevar');
};