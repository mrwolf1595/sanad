'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { FileText, Home, Settings, Users, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const navItems = [
    { name: 'الرئيسية', href: '/dashboard', icon: Home },
    { name: 'السندات', href: '/dashboard/receipts', icon: FileText },
    { name: 'المستخدمين', href: '/dashboard/users', icon: Users },
    { name: 'الإعدادات', href: '/dashboard/settings', icon: Settings },
  ]

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link 
            key={item.href} 
            href={item.href}
            onClick={() => mobile && setIsOpen(false)}
          >
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size={mobile ? 'default' : 'sm'}
              className={`gap-2 ${mobile ? 'w-full justify-start text-base' : ''}`}
            >
              <Icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
              {item.name}
            </Button>
          </Link>
        )
      })}
    </>
  )

  return (
    <nav className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/dashboard" className="text-lg md:text-xl font-bold">
            سندات
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <div className="flex gap-2">
              <NavLinks />
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="touch-target">
                <Menu className="h-5 w-5" />
                <span className="sr-only">فتح القائمة</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="text-right">القائمة</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full">
                {/* Mobile Nav Links */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  <NavLinks mobile />
                </div>
                
                {/* Mobile Logout */}
                <div className="p-4 border-t mt-auto safe-bottom">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsOpen(false)
                      handleLogout()
                    }} 
                    className="w-full gap-2 justify-start"
                  >
                    <LogOut className="h-5 w-5" />
                    تسجيل الخروج
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}
