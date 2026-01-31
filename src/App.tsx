import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { FoodProvider } from "@/contexts/FoodContext";
import Index from "./pages/Index";
import DonorLogin from "./pages/DonorLogin";
import DonorSignup from "./pages/DonorSignup";
import DonorDashboard from "./pages/DonorDashboard";
import ReceiverLogin from "./pages/ReceiverLogin";
import ReceiverSignup from "./pages/ReceiverSignup";
import ReceiverDashboard from "./pages/ReceiverDashboard";
import NotFound from "./pages/NotFound";
import DonorPostFood from './pages/DonorPostFood'
import TestPage from './pages/TestPage'

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FoodProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/donor/login" element={<DonorLogin />} />
              <Route path="/donor/signup" element={<DonorSignup />} />
              <Route path="/donor/dashboard" element={<DonorDashboard />} />
              <Route path="/receiver/login" element={<ReceiverLogin />} />
              <Route path="/receiver/signup" element={<ReceiverSignup />} />
              <Route path="/receiver/dashboard" element={<ReceiverDashboard />} />
              <Route path="/donor/post-food" element={<DonorPostFood />} />
              <Route path="/test-db" element={<TestPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FoodProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
