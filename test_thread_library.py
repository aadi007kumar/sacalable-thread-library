import threading
import time
import unittest

from app import app, manager
from thread_library import ThreadPool


def wait_for(predicate, timeout=3.0, interval=0.05):
    end = time.time() + timeout
    while time.time() < end:
        if predicate():
            return True
        time.sleep(interval)
    return predicate()


class ThreadPoolTests(unittest.TestCase):
    def test_pool_can_resize_limits_at_runtime(self):
        pool = ThreadPool(min_workers=1, max_workers=2)
        blocker = threading.Event()

        def blocking_task():
            blocker.wait(1.5)
            return "done"

        try:
            for _ in range(3):
                pool.submit(blocking_task)

            self.assertTrue(
                wait_for(lambda: pool.get_stats()["workers"] >= 2),
                "pool did not scale up to available capacity",
            )

            stats = pool.resize(min_workers=2, max_workers=4)
            self.assertEqual(stats["min_workers"], 2)
            self.assertEqual(stats["max_workers"], 4)
            self.assertGreaterEqual(stats["workers"], 2)
        finally:
            blocker.set()
            wait_for(lambda: pool.get_stats()["active_tasks"] == 0)
            pool.shutdown()

    def test_pool_marks_task_as_timed_out(self):
        pool = ThreadPool(min_workers=1, max_workers=1)

        def slow_task(delay=0.3, stop_event=None):
            end = time.time() + delay
            while time.time() < end:
                if stop_event and stop_event.is_set():
                    return "stopped"
                time.sleep(0.01)
            return "finished"

        try:
            task_id = pool.submit(slow_task, delay=0.3, timeout_seconds=0.05)
            self.assertTrue(wait_for(lambda: pool.get_result(task_id) is not None))
            result = pool.get_result(task_id)
            self.assertEqual(result["status"], "timed_out")

            details = pool.get_task_details(task_id)
            self.assertEqual(details["status"], "timed_out")
            self.assertEqual(pool.get_stats()["timed_out"], 1)
        finally:
            wait_for(lambda: pool.get_stats()["active_tasks"] == 0)
            pool.shutdown()


class StressEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        manager.bulk_action("terminate")
        time.sleep(0.1)
        manager.cleanup_done()

    def tearDown(self):
        manager.bulk_action("terminate")
        time.sleep(0.1)
        manager.cleanup_done()

    def test_stress_profile_medium_launches_20_threads(self):
        response = self.client.post("/api/stress", json={"profile": "medium"})
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(len(payload["thread_ids"]), 20)
        self.assertEqual(payload["profile"], "medium")

    def test_stress_profile_high_launches_30_threads(self):
        response = self.client.post("/api/stress", json={"profile": "high"})
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(len(payload["thread_ids"]), 30)
        self.assertEqual(payload["profile"], "high")


if __name__ == "__main__":
    unittest.main()
