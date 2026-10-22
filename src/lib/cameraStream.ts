export const dashboardStreamUrl = (url: string) => {
  const trimmed = url.trim()
  if (!trimmed || (!trimmed.startsWith('/') && !/^https?:\/\//i.test(trimmed))) return trimmed
  try {
    const parsed = new URL(trimmed, 'http://dashboard.local')
    if (parsed.pathname.startsWith('/api/hls/') || parsed.pathname.startsWith('/api/camera_proxy')) {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    return trimmed
  }
  return trimmed
}

export const rewriteHlsPlaylist = (body: string) =>
  body.split('\n').map((line) => {
    const attribute = line.match(/URI="([^"]+)"/)
    if (attribute) return line.replace(attribute[1], dashboardStreamUrl(attribute[1]))
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return line
    return dashboardStreamUrl(trimmed)
  }).join('\n')
