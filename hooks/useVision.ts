
import { useState, useEffect, useRef, useCallback } from 'react';
import { CaptureMode, ScannerStatus, DetectionResult, BoundingBox, Point } from '../types';
import * as cvUtils from '../utils/cvUtils';

// Synchronize with index.html import map version
const MP_VERSION = '0.10.22-rc.20250304';
const MP_VISION_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;

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
  const requestRef = useRef<number | undefined>(undefined);
  const lastDetectionRef = useRef<BoundingBox | null>(null);
  const stabilityCounterRef = useRef<number>(0);
  const isCapturedRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const STABILITY_THRESHOLD_MS = 800;
  const VARIANCE_TOLERANCE = 0.02; 
  const FPS_TARGET = 30;
  const frameInterval = 1000 / FPS_TARGET;
  let lastFrameTime = 0;

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = undefined;
    }
  };

  const startCamera = async () => {
    try {
      // Preferred constraints
      const preferredConstraints: MediaStreamConstraints = {
        video: {
          facingMode: mode === 'ID_CARD' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(preferredConstraints);
      } catch (err) {
        console.warn("Preferred camera constraints failed, falling back...", err);
        // Fallback to basic video
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setStatus(ScannerStatus.SEARCHING);
          requestRef.current = requestAnimationFrame(detectFrame);
        };
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setStatus(ScannerStatus.ERROR);
    }
  };

  useEffect(() => {
    let active = true;
    
    const initDetector = async () => {
      setStatus(ScannerStatus.INITIALIZING);
      try {
        const { FaceDetector, ObjectDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(`${MP_VISION_CDN}/wasm`);
        
        if (!active) return;

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
          await startCamera();
        }
      } catch (err) {
        console.error("Detector initialization error:", err);
        if (active) setStatus(ScannerStatus.ERROR);
      }
    };

    initDetector();

    return () => {
      active = false;
      stopCamera();
      detectorRef.current?.close();
    };
  }, [mode]);

  const detectFrame = (time: number) => {
    if (!videoRef.current || !detectorRef.current || !canvasRef.current || isCapturedRef.current) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    // Rate limit detection to preserve UI responsiveness
    if (time - lastFrameTime < frameInterval) {
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    lastFrameTime = time;

    const video = videoRef.current;
    if (video.readyState < 2) { // HAVE_CURRENT_DATA
      requestRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Ensure canvas matches video aspect ratio for overlay accuracy
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      // Use performance.now() for precise MediaPipe timing
      const timestamp = performance.now();
      const result = detectorRef.current.detectForVideo(video, timestamp);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const detections = result.detections || [];
      let targetDetection = null;

      if (mode === 'ID_CARD') {
        // Broaden document detection logic
        const docCategories = ['book', 'cell phone', 'laptop', 'potted plant', 'remote'];
        targetDetection = detections.find((d: any) => 
          docCategories.includes(d.categories?.[0]?.categoryName?.toLowerCase())
        );
      } else {
        targetDetection = detections[0];
      }

      if (targetDetection && targetDetection.boundingBox) {
        const box = targetDetection.boundingBox;
        drawBox(ctx, box, status === ScannerStatus.LOCKING ? '#facc15' : '#ffffff');
        checkStability(box);
      } else {
        lastDetectionRef.current = null;
        stabilityCounterRef.current = 0;
        setStatus(ScannerStatus.SEARCHING);
        setProgress(0);
      }
    } catch (e) {
      console.error("Detection cycle error:", e);
    }

    requestRef.current = requestAnimationFrame(detectFrame);
  };

  const drawBox = (ctx: CanvasRenderingContext2D, box: any, color: string) => {
    const { originX, originY, width, height } = box;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.setLineDash(status === ScannerStatus.SEARCHING ? [15, 10] : []);
    
    const len = Math.min(width, height) * 0.2;
    
    ctx.beginPath();
    ctx.moveTo(originX, originY + len);
    ctx.lineTo(originX, originY);
    ctx.lineTo(originX + len, originY);

    ctx.moveTo(originX + width - len, originY);
    ctx.lineTo(originX + width, originY);
    ctx.lineTo(originX + width, originY + len);

    ctx.moveTo(originX + width, originY + height - len);
    ctx.lineTo(originX + width, originY + height);
    ctx.lineTo(originX + width - len, originY + height);

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
      setStatus(ScannerStatus.LOCKING);
    }
  };

  const performCapture = async (box: BoundingBox) => {
    if (isCapturedRef.current) return;
    isCapturedRef.current = true;
    setStatus(ScannerStatus.CAPTURED);

    const video = videoRef.current!;
    const captureCanvas = document.createElement('canvas');
    const ctx = captureCanvas.getContext('2d', { willReadFrequently: true })!;

    try {
      if (mode === 'ID_CARD') {
        try {
          const warpedDataUrl = cvUtils.warpDocument(video, box);
          onCapture(warpedDataUrl);
        } catch (e) {
          console.warn("Advanced warp failed, using fallback crop", e);
          captureCanvas.width = box.width;
          captureCanvas.height = box.height;
          ctx.drawImage(video, box.originX, box.originY, box.width, box.height, 0, 0, box.width, box.height);
          onCapture(captureCanvas.toDataURL('image/png'));
        }
      } else {
        const padding = 0.35;
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
    } catch (err) {
      console.error("Capture processing error:", err);
    }

    setTimeout(() => {
      isCapturedRef.current = false;
      setStatus(ScannerStatus.SEARCHING);
      setProgress(0);
      stabilityCounterRef.current = 0;
    }, 2000);
  };

  const startCapture = () => {
    if (status === ScannerStatus.SEARCHING || status === ScannerStatus.LOCKING) {
      if (lastDetectionRef.current) {
        performCapture(lastDetectionRef.current);
      } else {
        const video = videoRef.current!;
        const centerBox = {
          originX: video.videoWidth * 0.25,
          originY: video.videoHeight * 0.25,
          width: video.videoWidth * 0.5,
          height: video.videoHeight * 0.5
        };
        performCapture(centerBox);
      }
    }
  };

  return { status, progress, startCapture };
};
