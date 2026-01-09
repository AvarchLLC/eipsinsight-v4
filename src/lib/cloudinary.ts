import { env } from '@/env'

function parseCloudinaryUrl(url: string) {
  // cloudinary://<api_key>:<api_secret>@<cloud_name>
  const parsed = new URL(url)
  const apiKey = parsed.username
  const apiSecret = parsed.password
  const cloudName = parsed.hostname
  if (!apiKey || !apiSecret || !cloudName) {
    throw new Error('Invalid CLOUDINARY_URL')
  }
  return { apiKey, apiSecret, cloudName }
}

const { apiKey, apiSecret, cloudName } = parseCloudinaryUrl(env.CLOUDINARY_URL)
const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET
const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

export async function uploadImageToCloudinary(file: Blob, fileName: string): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append('file', file, fileName)

  if (uploadPreset) {
    formData.append('upload_preset', uploadPreset)
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloudinary upload failed: ${text}`)
  }

  const json = (await res.json()) as { secure_url?: string }
  if (!json.secure_url) {
    throw new Error('Cloudinary response missing secure_url')
  }
  return { url: json.secure_url }
}
