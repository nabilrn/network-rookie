import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STATE } from './GlobeSection';
import { CITIES, CONNS } from '../data/network';

interface PacketDotsProps {
  globeRef: React.RefObject<any>;
}

interface Packet {
  arcIndex: number;
  progress: number;
  speed: number;
  stopPoint?: number;
  stalledTicks: number;
  releaseAfter: number;
  direction?: 1 | -1;
}

const MAX_PACKET_ARCS = 42;
const MAX_PACKET_ARCS_HIGH_LOAD = 58;
const ARC_DOT_ALTITUDE = 0.28;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const getRetryProgressForArc = (arcIndex: number): number =>
  0.44 + ((arcIndex * 17) % 18) / 100;

export function PacketDots({ globeRef }: PacketDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const packetsRef = useRef<Packet[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const getPacketSpeed = (): number => {
    if (STATE.simulationMode === 'high-load') return 0.004;
    if (STATE.simulationMode === 'packet-loss') return 0.0048;
    return 0.003;
  };

  // Build a string signature of current simulation state — used to detect changes
  const getStateSignature = (): string =>
    `${STATE.simulationMode}|${STATE.selectedArc ?? 'none'}`;

  const getPacketArcIndices = (): number[] => {
    const totalArcs = CONNS.length;
    if (totalArcs <= 0) return [];

    if (STATE.simulationMode !== 'normal' && STATE.selectedArc !== null) {
      return STATE.selectedArc >= 0 && STATE.selectedArc < totalArcs ? [STATE.selectedArc] : [];
    }

    const cap = STATE.simulationMode === 'high-load' ? MAX_PACKET_ARCS_HIGH_LOAD : MAX_PACKET_ARCS;
    if (totalArcs <= cap) {
      return Array.from({ length: totalArcs }, (_, index) => index);
    }

    const step = totalArcs / cap;
    const selected = new Set<number>();
    for (let i = 0; i < cap; i += 1) {
      selected.add(Math.floor(i * step));
    }
    return Array.from(selected).sort((a, b) => a - b);
  };

  const createPackets = (arcIndices: number[]): Packet[] => {
    const packets: Packet[] = [];
    const focusedSimulation = STATE.simulationMode !== 'normal' && STATE.selectedArc !== null;
    const retryProgress =
      STATE.simulationMode === 'packet-loss' && STATE.selectedArc !== null
        ? getRetryProgressForArc(STATE.selectedArc)
        : null;

    arcIndices.forEach((arcIndex) => {
      let numDots = 1;
      if (focusedSimulation) {
        if (STATE.simulationMode === 'high-load') numDots = 18;
        else if (STATE.simulationMode === 'packet-loss') numDots = 4;
        else if (STATE.simulationMode === 'cable-cut') numDots = 12;
      } else if (STATE.simulationMode === 'high-load') {
        numDots = 2;
      }

      for (let i = 0; i < numDots; i += 1) {
        const isFromCityB = i % 2 !== 0;
        const clusteredProgress =
          focusedSimulation && STATE.simulationMode === 'high-load'
            ? Math.min(1, Math.max(0, (i / numDots) * 0.35 + (Math.random() - 0.5) * 0.04))
            : i / numDots;
            
        const cableCutStop =
          focusedSimulation && STATE.simulationMode === 'cable-cut'
            ? clamp((isFromCityB ? 0.8 : 0.2) + (Math.random() - 0.5) * 0.03, 0.1, 0.9)
            : undefined;

        let initialProgress = clusteredProgress;
        if (STATE.simulationMode === 'packet-loss' && focusedSimulation) {
           initialProgress = Math.random();
        } else if (STATE.simulationMode === 'cable-cut' && focusedSimulation) {
           initialProgress = isFromCityB ? 1.0 - Math.random() * 0.2 : Math.random() * 0.2;
        }

        packets.push({
          arcIndex,
          progress: initialProgress,
          speed: getPacketSpeed(),
          direction: (focusedSimulation && STATE.simulationMode === 'cable-cut' && isFromCityB) ? -1 : 1,
          stopPoint:
            STATE.simulationMode === 'packet-loss' &&
            focusedSimulation &&
            retryProgress !== null
              ? clamp(retryProgress + ((i % 3) - 1) * 0.015, 0.22, 0.86)
              : cableCutStop,
          stalledTicks: 0,
          releaseAfter: 16 + Math.floor(Math.random() * 24),
        });
      }
    });

    return packets;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let waitingFrame: number | undefined;
    let tearDown: (() => void) | null = null;
    let pulseClock = 0;

    const initializeWhenReady = () => {
      if (!globeRef.current) {
        waitingFrame = requestAnimationFrame(initializeWhenReady);
        return;
      }

      const updateCanvasSize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      };
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);

      packetsRef.current = createPackets(getPacketArcIndices());

      const latLngToVector = (lat: number, lng: number, radius: number): THREE.Vector3 => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (90 - lng) * (Math.PI / 180);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        return new THREE.Vector3(x, y, z);
      };

      const worldToScreen = (worldPos: THREE.Vector3): { x: number; y: number } | null => {
        if (!globeRef.current) return null;

        try {
          const globe = globeRef.current;
          const camera = globe.camera();
          if (!camera) return null;
          const projected = worldPos.clone().project(camera);

          const rect = canvas.getBoundingClientRect();
          const screenX = (projected.x + 1) * rect.width / 2;
          const screenY = (-projected.y + 1) * rect.height / 2;

          const cameraPos = new THREE.Vector3();
          camera.getWorldPosition(cameraPos);
          if (worldPos.dot(cameraPos) < 0) return null;

          if (projected.z > 1 || projected.z < -1) return null;
          return { x: screenX, y: screenY };
        } catch {
          return null;
        }
      };

      const interpolateArcVector = (
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number,
        progress: number,
        arcAltitude = ARC_DOT_ALTITUDE,
      ): THREE.Vector3 => {
        const globeRadius = globeRef.current?.getGlobeRadius?.() ?? 100;
        const start = latLngToVector(lat1, lng1, globeRadius);
        const end = latLngToVector(lat2, lng2, globeRadius);
        const startDir = start.clone().normalize();
        const endDir = end.clone().normalize();

        const omega = Math.acos(clamp(startDir.dot(endDir), -1, 1));
        if (omega === 0) return start;

        const sinOmega = Math.sin(omega);
        const startWeight = Math.sin((1 - progress) * omega) / sinOmega;
        const endWeight = Math.sin(progress * omega) / sinOmega;

        const direction = startDir
          .multiplyScalar(startWeight)
          .add(endDir.multiplyScalar(endWeight))
          .normalize();
        const lift = 1 + Math.max(0, arcAltitude) * Math.sin(Math.PI * progress);
        return direction.multiplyScalar(globeRadius * lift);
      };

      const getRouteCities = (arcIndex: number) => {
        const conn = CONNS[arcIndex];
        if (!conn) return null;
        let [startIdx, endIdx] = conn;
        if (STATE.scenarioRoute && STATE.selectedArc === arcIndex) {
          const fromIdx = CITIES.findIndex((city) => city.id === STATE.scenarioRoute?.fromId);
          const toIdx = CITIES.findIndex((city) => city.id === STATE.scenarioRoute?.toId);
          if (fromIdx >= 0 && toIdx >= 0 && fromIdx !== toIdx) {
            startIdx = fromIdx;
            endIdx = toIdx;
          }
        }
        return {
          startCity: CITIES[startIdx],
          endCity: CITIES[endIdx],
        };
      };

      const drawRetryMarker = () => {
        if (STATE.simulationMode !== 'packet-loss' || STATE.selectedArc === null) return;
        const selectedArcConn = CONNS[STATE.selectedArc];
        if (!selectedArcConn) return;
        const routeCities = getRouteCities(STATE.selectedArc);
        if (!routeCities) return;
        const { startCity, endCity } = routeCities;
        const retryProgress = getRetryProgressForArc(STATE.selectedArc);
        const arcAltitude = STATE.simulationMode !== 'normal' ? 0 : ARC_DOT_ALTITUDE;
        const markerPos = interpolateArcVector(
          startCity.lat,
          startCity.lng,
          endCity.lat,
          endCity.lng,
          retryProgress,
          arcAltitude,
        );
        const markerScreen = worldToScreen(markerPos);
        if (!markerScreen) return;

        const ringPulse = 6.2 + Math.sin(pulseClock * 0.12) * 1.8;
        ctx.beginPath();
        ctx.arc(markerScreen.x, markerScreen.y, ringPulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(252, 165, 165, 0.7)';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#fff1f2';
        ctx.font = 'bold 16px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↺', markerScreen.x, markerScreen.y);
      };

      const animate = () => {
        if (!canvasRef.current) return;
        pulseClock += 1;

        const rect = canvasRef.current.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        const focusedSimulation = STATE.simulationMode !== 'normal' && STATE.selectedArc !== null;
        const dotSize = focusedSimulation
          ? 3.4
          : STATE.simulationMode === 'high-load'
            ? 2.8
            : 2.4;
        const dotColor = focusedSimulation
          ? '#38bdf8'
          : STATE.simulationMode === 'high-load'
            ? '#fbbf24'
            : STATE.simulationMode === 'packet-loss'
              ? '#f87171'
              : '#38bdf8';

        // ─── FAST STATE SYNC (checked every frame, not just every 220ms) ───
        const currentSig = getStateSignature();
        if (currentSig !== (animate as any)._lastSig) {
          (animate as any)._lastSig = currentSig;
          packetsRef.current = createPackets(getPacketArcIndices());
          console.log('[PacketDots] state change', {
            mode: STATE.simulationMode,
            selectedArc: STATE.selectedArc,
            scenarioRoute: STATE.scenarioRoute,
          });
          if (STATE.selectedArc !== null) {
            const routeCities = getRouteCities(STATE.selectedArc);
            if (routeCities) {
              console.log('[PacketDots] arc endpoints', {
                startLat: routeCities.startCity.lat,
                startLng: routeCities.startCity.lng,
                endLat: routeCities.endCity.lat,
                endLng: routeCities.endCity.lng,
              });
            }
          }
        }
        // ──────────────────────────────────────────────────────────────────

        packetsRef.current.forEach((packet) => {
          const selectedArc = STATE.selectedArc;
          const focusedSimulation = STATE.simulationMode !== 'normal' && selectedArc !== null;
          const arcAltitude = focusedSimulation ? 0 : ARC_DOT_ALTITUDE;
          packet.speed = getPacketSpeed();

          if (focusedSimulation && selectedArc !== packet.arcIndex) return;
          const routeCities = getRouteCities(packet.arcIndex);
          if (!routeCities) return;
          const { startCity, endCity } = routeCities;

          const pos = interpolateArcVector(
            startCity.lat,
            startCity.lng,
            endCity.lat,
            endCity.lng,
            packet.progress,
            arcAltitude,
          );
          const screenPos = worldToScreen(pos);

          if (screenPos) {
            const stallBoost =
              packet.stalledTicks > 0
                ? 0.82 + (Math.sin(pulseClock * 0.22 + packet.progress * 20) + 1) * 0.25
                : 0.72 + (Math.sin(packet.progress * Math.PI * 2) + 1) * 0.16;
            ctx.fillStyle = dotColor;
            ctx.globalAlpha = stallBoost;
            ctx.shadowColor = dotColor;
            ctx.shadowBlur = focusedSimulation ? 14 : packet.stalledTicks > 0 ? 11 : 8;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, dotSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }

          if (
            STATE.simulationMode === 'packet-loss' &&
            selectedArc !== null &&
            packet.arcIndex === selectedArc &&
            packet.stopPoint !== undefined
          ) {
            if (packet.progress >= packet.stopPoint) {
              packet.progress = packet.stopPoint;
              packet.stalledTicks += 1;
              if (packet.stalledTicks > packet.releaseAfter) {
                packet.stalledTicks = 0;
                if (Math.random() < 0.5) {
                  packet.progress = 0;
                  packet.stopPoint = clamp(
                    getRetryProgressForArc(packet.arcIndex) + (Math.random() - 0.5) * 0.05,
                    0.22,
                    0.86,
                  );
                } else {
                  packet.stopPoint = undefined;
                }
                packet.releaseAfter = 16 + Math.floor(Math.random() * 24);
              }
            } else {
              packet.progress += packet.speed;
            }
          } else if (
            STATE.simulationMode === 'cable-cut' &&
            selectedArc !== null &&
            packet.arcIndex === selectedArc &&
            packet.stopPoint !== undefined
          ) {
            const dir = packet.direction || 1;
            if ((dir === 1 && packet.progress >= packet.stopPoint) || (dir === -1 && packet.progress <= packet.stopPoint)) {
              packet.progress = packet.stopPoint;
              packet.stalledTicks += 1;
              if (packet.stalledTicks > 10) {
                packet.stalledTicks = 0;
                packet.progress = dir === 1 ? 0 : 1; // Reset to source city
              }
            } else {
              packet.progress += packet.speed * 0.8 * dir;
            }
          } else {
            const jammedSimulation = focusedSimulation && STATE.simulationMode === 'high-load';
            const jitter = jammedSimulation
              ? (Math.sin(pulseClock * 0.25 + packet.progress * 40) + 1) * 0.0009
              : 0;
            const stallChance = jammedSimulation && Math.random() < 0.03;
            if (stallChance) {
              packet.stalledTicks += 1;
              if (packet.stalledTicks > 6) {
                packet.progress = Math.min(1, packet.progress + packet.speed * 0.6);
                packet.stalledTicks = 0;
              }
            } else {
              packet.progress += packet.speed * (jammedSimulation ? 0.65 : 1) + jitter;
              packet.stalledTicks = 0;
            }
          }

          if (packet.progress >= 1 || packet.progress <= 0) {
            packet.progress = packet.direction === -1 ? 1 : 0;
            packet.stalledTicks = 0;
            if (STATE.simulationMode === 'packet-loss' && selectedArc !== null && packet.arcIndex === selectedArc) {
              packet.stopPoint = clamp(
                getRetryProgressForArc(packet.arcIndex) + (Math.random() - 0.5) * 0.05,
                0.22,
                0.86,
              );
            }
          }
        });

        drawRetryMarker();
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      animate();

      tearDown = () => {
        window.removeEventListener('resize', updateCanvasSize);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    };

    initializeWhenReady();

    return () => {
      if (waitingFrame) {
        cancelAnimationFrame(waitingFrame);
      }
      tearDown?.();
    };
  }, [globeRef]);

  useEffect(() => {
    let lastSignature = '';
    const syncPackets = () => {
      const signature = `${STATE.simulationMode}|${STATE.selectedArc ?? 'none'}`;
      if (signature !== lastSignature) {
        lastSignature = signature;
        packetsRef.current = createPackets(getPacketArcIndices());
        return;
      }
      const speed = getPacketSpeed();
      packetsRef.current.forEach((packet) => {
        packet.speed = speed;
      });
    };

    syncPackets();
    const interval = window.setInterval(syncPackets, 500);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
