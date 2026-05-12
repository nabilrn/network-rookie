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
  visible: boolean;
  vanishPoint?: number;
}

const MAX_PACKET_ARCS = 42;
const MAX_PACKET_ARCS_HIGH_LOAD = 58;

export function PacketDots({ globeRef }: PacketDotsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const packetsRef = useRef<Packet[]>([]);
  const animationFrameRef = useRef<number>();

  const getPacketArcIndices = (): number[] => {
    const totalArcs = CONNS.length;
    if (totalArcs <= 0) return [];
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

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let waitingFrame: number | undefined;
    let tearDown: (() => void) | null = null;

    const initializeWhenReady = () => {
      if (!globeRef.current) {
        waitingFrame = requestAnimationFrame(initializeWhenReady);
        return;
      }

      // Set canvas size
      const updateCanvasSize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      };
      updateCanvasSize();
      window.addEventListener('resize', updateCanvasSize);

      // Initialize packets for each arc
      const initializePackets = () => {
        const packets: Packet[] = [];
        getPacketArcIndices().forEach((arcIndex) => {
          const numDots = STATE.simulationMode === 'high-load' ? 2 : 1;
          for (let i = 0; i < numDots; i++) {
            packets.push({
              arcIndex,
              progress: i / numDots,
              speed: STATE.simulationMode === 'high-load' ? 0.006 : 0.003,
              visible: true,
              vanishPoint: STATE.simulationMode === 'packet-loss' ? 0.3 + Math.random() * 0.4 : undefined,
            });
          }
        });
        packetsRef.current = packets;
      };

      initializePackets();

      // Convert lat/lng to screen coordinates
      const latLngToScreen = (lat: number, lng: number): { x: number; y: number } | null => {
        if (!globeRef.current) return null;

        try {
          const globe = globeRef.current;
          const camera = globe.camera();

          if (!camera) return null;

          // Convert lat/lng to 3D Cartesian coordinates
          const phi = (90 - lat) * (Math.PI / 180);
          const theta = (lng + 180) * (Math.PI / 180);
          const radius = globe.getGlobeRadius() * 1.01; // Slight altitude above surface

          const x = -radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.cos(phi);
          const z = radius * Math.sin(phi) * Math.sin(theta);

          // Project to screen space
          const vector = new THREE.Vector3(x, y, z);
          vector.project(camera);

          const rect = canvas.getBoundingClientRect();
          const screenX = (vector.x + 1) * rect.width / 2;
          const screenY = (-vector.y + 1) * rect.height / 2;

          // Check if point is behind camera
          if (vector.z > 1) return null;

          return { x: screenX, y: screenY };
        } catch (error) {
          return null;
        }
      };

      // Interpolate along great circle
      const interpolateGreatCircle = (
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number,
        progress: number
      ): { lat: number; lng: number } => {
        const d2r = Math.PI / 180;
        const r2d = 180 / Math.PI;

        const φ1 = lat1 * d2r;
        const λ1 = lng1 * d2r;
        const φ2 = lat2 * d2r;
        const λ2 = lng2 * d2r;

        const d = 2 * Math.asin(
          Math.sqrt(
            Math.sin((φ2 - φ1) / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2
          )
        );

        const a = Math.sin((1 - progress) * d) / Math.sin(d);
        const b = Math.sin(progress * d) / Math.sin(d);

        const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
        const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
        const z = a * Math.sin(φ1) + b * Math.sin(φ2);

        const lat = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2)) * r2d;
        const lng = Math.atan2(y, x) * r2d;

        return { lat, lng };
      };

      // Animation loop
      const animate = () => {
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        const dotSize = 2.4;
        const baseDotOpacity = 0.8;
        const dotColor = '#38bdf8'; // Bright sky blue

        packetsRef.current.forEach(packet => {
          // Skip if cable cut mode and this is the selected arc
          if (STATE.simulationMode === 'cable-cut' && STATE.selectedArc === packet.arcIndex) {
            return;
          }

          // Check visibility for packet loss mode
          if (STATE.simulationMode === 'packet-loss' && packet.vanishPoint !== undefined) {
            const distanceFromVanish = Math.abs(packet.progress - packet.vanishPoint);
            if (distanceFromVanish < 0.05) {
              packet.visible = Math.random() > 0.5;
            }
          }

          if (!packet.visible && STATE.simulationMode === 'packet-loss') {
            packet.progress += packet.speed;
            if (packet.progress >= 1) packet.progress = 0;
            if (packet.progress < (packet.vanishPoint || 0.5) - 0.1) {
              packet.visible = true;
            }
            return;
          }

          const [startIdx, endIdx] = CONNS[packet.arcIndex];
          const startCity = CITIES[startIdx];
          const endCity = CITIES[endIdx];

          // Interpolate position
          const pos = interpolateGreatCircle(
            startCity.lat,
            startCity.lng,
            endCity.lat,
            endCity.lng,
            packet.progress
          );

          const screenPos = latLngToScreen(pos.lat, pos.lng);

          if (screenPos) {
            const pulse = 0.7 + (Math.sin(packet.progress * Math.PI * 2) + 1) * 0.18;
            ctx.fillStyle = dotColor;
            ctx.globalAlpha = baseDotOpacity * pulse;
            ctx.shadowColor = dotColor;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, dotSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;
          }

          // Update progress
          packet.progress += packet.speed;
          if (packet.progress >= 1) {
            packet.progress = 0;
            packet.visible = true;
            if (STATE.simulationMode === 'packet-loss') {
              packet.vanishPoint = 0.3 + Math.random() * 0.4;
            }
          }
        });

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

  // Reinitialize packets when simulation mode changes
  useEffect(() => {
    const interval = setInterval(() => {
      // Adjust speeds based on mode
      packetsRef.current.forEach(packet => {
        if (STATE.simulationMode === 'high-load') {
          packet.speed = 0.006;
        } else {
          packet.speed = 0.003;
        }
      });

      // Add more packets for high-load mode
      if (STATE.simulationMode === 'high-load' && packetsRef.current.length < MAX_PACKET_ARCS_HIGH_LOAD * 2) {
        getPacketArcIndices().forEach((arcIndex) => {
          const existingCount = packetsRef.current.filter(p => p.arcIndex === arcIndex).length;
          if (existingCount < 2) {
            packetsRef.current.push({
              arcIndex,
              progress: Math.random(),
              speed: 0.006,
              visible: true,
            });
          }
        });
      }
    }, 240);

    return () => clearInterval(interval);
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
