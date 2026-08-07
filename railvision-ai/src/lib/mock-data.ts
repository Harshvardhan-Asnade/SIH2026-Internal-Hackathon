import { ProcessingResult } from "./api-types";
import { Camera } from "./types";

export const DEMO_MOCK_RESULT: ProcessingResult = {
  video: "demo_cctv_camera_4.mp4",
  status: "completed",
  fps: 30,
  frames: 1800,
  processing_time: 2.14,
  detections: [
    { frame: 10, class: "person", confidence: 0.98, bbox: [100, 200, 300, 400] },
    { frame: 10, class: "person", confidence: 0.95, bbox: [150, 250, 350, 450] },
    { frame: 10, class: "bag", confidence: 0.88, bbox: [200, 300, 250, 350] },
  ],
  crowd_analysis: {
    average_people: 42.5,
    maximum_people: 87,
    peak_frame: 450,
    occupancy_percentage: 85,
    density: "High",
    trend: Array.from({ length: 60 }, (_, i) => ({
      frame: i * 30,
      people_count: Math.floor(20 + Math.random() * 60)
    }))
  },
  crime_detection: {
    total_incidents: 3,
    critical_incidents: 1,
    high_incidents: 2,
    tracked_persons: 87,
    abandoned_baggage: [
      { frame: 320, object_id: 3, confidence: 0.92, risk: "high", event_type: "abandoned_baggage" }
    ],
    track_intrusion: [
      { frame: 850, confidence: 0.99, risk: "critical", event_type: "track_intrusion" }
    ],
    restricted_area: [],
    loitering: [
      { frame: 1200, confidence: 0.85, risk: "high", event_type: "loitering" }
    ],
    running_detection: [],
    crowd_panic: [],
    fight_detection: []
  },
  work_monitoring: {
    statistics: {
      total_workers: 12,
      helmet_compliance: 83.3,
      jacket_compliance: 91.6,
      overall_safety: 87.5
    },
    workers: [
      { worker_id: 101, helmet: true, jacket: true, compliance: 100, zone: "Platform 1", working: true, idle_time: 0 },
      { worker_id: 102, helmet: false, jacket: true, compliance: 50, zone: "Platform 1", working: true, idle_time: 0 },
      { worker_id: 103, helmet: true, jacket: false, compliance: 50, zone: "Maintenance", working: false, idle_time: 120 },
      { worker_id: 104, helmet: true, jacket: true, compliance: 100, zone: "Platform 2", working: true, idle_time: 0 },
    ]
  },
  alerts: [
    { frame: 320, severity: "high", module: "crime", message: "Abandoned baggage detected on Platform 1 near pillar A4", confidence: 0.92, timestamp: "2026-08-07T12:00:00Z" },
    { frame: 450, severity: "medium", module: "crowd", message: "Crowd density reached 85% capacity. Monitor for potential stampede risk.", confidence: 0.95, timestamp: "2026-08-07T12:05:00Z" },
    { frame: 850, severity: "critical", module: "crime", message: "Person detected intruding on active railway tracks!", confidence: 0.99, timestamp: "2026-08-07T12:10:00Z" },
    { frame: 1200, severity: "high", module: "crime", message: "Loitering detected in restricted zone for >5 minutes.", confidence: 0.85, timestamp: "2026-08-07T12:15:00Z" },
    { frame: 1400, severity: "medium", module: "workers", message: "Worker #102 detected without safety helmet.", confidence: 0.96, timestamp: "2026-08-07T12:20:00Z" }
  ]
};

export const cameras: Camera[] = [
  {
    id: "CAM-001",
    name: "Main Concourse North",
    stationId: "STN-VD",
    stationName: "Vadodara Junction",
    platform: 1,
    location: "Entry Gate 1",
    status: "online",
    fps: 30,
    resolution: "1080p",
    detections: 124,
    lastDetection: "2 mins ago",
    confidence: 94,
    type: "crowd"
  },
  {
    id: "CAM-002",
    name: "Platform 1 South",
    stationId: "STN-VD",
    stationName: "Vadodara Junction",
    platform: 1,
    location: "Escalator 2",
    status: "online",
    fps: 30,
    resolution: "4K",
    detections: 87,
    lastDetection: "Just now",
    confidence: 91,
    type: "security"
  },
  {
    id: "CAM-003",
    name: "Platform 2 Center",
    stationId: "STN-VD",
    stationName: "Vadodara Junction",
    platform: 2,
    location: "Waiting Room A",
    status: "online",
    fps: 24,
    resolution: "1080p",
    detections: 45,
    lastDetection: "5 mins ago",
    confidence: 88,
    type: "general"
  },
  {
    id: "CAM-004",
    name: "Maintenance Yard East",
    stationId: "STN-VD",
    stationName: "Vadodara Junction",
    platform: 0,
    location: "Shed 3",
    status: "online",
    fps: 30,
    resolution: "1080p",
    detections: 12,
    lastDetection: "10 mins ago",
    confidence: 96,
    type: "worker"
  },
  {
    id: "CAM-005",
    name: "Platform 3 North",
    stationId: "STN-VD",
    stationName: "Vadodara Junction",
    platform: 3,
    location: "Staircase 1",
    status: "offline",
    fps: 0,
    resolution: "1080p",
    detections: 0,
    lastDetection: "2 hours ago",
    confidence: 0,
    type: "crowd"
  },
  {
    id: "CAM-006",
    name: "Parking Area West",
    stationId: "STN-VD",
    stationName: "Vadodara Junction",
    platform: 0,
    location: "Gate 4",
    status: "maintenance",
    fps: 0,
    resolution: "1080p",
    detections: 0,
    lastDetection: "Yesterday",
    confidence: 0,
    type: "security"
  }
];
