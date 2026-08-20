import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, CalendarDays, Car, Clock, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { agreementsApi, type Agreement } from '@/api/agreements'
import { agreementPath, getAgreementExpireDate } from '@/utils/agreements'
import { useAuth } from '@/providers'
import { useCachedFetch } from '@/hooks/useCachedFetch'
import { formatCurrency, formatDate, getInitials } from '@/utils/format'

function PartyRow({
  name,
  photoUrl,
  signedAt,
  label,
}: {
  name?: string
  photoUrl?: string | null
  signedAt: string | null
  label: string
}) {
  const signed = Boolean(signedAt)

  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-7 w-7">
        <AvatarImage src={photoUrl || ''} />
        <AvatarFallback className="text-[10px]">{name ? getInitials(name) : '?'}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-slate-700">{name || '—'}</p>
        <p className="truncate text-[10px] text-slate-400">{label}</p>
      </div>
      {signed ? (
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
          <BadgeCheck className="h-3 w-3" />
          Signed {signedAt ? formatDate(signedAt) : ''}
        </span>
      ) : (
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          <Clock className="h-3 w-3" />
          Awaiting signature
        </span>
      )}
    </div>
  )
}

function AgreementCard({ agreement }: { agreement: Agreement }) {
  const { user } = useAuth()
  const expireDate = getAgreementExpireDate(agreement)
  const amount = Number(agreement.total_amount || agreement.car?.daily_rate || 0)

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Car className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-950">
              {agreement.car?.brand} {agreement.car?.model}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(agreement.start_date)} → {formatDate(agreement.end_date)}
              {agreement.car?.rental_period ? ` · ${agreement.car.rental_period}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-slate-950">{formatCurrency(amount)}</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Total</p>
          </div>
        </div>

        <div className="space-y-2.5 px-4 py-4">
          <PartyRow
            name={agreement.owner?.name}
            photoUrl={agreement.owner?.profile_photo_url}
            signedAt={agreement.owner_agreement_agreed_at}
            label="Owner"
          />
          <PartyRow
            name={agreement.driver?.name}
            photoUrl={agreement.driver?.profile_photo_url}
            signedAt={agreement.driver_agreement_agreed_at}
            label="Driver"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-500">
            {agreement.agreement_sent_at ? `Sent ${formatDate(agreement.agreement_sent_at)}` : 'Sent recently'}
            {expireDate ? ` · Expires ${formatDate(expireDate.toISOString())}` : ''}
          </p>
          <Link to={agreementPath(user?.role, agreement.id)}>
            <Button size="sm" className="bg-slate-950 text-white hover:bg-slate-800">
              Open Agreement
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function AgreementsPage() {
  const { data: agreements = [], isLoading } = useCachedFetch<Agreement[]>('agreements', () => agreementsApi.list())

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Agreement Forms</h1>
          <p className="mt-1 text-sm text-slate-500">Review, sign, and download rental agreements.</p>
        </div>
        {agreements.length > 0 && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            {agreements.length} {agreements.length === 1 ? 'agreement' : 'agreements'}
          </span>
        )}
      </div>

      {isLoading ? (
        <LoadingSkeleton type="list" count={3} />
      ) : agreements.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={<FileText className="h-6 w-6" />}
              title="No agreement forms yet"
              description="Agreements will appear here once a rental booking is created."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {agreements.map((agreement) => (
            <AgreementCard key={agreement.id} agreement={agreement} />
          ))}
        </div>
      )}
    </div>
  )
}