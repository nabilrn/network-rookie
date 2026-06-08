import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import './Component360Viewer.css';

export type Component360Type = 'data-center' | 'satellite' | 'fiber';

type Component360Scene = {
  type: Component360Type;
  title: string;
  eyebrow: string;
  image: string;
  description: string;
};

const assetUrl = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;

const SCENES: Record<Component360Type, Component360Scene> = {
  'data-center': {
    type: 'data-center',
    title: 'Data Center 360',
    eyebrow: 'Cloud infrastructure',
    image: assetUrl('asset/360/data_center.png'),
    description: 'Explore the room where servers, power, cooling, and network equipment keep applications online.',
  },
  satellite: {
    type: 'satellite',
    title: 'Satellite Link 360',
    eyebrow: 'Low-earth orbit relay',
    image: assetUrl('asset/360/spacex_satelite.png'),
    description: 'Look around a satellite network view where orbital relays connect remote users back to ground gateways.',
  },
  fiber: {
    type: 'fiber',
    title: 'Fiber Optic 360',
    eyebrow: 'Backbone cable route',
    image: assetUrl('asset/360/sea_fiber.png'),
    description: 'Inspect how fiber optic cable carries internet data as light across land and undersea backbone routes.',
  },
};

interface Component360ViewerProps {
  initialScene: Component360Type;
  onClose: () => void;
}

export function Component360Viewer({ initialScene, onClose }: Component360ViewerProps) {
  const [activeType, setActiveType] = useState<Component360Type>(initialScene);
  const [yaw, setYaw] = useState(50);
  const [pitch, setPitch] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0, yaw: 50, pitch: 50 });

  const scene = SCENES[activeType];
  const backgroundSize = useMemo(() => `${260 / zoom}% ${170 / zoom}%`, [zoom]);

  useEffect(() => {
    setActiveType(initialScene);
    setYaw(50);
    setPitch(50);
    setZoom(1);
  }, [initialScene]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const clampPitch = (value: number) => Math.min(78, Math.max(22, value));
  const clampZoom = (value: number) => Math.min(1.9, Math.max(0.8, value));

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      yaw,
      pitch,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setYaw((dragRef.current.yaw - dx * 0.08 + 100) % 100);
    setPitch(clampPitch(dragRef.current.pitch + dy * 0.08));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setYaw(50);
    setPitch(50);
    setZoom(1);
    setAutoRotate(true);
  };

  return (
    <div className="viewer360-shell" role="dialog" aria-modal="true" aria-label={scene.title}>
      <div className="viewer360-stage">
        <div
          className="viewer360-panorama"
          style={{
            backgroundImage: `url('${scene.image}')`,
            backgroundPosition: `${yaw}% ${pitch}%`,
            backgroundSize,
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={(event) => {
            event.preventDefault();
            setZoom((current) => clampZoom(current - event.deltaY * 0.001));
          }}
        >
          <div className="viewer360-vignette" />
        </div>

        <div className="viewer360-header">
          <div>
            <div className="viewer360-eyebrow">{scene.eyebrow}</div>
            <h2>{scene.title}</h2>
          </div>
          <button type="button" className="viewer360-icon-btn" onClick={onClose} aria-label="Close 360 viewer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="viewer360-info">
          <span className="viewer360-look-label">Drag to look around</span>
          <p>{scene.description}</p>
        </div>

        <div className="viewer360-tabs" aria-label="360 scene selector">
          {Object.values(SCENES).map((item) => (
            <button
              key={item.type}
              type="button"
              className={item.type === activeType ? 'is-active' : ''}
              onClick={() => {
                setActiveType(item.type);
                resetView();
              }}
            >
              {item.type === 'data-center' ? 'Data center' : item.type === 'satellite' ? 'Satellite' : 'Fiber optic'}
            </button>
          ))}
        </div>

        <div className="viewer360-controls">
          <button type="button" className="viewer360-icon-btn" onClick={() => setZoom((value) => clampZoom(value - 0.12))} aria-label="Zoom out">
            <ZoomOut size={18} aria-hidden="true" />
          </button>
          <input
            type="range"
            min="0.8"
            max="1.9"
            step="0.01"
            value={zoom}
            onChange={(event) => {
              setZoom(Number(event.target.value));
            }}
            aria-label="360 zoom level"
          />
          <button type="button" className="viewer360-icon-btn" onClick={() => setZoom((value) => clampZoom(value + 0.12))} aria-label="Zoom in">
            <ZoomIn size={18} aria-hidden="true" />
          </button>
          <button type="button" className="viewer360-icon-btn" onClick={resetView} aria-label="Reset 360 view">
            <RotateCcw size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
