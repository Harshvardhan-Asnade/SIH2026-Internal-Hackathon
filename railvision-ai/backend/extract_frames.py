import cv2
import os

video_path = "uploads/031d6b7dcb1c_WhatsApp Video 2026-08-07 at 14.15.04.mp4"
output_dir = "/Users/harshvardhan/.gemini/antigravity-ide/brain/c718da80-8c9e-4e8e-a783-fd12a4a0ecca/frames"
os.makedirs(output_dir, exist_ok=True)

cap = cv2.VideoCapture(video_path)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS)

print(f"Total frames: {total_frames}, FPS: {fps}")

# Extract 5 representative frames (empty, low, dense, etc. hopefully represented over time)
# Let's take evenly spaced frames if it's a short video
frame_indices = [int(total_frames * i / 5) for i in range(5)]
if total_frames > 0:
    # also add a frame near the end
    frame_indices.append(total_frames - 2)

frame_indices = sorted(list(set(frame_indices)))

for idx in frame_indices:
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f"{output_dir}/frame_{idx}.jpg", frame)
        print(f"Extracted frame {idx}")
cap.release()
