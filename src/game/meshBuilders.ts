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

function bodyMat(color: THREE.Color, emissive?: THREE.Color, emissiveIntensity = 0.5) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emissive ?? color.clone().multiplyScalar(0.35),
    emissiveIntensity,
    roughness: 0.25,
    metalness: 0.08,
    flatShading: false,
  })
}

function finMat(color: THREE.Color, opacity = 0.75) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color.clone().multiplyScalar(0.2),
    emissiveIntensity: 0.3,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    roughness: 0.35,
    metalness: 0.0,
  })
}

// ---------- pop-out eye builder (on stalks) ----------

function addPopEyes(
  group: THREE.Group,
  frontX: number, topY: number, sideZ: number,
  eyeRadius = 0.035, pupilRadius = 0.02, stalkLen = 0.04,
) {
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.05 })
  const eyeWhiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.1,
    emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.2,
  })
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.05, metalness: 0.4 })

  for (const side of [1, -1]) {
    const z = sideZ * side
    // Stalk (small cylinder poking outward)
    const stalkGeom = new THREE.CylinderGeometry(0.008, 0.01, stalkLen, 6)
    const stalk = new THREE.Mesh(stalkGeom, stalkMat)
    stalk.position.set(frontX, topY, z)
    stalk.rotation.x = side * Math.PI * 0.5
    group.add(stalk)

    // Eyeball (sphere at end of stalk)
    const eyeGeom = new THREE.SphereGeometry(eyeRadius, 10, 10)
    const eye = new THREE.Mesh(eyeGeom, eyeWhiteMat)
    eye.position.set(frontX, topY, z + side * stalkLen)
    group.add(eye)

    // Pupil (forward-facing)
    const pupilGeom = new THREE.SphereGeometry(pupilRadius, 8, 8)
    const pupil = new THREE.Mesh(pupilGeom, pupilMat)
    pupil.position.set(frontX + eyeRadius * 0.4, topY, z + side * (stalkLen + eyeRadius * 0.55))
    group.add(pupil)
  }
}

// ---------- shared pectoral fin helper ----------

function addPectoralFins(group: THREE.Group, color: THREE.Color, halfDepth: number, finScale = 1.0) {
  const fs = finScale
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(0.06 * fs, -0.03 * fs)
  s.quadraticCurveTo(0.09 * fs, -0.08 * fs, 0.03 * fs, -0.1 * fs)
  s.lineTo(0, 0)
  const geom = new THREE.ShapeGeometry(s)
  const mat = finMat(color, 0.65)

  const pecL = new THREE.Mesh(geom, mat)
  pecL.position.set(0.02, -0.04, halfDepth + 0.01)
  pecL.rotation.x = -0.35
  group.add(pecL)

  const pecR = new THREE.Mesh(geom.clone(), mat.clone())
  pecR.position.set(0.02, -0.04, -(halfDepth + 0.01))
  pecR.rotation.x = 0.35
  pecR.scale.z = -1
  group.add(pecR)
}

// ---------- shared tail fin builder ----------

function addTailFin(group: THREE.Group, tailX: number, color: THREE.Color, height = 0.12, width = 0.1) {
  const s = new THREE.Shape()
  s.moveTo(0, 0)
  s.lineTo(-width, height)
  s.lineTo(-width * 0.35, 0)
  s.lineTo(-width, -height)
  s.lineTo(0, 0)
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), finMat(color, 0.7))
  mesh.position.set(tailX, 0, 0)
  mesh.rotation.y = Math.PI * 0.5
  group.add(mesh)
}

// ---------- shared dorsal fin builder ----------

function addDorsalFin(group: THREE.Group, bodyTopY: number, color: THREE.Color, height = 0.1, width = 0.12) {
  const ds = new THREE.Shape()
  ds.moveTo(width * 0.4, 0)
  ds.quadraticCurveTo(0.02, height, -width * 0.4, height * 0.2)
  ds.lineTo(-width * 0.3, 0)
  ds.lineTo(width * 0.4, 0)
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(ds), finMat(color, 0.65))
  mesh.position.set(0, bodyTopY, 0)
  group.add(mesh)
}

// ================================================================
//  SPECIES-SPECIFIC CUBIC FISH BUILDERS
//  Each species uses BoxGeometry bodies with pop-out eyes and fins
// ================================================================

/** Goldfish – chunky wide cube, big fan tail, warm orange-gold */
function buildGoldfish(): THREE.Group {
  const group = new THREE.Group()
  const bodyColor = new THREE.Color(0xff8c00)
  const bellyColor = new THREE.Color(0xffd700)
  const finColor = new THREE.Color(0xffaa33)

  // Chunky cube body (slightly wider than tall)
  const w = 0.22, h = 0.18, d = 0.16
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(bodyColor))
  body.castShadow = true
  group.add(body)

  // Gold belly slab
  const belly = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, h * 0.35, d * 0.98), bodyMat(bellyColor))
  belly.position.y = -h * 0.32
  group.add(belly)

  // Big fan tail
  for (const yOff of [0.03, -0.03]) {
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.quadraticCurveTo(-0.14, yOff + 0.12, -0.2, yOff + 0.05)
    s.quadraticCurveTo(-0.18, yOff, -0.2, yOff - 0.05)
    s.quadraticCurveTo(-0.14, yOff - 0.12, 0, 0)
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), finMat(finColor, 0.65))
    mesh.position.set(-w / 2, 0, 0)
    mesh.rotation.y = Math.PI * 0.5
    group.add(mesh)
  }

  addDorsalFin(group, h / 2, finColor, 0.1, 0.14)
  addPectoralFins(group, finColor, d / 2)
  addPopEyes(group, w / 2 + 0.01, h * 0.2, d * 0.3, 0.035, 0.02, 0.04)
  return group
}

/** Neon Tetra – small slim box, neon blue stripe, red rear */
function buildNeonTetra(): THREE.Group {
  const group = new THREE.Group()
  const silverBody = new THREE.Color(0xc8d8e8)
  const blueStripe = new THREE.Color(0x00ccff)
  const redRear = new THREE.Color(0xff2244)

  const w = 0.16, h = 0.09, d = 0.08
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(silverBody, undefined, 0.3))
  body.castShadow = true
  group.add(body)

  // Neon blue stripe band across middle
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(w * 1.01, h * 0.25, d * 1.01),
    new THREE.MeshStandardMaterial({ color: blueStripe, emissive: blueStripe, emissiveIntensity: 0.9, roughness: 0.15 })
  )
  stripe.position.y = h * 0.05
  group.add(stripe)

  // Red rear block
  const rear = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.4, h * 0.9, d * 0.9),
    bodyMat(redRear, redRear.clone().multiplyScalar(0.5), 0.6)
  )
  rear.position.x = -w * 0.32
  group.add(rear)

  addTailFin(group, -w / 2, redRear, 0.06, 0.06)
  addDorsalFin(group, h / 2, new THREE.Color(0xeeeeee), 0.04, 0.06)
  addPectoralFins(group, new THREE.Color(0xdddddd), d / 2, 0.5)
  addPopEyes(group, w / 2 + 0.01, h * 0.15, d * 0.28, 0.022, 0.013, 0.03)
  return group
}

/** Guppy – small cube with oversized colorful fan tail */
function buildGuppy(): THREE.Group {
  const group = new THREE.Group()
  const bodyColor = new THREE.Color(0x44cc77)
  const tailColor = new THREE.Color(0xff44cc)
  const finAccent = new THREE.Color(0xaa55ff)

  const w = 0.13, h = 0.1, d = 0.09
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(bodyColor))
  body.castShadow = true
  group.add(body)

  // Lighter belly
  const belly = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, h * 0.3, d * 0.95), bodyMat(new THREE.Color(0x88eebb)))
  belly.position.y = -h * 0.35
  group.add(belly)

  // Oversized fan tail (guppy signature)
  const ts = new THREE.Shape()
  ts.moveTo(0, 0)
  ts.quadraticCurveTo(-0.12, 0.14, -0.18, 0.07)
  ts.quadraticCurveTo(-0.2, 0, -0.18, -0.07)
  ts.quadraticCurveTo(-0.12, -0.14, 0, 0)
  const tailMesh = new THREE.Mesh(new THREE.ShapeGeometry(ts), finMat(tailColor, 0.7))
  tailMesh.position.set(-w / 2, 0, 0)
  tailMesh.rotation.y = Math.PI * 0.5
  group.add(tailMesh)

  // Inner tail layer
  const ts2 = new THREE.Shape()
  ts2.moveTo(0, 0)
  ts2.quadraticCurveTo(-0.08, 0.09, -0.13, 0.04)
  ts2.quadraticCurveTo(-0.14, 0, -0.13, -0.04)
  ts2.quadraticCurveTo(-0.08, -0.09, 0, 0)
  const tail2 = new THREE.Mesh(new THREE.ShapeGeometry(ts2), finMat(finAccent, 0.5))
  tail2.position.set(-w / 2, 0, 0.001)
  tail2.rotation.y = Math.PI * 0.5
  group.add(tail2)

  addDorsalFin(group, h / 2, finAccent, 0.06, 0.08)
  addPectoralFins(group, new THREE.Color(0x88ddaa), d / 2, 0.6)
  addPopEyes(group, w / 2 + 0.01, h * 0.15, d * 0.3, 0.02, 0.012, 0.03)
  return group
}

/** Angelfish – tall narrow cube, vertical stripes, long trailing fins */
function buildAngelfish(): THREE.Group {
  const group = new THREE.Group()
  const bodyColor = new THREE.Color(0xf0f0f0)
  const stripeColor = new THREE.Color(0x222222)
  const finColor = new THREE.Color(0xddeeff)

  // Tall and flat cube
  const w = 0.12, h = 0.28, d = 0.08
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(bodyColor, undefined, 0.3))
  body.castShadow = true
  group.add(body)

  // Vertical black stripes
  for (const xPos of [0.02, -0.025]) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, h * 0.95, d * 1.01),
      new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.4, emissive: stripeColor, emissiveIntensity: 0.2 })
    )
    stripe.position.x = xPos
    group.add(stripe)
  }

  // Tall dorsal
  const ds = new THREE.Shape()
  ds.moveTo(0.04, 0)
  ds.quadraticCurveTo(0.02, 0.2, -0.04, 0.14)
  ds.quadraticCurveTo(-0.05, 0.07, -0.04, 0)
  ds.lineTo(0.04, 0)
  const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(ds), finMat(finColor, 0.55))
  dorsal.position.set(0, h / 2, 0)
  group.add(dorsal)

  // Long trailing ventral fins
  for (const side of [1, -1]) {
    const vs = new THREE.Shape()
    vs.moveTo(0, 0); vs.lineTo(-0.015, -0.2); vs.lineTo(0.015, -0.17); vs.lineTo(0.01, 0)
    const ventral = new THREE.Mesh(new THREE.ShapeGeometry(vs), finMat(new THREE.Color(0xffffcc), 0.5))
    ventral.position.set(0, -h / 2 - 0.01, side * d * 0.35)
    group.add(ventral)
  }

  addTailFin(group, -w / 2, finColor, 0.1, 0.06)
  addPopEyes(group, w / 2 + 0.01, h * 0.25, d * 0.3, 0.025, 0.015, 0.03)
  return group
}

/** Betta – medium cube with dramatic flowing veil fins */
function buildBetta(): THREE.Group {
  const group = new THREE.Group()
  const bodyColor = new THREE.Color(0x6622cc)
  const finColor1 = new THREE.Color(0x8833ff)
  const finColor2 = new THREE.Color(0xff2266)

  const w = 0.16, h = 0.14, d = 0.11
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(bodyColor))
  body.castShadow = true
  group.add(body)

  // Lighter belly
  const belly = new THREE.Mesh(new THREE.BoxGeometry(w * 0.95, h * 0.35, d * 0.95), bodyMat(new THREE.Color(0x9955ff)))
  belly.position.y = -h * 0.32
  group.add(belly)

  // Huge dramatic veil tail (betta signature – 3 layers)
  for (let i = 0; i < 3; i++) {
    const spread = 0.16 + i * 0.04
    const len = 0.22 + i * 0.03
    const s = new THREE.Shape()
    s.moveTo(0, 0)
    s.quadraticCurveTo(-len * 0.6, spread, -len, spread * 0.5)
    s.quadraticCurveTo(-len * 1.1, 0, -len, -spread * 0.5)
    s.quadraticCurveTo(-len * 0.6, -spread, 0, 0)
    const color = i % 2 === 0 ? finColor1 : finColor2
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(s), finMat(color, 0.5 + i * 0.08))
    mesh.position.set(-w / 2, 0, i * 0.002)
    mesh.rotation.y = Math.PI * 0.5
    group.add(mesh)
  }

  // Tall dorsal
  const ds = new THREE.Shape()
  ds.moveTo(0.06, 0)
  ds.quadraticCurveTo(0.04, 0.16, -0.02, 0.12)
  ds.quadraticCurveTo(-0.06, 0.08, -0.07, 0.02)
  ds.lineTo(-0.05, 0); ds.lineTo(0.06, 0)
  const dorsal = new THREE.Mesh(new THREE.ShapeGeometry(ds), finMat(finColor1, 0.6))
  dorsal.position.set(0, h / 2, 0)
  group.add(dorsal)

  // Flowing anal fin
  const af = new THREE.Shape()
  af.moveTo(0.04, 0)
  af.quadraticCurveTo(0, -0.12, -0.08, -0.1)
  af.quadraticCurveTo(-0.1, -0.05, -0.07, 0)
  af.lineTo(0.04, 0)
  const analFin = new THREE.Mesh(new THREE.ShapeGeometry(af), finMat(finColor2, 0.55))
  analFin.position.set(-0.02, -h / 2, 0)
  group.add(analFin)

  addPectoralFins(group, finColor1, d / 2, 0.8)
  addPopEyes(group, w / 2 + 0.01, h * 0.2, d * 0.3, 0.028, 0.016, 0.035)
  return group
}

/** Clownfish – orange cube, 3 white stripes with black edges */
function buildClownfish(): THREE.Group {
  const group = new THREE.Group()
  const bodyColor = new THREE.Color(0xff6600)
  const finColor = new THREE.Color(0xff7722)

  const w = 0.2, h = 0.14, d = 0.12
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(bodyColor, undefined, 0.6))
  body.castShadow = true
  group.add(body)

  // 3 white stripes with black borders
  for (const xPos of [0.06, 0, -0.06]) {
    // Black border stripe
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, h * 1.02, d * 1.02),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, emissive: new THREE.Color(0x111111), emissiveIntensity: 0.1 })
    )
    border.position.x = xPos
    group.add(border)

    // White inner stripe
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, h * 1.03, d * 1.03),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0.15 })
    )
    stripe.position.x = xPos
    group.add(stripe)
  }

  addTailFin(group, -w / 2, finColor, 0.09, 0.08)
  addDorsalFin(group, h / 2, new THREE.Color(0xff8833), 0.08, 0.12)
  addPectoralFins(group, finColor, d / 2, 0.7)
  addPopEyes(group, w / 2 + 0.01, h * 0.2, d * 0.3, 0.028, 0.016, 0.035)
  return group
}

/** Dragon Fish – long narrow cube, scale dots, barbel whiskers, spiky dorsal */
function buildDragonFish(): THREE.Group {
  const group = new THREE.Group()
  const bodyColor = new THREE.Color(0x228877)
  const scaleColor = new THREE.Color(0x33ccaa)
  const finColor = new THREE.Color(0xff4422)
  const accentGold = new THREE.Color(0xffcc00)

  // Long narrow cube body
  const w = 0.32, h = 0.12, d = 0.1
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(bodyColor))
  body.castShadow = true
  group.add(body)

  // Scale dots on sides
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 5; i++) {
      const scaleGeom = new THREE.BoxGeometry(0.025, 0.015, 0.008)
      const scaleMesh = new THREE.Mesh(scaleGeom, new THREE.MeshStandardMaterial({
        color: scaleColor, emissive: scaleColor, emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.15,
      }))
      const x = 0.1 - i * 0.055
      const y = 0.02 - row * 0.04
      scaleMesh.position.set(x, y, d / 2 + 0.004)
      group.add(scaleMesh)
      const scaleR = scaleMesh.clone()
      scaleR.position.z = -(d / 2 + 0.004)
      group.add(scaleR)
    }
  }

  // Barbel whiskers
  for (const side of [1, -1]) {
    const barbelGeom = new THREE.CylinderGeometry(0.004, 0.001, 0.08, 4)
    const barbel = new THREE.Mesh(barbelGeom, new THREE.MeshStandardMaterial({
      color: accentGold, emissive: accentGold, emissiveIntensity: 0.4, roughness: 0.3,
    }))
    barbel.position.set(w / 2 + 0.02, -h * 0.25, side * 0.025)
    barbel.rotation.z = Math.PI * 0.35
    group.add(barbel)
  }

  // Spiky dorsal ridge
  for (let i = 0; i < 6; i++) {
    const spikeH = 0.05 + Math.sin(i * 0.9) * 0.02
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.012, spikeH, 4), bodyMat(finColor))
    spike.position.set(0.1 - i * 0.05, h / 2 + spikeH * 0.4, 0)
    group.add(spike)
  }

  addTailFin(group, -w / 2, finColor, 0.1, 0.1)

  // Anal fin
  const af = new THREE.Shape()
  af.moveTo(0.04, 0); af.quadraticCurveTo(0, -0.06, -0.07, -0.04); af.lineTo(-0.05, 0); af.lineTo(0.04, 0)
  const analFin = new THREE.Mesh(new THREE.ShapeGeometry(af), finMat(finColor, 0.6))
  analFin.position.set(-0.06, -h / 2, 0)
  group.add(analFin)

  addPectoralFins(group, new THREE.Color(0x44aa88), d / 2, 0.8)
  addPopEyes(group, w / 2 + 0.01, h * 0.2, d * 0.3, 0.03, 0.018, 0.04)
  return group
}

/** Crystal Tetra – translucent glowing cube with prismatic shimmer */
function buildCrystalTetra(): THREE.Group {
  const group = new THREE.Group()
  const crystalColor = new THREE.Color(0x88ddff)
  const shimmer1 = new THREE.Color(0xaaeeff)
  const shimmer2 = new THREE.Color(0xddaaff)
  const glowCore = new THREE.Color(0x44ccff)

  const w = 0.14, h = 0.1, d = 0.09
  // Translucent cube body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshPhysicalMaterial({
      color: crystalColor, emissive: glowCore, emissiveIntensity: 0.6,
      roughness: 0.1, metalness: 0.05, transmission: 0.4, thickness: 0.3,
      transparent: true, opacity: 0.75,
    })
  )
  body.castShadow = true
  group.add(body)

  // Inner glow core (smaller cube)
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.6, h * 0.6, d * 0.6),
    new THREE.MeshStandardMaterial({
      color: glowCore, emissive: glowCore, emissiveIntensity: 0.9,
      transparent: true, opacity: 0.35, roughness: 0.05,
    })
  )
  group.add(glow)

  // Shimmer patches
  for (let i = 0; i < 4; i++) {
    const color = i % 2 === 0 ? shimmer1 : shimmer2
    const p = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.025, 0.01),
      new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.35, roughness: 0.1,
      })
    )
    p.position.set(0.04 - i * 0.03, 0.015 * (i % 2 === 0 ? 1 : -1), d / 2 + 0.005)
    group.add(p)
  }

  addTailFin(group, -w / 2, shimmer2, 0.06, 0.05)
  addDorsalFin(group, h / 2, shimmer1, 0.04, 0.06)
  addPectoralFins(group, shimmer1, d / 2, 0.5)
  addPopEyes(group, w / 2 + 0.01, h * 0.15, d * 0.3, 0.02, 0.012, 0.025)
  return group
}

// ---------- fish mesh builder (public) ----------

export function buildFishMesh(modelRef: string): THREE.Group {
  switch (modelRef) {
    case 'goldfish':       return buildGoldfish()
    case 'neon_tetra':     return buildNeonTetra()
    case 'guppy':          return buildGuppy()
    case 'angelfish':      return buildAngelfish()
    case 'betta':          return buildBetta()
    case 'clownfish':      return buildClownfish()
    case 'dragon_fish':    return buildDragonFish()
    case 'crystal_tetra':  return buildCrystalTetra()
    default: {
      const fallbackHue = (hashStr(modelRef) % 360) / 360
      return buildGenericFish(fallbackHue)
    }
  }
}

/** Fallback generic cubic fish for unknown species */
function buildGenericFish(hue: number): THREE.Group {
  const group = new THREE.Group()
  const color = hsl(hue, 0.85, 0.55)
  const finC = hsl(hue + 0.1, 0.75, 0.5)

  const w = 0.18, h = 0.13, d = 0.1
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), bodyMat(color))
  body.castShadow = true
  group.add(body)

  addTailFin(group, -w / 2, finC, 0.1, 0.08)
  addDorsalFin(group, h / 2, finC, 0.08, 0.1)
  addPectoralFins(group, finC, d / 2)
  addPopEyes(group, w / 2 + 0.01, h * 0.15, d * 0.3)
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
    color: 0x3399ff,
    size: 0.03,
    transparent: true,
    opacity: 0.6,
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
