/*
FULL CREDITS TO TAREK SHARIF @https://github.com/tsherif/picogl.js/
FOR THIS WONDERFUL LIBRARY AND CLOTH SIMULATION.

All code here except the cutting additions was written by him and I only added
minor changes to the .
*/


var quad_vs = 
`#version 300 es  

layout(location=0) in vec4 aPosition;

out vec2 vScreenUV;

void main() {

    vScreenUV = aPosition.xy * 0.5 + 0.5;
    gl_Position = aPosition;
}`;



var update_force_fs = 
`#version 300 es   

precision highp float;

#define GRAVITY vec3(0.0, -0.00005, 0.0)
#define WIND vec3(0.0, 0.0, 0.0000)
#define DAMPING 0.99

in vec2 vScreenUV;

uniform sampler2D uPositionBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uOldPositionBuffer;

layout(location=0) out vec3 outPosition;
layout(location=1) out vec3 outOldPosition;



void main() {

    ivec2 dimensions = textureSize(uPositionBuffer, 0);
    ivec2 maxTexelCoord = dimensions - 1;

    ivec2 texelCoord = ivec2(vScreenUV * vec2(dimensions));
    
    vec3 position = texelFetch(uPositionBuffer, texelCoord, 0).xyz;
    vec3 normal = texelFetch(uNormalBuffer, texelCoord, 0).xyz;
    vec3 oldPosition = texelFetch(uOldPositionBuffer, texelCoord, 0).xyz;

    vec3 temp = position;

    
    if (texelCoord != ivec2(0, 0) && 
        texelCoord != ivec2(maxTexelCoord.x, 0) &&
        texelCoord != ivec2(0, maxTexelCoord.y) && 
        texelCoord != ivec2(maxTexelCoord.x, maxTexelCoord.y)) {
        
        position += (position - oldPosition) * DAMPING + GRAVITY;
        float wDotN = dot(WIND, normal);
        position += abs(wDotN) * sign(wDotN) * normal;
    }

    outPosition = position;
    outOldPosition = temp;
}`;


    
var update_constraint_fs =
`#version 300 es

precision highp float;

in vec2 vScreenUV;

// uModVal and dir used to select the direction
// to look for the neighbour we're going to check

uniform sampler2D uPositionBuffer;
uniform sampler2D uCutBuffer;

layout(std140) uniform ConstraintUniforms {

    ivec2 uDir;
    int uModVal;
    float uRestDistance;   
};

out vec3 outPosition;



void main() {
    
    //get position of particle---------------
    
    ivec2 dimensions = textureSize(uPositionBuffer, 0);
    ivec2 texelCoord = ivec2(vScreenUV * vec2(dimensions));
    vec3 position = texelFetch(uPositionBuffer, texelCoord, 0).xyz;
    ivec2 maxTexelCoord = dimensions - 1;

    //---------------------------------------


    int iDot = abs(texelCoord.x * uDir.x) + abs(texelCoord.y * uDir.y);

    int neg = iDot % 2 == uModVal ? 1 : -1;
    
    bool otherPin = false;

    if (texelCoord != ivec2(0, 0) && 
        texelCoord != ivec2(dimensions.x - 1, 0) &&
        texelCoord != ivec2(0, maxTexelCoord.y) && 
        texelCoord != ivec2(maxTexelCoord.x, maxTexelCoord.y)) {
        
        ivec2 otherCoord = texelCoord + uDir * neg;
        
        if (otherCoord == ivec2(0, 0) || otherCoord == ivec2(dimensions.x - 1, 0)) {
            
            otherPin = true;
        }

        vec3 cut = texelFetch(uCutBuffer, otherCoord, 0).xyz;
        
        
        if (all(greaterThanEqual(otherCoord, ivec2(0, 0))) && all(lessThan(otherCoord, dimensions))
            && cut.x != 1.0){// && uModVal == 0 && uDir == ivec2(0,1))) {
            
            vec3 otherPosition = texelFetch(uPositionBuffer, otherCoord, 0).xyz;
            
            vec3 diffVec = otherPosition - position;
            float dist = length(diffVec);
            
            if (dist > uRestDistance) {
                position += diffVec * (1.0 - uRestDistance / (dist)) * (otherPin ? 1.0 : 0.5);
            }
        }
    }
    outPosition = position;
}`;




var update_normal_fs =
`#version 300 es

precision highp float;
in vec2 vScreenUV;

uniform sampler2D uPositionBuffer;
out vec3 outNormal;

void main() {
    
    ivec2 dimensions = textureSize(uPositionBuffer, 0);
    ivec2 texelCoord = ivec2(vScreenUV * vec2(dimensions));

    vec3 position = texelFetch(uPositionBuffer, texelCoord, 0).xyz;
    vec3 normal = vec3(0.0);
    
    if (texelCoord.x > 0) {
        
        vec3 left = texelFetch(uPositionBuffer, texelCoord - ivec2(1, 0), 0).xyz;
        
        if (texelCoord.y > 0) {
            
            vec3 down = texelFetch(uPositionBuffer, texelCoord - ivec2(0, 1), 0).xyz;
            normal += normalize(cross(left - position, down - position));
        }
        
        if (texelCoord.y < dimensions.y - 1) {
            
            vec3 up = texelFetch(uPositionBuffer, texelCoord + ivec2(0, 1), 0).xyz;
            normal += normalize(cross(up - position, left - position));
        }
    }
    
    if (texelCoord.x < dimensions.x - 1) {
        
        vec3 right = texelFetch(uPositionBuffer, texelCoord + ivec2(1, 0), 0).xyz;
        
        if (texelCoord.y > 0) {
            
            vec3 down = texelFetch(uPositionBuffer, texelCoord - ivec2(0, 1), 0).xyz;
            normal += normalize(cross(down - position, right - position));
        }
        
        if (texelCoord.y < dimensions.y - 1) {
            
            vec3 up = texelFetch(uPositionBuffer, texelCoord + ivec2(0, 1), 0).xyz;
            normal += normalize(cross(right - position, up - position));
        }
    }
    
    outNormal = normalize(normal);
}`;



var update_cut_fs = 
`#version 300 es   

precision highp float;

in vec2 vScreenUV;

layout(std140, column_major) uniform SceneUniforms {
    mat4 viewProj;
    vec4 lightPosition;
};

uniform sampler2D uPositionBuffer;

uniform vec2 cutStart;
uniform vec2 cutEnd;

layout(location=0) out vec3 mark;

void main() {
    
    ivec2 dimensions = textureSize(uPositionBuffer, 0);
    ivec2 maxTexelCoord = dimensions - 1;
    ivec2 texelCoord = ivec2(vScreenUV * vec2(dimensions));
    
    vec3 position = texelFetch(uPositionBuffer, texelCoord, 0).xyz;
    vec4 viewPos = (viewProj * vec4(position, 1.0));
    vec2 screenPos = viewPos.xy/viewPos.w;

    vec2 cutVector = cutEnd - cutStart;
    vec2 screenVector = screenPos - cutStart;

    vec2 rej = screenVector - cutVector * dot(cutVector, screenVector)/dot(cutVector, cutVector);

    if (length(rej) < .01 && length(screenVector) < length(cutVector) ){// && (dot(cutVector, screenVector)/(length(cutVector) * length(screenVector))) > .95){
        mark = vec3(1.0,0.0,0.0);
    }
    else {
        discard;
    }
}`;

   


var cloth_vs = 
`#version 300 es   

layout(location=0) in ivec2 aTexelCoord;
layout(location=1) in vec2 aUV;

uniform sampler2D uPositionBuffer;
uniform sampler2D uNormalBuffer;
uniform sampler2D uCutBuffer;

layout(std140, column_major) uniform SceneUniforms {
    mat4 viewProj;
    vec4 lightPosition;
};

out vec3 vPosition;
out vec2 vUV;
out vec3 vNormal;
out float cut;


void main() {

    vec3 position = texelFetch(uPositionBuffer, aTexelCoord, 0).xyz;
    vec3 cutStatus = texelFetch(uCutBuffer, aTexelCoord, 0).xyz;
    
    ivec2 dimensions = textureSize(uPositionBuffer, 0);

    cut = 1.0;

    if (cutStatus.x == 1.0){
        cut = -5000.0;
    }

    vPosition = position;

    vNormal = texelFetch(uNormalBuffer, aTexelCoord, 0).xyz;
    vUV = aUV;

    gl_Position = viewProj * vec4(position, 1.0);
}`;    



var phong_fs =
`#version 300 es

precision highp float;

layout(std140, column_major) uniform SceneUniforms {
    mat4 viewProj;
    vec4 lightPosition;
};

uniform sampler2D uDiffuse;

in vec3 vPosition;
in vec2 vUV;
in vec3 vNormal;
in float cut;

out vec4 fragColor;

void main() {

    if (cut < 1.0) {
        discard;
    }
    else {
        vec3 color = texture(uDiffuse, vUV).rgb;
        vec3 normal = normalize(vNormal);
        vec3 lightVec = -normalize(vPosition - lightPosition.xyz);
    
        float diffuse = abs(dot(lightVec, normal));
        float ambient = 0.1;
    
        fragColor = vec4(color * (diffuse + ambient), 1.0);
    }
}`;

var mouseData = [null,null];
var reset = true;

var cont = 1;
var mode = 1;    


utils.addTimerElement();

if (!testExtension("EXT_color_buffer_float")) {
    document.body.innerHTML = "This example requires extension <b>EXT_color_buffer_float</b> which is not supported on this system."
}

let canvas = document.getElementById("view");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


var rect = canvas.getBoundingClientRect();
console.log(rect)

let app = PicoGL.createApp(canvas)
.clearColor(0.0, 0.0, 0.0, 1.0)
.depthTest();

let timer = app.createTimer();

const CONSTRAINT_ITERATIONS = 20;
const DATA_TEXTURE_DIM = 60;
const NUM_PARTICLES = DATA_TEXTURE_DIM * DATA_TEXTURE_DIM;
const STRUCTURAL_REST = 1 / DATA_TEXTURE_DIM;
const SHEAR_REST = Math.sqrt(2 * STRUCTURAL_REST * STRUCTURAL_REST);
const BALL_RADIUS = 0.15;
const BALL_RANGE = 0.9;

///////////////////
// PROGRAMS
///////////////////

// Generic quad vertex shader
let quadShader = app.createShader(PicoGL.VERTEX_SHADER, quad_vs);
let constraintShader = app.createShader(PicoGL.FRAGMENT_SHADER, update_constraint_fs);
let normalShader = app.createShader(PicoGL.FRAGMENT_SHADER, update_normal_fs);
let forceShader = app.createShader(PicoGL.FRAGMENT_SHADER, update_force_fs);
let cutShader = app.createShader(PicoGL.FRAGMENT_SHADER, update_cut_fs);

// Generic phong shader used for drawing
let phongShader = app.createShader(PicoGL.FRAGMENT_SHADER, phong_fs);



////////////////////
// FRAME BUFFERS
////////////////////
// Store results of force update
let forceTarget1 = app.createTexture2D(DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, { 
    internalFormat: PicoGL.RGBA32F
});

let forceTarget2 = app.createTexture2D(DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, { 
    internalFormat: PicoGL.RGBA32F
});

let updateForceFramebuffer = app.createFramebuffer(DATA_TEXTURE_DIM, DATA_TEXTURE_DIM)
.colorTarget(0, forceTarget1)
.colorTarget(1, forceTarget2);

// Results of constraint satisfaction passes
let updateTarget = app.createTexture2D(DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, { 
    internalFormat: PicoGL.RGBA32F
});

let updateFramebuffer = app.createFramebuffer(DATA_TEXTURE_DIM, DATA_TEXTURE_DIM)
.colorTarget(0, updateTarget);


//Cut update framebuffers
let cutTarget = app.createTexture2D(DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, { 
    internalFormat: PicoGL.RGBA32F
});

let cutFramebuffer = app.createFramebuffer(DATA_TEXTURE_DIM, DATA_TEXTURE_DIM)
.colorTarget(0, cutTarget);


///////////////////////////
// CLOTH GEOMETRY DATA
///////////////////////////
let clothPositionData = new Float32Array(NUM_PARTICLES * 4);
let cutDefaultData = new Float32Array(NUM_PARTICLES * 4);
let clothNormalData = new Float32Array(NUM_PARTICLES * 4);
let uvData = new Float32Array(NUM_PARTICLES * 2);
let dataTextureIndex = new Int16Array(NUM_PARTICLES * 2);
let indexData = new Uint16Array((DATA_TEXTURE_DIM - 1) * (DATA_TEXTURE_DIM - 1) * 6);
let indexI = 0;

for (let i = 0; i < NUM_PARTICLES; ++i) {
    
    let vec4i = i * 4;
    let vec2i = i * 2;

    let x = (i % DATA_TEXTURE_DIM);
    let y = Math.floor(i / DATA_TEXTURE_DIM);

    let u = x / DATA_TEXTURE_DIM;
    let v = y / DATA_TEXTURE_DIM;
    
    clothPositionData[vec4i] = u - 0.5;
    clothPositionData[vec4i + 1] = v + 0.8;

    clothNormalData[vec4i + 2] = 1;

    cutDefaultData[vec4i] = 0.0;
    cutDefaultData[vec4i+1] = 0.0;
    cutDefaultData[vec4i+2] = 0.0;
    cutDefaultData[vec4i+3] = 0.0;


    //UV data, obvious
    uvData[vec2i] = u;
    uvData[vec2i + 1] = v;

    dataTextureIndex[vec2i] = (i % DATA_TEXTURE_DIM);
    dataTextureIndex[vec2i + 1] = Math.floor(i / DATA_TEXTURE_DIM);
    

    if (x < DATA_TEXTURE_DIM - 1 && y < DATA_TEXTURE_DIM - 1) {
        indexData[indexI]     = i;
        indexData[indexI + 1] = i + DATA_TEXTURE_DIM;
        indexData[indexI + 2] = i + DATA_TEXTURE_DIM + 1;
        indexData[indexI + 3] = i;
        indexData[indexI + 4] = i + DATA_TEXTURE_DIM + 1;
        indexData[indexI + 5] = i + 1;
        indexI += 6;
    }
}


///////////////////////////
// SIM DATA TEXTURES
///////////////////////////
let positionTextureA = app.createTexture2D(clothPositionData, DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, {
    internalFormat: PicoGL.RGBA32F,
    minFilter: PicoGL.NEAREST,
    magFilter: PicoGL.NEAREST,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE
});

let oldPositionTextureA = app.createTexture2D(clothPositionData, DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, {
    internalFormat: PicoGL.RGBA32F,
    minFilter: PicoGL.NEAREST,
    magFilter: PicoGL.NEAREST,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE
});

let positionTextureB = updateForceFramebuffer.colorAttachments[0];
let oldPositionTextureB = updateForceFramebuffer.colorAttachments[1];

let normalTexture = app.createTexture2D(clothNormalData, DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, {
    internalFormat: PicoGL.RGBA32F,
    minFilter: PicoGL.NEAREST,
    magFilter: PicoGL.NEAREST,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE
});


let cutTexture = app.createTexture2D(cutDefaultData, DATA_TEXTURE_DIM, DATA_TEXTURE_DIM, {
    internalFormat: PicoGL.RGBA32F,
    minFilter: PicoGL.NEAREST,
    magFilter: PicoGL.NEAREST,
    wrapS: PicoGL.CLAMP_TO_EDGE,
    wrapT: PicoGL.CLAMP_TO_EDGE
});



/////////////////////////
// GEOMETRY FOR DRAWING
/////////////////////////

// Quad for simulation passes
let quadPositions = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([
    -1, 1,
    -1, -1,
    1, -1,
    -1, 1,
    1, -1,
    1, 1,
]));


let quadArray = app.createVertexArray()
.vertexAttributeBuffer(0, quadPositions);


// Cloth geometry for drawing
let dataIndex = app.createVertexBuffer(PicoGL.SHORT, 2, dataTextureIndex);
let uv = app.createVertexBuffer(PicoGL.FLOAT, 2, uvData);
let indices = app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, indexData);

let clothArray = app.createVertexArray()
.vertexAttributeBuffer(0, dataIndex)
.vertexAttributeBuffer(1, uv)
.indexBuffer(indices);



////////////////
// UNIFORMS
////////////////
// Constraint uniforms
let updateHorizontal1Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([1, 0]))
.set(1, 0)
.set(2, STRUCTURAL_REST)
.update();

let updateHorizontal2Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([1, 0]))
.set(1, 1)
.set(2, STRUCTURAL_REST)
.update();

let updateVertical1Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([0, 1]))
.set(1, 0)
.set(2, STRUCTURAL_REST)
.update();

let updateVertical2Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([0, 1]))
.set(1, 1)
.set(2, STRUCTURAL_REST)
.update();

let updateShear1Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([1, 1]))
.set(1, 0)
.set(2, SHEAR_REST)
.update();

let updateShear2Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([1, 1]))
.set(1, 1)
.set(2, SHEAR_REST)
.update();

let updateShear3Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([1, -1]))
.set(1, 0)
.set(2, SHEAR_REST)
.update();

let updateShear4Uniforms = app.createUniformBuffer([
    PicoGL.INT_VEC2,
    PicoGL.INT,
    PicoGL.FLOAT
])
.set(0, new Int32Array([1, -1]))
.set(1, 1)
.set(2, SHEAR_REST)
.update();


var projMatrix = mat4.create();
mat4.perspective(projMatrix, Math.PI / 2, canvas.width / canvas.height, 0.9, 2.5);

var viewMatrix = mat4.create();

let eyePosition = vec3.fromValues(0.0, 0.0, 1.2);
mat4.lookAt(viewMatrix, eyePosition, vec3.fromValues(0, 1.0, 0), vec3.fromValues(0, 1, 0));

var viewProjMatrix = mat4.create();
mat4.multiply(viewProjMatrix, projMatrix, viewMatrix);

let lightPosition = vec3.fromValues(1, 1, 1);


var sceneUniformBuffer = app.createUniformBuffer([
    PicoGL.FLOAT_MAT4,
    PicoGL.FLOAT_VEC4
])
.set(0, viewProjMatrix)
.set(1, lightPosition)
.update();


let targetZ = null;
let targetY = null;


var updateWorld = function(){};

Promise.all([

    app.createPrograms(
        [quadShader, update_force_fs],
        [quadShader, update_constraint_fs],
        [quadShader, update_normal_fs],
        [quadShader, update_cut_fs],
        [cloth_vs, phongShader]
    ),

    utils.loadImages(["./models/dune.jpg"])

]).then(([

    [updateForceProgram, updateConstraintProgram, updateNormalProgram, cutProgram, clothProgram],
    [image]

]) => {

    let texture = app.createTexture2D(image, { 
        maxAnisotropy: PicoGL.WEBGL_INFO.MAX_TEXTURE_ANISOTROPY 
    });

    
    ///////////////
    // DRAW CALLS
    ///////////////

    // Update forces
    let updateForceDrawCall = app.createDrawCall(updateForceProgram, quadArray)
    .texture("uPositionBuffer", positionTextureA)
    .texture("uNormalBuffer", normalTexture);

    // Structural constraints
    let updateHorizontal1DrawCall = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateHorizontal1Uniforms)
    .texture("uCutBuffer", cutTexture);

    let updateHorizontal2DrawCall  = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateHorizontal2Uniforms)
    .texture("uCutBuffer", cutTexture);
    
    let updateVertical1DrawCall = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateVertical1Uniforms)
    .texture("uCutBuffer", cutTexture);

    let updateVertical2DrawCall = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateVertical2Uniforms)
    .texture("uCutBuffer", cutTexture);


    // Shear constraints
    let updateShear1DrawCall = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateShear1Uniforms)
    .texture("uCutBuffer", cutTexture);
    
    let updateShear2DrawCall = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateShear2Uniforms)
    .texture("uCutBuffer", cutTexture);
    
    let updateShear3DrawCall = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateShear3Uniforms)
    .texture("uCutBuffer", cutTexture);
    
    let updateShear4DrawCall = app.createDrawCall(updateConstraintProgram, quadArray)
    .uniformBlock("ConstraintUniforms", updateShear4Uniforms)
    .texture("uCutBuffer", cutTexture);
    
    
    let updateNormalDrawCall = app.createDrawCall(updateNormalProgram, quadArray);
    

    let clothDrawCall = app.createDrawCall(clothProgram, clothArray)
    .uniformBlock("SceneUniforms", sceneUniformBuffer)
    .texture("uDiffuse", texture)
    .texture("uNormalBuffer", normalTexture);


    let cutDrawCall = app.createDrawCall(cutProgram, quadArray)
    .uniformBlock("SceneUniforms", sceneUniformBuffer)
    //.uniformBlock("WindowUniforms", windowUniforms)

  


    /////////
    // DRAW
    /////////
    updateWorld = function() {
        
        if (cont == 0){
            return;
        }

        if (timer.ready()) {
            utils.updateTimerElement(timer.cpuTime, timer.gpuTime);
        }
        
        timer.start();

        updateForceDrawCall.texture("uPositionBuffer", positionTextureA);
        updateForceDrawCall.texture("uOldPositionBuffer", oldPositionTextureA);
        
        updateForceFramebuffer.colorTarget(0, positionTextureB);
        updateForceFramebuffer.colorTarget(1, oldPositionTextureB);
        
        app.viewport(0, 0, DATA_TEXTURE_DIM, DATA_TEXTURE_DIM);
        app.drawFramebuffer(updateForceFramebuffer);
        
        updateForceDrawCall.draw();

        
        for (let i = 0; i < 10; ++i) {
            
            app.drawFramebuffer(updateFramebuffer);
            
            updateFramebuffer.colorTarget(0, positionTextureA);
            updateHorizontal1DrawCall.texture("uPositionBuffer", positionTextureB)
            //.texture("uCutBuffer", cutTexture)
            .draw();
            
            updateFramebuffer.colorTarget(0, positionTextureB);
            updateHorizontal2DrawCall.texture("uPositionBuffer", positionTextureA)
            //.texture("uCutBuffer", cutTexture)
            .draw();
            
            updateFramebuffer.colorTarget(0, positionTextureA);
            updateVertical1DrawCall.texture("uPositionBuffer", positionTextureB)
            //.texture("uCutBuffer", cutTexture)
            .draw();
            
            updateFramebuffer.colorTarget(0, positionTextureB);
            updateVertical2DrawCall.texture("uPositionBuffer", positionTextureA)
            //.texture("uCutBuffer", cutTexture)
            .draw();
            
            updateFramebuffer.colorTarget(0, positionTextureA);
            updateShear1DrawCall.texture("uPositionBuffer", positionTextureB)
            //.texture("uCutBuffer", cutTexture)
            .draw();
            
            updateFramebuffer.colorTarget(0, positionTextureB);
            updateShear2DrawCall.texture("uPositionBuffer", positionTextureA)
            //.texture("uCutBuffer", cutTexture)
            .draw();    
            
            updateFramebuffer.colorTarget(0, positionTextureA);
            updateShear3DrawCall.texture("uPositionBuffer", positionTextureB)
            //.texture("uCutBuffer", cutTexture)
            .draw();
            
            updateFramebuffer.colorTarget(0, positionTextureB);
            updateShear4DrawCall.texture("uPositionBuffer", positionTextureA)
            //.texture("uCutBuffer", cutTexture)
            .draw();   
        }

        
       

        if (mouseData[0] != null){

            cutDrawCall.uniform("cutStart", mouseData[0]);
            cutDrawCall.uniform("cutEnd", mouseData[1]);
            cutDrawCall.texture("uPositionBuffer", positionTextureA);

            cutFramebuffer.colorTarget(0, cutTexture);

            console.log("yea here...")

            app.drawFramebuffer(cutFramebuffer);
            cutDrawCall.draw();

            mouseData[0] = null;
            reset = true;
        }



        updateFramebuffer.colorTarget(0, normalTexture);
        app.drawFramebuffer(updateFramebuffer);

        updateNormalDrawCall.texture("uPositionBuffer", positionTextureA).draw();
        
        clothDrawCall.texture("uPositionBuffer", positionTextureA)
        .texture("uCutBuffer", cutTexture)


        app.defaultViewport().defaultDrawFramebuffer().clear();
        
        clothDrawCall.draw();
        
        let temp = oldPositionTextureA;
        oldPositionTextureA = oldPositionTextureB;
        oldPositionTextureB = temp;
        
        timer.end();
        requestAnimationFrame(updateWorld);
    }
});