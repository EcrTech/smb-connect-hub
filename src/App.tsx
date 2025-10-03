import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminLayout } from "./components/admin/AdminLayout";
import Index from "./pages/Index";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/Dashboard";
import Setup from "./pages/Setup";
import RequestAssociation from "./pages/RequestAssociation";
import RequestCompany from "./pages/RequestCompany";
import AdminActions from "./pages/admin/AdminActions";
import UserManagement from "./pages/admin/UserManagement";
import AdminAssociations from "./pages/admin/AdminAssociations";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminAssociationRequests from "./pages/admin/AdminAssociationRequests";
import AdminCompanyRequests from "./pages/admin/AdminCompanyRequests";
import AssociationProfileView from "./pages/admin/AssociationProfileView";
import CreateAssociation from "./pages/admin/CreateAssociation";
import CreateCompany from "./pages/admin/CreateCompany";
import CreateUser from "./pages/admin/CreateUser";
import BulkUploadAssociations from "./pages/admin/BulkUploadAssociations";
import BulkUploadCompanies from "./pages/admin/BulkUploadCompanies";
import BulkUploadUsers from "./pages/admin/BulkUploadUsers";
import DeleteTestUsers from "./pages/admin/DeleteTestUsers";
import AdminEmailLists from "./pages/admin/AdminEmailLists";
import AdminEmailListDetail from "./pages/admin/AdminEmailListDetail";
import AdminWhatsAppLists from "./pages/admin/AdminWhatsAppLists";
import AdminWhatsAppListDetail from "./pages/admin/AdminWhatsAppListDetail";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
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
import MemberMessages from "./pages/member/MemberMessages";
import CompanyFeed from "./pages/company/CompanyFeed";
import AssociationFeed from "./pages/association/AssociationFeed";
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
            path="/dashboard/messages" 
            element={
              <ProtectedRoute>
                <MemberMessages />
              </ProtectedRoute>
            } 
          />
          {/* Admin Routes - All wrapped in AdminLayout */}
          <Route 
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route index element={<AdminAnalytics />} />
                    <Route path="actions" element={<AdminActions />} />
                    <Route path="users" element={<UserManagement />} />
                    <Route path="associations" element={<AdminAssociations />} />
                    <Route path="associations/:id" element={<AssociationProfileView />} />
                    <Route path="companies" element={<AdminCompanies />} />
                    <Route path="requests" element={<AdminAssociationRequests />} />
                    <Route path="company-requests" element={<AdminCompanyRequests />} />
                    <Route path="create-association" element={<CreateAssociation />} />
                    <Route path="create-company" element={<CreateCompany />} />
                    <Route path="create-user" element={<CreateUser />} />
                    <Route path="bulk-upload-associations" element={<BulkUploadAssociations />} />
                    <Route path="bulk-upload-companies" element={<BulkUploadCompanies />} />
                    <Route path="bulk-upload-users" element={<BulkUploadUsers />} />
                    <Route path="delete-test-users" element={<DeleteTestUsers />} />
                    <Route path="email-lists" element={<AdminEmailLists />} />
                    <Route path="email-lists/:listId" element={<AdminEmailListDetail />} />
                    <Route path="whatsapp-lists" element={<AdminWhatsAppLists />} />
                    <Route path="whatsapp-lists/:listId" element={<AdminWhatsAppListDetail />} />
                    <Route path="analytics" element={<AdminAnalytics />} />
                  </Routes>
                </AdminLayout>
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
            path="/request-company"
            element={
              <ProtectedRoute>
                <RequestCompany />
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
          <Route 
            path="/messages" 
            element={
              <ProtectedRoute>
                <MemberMessages />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/company/feed" 
            element={
              <ProtectedRoute>
                <CompanyFeed />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/association/feed" 
            element={
              <ProtectedRoute>
                <AssociationFeed />
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
