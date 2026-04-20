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


def error_response(message: str, status: int = 400):
    return jsonify({"error": message}), status


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


# ─── Thread Endpoints ─────────────────────────────────────────────────────────

@app.route("/api/threads", methods=["GET"])
def list_threads():
    return jsonify(manager.get_all_metrics())


@app.route("/api/summary", methods=["GET"])
def summary():
    return jsonify(manager.get_summary())


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
    ids = [manager.submit_to_pool(pool_worker, n=n) for _ in range(count)]
    return jsonify({"task_ids": ids, "message": f"Submitted {count} tasks to pool."})


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
    count = min(int(data.get("count", 20)), 200)
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
    return jsonify({"message": f"Launched {count} stress threads.", "thread_ids": ids})


if __name__ == "__main__":
    print("\n🚀 Thread Management API running at http://localhost:5000\n")
    app.run(debug=True, port=5000, threaded=True)
