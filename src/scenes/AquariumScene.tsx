import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { TankSize, Fish, Decoration } from '@/lib/supabase'
import { fishBehavior, type FishEntry } from '@/game/fishBehavior'
import { buildFishMesh, buildDecorationMesh, buildSandFloor, buildBubbleSystem } from '@/game/meshBuilders'

interface AquariumSceneProps {
  tankSize: TankSize
  fish: (Fish & { fish_species?: { id: string; model_ref: string } })[]
  decorations: (Decoration & { decoration_types?: { asset_ref: string } })[]
  onDecorationMove?: () => void
  onDecorationDrop?: (decorationId: string, x: number, y: number, z: number) => void
  lightOn?: boolean
}

const TANK_SCALE: Record<TankSize, number> = {
  small: 1,
  medium: 1.4,
  large: 1.8,
}

// Light intensity presets
const LIGHT_ON = { ambient: 0.9, hemi: 0.6, top: 0.8, fill: 0.4, inner: 0.5, exposure: 1.2, bgColor: 0xffffff }
const LIGHT_OFF = { ambient: 0.12, hemi: 0.08, top: 0.0, fill: 0.0, inner: 0.06, exposure: 0.5, bgColor: 0x0a1520 }

export function AquariumScene({ tankSize, fish, decorations, onDecorationDrop, lightOn = true }: AquariumSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    tank: THREE.Group
    controls: OrbitControls
    fishMeshes: Map<string, { mesh: THREE.Group; fishId: string; speciesId: string }>
    decorationMeshes: Map<string, THREE.Group>
    clock: THREE.Clock
    bubbleUpdate: ((dt: number) => void) | null
    lights: {
      ambient: THREE.AmbientLight
      hemi: THREE.HemisphereLight
      top: THREE.DirectionalLight
      fill: THREE.DirectionalLight
      inner: THREE.PointLight
    }
  } | null>(null)

  // Stable ref for the drop callback so event handlers always see latest
  const dropRef = useRef(onDecorationDrop)
  dropRef.current = onDecorationDrop

  // Drag state refs (not React state – avoids re-renders during drag)
  const dragState = useRef<{
    active: boolean
    decorationId: string | null
    mesh: THREE.Group | null
    floorY: number
    startPos: THREE.Vector3
    // For highlighting
    originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  }>({
    active: false,
    decorationId: null,
    mesh: null,
    floorY: 0,
    startPos: new THREE.Vector3(),
    originalMaterials: new Map(),
  })

  // Raycaster (reused)
  const raycaster = useRef(new THREE.Raycaster())
  const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const intersectPoint = useRef(new THREE.Vector3())

  // ── Helpers ──

  const getMouseNDC = useCallback((e: MouseEvent | Touch) => {
    const container = containerRef.current
    if (!container) return null
    const rect = container.getBoundingClientRect()
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
  }, [])

  /** Walk up the parent chain to find a Group with decorationId in userData */
  const findDecorationGroup = useCallback((obj: THREE.Object3D): THREE.Group | null => {
    let current: THREE.Object3D | null = obj
    while (current) {
      if (current.userData?.decorationId && current instanceof THREE.Group) {
        return current
      }
      current = current.parent
    }
    return null
  }, [])

  /** Add highlight to a decoration mesh group */
  const highlightMesh = useCallback((group: THREE.Group) => {
    const ds = dragState.current
    ds.originalMaterials.clear()
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        ds.originalMaterials.set(child, child.material)
        const mat = (Array.isArray(child.material) ? child.material[0] : child.material) as THREE.MeshStandardMaterial
        const highlight = mat.clone()
        highlight.emissive = new THREE.Color(0x9333ea)
        highlight.emissiveIntensity = 0.35
        child.material = highlight
      }
    })
  }, [])

  /** Remove highlight from a decoration mesh group */
  const unhighlightMesh = useCallback(() => {
    const ds = dragState.current
    ds.originalMaterials.forEach((origMat, mesh) => {
      mesh.material = origMat
    })
    ds.originalMaterials.clear()
  }, [])

  // ── Scene setup ──
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const width = Math.max(container.clientWidth || 800, 1)
    const height = Math.max(container.clientHeight || 600, 1)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    scene.fog = new THREE.FogExp2(0xffffff, 0.02)

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 1.5, 6.5)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // Orbit controls – drag to rotate, scroll to zoom, right-click to pan
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.rotateSpeed = 0.6
    controls.zoomSpeed = 0.8
    controls.panSpeed = 0.5
    controls.minDistance = 2.5
    controls.maxDistance = 12
    controls.maxPolarAngle = Math.PI * 0.85  // Don't flip under
    controls.minPolarAngle = 0.1
    controls.update()

    // Lighting (intensities set by lightOn effect)
    const ambient = new THREE.AmbientLight(0xffffff, LIGHT_ON.ambient)
    scene.add(ambient)
    const hemi = new THREE.HemisphereLight(0xd4eaf7, 0x8ab89a, LIGHT_ON.hemi)
    scene.add(hemi)
    const topLight = new THREE.DirectionalLight(0xffffff, LIGHT_ON.top)
    topLight.position.set(0, 8, 2)
    topLight.castShadow = true
    topLight.shadow.mapSize.set(1024, 1024)
    topLight.shadow.camera.near = 0.5
    topLight.shadow.camera.far = 20
    topLight.shadow.camera.left = -5
    topLight.shadow.camera.right = 5
    topLight.shadow.camera.top = 5
    topLight.shadow.camera.bottom = -5
    scene.add(topLight)
    const fillLight = new THREE.DirectionalLight(0xfff8ee, LIGHT_ON.fill)
    fillLight.position.set(2, 3, 5)
    scene.add(fillLight)
    const innerGlow = new THREE.PointLight(0xb8ddf0, LIGHT_ON.inner, 10, 2)
    innerGlow.position.set(0, 0.5, 0)
    scene.add(innerGlow)

    // Tank
    const scale = TANK_SCALE[tankSize]
    const tank = new THREE.Group()
    const tankWidth = 4 * scale
    const tankHeight = 2.5 * scale
    const tankDepth = 2.5 * scale

    const glassGeom = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6f8, transparent: true, opacity: 0.06,
      side: THREE.BackSide, roughness: 0.05, metalness: 0.0,
      transmission: 0.96, thickness: 0.3,
    })
    const glass = new THREE.Mesh(glassGeom, glassMat)
    glass.receiveShadow = true
    tank.add(glass)

    const edgeGeom = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth)
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x90b8d0, wireframe: true, transparent: true, opacity: 0.12,
    })
    tank.add(new THREE.Mesh(edgeGeom, edgeMat))

    const waterGeom = new THREE.PlaneGeometry(tankWidth * 0.98, tankDepth * 0.98, 24, 24)
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x7bbde0, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, roughness: 0.15, metalness: 0.05,
    })
    const water = new THREE.Mesh(waterGeom, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.y = tankHeight / 2 - 0.05
    water.receiveShadow = true
    tank.add(water)

    const sandFloor = buildSandFloor(tankWidth * 0.98, tankDepth * 0.98)
    sandFloor.position.y = -tankHeight / 2 + 0.01
    tank.add(sandFloor)

    const backGeom = new THREE.PlaneGeometry(tankWidth * 0.99, tankHeight * 0.99)
    const backMat = new THREE.MeshStandardMaterial({
      color: 0xa8d4e8, roughness: 0.9, metalness: 0.0, side: THREE.DoubleSide,
    })
    const backWall = new THREE.Mesh(backGeom, backMat)
    backWall.position.z = -tankDepth / 2 + 0.01
    backWall.receiveShadow = true
    tank.add(backWall)

    scene.add(tank)

    const bubbles = buildBubbleSystem(40, { w: tankWidth * 0.7, h: tankHeight, d: tankDepth * 0.7 })
    tank.add(bubbles.points)

    const clock = new THREE.Clock()
    const fishMeshes = new Map<string, { mesh: THREE.Group; fishId: string; speciesId: string }>()
    const decorationMeshes = new Map<string, THREE.Group>()

    sceneRef.current = {
      scene, camera, renderer, tank, controls,
      fishMeshes, decorationMeshes, clock,
      bubbleUpdate: bubbles.update,
      lights: { ambient, hemi, top: topLight, fill: fillLight, inner: innerGlow },
    }

    // Store floorY for drag
    dragState.current.floorY = -tankHeight / 2 + 0.02

    // ── Drag & drop event handlers ──
    const halfW = tankWidth / 2 - 0.15
    const halfD = tankDepth / 2 - 0.15

    function onPointerDown(e: PointerEvent) {
      const ref = sceneRef.current
      if (!ref) return
      const ndc = getMouseNDC(e)
      if (!ndc) return

      raycaster.current.setFromCamera(ndc, ref.camera)

      // Collect all meshes from decoration groups
      const targets: THREE.Object3D[] = []
      ref.decorationMeshes.forEach((group) => {
        group.traverse((child) => {
          if (child instanceof THREE.Mesh) targets.push(child)
        })
      })

      const hits = raycaster.current.intersectObjects(targets, false)
      if (hits.length === 0) return

      const hitObj = hits[0].object
      const decoGroup = findDecorationGroup(hitObj)
      if (!decoGroup) return

      // Start drag
      const ds = dragState.current
      ds.active = true
      ds.decorationId = decoGroup.userData.decorationId
      ds.mesh = decoGroup
      ds.startPos.copy(decoGroup.position)

      // Set drag plane at the decoration's current Y
      dragPlane.current.set(new THREE.Vector3(0, 1, 0), -decoGroup.position.y)

      highlightMesh(decoGroup)
      container.style.cursor = 'grabbing'
      e.preventDefault()

      // Disable orbit while dragging decoration
      controls.enabled = false

      // Capture pointer for smooth dragging
      container.setPointerCapture(e.pointerId)
    }

    function onPointerMove(e: PointerEvent) {
      const ds = dragState.current
      const ref = sceneRef.current
      if (!ds.active || !ds.mesh || !ref) {
        // Hover cursor hint
        if (ref) {
          const ndc = getMouseNDC(e)
          if (ndc) {
            raycaster.current.setFromCamera(ndc, ref.camera)
            const targets: THREE.Object3D[] = []
            ref.decorationMeshes.forEach((group) => {
              group.traverse((child) => {
                if (child instanceof THREE.Mesh) targets.push(child)
              })
            })
            const hits = raycaster.current.intersectObjects(targets, false)
            container.style.cursor = hits.length > 0 ? 'grab' : ''
          }
        }
        return
      }

      const ndc = getMouseNDC(e)
      if (!ndc) return

      raycaster.current.setFromCamera(ndc, ref.camera)
      if (raycaster.current.ray.intersectPlane(dragPlane.current, intersectPoint.current)) {
        // Convert from world to tank-local coords
        const localPt = ref.tank.worldToLocal(intersectPoint.current.clone())

        // Clamp within tank bounds
        localPt.x = Math.max(-halfW, Math.min(halfW, localPt.x))
        localPt.z = Math.max(-halfD, Math.min(halfD, localPt.z))

        ds.mesh.position.x = localPt.x
        ds.mesh.position.z = localPt.z
      }
    }

    function onPointerUp(e: PointerEvent) {
      const ds = dragState.current
      if (!ds.active || !ds.mesh || !ds.decorationId) return

      unhighlightMesh()
      container.style.cursor = ''
      container.releasePointerCapture(e.pointerId)

      // Re-enable orbit controls
      controls.enabled = true

      const newX = ds.mesh.position.x
      const newY = ds.mesh.position.y
      const newZ = ds.mesh.position.z

      const id = ds.decorationId

      // Reset drag state
      ds.active = false
      ds.decorationId = null
      ds.mesh = null

      // Save to DB via callback
      if (dropRef.current) {
        dropRef.current(id, newX, newY, newZ)
      }
    }

    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerup', onPointerUp)
    container.addEventListener('pointercancel', onPointerUp)

    // Resize
    const onResize = () => {
      if (!containerRef.current || !sceneRef.current) return
      const w = Math.max(containerRef.current.clientWidth || 800, 1)
      const h = Math.max(containerRef.current.clientHeight || 600, 1)
      sceneRef.current.camera.aspect = w / h
      sceneRef.current.camera.updateProjectionMatrix()
      sceneRef.current.renderer.setSize(w, h)
    }
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(onResize)
    ro.observe(container)

    return () => {
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerup', onPointerUp)
      container.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      sceneRef.current = null
    }
  }, [tankSize, getMouseNDC, findDecorationGroup, highlightMesh, unhighlightMesh])

  // ── Light on/off transition ──
  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return

    const preset = lightOn ? LIGHT_ON : LIGHT_OFF
    const { lights, scene, renderer } = ref

    // Animate over ~400ms using requestAnimationFrame
    const duration = 400
    const startValues = {
      ambient: lights.ambient.intensity,
      hemi: lights.hemi.intensity,
      top: lights.top.intensity,
      fill: lights.fill.intensity,
      inner: lights.inner.intensity,
      exposure: renderer.toneMappingExposure,
      bgR: (scene.background as THREE.Color).r,
      bgG: (scene.background as THREE.Color).g,
      bgB: (scene.background as THREE.Color).b,
    }
    const targetBg = new THREE.Color(preset.bgColor)
    const startTime = performance.now()
    let raf = 0

    function animate(now: number) {
      const t = Math.min((now - startTime) / duration, 1)
      // Smooth ease-in-out
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      lights.ambient.intensity = startValues.ambient + (preset.ambient - startValues.ambient) * ease
      lights.hemi.intensity = startValues.hemi + (preset.hemi - startValues.hemi) * ease
      lights.top.intensity = startValues.top + (preset.top - startValues.top) * ease
      lights.fill.intensity = startValues.fill + (preset.fill - startValues.fill) * ease
      lights.inner.intensity = startValues.inner + (preset.inner - startValues.inner) * ease
      renderer.toneMappingExposure = startValues.exposure + (preset.exposure - startValues.exposure) * ease

      const bg = scene.background as THREE.Color
      bg.r = startValues.bgR + (targetBg.r - startValues.bgR) * ease
      bg.g = startValues.bgG + (targetBg.g - startValues.bgG) * ease
      bg.b = startValues.bgB + (targetBg.b - startValues.bgB) * ease

      // Also update fog color
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(bg)
      }

      if (t < 1) {
        raf = requestAnimationFrame(animate)
      }
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [lightOn])

  // ── Fish meshes ──
  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return
    const { tank, fishMeshes } = ref
    const scale = TANK_SCALE[tankSize]
    const halfW = (4 * scale) / 2 - 0.3
    const halfH = (2.5 * scale) / 2 - 0.3
    const halfD = (2.5 * scale) / 2 - 0.3

    fishMeshes.forEach(({ mesh }) => {
      tank.remove(mesh)
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
          else child.material?.dispose()
        }
      })
    })
    fishMeshes.clear()

    fish.forEach((f) => {
      const modelRef = f.fish_species?.model_ref ?? 'goldfish'
      const mesh = buildFishMesh(modelRef)
      mesh.position.set(
        (Math.random() - 0.5) * halfW * 2,
        (Math.random() - 0.5) * halfH * 1.4,
        (Math.random() - 0.5) * halfD * 2
      )
      mesh.userData = { fishId: f.id, speciesId: f.fish_species_id, halfW, halfH, halfD }
      tank.add(mesh)
      fishMeshes.set(f.id, { mesh, fishId: f.id, speciesId: f.fish_species_id })
    })
  }, [tankSize, fish])

  // ── Decoration meshes ──
  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return
    const { tank, decorationMeshes } = ref
    const scale = TANK_SCALE[tankSize]
    const tankHeight = 2.5 * scale

    decorationMeshes.forEach((mesh) => {
      tank.remove(mesh)
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
          else child.material?.dispose()
        }
      })
    })
    decorationMeshes.clear()

    decorations.forEach((d) => {
      const assetRef = d.decoration_types?.asset_ref ?? 'plant_small'
      const mesh = buildDecorationMesh(assetRef)

      const floorY = -tankHeight / 2 + 0.02
      const posY = Math.abs(d.position_y) < 0.01 ? floorY : d.position_y
      mesh.position.set(d.position_x, posY, d.position_z)
      mesh.rotation.y = d.rotation_y
      mesh.userData = { decorationId: d.id }
      tank.add(mesh)
      decorationMeshes.set(d.id, mesh)
    })
  }, [tankSize, decorations])

  // ── Animation loop ──
  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return
    let raf = 0
    const { renderer, scene, camera, controls, fishMeshes, clock, bubbleUpdate } = ref
    const scale = TANK_SCALE[tankSize]
    const halfW = (4 * scale) / 2 - 0.3
    const halfH = (2.5 * scale) / 2 - 0.3
    const halfD = (2.5 * scale) / 2 - 0.3
    const fishArray: FishEntry[] = Array.from(fishMeshes.entries()).map(([id, o]) => ({ id, ...o }))

    const waterMesh = ref.tank.children.find(
      (c) => c instanceof THREE.Mesh && c.rotation.x === -Math.PI / 2
    ) as THREE.Mesh | undefined

    let elapsed = 0

    function loop() {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(clock.getDelta(), 0.1)
      elapsed += dt

      // Update orbit controls (needed for damping)
      controls.update()

      fishBehavior(fishArray, dt, { halfW, halfH, halfD })

      if (waterMesh) {
        const pos = waterMesh.geometry.getAttribute('position')
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i)
          const y = pos.getY(i)
          const wave = Math.sin(x * 3 + elapsed * 1.5) * 0.008 +
                       Math.cos(y * 4 + elapsed * 2) * 0.005
          pos.setZ(i, wave)
        }
        pos.needsUpdate = true
      }

      if (bubbleUpdate) bubbleUpdate(dt)
      renderer.render(scene, camera)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [tankSize, fish])

  return <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }} />
}
