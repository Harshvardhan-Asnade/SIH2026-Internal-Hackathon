/**
 * RailVision AI — API Type Definitions
 *
 * Mirrors the Pydantic schemas from the FastAPI backend.
 * Shared across the entire frontend.
 */

// ── Individual detection ────────────────────────────────────────────
export interface Detection {
  frame: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

// ── Full processing result ──────────────────────────────────────────
export interface Alert {
  severity: string;
  message: string;
  module: string;
  timestamp: string;
  confidence: number;
  frame?: number;
}

export interface CrowdAnalysisResult {
  average_people: number;
  maximum_people: number;
  peak_frame: number;
  density: string;
  occupancy_percentage: number;
  heatmap?: string;
  trend: Array<{ frame: number; people_count: number }>;
}

export interface CrimeEvent {
  event_type: string;
  person_id?: number;
  object_id?: number;
  frame: number;
  timestamp?: string;
  confidence: number;
  risk: string;
  zone_name?: string;
  duration_seconds?: number;
  speed?: number;
  direction?: string;
  affected_persons?: number;
  bbox?: number[];
}

export interface CrimeDetectionResult {
  total_incidents: number;
  critical_incidents: number;
  high_incidents: number;
  tracked_persons: number;
  track_intrusion: CrimeEvent[];
  restricted_area: CrimeEvent[];
  abandoned_baggage: CrimeEvent[];
  loitering: CrimeEvent[];
  running_detection: CrimeEvent[];
  crowd_panic: CrimeEvent[];
  fight_detection: CrimeEvent[];
}

export interface WorkerStats {
  total_workers: number;
  helmet_compliance: number;
  jacket_compliance: number;
  overall_safety: number;
}

export interface WorkerInfo {
  worker_id: number;
  helmet: boolean;
  jacket: boolean;
  compliance: number;
  working: boolean;
  idle_time: number;
  zone: string;
  confidence?: number;
  bbox?: number[];
}

export interface WorkMonitoringResult {
  statistics: WorkerStats;
  workers: WorkerInfo[];
}

export interface ProcessingResult {
  status: string;
  video: string;
  frames: number;
  processing_time: number;
  fps: number;
  detections: Detection[];
  crowd_analysis?: CrowdAnalysisResult;
  crime_detection?: CrimeDetectionResult;
  work_monitoring?: WorkMonitoringResult;
  alerts?: Alert[];
}

// ── Upload response ─────────────────────────────────────────────────
export interface UploadResponse {
  status: string;
  message: string;
  video_id: string;
  filename: string;
}

// ── Process request body ────────────────────────────────────────────
export interface ProcessRequest {
  video_id: string;
  confidence?: number;
}

// ── Health check ────────────────────────────────────────────────────
export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  device: string;
  version: string;
}

// ── Error response ──────────────────────────────────────────────────
export interface ErrorResponse {
  status: string;
  detail: string;
}

// ── Pipeline state ──────────────────────────────────────────────────
export type PipelineStage =
  | "idle"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";
