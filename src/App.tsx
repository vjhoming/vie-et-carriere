/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { SPRITES, PALETTE } from './sprites';
import { GameState, DialogueState, EntityType } from './types';
import GameUI from './components/GameUI';
import LevelEditor from './components/LevelEditor';
import { audio } from './audio';
import { computeAbsoluteMap, getGameMessages } from './levelData';

// Constants
const ROAD_WIDTH = 600;
const COLOR_SKY = 0x3A86FF;
const COLOR_INDOOR = 0x111111;

const GAME_MESSAGES = getGameMessages();

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // React-side mirror states for high-fidelity UI rendering
  const [gameState, setGameState] = useState<GameState>({
    lives: 3,
    score: 0,
    phase: 1,
    isPlaying: false,
    isPregnant: false,
    condonCaught: false,
    isBerserk: false,
    distance: 0,
    highScore: parseInt(localStorage.getItem('highScore_carriere') || '0', 10),
  });

  const [dialogue, setDialogue] = useState<DialogueState>({
    text: "C'est ta vie qui commence, ma p'tite Isabelle !",
    visible: true,
    duration: 5000,
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [levelMessage, setLevelMessage] = useState<string | null>(null);

  // Action references for sharing input and triggers between React & Three.js loop
  const keysRef = useRef({ left: false, right: false, jump: false, shoot: false });
  const gameStateRef = useRef<GameState>({ ...gameState });

  // Keep ref synchronized with state updates
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Audio utility helper
  const triggerDamageOverlay = () => {
    const overlay = document.getElementById('damageOverlay');
    if (overlay) {
      overlay.style.opacity = '0.7';
      setTimeout(() => {
        overlay.style.opacity = '0';
      }, 150);
    }
  };

  // Helper to show interactive dialogue
  const showDialogue = (text: string, durationMs: number = 5000) => {
    setDialogue({ text, visible: true, duration: durationMs });
  };

  useEffect(() => {
    if (dialogue.visible) {
      const timer = setTimeout(() => {
        setDialogue((prev) => ({ ...prev, visible: false }));
      }, dialogue.duration);
      return () => clearTimeout(timer);
    }
  }, [dialogue.visible, dialogue.text, dialogue.duration]);

  // Start the entire game
  const handleStartGame = () => {
    // Resume audio context
    audio.playCoin();
    audio.startBGM();
    setGameState((prev) => ({
      ...prev,
      lives: 3,
      score: 0,
      phase: 1,
      isPlaying: true,
      isPregnant: false,
      condonCaught: false,
      isBerserk: false,
      distance: 0,
    }));
    showDialogue(GAME_MESSAGES.start, 6000);
  };

  const handleRestartGame = () => {
    audio.playCoin();
    audio.startBGM();
    setGameState((prev) => ({
      ...prev,
      lives: 3,
      score: 0,
      phase: 1,
      isPlaying: true,
      isPregnant: false,
      condonCaught: false,
      isBerserk: false,
      distance: 0,
    }));
    showDialogue(GAME_MESSAGES.restart, 5000);
  };

  // Touch control helper handlers
  const handlePressLeft = (active: boolean) => {
    keysRef.current.left = active;
  };

  const handlePressRight = (active: boolean) => {
    keysRef.current.right = active;
  };

  const handlePressJump = (active: boolean) => {
    keysRef.current.jump = active;
  };

  const handlePressShoot = (active: boolean) => {
    keysRef.current.shoot = active;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // --- TEXTURES CACHING SYSTEM ---
    const TEXTURES: Record<string, THREE.CanvasTexture> = {};

    function generateTextures() {
      const scale = 8; // Pixel art resolution multiplier
      for (const key in SPRITES) {
        const spr = SPRITES[key];
        const canvas = document.createElement('canvas');
        canvas.width = spr[0].length * scale;
        canvas.height = spr.length * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.imageSmoothingEnabled = false;

        for (let y = 0; y < spr.length; y++) {
          for (let x = 0; x < spr[y].length; x++) {
            const colorCode = spr[y][x];
            if (colorCode !== '.' && PALETTE[colorCode]) {
              ctx.fillStyle = PALETTE[colorCode]!;
              ctx.fillRect(x * scale, y * scale, scale, scale);
            }
          }
        }

        if (key === 'bulletin') {
          ctx.fillStyle = '#ff0000'; // Big red text
          ctx.font = 'bold 42px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('A+', canvas.width / 2, canvas.height / 2 - 10);
          
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('100 pts', canvas.width / 2, canvas.height / 2 + 25);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        TEXTURES[key] = texture;
      }
    }

    generateTextures();

    // --- THREE.JS INITIALIZATION ---
    const width = window.innerWidth;
    const height = window.innerHeight;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLOR_SKY);
    scene.fog = new THREE.Fog(COLOR_SKY, 1000, 15000);

    const camera = new THREE.PerspectiveCamera(65, width / height, 10, 20000);
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: false,
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(200, 600, 300);
    scene.add(dirLight);

    // --- ENVIRONMENT ASSETS ---
    // Ground Green Plane
    const groundGeo = new THREE.PlaneGeometry(12000, 12000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 }); // Rich green
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    scene.add(ground);

    // Orange Highway Track
    const pathGeo = new THREE.PlaneGeometry(ROAD_WIDTH, 12000);
    const pathMat = new THREE.MeshLambertMaterial({ color: 0xe65100 }); // Saturated orange lane
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.rotation.x = -Math.PI / 2;
    path.position.y = 0;
    scene.add(path);

    // Side White Stripes
    const lineGeo = new THREE.PlaneGeometry(16, 12000);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineLeft = new THREE.Mesh(lineGeo, lineMat);
    lineLeft.rotation.x = -Math.PI / 2;
    lineLeft.position.set(-ROAD_WIDTH / 2, 1, 0);
    scene.add(lineLeft);

    const lineRight = new THREE.Mesh(lineGeo, lineMat);
    lineRight.rotation.x = -Math.PI / 2;
    lineRight.position.set(ROAD_WIDTH / 2, 1, 0);
    scene.add(lineRight);

    // --- TREES/SCENERY BLOCKS ---
    const sceneryTrees: THREE.Mesh[] = [];
    const treeGeo = new THREE.ConeGeometry(50, 180, 4);
    const treeMat = new THREE.MeshLambertMaterial({ color: 0x1b5e20 }); // Pine tree green

    function initScenery() {
      for (let i = 0; i < 70; i++) {
        const mesh = new THREE.Mesh(treeGeo, treeMat);
        const side = Math.random() > 0.5 ? 1 : -1;
        const offsetX = side * (ROAD_WIDTH / 2 + 500 + Math.random() * 1400);
        const startZ = -Math.random() * 6000;

        mesh.position.set(offsetX, 90, startZ);
        scene.add(mesh);
        sceneryTrees.push(mesh);
      }
    }

    function updateScenery(playerZ: number) {
      sceneryTrees.forEach((tree) => {
        // Recycle behind player
        if (tree.position.z > playerZ + 600) {
          tree.position.z -= 6000;
          const side = tree.position.x > 0 ? 1 : -1;
          tree.position.x = side * (ROAD_WIDTH / 2 + 500 + Math.random() * 1400);
        }
      });

      // Keep ground aligned with player segment
      ground.position.z = playerZ - (playerZ % 200);
      path.position.z = ground.position.z;
      lineLeft.position.z = ground.position.z;
      lineRight.position.z = ground.position.z;
    }

    // --- GAME CLASSES ---

    // 3D School Building Class
    class SchoolBuilding {
      z: number;
      depth: number;
      doorWidth: number;
      wallWidth: number;
      height: number;
      group: THREE.Group;
      frontMat: THREE.MeshLambertMaterial;
      backMat: THREE.MeshLambertMaterial;
      buildingType: 'primaire' | 'secondaire' | 'universite' | 'cdkc';

      constructor(zPos: number, brickColor: number = 0xd32f2f, buildingType: 'primaire' | 'secondaire' | 'universite' | 'cdkc' = 'primaire', customDepth: number = 10000) {
        this.z = zPos;
        this.buildingType = buildingType;
        this.depth = customDepth;
        this.doorWidth = 400;
        this.wallWidth = ROAD_WIDTH + 600;
        this.height = 800; // No ceiling, very high walls

        this.group = new THREE.Group();

        // Setup fade-supporting materials
        this.frontMat = new THREE.MeshLambertMaterial({
          color: brickColor,
          transparent: true,
          opacity: 1.0,
        });

        this.backMat = new THREE.MeshLambertMaterial({
          color: brickColor,
          transparent: true,
          opacity: 1.0,
        });

        // Floor Texture
        const floorCanvas = document.createElement('canvas');
        floorCanvas.width = 512;
        floorCanvas.height = 512;
        const fCtx = floorCanvas.getContext('2d')!;
        fCtx.fillStyle = buildingType === 'universite' ? '#cfd8dc' : (buildingType === 'secondaire' ? '#b0bec5' : '#ffcc80');
        fCtx.fillRect(0, 0, 512, 512);
        fCtx.strokeStyle = 'rgba(0,0,0,0.1)';
        fCtx.lineWidth = 4;
        for (let i = 0; i < 512; i += 128) {
          fCtx.beginPath();
          fCtx.moveTo(i, 0); fCtx.lineTo(i, 512);
          fCtx.moveTo(0, i); fCtx.lineTo(512, i);
          fCtx.stroke();
        }
        const floorTex = new THREE.CanvasTexture(floorCanvas);
        floorTex.wrapS = THREE.RepeatWrapping;
        floorTex.wrapT = THREE.RepeatWrapping;
        floorTex.repeat.set(2, this.depth / 800);
        floorTex.colorSpace = THREE.SRGBColorSpace;
        const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });

        // Inner Wall Texture with Lockers/Doors
        const wallCanvas = document.createElement('canvas');
        wallCanvas.width = 1024;
        wallCanvas.height = 1024;
        const wCtx = wallCanvas.getContext('2d')!;
        wCtx.fillStyle = buildingType === 'universite' ? '#eceff1' : '#ffe0b2';
        if (buildingType === 'secondaire') wCtx.fillStyle = '#e3f2fd';
        wCtx.fillRect(0, 0, 1024, 1024);
        
        if (buildingType === 'secondaire' || buildingType === 'universite') {
          // Lockers
          wCtx.fillStyle = buildingType === 'universite' ? '#78909c' : '#42a5f5';
          for(let i=50; i<950; i+= 150) {
            wCtx.fillRect(i, 300, 100, 600);
            wCtx.strokeStyle = 'rgba(0,0,0,0.5)';
            wCtx.lineWidth = 4;
            wCtx.strokeRect(i, 300, 100, 600);
            wCtx.fillStyle = '#000';
            wCtx.fillRect(i + 40, 320, 20, 50);
          }
        } else if (buildingType === 'primaire') {
          // Classroom doors & drawings
          wCtx.fillStyle = '#8d6e63'; 
          wCtx.fillRect(100, 300, 250, 600);
          wCtx.fillStyle = '#fbc02d'; 
          wCtx.fillRect(500, 400, 400, 250);
          wCtx.fillStyle = '#f44336'; wCtx.fillRect(520, 420, 60, 60);
          wCtx.fillStyle = '#4caf50'; wCtx.fillRect(600, 450, 80, 50);
          wCtx.fillStyle = '#2196f3'; wCtx.fillRect(750, 410, 70, 70);
        }

        const wallTex = new THREE.CanvasTexture(wallCanvas);
        wallTex.wrapS = THREE.RepeatWrapping;
        wallTex.wrapT = THREE.RepeatWrapping;
        wallTex.repeat.set(this.depth / 1000, 1);
        wallTex.colorSpace = THREE.SRGBColorSpace;
        const insideWallMat = new THREE.MeshLambertMaterial({ map: wallTex });

        // Door frame indicator pillars
        const frameGeo = new THREE.BoxGeometry(40, this.height, 40);
        const frameMat = new THREE.MeshLambertMaterial({ color: 0xffeb3b }); // Yellow frames
        const leftFrame = new THREE.Mesh(frameGeo, frameMat);
        leftFrame.position.set(-this.doorWidth / 2 - 20, this.height / 2, 0);
        const rightFrame = new THREE.Mesh(frameGeo, frameMat);
        rightFrame.position.set(this.doorWidth / 2 + 20, this.height / 2, 0);
        this.group.add(leftFrame, rightFrame);

        // --- FRONT FACADE ---
        const sideWallWidth = (this.wallWidth - this.doorWidth) / 2;
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(sideWallWidth, this.height, 50), this.frontMat);
        leftWall.position.set(-this.doorWidth / 2 - sideWallWidth / 2, this.height / 2, 0);
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(sideWallWidth, this.height, 50), this.frontMat);
        rightWall.position.set(this.doorWidth / 2 + sideWallWidth / 2, this.height / 2, 0);
        const topWall = new THREE.Mesh(new THREE.BoxGeometry(this.doorWidth, this.height - 300, 50), this.frontMat);
        topWall.position.set(0, this.height - (this.height - 300) / 2, 0);
        this.group.add(leftWall, rightWall, topWall);

        // --- BUILDING SIGN WITH TEXT ---
        let signText = '';
        let signBgColor = '#ffffff';
        let signTextColor = '#000000';
        if (buildingType === 'primaire') signText = 'ÉCOLE PRIMAIRE';
        else if (buildingType === 'secondaire') signText = 'ÉCOLE SECONDAIRE';
        else if (buildingType === 'universite') signText = 'UNIVERSITÉ';
        else if (buildingType === 'cdkc') {
          signText = 'CDKC RADIO';
          signBgColor = '#ff0000';
          signTextColor = '#ffffff';
        }

        if (signText) {
          const canvasText = document.createElement('canvas');
          canvasText.width = 1024;
          canvasText.height = 256;
          const ctxText = canvasText.getContext('2d')!;
          ctxText.fillStyle = signBgColor;
          ctxText.fillRect(0, 0, 1024, 256);
          ctxText.strokeStyle = buildingType === 'cdkc' ? '#ffeb3b' : '#000000';
          ctxText.lineWidth = 32;
          ctxText.strokeRect(0, 0, 1024, 256);
          ctxText.fillStyle = signTextColor;
          ctxText.font = 'bold 84px monospace, sans-serif';
          ctxText.textAlign = 'center';
          ctxText.textBaseline = 'middle';
          ctxText.fillText(signText, 512, 128);
          
          const tex = new THREE.CanvasTexture(canvasText);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.magFilter = THREE.NearestFilter;
          const signMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(this.doorWidth + 240, 120),
            new THREE.MeshBasicMaterial({ map: tex })
          );
          // Place the sign above the door (door height is 300)
          signMesh.position.set(0, 420, 26);
          this.group.add(signMesh);
        }

        // --- INNER SCHOOL HALLWAY ---
        const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(this.wallWidth, this.depth), floorMat);
        inFloor.rotation.x = -Math.PI / 2;
        inFloor.position.set(0, 1.5, -this.depth / 2);
        this.group.add(inFloor);

        if (buildingType === 'cdkc') {
          const deskGeo = new THREE.BoxGeometry(300, 80, 150);
          const deskMat = new THREE.MeshBasicMaterial({ color: 0x4e342e });
          const desk = new THREE.Mesh(deskGeo, deskMat);
          desk.position.set(0, 40, -400);
          const micGeo = new THREE.BoxGeometry(20, 60, 20);
          const micMat = new THREE.MeshBasicMaterial({ color: 0x9e9e9e });
          const mic = new THREE.Mesh(micGeo, micMat);
          mic.position.set(50, 110, -400);
          const mixerGeo = new THREE.BoxGeometry(80, 10, 50);
          const mixerMat = new THREE.MeshBasicMaterial({ color: 0x212121 });
          const mixer = new THREE.Mesh(mixerGeo, mixerMat);
          mixer.position.set(-50, 85, -380);
          this.group.add(desk, mic, mixer);
        }

        const inLeftGeo = new THREE.PlaneGeometry(this.depth, this.height);
        const inLeft = new THREE.Mesh(inLeftGeo, insideWallMat);
        inLeft.rotation.y = Math.PI / 2;
        inLeft.position.set(-this.wallWidth / 2, this.height / 2, -this.depth / 2);
        this.group.add(inLeft);

        const inRightGeo = new THREE.PlaneGeometry(this.depth, this.height);
        const inRight = new THREE.Mesh(inRightGeo, insideWallMat);
        inRight.rotation.y = -Math.PI / 2;
        inRight.position.set(this.wallWidth / 2, this.height / 2, -this.depth / 2);
        this.group.add(inRight);

        // --- BACK OUTLET FACADE ---
        const backLeft = new THREE.Mesh(new THREE.BoxGeometry(sideWallWidth, this.height, 50), this.backMat);
        backLeft.position.set(-this.doorWidth / 2 - sideWallWidth / 2, this.height / 2, -this.depth);
        const backRight = new THREE.Mesh(new THREE.BoxGeometry(sideWallWidth, this.height, 50), this.backMat);
        backRight.position.set(this.doorWidth / 2 + sideWallWidth / 2, this.height / 2, -this.depth);

        if (buildingType !== 'cdkc') {
          const backTop = new THREE.Mesh(new THREE.BoxGeometry(this.doorWidth, this.height - 300, 50), this.backMat);
          backTop.position.set(0, this.height - (this.height - 300) / 2, -this.depth);
          this.group.add(backLeft, backRight, backTop);
        } else {
          const closedBack = new THREE.Mesh(new THREE.BoxGeometry(this.wallWidth, this.height, 50), this.backMat);
          closedBack.position.set(0, this.height / 2, -this.depth);
          this.group.add(closedBack);
        }

        this.group.position.set(0, 0, this.z);
        scene.add(this.group);
      }

      // Check collision/bumping against doorways
      checkCollision(playerX: number, playerZ: number, playerW: number): 'bump' | 'inside' | 'outside' {
        const entryZ = this.z;
        const exitZ = this.z - this.depth;

        // Front wall collision barrier
        if (playerZ > entryZ - 30 && playerZ - 10 <= entryZ) {
          if (Math.abs(playerX) > this.doorWidth / 2 - playerW / 2) {
            return 'bump';
          }
        }

        // Back wall exit collision barrier
        if (playerZ < exitZ + 30 && playerZ + 10 >= exitZ) {
          if (this.buildingType === 'cdkc') {
            return 'bump'; // CDKC has no exit
          }
          if (Math.abs(playerX) > this.doorWidth / 2 - playerW / 2) {
            return 'bump';
          }
        }

        // Inside the hallway
        if (playerZ < entryZ && playerZ > exitZ) {
          return 'inside';
        }

        return 'outside';
      }

      // Automatically fade building facades when camera is very close or blocking view
      updateFade(cameraZ: number) {
        const fadeStart = 480;

        // Front facade
        const distToFront = cameraZ - this.z;
        if (distToFront > 0 && distToFront < fadeStart) {
          this.frontMat.opacity = Math.max(0.1, distToFront / fadeStart);
        } else {
          this.frontMat.opacity = 1.0;
        }

        // Back facade
        const distToBack = cameraZ - (this.z - this.depth);
        if (distToBack > 0 && distToBack < fadeStart) {
          this.backMat.opacity = Math.max(0.1, distToBack / fadeStart);
        } else {
          this.backMat.opacity = 1.0;
        }
      }

      cleanup() {
        scene.remove(this.group);
      }
    }

    // Interactive Entities (Obstacles, Bonuses, Dialogues triggerers)
    class Item3D {
      type: EntityType;
      x: number;
      z: number;
      y: number;
      sprite: THREE.Sprite;
      initialY: number;
      bobOffset: number;
      collected: boolean;
      width: number;
      height: number;
      dialogue?: string;
      grade?: string;
      pts?: string;

      constructor(type: EntityType, x: number, z: number, yInit: number = 0, customGrade?: string, customPoints?: string, customDialogue?: string) {
        this.type = type;
        this.x = x;
        this.z = z;
        this.y = yInit;
        this.initialY = yInit;
        this.bobOffset = Math.random() * 100;
        this.collected = false;
        this.dialogue = customDialogue;
        this.grade = customGrade;
        this.pts = customPoints;

        let mapTex = TEXTURES[type] || TEXTURES['idle'];
        
        // Custom bulletin with specific points/grade
        if ((type === 'bulletin' || type === 'bac') && customGrade && customPoints) {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw a quick bulletin/diploma base
            ctx.fillStyle = type === 'bac' ? '#fff8e1' : '#ffffff'; // slightly golden for BAC
            ctx.fillRect(16, 16, 96, 96);
            ctx.strokeStyle = type === 'bac' ? '#ffc107' : '#000000';
            ctx.lineWidth = 4;
            ctx.strokeRect(16, 16, 96, 96);
            
            // Draw the text
            ctx.fillStyle = type === 'bac' ? '#000000' : '#ff0000';
            ctx.font = type === 'bac' ? 'bold 24px sans-serif' : 'bold 42px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(customGrade, canvas.width / 2, canvas.height / 2 - 10);
            
            ctx.fillStyle = '#000000';
            ctx.font = type === 'bac' ? 'bold 16px sans-serif' : 'bold 24px sans-serif';
            ctx.fillText(customPoints, canvas.width / 2, canvas.height / 2 + 25);
          }
          mapTex = new THREE.CanvasTexture(canvas);
          mapTex.magFilter = THREE.NearestFilter;
          mapTex.minFilter = THREE.NearestFilter;
          mapTex.colorSpace = THREE.SRGBColorSpace;
        }

        const mat = new THREE.SpriteMaterial({ map: mapTex, transparent: true });
        this.sprite = new THREE.Sprite(mat);

        // Adjust dimensions
        this.width = 110;
        this.height = 110;

        // Custom sizes for items
        if (type === 'seringue') {
          this.width = 80;
          this.height = 130;
        } else if (type === 'gars') {
          this.width = 100;
          this.height = 100;
        } else if (type === 'condon') {
          this.width = 140;
          this.height = 120;
        } else if (type === 'biere') {
          this.width = 240;
          this.height = 200;
        } else if (type === 'guichet') {
          this.width = 160;
          this.height = 180;
        } else if (type === 'police') {
          this.width = 180;
          this.height = 140;
        } else if (type === 'bac') {
          this.width = 110;
          this.height = 110;
        } else if (type === 'bonnet') {
          this.width = 100;
          this.height = 130;
        } else if (type === 'cone') {
          this.width = 80;
          this.height = 100;
        } else if (type === 'bureau') {
          this.width = 130;
          this.height = 110;
        } else if (type === 'pieton') {
          this.width = 110;
          this.height = 130;
        }

        this.sprite.scale.set(this.width, this.height, 1);
        this.sprite.center.set(0.5, 0); // Bottom anchored
        this.sprite.position.set(this.x, this.y, this.z);

        scene.add(this.sprite);
      }

      update(time: number, playerX?: number) {
        if (this.collected) return;

        // Floating effect for study files, cash bags, diplomas, condoms, beer
        if (this.type === 'bulletin' || this.type === 'bourse' || this.type === 'condon' || this.type === 'biere' || this.type === 'bac') {
          this.sprite.position.y = this.initialY + Math.sin(time * 3 + this.bobOffset) * 25 + 10;
        } else {
          this.sprite.position.y = this.initialY;
        }

        // Phase 10: fast bourse movement back and forth sideways
        if (this.type === 'bourse' && this.initialY > 100) {
          this.sprite.position.x = this.x + Math.sin(time * 4.5 + this.bobOffset) * 200;
        }

        // Phase 12: police car driving fast towards player along positive Z
        if (this.type === 'police') {
          this.z += 16;
          this.sprite.position.z = this.z;
        }

        // Phase 8: gars tracks player X
        if (this.type === 'gars' && playerX !== undefined) {
          this.x += (playerX - this.x) * 0.05;
          this.sprite.position.x = this.x;
        }

        // Bonnet tracks player X slowly
        if (this.type === 'bonnet' && playerX !== undefined) {
          this.x += (playerX - this.x) * 0.012; // slowly tracks player
          this.sprite.position.x = this.x;
        }

        // Slowly rotate biere and condon sprites for high retro dynamic look
        if (this.type === 'biere') {
          this.sprite.material.rotation = Math.sin(time * 2) * 0.15;
        }
      }

      checkCollision(playerX: number, playerY: number, playerZ: number, playerW: number, playerH: number): boolean {
        if (this.collected) return false;

        // AABB Bounding Box matching
        const xDist = Math.abs(this.x - playerX);
        const zDist = Math.abs(this.z - playerZ);

        // Check if overlaps
        const colX = xDist < (this.width / 2 + playerW / 2 - 15);
        const colZ = zDist < 60; // Deep overlap Z range
        const colY = playerY < (this.sprite.position.y + this.height) && (playerY + playerH) > this.sprite.position.y;

        return colX && colZ && colY;
      }

      collect() {
        this.collected = true;
        scene.remove(this.sprite);
      }

      cleanup() {
        scene.remove(this.sprite);
      }
    }

    // Core Player class
    class Player3D {
      x: number;
      y: number;
      z: number;
      vx: number;
      vy: number;
      grounded: boolean;
      isPregnant: boolean;
      condonCaught: boolean;
      isBerserk: boolean;

      acceleration: number;
      friction: number;
      maxSpeedX: number;
      jumpForce: number;
      gravity: number;
      forwardSpeed: number;

      spriteW: number;
      spriteH: number;
      material: THREE.SpriteMaterial;
      mesh: THREE.Sprite;
      animTimer: number;

      constructor() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.vx = 0;
        this.vy = 0;
        this.grounded = true;
        this.isPregnant = false;
        this.condonCaught = false;
        this.isBerserk = false;

        this.acceleration = 0.75;
        this.friction = 0.82;
        this.maxSpeedX = 10.5;
        this.jumpForce = 35;
        this.gravity = 1.45;
        this.forwardSpeed = 7.5; // Constantly runs forward (reduced to 75%)

        this.spriteW = 120;
        this.spriteH = 150;
        this.animTimer = 0;

        this.material = new THREE.SpriteMaterial({ map: TEXTURES['idle'], transparent: true });
        this.mesh = new THREE.Sprite(this.material);
        this.mesh.scale.set(this.spriteW, this.spriteH, 1);
        this.mesh.center.set(0.5, 0); // Ground aligned anchor
        this.mesh.position.set(this.x, this.y, this.z);

        scene.add(this.mesh);
      }

      update(keys: { left: boolean; right: boolean; jump: boolean }, isInsideBuilding: boolean, isBumped: boolean) {
        // Controls physical movement
        let currentMaxSpeedX = this.maxSpeedX;
        let currentAccel = this.acceleration;
        let currentForwardSpeed = this.forwardSpeed;

        // Apply pregnancy physical debuff: halved speed!
        if (this.isPregnant) {
          currentMaxSpeedX = this.maxSpeedX / 2;
          currentAccel = this.acceleration / 2;
          currentForwardSpeed = this.forwardSpeed / 2;
        }

        // Apply Berserk mode: speed x3!
        if (this.isBerserk) {
          currentForwardSpeed = 30;
        }

        // Side movement physics
        if (keys.left) {
          this.vx -= currentAccel;
        } else if (keys.right) {
          this.vx += currentAccel;
        }

        this.vx *= this.friction;
        this.vx = Math.max(-currentMaxSpeedX, Math.min(this.vx, currentMaxSpeedX));
        this.x += this.vx;

        // Boundaries matching path lanes
        const boundaryLimit = ROAD_WIDTH / 2 - 40;
        if (this.x < -boundaryLimit) {
          this.x = -boundaryLimit;
          this.vx = 0;
        }
        if (this.x > boundaryLimit) {
          this.x = boundaryLimit;
          this.vx = 0;
        }

        // Jump physics
        if (keys.jump && this.grounded) {
          this.vy = this.jumpForce;
          this.grounded = false;
          audio.playJump();
        }

        this.y += this.vy;
        if (!this.grounded) {
          this.vy -= this.gravity;
        }

        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          this.grounded = true;
        }

        // Constantly advance forward
        if (!isBumped) {
          this.z -= currentForwardSpeed;
        } else {
          this.vx = 0;
        }

        // Update 3D position
        this.mesh.position.set(this.x, this.y, this.z);

        // Adjust scale for pregnancy or berserk
        if (this.isPregnant) {
          this.mesh.scale.set(this.spriteW * 1.35, this.spriteH * 1.35, 1);
        } else {
          this.mesh.scale.set(this.spriteW, this.spriteH, 1);
        }

        // Flashing tint for Berserk
        if (this.isBerserk) {
          if (Math.floor(this.animTimer * 5) % 2 === 0) {
            this.material.color.setHex(0xff3333);
          } else {
            this.material.color.setHex(0xffffff);
          }
        } else {
          this.material.color.setHex(0xffffff);
        }

        // Animated sprite frames matching running vectors
        this.animTimer += this.isPregnant ? 0.05 : (this.isBerserk ? 0.25 : 0.11);
        if (!this.grounded) {
          this.material.map = TEXTURES['idle'];
        } else if (isBumped) {
          this.material.map = TEXTURES['idle'];
        } else if (Math.abs(this.vx) > 1.5) {
          const runFrame = Math.floor(this.animTimer) % 2;
          this.material.map = runFrame === 0 ? TEXTURES['run_left'] : TEXTURES['run_right'];
        } else {
          const runFrame = Math.floor(this.animTimer * 1.5) % 4;
          if (runFrame === 0) this.material.map = TEXTURES['idle'];
          else if (runFrame === 1) this.material.map = TEXTURES['run_left'];
          else if (runFrame === 2) this.material.map = TEXTURES['idle'];
          else this.material.map = TEXTURES['run_right'];
        }
      }

      cleanup() {
        scene.remove(this.mesh);
      }
    }

    // Instantiate primary player
    let player = new Player3D();

    // Projectile Shooting System
    class Projectile3D {
      x: number;
      y: number;
      z: number;
      vz: number;
      mesh: THREE.Mesh;
      active: boolean;

      constructor(x: number, y: number, z: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.vz = -28; // flies super fast forward
        this.active = true;

        // Create a bright yellow retro energy ball
        const geo = new THREE.SphereGeometry(14, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffeb3b }); // yellow
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.set(this.x, this.y, this.z);
        scene.add(this.mesh);
      }

      update() {
        this.z += this.vz;
        this.mesh.position.set(this.x, this.y, this.z);

        // Deactivate if too far
        if (this.z < player.z - 1600) {
          this.deactivate();
        }
      }

      deactivate() {
        this.active = false;
        scene.remove(this.mesh);
      }
    }

    let projectilesList: Projectile3D[] = [];

    // Explosion Particle Effects
    const particles: THREE.Mesh[] = [];
    function spawnExplosion(x: number, y: number, z: number) {
      const partGeo = new THREE.BoxGeometry(10, 10, 10);
      const colors = [0xffeb3b, 0xff5722, 0xe65100];
      for (let i = 0; i < 15; i++) {
        const mat = new THREE.MeshBasicMaterial({ color: colors[Math.floor(Math.random() * colors.length)] });
        const p = new THREE.Mesh(partGeo, mat);
        p.position.set(
          x + (Math.random() - 0.5) * 50,
          y + (Math.random() - 0.5) * 50,
          z + (Math.random() - 0.5) * 50
        );
        scene.add(p);
        
        // store velocity vector
        (p as any).vx = (Math.random() - 0.5) * 200;
        (p as any).vy = (Math.random() - 0.5) * 200 + 100;
        (p as any).vz = (Math.random() - 0.5) * 200;
        (p as any).life = 0.5; // half second life
        particles.push(p);
      }
    }

    // Timeline elements variables
    let schoolsList: SchoolBuilding[] = [];
    let itemsList: Item3D[] = [];
    const mapData = computeAbsoluteMap();
    initScenery();

    function initWorld() {
      schoolsList.forEach((s) => s.cleanup());
      schoolsList = [];
      itemsList.forEach((item) => item.cleanup());
      itemsList = [];

      mapData.schools.forEach(school => {
        schoolsList.push(new SchoolBuilding(school.z, school.color, school.ecoleType, school.length));
      });

      mapData.items.forEach(item => {
        itemsList.push(new Item3D(item.type, item.x, item.absoluteZ, item.y || 0, item.grade, item.pts, item.dialogue));
      });
    }

    initWorld();

    let bumpCooldown = 0;
    let shootCooldown = 0;
    let beerDrunkTimer = 0; // Cegep beer screen warp effect timer
    let currentPhaseCalculated = 1;
    let currentLevelMessageCalculated: string | null = null;

    // Core Animation loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    let targetCamX = 0;
    let targetCamY = 260;
    let targetCamZ = 450;

    let currentCamX = 0;
    let currentCamY = 260;
    let currentCamZ = 450;

    // Track active status
    let activeBuildingStatus: 'inside' | 'outside' | 'bump' = 'outside';

    function tick() {
      animationFrameId = requestAnimationFrame(tick);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Only run physics & game timeline updates if playing
      if (gameStateRef.current.isPlaying && gameStateRef.current.lives > 0) {
        // Decrease bump delay counters
        if (bumpCooldown > 0) bumpCooldown -= delta;
        if (shootCooldown > 0) shootCooldown -= delta;

        // Weapon projectile spawn
        if (keysRef.current.shoot && shootCooldown <= 0) {
          shootCooldown = 0.25; // 250ms delay
          projectilesList.push(new Projectile3D(player.x, player.y + 60, player.z - 40));
          audio.playShoot();
        }

        // Check school collisions
        let isBumped = false;
        activeBuildingStatus = 'outside';

        for (const s of schoolsList) {
          const status = s.checkCollision(player.x, player.z, player.spriteW);
          if (status === 'inside') {
            activeBuildingStatus = 'inside';
            
            // Win condition: Player walked inside CDKC
            if (s.buildingType === 'cdkc' && player.z < s.z - 150) {
              audio.playWin();
              setGameState((prev) => {
                const currentFinalScore = prev.score + 5000;
                const nextHighScore = Math.max(prev.highScore, currentFinalScore);
                localStorage.setItem('highScore_carriere', nextHighScore.toString());
                return {
                  ...prev,
                  isPlaying: false,
                  phase: 16,
                  isBerserk: false,
                  highScore: nextHighScore,
                  score: currentFinalScore,
                };
              });
              showDialogue(GAME_MESSAGES.cdkc_reached, 10000);
              return;
            }
          }

          if (status === 'bump') {
            isBumped = true;
            if (bumpCooldown <= 0) {
              bumpCooldown = 0.8;
              triggerDamageOverlay();
              audio.playHit();
              setGameState((prev) => {
                const nextLives = prev.lives - 1;
                return {
                  ...prev,
                  lives: nextLives,
                  isPlaying: nextLives > 0,
                };
              });
            }
          }
        }

        // Run player updates
        player.update(keysRef.current, activeBuildingStatus === 'inside', isBumped);

        // Update active projectiles
        projectilesList.forEach((proj) => {
          if (!proj.active) return;
          proj.update();

          // Check hit against shootable items
          itemsList.forEach((item) => {
            if (!item.collected && (item.type === 'biere' || item.type === 'guichet' || item.type === 'cone' || item.type === 'bureau' || item.type === 'pieton')) {
              const dx = Math.abs(proj.x - item.x);
              const dz = Math.abs(proj.z - item.z);
              const dy = Math.abs(proj.y - item.sprite.position.y);

              if (dx < 75 && dz < 75 && dy < 100) {
                item.collect();
                proj.deactivate();
                audio.playExplode();
                spawnExplosion(item.x, item.sprite.position.y + 40, item.z);

                // Add points
                setGameState((prev) => ({
                  ...prev,
                  score: prev.score + 350,
                }));

                if (item.type === 'biere') {
                  showDialogue(GAME_MESSAGES.obstacles.biere_destroy, 3500);
                } else if (item.type === 'guichet') {
                  showDialogue(GAME_MESSAGES.obstacles.guichet_destroy, 4000);
                  // Spawn police cars closer so they don't clip into the next building
                  itemsList.push(new Item3D('police', player.x, player.z - 1500, 0));
                  itemsList.push(new Item3D('police', player.x > 0 ? -150 : 150, player.z - 2500, 0));
                } else {
                  showDialogue(GAME_MESSAGES.obstacles.generic_destroy, 2000);
                }
              }
            }
          });
        });
        projectilesList = projectilesList.filter((p) => p.active);
      } // End isPlaying block

      // Update particles (runs even if game over/paused)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        (p as any).life -= delta;
        if ((p as any).life <= 0) {
          scene.remove(p);
          particles.splice(i, 1);
        } else {
          p.position.x += (p as any).vx * delta;
          p.position.y += (p as any).vy * delta;
          p.position.z += (p as any).vz * delta;
          (p as any).vy -= 400 * delta; // gravity
          p.scale.multiplyScalar(0.95);
        }
      }

      // Update items and check collisions
      if (gameStateRef.current.isPlaying && gameStateRef.current.lives > 0) {
        itemsList.forEach((item) => {
          item.update(time, player.x);

          if (!item.collected && item.checkCollision(player.x, player.y, player.z, player.spriteW, player.spriteH)) {
            item.collect();

            // Perform event action based on entity code
            if (item.type === 'bonnet') {
              audio.playHit();
              triggerDamageOverlay();
              setGameState((prev) => ({
                ...prev,
                lives: prev.lives - 1,
                isPlaying: prev.lives - 1 > 0,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.bonnet_hit, 4000);
            } else if (item.type === 'bulletin') {
              audio.playCoin();
              let pts = 100;
              if (item.pts) {
                  pts = parseInt(item.pts, 10) || 100;
              }
              setGameState((prev) => ({
                ...prev,
                score: prev.score + pts,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.bulletin_collect(pts), 4000);
            } else if (item.type === 'bourse') {
              audio.playCoin();
              const pts = 1000;
              setGameState((prev) => ({
                ...prev,
                score: prev.score + pts,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.bourse_collect(pts), 4000);
            } else if (item.type === 'pere') {
              audio.playCoin();
              setGameState((prev) => ({
                ...prev,
                score: prev.score + 1000,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.pere_hit, 5000);
            } else if (item.type === 'biere') {
              // Hit the beer without shooting it
              audio.playBeer();
              beerDrunkTimer = 5.0; // Trigger screen warp
              setGameState((prev) => ({
                ...prev,
                score: prev.score + 100,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.biere_drunk, 4500);
            } else if (item.type === 'seringue') {
              audio.playHit();
              triggerDamageOverlay();
              setGameState((prev) => ({
                ...prev,
                lives: prev.lives - 1,
                isPlaying: prev.lives - 1 > 0,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.seringue_hit, 4000);
            } else if (item.type === 'condon') {
              audio.playCoin();
              player.condonCaught = true;
              setGameState((prev) => ({
                ...prev,
                condonCaught: true,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.condon_collect, 4500);
            } else if (item.type === 'gars') {
              if (player.condonCaught) {
                audio.playCoin();
                showDialogue(item.dialogue || GAME_MESSAGES.obstacles.gars_dodged, 4000);
              } else {
                audio.playBébé();
                player.isPregnant = true;
                setGameState((prev) => ({
                  ...prev,
                  isPregnant: true,
                  lives: prev.lives + 1, // Gain life (the baby)
                }));
                showDialogue(item.dialogue || GAME_MESSAGES.obstacles.gars_pregnant, 6000);
              }
            } else if (item.type === 'police') {
              audio.playHit();
              triggerDamageOverlay();
              setGameState((prev) => ({
                ...prev,
                lives: prev.lives - 1,
                isPlaying: prev.lives - 1 > 0,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.police_hit, 4500);
            } else if (item.type === 'guichet') {
              audio.playHit();
              triggerDamageOverlay();
              setGameState((prev) => ({
                ...prev,
                lives: prev.lives - 1,
                isPlaying: prev.lives - 1 > 0,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.guichet_hit, 4000);
            } else if (item.type === 'bac') {
              audio.playCoin();
              let pts = 1000;
              if (item.pts) {
                  pts = parseInt(item.pts, 10) || 1000;
              }
              setGameState((prev) => ({
                ...prev,
                score: prev.score + pts,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.bac_collect(item.grade || 'BAC'), 6000);
            } else if (item.type === 'cone' || item.type === 'bureau' || item.type === 'pieton') {
              audio.playHit();
              triggerDamageOverlay();
              setGameState((prev) => ({
                ...prev,
                lives: prev.lives - 1,
                isPlaying: prev.lives - 1 > 0,
              }));
              showDialogue(item.dialogue || GAME_MESSAGES.obstacles.generic_hit, 3000);
            }
          }
        });

        // Cegep beer warp logic
        if (beerDrunkTimer > 0) {
          beerDrunkTimer -= delta;
          // Warp perspective camera aspect ratio or position slightly
          camera.rotation.z = Math.sin(time * 6) * 0.08;
        } else {
          camera.rotation.z = 0;
        }

        // Synchronize distance state
        const calculatedDistance = Math.floor(Math.abs(player.z) / 10);
        setGameState((prev) => {
          const nextScore = prev.score + Math.floor(calculatedDistance / 10) - Math.floor(prev.distance / 10);
          return {
            ...prev,
            distance: calculatedDistance,
            score: Math.max(prev.score, nextScore),
          };
        });

        // Scenery recycling logic
        updateScenery(player.z);

        // Update fade values on facades
        schoolsList.forEach((s) => {
          s.updateFade(camera.position.z);
        });

        // Timeline check: advance levels dynamically based on absolute Z position
        let nextPhase = 1;
        let foundSection = false;
        
        for (const section of mapData.sections) {
          if (player.z <= section.startZ && player.z > section.endZ) {
            nextPhase = section.id;
            foundSection = true;
            break;
          }
        }
        
        // Final Win check (went beyond the last section)
        if (!foundSection && mapData.sections.length > 0 && player.z <= mapData.sections[mapData.sections.length - 1].endZ) {
            nextPhase = 16; // Win phase indicator (16 is mapped to victory in UI)
        }

        if (nextPhase !== currentPhaseCalculated) {
          currentPhaseCalculated = nextPhase;
          
          if (nextPhase === 16) {
            // Survived the final section (CDKC Radio)!
            audio.playWin();
            setGameState((prev) => {
              const currentFinalScore = prev.score + 5000;
              const nextHighScore = Math.max(prev.highScore, currentFinalScore);
              localStorage.setItem('highScore_carriere', nextHighScore.toString());
              return {
                ...prev,
                isPlaying: false,
                phase: 16,
                isBerserk: false,
                highScore: nextHighScore,
                score: currentFinalScore,
              };
            });
            showDialogue(GAME_MESSAGES.win, 8000);
          } else {
            // Trigger next phase
            setGameState((prev) => ({
              ...prev,
              phase: nextPhase,
            }));
          }
        }

        // --- LEVEL MESSAGES CHECK ---
        let activeLevelMessage: string | null = null;
        for (const msg of mapData.messages || []) {
          if (player.z <= msg.absoluteStartZ && player.z > msg.absoluteEndZ) {
            activeLevelMessage = msg.text;
            break;
          }
        }
        
        if (activeLevelMessage !== currentLevelMessageCalculated) {
          currentLevelMessageCalculated = activeLevelMessage;
          setLevelMessage(activeLevelMessage);
        }
      }

      // --- CAMÉRA DYNAMICS AND INTERPOLATION ---
      const insideBuilding = activeBuildingStatus === 'inside';
      targetCamX = player.x * 0.55;
      targetCamY = 250;
      targetCamZ = 430;

      // Soft lerp logic
      currentCamX += (targetCamX - currentCamX) * 0.08;
      currentCamY += (targetCamY - currentCamY) * 0.08;
      currentCamZ += (targetCamZ - currentCamZ) * 0.08;

      camera.position.x = currentCamX;
      camera.position.y = player.y + currentCamY;
      camera.position.z = player.z + currentCamZ;

      // Focus direction ahead of player
      camera.lookAt(player.x * 0.3, player.y + 70, player.z - 750);

      // Light following
      dirLight.position.set(player.x + 200, 600, player.z + 300);

      // Adjust environment color if indoor
      if (insideBuilding) {
        scene.background = new THREE.Color(COLOR_INDOOR);
        scene.fog = new THREE.Fog(COLOR_INDOOR, 1000, 15000);
      } else {
        scene.background = new THREE.Color(COLOR_SKY);
        scene.fog = new THREE.Fog(COLOR_SKY, 1000, 15000);
      }

      renderer.render(scene, camera);
    }

    // Run first tick
    tick();

    // Resize handler
    const handleResize = () => {
      if (!canvasRef.current) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    // Keyboard Input Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = true;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        keysRef.current.jump = true;
        // Prevent browser page scrolling
        e.preventDefault();
      }
      if (e.code === 'KeyX' || e.code === 'Enter') {
        keysRef.current.shoot = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.hasAttribute('contenteditable')
      ) {
        return;
      }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') keysRef.current.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') keysRef.current.right = false;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') keysRef.current.jump = false;
      if (e.code === 'KeyX' || e.code === 'Enter') keysRef.current.shoot = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup logic when state triggers reset or unmounts
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      player.cleanup();
      schoolsList.forEach((s) => s.cleanup());
      itemsList.forEach((item) => item.cleanup());
      sceneryTrees.forEach((tree) => scene.remove(tree));
    };
  }, [gameState.isPlaying, gameState.lives === 0]);

  // Synchronize audio with death
  useEffect(() => {
    if (gameState.lives <= 0 && gameState.isPlaying) {
      audio.playGameOver();
      setGameState((prev) => ({
        ...prev,
        isPlaying: false,
      }));
    }
  }, [gameState.lives, gameState.isPlaying]);

  return (
    <div ref={containerRef} className="w-full h-[100dvh] bg-[#6366f1] overflow-hidden flex flex-col font-mono select-none relative">
      {/* Saturated retro sky background layer in "Vibrant Palette" */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#4facfe] to-[#00f2fe] opacity-90 z-0"></div>

      {/* Primary 3D WebGL Canvas */}
      <div className="absolute inset-0 z-10">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* Red damage vignette filter */}
      <div
        id="damageOverlay"
        className="absolute inset-0 bg-red-600 opacity-0 pointer-events-none transition-opacity duration-100 z-20"
      />

      {/* Dynamic Overlay HUD matching the Vibrant Palette theme */}
      <GameUI
        gameState={gameState}
        dialogue={dialogue}
        levelMessage={levelMessage}
        onStartGame={handleStartGame}
        onRestartGame={handleRestartGame}
        isPregnant={gameState.isPregnant}
        condonCaught={gameState.condonCaught}
        onPressLeft={handlePressLeft}
        onPressRight={handlePressRight}
        onPressJump={handlePressJump}
        onPressShoot={handlePressShoot}
        onOpenEditor={() => setIsEditorOpen(true)}
      />

      {isEditorOpen && <LevelEditor onClose={() => setIsEditorOpen(false)} />}
    </div>
  );
}

