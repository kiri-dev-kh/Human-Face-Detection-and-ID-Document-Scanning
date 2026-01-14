
export type CaptureMode = 'FACE' | 'ID_CARD';

export enum ScannerStatus {
  INITIALIZING = 'INITIALIZING',
  SEARCHING = 'SEARCHING',
  LOCKING = 'LOCKING',
  CAPTURED = 'CAPTURED',
  ERROR = 'ERROR'
}

export interface BoundingBox {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface DetectionResult {
  boundingBox: BoundingBox;
  confidence: number;
  corners?: Point[];
}

export interface CaptureResult {
  image: string; // Base64 or Blob URL
  mode: CaptureMode;
  timestamp: number;
}
