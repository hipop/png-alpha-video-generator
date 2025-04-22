// 带有chromakey背景色的video
const video = document.getElementById('video');
// 目标画布
const canvas = document.getElementById('canvas');
// 获取chromakey颜色
const chromakeyColor = document.getElementById('colorPicker');
// 获取背景文字
const backText = document.getElementById('backText');
const playBtn = document.getElementById('playBtn');
const offscreenPlayBtn = document.getElementById('offscreenPlayBtn');

// WebGL上下文和着色器程序
let gl;
let program;
let texture;
let vertexBuffer;
let texCoordBuffer;

// 顶点着色器代码
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
        v_texCoord = a_texCoord;
    }
`;

// 片段着色器代码
const fragmentShaderSource = `
    precision mediump float;
    uniform sampler2D u_image;
    uniform vec3 u_keyColor;
    uniform float u_similarity;
    uniform float u_smoothness;
    uniform float u_spill;
    varying vec2 v_texCoord;

    vec2 RGBtoUV(vec3 rgb) {
        return vec2(
            rgb.r * -0.169 + rgb.g * -0.331 + rgb.b * 0.5 + 0.5,
            rgb.r * 0.5 + rgb.g * -0.419 + rgb.b * -0.081 + 0.5
        );
    }

    void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        float chromaDist = distance(RGBtoUV(color.rgb), RGBtoUV(u_keyColor));
        
        float baseMask = chromaDist - u_similarity;
        float fullMask = pow(clamp(baseMask / u_smoothness, 0., 1.), 1.5);
        color.a = fullMask;
        
        float spillVal = pow(clamp(baseMask / u_spill, 0., 1.), 1.5);
        float desat = clamp(color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722, 0., 1.);
        color.rgb = mix(vec3(desat, desat, desat), color.rgb, spillVal);
        
        gl_FragColor = color;
    }
`;

// 初始化WebGL
function initWebGL() {
    gl = canvas.getContext('webgl');
    if (!gl) {
        alert('无法初始化WebGL');
        return;
    }

    // 创建着色器程序
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // 创建纹理
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    // 创建顶点缓冲区
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
        1, -1,
        -1, 1,
        1, 1
    ]), gl.STATIC_DRAW);

    // 创建纹理坐标缓冲区
    texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        0, 1,  // 左下
        1, 1,  // 右下
        0, 0,  // 左上
        1, 0   // 右上
    ]), gl.STATIC_DRAW);

    // 启用混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

// 视频加载完成
video.addEventListener('loadedmetadata', () => {
    console.log('loadedmetadata')
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 初始化WebGL
    initWebGL();
    
    // 渲染视频
    video.requestVideoFrameCallback(render);
});
// 如果视频已经加载完成，则直接渲染
if (video.readyState === video.HAVE_ENOUGH_DATA) {
    console.log('readyState === video.HAVE_ENOUGH_DATA')
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // 初始化WebGL
    initWebGL();
    // 渲染视频
    video.requestVideoFrameCallback(render);
}

// 在线播放
playBtn.addEventListener('click', ()=>{
    video.load()
    video.play()
})
// 离屏播放
offscreenPlayBtn.addEventListener('click', ()=>{
    video.style.display = video.style.display === 'none' ? 'block' : 'none'
    // video.load()
    video.play()
})

/**
 * 渲染视频, requestVideoFrameCallback的回调
 * @param {*} timestamp 
 * @param {*} metadata 
 */
function render(timestamp, metadata) {
    if (!gl) return;

    // 设置视口
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // 更新纹理
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // 设置顶点属性
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 设置纹理坐标属性
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // 设置uniform变量
    const keyColor = chromakeyColor.value.match(/[A-Za-z0-9]{2}/g).map(v => parseInt(v, 16) / 255);
    gl.uniform3f(gl.getUniformLocation(program, 'u_keyColor'), keyColor[0], keyColor[1], keyColor[2]);
    gl.uniform1f(gl.getUniformLocation(program, 'u_similarity'), 0.1);
    gl.uniform1f(gl.getUniformLocation(program, 'u_smoothness'), 0.1);
    gl.uniform1f(gl.getUniformLocation(program, 'u_spill'), 0.1);

    // 绘制
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // 设置背景文字
    backText.innerText = JSON.stringify(metadata, null, 2);

    // 继续渲染循环
    video.requestVideoFrameCallback(render);
}


const x = {
    autoplay: false,
    loop: false,
    muted: true,
    preload: false,
    playsinline: true,
    'webkit-playsinline': true,
    'x5-playsinline': true
}