import * as THREE from 'three'

export interface FishEntry {
  id: string
  mesh: THREE.Object3D
  fishId: string
  speciesId: string
}

interface Bounds {
  halfW: number
  halfH: number
  halfD: number
}

const SPEED = 0.35
const GROUP_RADIUS = 1.2
const GROUP_WEIGHT = 0.02
const WANDER_WEIGHT = 0.008
const TAIL_WAG_SPEED = 6
const TAIL_WAG_AMPLITUDE = 0.25

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

  const time = Date.now() * 0.001

  fishArray.forEach((f, idx) => {
    const pos = f.mesh.position
    const vel = (f.mesh.userData.velocity as THREE.Vector3) ?? new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.4
    )
    f.mesh.userData.velocity = vel

    // Grouping with same species
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

    // Wander
    vel.x += (Math.random() - 0.5) * WANDER_WEIGHT
    vel.y += (Math.random() - 0.5) * WANDER_WEIGHT * 0.5
    vel.z += (Math.random() - 0.5) * WANDER_WEIGHT
    vel.clampLength(0, SPEED)

    // Integrate
    pos.add(vel.clone().multiplyScalar(dt))

    // Boundary bounce
    if (pos.x < -halfW) { pos.x = -halfW; vel.x = Math.abs(vel.x) * 0.5 }
    if (pos.x > halfW) { pos.x = halfW; vel.x = -Math.abs(vel.x) * 0.5 }
    if (pos.y < -halfH) { pos.y = -halfH; vel.y = Math.abs(vel.y) * 0.5 }
    if (pos.y > halfH) { pos.y = halfH; vel.y = -Math.abs(vel.y) * 0.5 }
    if (pos.z < -halfD) { pos.z = -halfD; vel.z = Math.abs(vel.z) * 0.5 }
    if (pos.z > halfD) { pos.z = halfD; vel.z = -Math.abs(vel.z) * 0.5 }

    // Smooth rotation to face movement direction
    if (vel.lengthSq() > 0.0001) {
      const target = pos.clone().add(vel.clone().normalize())
      const lookQ = new THREE.Quaternion()
      const lookMat = new THREE.Matrix4().lookAt(pos, target, new THREE.Vector3(0, 1, 0))
      lookQ.setFromRotationMatrix(lookMat)
      f.mesh.quaternion.slerp(lookQ, 0.08)
    }

    // Tail wag animation – rotate the tail child if it exists
    // The tail is typically the 3rd child in the group (index 2)
    const tail = f.mesh.children[2]
    if (tail) {
      tail.rotation.y = Math.PI * 0.5 + Math.sin(time * TAIL_WAG_SPEED + idx * 1.7) * TAIL_WAG_AMPLITUDE
    }

    // Subtle body bob
    const bob = Math.sin(time * 2.5 + idx * 2.3) * 0.003
    pos.y += bob
  })
}
