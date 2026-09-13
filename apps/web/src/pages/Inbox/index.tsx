import { Navigate } from 'react-router-dom'
import { useAtom, useAtomValue } from 'jotai'
import { isHolder, isObserver, isOverdue } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { StatStrip } from '@/components/StatStrip'
import { CreateModal } from '@/components/submission/CreateModal'
import { FilterBar } from '@/components/submission/FilterBar'
import { SubmissionDrawer } from '@/components/submission/SubmissionDrawer'
import { SubmissionTable } from '@/components/submission/SubmissionTable'
import { CATEGORY_LABEL } from '@/constants/labels'
import { filterSubmissions } from '@/helpers/filter'
import { flowAtom } from '@/stores/flowAtom'
import { submissionsAtom, useFlowActions } from '@/stores/submissionAtom'
import { activeRoleAtom } from '@/stores/sessionAtom'
import { filtersAtom, openCodeAtom, searchAtom } from '@/stores/uiAtom'
import { TAB_TITLE, createOpenAtom, tabAtom } from './atoms'
import { TabBar } from './components/TabBar'
import type { Role } from '@/types'

function subtitleFor(role: Role): string {
  if (role.type === 'submitter') return 'Pengajuan yang Anda buat, lengkap dengan posisi berkasnya saat ini.'
  if (role.type === 'secretary') {
    return `Hanya pengajuan kategori ${role.category ? CATEGORY_LABEL[role.category] : ''} yang masuk ke meja Anda.`
  }
  if (role.type === 'deputy') return 'Semua kategori melewati meja Anda untuk QC dan paraf.'
  return 'Berkas yang sudah diparaf Wadir dan menunggu tanda tangan Anda.'
}

export default function Inbox() {
  const role = useAtomValue(activeRoleAtom)
  const list = useAtomValue(submissionsAtom)
  const { stages } = useAtomValue(flowAtom)
  const filters = useAtomValue(filtersAtom)
  const search = useAtomValue(searchAtom)
  const [tab, setTab] = useAtom(tabAtom)
  const [openCode, setOpenCode] = useAtom(openCodeAtom)
  const [createOpen, setCreateOpen] = useAtom(createOpenAtom)
  const { create } = useFlowActions()

  // Observer roles have no inbox — they start from the summary board.
  if (isObserver(role)) return <Navigate to="/monitoring" replace />

  const scoped = filterSubmissions(list, role, filters, search)
  const mine = scoped.filter((item) => isHolder(item, role, stages))
  const running = scoped.filter((item) => item.status === 'running')
  const overdue = scoped.filter((item) => isOverdue(item, stages))
  const done = scoped.filter((item) => item.status === 'done')
  const returned = scoped.filter((item) => item.status === 'returned')

  const shown =
    tab === 'action'
      ? mine
      : tab === 'running'
        ? running.filter((item) => !isHolder(item, role, stages))
        : tab === 'returned'
          ? returned
          : done

  const opened = openCode === null ? undefined : list.find((item) => item.code === openCode)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Kotak masuk</h1>
          <p className="page-sub">{subtitleFor(role)}</p>
        </div>
        <div className="page-actions">
          {role.type === 'submitter' ? (
            <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
              <Icon name="plus" size={16} strokeWidth={2} /> Buat pengajuan
            </button>
          ) : null}
        </div>
      </div>

      <StatStrip
        items={[
          {
            label: 'Perlu tindakan saya',
            icon: 'inbox',
            value: mine.length,
            caption: mine.length > 0 ? 'bola ada di meja Anda' : 'meja Anda kosong',
          },
          { label: 'Sedang berjalan', icon: 'arrowRight', value: running.length, caption: 'di seluruh tahap' },
          {
            label: 'Lewat SLA',
            icon: 'clock',
            value: (
              <>
                {overdue.length}
                {overdue.length > 0 ? <Chip tone="amber">perlu ditagih</Chip> : null}
              </>
            ),
            caption: overdue.length > 0 ? 'melebihi batas waktu tahap' : 'semua dalam batas waktu',
          },
          { label: 'Selesai', icon: 'check', value: done.length, caption: 'tersimpan di arsip' },
        ]}
      />

      <TabBar
        active={tab}
        onPick={setTab}
        counts={{
          action: mine.length,
          running: running.length - mine.length > 0 ? running.length - mine.length : 0,
          returned: returned.length,
          done: done.length,
        }}
      />

      <FilterBar role={role} />

      <div className="card">
        <div className="card-head">
          <span className="card-title">{TAB_TITLE[tab]}</span>
          <Chip tone="slate" numeric>
            {shown.length} berkas
          </Chip>
        </div>
        <SubmissionTable list={shown} activeCode={openCode} onOpen={(code) => setOpenCode(code)} />
      </div>

      {opened ? <SubmissionDrawer submission={opened} onClose={() => setOpenCode(null)} /> : null}

      {createOpen ? (
        <CreateModal
          onCancel={() => setCreateOpen(false)}
          onSubmit={(title, category) => {
            create(title, category)
            setCreateOpen(false)
            setTab('running')
          }}
        />
      ) : null}
    </div>
  )
}
