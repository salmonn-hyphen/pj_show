import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { agreementsApi, AGREEMENT_LOCKED_MESSAGE, type Agreement } from '@/api/agreements'
import { agreementPath, getAgreementExpireDate } from '@/utils/agreements'
import { useAuth } from '@/providers'
import { formatDate } from '@/utils/format'

export function AgreementListCard() {
  const { user } = useAuth()
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAgreements = async () => {
      try {
        const data = await agreementsApi.list()
        setAgreements(data)
      } catch {
        setAgreements([])
      } finally {
        setLoading(false)
      }
    }

    loadAgreements()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base text-slate-950">
          <FileText className="h-4 w-4 text-slate-600" />
          Agreement Forms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading agreements...</p>
        ) : agreements.length === 0 ? (
          <p className="text-sm text-slate-500">No agreement forms yet.</p>
        ) : (
          agreements.slice(0, 5).map((agreement) => {
            const expireDate = getAgreementExpireDate(agreement)
            const isLocked = Boolean(agreement.is_agreement_locked)

            return (
              <div key={agreement.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-950">
                    {agreement.car?.brand} {agreement.car?.model}
                  </p>
                  {isLocked && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      <Lock className="h-3 w-3" />
                      Locked
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                  <p>Sent {agreement.agreement_sent_at ? formatDate(agreement.agreement_sent_at) : 'recently'}</p>
                  <p>Rental period: {agreement.car?.rental_period || 'Not set'}</p>
                  <p>Expires: {expireDate ? formatDate(expireDate.toISOString()) : 'Not set'}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                  <span>Owner: {agreement.owner_agreement_agreed_at ? 'Agreed' : 'Pending'}</span>
                  <span>Driver: {agreement.driver_agreement_agreed_at ? 'Agreed' : 'Pending'}</span>
                </div>
                {isLocked ? (
                  <Button size="sm" variant="outline" disabled title={AGREEMENT_LOCKED_MESSAGE} className="mt-3 w-full">
                    <Lock className="h-3 w-3" />
                    Locked — Payment Required
                  </Button>
                ) : (
                  <Link to={agreementPath(user?.role, agreement.id)}>
                    <Button size="sm" variant="outline" className="mt-3 w-full">
                      Open Agreement
                    </Button>
                  </Link>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
