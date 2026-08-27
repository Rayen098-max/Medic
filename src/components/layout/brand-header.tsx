import React from 'react'
import { Link } from 'react-router-dom'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { GalleryVerticalEnd } from 'lucide-react'

export function BrandHeader() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground select-none'
          asChild
        >
          <Link to='/' className='flex items-center gap-3'>
            <div className='flex aspect-square size-9 items-center justify-center rounded-sm bg-white text-slate-900 shadow-sm'>
              <GalleryVerticalEnd className='size-5 stroke-[2.5]' />
            </div>
            <div className='grid flex-1 text-start leading-tight'>
              <span className='truncate font-bold text-[15px] tracking-wide text-slate-100'>
                Medic
              </span>
              <span className='truncate text-[11px] text-slate-500 mt-0.5'>
                The Sleep Company
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
