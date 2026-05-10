import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Chat from "./pages/Chat.tsx";
import TaxCalculator from "./pages/TaxCalculator.tsx";
import Tracker from "./pages/Tracker.tsx";
import NoticeAnalyzer from "./pages/NoticeAnalyzer.tsx";
import ITRHelper from "./pages/ITRHelper.tsx";
import Tools from "./pages/Tools.tsx";
import Updates from "./pages/Updates.tsx";
import Profile from "./pages/Profile.tsx";
import EditProfile from "./pages/settings/EditProfile.tsx";
import Notifications from "./pages/settings/Notifications.tsx";
import Privacy from "./pages/settings/Privacy.tsx";
import TaxDocuments from "./pages/settings/TaxDocuments.tsx";
import Help from "./pages/settings/Help.tsx";
import Admin from "./pages/Admin.tsx";
import History from "./pages/History.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
            <Route path="/updates" element={<ProtectedRoute><Updates /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/edit" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
            <Route path="/settings/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/settings/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
            <Route path="/settings/documents" element={<ProtectedRoute><TaxDocuments /></ProtectedRoute>} />
            <Route path="/settings/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute><TaxCalculator /></ProtectedRoute>} />
            <Route path="/tracker" element={<ProtectedRoute><Tracker /></ProtectedRoute>} />
            <Route path="/notice" element={<ProtectedRoute><NoticeAnalyzer /></ProtectedRoute>} />
            <Route path="/itr" element={<ProtectedRoute><ITRHelper /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
