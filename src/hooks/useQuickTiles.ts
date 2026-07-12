import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TILES, TILE_DEFS } from '../lib/tileConstants'
import type { TileId } from '../lib/tileConstants'

const MIN_TILES = 2
const MAX_TILES = 6

function storageKey(userId: string) {
  return `quick_tiles_v1_${userId}`
}

function readFromStorage(userId: string): TileId[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return DEFAULT_TILES
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return DEFAULT_TILES
    // Filter to only known tile IDs (guards against stale data)
    const knownIds = new Set(TILE_DEFS.map(t => t.id))
    const valid = (parsed as string[]).filter(id => knownIds.has(id as TileId)) as TileId[]
    if (valid.length < MIN_TILES) return DEFAULT_TILES
    return valid.slice(0, MAX_TILES)
  } catch {
    return DEFAULT_TILES
  }
}

function writeToStorage(userId: string, tiles: TileId[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(tiles))
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

export function useQuickTiles(userId: string | null) {
  const [tiles, setTilesState] = useState<TileId[]>(
    userId ? readFromStorage(userId) : DEFAULT_TILES,
  )

  // Re-read from storage when userId changes (e.g. after sign-in)
  useEffect(() => {
    if (userId) setTilesState(readFromStorage(userId))
  }, [userId])

  const setTiles = useCallback((next: TileId[]) => {
    const clamped = next.slice(0, MAX_TILES)
    setTilesState(clamped)
    if (userId) writeToStorage(userId, clamped)
  }, [userId])

  const addTile = useCallback((id: TileId) => {
    setTiles([...tiles, id])
  }, [tiles, setTiles])

  const removeTile = useCallback((id: TileId) => {
    if (tiles.length <= MIN_TILES) return   // enforce minimum
    setTiles(tiles.filter(t => t !== id))
  }, [tiles, setTiles])

  const moveTile = useCallback((id: TileId, direction: 'up' | 'down') => {
    const idx = tiles.indexOf(id)
    if (idx < 0) return
    const next = [...tiles]
    if (direction === 'up' && idx > 0) {
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    } else if (direction === 'down' && idx < next.length - 1) {
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    }
    setTiles(next)
  }, [tiles, setTiles])

  const canAdd    = tiles.length < MAX_TILES
  const canRemove = tiles.length > MIN_TILES

  return { tiles, setTiles, addTile, removeTile, moveTile, canAdd, canRemove }
}
