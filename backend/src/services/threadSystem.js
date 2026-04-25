const PRIORITY_WEIGHTS = {
  low: 1,
  medium: 2,
  high: 3,
};

const DEFAULT_SETTINGS = {
  schedulingType: "FIFO",
  simulationSpeed: 1,
};

const ACTIVITY_LIMIT = 16;

const formatStatus = (status) =>
  status.charAt(0).toUpperCase() + status.slice(1);

export class ThreadSystem {
  constructor() {
    this.resetSystem();
  }

  resetSystem() {
    this.threads = [];
    this.activityLog = [];
    this.settings = { ...DEFAULT_SETTINGS };
    this.nextId = 1;
    this.createdOrder = 1;
    this.currentThreadId = null;
    this.scheduler = {
      isRunning: false,
      startedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
    };

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.log("System reset", "All thread data and simulation metrics were cleared.");
  }

  resetSimulation() {
    this.stopInterval();
    this.currentThreadId = null;
    this.scheduler.isRunning = false;
    this.scheduler.startedAt = null;
    this.scheduler.pausedAt = null;
    this.scheduler.totalPausedMs = 0;

    this.threads = this.threads.map((thread) => ({
      ...thread,
      status: "waiting",
      remainingTime: thread.initialDuration,
      startedAt: null,
      completedAt: null,
      executionTime: 0,
      waitTime: 0,
    }));

    this.log("Simulation reset", "All threads returned to the waiting queue.");
  }

  stopInterval() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  log(title, detail) {
    this.activityLog.unshift({
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      detail,
      timestamp: new Date().toISOString(),
    });

    this.activityLog = this.activityLog.slice(0, ACTIVITY_LIMIT);
  }

  normalizeDuration(duration) {
    const numeric = Number(duration);
    if (!Number.isFinite(numeric)) {
      return 6;
    }

    return Math.max(2, Math.min(20, Math.round(numeric)));
  }

  createThread(payload = {}) {
    const duration = this.normalizeDuration(payload.duration);
    const priority = ["low", "medium", "high"].includes(payload.priority)
      ? payload.priority
      : "medium";

    const thread = {
      id: `TH-${String(this.nextId++).padStart(3, "0")}`,
      name: payload.name?.trim() || `Thread ${this.nextId - 1}`,
      priority,
      status: "waiting",
      initialDuration: duration,
      remainingTime: duration,
      executionTime: 0,
      waitTime: 0,
      createdAt: new Date().toISOString(),
      createdOrder: this.createdOrder++,
      startedAt: null,
      completedAt: null,
    };

    this.threads.push(thread);
    this.log(
      "Thread queued",
      `${thread.name} was added with ${priority} priority and ${duration}s workload.`
    );

    return thread;
  }

  getThreadById(threadId) {
    return this.threads.find((thread) => thread.id === threadId);
  }

  setSettings(partialSettings = {}) {
    const nextSchedulingType =
      partialSettings.schedulingType === "Priority" ? "Priority" : "FIFO";
    const nextSpeed = Number(partialSettings.simulationSpeed);

    this.settings = {
      schedulingType: nextSchedulingType,
      simulationSpeed: Number.isFinite(nextSpeed)
        ? Math.max(1, Math.min(4, nextSpeed))
        : this.settings.simulationSpeed,
    };

    this.log(
      "Settings updated",
      `Scheduling is now ${this.settings.schedulingType} with ${this.settings.simulationSpeed}x speed.`
    );
  }

  getWaitingThreads() {
    return this.threads
      .filter((thread) => thread.status === "waiting")
      .sort((left, right) => {
        if (this.settings.schedulingType === "Priority") {
          const priorityGap =
            PRIORITY_WEIGHTS[right.priority] - PRIORITY_WEIGHTS[left.priority];

          if (priorityGap !== 0) {
            return priorityGap;
          }
        }

        return left.createdOrder - right.createdOrder;
      });
  }

  startScheduler() {
    if (this.scheduler.isRunning) {
      return this.getState();
    }

    this.scheduler.isRunning = true;
    if (!this.scheduler.startedAt) {
      this.scheduler.startedAt = Date.now();
    }

    if (this.scheduler.pausedAt) {
      this.scheduler.totalPausedMs += Date.now() - this.scheduler.pausedAt;
      this.scheduler.pausedAt = null;
    }

    this.stopInterval();
    this.interval = setInterval(() => this.tick(), 1000);
    this.log("Scheduler started", "Simulation resumed.");

    return this.getState();
  }

  pauseScheduler() {
    if (!this.scheduler.isRunning) {
      return this.getState();
    }

    this.scheduler.isRunning = false;
    this.scheduler.pausedAt = Date.now();
    this.stopInterval();
    this.log("Scheduler paused", "Execution was paused by the operator.");

    return this.getState();
  }

  tick() {
    if (!this.scheduler.isRunning) {
      return;
    }

    let runningThread = this.currentThreadId
      ? this.getThreadById(this.currentThreadId)
      : null;

    if (!runningThread || runningThread.status !== "running") {
      const nextThread = this.getWaitingThreads()[0];
      if (!nextThread) {
        this.pauseScheduler();
        return;
      }

      nextThread.status = "running";
      nextThread.startedAt = nextThread.startedAt || new Date().toISOString();
      nextThread.waitTime = Math.max(
        0,
        Math.round((Date.now() - new Date(nextThread.createdAt).getTime()) / 1000)
      );
      this.currentThreadId = nextThread.id;
      runningThread = nextThread;
      this.log(
        "Thread dispatched",
        `${runningThread.name} is now running under ${this.settings.schedulingType} scheduling.`
      );
    }

    const executionStep = this.settings.simulationSpeed;
    runningThread.executionTime += executionStep;
    runningThread.remainingTime = Math.max(
      0,
      runningThread.remainingTime - executionStep
    );

    if (runningThread.remainingTime === 0) {
      runningThread.status = "completed";
      runningThread.completedAt = new Date().toISOString();
      this.currentThreadId = null;
      this.log(
        "Thread completed",
        `${runningThread.name} finished in ${runningThread.executionTime}s.`
      );
    }
  }

  getTotals() {
    const total = this.threads.length;
    const active = this.threads.filter((thread) => thread.status === "running").length;
    const completed = this.threads.filter((thread) => thread.status === "completed").length;
    const waiting = this.threads.filter((thread) => thread.status === "waiting").length;
    const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

    return {
      total,
      active,
      completed,
      waiting,
      completionRate,
    };
  }

  getAnalytics() {
    const completedThreads = this.threads.filter(
      (thread) => thread.status === "completed"
    );
    const totalExecutionTime = completedThreads.reduce(
      (sum, thread) => sum + thread.executionTime,
      0
    );
    const averageWaitTime =
      completedThreads.length === 0
        ? 0
        : Number(
            (
              completedThreads.reduce((sum, thread) => sum + thread.waitTime, 0) /
              completedThreads.length
            ).toFixed(1)
          );

    const runtimeSeconds = this.scheduler.startedAt
      ? Math.max(
          1,
          Math.round(
            (Date.now() -
              this.scheduler.startedAt -
              this.scheduler.totalPausedMs -
              (this.scheduler.pausedAt
                ? Date.now() - this.scheduler.pausedAt
                : 0)) /
              1000
          )
        )
      : 0;

    const throughput =
      runtimeSeconds === 0
        ? 0
        : Number((completedThreads.length / runtimeSeconds).toFixed(2));

    const priorityBreakdown = ["high", "medium", "low"].map((priority) => ({
      label: priority,
      value: this.threads.filter((thread) => thread.priority === priority).length,
    }));

    const stateBreakdown = ["waiting", "running", "completed"].map((status) => ({
      label: formatStatus(status),
      value: this.threads.filter((thread) => thread.status === status).length,
    }));

    const timeline = this.threads
      .slice()
      .sort((left, right) => left.createdOrder - right.createdOrder)
      .map((thread) => ({
        label: thread.id,
        wait: thread.waitTime,
        execution: thread.executionTime,
      }));

    return {
      totalExecutionTime,
      throughput,
      averageWaitTime,
      runtimeSeconds,
      priorityBreakdown,
      stateBreakdown,
      timeline,
    };
  }

  getSuggestions() {
    const waitingThreads = this.threads.filter((thread) => thread.status === "waiting");
    const highPriorityWaiting = waitingThreads.filter(
      (thread) => thread.priority === "high"
    ).length;
    const totals = this.getTotals();
    const analytics = this.getAnalytics();
    const suggestions = [];

    suggestions.push({
      id: "strategy",
      title: "Scheduling strategy",
      insight:
        totals.waiting >= 4 || highPriorityWaiting >= 2
          ? "Priority scheduling would reduce backlog pressure on urgent work."
          : "FIFO remains stable because queue depth is controlled.",
      recommendation:
        totals.waiting >= 4 || highPriorityWaiting >= 2 ? "Priority" : "FIFO",
    });

    suggestions.push({
      id: "bottleneck",
      title: "Bottleneck detection",
      insight:
        totals.waiting > totals.completed + 2
          ? "Waiting threads are accumulating faster than they complete."
          : "No severe bottleneck detected in the current queue.",
      recommendation:
        totals.waiting > totals.completed + 2
          ? "Increase simulation speed or trim long-running tasks."
          : "Current throughput is acceptable.",
    });

    suggestions.push({
      id: "tuning",
      title: "Improvement tip",
      insight:
        analytics.averageWaitTime > 5
          ? `Average wait time is ${analytics.averageWaitTime}s, which is high for an interactive workload.`
          : "Average wait time is within a reasonable range.",
      recommendation:
        analytics.averageWaitTime > 5
          ? "Shorten task duration or switch to Priority for mixed criticality queues."
          : "Keep queue depth under six threads to preserve responsiveness.",
    });

    return {
      generatedAt: new Date().toISOString(),
      suggestions,
    };
  }

  getThreads() {
    const waitingLookup = new Map(
      this.getWaitingThreads().map((thread, index) => [thread.id, index + 1])
    );

    return this.threads
      .slice()
      .sort((left, right) => {
        if (left.status === "completed" && right.status !== "completed") {
          return 1;
        }

        if (left.status !== "completed" && right.status === "completed") {
          return -1;
        }

        if (left.status === "running" && right.status !== "running") {
          return -1;
        }

        if (left.status !== "running" && right.status === "running") {
          return 1;
        }

        const leftQueue = waitingLookup.get(left.id) ?? Number.MAX_SAFE_INTEGER;
        const rightQueue = waitingLookup.get(right.id) ?? Number.MAX_SAFE_INTEGER;

        if (leftQueue !== rightQueue) {
          return leftQueue - rightQueue;
        }

        return left.createdOrder - right.createdOrder;
      })
      .map((thread) => ({
        ...thread,
        queuePosition:
          thread.status === "waiting" ? waitingLookup.get(thread.id) ?? null : null,
      }));
  }

  getState() {
    return {
      totals: this.getTotals(),
      threads: this.getThreads(),
      analytics: this.getAnalytics(),
      suggestions: this.getSuggestions(),
      settings: this.settings,
      scheduler: {
        isRunning: this.scheduler.isRunning,
        currentThreadId: this.currentThreadId,
      },
      activityLog: this.activityLog,
    };
  }
}
