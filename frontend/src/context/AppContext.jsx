import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const AppContext = createContext(null);

const initialState = {
  totals: { total: 0, active: 0, completed: 0, waiting: 0, completionRate: 0 },
  threads: [],
  analytics: {
    totalExecutionTime: 0,
    throughput: 0,
    averageWaitTime: 0,
    runtimeSeconds: 0,
    priorityBreakdown: [],
    stateBreakdown: [],
    timeline: [],
  },
  suggestions: { generatedAt: null, suggestions: [] },
  settings: { schedulingType: "FIFO", simulationSpeed: 1 },
  scheduler: { isRunning: false, currentThreadId: null },
  activityLog: [],
  loading: true,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: state.threads.length === 0, error: null };
    case "FETCH_SUCCESS":
      return {
        ...state,
        ...action.payload,
        loading: false,
        error: null,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
}

async function request(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const pollRef = useRef(null);

  const refresh = async () => {
    dispatch({ type: "FETCH_START" });

    try {
      const payload = await request("/state");
      dispatch({ type: "FETCH_SUCCESS", payload });
    } catch (error) {
      dispatch({
        type: "FETCH_ERROR",
        payload: error.message || "Unable to reach backend",
      });
    }
  };

  useEffect(() => {
    refresh();
    pollRef.current = window.setInterval(refresh, 1500);

    return () => window.clearInterval(pollRef.current);
  }, []);

  const actions = useMemo(
    () => ({
      refresh,
      createThread: async (payload) => {
        await request("/threads", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        await refresh();
      },
      startScheduler: async () => {
        await request("/scheduler/start", { method: "POST" });
        await refresh();
      },
      pauseScheduler: async () => {
        await request("/scheduler/pause", { method: "POST" });
        await refresh();
      },
      resetSimulation: async () => {
        await request("/scheduler/reset", { method: "POST" });
        await refresh();
      },
      updateSettings: async (payload) => {
        await request("/settings", {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        await refresh();
      },
      resetSystem: async () => {
        await request("/system/reset", { method: "POST" });
        await refresh();
      },
    }),
    []
  );

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }

  return context;
}
