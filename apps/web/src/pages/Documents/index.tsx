import { useAtom, useAtomValue } from 'jotai'
import { isObserver } from '@imeri/shared'
import { Chip } from '@/components/Chip'
import { FilterBar } from '@/components/submission/FilterBar'
import { SubmissionDrawer } from '@/components/submission/SubmissionDrawer'
import { SubmissionTable } from '@/components/submission/SubmissionTable'
import { filterSubmissions } from '@/helpers/filter'
import { submissionsAtom } from '@/stores/submissionAtom'
import { activeRoleAtom } from '@/stores/sessionAtom'
import { filtersAtom, openCodeAtom, searchAtom } from '@/stores/uiAtom'

/** Every document within the role's scope — no tabs, just filters. */
export default function Documents() {
  const role = useAtomValue(activeRoleAtom)
  const list = useAtomValue(submissionsAtom)
  const filters = useAtomValue(filtersAtom)
  const search = useAtomValue(searchAtom)
  const [openCode, setOpenCode] = useAtom(openCodeAtom)

  const shown = filterSubmissions(list, role, filters, search)
  const opened = openCode === null ? undefined : list.find((item) => item.code === openCode)

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">{role.type === 'monitor' ? `Berkas Cluster ${role.cluster}` : 'Semua berkas'}</h1>
          <p className="page-sub">
            {isObserver(role)
              ? 'Hanya membaca — Anda bisa membuka detail, tidak bisa memberi paraf.'
              : 'Berkas yang boleh Anda lihat, termasuk yang sedang di meja orang lain.'}
          </p>
        </div>
      </div>

      <FilterBar role={role} />

      <div className="card">
        <div className="card-head">
          <span className="card-title">Seluruh berkas dalam lingkup Anda</span>
          <Chip tone="slate" numeric>
            {shown.length} berkas
          </Chip>
        </div>
        <SubmissionTable
          list={shown}
          activeCode={openCode}
          onOpen={(code) => setOpenCode(code)}
          emptyText="Tidak ada berkas yang cocok."
        />
      </div>

      {opened ? <SubmissionDrawer submission={opened} onClose={() => setOpenCode(null)} /> : null}
    </div>
  )
}
