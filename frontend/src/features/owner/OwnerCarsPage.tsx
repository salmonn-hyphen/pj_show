import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Plus, Eye, Edit, Trash2, Power, CarFront, MapPin, Hash, Fuel, Calendar, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { KYCLock } from '@/components/shared/KYCLock'
import { OwnerCarDetailModal } from './OwnerCarDetailModal'
import { carsApi } from '@/api'
import type { Car } from '@/types'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/lib/utils'
import { useCachedFetch, updateCache } from '@/hooks/useCachedFetch'

export function OwnerCarsPage() {
  return (
    <KYCLock feature="My Post">
      <OwnerCarsContent />
    </KYCLock>
  )
}

function OwnerCarsContent() {
  const navigate = useNavigate()
  const { data: cars = [], isLoading: loading } = useCachedFetch<Car[]>('owner-cars', () => carsApi.getOwnerCars())
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 6

  const filteredCars = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return cars.filter((car) => {
      const matchesSearch = !query || [
        car.brand,
        car.model,
        car.year,
        car.city,
        car.license_plate,
        car.license_number,
        car.fuel_type,
        car.rental_payment_type,
      ].some((value) => String(value || '').toLowerCase().includes(query))

      const matchesStatus = statusFilter === 'all' || car.status === statusFilter || car.admin_approval_status === statusFilter
      const matchesAvailability =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'available' && car.is_available) ||
        (availabilityFilter === 'unavailable' && !car.is_available)

      return matchesSearch && matchesStatus && matchesAvailability
    })
  }, [availabilityFilter, cars, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCars.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginatedCars = filteredCars.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      setDeleting(true)
      await carsApi.delete(deleteId)
      updateCache<Car[]>('owner-cars', (list) => list.filter((c) => c.id !== deleteId))
      setDeleteId(null)
    } catch {
      // handle
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleAvailability = async (id: string) => {
    try {
      const updated = await carsApi.toggleAvailability(id)
      updateCache<Car[]>('owner-cars', (list) => list.map((c) => (c.id === id ? updated : c)))
      setSelectedCar((prev) => (prev?.id === id ? updated : prev))
    } catch {
      // handle
    }
  }

  const canEditCar = (car: Car) => car.status !== 'verified' && car.admin_approval_status !== 'APPROVED'

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setPage(1)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setPage(1)
  }

  const handleAvailabilityChange = (value: string) => {
    setAvailabilityFilter(value)
    setPage(1)
  }

  if (loading) return <LoadingSkeleton type="card" count={3} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Post</h1>
          <p className="text-sm text-muted-foreground">Manage your car listings and availability.</p>
        </div>
        <Link to="/owner/cars/new">
          <Button><Plus className="w-4 h-4 mr-2" /> Add Car</Button>
        </Link>
      </div>

      {cars.length === 0 ? (
        <EmptyState
          title="No cars listed yet"
          description="Add your first car to start earning."
          action={<Link to="/owner/cars/new"><Button><Plus className="w-4 h-4 mr-2" /> Add Car</Button></Link>}
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                Filter posts
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:w-[680px]">
                <div className="relative sm:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Search car or plate"
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="PENDING">Admin pending</SelectItem>
                    <SelectItem value="APPROVED">Admin approved</SelectItem>
                    <SelectItem value="REJECTED">Admin rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={availabilityFilter} onValueChange={handleAvailabilityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All availability</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredCars.length === 0 ? (
            <EmptyState title="No matching posts" description="Try another search or filter." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedCars.map((car) => (
                <motion.div key={car.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                  <Card className="flex h-full overflow-hidden border-slate-200 bg-white transition-shadow hover:shadow-md">
                    <CardContent className="flex w-full flex-col p-0">
                      <div className="flex flex-1 flex-col p-3">
                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex min-w-0 flex-1 flex-col gap-3">
                            <div className="aspect-[16/10] w-full shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              {car.photos?.[0] ? (
                                <img src={car.photos[0].url} alt={`${car.brand} ${car.model}`} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                                  <CarFront className="h-5 w-5" />
                                  No photo
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1 space-y-2.5">
                              <div>
                                <h3 className="line-clamp-2 text-base font-semibold leading-5 text-slate-950">
                                  {car.brand} {car.model}
                                  {car.year ? <span className="text-slate-500"> ({car.year})</span> : null}
                                </h3>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                  {car.city && (
                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {car.city}</span>
                                  )}
                                  {(car.license_plate || car.license_number) && (
                                    <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {car.license_plate || car.license_number}</span>
                                  )}
                                </div>
                              </div>

                              <div className="grid gap-1.5 text-xs text-slate-600 sm:grid-cols-2">
                                {car.fuel_type && (
                                  <span className="flex items-center gap-1">
                                    <Fuel className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="capitalize">{car.fuel_type}</span>
                                  </span>
                                )}
                                {car.rental_payment_type && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                                    <span className="capitalize">{car.rental_payment_type.toLowerCase()}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                            <p className="text-[10px] font-medium uppercase text-emerald-700">Rental price</p>
                            <p className="text-lg font-semibold text-emerald-950">
                              {formatCurrency(car.daily_rate)}
                            </p>
                            <p className="text-[11px] text-emerald-700">per day</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadge status={car.status} type="verification" />
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${car.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {car.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setSelectedCar(car)}><Eye className="h-3.5 w-3.5 mr-1" /> View</Button>
                          {canEditCar(car) ? (
                            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => navigate(`/owner/cars/${car.id}/edit`)}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-8 text-xs" disabled><Edit className="h-3.5 w-3.5 mr-1" /> Approved</Button>
                          )}
                          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleToggleAvailability(car.id)}>
                            <Power className="h-3.5 w-3.5 mr-1" /> {car.is_available ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button size="sm" variant="destructive" className="h-8" onClick={() => setDeleteId(car.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredCars.length)} of {filteredCars.length}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={cn(
                      'h-8 w-8 rounded-lg text-sm font-medium transition-colors',
                      pageNumber === safePage
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2.5"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Car"
        description="Are you sure you want to delete this car? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />

      <OwnerCarDetailModal
        car={selectedCar}
        onClose={() => setSelectedCar(null)}
        onToggleAvailability={handleToggleAvailability}
      />
    </div>
  )
}
