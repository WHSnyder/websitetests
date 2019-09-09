var objects = {};

var mode = 2;

var dimension = [document.documentElement.clientWidth, document.documentElement.clientHeight];
var c = document.getElementById("view");
c.width = dimension[0];
c.height = dimension[1];


var g_up = vec3.fromValues(0.0,1.0,0.0)



var shell;

function readOBJFile(fileName, scale, reverse) {
  
  var request = new XMLHttpRequest();

  request.open('GET', fileName, false); // Create a request to acquire the file
  request.send(); 

  return onReadOBJFile(request.responseText, fileName, scale, reverse);
}





var ripple_vs = `#version 300 es
#define M_PI 3.1415926535897932384626433832795

precision highp float;

layout(std140, column_major) uniform;

layout(location=0) in vec3 vertpos;
layout(location=1) in vec3 normal;


uniform FrameUniforms {

	float flag;

	mat4 viewmat;
	mat4 frustmat;

	float timevar;
};


uniform ClickData {
	
	float clicktime;
	vec3 clickpos;
};


out vec4 color;



void main(){

    float speed = 4.0;
    float dietime = 10.0;

    vec3 vertposnormed = normalize(vertpos);


    float timediff = timevar - clicktime;

    float wavedist = speed * timediff;

    float between = abs(acos(dot(vertposnormed, normalize(clickpos))));

    float vertdist = (between / M_PI) * 6.7 * 2.0;

    float damp = clamp(1.0 - (timediff/dietime),0.0,1.0);

    float mag = damp * cos(1.3 * (vertdist - wavedist));


    float tst = 0.0;

    if (vertdist - wavedist > 1.5){
    	mag = 0.0;
    }

    if (timediff > dietime){
    	//mag = 0.0;
    }

    vec3 newvertpos = vec3(10.0 * mag * vec3(1.0,1.0,1.0) + 6.0*vertpos);

    vec3 lcolor = vec3(abs(cos(timevar/2.0)), 0.0, abs(sin(timevar/2.0)));


    color = vec4(mag * lcolor);

    
    if (flag < 0.0){
        color = clamp(mag, 0.0, 1.0) * vec4(1.0, 1.0, 1.0,0.0) + color);
    }
    

    gl_Position = frustmat * viewmat * vec4(newvertpos, 1.0);
    gl_PointSize = 20.0;
}`;


var simpler_ripple_vs = `#version 300 es
#define M_PI 3.1415926535897932384626433832795

precision highp float;

layout(std140, column_major) uniform;

layout(location=0) in vec3 vertpos;
layout(location=1) in vec3 normal;

uniform FrameUniforms {
	mat4 viewmat;
	mat4 frustmat;
	float timevar;
};

uniform ClickData {
	float clicktime;
	vec3 clickpos;
};

out vec4 color;

void main(){

    float speed = 0.5;
    float dist = speed * (timevar - clicktime);

    float dot_adjusted = 1.0 + dot(normalize(normal), normalize(clickpos));
    float dot_vert = 1.0 - dot(normalize(vertpos), normalize(clickpos));

    float mag = clamp(1.0 - abs(dist - dot_adjusted), 0.0, 1.0); 
    float mag_vert = clamp(1.0 - abs(dist - dot_vert), 0.0, 1.0); 

    vec3 lcolor = abs(normalize(clickpos)); //vec3(abs(cos(timevar/2.0)), 0.0, abs(sin(timevar/2.0)));
    color = vec4(mag * lcolor, 1.0);

    vec3 newvertpos = vec3(15.0 * mag_vert * vec3(1.0,1.0,1.0) + 6.0*vertpos);
    gl_Position = frustmat * viewmat * vec4(newvertpos, 1.0);
}`;



var ripple_fs = `#version 300 es
precision highp float;

in vec4 color;

out vec4 fragColor;

void main() {
    fragColor = color;// + addit;    
}`;


var picking_vs = `#version 300 es

layout(location=0) in vec4 aPosition;
        
uniform mat4 viewmat;
uniform mat4 frustmat;
uniform mat4 modelmat;
    
void main() {
    gl_Position = frustmat * viewmat * modelmat * vec4(2.0 * aPosition.xyz,1.0);
}`;


var picking_fs =  `#version 300 es

precision highp float;

uniform vec3 uPickColor;
out vec4 fragColor;

void main() {
    fragColor = vec4(uPickColor, 1.0);
 }`;    


var main_vs = `#version 300 es
        
uniform mat4 frustmat;

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aTexCoord;

layout(std140, column_major)


uniform FrameUniforms {

	mat4 viewmat;
	mat4 uModelMatrix;
	vec4 uHighlightColor;
};

        
out vec3 vPosition;
out vec3 vNormal;
out vec2 vTexCoord;

void main() {

	gl_Position = frustmat * viewmat * uModelMatrix * aPosition;
	vPosition = vec3(uModelMatrix * aPosition);
	vNormal = vec3(uModelMatrix * vec4(aNormal, 0.0));
	vTexCoord = aTexCoord;
}`;


var main_fs = `#version 300 es

precision highp float;

/*uniform SceneUniforms {
	vec4 uLightPosition;
	vec4 uEyePosition;
};*/

uniform ClickData {
	float clicktime;
	vec3 clickpos;
};

uniform FrameUniforms {

	mat4 viewmat;
	mat4 uModelMatrix;
	vec4 uHighlightColor;
};
        
//uniform sampler2D uTextureMap;

uniform float timevar;

in vec3 vPosition;
in vec3 vNormal;
in vec2 vTexCoord;
out vec4 fragColor;

void main() {

	float speed = 0.5;
    float dist = speed * (timevar - clicktime);

    float dot_click = -1.0 + dot(normalize(vNormal), normalize(clickpos));

    float mag = 5.0 * clamp(1.0 - abs(dist + dot_click), 0.0, 1.0); 


	vec4 baseColor = vec4(mag * abs(normalize(clickpos)), 1.0);//vec4(0.2,0.2,0.2,1.0);
	vec3 normal = normalize(vNormal);

	//vec3 eyeDirection = normalize(uEyePosition.xyz - vPosition);

	//vec3 lightDirection = normalize(uLightPosition.xyz - vPosition);
	//vec3 reflectionDirection = reflect(-lightDirection, normal);
	
	//float nDotL = max(dot(lightDirection, normal), 0.0);


	//float diffuse = mag;
	float ambient = 0.1;
	//float specular = pow(max(dot(reflectionDirection, eyeDirection), 0.0), 20.0);
	fragColor = vec4(ambient * baseColor.rgb, baseColor.a);
}`;


//NECESSARY VARS
var frust = mat4.create();
mat4.perspective(frust, Math.PI/2, 4/3, .1, null);
var cont = 0;

var mouseX, mouseY;






utils.addTimerElement();

var canvas = document.getElementById("view");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


var app = PicoGL.createApp(canvas)
.clearColor(0.0, 0.0, 0.0, 1.0)
.depthTest()
.cullBackfaces();


var timer = app.createTimer();


var pickColorTarget = app.createTexture2D(app.width, app.height);
var pickDepthTarget = app.createRenderbuffer(app.width, app.height, PicoGL.DEPTH_COMPONENT16);
var pickingBuffer = app.createFramebuffer().colorTarget(0, pickColorTarget).depthTarget(pickDepthTarget);



// GEOMETRY
var box = utils.createBox({dimensions: [1.0, 1.0, 1.0]});

var positions = app.createVertexBuffer(PicoGL.FLOAT, 3, box.positions);
var uv = app.createVertexBuffer(PicoGL.FLOAT, 2, box.uvs);
var normals = app.createVertexBuffer(PicoGL.FLOAT, 3, box.normals);


var boxArray = app.createVertexArray()
.vertexAttributeBuffer(0, positions)
.vertexAttributeBuffer(1, normals);
//.vertexAttributeBuffer(2, uv);

var cut = false;


var shell_verts, shell_norms;

objects["shell"] = readOBJFile("./models/sphereshell.obj", 4, 0)
objects["cat"] = readOBJFile("./models/gitcat.obj", 2, 0)


var shelldata = objects["shell"].getDrawingInfo()

var shell_positions = app.createVertexBuffer(PicoGL.FLOAT, 3, shelldata.vertices);
var shell_normals = app.createVertexBuffer(PicoGL.FLOAT, 3, shelldata.normals);

var shellArray = app.createVertexArray()
.vertexAttributeBuffer(0, shell_positions)
.vertexAttributeBuffer(1, shell_normals)



var catdata = objects["cat"].getDrawingInfo()

var cat_positions = app.createVertexBuffer(PicoGL.FLOAT, 3, catdata.vertices);
var cat_normals = app.createVertexBuffer(PicoGL.FLOAT, 3, catdata.normals);

var catArray = app.createVertexArray()
.vertexAttributeBuffer(0, cat_positions)
.vertexAttributeBuffer(1, cat_normals)






var lightPosition = vec3.fromValues(1, 1, 0.5);  
var highlightColor = vec3.fromValues(1.5, 1.5, 0.5);
var unhighlightColor = vec3.fromValues(1.0, 1.0, 1.0);



// UNIFORM BUFFERS
var sceneUniforms = app.createUniformBuffer([
    PicoGL.FLOAT_VEC4,
    PicoGL.FLOAT_VEC4
]).set(0, lightPosition)
.set(1, player.eyePt)
.update();



var clickData = app.createUniformBuffer([

	PicoGL.FLOAT,//clicktime
	PicoGL.FLOAT_VEC3 //clickpos
]).set(0, 0.0)
.set(1, vec3.create())
.update()



var shellFrameUniforms = app.createUniformBuffer([

	PicoGL.FLOAT_MAT4, //viewmat
	PicoGL.FLOAT_MAT4, //frustmat
	PicoGL.FLOAT //timevar

]).set(0, player.getView())
.set(1, frust)
.set(2, 0.0)
.update()




window.onresize = function() {

    //app.resize(window.innerWidth, window.innerHeight);
    //pickingBuffer.resize();
    //mat4.perspective(frustmat, Math.PI / 2, app.width / app.height, 0.1, null);
    //mat4.multiply(viewProjMatrix, frustmat, viewMatrix);
};



// OBJECT DESCRIPTIONS
var boxData = 
{
    translate: [0, 0, 0],
    rotate: [0, 0, 0],
    scale: [1, 1, 1],
    mvpMatrix: mat4.create(),
    modelMatrix: mat4.create(),
    pickColor: vec3.fromValues(1.0, 0.0, 0.0),
    frameUniforms: app.createUniformBuffer([
        PicoGL.FLOAT_MAT4,	//viewmat
        PicoGL.FLOAT_MAT4,	//modelmat
        PicoGL.FLOAT_VEC4	//highlight color
    ]).set(2, unhighlightColor),
    mainDrawCall: null,
    pickingDrawCall: null
};





var pickingProgram = app.createProgram(picking_vs, picking_fs);
var mainProgram = app.createProgram(main_vs, main_fs);
var rippleProgram = app.createProgram(simpler_ripple_vs, ripple_fs);


boxData.pickingDrawCall = app.createDrawCall(pickingProgram, boxArray)
.uniform("uPickColor", boxData.pickColor);


boxData.mainDrawCall = app.createDrawCall(mainProgram, boxArray)
.uniformBlock("FrameUniforms", boxData.frameUniforms)
.uniformBlock("ClickData", clickData)
//.uniformBlock("SceneUniforms", sceneUniforms)



var catCall = app.createDrawCall(mainProgram, catArray)
.uniformBlock("FrameUniforms", boxData.frameUniforms)
.uniformBlock("ClickData", clickData)
//.uniformBlock("SceneUniforms", sceneUniforms)




var rippleDrawCall = app.createDrawCall(rippleProgram, shellArray)
.uniformBlock("ClickData", clickData)
.uniformBlock("FrameUniforms", shellFrameUniforms)

setTimeout(function(){
    //do what you need here
}, 1000);

boxData.mainDrawCall.uniform("frustmat", frust);
catCall.uniform("frustmat", frust);


var picked = false;
var pickedColor = new Uint8Array(4);



var playerView;


function updateWorld() {

	if (cont == 0){
    	return;
	}

	if (keyMap.get(65)){
    	console.log("to the left...");
    	player.move(0.1,0.0,0.0);
	}

	if (keyMap.get(68)){
    	player.move(-0.1,0.0,0.0);
	}


	if (!mouseRead){

    	player.rotate(player.left, deltamY/100);
    	player.rotate(g_up, -deltamX/100);

    	mouseRead = true;
	}


	playerView = player.getView()


    if (timer.ready()) {
        utils.updateTimerElement(timer.cpuTime, timer.gpuTime);
    }

    timer.start();


    boxData.rotate[1] += 0.02;

    utils.xformMatrix(boxData.modelMatrix, boxData.translate, boxData.rotate, boxData.scale);
    
    boxData.pickingDrawCall.uniform("viewmat", playerView);
    boxData.pickingDrawCall.uniform("frustmat", frust);
    boxData.pickingDrawCall.uniform("modelmat", boxData.modelMatrix);

    boxData.frameUniforms.set(0, playerView)
    .set(1, boxData.modelMatrix)
    .set(2, vec4.fromValues(1.0,0.0,1.0,1.0))
    .update();


    if (picked) {

        // DRAW TO PICKING BUFFER
        app.drawFramebuffer(pickingBuffer).clear();

        boxData.pickingDrawCall.draw();
        
        app.defaultDrawFramebuffer()
        .readFramebuffer(pickingBuffer)
        .readPixel(mouseX, canvas.height - mouseY, pickedColor);
        
        app.clear();

        if (pickedColor[0] === 255) {

        	console.log("clicked box...")
            //window.open('./thegoods/resume_ws.pdf');
        	window.open("https://github.com/WHSnyder");
        }
        else {
        	//ripple
        }
        
        picked = false;
    }

    boxData.frameUniforms.update();


    // MAIN DRAW
    var time = performance.now()/1000;
    
    
    shellFrameUniforms.set(0, playerView)
    .set(1, frust)
    .set(2, time)
    .update()

    //boxData.mainDrawCall.uniform("timevar", time);
    //boxData.mainDrawCall.draw();

    catCall.uniform("timevar", time);
    catCall.draw();


    //WHEN YOU GET THE CHANCE, ASK HIM IF HE ACTUALLY REORDERS GPU COMMANDS...
    rippleDrawCall.primitive(rippleDrawCall.gl.TRIANGLES).draw();

    //shellFrameUniforms.set(0, -1.0).update()
    //rippleDrawCall.primitive(rippleDrawCall.gl.LINES).draw();


    timer.end();
    requestAnimationFrame(updateWorld);
}