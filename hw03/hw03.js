
import { resizeAspectRatio, setupText, updateText, Axes } from '../util/util.js';
import { Shader, readShaderFile } from '../util/shader.js';

// Global variables
let isInitialized = false; // global variable로 event listener가 등록되었는지 확인
const canvas = document.getElementById('glCanvas');
const gl = canvas.getContext('webgl2');
let shader;
let vao;
let positionBuffer;
let isDrawing = false;
let startPoint = null;
let tempEndPoint = null;
let lines = [];
let textOverlay;
let textOverlay2;
let textOverlay3;
let axes = new Axes(gl, 0.85);
let r = 0;
let intersectionPoints = [];


// DOMContentLoaded event
// 1) 모든 HTML 문서가 완전히 load되고 parsing된 후 발생
// 2) 모든 resource (images, css, js 등) 가 완전히 load된 후 발생
// 3) 모든 DOM 요소가 생성된 후 발생
// DOM: Document Object Model로 HTML의 tree 구조로 표현되는 object model 
// 모든 code를 이 listener 안에 넣는 것은 mouse click event를 원활하게 처리하기 위해서임

// mouse 쓸 때 main call 방법
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) {
        console.log("Already initialized");
        return;
    }

    main().then(success => { // call main function
        if (!success) {
            console.log('프로그램을 종료합니다.');
            return;
        }
        isInitialized = true;
    }).catch(error => {
        console.error('프로그램 실행 중 오류 발생:', error);
    });
});

function initWebGL() {
    if (!gl) {
        console.error('WebGL 2 is not supported by your browser.');
        return false;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.8, 0.9, 1.0);
    
    return true;
}

function setupCanvas() {
    canvas.width = 700;
    canvas.height = 700;
    resizeAspectRatio(gl, canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.2, 0.3, 1.0);
}

function setupBuffers(shader) {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    shader.setAttribPointer('a_position', 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
}

// 좌표 변환 함수: 캔버스 좌표를 WebGL 좌표로 변환
// 캔버스 좌표: 캔버스 좌측 상단이 (0, 0), 우측 하단이 (canvas.width, canvas.height)
// WebGL 좌표 (NDC): 캔버스 좌측 상단이 (-1, 1), 우측 하단이 (1, -1)
function convertToWebGLCoordinates(x, y) {
    return [
        (x / canvas.width) * 2 - 1,
        -((y / canvas.height) * 2 - 1)
    ];
}

/* 
    browser window
    +----------------------------------------+
    | toolbar, address bar, etc.             |
    +----------------------------------------+
    | browser viewport (컨텐츠 표시 영역)       | 
    | +------------------------------------+ |
    | |                                    | |
    | |    canvas                          | |
    | |    +----------------+              | |
    | |    |                |              | |
    | |    |      *         |              | |
    | |    |                |              | |
    | |    +----------------+              | |
    | |                                    | |
    | +------------------------------------+ |
    +----------------------------------------+

    *: mouse click position

    event.clientX = browser viewport 왼쪽 경계에서 마우스 클릭 위치까지의 거리
    event.clientY = browser viewport 상단 경계에서 마우스 클릭 위치까지의 거리
    rect.left = browser viewport 왼쪽 경계에서 canvas 왼쪽 경계까지의 거리
    rect.top = browser viewport 상단 경계에서 canvas 상단 경계까지의 거리

    x = event.clientX - rect.left  // canvas 내에서의 클릭 x 좌표
    y = event.clientY - rect.top   // canvas 내에서의 클릭 y 좌표
*/

function setupMouseEvents() {
    function handleMouseDown(event) {

        // 입력 두 번만 받기
        if (lines.length >= 2) {
            return;
        }
    
        event.preventDefault(); // 존재할 수 있는 기본 동작을 방지
        event.stopPropagation(); // event가 상위 요소로 전파되지 않도록 방지

        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        if (!isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중이 아닌 경우
            // 캔버스 좌표를 WebGL 좌표로 변환하여 선분의 시작점을 설정
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            startPoint = [glX, glY];
            isDrawing = true; // 이제 mouse button을 놓을 때까지 계속 true로 둠. 
        }
    }

    function handleMouseMove(event) {
        if (isDrawing) { // 1번 또는 2번 선분을 그리고 있는 도중인 경우
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let [glX, glY] = convertToWebGLCoordinates(x, y);
            tempEndPoint = [glX, glY];
            render();
        }
    }

    function handleMouseUp() {
        if (isDrawing && tempEndPoint) {

            // lines.push([...startPoint, ...tempEndPoint])
            //   : startPoint와 tempEndPoint를 펼쳐서 하나의 array로 합친 후 lines에 추가
            // ex) lines = [] 이고 startPoint = [1, 2], tempEndPoint = [3, 4] 이면,
            //     lines = [[1, 2, 3, 4]] 이 됨
            // ex) lines = [[1, 2, 3, 4]] 이고 startPoint = [5, 6], tempEndPoint = [7, 8] 이면,
            //     lines = [[1, 2, 3, 4], [5, 6, 7, 8]] 이 됨

            lines.push([...startPoint, ...tempEndPoint]);

            if (lines.length === 1) {

                updateText(textOverlay, "Circle: center (" + lines[0][0].toFixed(2) + ", " + lines[0][1].toFixed(2) + 
                    ") radius = " + r.toFixed(2));
                updateText(textOverlay2, "Click and drag to draw the second line segment");
            }   
            else { // lines.length == 2 - interception 계산도 여기서
                intersectionPoints = calculateIntersection(startPoint, tempEndPoint);
                
                updateText(textOverlay2, "Second line segment: (" + lines[1][0].toFixed(2) + ", " + lines[1][1].toFixed(2) + 
                    ") ~ (" + lines[1][2].toFixed(2) + ", " + lines[1][3].toFixed(2) + ")");

                if (intersectionPoints.length === 0) {
                    updateText(textOverlay3, "No Intersection");
                    
                } else if (intersectionPoints.length === 1) {
                    updateText(textOverlay3, "Intersection Points: 1 Point 1: (" + intersectionPoints[0][0].toFixed(2) + ", " + 
                        intersectionPoints[0][1].toFixed(2) + ")");
                    
                } else {
                    updateText(textOverlay3, "Intersection Points: 2 Point 1: (" + intersectionPoints[0][0].toFixed(2) + ", " + 
                        intersectionPoints[0][1].toFixed(2) + ") Point 2: (" + intersectionPoints[1][0].toFixed(2) + ", " + 
                        intersectionPoints[1][1].toFixed(2) + ")");
                }
            }

            isDrawing = false;
            startPoint = null;
            tempEndPoint = null;
            render();
        }
    }

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
}

function calculateIntersection(start, end) {

    //선분의 시작점의 좌표값과, 끝점과의 좌표값 차이
    const x1 = start[0]; // b
    const y1 = start[1]; // d
    const xgap = end[0] - start[0]; // a
    const ygap = end[1] - start[1]; // c

    //원의 중심의 좌표값값
    const cx = lines[0][0]; // e
    const cy = lines[0][1]; // f

    // t에 대한 2차방정식의 계수와 상수수
    const quadEff = xgap ** 2 + ygap ** 2; // A
    const linearEff = 2 * (xgap * (x1 - cx) + ygap * (y1 - cy)); // B
    const cons = x1 ** 2 + y1 ** 2 + cx ** 2 + cy ** 2 - r ** 2 - 2*(x1 * cx + y1 * cy); // C

    // 판별식
    const discrim = linearEff ** 2 - 4 * quadEff * cons;
    
    if (discrim < 0) { //교점 없음
        return [];
        
    } else { //교점이 2개

        //근의 공식
        const t1 = (-linearEff + Math.sqrt(discrim)) / (2 * quadEff);
        const t2 = (-linearEff - Math.sqrt(discrim)) / (2 * quadEff);
        const points = [];
        
        // 각 t 값이 [0~1] 범위이면 선분과의 교점
        [t1, t2].forEach(t => {
            if (t >= 0 && t <= 1) {
                const ix = xgap * t + x1;
                const iy = ygap * t + y1;
                points.push([ix, iy]);
            }
        });
        return points;
    }
}

function drawCircle(start) { //start(x, y) 좌표를 받음
    const segments = 100;
    const circleVertices = [];

    for (let i = 0; i < segments; i++) {
        let theta = i * (2 * Math.PI / segments);
        let x = r * Math.cos(theta) + start[0];
        let y = r * Math.sin(theta) + start[1];
        circleVertices.push(x, y);
    }

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circleVertices), gl.STATIC_DRAW);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.LINE_LOOP, 0, segments);
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    shader.use();
    
    // 시도의 횟수 카운트
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 첫 시도에는 원 그리기
        if (i === 0) {
            shader.setVec4("u_color", [1.0, 0.0, 1.0, 1.0]);
            drawCircle([line[0], line[1]]);
        }

        // 두번째 시도에선 선 그리기
        if (i === 1) { 
            shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(line), gl.STATIC_DRAW);
            gl.bindVertexArray(vao);
            gl.drawArrays(gl.LINES, 0, 2);
        }
    }
    
    //임시 선 그리기
    if (isDrawing && startPoint && tempEndPoint) {
        shader.setVec4("u_color", [0.5, 0.5, 0.5, 1.0]);

        //첫번째 시도는 원
        if(lines.length === 0) {
            //원의 반지름도 이때 계산해서 전역변수로
           r = Math.sqrt(Math.pow(tempEndPoint[0] - startPoint[0], 2) + Math.pow((tempEndPoint[1] - startPoint[1]), 2));
           drawCircle(startPoint);
        }

        // 두번째 시도에선 임시선은 직선으로
        if(lines.length === 1) {
           gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([...startPoint, ...tempEndPoint]), gl.STATIC_DRAW);
           gl.bindVertexArray(vao);
           gl.drawArrays(gl.LINES, 0, 2);
        }
    }

    // 교점 존재시 교점 그리기
    if (intersectionPoints.length > 0) {

        // 교점 좌표를 1차원 배열로 펼치기
        let pointsArray = [];
        intersectionPoints.forEach(pt => {
            pointsArray.push(pt[0], pt[1]);
        });

        shader.setVec4("u_color", [1.0, 1.0, 0.0, 1.0]);

        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pointsArray), gl.STATIC_DRAW);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, intersectionPoints.length);
    }

    // axes 그리기
    axes.draw(mat4.create(), mat4.create());
}

async function initShader() {
    const vertexShaderSource = await readShaderFile('shVert.glsl');
    const fragmentShaderSource = await readShaderFile('shFrag.glsl');
    return new Shader(gl, vertexShaderSource, fragmentShaderSource);
}

async function main() {
    try {
        if (!initWebGL()) {
            throw new Error('WebGL 초기화 실패');
        }

        // 셰이더 초기화
        shader = await initShader();
        
        // 나머지 초기화
        setupCanvas();
        setupBuffers(shader);
        shader.use();

        // 텍스트 초기화
        textOverlay = setupText(canvas, "No line segment", 1);
        textOverlay2 = setupText(canvas, "Click mouse button and drag to draw line segments", 2);
        textOverlay3 = setupText(canvas, "", 3);
        
        // 마우스 이벤트 설정
        setupMouseEvents();

        // 초기 렌더링
        render();

        return true;
    } catch (error) {
        console.error('Failed to initialize program:', error);
        alert('프로그램 초기화에 실패했습니다.');
        return false;
    }
}
