import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { TankSize } from '@/lib/supabase'
import type { Fish } from '@/lib/supabase'
import type { Decoration } from '@/lib/supabase'
import { fishBehavior } from '@/game/fishBehavior'

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
    fishMeshes: Map<string, { mesh: THREE.Mesh; fishId: string; speciesId: string }>
    decorationMeshes: Map<string, THREE.Mesh>
    clock: THREE.Clock
  } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current
    const width = Math.max(container.clientWidth || 800, 1)
    const height = Math.max(container.clientHeight || 600, 1)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a1628)
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100)
    camera.position.set(0, 2, 6)
    camera.lookAt(0, 0, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    container.appendChild(renderer.domElement)

    const ambient = new THREE.AmbientLight(0x404070, 0.6)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(5, 10, 5)
    dir.castShadow = true
    scene.add(dir)

    const scale = TANK_SCALE[tankSize]
    const tank = new THREE.Group()
    const tankWidth = 4 * scale
    const tankHeight = 2.5 * scale
    const tankDepth = 2.5 * scale

    const glassGeom = new THREE.BoxGeometry(tankWidth, tankHeight, tankDepth)
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      roughness: 0.1,
      metalness: 0,
    })
    const glass = new THREE.Mesh(glassGeom, glassMat)
    glass.castShadow = false
    glass.receiveShadow = true
    tank.add(glass)

    const waterGeom = new THREE.PlaneGeometry(tankWidth * 0.98, tankDepth * 0.98)
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a4a7a,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      roughness: 0.2,
      metalness: 0.1,
    })
    const water = new THREE.Mesh(waterGeom, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.y = tankHeight / 2 - 0.05
    water.receiveShadow = true
    tank.add(water)

    const floorGeom = new THREE.BoxGeometry(tankWidth * 1.02, 0.2, tankDepth * 1.02)
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a4a3a })
    const floor = new THREE.Mesh(floorGeom, floorMat)
    floor.position.y = -tankHeight / 2 - 0.1
    floor.receiveShadow = true
    tank.add(floor)

    scene.add(tank)

    const clock = new THREE.Clock()
    const fishMeshes = new Map<string, { mesh: THREE.Mesh; fishId: string; speciesId: string }>()
    const decorationMeshes = new Map<string, THREE.Mesh>()

    sceneRef.current = {
      scene,
      camera,
      renderer,
      tank,
      fishMeshes,
      decorationMeshes,
      clock,
    }

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
      container.removeChild(renderer.domElement)
      sceneRef.current = null
    }
  }, [tankSize])

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
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material && Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose())
      else if (mesh.material && 'dispose' in mesh.material) (mesh.material as THREE.Material).dispose()
    })
    fishMeshes.clear()

    const fishGeom = new THREE.SphereGeometry(0.12, 8, 8)
    fish.forEach((f) => {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random() * 0.2 + 0.5, 0.7, 0.5),
      })
      const mesh = new THREE.Mesh(fishGeom.clone(), mat)
      mesh.position.set(
        (Math.random() - 0.5) * halfW * 2,
        (Math.random() - 0.5) * halfH * 2,
        (Math.random() - 0.5) * halfD * 2
      )
      mesh.userData = { fishId: f.id, speciesId: f.fish_species_id, halfW, halfH, halfD }
      tank.add(mesh)
      fishMeshes.set(f.id, { mesh, fishId: f.id, speciesId: f.fish_species_id })
    })
    fishGeom.dispose()
  }, [tankSize, fish])

  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return
    const { tank, decorationMeshes } = ref
    decorationMeshes.forEach((mesh) => {
      tank.remove(mesh)
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material && 'dispose' in mesh.material) (mesh.material as THREE.Material).dispose()
    })
    decorationMeshes.clear()

    const boxGeom = new THREE.BoxGeometry(0.25, 0.25, 0.25)
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x5a4a3a })
    decorations.forEach((d) => {
      const mesh = new THREE.Mesh(boxGeom.clone(), stoneMat.clone())
      mesh.position.set(d.position_x, d.position_y, d.position_z)
      mesh.rotation.y = d.rotation_y
      mesh.userData = { decorationId: d.id }
      tank.add(mesh)
      decorationMeshes.set(d.id, mesh)
    })
  }, [decorations])

  useEffect(() => {
    const ref = sceneRef.current
    if (!ref) return
    let raf = 0
    const { renderer, scene, camera, fishMeshes, clock } = ref
    const halfW = (4 * TANK_SCALE[tankSize]) / 2 - 0.3
    const halfH = (2.5 * TANK_SCALE[tankSize]) / 2 - 0.3
    const halfD = (2.5 * TANK_SCALE[tankSize]) / 2 - 0.3
    const fishArray = Array.from(fishMeshes.entries()).map(([id, o]) => ({ id, ...o }))

    function loop() {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(clock.getDelta(), 0.1)
      fishBehavior(fishArray, dt, { halfW, halfH, halfD })
      renderer.render(scene, camera)
    }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [tankSize, fish])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
