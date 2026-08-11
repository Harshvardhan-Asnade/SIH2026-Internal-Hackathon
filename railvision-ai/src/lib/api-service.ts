/**
 * RailVision AI — API Service Layer
 *
 * Reusable Axios-based service for communicating with the FastAPI backend.
 * Every backend endpoint has a typed wrapper function here.
 */

import axios, { type AxiosProgressEvent } from "axios";
import type {
  UploadResponse,
  ProcessingResult,
  ProcessRequest,
  HealthResponse,
  QueryResponse,
} from "@/lib/api-types";

// ── Axios instance ──────────────────────────────────────────────────
// Automatically determine backend URL based on how the page was accessed
function getApiBaseUrl(): string {
  // If explicitly set (e.g. for HTTPS tunnels), use it
  if (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.startsWith("https")) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // In browser, dynamically use the current hostname but point to port 8000
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  // Server-side fallback
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
}

const API_BASE_URL = getApiBaseUrl();
export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 600_000, // 10 min — video processing can be slow
});

// ── Webcam ──────────────────────────────────────────────────────────
export async function startWebcamSession(): Promise<{session_id: string}> {
  const { data } = await api.post<{session_id: string}>("/webcam/session");
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateWebcamReport(sessionId: string): Promise<any> {
  const { data } = await api.post(`/webcam/report/${sessionId}`);
  return data;
}

// ── Mobile Camera ───────────────────────────────────────────────────
export async function startMobileCameraSession(): Promise<{session_id: string}> {
  const { data } = await api.post<{session_id: string}>("/mobile-camera/session");
  return data;
}

export async function checkMobileCameraSession(sessionId: string): Promise<{status: string}> {
  const { data } = await api.get<{status: string}>(`/mobile-camera/session/${sessionId}/status`);
  return data;
}

// ── Health check ────────────────────────────────────────────────────
export async function checkHealth(): Promise<HealthResponse> {
  const { data } = await api.get<HealthResponse>("/health");
  return data;
}

// ── Upload video ────────────────────────────────────────────────────
export async function uploadVideo(
  file: File,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<UploadResponse>("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total && onProgress) {
        const pct = Math.round((event.loaded / event.total) * 100);
        onProgress(pct);
      }
    },
  });

  return data;
}

// ── Process video ───────────────────────────────────────────────────
export async function processVideo(
  body: ProcessRequest
): Promise<ProcessingResult> {
  const { data } = await api.post<ProcessingResult>("/process", body);
  return data;
}

// ── Get result video URL ────────────────────────────────────────────
export function getResultVideoUrl(videoId: string): string {
  return `${API_BASE_URL}/result/${videoId}`;
}

// ── Query the AI Assistant ──────────────────────────────────────────
export async function queryAssistant(
  query: string,
  context?: Record<string, unknown>
): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>("/query", {
    query,
    context,
  });
  return data;
}

// ── Get async report status ─────────────────────────────────────────
export async function getReportStatus(videoId: string): Promise<{status: string, report: string | null, error: string | null}> {
  const { data } = await api.get<{status: string, report: string | null, error: string | null}>(`/report/${videoId}`);
  return data;
}

// ── Retry async report generation ───────────────────────────────────
export async function retryReport(videoId: string): Promise<{message: string}> {
  const { data } = await api.post<{message: string}>(`/report/${videoId}/retry`);
  return data;
}

export default api;
