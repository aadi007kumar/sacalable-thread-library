import cors from "cors";
import express from "express";
import { ThreadSystem } from "./services/threadSystem.js";

const app = express();
const system = new ThreadSystem();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/state", (_request, response) => {
  response.json(system.getState());
});

app.get("/api/threads", (_request, response) => {
  response.json({ threads: system.getThreads() });
});

app.post("/api/threads", (request, response) => {
  const thread = system.createThread(request.body);
  response.status(201).json({ thread, state: system.getState() });
});

app.post("/api/scheduler/start", (_request, response) => {
  response.json(system.startScheduler());
});

app.post("/api/scheduler/pause", (_request, response) => {
  response.json(system.pauseScheduler());
});

app.post("/api/scheduler/reset", (_request, response) => {
  system.resetSimulation();
  response.json(system.getState());
});

app.get("/api/analytics", (_request, response) => {
  response.json(system.getAnalytics());
});

app.get("/api/ai-suggestions", (_request, response) => {
  response.json(system.getSuggestions());
});

app.get("/api/settings", (_request, response) => {
  response.json(system.settings);
});

app.put("/api/settings", (request, response) => {
  system.setSettings(request.body);
  response.json(system.getState());
});

app.post("/api/system/reset", (_request, response) => {
  system.resetSystem();
  response.json(system.getState());
});

export default app;
