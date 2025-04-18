const videoEle = document.getElementById('video');
const canvasEle = document.getElementById('canvas');
const filterColorInputEle = document.getElementById('filterColor');
const thresholdInputEle = document.getElementById('threshold');
const thresholdValueEle = document.getElementById('threshold-value');
const blurInputEle = document.getElementById('blur');
const blurValueEle = document.getElementById('blur-value');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const hideVideoBtn = document.getElementById('hideVideoBtn');

const videoScale = 0.35;

const initCanvas = () => {
    canvasEle.width = 1920 * videoScale;
    canvasEle.height = 1080 * videoScale;
}

startBtn.addEventListener('click', () => {
    videoEle.play();
})

stopBtn.addEventListener('click', () => {
    videoEle.pause();
})

hideVideoBtn.addEventListener('click', () => {
    videoEle.style.display = videoEle.style.display === 'none' ? '' : 'none';
})

// thresholdInputEle.addEventListener('input', (e) => {
//     thresholdValueEle.textContent = e.target.value;
// })

// blurInputEle.addEventListener('input', (e) => {
//     blurValueEle.textContent = e.target.value;
// })

const drawVideo = (video, canvas) => {
    const ctx = canvas.getContext('2d');
    // 扣掉视频中的绿布背景
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 遍历像素数据，将绿布背景设置为透明
    // removeGreenScreen(frame, filterColorInputEle.value, Number(thresholdInputEle.value));
    // 高斯模糊
    // applyGaussianBlur(frame, canvas.width, canvas.height, Number(blurInputEle.value));
    // 将处理后的像素数据绘制到canvas上
    ctx.putImageData(frame, 0, 0);
}

const mainRender = () => {
    initCanvas()
    drawVideo(videoEle, canvasEle);
    requestAnimationFrame(mainRender);
}

videoEle.addEventListener('loadedmetadata', () => {
    mainRender();
});










