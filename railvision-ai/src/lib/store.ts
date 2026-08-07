import { create } from 'zustand';
import type { ProcessingResult, Alert, CrimeEvent } from '@/lib/api-types';
import { DEMO_MOCK_RESULT } from '@/lib/mock-data';

/* ═══════════════════════════════════════════════════════════════════
   RailVision AI — Global Workspace Store
   Every component subscribes to this. No prop drilling.
   ═══════════════════════════════════════════════════════════════════ */

export type PipelineStage = 'idle' | 'upload' | 'extraction' | 'detection' | 'tracking' | 'analysis' | 'alerts' | 'report';

export interface OverlayToggles {
  boundingBoxes: boolean;
  trackingIds: boolean;
  confidence: boolean;
  crowdCount: boolean;
  riskLevel: boolean;
  zoneLabels: boolean;
  alertIndicators: boolean;
}

export interface VideoState {
  currentTime: number;
  duration: number;
  currentFrame: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
}

interface WorkspaceState {
  // ── File & Upload ─────────────────────────────────
  activeFile: File | null;
  activePreviewUrl: string | null;
  resultVideoUrl: string | null;
  videoId: string | null;
  uploadProgress: number;
  isUploading: boolean;

  // ── AI Pipeline ───────────────────────────────────
  isProcessing: boolean;
  pipelineStage: PipelineStage;
  processingResult: ProcessingResult | null;
  error: string | null;

  // ── Video Player ──────────────────────────────────
  videoState: VideoState;
  overlays: OverlayToggles;

  // ── UI ────────────────────────────────────────────
  activeTab: string;
  jumpToFrameTrigger: number | null;
  selectedAlert: Alert | null;
  selectedCrimeEvent: CrimeEvent | null;
  alertFilter: string; // 'all' | 'critical' | 'high' | 'medium' | 'low'
  moduleFilter: string; // 'all' | 'crowd' | 'crime' | 'workers'

  // ── Actions ───────────────────────────────────────
  setActiveFile: (file: File | null, previewUrl: string | null) => void;
  setResultVideoUrl: (url: string | null) => void;
  setVideoId: (id: string | null) => void;
  setUploadProgress: (progress: number) => void;
  setIsUploading: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  setPipelineStage: (stage: PipelineStage) => void;
  setProcessingResult: (result: ProcessingResult | null) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: string) => void;
  triggerJumpToFrame: (frame: number) => void;
  setSelectedAlert: (alert: Alert | null) => void;
  setSelectedCrimeEvent: (event: CrimeEvent | null) => void;
  setAlertFilter: (filter: string) => void;
  setModuleFilter: (filter: string) => void;
  updateVideoState: (partial: Partial<VideoState>) => void;
  toggleOverlay: (key: keyof OverlayToggles) => void;
  resetWorkspace: () => void;
  
  // ── Demo Mode ─────────────────────────────────────
  isDemoMode: boolean;
  startDemoMode: () => void;
}

const defaultVideoState: VideoState = {
  currentTime: 0,
  duration: 0,
  currentFrame: 0,
  isPlaying: false,
  playbackRate: 1,
  volume: 1,
  isMuted: false,
};

const defaultOverlays: OverlayToggles = {
  boundingBoxes: true,
  trackingIds: true,
  confidence: false,
  crowdCount: true,
  riskLevel: true,
  zoneLabels: false,
  alertIndicators: true,
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeFile: null,
  activePreviewUrl: null,
  resultVideoUrl: null,
  videoId: null,
  uploadProgress: 0,
  isUploading: false,

  isProcessing: false,
  pipelineStage: 'idle',
  processingResult: null,
  error: null,

  videoState: { ...defaultVideoState },
  overlays: { ...defaultOverlays },

  activeTab: 'overview',
  jumpToFrameTrigger: null,
  selectedAlert: null,
  selectedCrimeEvent: null,
  alertFilter: 'all',
  moduleFilter: 'all',

  setActiveFile: (file, previewUrl) => set({
    activeFile: file,
    activePreviewUrl: previewUrl,
    resultVideoUrl: null,
    error: null,
    processingResult: null,
    pipelineStage: 'idle',
    uploadProgress: 0,
    videoState: { ...defaultVideoState },
    selectedAlert: null,
    selectedCrimeEvent: null,
  }),
  setResultVideoUrl: (url) => set({ resultVideoUrl: url }),
  setVideoId: (id) => set({ videoId: id }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setIsUploading: (v) => set({ isUploading: v }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setPipelineStage: (stage) => set({ pipelineStage: stage }),
  setProcessingResult: (result) => set({ processingResult: result }),
  setError: (error) => set({ error }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  triggerJumpToFrame: (frame) => set({ jumpToFrameTrigger: frame }),
  setSelectedAlert: (alert) => set({ selectedAlert: alert }),
  setSelectedCrimeEvent: (event) => set({ selectedCrimeEvent: event }),
  setAlertFilter: (filter) => set({ alertFilter: filter }),
  setModuleFilter: (filter) => set({ moduleFilter: filter }),
  updateVideoState: (partial) => set({ videoState: { ...get().videoState, ...partial } }),
  toggleOverlay: (key) => set({ overlays: { ...get().overlays, [key]: !get().overlays[key] } }),

  resetWorkspace: () => set({
    activeFile: null,
    activePreviewUrl: null,
    resultVideoUrl: null,
    videoId: null,
    uploadProgress: 0,
    isUploading: false,
    isProcessing: false,
    pipelineStage: 'idle',
    processingResult: null,
    error: null,
    videoState: { ...defaultVideoState },
    overlays: { ...defaultOverlays },
    activeTab: 'overview',
    jumpToFrameTrigger: null,
    selectedAlert: null,
    selectedCrimeEvent: null,
    alertFilter: 'all',
    moduleFilter: 'all',
  }),

  isDemoMode: false,
  startDemoMode: () => {
    // Generate a dummy file for the UI
    const dummyFile = new File(["dummy video content"], "demo_railway_cctv.mp4", { type: "video/mp4" });
    const dummyUrl = URL.createObjectURL(dummyFile);
    
    set({
      isDemoMode: true,
      activeFile: dummyFile,
      activePreviewUrl: dummyUrl,
      resultVideoUrl: dummyUrl, // In real app, we'd use a real video URL here
      videoId: "demo-vid-001",
      uploadProgress: 100,
      isUploading: false,
      isProcessing: false,
      pipelineStage: 'report',
      processingResult: DEMO_MOCK_RESULT,
      error: null,
      activeTab: 'overview',
    });
  }
}));
