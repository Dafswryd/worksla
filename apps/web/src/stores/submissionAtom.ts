import { useCallback } from 'react'
import { atom, useAtom, useAtomValue } from 'jotai'
import { nextStage, previousStage, stageByKey } from '@imeri/shared'
import { CODE_PREFIX, SUBMISSION_SEED } from '@/constants/submissions'
import { ADVANCE_TRAIL, STAGE_LABEL } from '@/constants/stages'
import { roleById } from '@/constants/roles'
import { nowStamp } from '@/helpers/format'
import { flowAtom } from './flowAtom'
import { activeRoleAtom } from './sessionAtom'
import { useToast } from './toastAtom'
import type { Category, Submission } from '@/types'

export const submissionsAtom = atom<readonly Submission[]>(SUBMISSION_SEED)

const replace = (
  list: readonly Submission[],
  code: string,
  change: (submission: Submission) => Submission,
): readonly Submission[] => list.map((item) => (item.code === code ? change(item) : item))

/**
 * Every action that moves a document, gathered in one place so the "one step
 * back" and "checklist locks the door" rules do not get scattered across
 * components.
 */
export function useFlowActions() {
  const [list, setList] = useAtom(submissionsAtom)
  const { stages, route } = useAtomValue(flowAtom)
  const role = useAtomValue(activeRoleAtom)
  const toast = useToast()

  /** Pass the document on to the next desk. */
  const advance = useCallback(
    (code: string) => {
      const current = list.find((item) => item.code === code)
      if (!current) return
      const stage = stageByKey(stages, current.stageKey)
      const target = nextStage(current.stageKey)
      const finished = target === 'done'

      setList((prev) =>
        replace(prev, code, (item) => ({
          ...item,
          stageKey: target,
          daysInStage: finished ? 0 : 1,
          status: finished ? 'done' : 'running',
          checklist: [],
          history: [
            ...item.history,
            {
              actor: role.name,
              role: role.position,
              action: ADVANCE_TRAIL[stage.key] ?? 'meneruskan berkas',
              time: nowStamp(),
              kind: 'approve',
            },
          ],
        })),
      )

      toast(
        finished
          ? `${code} selesai — pengaju sudah diberi tahu`
          : `${code} diteruskan ke ${STAGE_LABEL[target].desk}`,
      )
    },
    [list, role, setList, stages, toast],
  )

  /** Send the document back one step, with comments that become a checklist. */
  const sendBack = useCallback(
    (code: string, comment: string) => {
      const points = comment
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line !== '')
      if (points.length === 0) {
        toast('Alasan pengembalian wajib diisi', 'error')
        return
      }
      const current = list.find((item) => item.code === code)
      if (!current) return
      const target = previousStage(current.stageKey)

      setList((prev) =>
        replace(prev, code, (item) => ({
          ...item,
          stageKey: target,
          daysInStage: 1,
          status: 'returned',
          checklist: points.map((text) => ({ text, done: false })),
          history: [
            ...item.history,
            {
              actor: role.name,
              role: role.position,
              action: `mengembalikan ke ${STAGE_LABEL[target].desk}`,
              time: nowStamp(),
              kind: 'return',
              comment: `${points.join('. ')}.`,
            },
          ],
        })),
      )

      toast(`${code} dikembalikan ke ${STAGE_LABEL[target].desk} dengan ${points.length} poin checklist`)
    },
    [list, role, setList, toast],
  )

  /** Tick or untick one revision checklist item. */
  const toggleChecklist = useCallback(
    (code: string, index: number) => {
      setList((prev) =>
        replace(prev, code, (item) => ({
          ...item,
          checklist: item.checklist.map((point, i) => (i === index ? { ...point, done: !point.done } : point)),
        })),
      )
    },
    [setList],
  )

  /** A new submission from a submitter; it lands straight on their category's secretary. */
  const create = useCallback(
    (title: string, category: Category) => {
      const code = `${CODE_PREFIX[category]}-2609-0${40 + list.length}`
      const time = nowStamp()
      const draft: Submission = {
        code,
        title: title.trim() === '' ? 'Pengajuan tanpa judul' : title.trim(),
        requester: role.name,
        requesterId: role.id,
        cluster: 'HCRC',
        category,
        createdAt: '12 Sep 2026',
        stageKey: 'secretary',
        daysInStage: 1,
        status: 'running',
        attachments: [
          { name: 'Foto kondisi ruang arsip.pdf', type: 'pdf', size: '820 KB' },
          { name: 'Estimasi harga rak.xlsx', type: 'xls', size: '44 KB' },
        ],
        checklist: [],
        history: [
          { actor: role.name, role: 'Pengaju', action: 'mengirim pengajuan', time, kind: 'submit' },
        ],
      }

      setList((prev) => [draft, ...prev])
      toast(`${code} terkirim ke ${roleById(route[category]).name}`)
      return code
    },
    [list.length, role, route, setList, toast],
  )

  return { advance, sendBack, toggleChecklist, create }
}
