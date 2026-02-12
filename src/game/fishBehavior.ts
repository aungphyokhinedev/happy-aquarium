import * as THREE from 'three'

interface FishEntry {
  id: string
  mesh: THREE.Mesh
  fishId: string
  speciesId: string
}

interface Bounds {
  halfW: number
  halfH: number
  halfD: number
}

const SPEED = 0.4
const GROUP_RADIUS = 1.2
const GROUP_WEIGHT = 0.02
const WANDER_WEIGHT = 0.01
export function fishBehavior(
  fishArray: FishEntry[],
  dt: number,
  bounds: Bounds
) {
  const { halfW, halfH, halfD } = bounds
  const positions = new Map<string, THREE.Vector3>()
  const bySpecies = new Map<string, FishEntry[]>()
  fishArray.forEach((f) => {
    positions.set(f.id, f.mesh.position.clone())
    const list = bySpecies.get(f.speciesId) ?? []
    list.push(f)
    bySpecies.set(f.speciesId, list)
  })

  fishArray.forEach((f) => {
    const pos = f.mesh.position
    const vel = (f.mesh.userData.velocity as THREE.Vector3) ?? new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.5
    )
    f.mesh.userData.velocity = vel

    const sameSpecies = bySpecies.get(f.speciesId)?.filter((o) => o.id !== f.id) ?? []
    const centroid = new THREE.Vector3(0, 0, 0)
    let count = 0
    sameSpecies.forEach((other) => {
      const op = positions.get(other.id)
      if (op && pos.distanceTo(op) < GROUP_RADIUS) {
        centroid.add(op)
        count++
      }
    })
    if (count > 0) {
      centroid.divideScalar(count)
      centroid.sub(pos).multiplyScalar(GROUP_WEIGHT)
      vel.add(centroid)
    }

    vel.x += (Math.random() - 0.5) * WANDER_WEIGHT
    vel.y += (Math.random() - 0.5) * WANDER_WEIGHT
    vel.z += (Math.random() - 0.5) * WANDER_WEIGHT
    vel.clampLength(0, SPEED)

    pos.add(vel.clone().multiplyScalar(dt))

    if (pos.x < -halfW) { pos.x = -halfW; vel.x = Math.abs(vel.x) * 0.5 }
    if (pos.x > halfW) { pos.x = halfW; vel.x = -Math.abs(vel.x) * 0.5 }
    if (pos.y < -halfH) { pos.y = -halfH; vel.y = Math.abs(vel.y) * 0.5 }
    if (pos.y > halfH) { pos.y = halfH; vel.y = -Math.abs(vel.y) * 0.5 }
    if (pos.z < -halfD) { pos.z = -halfD; vel.z = Math.abs(vel.z) * 0.5 }
    if (pos.z > halfD) { pos.z = halfD; vel.z = -Math.abs(vel.z) * 0.5 }

    if (vel.lengthSq() > 0.0001) {
      f.mesh.lookAt(pos.clone().add(vel))
    }
  })
}
