"""
Scalable Thread Management Library
===================================
A high-performance thread management library supporting efficient creation,
synchronization, and termination of thousands of concurrent threads.
"""

import inspect
import threading
import time
import uuid
import logging
import queue
from enum import Enum
from dataclasses import dataclass
from typing import Callable, Optional, Dict, List, Any
from contextlib import contextmanager

logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
logger = logging.getLogger(__name__)


class ThreadState(Enum):
    PENDING   = "PENDING"
    RUNNING   = "RUNNING"
    PAUSED    = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED    = "FAILED"
    TERMINATED = "TERMINATED"


@dataclass
class ThreadMetrics:
    thread_id: str
    name: str
    state: str
    created_time: Optional[float] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    cpu_time: float = 0.0
    error: Optional[str] = None
    result: Any = None
    priority: int = 5

    @property
    def duration(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return round(self.end_time - self.start_time, 4)
        elif self.start_time:
            return round(time.time() - self.start_time, 4)
        return None


class ManagedThread:
    """A wrapper around threading.Thread with lifecycle management."""

    def __init__(self, thread_id: str, name: str, target: Callable,
                 args=(), kwargs=None, priority: int = 5, daemon: bool = True):
        self.thread_id = thread_id
        self.name = name
        self.priority = priority
        self._target = target
        self._args = args
        self._kwargs = kwargs or {}
        self._state = ThreadState.PENDING
        self._lock = threading.Lock()
        self._pause_event = threading.Event()
        self._pause_event.set()  # Not paused by default
        self._stop_event = threading.Event()
        self.result = None
        self.error = None
        self.created_time = time.time()
        self.start_time = None
        self.end_time = None
        self._state_history = []
        self._record_state(ThreadState.PENDING)

        self._thread = threading.Thread(
            target=self._run_wrapper,
            name=name,
            daemon=daemon
        )

    def _record_state(self, state: ThreadState):
        self._state_history.append({
            "state": state.value,
            "time": round(time.time(), 4),
        })

    def _set_state(self, state: ThreadState):
        with self._lock:
            changed = self._state != state
            self._state = state
            if changed:
                self._record_state(state)

    def _run_wrapper(self):
        self.start_time = time.time()
        self._set_state(ThreadState.RUNNING)
        try:
            self.result = self._target(*self._args, **self._kwargs,
                                       pause_event=self._pause_event,
                                       stop_event=self._stop_event)
            if self.state != ThreadState.TERMINATED:
                self._set_state(ThreadState.COMPLETED)
        except Exception as e:
            self.error = str(e)
            self._set_state(ThreadState.FAILED)
            logger.error(f"Thread '{self.name}' failed: {e}")
        finally:
            self.end_time = time.time()

    def start(self):
        self._thread.start()

    def pause(self):
        if self.state == ThreadState.RUNNING:
            self._pause_event.clear()
            self._set_state(ThreadState.PAUSED)

    def resume(self):
        if self.state == ThreadState.PAUSED:
            self._pause_event.set()
            self._set_state(ThreadState.RUNNING)

    def terminate(self):
        self._stop_event.set()
        self._pause_event.set()  # Unblock if paused
        self._set_state(ThreadState.TERMINATED)

    def join(self, timeout=None):
        self._thread.join(timeout=timeout)

    @property
    def state(self) -> ThreadState:
        with self._lock:
            return self._state

    def get_metrics(self) -> ThreadMetrics:
        return ThreadMetrics(
            thread_id=self.thread_id,
            name=self.name,
            state=self.state.value,
            created_time=self.created_time,
            start_time=self.start_time,
            end_time=self.end_time,
            error=self.error,
            result=str(self.result) if self.result is not None else None,
            priority=self.priority
        )

    def get_details(self) -> Dict[str, Any]:
        metrics = self.get_metrics().__dict__.copy()
        metrics.update({
            "target": getattr(self._target, "__name__", "unknown"),
            "args": [str(arg) for arg in self._args],
            "kwargs": {key: str(value) for key, value in self._kwargs.items()},
            "state_history": list(self._state_history),
            "is_alive": self._thread.is_alive(),
        })
        return metrics


class ThreadPool:
    """Scalable thread pool with task queue and worker management."""

    def __init__(self, min_workers: int = 4, max_workers: int = 100):
        if min_workers < 1:
            raise ValueError("min_workers must be at least 1.")
        if max_workers < min_workers:
            raise ValueError("max_workers must be greater than or equal to min_workers.")

        self.min_workers = min_workers
        self.max_workers = max_workers
        self._task_queue: queue.PriorityQueue = queue.PriorityQueue()
        self._workers: List[threading.Thread] = []
        self._active_tasks = 0
        self._lock = threading.Lock()
        self._shutdown = threading.Event()
        self._tasks_completed = 0
        self._tasks_failed = 0
        self._tasks_timed_out = 0
        self._results: Dict[str, Any] = {}
        self._task_history: List[Dict[str, Any]] = []
        self._peak_workers = 0
        self._worker_idle_timeout = 1.0
        self._desired_workers = min_workers
        self._start_workers(min_workers)

    def _find_task_record(self, task_id: str) -> Optional[Dict[str, Any]]:
        for task in self._task_history:
            if task["task_id"] == task_id:
                return task
        return None

    def _prune_dead_workers_locked(self):
        self._workers = [worker for worker in self._workers if worker.is_alive()]

    def _refresh_desired_workers_locked(self):
        self._desired_workers = max(self.min_workers, min(self._desired_workers, self.max_workers))

    def _start_workers(self, count: int):
        if count <= 0:
            return
        with self._lock:
            self._prune_dead_workers_locked()
            capacity = self.max_workers - len(self._workers)
            count = min(count, capacity)
            new_workers = []
            for _ in range(count):
                t = threading.Thread(
                    target=self._worker_loop,
                    name=f"PoolWorker-{len(self._workers) + len(new_workers) + 1}",
                    daemon=True,
                )
                t.start()
                new_workers.append(t)
            self._workers.extend(new_workers)
            self._peak_workers = max(self._peak_workers, len(self._workers))

    def _scale_up_if_needed(self):
        with self._lock:
            self._prune_dead_workers_locked()
            queued_tasks = self._task_queue.qsize()
            current_workers = len(self._workers)
            desired_workers = min(
                self.max_workers,
                max(self.min_workers, self._desired_workers, self._active_tasks + queued_tasks),
            )
            workers_to_add = desired_workers - current_workers
        if workers_to_add > 0:
            self._start_workers(workers_to_add)

    def _retire_current_worker_locked(self):
        current = threading.current_thread()
        self._workers = [worker for worker in self._workers if worker is not current]

    def _worker_loop(self):
        while not self._shutdown.is_set():
            try:
                priority, task_id, fn, args, kwargs, timeout_seconds = self._task_queue.get(
                    timeout=self._worker_idle_timeout
                )
                with self._lock:
                    self._active_tasks += 1
                    task = self._find_task_record(task_id)
                    if task:
                        task["status"] = "running"
                        task["started_at"] = round(time.time(), 4)
                        task["worker_name"] = threading.current_thread().name
                try:
                    outcome = self._execute_task(fn, args, kwargs, timeout_seconds)
                    self._results[task_id] = outcome
                    with self._lock:
                        task = self._find_task_record(task_id)
                        if outcome["status"] == "success":
                            self._tasks_completed += 1
                            if task:
                                task["status"] = "success"
                                task["completed_at"] = round(time.time(), 4)
                                task["result"] = str(outcome["result"])
                        elif outcome["status"] == "timed_out":
                            self._tasks_timed_out += 1
                            if task:
                                task["status"] = "timed_out"
                                task["completed_at"] = round(time.time(), 4)
                                task["error"] = outcome["error"]
                        else:
                            self._tasks_failed += 1
                            if task:
                                task["status"] = "failed"
                                task["completed_at"] = round(time.time(), 4)
                                task["error"] = outcome["error"]
                except Exception as e:
                    self._results[task_id] = {"status": "failed", "error": str(e)}
                    with self._lock:
                        self._tasks_failed += 1
                        task = self._find_task_record(task_id)
                        if task:
                            task["status"] = "failed"
                            task["completed_at"] = round(time.time(), 4)
                            task["error"] = str(e)
                finally:
                    with self._lock:
                        self._active_tasks -= 1
                    self._task_queue.task_done()
            except queue.Empty:
                with self._lock:
                    self._prune_dead_workers_locked()
                    if len(self._workers) > max(self.min_workers, self._desired_workers):
                        self._retire_current_worker_locked()
                        return
                continue

    def _execute_task(self, fn: Callable, args: Any, kwargs: Dict[str, Any], timeout_seconds: Optional[float]):
        if not timeout_seconds or timeout_seconds <= 0:
            return self._run_task_direct(fn, args, kwargs)
        return self._run_task_with_timeout(fn, args, kwargs, timeout_seconds)

    def _run_task_direct(self, fn: Callable, args: Any, kwargs: Dict[str, Any]):
        result = fn(*args, **kwargs)
        return {"status": "success", "result": result}

    def _run_task_with_timeout(self, fn: Callable, args: Any, kwargs: Dict[str, Any], timeout_seconds: float):
        result_holder: Dict[str, Any] = {}
        error_holder: Dict[str, str] = {}
        finished = threading.Event()
        stop_event = threading.Event()
        call_kwargs = dict(kwargs)

        try:
            parameters = inspect.signature(fn).parameters
            if "stop_event" in parameters and "stop_event" not in call_kwargs:
                call_kwargs["stop_event"] = stop_event
        except (TypeError, ValueError):
            pass

        def run():
            try:
                result_holder["result"] = fn(*args, **call_kwargs)
            except Exception as exc:
                error_holder["error"] = str(exc)
            finally:
                finished.set()

        task_thread = threading.Thread(target=run, name=f"PoolTask-{uuid.uuid4().hex[:8]}", daemon=True)
        task_thread.start()
        if finished.wait(timeout_seconds):
            if "error" in error_holder:
                return {"status": "failed", "error": error_holder["error"]}
            return {"status": "success", "result": result_holder.get("result")}

        stop_event.set()
        return {
            "status": "timed_out",
            "error": f"Task exceeded timeout of {timeout_seconds}s.",
            "timeout_seconds": timeout_seconds,
        }

    def submit(self, fn: Callable, *args, priority: int = 5, timeout_seconds: Optional[float] = None, **kwargs) -> str:
        task_id = str(uuid.uuid4())[:8]
        with self._lock:
            self._task_history.append({
                "task_id": task_id,
                "fn": getattr(fn, "__name__", "anonymous"),
                "priority": priority,
                "args": [str(arg) for arg in args],
                "kwargs": {key: str(value) for key, value in kwargs.items()},
                "timeout_seconds": timeout_seconds,
                "status": "queued",
                "submitted_at": round(time.time(), 4),
            })
            self._task_history = self._task_history[-100:]
        self._task_queue.put((priority, task_id, fn, args, kwargs, timeout_seconds))
        self._scale_up_if_needed()
        return task_id

    def get_result(self, task_id: str) -> Optional[Dict]:
        return self._results.get(task_id)

    def get_task_details(self, task_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            task = self._find_task_record(task_id)
            if not task:
                return None
            details = dict(task)
            result = self._results.get(task_id, {})
            details.update(result)
            return details

    def shutdown(self, wait: bool = True):
        self._shutdown.set()
        if wait:
            for w in self._workers:
                w.join(timeout=2)

    def resize(self, min_workers: Optional[int] = None, max_workers: Optional[int] = None) -> Dict[str, int]:
        with self._lock:
            next_min = self.min_workers if min_workers is None else min_workers
            next_max = self.max_workers if max_workers is None else max_workers
            if next_min < 1:
                raise ValueError("min_workers must be at least 1.")
            if next_max < next_min:
                raise ValueError("max_workers must be greater than or equal to min_workers.")
            self.min_workers = next_min
            self.max_workers = next_max
            self._refresh_desired_workers_locked()
            self._desired_workers = max(self.min_workers, min(self._desired_workers, self.max_workers))
            current_workers = len(self._workers)

        if current_workers < self.min_workers:
            self._start_workers(self.min_workers - current_workers)
        return self.get_stats()

    def get_stats(self) -> Dict:
        with self._lock:
            self._prune_dead_workers_locked()
            return {
                "workers": len(self._workers),
                "min_workers": self.min_workers,
                "max_workers": self.max_workers,
                "peak_workers": self._peak_workers,
                "active_tasks": self._active_tasks,
                "queued_tasks": self._task_queue.qsize(),
                "completed": self._tasks_completed,
                "failed": self._tasks_failed,
                "timed_out": self._tasks_timed_out,
            }

    def get_task_history(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(reversed(self._task_history))


class Barrier:
    """Reusable barrier for synchronizing multiple threads at a checkpoint."""

    def __init__(self, parties: int):
        self._parties = parties
        self._count = 0
        self._lock = threading.Lock()
        self._event = threading.Event()
        self._generation = 0

    def wait(self, timeout=None) -> bool:
        with self._lock:
            gen = self._generation
            self._count += 1
            if self._count == self._parties:
                self._count = 0
                self._generation += 1
                self._event.set()
                self._event = threading.Event()
                return True
        return self._event.wait(timeout=timeout)


class ReadWriteLock:
    """A readers-writer lock: multiple readers or one writer at a time."""

    def __init__(self):
        self._read_ready = threading.Condition(threading.Lock())
        self._readers = 0

    @contextmanager
    def read_lock(self):
        with self._read_ready:
            self._readers += 1
        try:
            yield
        finally:
            with self._read_ready:
                self._readers -= 1
                if self._readers == 0:
                    self._read_ready.notify_all()

    @contextmanager
    def write_lock(self):
        with self._read_ready:
            while self._readers > 0:
                self._read_ready.wait()
            yield


class ThreadManager:
    """
    Central manager for all thread lifecycle operations.
    Supports creation, monitoring, synchronization, and termination.
    """

    def __init__(self, max_threads: int = 1000):
        self.max_threads = max_threads
        self._threads: Dict[str, ManagedThread] = {}
        self._lock = threading.Lock()
        self._pool: Optional[ThreadPool] = None
        self._barriers: Dict[str, Barrier] = {}
        self._rw_locks: Dict[str, ReadWriteLock] = {}
        self._event_log: List[Dict] = []

    def _log(self, message: str, level: str = "INFO"):
        entry = {"time": time.strftime("%H:%M:%S"), "level": level, "message": message}
        self._event_log.append(entry)
        if len(self._event_log) > 200:
            self._event_log.pop(0)

    def create_thread(self, name: str, target: Callable,
                      args=(), kwargs=None, priority: int = 5) -> str:
        with self._lock:
            if len(self._threads) >= self.max_threads:
                raise RuntimeError(f"Thread limit ({self.max_threads}) reached.")
            thread_id = str(uuid.uuid4())[:8]
            mt = ManagedThread(thread_id, name, target, args, kwargs or {}, priority)
            self._threads[thread_id] = mt
            self._log(f"Created thread '{name}' (ID: {thread_id})")
            return thread_id

    def start_thread(self, thread_id: str):
        with self._lock:
            t = self._threads.get(thread_id)
        if not t:
            raise ValueError(f"Thread {thread_id} not found.")
        t.start()
        self._log(f"Started thread '{t.name}' (ID: {thread_id})")

    def pause_thread(self, thread_id: str):
        with self._lock:
            t = self._threads.get(thread_id)
        if not t:
            raise ValueError(f"Thread {thread_id} not found.")
        t.pause()
        self._log(f"Paused thread '{t.name}'")

    def resume_thread(self, thread_id: str):
        with self._lock:
            t = self._threads.get(thread_id)
        if not t:
            raise ValueError(f"Thread {thread_id} not found.")
        t.resume()
        self._log(f"Resumed thread '{t.name}'")

    def terminate_thread(self, thread_id: str):
        with self._lock:
            t = self._threads.get(thread_id)
        if not t:
            raise ValueError(f"Thread {thread_id} not found.")
        t.terminate()
        self._log(f"Terminated thread '{t.name}'", "WARNING")

    def get_all_metrics(self) -> List[Dict]:
        with self._lock:
            threads = list(self._threads.values())
        return [t.get_metrics().__dict__ for t in threads]

    def get_summary(self) -> Dict:
        metrics = self.get_all_metrics()
        states = {}
        for m in metrics:
            s = m["state"]
            states[s] = states.get(s, 0) + 1
        running = [m for m in metrics if m["state"] == ThreadState.RUNNING.value]
        finished = [m for m in metrics if m["state"] in (
            ThreadState.COMPLETED.value,
            ThreadState.FAILED.value,
            ThreadState.TERMINATED.value,
        )]
        pool_stats = self._pool.get_stats() if self._pool else {}
        return {
            "total_threads": len(metrics),
            "states": states,
            "live_threads": len(running),
            "finished_threads": len(finished),
            "pool": pool_stats,
            "event_log": self._event_log[-20:],
        }

    def enable_pool(self, min_workers=4, max_workers=50):
        self._pool = ThreadPool(min_workers, max_workers)
        self._log(f"Thread pool enabled ({min_workers}-{max_workers} workers)")

    def resize_pool(self, min_workers: Optional[int] = None, max_workers: Optional[int] = None) -> Dict[str, Any]:
        if not self._pool:
            raise RuntimeError("Thread pool not enabled.")
        stats = self._pool.resize(min_workers=min_workers, max_workers=max_workers)
        self._log(
            f"Thread pool resized to min={stats['min_workers']} max={stats['max_workers']} "
            f"with {stats['workers']} active workers"
        )
        return stats

    def submit_to_pool(self, fn: Callable, *args, priority=5, timeout_seconds: Optional[float] = None, **kwargs) -> str:
        if not self._pool:
            raise RuntimeError("Thread pool not enabled.")
        return self._pool.submit(fn, *args, priority=priority, timeout_seconds=timeout_seconds, **kwargs)

    def get_pool_tasks(self) -> List[Dict[str, Any]]:
        if not self._pool:
            return []
        return self._pool.get_task_history()

    def get_pool_task_details(self, task_id: str) -> Dict[str, Any]:
        if not self._pool:
            raise RuntimeError("Thread pool not enabled.")
        details = self._pool.get_task_details(task_id)
        if not details:
            raise ValueError(f"Pool task {task_id} not found.")
        return details

    def get_thread_details(self, thread_id: str) -> Dict[str, Any]:
        with self._lock:
            thread = self._threads.get(thread_id)
        if not thread:
            raise ValueError(f"Thread {thread_id} not found.")
        return thread.get_details()

    def create_barrier(self, name: str, parties: int) -> str:
        self._barriers[name] = Barrier(parties)
        self._log(f"Barrier '{name}' created for {parties} threads")
        return name

    def cleanup_done(self):
        with self._lock:
            done = [tid for tid, t in self._threads.items()
                    if t.state in (ThreadState.COMPLETED, ThreadState.FAILED, ThreadState.TERMINATED)]
            for tid in done:
                del self._threads[tid]
        self._log(f"Cleaned up {len(done)} finished threads")
        return len(done)

    def bulk_action(self, action: str) -> int:
        with self._lock:
            threads = list(self._threads.values())

        count = 0
        for thread in threads:
            if action == "pause" and thread.state == ThreadState.RUNNING:
                thread.pause()
                count += 1
            elif action == "resume" and thread.state == ThreadState.PAUSED:
                thread.resume()
                count += 1
            elif action == "terminate" and thread.state in (
                ThreadState.PENDING,
                ThreadState.RUNNING,
                ThreadState.PAUSED,
            ):
                thread.terminate()
                count += 1

        if action == "cleanup":
            return self.cleanup_done()

        self._log(f"Bulk action '{action}' applied to {count} threads")
        return count

    def shutdown(self):
        with self._lock:
            for t in self._threads.values():
                t.terminate()
        if self._pool:
            self._pool.shutdown()
        self._log("ThreadManager shut down.", "WARNING")
