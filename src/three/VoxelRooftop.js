import * as THREE from 'three';
import { PixelTextureGenerator } from './PixelTextureGenerator.js';

/**
 * VoxelRooftop — Rooftop observation deck with Van Gogh-style starry sky.
 *
 * Features:
 *   - Starry sky sphere with custom shader (deep indigo + golden vortex)
 *   - Telescope, console, cable details
 *   - Roof floor and railings
 *
 * IMPORTANT: The starry sky mesh is added to the rooftop group (NOT scene root)
 * to avoid polluting the surface level. Visibility is managed by main.js
 * via _starrySkyMesh.visible when transitioning between floors.
 */
export class VoxelRooftop {
  constructor(scene, globalState) {
    this.scene = scene;
    this.globalState = globalState;

    // Rooftop group — positioned at Y=12 (above the 4m plaza walls)
    this.group = new THREE.Group();
    this.group.name = 'VoxelRooftop';
    this.group.position.set(0, 12, 0);

    // Build rooftop elements
    this._buildFloor();
    this._buildRailings();
    this._buildTelescope();
    this._buildConsole();
    this._buildCables();
    this._buildExitHatch();
    this._buildStarrySky();
    this._buildLighting();
    this._buildAntenna();
    this._buildWindChime();

    // Initially hidden — shown only when player is on rooftop
    this.group.visible = false;
    scene.add(this.group);

    // Reference to starry sky for main.js visibility management
    this.starrySkyMesh = this._starrySkyMesh;
  }

  // ==================== Rooftop Floor ====================
  _buildFloor() {
    const tex = PixelTextureGenerator.warmStone();
    tex.repeat.set(5, 5);
    const geo = new THREE.PlaneGeometry(10, 10);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.7,
      metalness: 0.15,
      color: 0x887766
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.005;
    floor.receiveShadow = true;
    this.group.add(floor);
  }

  // ==================== Lighting ====================
  _buildLighting() {
    // Console screen glow — cool blue
    const consoleGlow = new THREE.PointLight(0x224466, 2.5, 4, 2);
    consoleGlow.position.set(2, 0.6, -4);
    this.group.add(consoleGlow);

    // Warm hatch glow
    const hatchGlow = new THREE.PointLight(0xffaa44, 1.8, 3, 2);
    hatchGlow.position.set(0, 0.3, -4.3);
    this.group.add(hatchGlow);

    // Telescope ambient glow
    const scopeGlow = new THREE.PointLight(0x334455, 1.5, 4, 2);
    scopeGlow.position.set(0, 1.5, -2);
    this.group.add(scopeGlow);
  }

  // ==================== Railings ====================
  _buildRailings() {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x555544,
      roughness: 0.5,
      metalness: 0.6
    });

    // Solid knee walls at perimeter (prevents camera clipping through)
    const kneeWallMat = new THREE.MeshStandardMaterial({
      color: 0x665544,
      roughness: 0.6,
      metalness: 0.3
    });

    const wallGeoNS = new THREE.BoxGeometry(9.6, 0.8, 0.2);  // north-south walls
    const wallGeoEW = new THREE.BoxGeometry(0.2, 0.8, 9.6);  // east-west walls

    // North wall at Z=-4.8 (gap at X=-3 to 3 for access)
    const nw = new THREE.Mesh(wallGeoNS, kneeWallMat);
    nw.position.set(0, 0.4, -4.7);
    nw.receiveShadow = true;
    this.group.add(nw);

    // South wall at Z=4.8
    const sw = new THREE.Mesh(wallGeoNS, kneeWallMat);
    sw.position.set(0, 0.4, 4.7);
    sw.receiveShadow = true;
    this.group.add(sw);

    // East wall at X=4.8
    const ew = new THREE.Mesh(wallGeoEW, kneeWallMat);
    ew.position.set(4.7, 0.4, 0);
    ew.receiveShadow = true;
    this.group.add(ew);

    // West wall at X=-4.8
    const ww = new THREE.Mesh(wallGeoEW, kneeWallMat);
    ww.position.set(-4.7, 0.4, 0);
    ww.receiveShadow = true;
    this.group.add(ww);

    // Posts at corners
    const halfSize = 4.8;
    for (let x = -halfSize; x <= halfSize; x += halfSize) {
      for (let z = -halfSize; z <= halfSize; z += halfSize) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.09, 1.5, 6),
          railMat
        );
        post.position.set(x, 0.75, z);
        post.castShadow = true;
        this.group.add(post);
      }
    }

    // Top rail at Y=1.5
    const railGeoH = new THREE.BoxGeometry(9.6, 0.06, 0.06);
    const railGeoV = new THREE.BoxGeometry(0.06, 0.06, 9.6);
    for (const z of [-halfSize, halfSize]) {
      const rail = new THREE.Mesh(railGeoH, railMat);
      rail.position.set(0, 1.5, z);
      this.group.add(rail);
    }
    for (const x of [-halfSize, halfSize]) {
      const rail = new THREE.Mesh(railGeoV, railMat);
      rail.position.set(x, 1.5, 0);
      this.group.add(rail);
    }
  }

  // ==================== Telescope ====================
  _buildTelescope() {
    const group = new THREE.Group();
    group.name = 'telescope';

    // Base — thickened to 3x2x3
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x445566,
      roughness: 0.4,
      metalness: 0.7
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 3), baseMat);
    base.position.y = 1;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Pedestal cylinder
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x556677,
      roughness: 0.3,
      metalness: 0.8
    });
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8),
      pedMat
    );
    pedestal.position.y = 2.4;
    group.add(pedestal);

    // Telescope tube — angled upward
    const tubeGroup = new THREE.Group();
    tubeGroup.position.y = 2.9;

    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.3,
      metalness: 0.8
    });
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 2.5, 8),
      tubeMat
    );
    tube.rotation.z = Math.PI / 2;
    tubeGroup.add(tube);

    // Lens hood
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x223344,
      roughness: 0.2,
      metalness: 0.9
    });
    const hood = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.18, 0.3, 8),
      hoodMat
    );
    hood.rotation.z = Math.PI / 2;
    hood.position.x = 1.35;
    tubeGroup.add(hood);

    // Eyepiece
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.5
    });
    const eyepiece = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8),
      eyeMat
    );
    eyepiece.rotation.z = Math.PI / 2;
    eyepiece.position.x = -1.35;
    tubeGroup.add(eyepiece);

    tubeGroup.rotation.x = -0.5; // angled up toward sky
    group.add(tubeGroup);

    group.position.set(0, 0, -2);
    this.group.add(group);
  }

  // ==================== Console Panel ====================
  _buildConsole() {
    const group = new THREE.Group();
    group.name = 'console';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.4,
      metalness: 0.6
    });

    // Main body: 1x0.8x0.6
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.8, 0.6),
      bodyMat
    );
    body.position.y = 0.4;
    body.castShadow = true;
    group.add(body);

    // Screen panel (angled face)
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0x112233,
      roughness: 0.2,
      metalness: 0.3,
      emissive: 0x002244,
      emissiveIntensity: 0.5
    });
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.45, 0.05),
      screenMat
    );
    screen.position.set(0, 0.55, 0.31);
    group.add(screen);

    // Blinking indicator light
    const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x44aaff });
    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 6, 4),
      indicatorMat
    );
    indicator.position.set(0.35, 0.25, 0.31);
    indicator.name = 'consoleIndicator';
    group.add(indicator);

    group.position.set(2, 0, -4);
    this.group.add(group);
  }

  // ==================== Ground Cables ====================
  _buildCables() {
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.9,
      metalness: 0.1
    });

    // Cable from console toward telescope base
    const cable = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.05, 0.1),
      cableMat
    );
    cable.position.set(0, 0.03, -2.5);
    cable.rotation.y = -0.3;
    this.group.add(cable);

    // Secondary cable branching off
    const cable2 = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.04, 0.08),
      cableMat
    );
    cable2.position.set(2.5, 0.02, -3.5);
    cable2.rotation.y = 0.6;
    this.group.add(cable2);
  }

  // ==================== Exit Hatch (back to surface) ====================
  _buildExitHatch() {
    const hatchGroup = new THREE.Group();
    hatchGroup.name = 'exitHatch';
    hatchGroup.position.set(0, 0, -4.3);

    // Glowing floor pad (warm amber — contrasts with cold starry sky)
    const padGeo = new THREE.PlaneGeometry(1.2, 1.2);
    const padMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.55,
      depthWrite: false
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.018;
    hatchGroup.add(pad);

    // Border ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.05, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.025;
    hatchGroup.add(ring);

    // Warm light beam (shorter than tavern, amber)
    const beamGeo = new THREE.CylinderGeometry(0.2, 0.35, 2.5, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.1,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.25;
    hatchGroup.add(beam);

    // Down arrow on floor
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 128; arrowCanvas.height = 128;
    const actx = arrowCanvas.getContext('2d');
    actx.fillStyle = '#ffcc44';
    actx.font = 'bold 64px monospace';
    actx.textAlign = 'center';
    actx.fillText('⬇', 64, 80);
    actx.fillStyle = '#ffffff';
    actx.font = 'bold 16px monospace';
    actx.fillText('返回地表', 64, 108);

    const arrowTex = new THREE.CanvasTexture(arrowCanvas);
    arrowTex.magFilter = THREE.NearestFilter;
    arrowTex.minFilter = THREE.NearestFilter;
    arrowTex.colorSpace = THREE.SRGBColorSpace;

    const arrowGeo = new THREE.PlaneGeometry(1.0, 1.0);
    const arrowMesh = new THREE.Mesh(arrowGeo, new THREE.MeshBasicMaterial({
      map: arrowTex, transparent: true, depthWrite: false
    }));
    arrowMesh.rotation.x = -Math.PI / 2;
    arrowMesh.position.y = 0.03;
    hatchGroup.add(arrowMesh);

    // Floating sign
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 256; textCanvas.height = 48;
    const tctx = textCanvas.getContext('2d');
    tctx.fillStyle = '#ffcc44';
    tctx.font = 'bold 22px monospace';
    tctx.textAlign = 'center';
    tctx.fillText('⬇ 按 [E] 返回酒馆 ⬇', 128, 32);

    const textTex = new THREE.CanvasTexture(textCanvas);
    textTex.magFilter = THREE.NearestFilter;
    textTex.minFilter = THREE.NearestFilter;
    textTex.colorSpace = THREE.SRGBColorSpace;

    const textGeo = new THREE.PlaneGeometry(1.6, 0.3);
    const textMesh = new THREE.Mesh(textGeo, new THREE.MeshBasicMaterial({
      map: textTex, transparent: true, depthWrite: false
    }));
    textMesh.position.y = 1.6;
    hatchGroup.add(textMesh);

    this.group.add(hatchGroup);
  }

  // ==================== Starry Sky (Van Gogh Style) ====================
  _buildStarrySky() {
    const geo = new THREE.SphereGeometry(55, 48, 36);

    const uniforms = {
      uTime: { value: 0 },
      uBrightness: { value: 0.75 }
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */`
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        uniform float uTime;
        uniform float uBrightness;

        // Hash function for star placement
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // 2D rotation
        mat2 rot2(float a) {
          float s = sin(a), c = cos(a);
          return mat2(c, -s, s, c);
        }

        // Smooth noise for nebula
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = m * p * 2.0 + float(i) * 0.7;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          // Convert world position to spherical direction
          vec3 dir = normalize(vWorldPos);

          // Sky UV from direction
          float theta = atan(dir.z, dir.x); // azimuth [-PI, PI]
          float phi = acos(dir.y);           // polar [0, PI]

          vec2 uv = vec2(theta / (2.0 * 3.14159265) + 0.5, phi / 3.14159265);

          // ===== BASE SKY: Deep indigo =====
          vec3 baseColor = vec3(0.03, 0.03, 0.10);

          // Horizon glow (subtle dark blue)
          float horizonGlow = smoothstep(0.0, 0.5, abs(phi - 1.57));
          baseColor += vec3(0.02, 0.02, 0.06) * (1.0 - horizonGlow);

          vec3 color = baseColor;

          // ===== VORTEX / SWIRL (Van Gogh style) =====
          vec2 suv = uv * 2.0 - 1.0;
          suv.x *= 2.0; // aspect

          // Main vortex center
          vec2 vc1 = vec2(0.3, 0.15);
          vec2 dv1 = suv - vc1;
          float dist1 = length(dv1);
          float angle1 = atan(dv1.y, dv1.x);

          // Spiral pattern
          float spiral1 = sin(angle1 * 3.0 + dist1 * 8.0 - uTime * 0.15);
          float vortex1 = smoothstep(0.8, 0.0, dist1) * (spiral1 * 0.5 + 0.5);
          vortex1 *= smoothstep(0.05, 0.0, dist1) * 0.6 + 0.4;

          // Second smaller vortex
          vec2 vc2 = vec2(-0.5, -0.2);
          vec2 dv2 = suv - vc2;
          float dist2 = length(dv2);
          float angle2 = atan(dv2.y, dv2.x);
          float spiral2 = sin(angle2 * 4.0 - dist2 * 6.0 + uTime * 0.1);
          float vortex2 = smoothstep(0.5, 0.0, dist2) * (spiral2 * 0.5 + 0.5);
          vortex2 *= smoothstep(0.05, 0.0, dist2) * 0.5 + 0.5;

          // Nebula clouds using FBM
          float nebula = fbm(suv * 3.0 + vec2(uTime * 0.02, uTime * 0.01));
          nebula = nebula * 0.5 + 0.5;

          // Vortex color: dark golden yellow
          vec3 vortexColor = vec3(0.77, 0.65, 0.20);

          // Blend vortices
          float vortexStrength = vortex1 * 0.7 + vortex2 * 0.4;
          vortexStrength = mix(vortexStrength, vortexStrength * nebula, 0.5);
          color = mix(color, vortexColor, vortexStrength * 0.6);

          // Nebula wisps in vortex color
          color += vortexColor * nebula * 0.08;

          // ===== STARS =====
          // Multiple star layers at different scales
          float stars = 0.0;

          // Bright stars (sparse)
          vec2 suvLarge = floor(suv * 80.0);
          float starLarge = hash(suvLarge);
          float starBright = smoothstep(0.985, 0.986, starLarge);
          stars += starBright;

          // Medium stars
          vec2 suvMed = floor(suv * 200.0);
          float starMed = hash(suvMed);
          stars += smoothstep(0.993, 0.994, starMed) * 0.7;

          // Small stars (dense)
          vec2 suvSmall = floor(suv * 400.0);
          float starSmall = hash(suvSmall);
          stars += smoothstep(0.997, 0.998, starSmall) * 0.4;

          // Twinkle animation
          float twinkle = sin(uTime * 2.0 + hash(suvLarge) * 20.0) * 0.3 + 0.7;
          stars *= twinkle;

          // Star color: warm white
          vec3 starColor = vec3(1.0, 1.0, 0.92);
          color += starColor * stars * 0.9;

          // ===== BLUE PLANET =====
          vec2 planetPos = vec2(-0.35, 0.3);
          vec2 dp = suv - planetPos;
          float planetDist = length(dp);
          float planetRadius = 0.06;

          if (planetDist < planetRadius) {
            // Planet disc
            float planetEdge = smoothstep(planetRadius, planetRadius - 0.005, planetDist);
            vec3 planetColor = vec3(0.16, 0.32, 0.72);

            // Crescent shading
            float crescent = smoothstep(-0.02, 0.04, dp.x) * 0.6 + 0.4;
            planetColor *= crescent;

            // Subtle bands
            float bands = sin(dp.y * 40.0) * 0.1 + 0.9;
            planetColor *= bands;

            color = mix(color, planetColor, planetEdge);
          }

          // Planet glow ring
          if (planetDist > planetRadius && planetDist < planetRadius + 0.015) {
            float ringAlpha = smoothstep(planetRadius + 0.015, planetRadius, planetDist) * 0.3;
            color = mix(color, vec3(0.2, 0.4, 0.85), ringAlpha);
          }

          // ===== Distant diamond core (cyan-purple, only at very far edge) =====
          float edgeFade = smoothstep(0.95, 1.0, abs(suv.x));
          vec3 diamondColor = vec3(0.15, 0.25, 0.55); // subdued cyan-purple
          color = mix(color, diamondColor, edgeFade * 0.08);

          // ===== Apply global brightness =====
          color *= uBrightness;

          // Ensure no orange/red/pink pollution
          // Clamp red channel relative to blue
          color.r = min(color.r, color.b * 1.2 + 0.05);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });

    // CRITICAL: renderOrder = -1 ensures sky renders behind everything
    mat.depthWrite = false;  // redundant but explicit per spec
    // fog: false is set in ShaderMaterial constructor above
    // renderOrder is set on the mesh below

    this._starrySkyMesh = new THREE.Mesh(geo, mat);
    this._starrySkyMesh.renderOrder = -1;
    this._starrySkyMesh.name = 'starrySky';

    // Add to rooftop group (NOT scene root!)
    this.group.add(this._starrySkyMesh);

    // Store for animation
    this._skyUniforms = uniforms;
  }

  // ==================== Antenna ====================
  _buildAntenna() {
    const group = new THREE.Group();
    group.position.set(3.5, 0, 2.5);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.3, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 2.5, 6), poleMat);
    pole.position.y = 1.25;
    group.add(pole);

    const dishMat = new THREE.MeshStandardMaterial({ color: 0x889999, roughness: 0.2, metalness: 0.7 });
    const dish = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.12, 8), dishMat);
    dish.position.y = 2.5;
    dish.rotation.x = 0.5;
    dish.rotation.y = -0.8;
    group.add(dish);

    const blinker = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xff4444 }));
    blinker.position.y = 2.55;
    blinker.name = 'antennaBlinker';
    group.add(blinker);

    this.group.add(group);
    this._antennaBlinker = blinker;
  }

  // ==================== Wind Chime ====================
  _buildWindChime() {
    const group = new THREE.Group();
    group.position.set(-3.8, 0, -3.5);

    const hangerMat = new THREE.MeshStandardMaterial({ color: 0x998877, roughness: 0.3, metalness: 0.5 });
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.06), hangerMat);
    topBar.position.y = 2.2;
    group.add(topBar);

    const stringMat = new THREE.MeshBasicMaterial({ color: 0x665544 });
    const chimeColors = [0x88aacc, 0xccaa88, 0xaacc88, 0xccaacc, 0x88ccaa];
    this._chimePieces = [];

    for (let i = 0; i < 5; i++) {
      const string = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.8, 0.01), stringMat);
      string.position.set(-0.16 + i * 0.08, 1.8, 0);
      group.add(string);

      const chime = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.03),
        new THREE.MeshStandardMaterial({ color: chimeColors[i], roughness: 0.15, metalness: 0.6, emissive: chimeColors[i], emissiveIntensity: 0.2 }));
      chime.position.set(-0.16 + i * 0.08, 1.4, 0);
      chime.name = 'chime';
      chime.userData = { baseY: 1.4, phase: i * 1.3 };
      group.add(chime);
      this._chimePieces.push(chime);
    }

    this.group.add(group);
  }

  // ==================== Update ====================
  update(dt) {
    // Animate star twinkle and vortex rotation
    if (this._skyUniforms) {
      this._skyUniforms.uTime.value += dt;
    }

    // Blink console indicator
    const indicator = this.group.getObjectByName('consoleIndicator');
    if (indicator) {
      indicator.visible = Math.sin(Date.now() * 0.005) > 0;
    }

    // Antenna blinker
    if (this._antennaBlinker) {
      this._antennaBlinker.visible = Math.sin(Date.now() * 0.008) > 0.2;
    }

    // Wind chime gentle sway
    if (this._chimePieces) {
      const t = Date.now() * 0.001;
      for (const chime of this._chimePieces) {
        chime.position.y = chime.userData.baseY + Math.sin(t * 2.5 + chime.userData.phase) * 0.015;
        chime.rotation.z = Math.sin(t * 1.8 + chime.userData.phase) * 0.04;
      }
    }
  }
}

export default VoxelRooftop;
