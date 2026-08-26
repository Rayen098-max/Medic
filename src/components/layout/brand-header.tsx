import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Activity } from 'lucide-react'

export function BrandHeader() {
  const [imgError, setImgError] = useState(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground select-none'
          asChild
        >
          <Link to='/' className='flex items-center gap-3'>
            <div className='flex aspect-square size-9 items-center justify-center rounded-lg bg-primary/10 text-primary overflow-hidden p-1 border border-primary/20'>
              {!imgError ? (
                <img
                  src='/logo.png'
                  alt='The Sleep Company'
                  className='size-full object-contain'
                  onError={() => setImgError(true)}
                />
              ) : (
                <Activity className='size-5 text-primary' />
              )}
            </div>
            <div className='grid flex-1 text-start text-sm leading-tight'>
              <span className='truncate font-semibold text-sm tracking-tight'>
                The Sleep Company
              </span>
              <span className='truncate text-[11px] text-muted-foreground'>
                Clinical Advisor
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
