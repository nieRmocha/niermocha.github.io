import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';
import { Cube } from '../util/cube.js';
import { Arcball } from '../util/arcball.js';
import { Cylinder } from '../util/cylinder.js';
import { loadTexture } from '../util/texture.js';

const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let textOverlay2;
let textOverlay3;
let isInitialized = false;

let viewMatrix = mat4.create();
let projMatrix = mat4.create();
let modelMatrix = mat4.create();
let arcBallMode = 'CAMERA';
let toonLevel = 3;

const cylinder = new Cylinder(gl, 32);
const axes = new Axes(gl, 1.5);
const texture = loadTexture(gl, true, '../images/textures/sunrise.jpg');

const cameraPos = vec3.fromValues(0, 0, 3);
const lightDirection = vec3.fromValues(1.0, 0.25, 0.5);
vec3.normalize(lightDirection, lightDirection);
const shininess = 32.0;

const arcball = new Arcball(canvas, 5.0, { rotation: 2.0, zoom: 0.0005 });

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        return;
    }
    main().then(success => {
        if (!success) return;
        isInitialized = true;
    }).catch(error => {
        console.error('program terminated with error:', error);
    });
});

function setupKeyboardEvents() {
    document.addEventListener('keydown', (event) => {
        if (event.key == 'a') {
            arcBallMode = (arcBallMode == 'CAMERA') ? 'MODEL' : 'CAMERA';
            updateText(textOverlay2, "arcball mode: " + arcBallMode);
        }
        else if (event.key == 'r') {
            arcball.reset();
            modelMatrix = mat4.create();
            arcBallMode = 'CAMERA';
            updateText(textOverlay2, "arcball mode: " + arcBallMode);
        }
        else if (['1','2','3','4','5'].includes(event.key)) {
            toonLevel = parseInt(event.key);
            shader.use();
            shader.setInt("u_toonLevel", toonLevel);
            updateText(textOverlay3, "toon levels: " + toonLevel);
            render();
        }
    });
}

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 0.9, 1.0);
    return true;
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

function render() {
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    if (arcBallMode == 'CAMERA') {
        viewMatrix = arcball.getViewMatrix();
    }
    else {
        modelMatrix = arcball.getModelRotMatrix();
        viewMatrix = arcball.getViewCamDistanceMatrix();
    }

    shader.use();
    shader.setMat4('u_model', modelMatrix);
    shader.setMat4('u_view', viewMatrix);
    shader.setVec3('u_viewPos', cameraPos);
    shader.setInt("u_toonLevel", toonLevel);

    cylinder.draw(shader);
    axes.draw(viewMatrix, projMatrix);
    requestAnimationFrame(render);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL initialization failed');
        }

        mat4.translate(viewMatrix, viewMatrix, cameraPos);
        mat4.perspective(
            projMatrix,
            glMatrix.toRadian(60),
            canvas.width / canvas.height,
            0.1,
            100.0
        );

        shader = await initShader();
        cylinder.copyVertexNormalsToNormals();
        cylinder.updateNormals();

        shader.use();
        shader.setMat4("u_projection", projMatrix);
        shader.setVec3("light.direction", lightDirection);
        shader.setVec3("light.ambient", vec3.fromValues(0.2, 0.2, 0.2));
        shader.setVec3("light.diffuse", vec3.fromValues(0.7, 0.7, 0.7));
        shader.setVec3("light.specular", vec3.fromValues(1.0, 1.0, 1.0));
        shader.setVec3("material.diffuse", vec3.fromValues(1.0, 0.5, 0.31));
        shader.setVec3("material.specular", vec3.fromValues(0.5, 0.5, 0.5));
        shader.setFloat("material.shininess", 16);
        shader.setVec3("u_viewPos", cameraPos);
        shader.setInt("u_toonLevel", toonLevel);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);

        setupText(canvas, "TOON SHADING", 1);
        textOverlay2 = setupText(canvas, "arcball mode: " + arcBallMode, 2);
        textOverlay3 = setupText(canvas, "toon levels: " + toonLevel, 3);
        setupText(canvas, "press a/r to change/reset arcball mode", 4);
        setupText(canvas, "press 1 – 5 to change toon shading levels", 5);

        setupKeyboardEvents();
        requestAnimationFrame(render);

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('Failed to initialize program');
        return false;
    }
}
