import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Setup from "./pages/Setup";
import RequestAssociation from "./pages/RequestAssociation";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import AdminAssociations from "./pages/admin/AdminAssociations";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminAssociationRequests from "./pages/admin/AdminAssociationRequests";
import AssociationProfileView from "./pages/admin/AssociationProfileView";
import CreateAssociation from "./pages/admin/CreateAssociation";
import CreateCompany from "./pages/admin/CreateCompany";
import CreateUser from "./pages/admin/CreateUser";
import BulkUploadAssociations from "./pages/admin/BulkUploadAssociations";
import BulkUploadCompanies from "./pages/admin/BulkUploadCompanies";
import BulkUploadUsers from "./pages/admin/BulkUploadUsers";
import AssociationDashboard from "./pages/association/AssociationDashboard";
import AssociationCompanies from "./pages/association/AssociationCompanies";
import AssociationProfile from "./pages/association/AssociationProfile";
import CompanyDashboard from "./pages/company/CompanyDashboard";
import MemberDashboard from "./pages/member/MemberDashboard";
import MemberCompanies from "./pages/member/MemberCompanies";
import MemberConnections from "./pages/member/MemberConnections";
import BrowseMembers from "./pages/member/BrowseMembers";
import MemberProfile from "./pages/member/MemberProfile";
import MemberFeed from "./pages/member/MemberFeed";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route 
            path="/setup" 
            element={
              <ProtectedRoute>
                <Setup />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute>
                <UserManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/associations" 
            element={
              <ProtectedRoute>
                <AdminAssociations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/associations/:id" 
            element={
              <ProtectedRoute>
                <AssociationProfileView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/companies"
            element={
              <ProtectedRoute>
                <AdminCompanies />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/requests" 
            element={
              <ProtectedRoute>
                <AdminAssociationRequests />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/create-association" 
            element={
              <ProtectedRoute>
                <CreateAssociation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/create-company" 
            element={
              <ProtectedRoute>
                <CreateCompany />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/create-user" 
            element={
              <ProtectedRoute>
                <CreateUser />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/bulk-upload-associations" 
            element={
              <ProtectedRoute>
                <BulkUploadAssociations />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/bulk-upload-companies" 
            element={
              <ProtectedRoute>
                <BulkUploadCompanies />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/bulk-upload-users" 
            element={
              <ProtectedRoute>
                <BulkUploadUsers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/request-association" 
            element={
              <ProtectedRoute>
                <RequestAssociation />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/association" 
            element={
              <ProtectedRoute>
                <AssociationDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/association/companies" 
            element={
              <ProtectedRoute>
                <AssociationCompanies />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/association/profile" 
            element={
              <ProtectedRoute>
                <AssociationProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/company" 
            element={
              <ProtectedRoute>
                <CompanyDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/member" 
            element={
              <ProtectedRoute>
                <MemberDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/companies" 
            element={
              <ProtectedRoute>
                <MemberCompanies />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/connections" 
            element={
              <ProtectedRoute>
                <MemberConnections />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/members" 
            element={
              <ProtectedRoute>
                <BrowseMembers />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile/:userId" 
            element={
              <ProtectedRoute>
                <MemberProfile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/feed" 
            element={
              <ProtectedRoute>
                <MemberFeed />
              </ProtectedRoute>
            } 
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
