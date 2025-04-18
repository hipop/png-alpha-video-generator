const fileSelectBtn = document.getElementById('fileSelectBtn');
const colorPicker = document.getElementById('colorPicker');
const fileListElement = document.getElementById('fileList');
const saveJpgBtn = document.getElementById('saveBtn');
const canvasWithBgEle = document.getElementById('canvas-with-background');
const canvasWithoutBgEle = document.getElementById('canvas-without-background');
const playBtn = document.getElementById('playBtn');
const startRecordBtn = document.getElementById('startRecordBtn');
const saveVideoWithBgBtn = document.getElementById('saveVideoWithBgBtn');
const saveVideoWithoutBgBtn = document.getElementById('saveVideoWithoutBgBtn');

// 保存JPG的文件列表
const pngFileArray = []
// 保存视频的文件列表
let recordedPngChunks = [];
let recordedJpgChunks = [];

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

/**
 * 播放动画按钮被点击
 */
playBtn.addEventListener('click', () => {
    canvasWithBgEle.style.display = 'block';
    canvasWithBgEle.width = 1920;
    canvasWithoutBgEle.style.display = 'block';
    canvasWithoutBgEle.width = 1920;
    playAnimation(canvasWithBgEle, pngFileArray, true);
    playAnimation(canvasWithoutBgEle, pngFileArray, false);
});

/**
 * 开始录制按钮被点击
 */
startRecordBtn.addEventListener('click', () => {
    canvasWithBgEle.style.display = 'block';
    canvasWithBgEle.width = 1920;
    canvasWithoutBgEle.style.display = 'block';
    canvasWithoutBgEle.width = 1920;
    

    const streamPng = canvasWithoutBgEle.captureStream(30); // 捕获 canvas 流，帧率为 30 FPS
    const streamJpg = canvasWithBgEle.captureStream(30); // 捕获 canvas 流，帧率为 30 FPS
    const mediaRecorderPng = new MediaRecorder(streamPng, { 
        mimeType: 'video/webm; codecs=vp9,opus',
        videoBitsPerSecond: 1967 * 1024,
        audioBitsPerSecond: 128000
    });
    const mediaRecorderJpg = new MediaRecorder(streamJpg, { 
        mimeType: 'video/webm; codecs=vp9,opus',
        videoBitsPerSecond: 1967 * 1024,
        audioBitsPerSecond: 128000
    });

    mediaRecorderPng.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedPngChunks.push(event.data);
      }
    };
    mediaRecorderJpg.ondataavailable = (event) => {
        if (event.data.size > 0) {
            recordedJpgChunks.push(event.data);
        }
    }; 

    playAnimation(canvasWithBgEle, pngFileArray, true, 1000/30, () => {
        mediaRecorderPng.stop();
        saveVideoWithoutBgBtn.disabled = false;
    });
    playAnimation(canvasWithoutBgEle, pngFileArray, false, 1000/30, () => {
        mediaRecorderJpg.stop();
        saveVideoWithBgBtn.disabled = false;
    });

    mediaRecorderPng.start();
    mediaRecorderJpg.start();
});

/**
 * 保存视频按钮被点击
 */
saveVideoWithBgBtn.addEventListener('click', async () => { 
    const blob = new Blob(recordedPngChunks, { type: 'video/webm; codecs=vp9,opus' });
    // recordedPngChunks = [];

    // 使用 showSaveFilePicker 保存文件
    const handle = await window.showSaveFilePicker({
    suggestedName: 'video-with-bg.webm',
    types: [{
        description: 'MP4 Videos',
        accept: { 'video/webm': ['.webm'] },
    }],
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();

});

/**
 * 保存视频按钮被点击
 */
saveVideoWithoutBgBtn.addEventListener('click', async () => { 
    const blob = new Blob(recordedJpgChunks, { type: 'video/webm; codecs=vp9,opus' });
    // recordedJpgChunks = [];

    // 使用 showSaveFilePicker 保存文件
    const handle = await window.showSaveFilePicker({
        suggestedName: 'video-without-bg.webm',
    }); 
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
});


// 播放帧到canvas
function playAnimation(canvas, pngFileArray, isWithBg = false, frameDelay = 1000/30, callback) {
    currentFrameIndex = 0;
    canvas.width = pngFileArray[0].img.naturalWidth;
    canvas.height = pngFileArray[0].img.naturalHeight;

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
        const currentImage = isWithBg ? pngFileArray[currentFrameIndex].rawImg : pngFileArray[currentFrameIndex].img;
        ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);

        // 更新帧索引
        // currentFrameIndex = (currentFrameIndex + 1) % totalFrames;
        if (currentFrameIndex >= totalFrames-1) {
            // 停止播放
            callback && callback();

            startRecordBtn.disabled = false;
            playBtn.disabled = false;
        
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

