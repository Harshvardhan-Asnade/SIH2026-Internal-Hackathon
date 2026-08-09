# RailVision AI – Technology Stack & Algorithms
**Project: SIH1349 (Smart India Hackathon)**

This document details the complete technology stack, programming languages, development tools, and AI algorithms utilized to build the RailVision AI CCTV Analytics Platform.

---

## 1. Programming Languages
- **TypeScript**: The primary language for the frontend application, ensuring type safety and robust enterprise-grade code.
- **Python (3.10+)**: The core language for the backend API, AI model inference, and data processing.
- **HTML5 & CSS3**: Used for markup and styling, specifically utilizing Tailwind CSS.

---

## 2. Artificial Intelligence & Algorithms

### Computer Vision (CV)
- **YOLOv11 (You Only Look Once)**: State-of-the-art real-time object detection algorithm used to detect people, baggage, and workers in CCTV frames. Powered by the Ultralytics framework.
- **ByteTrack**: A simple, fast, and strong multi-object tracking algorithm. It associates detection boxes across frames to track individual entities (crowd tracking, worker monitoring) without dropping them during partial occlusions.

### Large Language Models (LLM) & NLP
- **Qwen 2.5 / 3 (0.5B Instruct)**: An advanced open-weights large language model deployed locally to act as the AI Investigation Assistant.
- **RAG-style Context Pipeline (Retrieval-Augmented Generation)**: A custom algorithm and architecture (Knowledge Base Builder + Context Builder) that heavily compresses Gigabytes of raw YOLO detection arrays into modular JSON summaries. This semantic context is injected into the LLM prompt, enabling the AI to answer specific questions accurately while staying within token limits.

---

## 3. Frontend Technology Stack (Command Center UI)
Built for high performance, modularity, and real-time responsiveness.
- **Next.js (v16.3)**: The foundational React framework utilizing the modern App Router for Server-Side Rendering (SSR) and routing.
- **React (v19)**: Core library for building dynamic user interfaces.
- **Tailwind CSS (v4)**: Utility-first CSS framework used for styling the dark theme, glassmorphism UI, and enforcing a strict 8px design grid.
- **Zustand**: A small, fast, and scalable bearbones state management solution used to handle the complex video workspace and pipeline states.
- **Framer Motion**: An animation library for React used to create fluid, professional micro-interactions, page transitions, and loading states.
- **Lucide React**: The comprehensive icon library used throughout the dashboard.
- **Recharts**: A composable charting library built on React components for rendering analytics and trend graphs.
- **jsPDF & jsPDF-AutoTable**: Libraries utilized for client-side generation of exportable AI Investigation PDF reports.

---

## 4. Backend Technology Stack (AI Pipeline API)
Designed for high concurrency and asynchronous AI inference tasks.
- **FastAPI**: A modern, fast (high-performance) web framework for building APIs with Python based on standard Python type hints.
- **Uvicorn**: An ASGI web server implementation for Python used to serve the FastAPI application.
- **Pydantic**: Data validation and settings management using Python type annotations.
- **PyTorch & Torchvision**: The underlying deep learning tensor library required to run YOLO and Transformers locally.
- **HuggingFace Transformers & Accelerate**: Libraries used to load, configure, and execute inference for the Qwen LLM.
- **OpenCV (opencv-python-headless)**: Computer vision library used for real-time video frame extraction and processing.
- **NumPy**: The fundamental package for scientific computing in Python, used for matrix math and array manipulation during detection processing.

---

## 5. Development & Deployment Tools
- **Node.js & npm**: JavaScript runtime and package manager for frontend dependencies.
- **pip**: Python package installer managing virtual environments (`.venv`).
- **ESLint**: Linter for identifying and fixing patterns in TypeScript code.
- **Git & GitHub**: Source code management and version control.
