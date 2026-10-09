// Defaults to a relative path so dev requests go through the Vite proxy
// (see vite.config.js) and avoid CORS, since the backend doesn't send
// Access-Control-Allow-Origin. Override with an absolute URL in
// environments without that proxy (e.g. production, behind a configured gateway).
const BASE_URL = import.meta.env.VITE_NODES_API_BASE_URL ?? ''

export async function fetchNodesPage(page) {
  const response = await fetch(`${BASE_URL}/nodes/?page=${page}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch nodes page ${page}: ${response.status}`)
  }

  return response.json()
}
