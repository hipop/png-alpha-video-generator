/**
 * 将颜色输入值转换为rgb值  
 * @param {string} color 
 * @returns {Object} - 包含r, g, b的rgb值
 */
function colorInputValueToRgb(color) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return { r, g, b };
}

/**
     * 去绿幕函数
     * @param {ImageData} imageData - 图像像素数据
     * @param {Object} greenThreshold - 绿色阈值 {r, g, b}
     * @param {Number} tolerance - 容差范围
     * @returns {ImageData} - 修改后的图像数据
     */
function removeGreenScreen(imageData, greenColor, tolerance) {
    const data = imageData.data;
    const greenThreshold = greenColor ? colorInputValueToRgb(greenColor) : { r: 0, g: 255, b: 0 };
    tolerance = tolerance || 10;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (g > 230 && r < 10 && b < 10) {
        data[i + 3] = 0; // 设置Alpha通道为0（完全透明）
        continue
      }
      // 判断是否在绿色范围内
      if (
        Math.abs(r - greenThreshold.r) < tolerance &&
        Math.abs(g - greenThreshold.g) < tolerance &&
        Math.abs(b - greenThreshold.b) < tolerance
      ) {
        data[i + 3] = 0; // 设置Alpha通道为0（完全透明）
      }
    }

    return imageData;
  }

  /**
   * 高斯模糊函数（用于边缘平滑）
   * @param {ImageData} imageData - 图像像素数据
   * @param {Number} width - 图像宽度
   * @param {Number} height - 图像高度
   * @param {Number} radius - 模糊半径
   * @returns {ImageData} - 修改后的图像数据
   */
  function applyGaussianBlur(imageData, width, height, radius) {
    const data = imageData.data;
    const kernel = createGaussianKernel(radius);
    const kernelSize = kernel.length;
    const halfKernelSize = Math.floor(kernelSize / 2);

    const tempData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          a = 0,
          weightSum = 0;

        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const dx = x + kx - halfKernelSize;
            const dy = y + ky - halfKernelSize;

            if (dx >= 0 && dx < width && dy >= 0 && dy < height) {
              const index = (dy * width + dx) * 4;
              const weight = kernel[ky][kx];

              r += tempData[index] * weight;
              g += tempData[index + 1] * weight;
              b += tempData[index + 2] * weight;
              a += tempData[index + 3] * weight;
              weightSum += weight;
            }
          }
        }

        const index = (y * width + x) * 4;
        data[index] = r / weightSum;
        data[index + 1] = g / weightSum;
        data[index + 2] = b / weightSum;
        data[index + 3] = a / weightSum;
      }
    }

    return imageData;
  }

  /**
   * 创建高斯核
   * @param {Number} radius - 模糊半径
   * @returns {Array} - 高斯核矩阵
   */
  function createGaussianKernel(radius) {
    const sigma = radius / 3;
    const size = radius * 2 + 1;
    const kernel = Array.from({ length: size }, () => Array(size).fill(0));
    let sum = 0;

    for (let y = -radius; y <= radius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
        kernel[y + radius][x + radius] = value;
        sum += value;
      }
    }

    // 归一化核
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        kernel[y][x] /= sum;
      }
    }

    return kernel;
  }