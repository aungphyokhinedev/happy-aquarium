import * as THREE from 'three'

/* ================================================================
   Procedural mesh builders for fish species & decoration types.
   No external assets required – everything is built from geometry.
   ================================================================ */

// ---------- colour helpers ----------

function hsl(h: number, s: number, l: number) {
  return new THREE.Color().setHSL(h, s, l)
}

// Deterministic pseudo-random from a string (for consistent colours per species)
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

// ---------- shared materials ----------

function bodyMat(color: THREE.Color, emissive?: THREE.Color) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emissive ?? color.clone().multiplyScalar(0.25),
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.05,
    flatShading: false,
  })
}

function finMat(color: THREE.Color) {
  return new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    side: THREE.DoubleSide,
    roughness: 0.4,
    metalness: 0.0,
  })
}

// ---------- species colour palettes ----------

interface FishPalette {
  body: THREE.Color
  belly: THREE.Color
  fin: THREE.Color
  accent: THREE.Color
  eyeColor: THREE.Color
  bodyScaleX: number
  bodyScaleY: number
  bodyScaleZ: number
  tailScale: number
  dorsalHeight: number
}

const SPECIES_PALETTES: Record<string, Partial<FishPalette>> = {
  goldfish:       { body: hsl(0.08, 0.9, 0.55), belly: hsl(0.1, 0.85, 0.7), fin: hsl(0.06, 0.8, 0.5), accent: hsl(0.08, 1, 0.6), bodyScaleX: 1.1, bodyScaleY: 1.0, tailScale: 1.3 },
  neon_tetra:     { body: hsl(0.55, 0.85, 0.45), belly: hsl(0.0, 0.9, 0.5), fin: hsl(0.55, 0.6, 0.5), accent: hsl(0.12, 1, 0.55), bodyScaleX: 0.7, bodyScaleY: 0.6, bodyScaleZ: 0.6, tailScale: 0.7, dorsalHeight: 0.6 },
  guppy:          { body: hsl(0.3, 0.7, 0.5), belly: hsl(0.15, 0.6, 0.7), fin: hsl(0.8, 0.7, 0.55), accent: hsl(0.75, 0.8, 0.6), bodyScaleX: 0.65, bodyScaleY: 0.55, bodyScaleZ: 0.55, tailScale: 1.1 },
  angelfish:      { body: hsl(0.0, 0.0, 0.92), belly: hsl(0.0, 0.0, 0.85), fin: hsl(0.6, 0.3, 0.85), accent: hsl(0.15, 0.8, 0.55), bodyScaleX: 0.6, bodyScaleY: 1.4, bodyScaleZ: 0.5, tailScale: 0.7, dorsalHeight: 1.8 },
  betta:          { body: hsl(0.75, 0.85, 0.4), belly: hsl(0.8, 0.7, 0.55), fin: hsl(0.72, 0.9, 0.5), accent: hsl(0.0, 0.9, 0.5), bodyScaleX: 0.8, bodyScaleY: 0.9, tailScale: 1.8, dorsalHeight: 1.5 },
  clownfish:      { body: hsl(0.07, 0.95, 0.55), belly: hsl(0.0, 0.0, 0.95), fin: hsl(0.07, 0.9, 0.5), accent: hsl(0.0, 0.0, 0.95), bodyScaleX: 0.9, bodyScaleY: 0.8, tailScale: 0.9 },
  dragon_fish:    { body: hsl(0.58, 0.6, 0.3), belly: hsl(0.55, 0.5, 0.5), fin: hsl(0.0, 0.8, 0.4), accent: hsl(0.1, 1, 0.5), bodyScaleX: 1.3, bodyScaleY: 0.8, bodyScaleZ: 0.7, tailScale: 1.1, dorsalHeight: 1.3 },
  crystal_tetra:  { body: hsl(0.5, 0.3, 0.75), belly: hsl(0.55, 0.2, 0.85), fin: hsl(0.52, 0.5, 0.7), accent: hsl(0.48, 0.6, 0.65), bodyScaleX: 0.7, bodyScaleY: 0.6, bodyScaleZ: 0.6, tailScale: 0.8 },
}

function getPalette(modelRef: string): FishPalette {
  const p = SPECIES_PALETTES[modelRef]
  const fallbackHue = (hashStr(modelRef) % 360) / 360
  return {
    body:       p?.body       ?? hsl(fallbackHue, 0.7, 0.5),
    belly:      p?.belly      ?? hsl(fallbackHue + 0.05, 0.6, 0.65),
    fin:        p?.fin        ?? hsl(fallbackHue + 0.1, 0.6, 0.5),
    accent:     p?.accent     ?? hsl(fallbackHue + 0.15, 0.8, 0.55),
    eyeColor:   p?.eyeColor   ?? new THREE.Color(0x111111),
    bodyScaleX: p?.bodyScaleX ?? 1,
    bodyScaleY: p?.bodyScaleY ?? 1,
    bodyScaleZ: p?.bodyScaleZ ?? 1,
    tailScale:  p?.tailScale  ?? 1,
    dorsalHeight: p?.dorsalHeight ?? 1,
  }
}

// ---------- fish mesh builder ----------

export function buildFishMesh(modelRef: string): THREE.Group {
  const pal = getPalette(modelRef)
  const group = new THREE.Group()

  // Body – ellipsoid
  const bodyGeom = new THREE.SphereGeometry(0.16, 16, 12)
  bodyGeom.scale(pal.bodyScaleX, pal.bodyScaleY, pal.bodyScaleZ)
  const body = new THREE.Mesh(bodyGeom, bodyMat(pal.body))
  body.castShadow = true
  group.add(body)

  // Belly stripe (lower half tint) – thin ellipsoid
  const bellyGeom = new THREE.SphereGeometry(0.145, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5)
  bellyGeom.scale(pal.bodyScaleX, pal.bodyScaleY * 0.5, pal.bodyScaleZ)
  const belly = new THREE.Mesh(bellyGeom, bodyMat(pal.belly))
  belly.position.y = -0.01
  group.add(belly)

  // Tail fin – two triangles fanning out
  const tailW = 0.12 * pal.tailScale
  const tailH = 0.14 * pal.tailScale
  const tailShape = new THREE.Shape()
  tailShape.moveTo(0, 0)
  tailShape.lineTo(-tailW, tailH)
  tailShape.lineTo(-tailW * 0.3, 0)
  tailShape.lineTo(-tailW, -tailH)
  tailShape.lineTo(0, 0)
  const tailGeom = new THREE.ShapeGeometry(tailShape)
  const tail = new THREE.Mesh(tailGeom, finMat(pal.fin))
  tail.position.set(-0.16 * pal.bodyScaleX, 0, 0)
  tail.rotation.y = Math.PI * 0.5
  group.add(tail)

  // Dorsal fin
  const dorsalShape = new THREE.Shape()
  const dh = 0.1 * pal.dorsalHeight
  dorsalShape.moveTo(0.06, 0)
  dorsalShape.quadraticCurveTo(0.02, dh, -0.06, 0.02)
  dorsalShape.lineTo(-0.04, 0)
  dorsalShape.lineTo(0.06, 0)
  const dorsalGeom = new THREE.ShapeGeometry(dorsalShape)
  const dorsal = new THREE.Mesh(dorsalGeom, finMat(pal.fin))
  dorsal.position.set(0, 0.12 * pal.bodyScaleY, 0)
  dorsal.rotation.x = 0
  group.add(dorsal)

  // Pectoral fins (left + right)
  const pectoralShape = new THREE.Shape()
  pectoralShape.moveTo(0, 0)
  pectoralShape.lineTo(0.06, -0.04)
  pectoralShape.quadraticCurveTo(0.08, -0.08, 0.03, -0.09)
  pectoralShape.lineTo(0, 0)
  const pecGeom = new THREE.ShapeGeometry(pectoralShape)
  const pecMatL = finMat(pal.fin)
  const pecL = new THREE.Mesh(pecGeom, pecMatL)
  pecL.position.set(0.02, -0.06, 0.1 * pal.bodyScaleZ)
  pecL.rotation.x = -0.3
  group.add(pecL)
  const pecR = new THREE.Mesh(pecGeom.clone(), pecMatL.clone())
  pecR.position.set(0.02, -0.06, -0.1 * pal.bodyScaleZ)
  pecR.rotation.x = 0.3
  pecR.scale.z = -1
  group.add(pecR)

  // Eyes
  const eyeGeom = new THREE.SphereGeometry(0.025, 8, 8)
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  const pupilGeom = new THREE.SphereGeometry(0.014, 8, 8)
  const pupilMat = new THREE.MeshStandardMaterial({ color: pal.eyeColor, roughness: 0.1, metalness: 0.3 })

  const eyeOffsetX = 0.1 * pal.bodyScaleX
  const eyeOffsetY = 0.04 * pal.bodyScaleY
  const eyeOffsetZ = 0.09 * pal.bodyScaleZ

  const eyeL = new THREE.Mesh(eyeGeom, eyeWhiteMat)
  eyeL.position.set(eyeOffsetX, eyeOffsetY, eyeOffsetZ)
  group.add(eyeL)
  const pupilL = new THREE.Mesh(pupilGeom, pupilMat)
  pupilL.position.set(eyeOffsetX + 0.015, eyeOffsetY, eyeOffsetZ + 0.012)
  group.add(pupilL)

  const eyeR = new THREE.Mesh(eyeGeom.clone(), eyeWhiteMat.clone())
  eyeR.position.set(eyeOffsetX, eyeOffsetY, -eyeOffsetZ)
  group.add(eyeR)
  const pupilR = new THREE.Mesh(pupilGeom.clone(), pupilMat.clone())
  pupilR.position.set(eyeOffsetX + 0.015, eyeOffsetY, -eyeOffsetZ - 0.012)
  group.add(pupilR)

  // Clownfish stripes
  if (modelRef === 'clownfish') {
    const stripeGeom = new THREE.TorusGeometry(0.13, 0.012, 6, 16)
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    for (const x of [0.06, -0.04]) {
      const stripe = new THREE.Mesh(stripeGeom, stripeMat)
      stripe.position.x = x
      stripe.rotation.y = Math.PI / 2
      stripe.scale.set(pal.bodyScaleY * 0.9, 1, pal.bodyScaleZ * 0.9)
      group.add(stripe)
    }
  }

  // Crystal tetra – add subtle emissive glow
  if (modelRef === 'crystal_tetra') {
    const glowGeom = new THREE.SphereGeometry(0.17, 12, 10)
    glowGeom.scale(pal.bodyScaleX, pal.bodyScaleY, pal.bodyScaleZ)
    const glowMat = new THREE.MeshStandardMaterial({
      color: hsl(0.52, 0.5, 0.7),
      emissive: hsl(0.52, 0.7, 0.4),
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.3,
      roughness: 0.1,
    })
    const glow = new THREE.Mesh(glowGeom, glowMat)
    group.add(glow)
  }

  // Dragon fish – spiky dorsal
  if (modelRef === 'dragon_fish') {
    for (let i = 0; i < 5; i++) {
      const spikeGeom = new THREE.ConeGeometry(0.012, 0.06, 4)
      const spike = new THREE.Mesh(spikeGeom, bodyMat(pal.accent))
      spike.position.set(0.08 - i * 0.04, 0.16 * pal.bodyScaleY, 0)
      spike.rotation.z = -0.15 + i * 0.04
      group.add(spike)
    }
  }

  return group
}

// ---------- decoration mesh builders ----------

function buildPlant(height: number, leafCount: number, color: THREE.Color): THREE.Group {
  const group = new THREE.Group()

  // Stem
  const stemGeom = new THREE.CylinderGeometry(0.012, 0.018, height, 6)
  const stemMat = new THREE.MeshStandardMaterial({ color: hsl(0.3, 0.55, 0.4), roughness: 0.6 })
  const stem = new THREE.Mesh(stemGeom, stemMat)
  stem.position.y = height / 2
  group.add(stem)

  // Leaves
  const leafGeom = new THREE.SphereGeometry(1, 8, 6)
  leafGeom.scale(0.06, 0.15, 0.02)
  const leafMat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    metalness: 0.0,
    side: THREE.DoubleSide,
  })

  for (let i = 0; i < leafCount; i++) {
    const t = (i + 1) / (leafCount + 1)
    const leaf = new THREE.Mesh(leafGeom.clone(), leafMat.clone())
    leaf.position.y = height * t
    const side = i % 2 === 0 ? 1 : -1
    leaf.position.x = side * 0.03
    leaf.rotation.z = side * (0.3 + Math.random() * 0.4)
    leaf.rotation.y = Math.random() * Math.PI
    const s = 0.8 + t * 0.5
    leaf.scale.set(s, s, s)
    group.add(leaf)
  }

  // Top cluster
  for (let i = 0; i < 3; i++) {
    const topLeaf = new THREE.Mesh(leafGeom.clone(), leafMat.clone())
    topLeaf.position.y = height - 0.02
    topLeaf.rotation.z = ((i - 1) * Math.PI) / 5
    topLeaf.rotation.y = (i * Math.PI * 2) / 3
    topLeaf.scale.set(1.2, 1.2, 1.2)
    group.add(topLeaf)
  }

  return group
}

function buildRock(size: number): THREE.Group {
  const group = new THREE.Group()
  const geom = new THREE.IcosahedronGeometry(size, 1)

  // Displace vertices for an organic look
  const pos = geom.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i)
    const noise = 0.85 + Math.random() * 0.3
    pos.setXYZ(i, x * noise, y * (0.6 + Math.random() * 0.3), z * noise)
  }
  geom.computeVertexNormals()

  const mat = new THREE.MeshStandardMaterial({
    color: hsl(0.08, 0.2, 0.5),
    roughness: 0.75,
    metalness: 0.05,
    flatShading: true,
  })
  const rock = new THREE.Mesh(geom, mat)
  rock.castShadow = true
  rock.receiveShadow = true
  group.add(rock)

  // Moss patches
  for (let i = 0; i < 3; i++) {
    const mossGeom = new THREE.SphereGeometry(size * 0.3, 6, 4)
    const mossMat = new THREE.MeshStandardMaterial({
      color: hsl(0.3, 0.55, 0.45),
      roughness: 0.8,
      flatShading: true,
    })
    const moss = new THREE.Mesh(mossGeom, mossMat)
    const angle = (i / 3) * Math.PI * 2
    moss.position.set(Math.cos(angle) * size * 0.4, size * 0.3, Math.sin(angle) * size * 0.4)
    moss.scale.y = 0.5
    group.add(moss)
  }

  return group
}

function buildShell(): THREE.Group {
  const group = new THREE.Group()

  // Shell base – half sphere
  const shellGeom = new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55)
  const shellMat = new THREE.MeshStandardMaterial({
    color: hsl(0.08, 0.4, 0.7),
    roughness: 0.3,
    metalness: 0.2,
  })
  const shell = new THREE.Mesh(shellGeom, shellMat)
  shell.rotation.x = Math.PI
  shell.castShadow = true
  group.add(shell)

  // Ridges
  for (let i = 0; i < 8; i++) {
    const ridgeGeom = new THREE.TorusGeometry(0.085, 0.005, 4, 12, Math.PI)
    const ridge = new THREE.Mesh(ridgeGeom, new THREE.MeshStandardMaterial({
      color: hsl(0.08, 0.3, 0.6),
      roughness: 0.5,
    }))
    ridge.rotation.y = (i / 8) * Math.PI * 2
    ridge.rotation.x = Math.PI * 0.5
    ridge.position.y = 0.01
    group.add(ridge)
  }

  // Inner pearl
  const pearlGeom = new THREE.SphereGeometry(0.025, 8, 8)
  const pearlMat = new THREE.MeshStandardMaterial({
    color: 0xfff5ee,
    roughness: 0.1,
    metalness: 0.4,
    emissive: new THREE.Color(0xfff5ee),
    emissiveIntensity: 0.2,
  })
  const pearl = new THREE.Mesh(pearlGeom, pearlMat)
  pearl.position.y = 0.02
  group.add(pearl)

  return group
}

function buildCoral(): THREE.Group {
  const group = new THREE.Group()
  const colors = [hsl(0.95, 0.7, 0.5), hsl(0.05, 0.8, 0.55), hsl(0.85, 0.6, 0.5)]

  // Main branches
  for (let i = 0; i < 5; i++) {
    const branchHeight = 0.15 + Math.random() * 0.15
    const branchGeom = new THREE.CylinderGeometry(0.008, 0.018, branchHeight, 6)
    const color = colors[i % colors.length]
    const branchMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.6,
      metalness: 0.05,
    })
    const branch = new THREE.Mesh(branchGeom, branchMat)
    const angle = (i / 5) * Math.PI * 2
    const radius = 0.04 + Math.random() * 0.03
    branch.position.set(
      Math.cos(angle) * radius,
      branchHeight / 2,
      Math.sin(angle) * radius
    )
    branch.rotation.z = (Math.random() - 0.5) * 0.4
    branch.rotation.x = (Math.random() - 0.5) * 0.3
    branch.castShadow = true
    group.add(branch)

    // Tips – rounded blobs
    const tipGeom = new THREE.SphereGeometry(0.025, 8, 6)
    const tipMat = new THREE.MeshStandardMaterial({
      color: color.clone().offsetHSL(0, 0.1, 0.15),
      emissive: color.clone().multiplyScalar(0.2),
      roughness: 0.4,
    })
    const tip = new THREE.Mesh(tipGeom, tipMat)
    tip.position.y = branchHeight / 2 + 0.02
    branch.add(tip)

    // Sub-branches
    if (Math.random() > 0.4) {
      const subH = branchHeight * 0.5
      const subGeom = new THREE.CylinderGeometry(0.005, 0.01, subH, 5)
      const sub = new THREE.Mesh(subGeom, branchMat.clone())
      sub.position.y = branchHeight * 0.3
      sub.rotation.z = (Math.random() - 0.5) * 0.8
      branch.add(sub)

      const subTip = new THREE.Mesh(tipGeom.clone(), tipMat.clone())
      subTip.position.y = subH / 2 + 0.01
      sub.add(subTip)
    }
  }

  // Base rock
  const baseGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.04, 8)
  const baseMat = new THREE.MeshStandardMaterial({
    color: hsl(0.08, 0.1, 0.35),
    roughness: 0.9,
    flatShading: true,
  })
  const base = new THREE.Mesh(baseGeom, baseMat)
  base.position.y = 0.02
  base.receiveShadow = true
  group.add(base)

  return group
}

// ---------- public decoration builder ----------

export function buildDecorationMesh(assetRef: string): THREE.Group {
  switch (assetRef) {
    case 'plant_small':
      return buildPlant(0.3, 4, hsl(0.33, 0.65, 0.4))
    case 'plant_large':
      return buildPlant(0.55, 7, hsl(0.28, 0.6, 0.35))
    case 'rock_small':
      return buildRock(0.08)
    case 'rock_large':
      return buildRock(0.15)
    case 'shell':
      return buildShell()
    case 'coral':
      return buildCoral()
    default: {
      // Fallback – generic small plant
      return buildPlant(0.25, 3, hsl(0.35, 0.5, 0.45))
    }
  }
}

// ---------- sand floor particle builder ----------

export function buildSandFloor(width: number, depth: number): THREE.Group {
  const group = new THREE.Group()

  // Main sand plane
  const sandGeom = new THREE.PlaneGeometry(width, depth, 32, 32)
  // Displace vertices for slight undulation
  const pos = sandGeom.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    pos.setZ(i, (Math.random() - 0.5) * 0.03)
  }
  sandGeom.computeVertexNormals()

  const sandMat = new THREE.MeshStandardMaterial({
    color: hsl(0.1, 0.35, 0.65),
    roughness: 0.8,
    metalness: 0.0,
    flatShading: false,
  })
  const sand = new THREE.Mesh(sandGeom, sandMat)
  sand.rotation.x = -Math.PI / 2
  sand.receiveShadow = true
  group.add(sand)

  // Small pebbles
  const pebbleGeom = new THREE.SphereGeometry(0.015, 5, 4)
  const pebbleColors = [hsl(0.08, 0.2, 0.6), hsl(0.06, 0.15, 0.55), hsl(0.1, 0.1, 0.65)]
  for (let i = 0; i < 30; i++) {
    const pMat = new THREE.MeshStandardMaterial({
      color: pebbleColors[i % pebbleColors.length],
      roughness: 0.8,
      flatShading: true,
    })
    const pebble = new THREE.Mesh(pebbleGeom.clone(), pMat)
    pebble.position.set(
      (Math.random() - 0.5) * width * 0.9,
      -0.005,
      (Math.random() - 0.5) * depth * 0.9
    )
    pebble.scale.set(
      0.8 + Math.random() * 0.6,
      0.5 + Math.random() * 0.3,
      0.8 + Math.random() * 0.6
    )
    group.add(pebble)
  }

  return group
}

// ---------- bubble particles ----------

export function buildBubbleSystem(count: number, bounds: { w: number; h: number; d: number }): {
  points: THREE.Points
  update: (dt: number) => void
} {
  const positions = new Float32Array(count * 3)
  const velocities: number[] = []

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * bounds.w
    positions[i * 3 + 1] = (Math.random() - 0.5) * bounds.h
    positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.d
    velocities.push(0.05 + Math.random() * 0.1) // rise speed
  }

  const geom = new THREE.BufferGeometry()
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: 0xaaddff,
    size: 0.025,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })

  const points = new THREE.Points(geom, mat)

  function update(dt: number) {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      let y = pos.getY(i) + velocities[i] * dt
      // Horizontal wobble
      const x = pos.getX(i) + Math.sin(Date.now() * 0.001 + i) * 0.002
      pos.setX(i, x)
      if (y > bounds.h / 2) {
        y = -bounds.h / 2
        pos.setX(i, (Math.random() - 0.5) * bounds.w)
        pos.setZ(i, (Math.random() - 0.5) * bounds.d)
      }
      pos.setY(i, y)
    }
    pos.needsUpdate = true
  }

  return { points, update }
}
