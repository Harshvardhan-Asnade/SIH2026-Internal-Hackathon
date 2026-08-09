# Backend Security & Data Protection

**Status**: [IMPLEMENTED]

## 1. Input Sanitization & Path Traversal Prevention
To prevent path traversal attacks (e.g. uploading a file named `../../etc/passwd`):
- All incoming filenames are checked via `validate_video_extension()`.
- Upload paths are constructed exclusively using generated UUID `video_id` values:
  ```python
  dest = get_upload_path(video_id, file.filename)
  # Resolves strictly inside uploads/ directory
  ```

## 2. File Size & Type Validation
- **Extension Restrictions**: Only `.mp4`, `.avi`, `.mov`, `.mkv` files are allowed.
- **Payload Limits**: Max file size is capped at 500MB per request to prevent Denial of Service (DoS) memory exhaustions.

## 3. Privacy & Air-Gapped Security
Surveillance footage never exits the backend container network. All inference (YOLO, tracking, Qwen LLM) runs completely offline without calling external APIs.
