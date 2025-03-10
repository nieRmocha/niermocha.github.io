// Global constants
const canvas = document.getElementById('glCanvas'); // Get the canvas element 
const gl = canvas.getContext('webgl2'); // Get the WebGL2 context

if (!gl) {
    console.error('WebGL 2 is not supported by your browser.');
}

// Set canvas size: 현재 window 전체를 canvas로 사용
canvas.width = 500;
canvas.height = 500;

// Initialize WebGL settings: viewport and clear color
gl.viewport(0, 0, canvas.width, canvas.height);

// Start rendering
render();

// Render loop
function render() {
    gl.enable(gl.SCISSOR_TEST);

    //Left bottom
    gl.scissor(0, 0, canvas.width/2, canvas.height/2);
    gl.clearColor(0, 0.4, 0.7, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Left top
    gl.scissor(0, canvas.height/2, canvas.width/2, canvas.height/2);
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Right bottom
    gl.scissor(canvas.width/2, 0, canvas.width/2, canvas.height/2);
    gl.clearColor(1, 1, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //Right top
    gl.scissor(canvas.width/2, canvas.height/2, canvas.width/2, canvas.height/2);
    gl.clearColor(0, 0.65, 0.3, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);


    gl.disable(gl.SCISSOR_TEST);

}

// Resize viewport when window size changes
window.addEventListener('resize', () => {
    shorterLength = 500;
    if (window.innerWidth > window.innerHeight) {
        shorterLength = window.innerHeight;
    } else {
        shorterLength = window.innerWidth;
    }
    canvas.width = shorterLength;
    canvas.height = shorterLength;
    gl.viewport(0, 0, canvas.width, canvas.height);
    render();   
});

