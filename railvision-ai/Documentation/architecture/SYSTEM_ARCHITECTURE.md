# System Architecture Details

The system is decoupled.
The **Next.js frontend** communicates via REST to the **FastAPI backend**.

All heavy compute inside FastAPI is offloaded using `asyncio.to_thread()` to prevent the API event loop from blocking during video inference.
