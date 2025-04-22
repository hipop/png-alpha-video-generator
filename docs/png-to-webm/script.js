const fileSelectBtn = document.getElementById('fileSelectBtn');
const colorPicker = document.getElementById('colorPicker');
const fileListElement = document.getElementById('fileList');
const saveJpgBtn = document.getElementById('saveBtn');
const canvasWithBgEle = document.getElementById('canvas-with-background');
const canvasWithoutBgEle = document.getElementById('canvas-without-background');
const canvasMaskEle = document.getElementById('canvas-mask');
const playBtn = document.getElementById('playBtn');
const startRecordBtn = document.getElementById('startRecordBtn');
const saveVideoWithBgBtn = document.getElementById('saveVideoWithBgBtn');
const saveVideoWithoutBgBtn = document.getElementById('saveVideoWithoutBgBtn');
const saveVideoMaskBtn = document.getElementById('saveVideoMaskBtn');
const previewVideo = document.getElementById('previewVideo');
const bitRateValue = document.getElementById('bitRateValue');
const bitRate = document.getElementById('bitRate');
const fpsValue = document.getElementById('fpsValue');
const fps = document.getElementById('fps');

// const pixRatio = 1;// Math.max(window.innerWidth / 1920, 2);

const pixRatio = function(){
    const quality = document.querySelector('input[name="quality"]:checked')?.value;
    if (quality === '2k') {
        return 2;
    } else if (quality === 'hd') {
        return 1;
    }
    return 1;
}

const getQuality = function(){
    const quality = document.querySelector('input[name="quality"]:checked')?.value || 'hd';
    return quality;
}

// 保存JPG的文件列表
const pngFileArray = []
// 保存视频的文件列表
let recordedPngChunks = [];
let recordedJpgChunks = [];
let recordedMaskChunks = [];

fileSelectBtn.addEventListener('change', (e) => {
    const files = e.target.files;
    e.target.disabled = true;
    e.target.style.cursor = 'wait';
    const promArray = Array.from(files).map(async (file, index) => {
        return pngFileToJpgFile(file).then(([jpgFile, rawImg]) => {
            const url = URL.createObjectURL(jpgFile);
            const fileItem = document.createElement('img');
            fileItem.src = url;
            fileListElement.appendChild(fileItem);

            const item = {
                rawFile: file,
                rawImg: rawImg,
                file: jpgFile,
                index: index,
                name: file.name.replace('.png', '.jpg'),
                img: fileItem,
            }
            pngFileArray[item.index] = item;
            return item;
        });
    });

    Promise.all(promArray).then((res) => {
        saveJpgBtn.disabled = false;
        playBtn.disabled = false;
    });
});

saveJpgBtn.addEventListener('click', async () => {
    // 创建一个文件夹, 将pngFileArray中的文件写入到文件夹中
    const dirHandle = await window.showDirectoryPicker();
    pngFileArray.forEach(async (item) => {
        const fileHandle = await dirHandle.getFileHandle(item.name, {create: true});
        const writable = await fileHandle.createWritable();
        await writable.write(item.file);
        writable.close();
    });
});

// 更新fps
fpsValue.textContent = fps.value;
fps.addEventListener('input', () => {
    fpsValue.textContent = fps.value;
});

/**
 * 播放动画按钮被点击
 */
playBtn.addEventListener('click', () => {
    canvasWithBgEle.style.display = 'block';
    canvasWithBgEle.width = 1920 * pixRatio();
    canvasWithoutBgEle.style.display = 'block';
    canvasWithoutBgEle.width = 1920 * pixRatio();
    // canvasMaskEle.style.display = 'block';
    // canvasMaskEle.width = 1920;
    playAnimation(canvasWithBgEle, pngFileArray, 'jpg', 1000/Number(fps.value));
    playAnimation(canvasWithoutBgEle, pngFileArray, 'png', 1000/Number(fps.value));
    // playAnimation(canvasMaskEle, pngFileArray, 'mask', 1000/Number(fps.value));
});


// 更新比特率
bitRateValue.textContent = bitRate.value;
bitRate.addEventListener('input', () => {
    bitRateValue.textContent = bitRate.value;
});

/**
 * 开始录制按钮被点击
 */
startRecordBtn.addEventListener('click', () => {
    canvasWithBgEle.style.display = 'block';
    canvasWithBgEle.width = 1920 * pixRatio();
    canvasWithoutBgEle.style.display = 'block';
    canvasWithoutBgEle.width = 1920 * pixRatio();
    // canvasMaskEle.style.display = 'block';
    // canvasMaskEle.width = 1920;

    const streamPng = canvasWithoutBgEle.captureStream(30); // 捕获 canvas 流，帧率为 30 FPS
    const streamJpg = canvasWithBgEle.captureStream(30); // 捕获 canvas 流，帧率为 30 FPS
    // const streamMask = canvasMaskEle.captureStream(30); // 捕获 canvas 流，帧率为 30 FPS
    const mediaRecorderPng = new MediaRecorder(streamPng, { 
        mimeType: 'video/webm; codecs=vp9,opus',
        videoBitsPerSecond: Number(bitRate.value) * 1024 * 1024 * 8,
        audioBitsPerSecond: 128000
    });
    const mediaRecorderJpg = new MediaRecorder(streamJpg, { 
        mimeType: 'video/webm; codecs=vp8',
        videoBitsPerSecond: Number(bitRate.value) * 1024 * 1024 * 8,
        audioBitsPerSecond: 128000
    });
    /* const mediaRecorderMask = new MediaRecorder(streamMask, { 
        mimeType: 'video/webm; codecs=vp9,opus',
        videoBitsPerSecond: Number(bitRate.value) * 1024 * 1024 * 8,
        audioBitsPerSecond: 128000
    }); */


    mediaRecorderPng.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedPngChunks.push(event.data);
        previewVideo.src = URL.createObjectURL(event.data);
      }
    };
    mediaRecorderJpg.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedJpgChunks.push(event.data);
        }
    }; 
    /* mediaRecorderMask.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedMaskChunks.push(event.data);
        }
    }; */


    playAnimation(canvasWithBgEle, pngFileArray, 'jpg', 1000/Number(fps.value), () => {
        mediaRecorderPng.stop();
        saveVideoWithoutBgBtn.disabled = false;
    });
    playAnimation(canvasWithoutBgEle, pngFileArray, 'png', 1000/Number(fps.value), () => {
        mediaRecorderJpg.stop();
        saveVideoWithBgBtn.disabled = false;
    });
    /* playAnimation(canvasMaskEle, pngFileArray, 'mask', 1000/Number(fps.value), () => {
        mediaRecorderMask.stop();
        saveVideoMaskBtn.disabled = false;
    }); */


    mediaRecorderPng.start();
    mediaRecorderJpg.start();
    // mediaRecorderMask.start();
});

/**
 * 保存视频按钮被点击
 */
saveVideoWithBgBtn.addEventListener('click', async () => { 
    const blob = new Blob(recordedJpgChunks, { type: 'video/webm; codecs=vp8' });
    // recordedPngChunks = [];

    // 使用 showSaveFilePicker 保存文件
    const handle = await window.showSaveFilePicker({
        suggestedName: `video-with-bg-${getQuality()}.webm`
    }).catch((err) => {
        console.error(err);
        alert('无法保存，请在localhost或https页面中运行');
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

});

/**
 * 保存视频按钮被点击
 */
saveVideoWithoutBgBtn.addEventListener('click', async () => { 
    const blob = new Blob(recordedPngChunks, { type: 'video/webm; codecs=vp9,opus' });
    // recordedJpgChunks = [];

    // 使用 showSaveFilePicker 保存文件
    const handle = await window.showSaveFilePicker({
        suggestedName: `video-without-bg-${getQuality()}.webm`,
    }).catch((err) => {
        console.error(err);
        alert('无法保存，请在localhost或https页面中运行');
    }); 
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
});

/**
 * 保存视频按钮被点击
 */
saveVideoMaskBtn.addEventListener('click', async () => {
    const blob = new Blob(recordedMaskChunks, { type: 'video/webm; codecs=vp9,opus' });
    // recordedMaskChunks = [];

    // 使用 showSaveFilePicker 保存文件
    const handle = await window.showSaveFilePicker({
        suggestedName: 'video-mask.mp4',
    }).catch((err) => {
        console.error(err);
        alert('无法保存，请在localhost或https页面中运行');
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
});

/**
 * 播放动画
 * @param {Canvas} canvas 
 * @param {Array} pngFileArray 
 * @param {string} mode ['jpg', 'png', 'mask']
 * @param {Number} frameDelay 
 * @param {Function} callback 
 */
function playAnimation(canvas, pngFileArray, mode = 'jpg', frameDelay = 1000/Number(fps.value), callback) {
    currentFrameIndex = 0;
    canvas.width = pngFileArray[0].img.naturalWidth * pixRatio();
    canvas.height = pngFileArray[0].img.naturalHeight * pixRatio();

    playBtn.disabled = true;
    startRecordBtn.disabled = true;

    const ctx = canvas.getContext('2d');
    const totalFrames = pngFileArray.length;
    let lastTimestamp = 0; // 上一帧的时间戳

    function drawFrame(timestamp) {
      if (pngFileArray.length === 0) return; // 如果没有图片，直接返回

      // 计算时间差
      if (!lastTimestamp) lastTimestamp = timestamp; // 初始化时间戳
      const elapsed = timestamp - lastTimestamp;

      // 如果时间差大于等于帧延迟，则绘制下一帧
      if (elapsed >= frameDelay) {
        // 清除画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 绘制当前帧
        let currentImage = null;
        switch (mode) {
            case 'jpg':
                currentImage = pngFileArray[currentFrameIndex].img;
                break;
            case 'png':
                currentImage = pngFileArray[currentFrameIndex].rawImg;
                break;
            case 'mask':
                currentImage = pngFileArray[currentFrameIndex].rawImg;
                break;
        }
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

        // 如果是mask模式，则绘制mask
        if (mode === 'mask') {
            // 绘制mask
            const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const frameData = frame.data;
            // 根据alpha值，将背景设置为黑色
            for (let i = 0; i < frameData.length; i += 4) {
                frameData[i] = frameData[i+3];
                frameData[i+1] = frameData[i+3];
                frameData[i+2] = frameData[i+3];
                frameData[i+3] = 255;
            }
            ctx.putImageData(frame, 0, 0);
        }

        // 更新帧索引
        // currentFrameIndex = (currentFrameIndex + 1) % totalFrames;
        if (currentFrameIndex >= totalFrames-1) {
            requestAnimationFrame(() => {
                // 停止播放
                setTimeout(() => {
                    callback && callback();
                    startRecordBtn.disabled = false;
                    playBtn.disabled = false;
                }, 300);
            });
            return;
        }
        currentFrameIndex = currentFrameIndex + 1;
        // 重置时间戳
        lastTimestamp = timestamp;
      }

      // 使用 requestAnimationFrame 调用下一帧
      requestAnimationFrame(drawFrame);
    }

    drawFrame(); // 开始绘制第一帧
  }


/**
 * 将png文件转换为jpg文件
 * @param {File} file 
 * @returns {Promise<File>}
 */
async function pngFileToJpgFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                // 将png文件转换为jpg文件，背景设置为黑色
                ctx.fillStyle = colorPicker.value || 'green';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error("无法生成缩略图"));
                        return;
                      }
                    resolve([blob, img]);
                }, 'image/jpeg', 1.0);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

