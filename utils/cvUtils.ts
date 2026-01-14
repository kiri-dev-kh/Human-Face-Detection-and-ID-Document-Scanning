
import { BoundingBox, Point } from '../types';

/**
 * Uses OpenCV.js to find the precise contour of an ID card and perform perspective warp.
 */
export const warpDocument = (video: HTMLVideoElement, box: BoundingBox): string => {
  // @ts-ignore
  const cv = window.cv;
  if (!cv) throw new Error("OpenCV not loaded");

  // Create temporary canvas to grab frame
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = video.videoWidth;
  srcCanvas.height = video.videoHeight;
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.drawImage(video, 0, 0);

  let src = cv.imread(srcCanvas);
  let dst = new cv.Mat();
  
  // 1. Pre-process
  cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
  cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0);
  cv.Canny(dst, dst, 75, 200);

  // 2. Find Contours
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();
  cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let bestContour = null;

  for (let i = 0; i < contours.size(); ++i) {
    let cnt = contours.get(i);
    let area = cv.contourArea(cnt);
    let peri = cv.arcLength(cnt, true);
    let approx = new cv.Mat();
    cv.approxPolyDP(cnt, approx, 0.02 * peri, true);

    if (approx.rows === 4 && area > maxArea) {
      maxArea = area;
      bestContour = approx;
    } else {
      approx.delete();
    }
  }

  // Fallback if no 4-point contour found within ROI
  if (!bestContour || maxArea < 5000) {
    // Just crop the bounding box from MediaPipe
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = box.width;
    fallbackCanvas.height = box.height;
    const fctx = fallbackCanvas.getContext('2d')!;
    fctx.drawImage(video, box.originX, box.originY, box.width, box.height, 0, 0, box.width, box.height);
    
    // Clean up
    src.delete(); dst.delete(); contours.delete(); hierarchy.delete();
    return fallbackCanvas.toDataURL('image/png');
  }

  // 3. Perspective Warp
  // Get corners in correct order: top-left, top-right, bottom-right, bottom-left
  let corners: Point[] = [];
  for (let i = 0; i < 4; i++) {
    corners.push({ x: bestContour.data32S[i * 2], y: bestContour.data32S[i * 2 + 1] });
  }
  
  // Sort corners
  corners.sort((a, b) => a.y - b.y);
  let top = corners.slice(0, 2).sort((a, b) => a.x - b.x);
  let bottom = corners.slice(2, 4).sort((a, b) => a.x - b.x);
  
  let sortedCorners = [top[0], top[1], bottom[1], bottom[0]]; // TL, TR, BR, BL

  const width = 800;
  const height = 500; // Standard ID aspect ratio roughly 1.6:1
  
  let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    sortedCorners[0].x, sortedCorners[0].y,
    sortedCorners[1].x, sortedCorners[1].y,
    sortedCorners[2].x, sortedCorners[2].y,
    sortedCorners[3].x, sortedCorners[3].y
  ]);
  
  let dstCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [
    0, 0,
    width, 0,
    width, height,
    0, height
  ]);

  let M = cv.getPerspectiveTransform(srcCoords, dstCoords);
  let finalDst = new cv.Mat();
  cv.warpPerspective(src, finalDst, M, new cv.Size(width, height));

  // 4. Output
  const resultCanvas = document.createElement('canvas');
  cv.imshow(resultCanvas, finalDst);
  const dataUrl = resultCanvas.toDataURL('image/png');

  // Memory cleanup is CRITICAL in OpenCV.js
  src.delete(); dst.delete(); contours.delete(); hierarchy.delete(); 
  bestContour.delete(); srcCoords.delete(); dstCoords.delete(); M.delete(); finalDst.delete();

  return dataUrl;
};
