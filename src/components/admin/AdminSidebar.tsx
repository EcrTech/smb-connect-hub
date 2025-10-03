import { 
  BarChart3, 
  Building2, 
  Users, 
  Mail, 
  MessageSquare, 
  Settings, 
  FileText,
  GitBranch,
  Shield
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Analytics", url: "/admin", icon: BarChart3 },
  { title: "Actions", url: "/admin/actions", icon: Settings },
];

const managementItems = [
  { title: "Associations", url: "/admin/associations", icon: Building2 },
  { title: "Companies", url: "/admin/companies", icon: Building2 },
  { title: "Users", url: "/admin/users", icon: Users },
];

const communicationItems = [
  { title: "Email Lists", url: "/admin/email-lists", icon: Mail },
  { title: "WhatsApp Lists", url: "/admin/whatsapp-lists", icon: MessageSquare },
];

const requestsItems = [
  { title: "Association Requests", url: "/admin/requests", icon: FileText },
  { title: "Company Requests", url: "/admin/company-requests", icon: GitBranch },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      collapsible="icon"
      className={collapsed ? "w-14" : "w-60"}
    >
      <SidebarContent>
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            <Shield className="h-4 w-4 mr-2" />
            {!collapsed && "Admin Dashboard"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            {!collapsed && "Management"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Communication */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            {!collapsed && "Communication"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communicationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Requests */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            {!collapsed && "Requests"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {requestsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}