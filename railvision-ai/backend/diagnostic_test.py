import os
import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path(__file__).parent))

from app.config import get_settings
from app.ai.base.module_registry import ModuleRegistry
from app.ai.person.module import PersonDetectionModule
from app.ai.person.config import PersonDetectionConfig
from app.ai.crowd.module import CrowdAnalysisModule
from app.ai.crowd.config import CrowdAnalysisConfig

def find_test_video():
    uploads_dir = Path("uploads")
    if not uploads_dir.exists():
        return None
    for file in uploads_dir.glob("*.mp4"):
        return file
    return None

def run_diagnostics():
    video_path = find_test_video()
    if not video_path:
        print("No test video found.")
        return

    output_path = Path("outputs") / "diagnostic_output.mp4"
    output_path.parent.mkdir(exist_ok=True)
    
    print(f"Testing on video: {video_path}")
    print(f"Testing with: confidence=0.25, imgsz=1280, iou_threshold=0.5")

    # Configure Person Detection
    person_cfg = PersonDetectionConfig(
        confidence=0.25,
        iou_threshold=0.50,
        imgsz=1280,
        frame_skip=1
    )
    
    # Configure Crowd
    crowd_cfg = CrowdAnalysisConfig(
        frame_skip=1
    )

    registry = ModuleRegistry.get_instance()
    registry.register(PersonDetectionModule(person_cfg))
    registry.register(CrowdAnalysisModule(crowd_cfg))
    
    registry.initialize_all()
    
    print("\n--- RUNNING DIAGNOSTICS ---")
    result = registry.process_video(video_path, output_path)
    
    crowd = result.get("crowd_analysis", {})
    summary = crowd.get("summary", {})
    
    print("\n--- DIAGNOSTIC RESULTS ---")
    
    person_result = result.get("person_detection", {})
    all_detections = person_result.get("detections", [])
    print(f"Total Detections Found: {len(all_detections)}")
    if len(all_detections) > 0:
        print(f"Sample Detections: {all_detections[:5]}")
        print(f"Unique Class Names Detected: {set(d.get('class', d.get('class_name', 'unknown')) for d in all_detections)}")
    
    print(f"Total Frames Processed: {result['frames']}")
    print(f"Total Unique People Tracked (ByteTrack): {summary.get('unique_people_tracked', 0)}")
    print(f"Peak Crowd Count (Simultaneous): {summary.get('maximum_people', 0)}")
    print(f"Average Crowd Count: {summary.get('average_people', 0)}")
    print(f"Processing Time: {result['processing_time']}s")
    print(f"\nRAW CROWD DUMP: {crowd}")
    
    # Write report
    report_dir = Path("outputs/model_diagnostics")
    report_dir.mkdir(parents=True, exist_ok=True)
    with open(report_dir / "diagnostic_report.txt", "w") as f:
        f.write("--- CROWD DETECTION DIAGNOSTIC REPORT ---\n")
        f.write(f"Video: {video_path}\n")
        f.write(f"Unique Tracked IDs: {summary.get('unique_people_tracked', 0)}\n")
        f.write(f"Peak Simultaneous Crowd: {summary.get('maximum_people', 0)}\n")
        f.write(f"Average Crowd: {summary.get('average_people', 0)}\n")

if __name__ == "__main__":
    run_diagnostics()
