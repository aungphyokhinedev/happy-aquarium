import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { TankSize, Fish, Decoration } from '@/lib/supabase'
import { fishBehavior, type FishEntry } from '@/game/fishBehavior'
import { buildFishMesh, buildDecorationMesh, buildSandFloor, buildBubbleSystem } from '@/game/meshBuilders'

interface AquariumSceneProps {
  tankSize: TankSize
  fish: (Fish & { fish_species?: { id: string; model_ref: string } })[]
  decorations: (Decoration & { decoration_types?: { asset_ref: string } })[]
  onDecorationMove?: () => void
}

const TANK_SCALE: Record<TankSize, number> = {
  small: 1,
  medium: 1.4,
  large: 1.8,
}

export function AquariumScene({ tankSize, fish, decorations }: AquariumSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    tank: THREE.Group
    fishMeshes: Map<string, { mesh: THREE.Group; fishId: string; speciesId: string }>
    decorationMeshes: Map<string, THREE.Group>
    clock: THREE.Clock
    bubbleUpdate: ((dt: number) => void) | null
  } | null>(null)

  // ── Scene setup (runs once per tankSize change) ──
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const width = Math.max(container.clientWidth || 800, 1)
    const height = Math.max(container.clientHeight || 600, 1)

    // Scene – soft light aquatic background
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xd4eaf7)
    scene.fog = new THREE.FogExp2(0xd4eaf7, 0.02)

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 1.5, 6.5)
    camera.lookAt(0, 0, 0)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    container.appendChild(renderer.domElement)

    // ── Lighting (soft, balanced) ──
    const ambient = new THREE.AmbientLight(0xffffff, 0.9)
    scene.add(ambient)

    // Hemisphere – soft sky/ground
    const hemi = new THREE.HemisphereLight(0xd4eaf7, 0x8ab89a, 0.6)
    scene.add(hemi)

    // Top-down hood lamp – moderate
    const topLight = new THREE.DirectionalLight(0xffffff, 0.8)
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

    // Gentle fill from front
    const fillLight = new THREE.DirectionalLight(0xfff8ee, 0.4)
    fillLight.position.set(2, 3, 5)
    scene.add(fillLight)

    // Soft inner glow
    const innerGlow = new THREE.PointLight(0xb8ddf0, 0.5, 10, 2)
    innerGlow.position.set(0, 0.5, 0)
    scene.add(innerGlow)

    // ── Tank ──
    const scale = TANK_SCALE[tankSize]
    const tank = new THREE.Group()
    const tankWidth = 4 * scale
    const tankHeight = 2.5 * scale
    const tankDepth = 2.5 * scale

    // Glass
    const glassGeom = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e6f8,
      transparent: true,
      opacity: 0.06,
      side: THREE.BackSide,
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.96,
      thickness: 0.3,
    })
    const glass = new THREE.Mesh(glassGeom, glassMat)
    glass.receiveShadow = true
    tank.add(glass)

    // Glass edges (wireframe) – light
    const edgeGeom = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth)
    const edgeMat = new THREE.MeshBasicMaterial({
      color: 0x90b8d0,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    })
    const edges = new THREE.Mesh(edgeGeom, edgeMat)
    tank.add(edges)

    // Water surface – light teal
    const waterGeom = new THREE.PlaneGeometry(tankWidth * 0.98, tankDepth * 0.98, 24, 24)
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x7bbde0,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      roughness: 0.15,
      metalness: 0.05,
    })
    const water = new THREE.Mesh(waterGeom, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.y = tankHeight / 2 - 0.05
    water.receiveShadow = true
    tank.add(water)

    // Sand floor
    const sandFloor = buildSandFloor(tankWidth * 0.98, tankDepth * 0.98)
    sandFloor.position.y = -tankHeight / 2 + 0.01
    tank.add(sandFloor)

    // Back wall – soft light blue
    const backGeom = new THREE.PlaneGeometry(tankWidth * 0.99, tankHeight * 0.99)
    const backMat = new THREE.MeshStandardMaterial({
      color: 0xa8d4e8,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    })
    const backWall = new THREE.Mesh(backGeom, backMat)
    backWall.position.z = -tankDepth / 2 + 0.01
    backWall.receiveShadow = true
    tank.add(backWall)

    scene.add(tank)

    // ── Bubbles ──
    const bubbles = buildBubbleSystem(40, { w: tankWidth * 0.7, h: tankHeight, d: tankDepth * 0.7 })
    bubbles.points.position.set(0, 0, 0)
    tank.add(bubbles.points)

    // ── State ──
    const clock = new THREE.Clock()
    const fishMeshes = new Map<string, { mesh: THREE.Group; fishId: string; speciesId: string }>()
    const decorationMeshes = new Map<string, THREE.Group>()

    sceneRef.current = {
      scene,
      camera,
      renderer,
      tank,
      fishMeshes,
      decorationMeshes,
      clock,
      bubbleUpdate: bubbles.update,
    }

    // ── Resize ──
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
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
      sceneRef.current = null
    }
  }, [tankSize])

  // ── Fish meshes ──
  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return
    const { tank, fishMeshes } = ref
    const scale = TANK_SCALE[tankSize]
    const halfW = (4 * scale) / 2 - 0.3
    const halfH = (2.5 * scale) / 2 - 0.3
    const halfD = (2.5 * scale) / 2 - 0.3

    // Clean up old
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

    // Build new
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

    // Clean up old
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

    // Build new
    decorations.forEach((d) => {
      const assetRef = d.decoration_types?.asset_ref ?? 'plant_small'
      const mesh = buildDecorationMesh(assetRef)

      // Position on the sand floor if y is near zero
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
    const { renderer, scene, camera, fishMeshes, clock, bubbleUpdate } = ref
    const scale = TANK_SCALE[tankSize]
    const halfW = (4 * scale) / 2 - 0.3
    const halfH = (2.5 * scale) / 2 - 0.3
    const halfD = (2.5 * scale) / 2 - 0.3
    const fishArray: FishEntry[] = Array.from(fishMeshes.entries()).map(([id, o]) => ({ id, ...o }))

    // Animate water surface
    const waterMesh = ref.tank.children.find(
      (c) => c instanceof THREE.Mesh && c.rotation.x === -Math.PI / 2
    ) as THREE.Mesh | undefined

    let elapsed = 0

    function loop() {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(clock.getDelta(), 0.1)
      elapsed += dt

      // Fish AI
      fishBehavior(fishArray, dt, { halfW, halfH, halfD })

      // Water surface ripple
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

      // Bubbles
      if (bubbleUpdate) bubbleUpdate(dt)

      renderer.render(scene, camera)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [tankSize, fish])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
