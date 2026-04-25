import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import AISuggestionsPage from "./pages/AISuggestionsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import DashboardPage from "./pages/DashboardPage";
import SchedulerSimulationPage from "./pages/SchedulerSimulationPage";
import SettingsPage from "./pages/SettingsPage";
import ThreadManagementPage from "./pages/ThreadManagementPage";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/threads" element={<ThreadManagementPage />} />
        <Route path="/scheduler" element={<SchedulerSimulationPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/ai-suggestions" element={<AISuggestionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppLayout>
  );
}
