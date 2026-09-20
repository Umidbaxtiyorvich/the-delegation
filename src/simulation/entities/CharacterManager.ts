
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  abs,
  atan,
  attribute, cos, float, Fn, fract, If, instanceIndex, mat3,
  mat4, mix, positionGeometry, positionLocal, sin, smoothstep, storage, texture, uint, uniform, uv,
  varying, vec3, vec4
} from 'three/tsl';
import * as THREE from 'three/webgpu';
import { generateAvatar } from '../../core/avatar/generateAvatar';
import { getAllAgents, getAllCharacters } from '../../data/agents';
import { worldSlot } from '../../data/rufloAgents';
import { APPEARANCE_STRIDE, AvatarAppearanceBuffer } from './AvatarAppearanceBuffer';
import { getActiveAgentSet } from '../../integration/store/teamStore';
import { AgentBehavior, AnimationName, ExpressionKey } from '../../types';
import { AgentStateBuffer } from '../behavior/AgentStateBuffer';
import { ExpressionBuffer } from '../behavior/ExpressionBuffer';
import { DRACO_LIB_PATH } from '../constants';
import { PoiManager } from '../world/PoiManager';

/**
 * Vertical bands of the shared character mesh, measured from the GLB accessor
 * bounds (body spans Y 0.005–1.255; the mouth starts at 0.635 and the cap sits
 * from 0.997 up). They let the shader tell skin from clothing without any
 * per-region material, which this model does not have.
 */
const NECK_BOTTOM_Y = 0.58;
const NECK_TOP_Y = 0.66;
const CAP_BOTTOM_Y = 0.997;
const CAP_HEIGHT = 0.318;

/**
 * Hairline geometry. The face sits low on this head — the mouth spans Y
 * 0.635–0.806 and the eyes 0.741–0.993 — while the skull continues up to 1.255,
 * so the forehead is the band just above the eyes.
 */
const HAIRLINE_Y = 1.02;
const CROWN_Y = 1.12;
/** Lowest point hair reaches: just above the eyes for short cuts, nape for long. */
const HAIR_FLOOR_SHORT = 1.0;
const HAIR_FLOOR_LONG = 0.64;

export class CharacterManager {
  private instanceCount = getAllAgents(getActiveAgentSet()).length + 1;
  private poiManager: PoiManager | null = null;

  // Compute Buffers (GPU)
  private posAttribute: THREE.StorageInstancedBufferAttribute | null = null;
  private velAttribute: THREE.StorageInstancedBufferAttribute | null = null;
  private colorAttribute: THREE.InstancedBufferAttribute | null = null;
  private accessoryAttribute: THREE.InstancedBufferAttribute | null = null;

  // Per-agent appearance, derived from the avatar config (see src/core/avatar).
  private appearanceBuffer: AvatarAppearanceBuffer | null = null;
  private positionStorage: any;
  private velocityStorage: any;

  // Agent state buffer (CPU+GPU): waypoint + behavior state per instance
  private agentStateBuffer: AgentStateBuffer | null = null;

  // Expression buffer (CPU+GPU): eye and mouth UV offsets per instance
  private expressionBuffer: ExpressionBuffer | null = null;

  // CPU-side mirror of GPU positions (updated via GPU readback each frame)
  private debugPosArray: Float32Array | null = null;

  // Track global time for animation resets (also drives the paused-safe shader uTime uniform)
  private currentTime = 0;
  private uTime = uniform(0);

  // Logic Nodes
  private computeNode: any;

  // Assets & Objects
  private instancedMeshes: THREE.Mesh[] = [];
  private meshData: { name: string; geometry: THREE.BufferGeometry; material: THREE.MeshStandardMaterial }[] = [];

  // Animation Data
  private animationsMeta: { [key: string]: { offset: number; numFrames: number; duration: number; index: number } } = {};
  private bakedAnimationsBuffer: THREE.StorageBufferAttribute | null = null;
  private metaBuffer: THREE.StorageBufferAttribute | null = null;
  private numBones = 0;
  private headBoneIndex = -1;

  // Uniforms
  private uSpeed = uniform(0.015);

  public isLoaded = false;

  constructor(private scene: THREE.Scene) { }

  public setPoiManager(poiManager: PoiManager) {
    this.poiManager = poiManager;
  }

  public async load() {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_LIB_PATH);
    loader.setDRACOLoader(dracoLoader);
    try {
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/character.glb`);
      const model = gltf.scene;

      const skinnedMeshes: THREE.SkinnedMesh[] = [];
      const allMeshes: THREE.Mesh[] = [];
      model.traverse((child) => {
        if ((child as any).isMesh) {
          allMeshes.push(child as THREE.Mesh);
          if ((child as any).isSkinnedMesh) {
            skinnedMeshes.push(child as THREE.SkinnedMesh);
          }
        }
      });

      if (allMeshes.length === 0) {
        console.warn("CharacterManager: No meshes found.");
        return;
      }

      this.meshData = allMeshes.map(m => ({
        name: m.name,
        geometry: m.geometry,
        material: m.material as THREE.MeshStandardMaterial
      }));

      const firstSkinnedMesh = skinnedMeshes[0];
      if (firstSkinnedMesh) {
        this.numBones = firstSkinnedMesh.skeleton.bones.length;
        const headBone = firstSkinnedMesh.skeleton.bones.find(b => b.name.toLowerCase() === 'head');
        this.headBoneIndex = headBone ? firstSkinnedMesh.skeleton.bones.indexOf(headBone) : -1;
      }

      const animations = gltf.animations;
      const animNames = Object.values(AnimationName);
      const bakedDataList: Float32Array[] = [];
      const metaArray = new Float32Array(animNames.length * 4);
      let currentOffset = 0;

      animNames.forEach((name, i) => {
        let clip = animations.find(a => a.name === name);
        // Fallback for essential animations
        if (!clip) {
          if (name === AnimationName.IDLE) clip = animations[0];
          else clip = animations.find(a => a.name === AnimationName.IDLE) || animations[0];
        }

        const baked = this.bakeAnimation(firstSkinnedMesh, clip!, model);
        bakedDataList.push(baked.data);

        this.animationsMeta[name] = {
          offset: currentOffset,
          numFrames: baked.numFrames,
          duration: baked.duration,
          index: i
        };

        metaArray[i * 4 + 0] = currentOffset;
        metaArray[i * 4 + 1] = baked.numFrames;
        metaArray[i * 4 + 2] = baked.duration;
        metaArray[i * 4 + 3] = 0;

        currentOffset += baked.numFrames * this.numBones;
      });

      const totalSize = bakedDataList.reduce((acc, data) => acc + data.length, 0);
      const combinedData = new Float32Array(totalSize);
      let seek = 0;
      for (const data of bakedDataList) {
        combinedData.set(data, seek);
        seek += data.length;
      }

      this.bakedAnimationsBuffer = new THREE.StorageBufferAttribute(combinedData, 16);
      this.metaBuffer = new THREE.StorageBufferAttribute(metaArray, 4);

      this.initInstances();
      this.isLoaded = true;
    } catch (err) {
      console.error("Failed to load character:", err);
    }
  }

  public setInstanceCount(count: number) {
    if (this.instanceCount === count) return;
    this.instanceCount = count;
    if (this.isLoaded) {
      this.cleanupInstances();
      this.initInstances();
    }
  }

  /**
   * Reads back the GPU position buffer to CPU.
   * Must be called after renderer.compute() each frame.
   * Returns the updated positions (1-frame GPU lag).
   */
  public async syncFromGPU(renderer: any): Promise<Float32Array | null> {
    if (!this.posAttribute) return null;
    try {
      const buffer = await renderer.getArrayBufferAsync(this.posAttribute);
      this.debugPosArray = new Float32Array(buffer);
      // Keep the CPU-side attribute array in sync so setPosition doesn't upload stale data
      (this.posAttribute.array as Float32Array).set(this.debugPosArray);
    } catch {
      // WebGPU readback not available – fall back to stale data
    }
    return this.debugPosArray;
  }

  public update(delta: number, renderer: any) {
    this.currentTime += delta;
    this.uTime.value = this.currentTime;

    if (this.expressionBuffer) {
      this.expressionBuffer.update(delta);
    }
    if (this.computeNode) {
      renderer.compute(this.computeNode);
    }
  }

  private cleanupInstances() {
    for (const mesh of this.instancedMeshes) {
      this.scene.remove(mesh);
    }
    this.instancedMeshes = [];
    this.computeNode = null;
    this.expressionBuffer = null;
    this.appearanceBuffer = null;
  }

  private initInstances() {
    if (this.meshData.length === 0) return;

    const posArray = new Float32Array(this.instanceCount * 4);
    const velArray = new Float32Array(this.instanceCount * 4);
    const colorArray = new Float32Array(this.instanceCount * 3);
    const accessoryArray = new Float32Array(this.instanceCount);
    this.appearanceBuffer = new AvatarAppearanceBuffer(this.instanceCount);

    const tempColor = new THREE.Color();
    const agentsBuffer = []; // Temporary to store POIs for orientation

    const system = getActiveAgentSet();
    const allCharacters = getAllCharacters(system);
    const totalSlots = Math.max(this.instanceCount, allCharacters.length);

    for (let i = 0; i < this.instanceCount; i++) {
      const agentNode = allCharacters.find(a => a.index === i) || system.leadAgent;
      const colorOverride = agentNode.color;
      tempColor.set(colorOverride);

      const slot = worldSlot(i, totalSlots);
      posArray[i * 4 + 0] = slot.x;
      posArray[i * 4 + 1] = 0;
      posArray[i * 4 + 2] = slot.z;
      posArray[i * 4 + 3] = 1;
      agentsBuffer[i] = null;
      if (i !== system.user.index) {
        velArray[i * 4 + 0] = (Math.random() - 0.5) * 0.05;
        velArray[i * 4 + 2] = (Math.random() - 0.5) * 0.05;
      }

      colorArray[i * 3 + 0] = tempColor.r;
      colorArray[i * 3 + 1] = tempColor.g;
      colorArray[i * 3 + 2] = tempColor.b;

      // Appearance is a pure function of the agent's id, so every reload draws
      // the same person and newly hired agents get their own look for free.
      const avatar = generateAvatar({
        id: agentNode.id,
        name: agentNode.name,
        description: agentNode.description,
        color: agentNode.color,
        avatarSeed: agentNode.avatarSeed,
        avatar: agentNode.avatar,
      });

      this.appearanceBuffer.set(i, avatar);

      // Accessory slot: 0=None, 1=Headphones, 2=Doppi (the GLB's 'cap' mesh).
      // The doppi rides the head bone like the cap did, so it stays seated
      // correctly through every animation.
      accessoryArray[i] = avatar.wearsDoppi ? 2 : 0;
    }


    this.debugPosArray = new Float32Array(posArray);

    this.posAttribute = new THREE.StorageInstancedBufferAttribute(posArray, 4);
    this.velAttribute = new THREE.StorageInstancedBufferAttribute(velArray, 4);
    this.colorAttribute = new THREE.InstancedBufferAttribute(colorArray, 3);
    this.accessoryAttribute = new THREE.InstancedBufferAttribute(accessoryArray, 1);
    this.positionStorage = storage(this.posAttribute, 'vec4', this.instanceCount);
    this.velocityStorage = storage(this.velAttribute, 'vec4', this.instanceCount);

    // Physics & state buffer — all start at mode 0 (IDLE)
    this.agentStateBuffer = new AgentStateBuffer(this.instanceCount);
    for (let i = 0; i < this.instanceCount; i++) {
      this.setPhysicsMode(i, AgentBehavior.IDLE);

      // Initial animation: start with a random negative time so they are out of sync
      const meta = this.animationsMeta[AnimationName.IDLE];
      if (meta) {
        this.agentStateBuffer.setAnimation(i, meta.index, true, -Math.random() * 10);
      }

      // APPLY POI ORIENTATION
      const poi = agentsBuffer[i];
      if (poi && (poi.id.includes('spawn') || poi.id.includes('sit'))) {
        this.setOrientation(i, poi.quaternion);
      }
    }

    this.expressionBuffer = new ExpressionBuffer(this.instanceCount);

    this.initComputeNode();
    this.createInstancedMesh();
  }

  private initComputeNode() {
    const agentStorage = this.agentStateBuffer!.storageNode;

    this.computeNode = Fn(() => {
      const index = instanceIndex;

      const posElement = this.positionStorage.element(index);
      const velElement = this.velocityStorage.element(index);
      const agentData = agentStorage.element(index.mul(2));   // Buffer 0: (wpX, anim, wpZ, state)
      const agentState = agentData.w;                         // float: 0=IDLE 1=GOTO 2=SEATED

      const pos = posElement.xyz.toVar();

      // ── Physical Logic ──────────────────────────────────────

      // GOTO = 1  |  IDLE = 0  |  SEATED = 2 (treated as IDLE on GPU)
      const isGoto = agentState.greaterThan(float(0.5)).and(agentState.lessThan(float(1.5)));

      If(isGoto, () => {
        const waypointXZ = vec3(agentData.x, float(0), agentData.z);
        const toTarget = waypointXZ.sub(pos);
        const dist = toTarget.length();
        If(dist.greaterThan(float(0.2)), () => {
          const gotoVel = toTarget.normalize().mul(this.uSpeed.mul(3.0));
          velElement.assign(vec4(gotoVel, 0.0));
          posElement.assign(vec4(pos.add(gotoVel), 1.0));
        }).Else(() => {
          // Snap X,Z to exact waypoint — CPU will transition to IDLE this frame
          posElement.assign(vec4(agentData.x, pos.y, agentData.z, 1.0));
        });

      }).Else(() => {
        // ── IDLE / SEATED (0 or 2) ───────────────────────────────
        // Zero velocity so the vertex shader uses facingOverride (setFacing/setOrientation)
        // instead of the stale walk velocity for rotation.
        // SEATED (2) is handled identically on the GPU — the semantic difference is CPU-only.
        velElement.assign(vec4(float(0), float(0), float(0), float(0)));
        posElement.assign(vec4(pos, 1.0));
      });

    })().compute(this.instanceCount);
  }

  private createInstancedMesh() {
    // Reorder meshData: Body FIRST, then features (eyes/mouth)
    // This ensures body writes to depth buffer before features are drawn over it.
    const sortedMeshData = [...this.meshData].sort((a, b) => {
      const aIsBody = a.name.toLowerCase().includes('body');
      const bIsBody = b.name.toLowerCase().includes('body');
      if (aIsBody && !bIsBody) return -1;
      if (!aIsBody && bIsBody) return 1;
      return 0;
    });

    for (const { name, geometry, material: baseMaterial } of sortedMeshData) {
      const instancedGeometry = new THREE.InstancedBufferGeometry();
      instancedGeometry.copy(geometry as any);
      instancedGeometry.instanceCount = this.instanceCount;

      // Solo dejamos el atributo que NO se calcula en el Compute Shader
      instancedGeometry.setAttribute('instanceColor', this.colorAttribute);
      if (this.accessoryAttribute) instancedGeometry.setAttribute('accessoryType', this.accessoryAttribute);
      const material = new THREE.MeshStandardNodeMaterial();
      material.roughness = 1;
      material.metalness = 0.25;

      const instanceColor = attribute('instanceColor', 'vec3');
      const map = (baseMaterial as any).map;

      // Appearance rides a storage buffer (4 vec4 per instance) because the
      // pipeline is already at 7 of WebGPU's 8 vertex buffers.
      const appearance = this.appearanceBuffer!.storageNode;
      const base = instanceIndex.mul(APPEARANCE_STRIDE);
      const skinSlot = appearance.element(base);
      const clothSlot = appearance.element(base.add(1));
      const accentSlot = appearance.element(base.add(2));
      const doppiSlot = appearance.element(base.add(3));
      const hairSlot = appearance.element(base.add(4));

      const skinColor = skinSlot.xyz;
      const clothColor = clothSlot.xyz;
      const accentColor = accentSlot.xyz;
      const doppiColor = doppiSlot.xyz;
      const hairColor = hairSlot.xyz;
      const fabricType = skinSlot.w;
      const hairCoverage = hairSlot.w;

      const expressionData = this.expressionBuffer!.storageNode.element(instanceIndex);
      const animParams = this.agentStateBuffer!.storageNode.element(instanceIndex.mul(2).add(1));
      const instanceAlpha = animParams.z;
      const accessoryType = attribute('accessoryType', 'float');

      const isEyes = name.toLowerCase().includes('eyes');
      const isMouth = name.toLowerCase().includes('mouth');
      const isHeadphones = name.toLowerCase().includes('headphones');
      const isCap = name.toLowerCase().includes('cap');

      if (isEyes) {
        material.uvNode = uv().add(expressionData.xy);
      } else if (isMouth) {
        material.uvNode = uv().add(expressionData.zw);
      }

      material.transparent = true;

      const isBody = name.toLowerCase().includes('body');

      if (isHeadphones) {
        material.opacityNode = accessoryType.equal(float(1)).select(instanceAlpha, float(0));
      } else if (isCap) {
        material.opacityNode = accessoryType.equal(float(2)).select(instanceAlpha, float(0));
      }

      if (isBody) {
        material.depthWrite = true;
        material.depthTest = true;
        // The body is skin and fabric, never metal. The stock 0.25 metalness
        // gave every agent a waxy sheen.
        material.metalness = 0;
        material.roughness = 0.9;

        // Rest-pose position straight off the geometry. `positionLocal` is not
        // usable here: assigning `material.positionNode` replaces it with the
        // final world-space position, which made every region mask depend on
        // where the agent stood in the office.
        const local = varying(positionGeometry);

        // This model has a single untextured body mesh, so skin and clothing are
        // separated by height: head above the collar, garment below.
        const skinMask = smoothstep(float(NECK_BOTTOM_Y), float(NECK_TOP_Y), local.y);

        // Khan-atlas: broad wavy ikat bands, blurred at the edges the way
        // resist-dyed silk bleeds. Frequencies are deliberately low — the
        // agents are small on screen, and fine detail just turns to noise.
        const atlasWave = sin(local.y.mul(14).add(sin(local.x.mul(7)).mul(1.3)));
        const atlas = mix(clothColor, accentColor, smoothstep(float(0.1), float(0.6), atlasWave).mul(0.9));

        // Adras: narrow vertical stripes.
        const stripe = fract(local.x.mul(5));
        const stripeMask = smoothstep(float(0.32), float(0.44), stripe)
          .sub(smoothstep(float(0.56), float(0.68), stripe))
          .clamp(0, 1);
        const adras = mix(clothColor, accentColor, stripeMask.mul(0.8));

        // Ornament: a diamond motif on a grid.
        const cellX = fract(local.x.mul(6)).sub(0.5);
        const cellY = fract(local.y.mul(6)).sub(0.5);
        const diamond = smoothstep(float(0.32), float(0.18), abs(cellX).add(abs(cellY)));
        const ornament = mix(clothColor, accentColor, diamond.mul(0.7));

        const fabricColor = fabricType
          .equal(float(1))
          .select(
            atlas,
            fabricType
              .equal(float(2))
              .select(adras, fabricType.equal(float(3)).select(ornament, clothColor))
          );

        const bodyColor = mix(fabricColor, skinColor, skinMask);

        // Hair, painted onto the scalp because the mesh has no hair geometry.
        // Restricted to the head volume (|x| small) so it never bleeds onto the
        // arms, and kept off the face (+Z) so it cannot cover the eyes.
        const onHead = smoothstep(float(0.33), float(0.26), abs(local.x));
        const crown = smoothstep(float(HAIRLINE_Y), float(CROWN_Y), local.y);
        const notFace = smoothstep(float(0.16), float(0.02), local.z);
        // Long styles reach further down the back; a buzz cut stops at the crown.
        const hairFloor = mix(float(HAIR_FLOOR_SHORT), float(HAIR_FLOOR_LONG), hairCoverage);
        const belowCrown = smoothstep(hairFloor, hairFloor.add(0.06), local.y);
        const hairMask = crown.max(notFace.mul(belowCrown)).mul(onHead).clamp(0, 1);

        material.colorNode = vec4(mix(bodyColor, hairColor, hairMask), instanceAlpha);
      } else if (isCap) {
        material.depthWrite = true;
        material.depthTest = true;
        material.metalness = 0;
        material.roughness = 0.75;

        const local = varying(positionGeometry);
        const capT = local.y.sub(float(CAP_BOTTOM_Y)).div(float(CAP_HEIGHT)).clamp(0, 1);

        // A real doppi is embroidered, not plain: a zigzag thread around the
        // brim plus a ring of almond motifs above it (Chust pattern).
        const brim = smoothstep(float(0.26), float(0.2), capT);
        const brimThread = brim.mul(smoothstep(float(0.16), float(0.3), abs(fract(uv().x.mul(16)).sub(0.5))));

        const motifRing = smoothstep(float(0.3), float(0.38), capT)
          .sub(smoothstep(float(0.52), float(0.6), capT))
          .clamp(0, 1);
        const motif = motifRing.mul(smoothstep(float(0.3), float(0.42), abs(fract(uv().x.mul(4)).sub(0.5))));

        const thread = brimThread.add(motif).clamp(0, 1);
        material.colorNode = vec4(mix(doppiColor, accentColor, thread), material.opacityNode);
      } else if (isHeadphones) {
        material.depthWrite = true;
        material.depthTest = true;
        material.colorNode = vec4(instanceColor, material.opacityNode);
      } else {
        // Eyes / mouth: rendered on top of the body surface with polygon offset to avoid
        // z-fighting, but still respect the depth buffer so they are occluded by walls etc.
        material.depthWrite = false;
        material.depthTest = true;
        material.polygonOffset = true;
        material.polygonOffsetFactor = -1;
        material.polygonOffsetUnits = -1;

        if (map) {
          const texColor = isEyes || isMouth ? texture(map, material.uvNode) : texture(map);
          material.colorNode = vec4(texColor.rgb, texColor.a.mul(instanceAlpha));
        } else {
          material.opacityNode = float(0);
        }
      }

      // Special skinning for static accessories
      if ((isHeadphones || isCap) && this.headBoneIndex !== -1 && !geometry.attributes.skinIndex) {
        const skinIndices = new Float32Array(geometry.attributes.position.count * 4).fill(this.headBoneIndex);
        const skinWeights = new Float32Array(geometry.attributes.position.count * 4).fill(0);
        for (let i = 0; i < geometry.attributes.position.count; i++) skinWeights[i * 4] = 1.0;
        instancedGeometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndices, 4));
        instancedGeometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));
      }

      const isVisible = isHeadphones ? accessoryType.equal(float(1)) : (isCap ? accessoryType.equal(float(2)) : float(1));
      const vertexNode = this.createVertexNode(isVisible.and(instanceAlpha.greaterThan(0)));
      material.positionNode = vertexNode;
      (material as any).castShadowPositionNode = vertexNode;

      const instancedMesh = new THREE.Mesh(instancedGeometry, material);
      instancedMesh.frustumCulled = false;
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      // Body renders first (renderOrder 0), features after (renderOrder 1)
      instancedMesh.renderOrder = name.toLowerCase().includes('body') ? 0 : 1;
      this.scene.add(instancedMesh);
      this.instancedMeshes.push(instancedMesh);
    }
  }

  private createVertexNode(isVisibleNode: any) {
    return Fn(() => {
      const instancePos = this.positionStorage.element(instanceIndex).xyz;
      const rawVel = this.velocityStorage.element(instanceIndex).xyz;
      const agentData = this.agentStateBuffer!.storageNode.element(instanceIndex.mul(2));
      const animParams = this.agentStateBuffer!.storageNode.element(instanceIndex.mul(2).add(1));

      // 1. Determine local rotation (facing)
      const isMoving = rawVel.length().greaterThan(float(0.01));
      const facingOverride = vec3(agentData.x, float(0), agentData.z);
      const hasFacingOverride = facingOverride.length().greaterThan(float(0));

      const facing = vec3(0, 0, 1).toVar(); // Default: Forward

      If(isMoving, () => {
        facing.assign(rawVel);
      }).ElseIf(hasFacingOverride, () => {
        facing.assign(facingOverride);
      });

      const angle = atan(facing.z, facing.x).negate().add(float(Math.PI / 2));
      const rotationMat = mat3(
        vec3(cos(angle), float(0), sin(angle).negate()),
        vec3(float(0), float(1), float(0)),
        vec3(sin(angle), float(0), cos(angle))
      );

      const finalPosition = positionLocal.toVar();

      if (this.bakedAnimationsBuffer && this.metaBuffer) {
        const animBuffer = storage(this.bakedAnimationsBuffer, 'mat4', this.bakedAnimationsBuffer.count);
        const metaStorage = storage(this.metaBuffer, 'vec4', this.metaBuffer.count);

        const animIndex = agentData.y.toUint();

        const meta = metaStorage.element(animIndex);
        const animOffset = uint(meta.x);
        const numFrames = uint(meta.y);
        const duration = float(meta.z);

        const startTime = animParams.x;
        const loopMode = animParams.y;

        const animTime = this.uTime.sub(startTime).max(0);
        const t = loopMode.greaterThan(0.5) ? animTime.div(duration).fract() : animTime.div(duration).clamp(0, 1);

        const currentFrame = t.mul(numFrames.toFloat()).toUint();
        const safeFrame = currentFrame.min(numFrames.sub(uint(1)));

        const skinIndex = attribute('skinIndex');
        const skinWeight = attribute('skinWeight');
        const skinMat = mat4(0).toVar();

        const addInfluence = (boneIdxNode: any, weightNode: any) => {
          If(weightNode.greaterThan(0), () => {
            const address = animOffset.add(safeFrame.mul(uint(this.numBones))).add(boneIdxNode.toUint());
            skinMat.addAssign(animBuffer.element(address).mul(weightNode));
          });
        };

        addInfluence(skinIndex.x, skinWeight.x);
        addInfluence(skinIndex.y, skinWeight.y);
        addInfluence(skinIndex.z, skinWeight.z);
        addInfluence(skinIndex.w, skinWeight.w);

        finalPosition.assign(skinMat.mul(vec4(positionLocal, 1.0)).xyz);
      }

      // Per-agent build. Applied after skinning and to every mesh alike, so the
      // doppi keeps sitting on the head instead of floating or sinking.
      const appearance = this.appearanceBuffer!.storageNode;
      const slot = instanceIndex.mul(APPEARANCE_STRIDE);
      const heightScale = appearance.element(slot.add(1)).w;
      const widthScale = appearance.element(slot.add(2)).w;
      const scaled = finalPosition.mul(vec3(widthScale, heightScale, widthScale));

      const vertexScale = isVisibleNode.select(float(1), float(0));
      return rotationMat.mul(scaled.mul(vertexScale)).add(instancePos);
    })();
  }

  private bakeAnimation(mesh: THREE.SkinnedMesh, clip: THREE.AnimationClip, root: THREE.Object3D) {
    const mixer = new THREE.AnimationMixer(root);
    mixer.clipAction(clip).play();
    const skeleton = mesh.skeleton;
    const duration = clip.duration;
    const numFrames = Math.ceil(duration * 60);
    const numBones = skeleton.bones.length;
    const data = new Float32Array(numFrames * numBones * 16);
    for (let f = 0; f < numFrames; f++) {
      mixer.setTime((f / numFrames) * duration);
      root.updateMatrixWorld(true);
      skeleton.update();
      for (let b = 0; b < numBones; b++) {
        const i = (f * numBones + b) * 16;
        for (let k = 0; k < 16; k++) data[i + k] = skeleton.boneMatrices[b * 16 + k];
      }
    }
    return {
      data,
      numFrames,
      duration,
    };
  }

  public getCount() { return this.instanceCount; }

  /** Exposes the agent state buffer so BehaviorManager can read/write states. */
  public getAgentStateBuffer(): AgentStateBuffer | null {
    return this.agentStateBuffer;
  }

  /** Returns the current CPU-tracked positions buffer (vec4 stride). Updated each simulateOnCPU call. */
  public getCPUPositions(): Float32Array | null {
    return this.debugPosArray;
  }

  /** Returns the world position of a single character from the CPU buffer. */
  public getCPUPosition(index: number): THREE.Vector3 | null {
    if (!this.debugPosArray || index < 0 || index >= this.instanceCount) return null;
    const i = index * 4;
    return new THREE.Vector3(this.debugPosArray[i], this.debugPosArray[i + 1], this.debugPosArray[i + 2]);
  }

  public setPhysicsMode(index: number, mode: AgentBehavior) {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return;
    this.agentStateBuffer.setState(index, mode);
  }

  /** Teleport an agent to an exact world position by writing directly to the CPU→GPU buffer. */
  public setPosition(index: number, position: THREE.Vector3): void {
    if (!this.posAttribute || index < 0 || index >= this.instanceCount) return;
    const arr = this.posAttribute.array as Float32Array;
    arr[index * 4 + 0] = position.x;
    arr[index * 4 + 1] = position.y;
    arr[index * 4 + 2] = position.z;
    this.posAttribute.needsUpdate = true;
    // Also update the CPU mirror so getCPUPosition() is immediately accurate
    if (this.debugPosArray) {
      this.debugPosArray[index * 4 + 0] = position.x;
      this.debugPosArray[index * 4 + 1] = position.y;
      this.debugPosArray[index * 4 + 2] = position.z;
    }
  }

  /** Teleport an agent and zero their current velocity to avoid sliding. */
  public setPositionAndZeroVelocity(index: number, position: THREE.Vector3): void {
    this.setPosition(index, position);
    if (this.velAttribute && index >= 0 && index < this.instanceCount) {
      const arr = this.velAttribute.array as Float32Array;
      arr[index * 4 + 0] = 0;
      arr[index * 4 + 1] = 0;
      arr[index * 4 + 2] = 0;
      arr[index * 4 + 3] = 0;
      this.velAttribute.needsUpdate = true;
    }
  }

  /** Force a specific facing direction when IDLE. */
  public setFacing(index: number, x: number, z: number) {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return;
    this.agentStateBuffer.setFacing(index, x, z);
  }

  /** Force a specific orientation based on a quaternion. */
  public setOrientation(index: number, quaternion: THREE.Quaternion) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
    this.setFacing(index, forward.x, forward.z);
  }

  public getAgentState(index: number): AgentBehavior {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return AgentBehavior.IDLE;
    return this.agentStateBuffer.getState(index) as AgentBehavior;
  }

  public setAnimation(index: number, name: AnimationName, loop: boolean = true) {
    if (this.agentStateBuffer && index >= 0 && index < this.instanceCount) {
      const meta = this.animationsMeta[name];
      if (meta) {
        this.agentStateBuffer.setAnimation(index, meta.index, loop, this.currentTime);
      }
    }
  }

  public getAnimationIndex(index: number): number {
    if (!this.agentStateBuffer || index < 0 || index >= this.instanceCount) return 0;
    return this.agentStateBuffer.getAnimation(index);
  }

  public getAnimationMeta(name: AnimationName) {
    return this.animationsMeta[name];
  }

  /** Returns the baked clip duration in seconds. Returns 1.0 if the animation is not found. */
  public getAnimationDuration(name: AnimationName): number {
    return this.animationsMeta[name]?.duration ?? 1.0;
  }

  public setExpression(index: number, name: ExpressionKey) {
    if (this.expressionBuffer) {
      this.expressionBuffer.setExpression(index, name);
    }
  }

  public setSpeaking(index: number, isSpeaking: boolean) {
    if (this.expressionBuffer) {
      this.expressionBuffer.setSpeaking(index, isSpeaking);
    }
    // Note: External logic should handle TALK/IDLE animations
  }

  public setColors() {
    if (this.isLoaded) {
      this.cleanupInstances();
      this.initInstances();
    }
  }
}
