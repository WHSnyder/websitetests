var vert_shader = `

precision mediump float;

attribute vec3 vertpos;
attribute vec3 vertcolor;

uniform mat4 viewmat;
uniform float timevar;
uniform mat4 frust;

varying vec3 fragcolor;

void main(){

	//gl_Position = vec4(vertpos.x, sin(timevar+vertpos.x)*vertpos.y, 1.0, 1.0 + abs(cos(timevar)));
	//fragcolor = vec3(abs(sin(timevar + vertcolor.x)), abs(sin(timevar + .5 + vertpos.y)), abs(sin(timevar + 1.0)));

	//fragcolor = vertcolor;
	//gl_Position = vec4(vertpos, 1.0);

	fragcolor = vec3(abs(sin(timevar + vertcolor.x)), abs(sin(timevar + .5 + vertpos.y)), abs(sin(timevar + 1.0)));
	gl_Position = frust * viewmat * vec4(vertpos, 1.0);
}`;


var frag_shader = `

precision mediump float;

varying vec3 fragcolor;


void main(){

	gl_FragColor = vec4(fragcolor, 1.0);
}`;


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

var eyeCoord = vec3.fromValues(0,0,1);
var focusPt = vec3.fromValues(0,0,-.2);
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
mat4.perspective(frust, Math.PI/2, 4/3, .1, 4);


var viewmatrix =  mat4.create();
var viewmat, frustmat, rotmat;
var timemem;


var cont = 1;
var dir = 0;

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

	gl.drawArrays(gl.TRIANGLES, 0, 9);

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


var demoinit = function () {

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
    // Vertex coordinates and color(RGBA)
     0.0,  0.5,  -0.4,  0.4,  1.0,  0.4, // The back green one
    -0.5, -0.5,  -0.4,  0.4,  1.0,  0.4,
     0.5, -0.5,  -0.4,  1.0,  0.4,  0.4, 
   
     0.5,  0.4,  -0.2,  1.0,  0.4,  0.4, // The middle yellow one
    -0.5,  0.4,  -0.2,  1.0,  1.0,  0.4,
     0.0, -0.6,  -0.2,  1.0,  1.0,  0.4, 

     0.0,  0.5,   0.0,  0.4,  0.4,  1.0,  // The front blue one 
    -0.5, -0.5,   0.0,  0.4,  0.4,  1.0,
     0.5, -0.5,   0.0,  1.0,  0.4,  0.4 
  	]);

  	var vertBuf = gl.createBuffer();

  	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
  	gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

  	var elSize = Float32Array.BYTES_PER_ELEMENT;

  	var posMem = gl.getAttribLocation(prog, 'vertpos');
	var colorMem = gl.getAttribLocation(prog, 'vertcolor');

  	gl.vertexAttribPointer(posMem, 3, gl.FLOAT, gl.FALSE, elSize * 6, 0);
  	gl.vertexAttribPointer(colorMem, 3, gl.FLOAT, gl.FALSE, elSize * 6, 3 * elSize);

  	gl.enableVertexAttribArray(posMem);
	gl.enableVertexAttribArray(colorMem);


	viewmat = gl.getUniformLocation(prog, 'viewmat');
	frustmat = gl.getUniformLocation(prog, 'frust');

	gl.uniformMatrix4fv(frustmat, false, frust);

	rotmat = mat4.create();

	timeMem = gl.getUniformLocation(prog, 'timevar');

	console.log("demoinit done");
};









