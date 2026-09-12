import { useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="canvas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Halaman tidak ditemukan</h1>
          <p className="page-sub">Alamat yang Anda buka tidak ada di sistem pengajuan.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
            <Icon name="inbox" size={16} strokeWidth={2} /> Kembali ke kotak masuk
          </button>
        </div>
      </div>
    </div>
  )
}
