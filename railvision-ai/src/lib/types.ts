// ============================================================
// RailVision AI - TypeScript Interfaces
// ============================================================

export type UserRole = "administrator" | "station_master" | "rpf_officer" | "maintenance_supervisor";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  station: string;
}

export interface Station {
  id: string;
  name: string;
  code: string;
  zone: string;
  platforms: number;
  cameras: number;
  city: string;
}

export interface Camera {
  id: string;
  name: string;
  stationId: string;
  stationName: string;
  platform: number;
  location: string;
  status: "online" | "offline" | "maintenance";
  fps: number;
  resolution: string;
  detections: number;
  lastDetection: string;
  confidence: number;
  type: "crowd" | "security" | "worker" | "general";
}

export type AlertSeverity = "normal" | "medium" | "high" | "critical";
export type AlertStatus = "active" | "acknowledged" | "investigating" | "resolved";

export interface Alert {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  cameraId: string;
  cameraName: string;
  stationName: string;
  platform: number;
  timestamp: Date;
  confidence: number;
  assignedOfficer?: string;
  snapshot?: string;
}

export type CrimeType = "fight" | "track_intrusion" | "suspicious_behaviour" | "unattended_bag" | "restricted_area";

export interface Incident {
  id: string;
  type: CrimeType;
  title: string;
  description: string;
  cameraId: string;
  cameraName: string;
  stationName: string;
  platform: number;
  timestamp: Date;
  confidence: number;
  priority: "low" | "medium" | "high" | "critical";
  assignedOfficer: string;
  status: "open" | "investigating" | "resolved" | "closed";
  snapshot?: string;
}

export interface CrowdData {
  platformId: string;
  platformNumber: number;
  stationName: string;
  passengerCount: number;
  maxCapacity: number;
  density: number; // percentage
  riskLevel: "low" | "medium" | "high" | "critical";
  queueDetected: boolean;
  queueLength?: number;
  lastUpdated: Date;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  stationName: string;
  zone: string;
  status: "active" | "idle" | "break" | "absent";
  helmetDetected: boolean;
  jacketDetected: boolean;
  checkInTime: Date;
  lastSeen: Date;
  taskProgress: number;
  violations: number;
}

export interface DashboardStats {
  activeCameras: number;
  totalCameras: number;
  liveAlerts: number;
  passengersDetected: number;
  workersPresent: number;
  incidentsToday: number;
  systemHealth: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  value2?: number;
  value3?: number;
}

export interface Report {
  id: string;
  title: string;
  type: "daily" | "weekly" | "monthly";
  generatedAt: Date;
  generatedBy: string;
  format: "pdf" | "excel" | "csv";
  size: string;
  status: "ready" | "generating" | "failed";
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: "email" | "sms" | "push" | "webhook";
  enabled: boolean;
  target: string;
}

export interface AIModel {
  id: string;
  name: string;
  version: string;
  type: string;
  accuracy: number;
  status: "active" | "inactive" | "training";
  lastUpdated: Date;
}
