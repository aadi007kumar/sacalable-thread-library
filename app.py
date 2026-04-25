"""
Flask REST API — Scalable Thread Management Library
Exposes endpoints to create, control, and monitor threads via HTTP.
"""

import time
import random
from flask import Flask, jsonify, request
from flask_cors import CORS
from thread_library import ThreadManager, ThreadState

app = Flask(__name__)
CORS(app)

manager = ThreadManager(max_threads=1000)
manager.enable_pool(min_workers=4, max_workers=50)
ui_config = {"scheduling_type": "FIFO", "simulation_speed": "Normal"}


def error_response(message: str, status: int = 400):
    return jsonify({"error": message}), status


def build_ai_suggestions():
    threads = manager.get_all_metrics()
    summary = manager.get_summary()
    states = summary.get("states", {})
    waiting = states.get("PENDING", 0)
    running = states.get("RUNNING", 0)
    paused = states.get("PAUSED", 0)
    completed = states.get("COMPLETED", 0)
    avg_duration = 0.0
    completed_durations = [t.get("duration") for t in threads if t.get("duration")]
    if completed_durations:
        avg_duration = round(sum(completed_durations) / len(completed_durations), 2)

    suggestions = [
        {
            "title": "Scheduling strategy",
            "insight": (
                "Priority scheduling is recommended because urgent work is building up."
                if waiting >= 4
                else "FIFO remains stable because backlog is still controlled."
            ),
            "recommendation": "Priority" if waiting >= 4 else "FIFO",
        },
        {
            "title": "Bottleneck detection",
            "insight": (
                "Too many threads are waiting relative to active execution."
                if waiting > max(2, running + paused)
                else "No major bottleneck detected in the live thread set."
            ),
            "recommendation": (
                "Reduce long-running tasks or increase processing capacity."
                if waiting > max(2, running + paused)
                else "Current throughput is acceptable."
            ),
        },
        {
            "title": "Improvement tip",
            "insight": (
                f"Average completed runtime is {avg_duration}s."
                if avg_duration
                else "Completed thread history is still too small for a strong duration estimate."
            ),
            "recommendation": (
                "Keep active work below 8 concurrent threads for cleaner monitoring."
                if completed >= 3
                else "Run a small batch first, then tune scheduling based on observed wait time."
            ),
        },
    ]

    return {
        "generated_at": time.strftime("%H:%M:%S"),
        "current_mode": ui_config["scheduling_type"],
        "simulation_speed": ui_config["simulation_speed"],
        "suggestions": suggestions,
    }


# ─── Demo Worker Functions ────────────────────────────────────────────────────

def cpu_task(duration: float = 2.0, pause_event=None, stop_event=None, **_):
    """Simulates a CPU-bound workload with pause/stop support."""
    end = time.time() + duration
    while time.time() < end:
        if stop_event and stop_event.is_set():
            return "STOPPED"
        if pause_event:
            pause_event.wait()
        _ = sum(i * i for i in range(500))
        time.sleep(0.05)
    return f"Finished after {duration:.1f}s"


def io_task(steps: int = 5, pause_event=None, stop_event=None, **_):
    """Simulates I/O-bound workload (e.g. file/network operations)."""
    for i in range(steps):
        if stop_event and stop_event.is_set():
            return "STOPPED"
        if pause_event:
            pause_event.wait()
        time.sleep(random.uniform(0.2, 0.6))
    return f"IO done ({steps} steps)"


def pool_worker(n: int = 100, **_):
    """Simple computation for pool demo."""
    return sum(i ** 2 for i in range(n))


def timed_pool_worker(delay: float = 1.0, step: float = 0.05, stop_event=None, **_):
    """Pool worker that supports cooperative timeout cancellation."""
    end = time.time() + delay
    while time.time() < end:
        if stop_event and stop_event.is_set():
            return f"STOPPED after timeout at {round(delay, 2)}s target"
        time.sleep(step)
    return f"Slept for {round(delay, 2)}s"


# ─── Thread Endpoints ─────────────────────────────────────────────────────────

@app.route("/api/threads", methods=["GET"])
def list_threads():
    return jsonify(manager.get_all_metrics())


@app.route("/api/summary", methods=["GET"])
def summary():
    return jsonify(manager.get_summary())


@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(ui_config)


@app.route("/api/config", methods=["POST"])
def update_config():
    data = request.json or {}
    scheduling_type = str(data.get("scheduling_type", ui_config["scheduling_type"])).upper()
    simulation_speed = str(data.get("simulation_speed", ui_config["simulation_speed"])).title()

    if scheduling_type not in {"FIFO", "PRIORITY"}:
        return error_response("Invalid scheduling type.", 400)

    if simulation_speed not in {"Slow", "Normal", "Fast"}:
        return error_response("Invalid simulation speed.", 400)

    ui_config["scheduling_type"] = scheduling_type
    ui_config["simulation_speed"] = simulation_speed
    return jsonify({"message": "Configuration updated.", **ui_config})


@app.route("/api/ai/suggestions", methods=["GET"])
def ai_suggestions():
    return jsonify(build_ai_suggestions())


@app.route("/api/system/reset", methods=["POST"])
def reset_system():
    terminated = manager.bulk_action("terminate")
    time.sleep(0.1)
    cleaned = manager.cleanup_done()
    return jsonify({
        "message": "System reset completed.",
        "terminated": terminated,
        "cleaned": cleaned,
    })


@app.route("/api/threads/<tid>", methods=["GET"])
def thread_details(tid):
    try:
        return jsonify(manager.get_thread_details(tid))
    except ValueError as exc:
        return error_response(str(exc), 404)


@app.route("/api/threads/create", methods=["POST"])
def create_thread():
    data = request.json or {}
    kind = data.get("kind", "cpu")
    name = data.get("name", f"Thread-{kind.upper()}")
    priority = int(data.get("priority", 5))
    duration = float(data.get("duration", 3.0))
    steps = int(data.get("steps", 5))

    target = cpu_task if kind == "cpu" else io_task
    kwargs = {"duration": duration} if kind == "cpu" else {"steps": steps}

    tid = manager.create_thread(name, target, kwargs=kwargs, priority=priority)
    manager.start_thread(tid)
    return jsonify({"thread_id": tid, "message": f"Thread '{name}' started."})


@app.route("/api/threads/<tid>/pause", methods=["POST"])
def pause_thread(tid):
    try:
        manager.pause_thread(tid)
        return jsonify({"message": f"Thread {tid} paused."})
    except ValueError as exc:
        return error_response(str(exc), 404)


@app.route("/api/threads/<tid>/resume", methods=["POST"])
def resume_thread(tid):
    try:
        manager.resume_thread(tid)
        return jsonify({"message": f"Thread {tid} resumed."})
    except ValueError as exc:
        return error_response(str(exc), 404)


@app.route("/api/threads/<tid>/terminate", methods=["POST"])
def terminate_thread(tid):
    try:
        manager.terminate_thread(tid)
        return jsonify({"message": f"Thread {tid} terminated."})
    except ValueError as exc:
        return error_response(str(exc), 404)


@app.route("/api/threads/bulk", methods=["POST"])
def bulk_threads():
    action = (request.json or {}).get("action", "").strip().lower()
    if action not in {"pause", "resume", "terminate", "cleanup"}:
        return error_response("Invalid bulk action.", 400)
    count = manager.bulk_action(action)
    return jsonify({"message": f"Bulk action '{action}' applied to {count} threads.", "count": count})


@app.route("/api/threads/cleanup", methods=["POST"])
def cleanup():
    n = manager.cleanup_done()
    return jsonify({"message": f"Cleaned up {n} finished threads."})


# ─── Thread Pool Endpoints ────────────────────────────────────────────────────

@app.route("/api/pool/submit", methods=["POST"])
def pool_submit():
    data = request.json or {}
    n = int(data.get("n", 100))
    count = int(data.get("count", 5))
    priority = int(data.get("priority", 5))
    timeout_seconds = data.get("timeout_seconds")
    timeout_seconds = None if timeout_seconds in (None, "") else float(timeout_seconds)
    delay = float(data.get("delay", 0))
    worker = timed_pool_worker if delay > 0 else pool_worker
    worker_kwargs = {"delay": delay} if delay > 0 else {"n": n}
    ids = [
        manager.submit_to_pool(
            worker,
            priority=priority,
            timeout_seconds=timeout_seconds,
            **worker_kwargs,
        )
        for _ in range(count)
    ]
    timeout_label = f" with timeout {timeout_seconds}s" if timeout_seconds else ""
    return jsonify({
        "task_ids": ids,
        "message": f"Submitted {count} tasks to pool{timeout_label}.",
    })


@app.route("/api/pool/config", methods=["GET"])
def pool_config():
    stats = manager._pool.get_stats() if manager._pool else {}
    return jsonify(stats)


@app.route("/api/pool/config", methods=["POST"])
def resize_pool():
    if not manager._pool:
        return error_response("Thread pool not enabled.", 400)

    data = request.json or {}
    min_workers = data.get("min_workers")
    max_workers = data.get("max_workers")

    try:
        stats = manager.resize_pool(
            min_workers=None if min_workers is None else int(min_workers),
            max_workers=None if max_workers is None else int(max_workers),
        )
    except ValueError as exc:
        return error_response(str(exc), 400)
    except RuntimeError as exc:
        return error_response(str(exc), 400)

    return jsonify({
        "message": "Thread pool resized.",
        "pool": stats,
    })


@app.route("/api/pool/stats", methods=["GET"])
def pool_stats():
    stats = manager._pool.get_stats() if manager._pool else {}
    return jsonify(stats)


@app.route("/api/pool/tasks", methods=["GET"])
def pool_tasks():
    return jsonify(manager.get_pool_tasks())


@app.route("/api/pool/tasks/<task_id>", methods=["GET"])
def pool_task_details(task_id):
    try:
        return jsonify(manager.get_pool_task_details(task_id))
    except ValueError as exc:
        return error_response(str(exc), 404)
    except RuntimeError as exc:
        return error_response(str(exc), 400)


# ─── Stress Test ──────────────────────────────────────────────────────────────

@app.route("/api/stress", methods=["POST"])
def stress_test():
    data = request.json or {}
    profile = str(data.get("profile", "")).strip().lower()
    if profile == "medium":
        requested_count = 20
    elif profile == "high":
        requested_count = 30
    else:
        requested_count = int(data.get("count", 20))

    count = min(requested_count, 200)
    ids = []
    for i in range(count):
        kind = "cpu" if i % 2 == 0 else "io"
        target = cpu_task if kind == "cpu" else io_task
        kwargs = {"duration": random.uniform(1, 4)} if kind == "cpu" else {"steps": random.randint(3, 8)}
        priority = random.randint(1, 10)
        name = f"Stress-{kind.upper()}-{i+1}"
        tid = manager.create_thread(name, target, kwargs=kwargs, priority=priority)
        manager.start_thread(tid)
        ids.append(tid)
    return jsonify({
        "message": f"Launched {count} stress threads.",
        "thread_ids": ids,
        "profile": profile or "custom",
    })


if __name__ == "__main__":
    print("\n🚀 Thread Management API running at http://localhost:5000\n")
    app.run(debug=True, port=5000, threaded=True)
