# Project Overview

## 1. Project Identity
- **Project Name**: RailVision AI
- **SIH Problem ID**: SIH1349
- **Problem Statement Title**: "Using existing CCTV network for crowd management, crime prevention, and work monitoring using AI/ML"

## 2. Executive Motivation
Railway stations handle millions of passengers daily. Existing CCTV infrastructure is entirely passive—video is recorded but rarely analyzed in real-time unless an operator happens to be looking at the right screen at the right time. RailVision AI acts as a digital force multiplier, automating the monitoring process and alerting authorities *before* critical incidents escalate.

## 3. Core Philosophy
RailVision AI is built on three pillars:
1. **Edge-First AI**: Inference (YOLO) runs locally. We do not stream sensitive railway footage to external cloud APIs, ensuring absolute privacy and zero latency.
2. **Generative Intelligence**: Beyond just drawing bounding boxes, the system compiles semantic reports and allows operators to literally "chat" with the CCTV feed using a local Qwen 3 Large Language Model.
3. **Hardware Agnostic Optimization**: Frame-skipping algorithms ensure it can run on everything from low-power CPUs to high-end NVIDIA GPUs.

## 4. Current Status
- **[IMPLEMENTED]**: YOLO Object Detection, Crowd Heatmapping, Basic Crime Trajectory Tracking (loitering/running), LLM Integration, Next.js Dashboard.
- **[PLANNED]**: Real-time RTSP streaming (currently uses file uploads), Multi-station synchronization, Cleanliness module.
