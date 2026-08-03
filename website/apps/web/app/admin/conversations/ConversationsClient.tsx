'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import PageHeader from '@/components/admin/ui/PageHeader';
import DataTable from '@/components/admin/ui/DataTable';
import Pagination from '@/components/admin/ui/Pagination';
import Modal from '@/components/admin/ui/Modal';
import { selectCls } from '@/components/admin/ui/FormField';
import { Eye, Phone, AlertTriangle } from 'lucide-react';

const LEAD_STATUSES = [
  'EMERGENCY',
  'NEEDS_HUMAN',
  'READY_TO_BOOK',
  'WARM_LEAD',
  'INTERESTED',
  'INFORMATION_ONLY',
  'SPAM',
  'ABUSIVE',
];

const LEAD_LABELS: Record<string, string> = {
  EMERGENCY: '🔴 طوارئ',
  NEEDS_HUMAN: '🟠 يحتاج موظف',
  READY_TO_BOOK: '🟢 جاهز للحجز',
  WARM_LEAD: 'ليد دافي',
  INTERESTED: 'مهتم',
  INFORMATION_ONLY: 'استفسار',
  SPAM: 'سبام',
  ABUSIVE: 'مسيء',
};

/** Urgency drives the colour, not the alphabet. */
const LEAD_TONE: Record<string, string> = {
  EMERGENCY: 'bg-red-100 text-red-800 border-red-200',
  NEEDS_HUMAN: 'bg-orange-100 text-orange-800 border-orange-200',
  READY_TO_BOOK: 'bg-green-100 text-green-800 border-green-200',
  WARM_LEAD: 'bg-amber-50 text-amber-800 border-amber-200',
  SPAM: 'bg-gray-100 text-gray-500 border-gray-200',
  ABUSIVE: 'bg-gray-100 text-gray-500 border-gray-200',
};

const CHANNELS = ['WEB', 'MESSENGER', 'WHATSAPP', 'INSTAGRAM'];

function fmt(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ConversationsClient() {
  const [page, setPage] = useState(1);
  const [leadStatus, setLeadStatus] = useState('');
  const [channel, setChannel] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', page, leadStatus, channel],
    queryFn: () =>
      api.conversations.list({
        page,
        pageSize: 20,
        leadStatus: leadStatus || undefined,
        channel: channel || undefined,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ['conversations-stats'],
    queryFn: () => api.conversations.stats(),
    refetchInterval: 60_000,
  });

  const { data: detail } = useQuery({
    queryKey: ['conversation', openId],
    queryFn: () => api.conversations.get(openId!),
    enabled: Boolean(openId),
  });

  const rows = data?.data ?? [];
  const cacheRatio = stats?.cacheHitRatio;

  return (
    <div className="space-y-6">
      <PageHeader title="المحادثات" subtitle="محادثات موظف الاستقبال الذكي عبر كل القنوات" />

      {/* Attention first: the whole point of this screen is the person who needs calling. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="محتاج تدخل" value={stats?.needsAttention ?? 0} tone="urgent" />
        <StatTile label="جاهز للحجز" value={stats?.byStatus?.READY_TO_BOOK ?? 0} tone="good" />
        <StatTile label="طوارئ" value={stats?.byStatus?.EMERGENCY ?? 0} tone="urgent" />
        <StatTile
          label="كفاءة الكاش"
          value={cacheRatio === null || cacheRatio === undefined ? '—' : `${Math.round(cacheRatio * 100)}%`}
          tone={cacheRatio !== null && cacheRatio !== undefined && cacheRatio < 0.7 ? 'urgent' : 'neutral'}
          hint={
            cacheRatio !== null && cacheRatio !== undefined && cacheRatio < 0.7
              ? 'أقل من 70% — فيه حاجة متغيرة في بداية الـ prompt وبتكلّف أضعاف'
              : undefined
          }
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <select className={selectCls} value={leadStatus} onChange={(e) => { setLeadStatus(e.target.value); setPage(1); }}>
          <option value="">كل الحالات</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{LEAD_LABELS[s]}</option>)}
        </select>
        <select className={selectCls} value={channel} onChange={(e) => { setChannel(e.target.value); setPage(1); }}>
          <option value="">كل القنوات</option>
          {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <DataTable
        loading={isLoading}
        data={rows}
        emptyText="لا توجد محادثات بعد"
        columns={[
          {
            key: 'leadStatus',
            header: 'الحالة',
            render: (r: any) => (
              <span className={`px-2 py-1 rounded border text-xs whitespace-nowrap ${LEAD_TONE[r.leadStatus] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                {LEAD_LABELS[r.leadStatus] ?? r.leadStatus}
              </span>
            ),
          },
          { key: 'name', header: 'المريض', render: (r: any) => r.slots?.patientName || '—' },
          {
            key: 'phone',
            header: 'التليفون',
            render: (r: any) =>
              r.slots?.phone ? (
                <a href={`tel:${r.slots.phone}`} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
                  <Phone size={14} /> {r.slots.phone}
                </a>
              ) : '—',
          },
          { key: 'specialty', header: 'التخصص', render: (r: any) => r.slots?.specialty || '—' },
          { key: 'brand', header: 'الصفحة', render: (r: any) => r.brand ?? '—' },
          { key: 'hospital', header: 'المستشفى', render: (r: any) => r.hospital ?? <span className="text-gray-400">غير محدد</span> },
          { key: 'channel', header: 'القناة' },
          { key: 'lastMessageAt', header: 'آخر رسالة', render: (r: any) => fmt(r.lastMessageAt) },
          {
            key: 'actions',
            header: '',
            render: (r: any) => (
              <button onClick={() => setOpenId(r.id)} className="p-2 text-gray-600 hover:text-blue-700" aria-label="عرض">
                <Eye size={16} />
              </button>
            ),
          },
        ]}
      />

      <Pagination
        page={page}
        pageSize={data?.meta?.pageSize ?? 20}
        total={data?.meta?.total ?? 0}
        totalPages={Math.max(1, Math.ceil((data?.meta?.total ?? 0) / (data?.meta?.pageSize ?? 20)))}
        onPage={setPage}
      />

      <Modal open={Boolean(openId)} onClose={() => setOpenId(null)} title="تفاصيل المحادثة" size="lg">
        {!detail ? (
          <p className="text-gray-500">جاري التحميل…</p>
        ) : (
          <div className="space-y-5">
            {/* Card first, transcript last — a staff member should not have to
                read the conversation to know who to call and why. */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="الحالة" value={LEAD_LABELS[detail.leadStatus] ?? detail.leadStatus} />
              <Field label="القناة" value={detail.channel} />
              <Field label="المستشفى" value={detail.hospital?.slug ?? 'غير محدد'} />
              <Field label="بدأت" value={fmt(detail.startedAt)} />
              {detail.handedOffAt && <Field label="اتسلّمت" value={fmt(detail.handedOffAt)} />}
              {detail.appointmentRequest && <Field label="رقم الطلب" value={detail.appointmentRequest.id} />}
            </div>

            {detail.slots && Object.keys(detail.slots).length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">المعلومات المجمّعة</h4>
                <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 p-3 rounded">
                  {Object.entries(detail.slots).map(([k, v]) => (
                    <div key={k}><span className="text-gray-500">{k}: </span>{String(v)}</div>
                  ))}
                </div>
              </div>
            )}

            {detail.slots?.phone && (
              <a
                href={`tel:${detail.slots.phone}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Phone size={16} /> اتصل بـ {detail.slots.phone}
              </a>
            )}

            <div>
              <h4 className="font-semibold mb-2">نص المحادثة</h4>
              <div className="max-h-80 overflow-y-auto space-y-2 border rounded p-3">
                {detail.messages.map((m: any) => (
                  <div key={m.id} className={m.sender === 'USER' ? 'text-right' : 'text-left'}>
                    <div className={`inline-block max-w-[80%] px-3 py-2 rounded text-sm ${m.sender === 'USER' ? 'bg-blue-50' : 'bg-gray-100'}`}>
                      {m.safetyFlag && (
                        <div className="flex items-center gap-1 text-xs text-red-700 mb-1">
                          <AlertTriangle size={12} /> {m.safetyFlag}
                        </div>
                      )}
                      {m.content}
                      {/* Which records the answer was drawn from — the first
                          thing to check when an answer looks wrong. */}
                      {m.citedRecordIds?.length > 0 && (
                        <div className="text-[10px] text-gray-500 mt-1">مصادر: {m.citedRecordIds.join('، ')}</div>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{fmt(m.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatTile({ label, value, tone, hint }: { label: string; value: any; tone: 'urgent' | 'good' | 'neutral'; hint?: string }) {
  const cls =
    tone === 'urgent' ? 'border-red-200 bg-red-50' : tone === 'good' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white';
  return (
    <div className={`p-4 rounded-lg border ${cls}`} title={hint}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
      {hint && <div className="text-[11px] text-red-700 mt-1">{hint}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
