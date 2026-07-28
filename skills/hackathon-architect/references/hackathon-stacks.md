# Fast-to-Build Hackathon Stacks (durable defaults)

Starting points chosen for **speed to a working demo**, not production perfection. Always let web research and the team's actual skills override these - a stack nobody knows is slower than a "worse" one everybody knows. Prefer boring, well-documented tools in a time crunch.

## Cross-cutting principles

- **Fewest moving parts wins.** Every extra service is setup time and a failure point.
- **Managed > self-hosted** for a weekend (hosted DB, hosted inference, serverless).
- **Skip auth** unless the demo needs it; fake it with a hardcoded user.
- **Seed/precompute data early** - missing or messy data is the #1 hackathon time-sink.
- **Deploy on day 1**, not the last hour, so "it works on my machine" never happens on stage.

## Web app

- **Frontend:** Next.js or plain React + Vite; Tailwind for fast styling. Streamlit if the team is ML-not-frontend and the UI is simple.
- **Backend:** FastAPI (Python teams) or Next.js API routes / Express (JS teams).
- **DB:** Postgres via Supabase or Neon (free, hosted, instant). SQLite if single-machine.
- **Auth (only if needed):** Supabase Auth or Clerk.
- **Host:** Vercel (frontend/Next), Render / Railway / Fly.io (backend).

## AI / ML

- **Prototyping:** Python + Jupyter/Colab (free GPU) for the model; scikit-learn for classical, PyTorch for deep.
- **LLM features:** call a hosted API (Anthropic / OpenAI) rather than self-hosting; use a small open model on HF only if offline/cost demands it.
- **Serving:** FastAPI wrapper; deploy on Hugging Face Spaces or Render.
- **Demo UI:** Streamlit or Gradio - fastest path from model to clickable demo.
- **Vector search / RAG:** Chroma or FAISS locally; a hosted vector DB only if scale demands.
- **Data:** grab a Kaggle/HF dataset early; verify licensing and that it actually loads.

## Data / analytics

- **Wrangling:** Python + Pandas; DuckDB for fast local SQL on files.
- **Dashboard:** Streamlit or a notebook; Plotly/Recharts for charts.

## Mobile

- **Cross-platform:** Expo (React Native) or Flutter - one codebase, fast reload. Avoid native iOS+Android separately in a hackathon.
- **Backend:** Firebase (auth + DB + hosting in one) is often fastest.

## Hardware / IoT

- **Prototyping:** Raspberry Pi or ESP32 + Python/Arduino.
- **Cloud link:** MQTT or a simple REST endpoint; Firebase for the app side.
- **Have a fallback:** a recorded/simulated data stream in case the physical device fails on stage.

## Realtime / collaborative

- **Transport:** WebSockets (Socket.IO) or a hosted realtime layer (Supabase Realtime, Ably).
- **State:** keep it in memory for the demo unless persistence is the point.

## Anti-patterns to flag in the plan

- Building custom auth, custom infra, or microservices for a weekend project.
- Training a large model from scratch when fine-tuning or an API call would do.
- Choosing a trendy tool nobody on the team has used.
- Leaving deployment and data to the final hours.
