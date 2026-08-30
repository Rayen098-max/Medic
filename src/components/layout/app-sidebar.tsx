import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { BrandHeader } from './brand-header'
import { useAuth } from '@/context/AuthContext'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { user, profile } = useAuth()
  
  const currentUser = {
    name: profile?.full_name || 'User',
    email: user?.email || '',
    avatar: '/avatars/01.png',
  }

  // Filter out the Usage Report if the user is a physio, and Tasks if user is admin/manager
  const filteredNavGroups = sidebarData.navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (item.url === '/usage-report' && profile?.role === 'physio') return false;
      if (item.url === '/tasks' && (profile?.role === 'admin' || profile?.role === 'manager')) return false;
      if (item.url === '/edit-body' && profile?.role !== 'admin') return false;
      if (item.url === '/' && profile?.role === 'physio') return false;
      if (item.url === '/add-data' && profile?.role === 'physio') return false;
      return true;
    })
  })).filter(group => group.items.length > 0)

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <BrandHeader />
      </SidebarHeader>
      <SidebarContent>
        {filteredNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={currentUser} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
