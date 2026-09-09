import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QrCode({ value, size = 160 }) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    if (!value) {
      setDataUrl('')
      return
    }
    QRCode.toDataURL(value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then(setDataUrl)
      .catch(() => setDataUrl(''))
  }, [value, size])

  if (!dataUrl) return null

  return <img className="qr-image" src={dataUrl} alt={`Código QR ${value}`} width={size} height={size} />
}