# Backend Configuration Management

**Status**: [IMPLEMENTED]
**File**: `app/config.py`

## 1. Pydantic Settings
Configuration is managed using `pydantic_settings.BaseSettings`, allowing automatic parsing of environment variables (`.env`) with default fallbacks.

```python
class Settings(BaseSettings):
    app_name: str = "RailVision AI"
    app_version: str = "1.0.0"
    debug: bool = False
    
    # Path configurations
    base_dir: Path = Path(__file__).parent.parent
    upload_dir: Path = base_dir / "uploads"
    output_dir: Path = base_dir / "outputs"
    model_dir: Path = base_dir / "weights"
    
    # AI Engine settings
    model_device: str = "auto"  # "cuda", "mps", "cpu"
    default_confidence: float = 0.3
    frame_skip: int = 3
    
    class Config:
        env_file = ".env"
```

## 2. Dynamic Hardware Auto-Selection
If `model_device` is set to `"auto"`, the system selects the hardware backend at startup:
1. `cuda` (if `torch.cuda.is_available()`)
2. `mps` (if `torch.backends.mps.is_available()`)
3. `cpu` (fallback)
