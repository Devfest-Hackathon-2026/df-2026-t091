# 🏔️ AI Knowledge Mountain

> Don't just show students what they need to learn. Show them how far they've climbed.

An AI-powered, interactive 3D mountain built from a student's personalized learning roadmap.
Foundations sit at the base, advanced topics climb the slopes, and a capstone waits at the summit.
Mark a topic as learned and your climber moves up the mountain.

## Quick start

```bash
npm install
cp .env.example .env      # optional: add GEMINI_API_KEY for real AI
npm run dev               # web: http://localhost:5173  ·  api: http://localhost:8787
```

If you don't set `GEMINI_API_KEY`, the app runs in **demo mode** with built-in roadmaps
(a detailed one for AI/ML goals and a generic one for any other goal).

Production: `npm run build && npm start`, then open http://localhost:8787.

## How it works

1. **Set a goal**: the goal, time available, current level, and hours per day.
2. **AI builds a knowledge graph**: `server/index.js` calls Gemini with a JSON response schema.
   The response is cleaned up by `shared/normalize.js`, which makes ids unique, keeps prerequisites pointing
   only to earlier topics (so the graph can't loop), and computes a depth level for each topic.
3. **Graph → mountain**: `src/lib/layout.js` places each topic at an altitude based on its graph depth,
   spirals topics around the procedural terrain (`src/lib/terrain.js`), and draws trails along the surface between prerequisites.
4. **Climb**: a topic unlocks once all of its prerequisites are done. Marking it as learned moves the climber, turns the trail gold,
   and raises your altitude (summit = 8,848 m, weighted by study hours). Progress is saved in `localStorage`.

## Structure

```
server/index.js            Express API: /api/health, /api/roadmap (Gemini or demo fallback)
shared/normalize.js        Roadmap sanitizing + graph levels (used by server and client)
shared/mockRoadmap.js      Demo-mode roadmap generator
src/components/MountainScene.jsx   Three.js scene (terrain, nodes, trails, climber, summit)
src/components/GoalForm.jsx        Step 1: goal input
src/components/Hud.jsx             Altitude, stats, next topics
src/components/TopicPanel.jsx      Topic details + "Mark as learned"
```
