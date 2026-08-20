import { useAuth } from '@/providers'
import { getDashboardPath } from '@/utils/auth'
import { NotificationDropdown } from '@/components/shared/NotificationDropdown'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getInitials } from '@/utils/format'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-800 bg-slate-950 text-slate-100 shadow-[0_8px_32px_rgba(2,6,23,0.18)]">
      <div className="flex items-center justify-end h-full px-4 lg:px-6 gap-4">
        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-white/10">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profile_photo_url || ''} />
                <AvatarFallback className="text-xs bg-slate-800 text-slate-100">
                  {user ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-tight text-slate-100">{user?.name}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 border-slate-800 bg-slate-950 p-1 text-slate-100 shadow-xl shadow-slate-950/25">
            <DropdownMenuItem asChild className="text-slate-200 focus:bg-slate-800 focus:text-white">
              <Link to={`${getDashboardPath(user?.role)}/profile`}>
                <User className="w-4 h-4 mr-2" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-800" />
            <DropdownMenuItem onClick={logout} className="text-red-300 focus:bg-red-950/60 focus:text-red-100">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
