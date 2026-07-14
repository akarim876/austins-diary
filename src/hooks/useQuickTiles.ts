import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_TILES, TILE_DEFS } from '../lib/tileConstants'
import type { TileId } from '../lib/tileConstants'

export type QuickTileId = TileId | `tracker:${string}`

const MIN_TILES = 2
const MAX_TILES = 6

function storageKey(userId: string) {
  return `quick_tiles_v1_${userId}`
}

function isValidTileId(id: string): id is QuickTileId {
  const knownIds = new Set<string>(TILE_DEFS.map(t => t.id))
  return knownIds.has(id) || id.startsWith('tracker:')
}

function readFromStorage(userId: string): QuickTileId[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return DEFAULT_TILES
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return DEFAULT_TILES
    const valid = (parsed as string[]).filter(isValidTileId)
    if (valid.length < MIN_TILES) return DEFAULT_TILES
    return valid.slice(0, MAX_TILES)
  } catch {
    return DEFAULT_TILES
  }
}

function writeToStorage(userId: string, tiles: QuickTileId[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(tiles))
  } catch {
    // Ignore storage errors (private browsing, quota, etc.)
  }
}

export function useQuickTiles(userId: string | null) {
  const [tiles, setTilesState] = useState<QuickTileId[]>(
    userId ? readFromStorage(userId) : DEFAULT_TILES,
  )

  // Re-read from storage when userId changes (e.g. after sign-in)
  useEffect(() => {
    if (userId) setTilesState(readFromStorage(userId))
  }, [userId])

  const setTiles = useCallback((next: QuickTileId[]) => {
    const clamped = next.slice(0, MAX_TILES)
    setTilesState(clamped)
    if (userId) writeToStorage(userId, clamped)
  }, [userId])

  const addTile = useCallback((id: QuickTileId) => {
    setTiles([...tiles, id])
  }, [tiles, setTiles])

  const removeTile = useCallback((id: QuickTileId) => {
    if (tiles.length <= MIN_TILES) return   // enforce minimum
    setTiles(tiles.filter(t => t !== id))
  }, [tiles, setTiles])

  const moveTile = useCallback((id: QuickTileId, direction: 'up' | 'down') => {
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
