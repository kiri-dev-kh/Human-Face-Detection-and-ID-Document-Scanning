
import { useState, useEffect, useRef, useCallback } from 'react';
import { CaptureMode, ScannerStatus, DetectionResult, BoundingBox, Point } from '../types';
import * as cvUtils from '../utils/cvUtils';

// CDN Links for MediaPipe
const MP_VISION_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3';

interface UseVisionProps {
  mode: CaptureMode;
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  onCapture: (dataUrl: string) => void;
}

export const useVision = ({ mode, videoRef, canvasRef, onCapture }: UseVisionProps) => {
  const [status, setStatus] = useState<ScannerStatus>(ScannerStatus.INITIALIZING);
  const [progress, setProgress] = useState(0);
  const detectorRef = useRef<any>(null);
  // Initializing with undefined to satisfy the expected 1 argument requirement in strict TypeScript
  const requestRef = useRef<number | undefined>(undefined);
  const lastDetectionRef = useRef<BoundingBox | null>(null);
  const stabilityCounterRef = useRef<number>(0);
  const isCapturedRef = useRef(false);

  const STABILITY_THRESHOLD_MS = 800;
  const VARIANCE_TOLERANCE = 0.02; // 2% of dimension
  const FPS_TARGET = 30;
  const frameInterval = 1000 / FPS_TARGET;
  let lastFrameTime = 0;

  // Initialize Detector
  useEffect(() => {
    let active = true;
    const initDetector = async () => {
      setStatus(ScannerStatus.INITIALIZING);
      try {
        const { FaceDetector, ObjectDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(`${MP_VISION_CDN}/wasm`);
        
        if (mode === 'FACE') {
          detectorRef.current = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
              delegate: "GPU"
            },
            runningMode: "VIDEO"
          });
        } else {
          detectorRef.current = await ObjectDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
              delegate: "GPU"
            },
            scoreThreshold: 0.5,
            runningMode: "VIDEO"
          });
        }

        if (active) {
          startCamera();
        }
      } catch (err) {
        console.error("Detector init error:", err);
        setStatus(ScannerStatus.ERROR);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setStatus(ScannerStatus.SEARCHING);
            requestRef.current = requestAnimationFrame(detectFrame);
          };
        }
      } catch (err) {
        setStatus(ScannerStatus.ERROR);
      }
    };

    initDetector();
    return () => {
      active = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      detectorRef.current?.close();
    };
  }, [mode]);

  const detectFrame = (time: number) => {
    if (!videoRef.current || !detectorRef.current || !canvasRef.current || isCapturedRef.current) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    if (time - lastFrameTime < frameInterval) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    lastFrameTime = time;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    let result: any;
    if (mode === 'FACE') {
      result = detectorRef.current.detectForVideo(video, time);
    } else {
      result = detectorRef.current.detectForVideo(video, time);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const detections = mode === 'FACE' ? result.detections : result.detections;
    let targetDetection = null;

    if (mode === 'ID_CARD') {
      // Look for cell phone or similar rectangular object as proxy if custom ID model isn't here
      // Real senior implementation would use specialized model, here we filter for "book" or general rectangles
      targetDetection = detections.find((d: any) => 
        ['book', 'cell phone', 'remote', 'laptop'].includes(d.categories?.[0]?.categoryName)
      );
    } else {
      targetDetection = detections[0];
    }

    if (targetDetection) {
      const box = targetDetection.boundingBox;
      drawBox(ctx, box, status === ScannerStatus.LOCKING ? '#facc15' : '#ffffff');
      
      checkStability(box);
    } else {
      lastDetectionRef.current = null;
      stabilityCounterRef.current = 0;
      setStatus(ScannerStatus.SEARCHING);
      setProgress(0);
    }

    requestRef.current = requestAnimationFrame(detectFrame);
  };

  const drawBox = (ctx: CanvasRenderingContext2D, box: any, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.setLineDash(status === ScannerStatus.SEARCHING ? [15, 10] : []);
    
    // Draw corner brackets
    const { originX, originY, width, height } = box;
    const len = Math.min(width, height) * 0.2;
    
    ctx.beginPath();
    // Top Left
    ctx.moveTo(originX, originY + len);
    ctx.lineTo(originX, originY);
    ctx.lineTo(originX + len, originY);
    // Top Right
    ctx.moveTo(originX + width - len, originY);
    ctx.lineTo(originX + width, originY);
    ctx.lineTo(originX + width, originY + len);
    // Bottom Right
    ctx.moveTo(originX + width, originY + height - len);
    ctx.lineTo(originX + width, originY + height);
    ctx.lineTo(originX + width - len, originY + height);
    // Bottom Left
    ctx.moveTo(originX + len, originY + height);
    ctx.lineTo(originX, originY + height);
    ctx.lineTo(originX, originY + height - len);
    ctx.stroke();
  };

  const checkStability = (box: BoundingBox) => {
    if (!lastDetectionRef.current) {
      lastDetectionRef.current = box;
      stabilityCounterRef.current = 0;
      setStatus(ScannerStatus.LOCKING);
      return;
    }

    const prev = lastDetectionRef.current;
    const dx = Math.abs(box.originX - prev.originX);
    const dy = Math.abs(box.originY - prev.originY);
    const dw = Math.abs(box.width - prev.width);
    const dh = Math.abs(box.height - prev.height);

    const isStable = 
      dx < box.width * VARIANCE_TOLERANCE &&
      dy < box.height * VARIANCE_TOLERANCE &&
      dw < box.width * VARIANCE_TOLERANCE &&
      dh < box.height * VARIANCE_TOLERANCE;

    if (isStable) {
      stabilityCounterRef.current += frameInterval;
      setProgress(Math.min(stabilityCounterRef.current / STABILITY_THRESHOLD_MS, 1));
      
      if (stabilityCounterRef.current >= STABILITY_THRESHOLD_MS) {
        performCapture(box);
      }
    } else {
      stabilityCounterRef.current = 0;
      setProgress(0);
      lastDetectionRef.current = box;
    }
  };

  const performCapture = async (box: BoundingBox) => {
    if (isCapturedRef.current) return;
    isCapturedRef.current = true;
    setStatus(ScannerStatus.CAPTURED);

    const video = videoRef.current!;
    const captureCanvas = document.createElement('canvas');
    const ctx = captureCanvas.getContext('2d')!;

    if (mode === 'ID_CARD') {
      // Perspective Warp logic via OpenCV
      try {
        const warpedDataUrl = cvUtils.warpDocument(video, box);
        onCapture(warpedDataUrl);
      } catch (e) {
        console.error("Warp failed, fallback to crop", e);
        captureCanvas.width = box.width;
        captureCanvas.height = box.height;
        ctx.drawImage(video, box.originX, box.originY, box.width, box.height, 0, 0, box.width, box.height);
        onCapture(captureCanvas.toDataURL('image/png'));
      }
    } else {
      // Face crop
      const padding = 0.3; // 30% padding for faces
      const px = box.width * padding;
      const py = box.height * padding;
      captureCanvas.width = box.width + 2 * px;
      captureCanvas.height = box.height + 2 * py;
      ctx.drawImage(
        video, 
        Math.max(0, box.originX - px), 
        Math.max(0, box.originY - py), 
        box.width + 2 * px, 
        box.height + 2 * py, 
        0, 0, captureCanvas.width, captureCanvas.height
      );
      onCapture(captureCanvas.toDataURL('image/png'));
    }

    // Reset after delay
    setTimeout(() => {
      isCapturedRef.current = false;
      setStatus(ScannerStatus.SEARCHING);
      setProgress(0);
      stabilityCounterRef.current = 0;
    }, 2000);
  };

  const startCapture = () => {
    if (status === ScannerStatus.SEARCHING || status === ScannerStatus.LOCKING) {
      // If we have a manual trigger, try to find a box or just snap center
      if (lastDetectionRef.current) {
        performCapture(lastDetectionRef.current);
      } else {
        const video = videoRef.current!;
        const centerBox = {
          originX: video.videoWidth * 0.2,
          originY: video.videoHeight * 0.2,
          width: video.videoWidth * 0.6,
          height: video.videoHeight * 0.6
        };
        performCapture(centerBox);
      }
    }
  };

  return { status, progress, startCapture };
};
