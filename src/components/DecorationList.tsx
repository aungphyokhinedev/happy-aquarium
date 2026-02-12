import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Decoration, DecorationType } from '@/lib/supabase'
import { DECORATION_LIMIT } from '@/game/constants'

interface DecorationWithType extends Decoration {
  decoration_types?: DecorationType
}

interface DecorationListProps {
  aquariumId: string
  decorations: DecorationWithType[]
  credits: number
  onUpdate: () => void
  onCreditsChange: () => void
  onClose: () => void
}

export function DecorationList({
  decorations,
  onUpdate,
}: DecorationListProps) {
  const [movingId, setMovingId] = useState<string | null>(null)
  const [pos, setPos] = useState<{ x: number; y: number; z: number; ry: number } | null>(null)

  async function removeDecoration(id: string) {
    await supabase.from('decorations').delete().eq('id', id)
    onUpdate()
  }

  async function updatePosition(id: string, x: number, y: number, z: number, rotationY: number) {
    await supabase.from('decorations').update({
      position_x: x,
      position_y: y,
      position_z: z,
      rotation_y: rotationY,
    }).eq('id', id)
    onUpdate()
  }

  function startMove(d: DecorationWithType) {
    setMovingId(d.id)
    setPos({ x: d.position_x, y: d.position_y, z: d.position_z, ry: d.rotation_y })
  }

  function cancelMove() {
    setMovingId(null)
    setPos(null)
  }

  async function saveMove() {
    if (!movingId || !pos) return
    await updatePosition(movingId, pos.x, pos.y, pos.z, pos.ry)
    setMovingId(null)
    setPos(null)
  }

  return (
    <>
      <h2>Decorations</h2>
      <p className="limit-hint">{decorations.length} / {DECORATION_LIMIT} placed. Buy more in Shop.</p>
      <div className="decoration-grid">
        {decorations.map((d) => (
          <div key={d.id} className="decoration-card">
            <h3>{d.decoration_types?.name ?? 'Decoration'}</h3>
            {movingId === d.id && pos ? (
              <>
                <label>X <input type="number" step={0.1} value={pos.x} onChange={(e) => setPos((p) => p ? { ...p, x: Number(e.target.value) } : null)} /></label>
                <label>Y <input type="number" step={0.1} value={pos.y} onChange={(e) => setPos((p) => p ? { ...p, y: Number(e.target.value) } : null)} /></label>
                <label>Z <input type="number" step={0.1} value={pos.z} onChange={(e) => setPos((p) => p ? { ...p, z: Number(e.target.value) } : null)} /></label>
                <label>Rotate <input type="number" step={0.1} value={pos.ry} onChange={(e) => setPos((p) => p ? { ...p, ry: Number(e.target.value) } : null)} /></label>
                <button type="button" onClick={saveMove}>Save position</button>
                <button type="button" onClick={cancelMove}>Cancel</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => startMove(d)}>Move</button>
                <button type="button" onClick={() => removeDecoration(d.id)}>Remove</button>
              </>
            )}
          </div>
        ))}
      </div>
      {decorations.length === 0 && <p>No decorations. Buy from Shop and they appear here and in the tank.</p>}
    </>
  )
}
