import React, { useEffect, useRef } from 'react';
import { PlayerState, Obstacle, Team } from '../types/game';
import { CAR_SPECS } from '../data/cars';
import { sounds } from '../utils/audio';

interface RaceCanvasProps {
  players: Record<string, PlayerState>;
  obstacles: Obstacle[];
  trackLength: number;
  localPlayerId: string;
  countdown: number;
  status: string;
  onBump?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export const RaceCanvas: React.FC<RaceCanvasProps> = ({
  players,
  obstacles,
  trackLength,
  localPlayerId,
  countdown,
  status
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const cameraDistRef = useRef<number>(0);

  // Update engine pitch according to local player's speed
  useEffect(() => {
    const local = players[localPlayerId];
    if (local && status === 'RACING') {
      sounds.startEngine();
      sounds.updateEnginePitch(local.speed, local.nitroActive);
    } else {
      sounds.stopEngine();
    }
  }, [players, localPlayerId, status]);

  // Audio countdown cue
  useEffect(() => {
    if (status === 'COUNTDOWN') {
      sounds.playCountdown(countdown);
    }
  }, [countdown, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const render = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      const dpr = window.devicePixelRatio || 1;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Smooth camera follow
      const local = players[localPlayerId];
      const targetDist = local ? local.distance : 0;
      // Camera smoothly lags slightly behind car distance
      cameraDistRef.current += (targetDist - cameraDistRef.current) * Math.min(dt * 12, 1);
      const camY = cameraDistRef.current;

      // Clear Canvas Background (Dark asphalt highway aesthetic)
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, width, height);

      // Road geometry: Centered highway on screen
      // Road width is responsive, takes ~70% on desktop, ~88% on mobile
      const roadWidth = Math.min(width * 0.76, 540);
      const roadLeft = (width - roadWidth) / 2;
      const roadRight = roadLeft + roadWidth;
      const roadCenterX = width / 2;

      // Scale: 1 meter of track = pixelsPerMeter
      const pixelsPerMeter = height / 70; // show ~70m of track ahead and behind
      // Car is positioned roughly at 72% from the top (bottom third)
      const carScreenY = height * 0.72;

      // Convert track distance (m) to screen Y:
      const worldDistToScreenY = (dist: number) => {
        return carScreenY - (dist - camY) * pixelsPerMeter;
      };

      // 1. Off-road terrain and shoulders
      ctx.fillStyle = '#060911';
      ctx.fillRect(0, 0, roadLeft, height);
      ctx.fillRect(roadRight, 0, width - roadRight, height);

      // Shoulder gravel strip
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(roadLeft - 14, 0, 14, height);
      ctx.fillRect(roadRight, 0, 14, height);

      // Guardrail barriers with metallic highlights
      ctx.fillStyle = '#334155';
      ctx.fillRect(roadLeft - 18, 0, 4, height);
      ctx.fillRect(roadRight + 14, 0, 4, height);

      // Road surface (dark asphalt with subtle gradient)
      const roadGrad = ctx.createLinearGradient(roadLeft, 0, roadRight, 0);
      roadGrad.addColorStop(0, '#111827');
      roadGrad.addColorStop(0.5, '#161f30');
      roadGrad.addColorStop(1, '#111827');
      ctx.fillStyle = roadGrad;
      ctx.fillRect(roadLeft, 0, roadWidth, height);

      // Road edge line stripes (Red & White kerb markings)
      const kerbSegmentLen = 24;
      const kerbScrollOffset = (camY * pixelsPerMeter) % (kerbSegmentLen * 2);
      for (let y = -kerbSegmentLen * 2; y < height + kerbSegmentLen * 2; y += kerbSegmentLen) {
        const drawY = y + kerbScrollOffset;
        const isRed = Math.floor((drawY - kerbScrollOffset) / kerbSegmentLen) % 2 === 0;
        ctx.fillStyle = isRed ? '#ef4444' : '#f8fafc';
        ctx.fillRect(roadLeft - 6, drawY, 6, kerbSegmentLen);
        ctx.fillRect(roadRight, drawY, 6, kerbSegmentLen);
      }

      // Center dual-lane dashed lines (Single way road with 2 racing lanes)
      const dashLen = 30;
      const gapLen = 22;
      const totalDash = dashLen + gapLen;
      const dashScroll = (camY * pixelsPerMeter) % totalDash;

      ctx.fillStyle = '#e2e8f0';
      for (let y = -totalDash; y < height + totalDash; y += totalDash) {
        ctx.fillRect(roadCenterX - 2.5, y + dashScroll, 5, dashLen);
      }

      // Track Distance Markers & Checkered Finish Line
      for (let m = 200; m <= trackLength; m += 200) {
        const markerY = worldDistToScreenY(m);
        if (markerY > -60 && markerY < height + 60) {
          if (m === trackLength) {
            // Checkered Finish Line Banner!
            const checkSize = 16;
            for (let cx = roadLeft; cx < roadRight; cx += checkSize) {
              for (let cy = markerY - 24; cy < markerY + 24; cy += checkSize) {
                const isBlack = (Math.floor(cx / checkSize) + Math.floor(cy / checkSize)) % 2 === 0;
                ctx.fillStyle = isBlack ? '#0f172a' : '#ffffff';
                ctx.fillRect(cx, cy, checkSize, checkSize);
              }
            }
            // Finish Banner Text
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 20px "Outfit", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏁 FINISH LINE 🏁', roadCenterX, markerY - 32);
          } else {
            // Distance marker stripe
            ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.fillRect(roadLeft, markerY - 2, roadWidth, 4);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '600 12px "JetBrains Mono", monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${m}m`, roadLeft + 12, markerY - 6);
            ctx.textAlign = 'right';
            ctx.fillText(`${m}m`, roadRight - 12, markerY - 6);
          }
        }
      }

      // Roadside Neon Light Poles scrolling past
      const lampInterval = 120;
      const lampScroll = (camY * pixelsPerMeter) % lampInterval;
      for (let y = -lampInterval; y < height + lampInterval; y += lampInterval) {
        const lampY = y + lampScroll;
        // Left lamp
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(roadLeft - 28, lampY, 3, 0, Math.PI * 2);
        ctx.fill();
        // Right lamp
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(roadRight + 28, lampY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Render Obstacles
      for (const obs of obstacles) {
        const obsY = worldDistToScreenY(obs.distance);
        if (obsY < -50 || obsY > height + 50) continue;

        const obsX = roadCenterX + obs.laneOffset * (roadWidth / 2 - 40);

        if (obs.type === 'oil') {
          // Oil puddle with slick sheen
          ctx.save();
          ctx.translate(obsX, obsY);
          ctx.fillStyle = '#05070a';
          ctx.beginPath();
          ctx.ellipse(0, 0, 26, 16, 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Slick highlight
          ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Oil icon/warning
          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚠️', 0, -1);
          ctx.restore();
        } else if (obs.type === 'boost') {
          // Speed Turbo Pad
          ctx.save();
          ctx.translate(obsX, obsY);
          // Glowing Chevron pad
          ctx.fillStyle = 'rgba(234, 179, 8, 0.25)';
          ctx.fillRect(-22, -18, 44, 36);

          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-16, 10);
          ctx.lineTo(0, -6);
          ctx.lineTo(16, 10);

          ctx.moveTo(-16, 2);
          ctx.lineTo(0, -14);
          ctx.lineTo(16, 2);
          ctx.stroke();

          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 10px "Outfit", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('BOOST', 0, 16);
          ctx.restore();
        } else if (obs.type === 'nitro_pickup') {
          // Nitro Refill Canister
          ctx.save();
          ctx.translate(obsX, obsY);
          const pulse = Math.sin(now * 0.008) * 3;

          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(-10, -14, 20, 28);
          ctx.fillStyle = '#22d3ee';
          ctx.fillRect(-6, -18, 12, 4);

          ctx.strokeStyle = '#a5f3fc';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 18 + pulse, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('N₂O', 0, 4);
          ctx.restore();
        }
      }

      // 3. Render Particles (nitro fire, sparks, exhaust)
      const activeParticles = particlesRef.current;
      for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.life -= dt;
        if (p.life <= 0) {
          activeParticles.splice(i, 1);
          continue;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 4. Render All Racers (Cars)
      const allPlayers = Object.values(players);
      // Sort by distance so car further back draws first, car ahead draws in front
      allPlayers.sort((a, b) => a.distance - b.distance);

      for (const player of allPlayers) {
        const carY = worldDistToScreenY(player.distance);
        // Calculate screen X based on laneOffset (-1 to 1)
        const carX = roadCenterX + player.laneOffset * (roadWidth / 2 - 40);

        const isLocal = player.id === localPlayerId;
        const spec = CAR_SPECS.find(c => c.id === player.carSpecId) || CAR_SPECS[0];

        // Particle generation for nitro and engine exhaust
        if (status === 'RACING' && player.speed > 10) {
          if (player.nitroActive) {
            // Blue/Orange roaring nitro flames
            for (let k = 0; k < 3; k++) {
              activeParticles.push({
                x: carX + (Math.random() * 12 - 6),
                y: carY + 34,
                vx: (Math.random() - 0.5) * 20,
                vy: (player.speed * 1.5) + Math.random() * 60,
                color: Math.random() > 0.4 ? '#38bdf8' : '#f97316',
                size: Math.random() * 4 + 2,
                life: 0.25,
                maxLife: 0.25
              });
            }
          } else {
            // Normal tire/exhaust puffs
            if (Math.random() > 0.6) {
              activeParticles.push({
                x: carX + (Math.random() * 14 - 7),
                y: carY + 32,
                vx: (Math.random() - 0.5) * 15,
                vy: 40 + Math.random() * 20,
                color: 'rgba(148, 163, 184, 0.4)',
                size: Math.random() * 3 + 1,
                life: 0.3,
                maxLife: 0.3
              });
            }
          }

          // Spin effect on oil
          if (player.spinTimer > 0) {
            for (let k = 0; k < 2; k++) {
              activeParticles.push({
                x: carX + (Math.random() * 20 - 10),
                y: carY + (Math.random() * 20 - 10),
                vx: (Math.random() - 0.5) * 60,
                vy: (Math.random() - 0.5) * 60,
                color: 'rgba(234, 179, 8, 0.7)',
                size: Math.random() * 2 + 1,
                life: 0.2,
                maxLife: 0.2
              });
            }
          }
        }

        // Draw Slipstream / Draft Effect behind lead car
        if (player.drafting) {
          ctx.save();
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(carX - 16, carY + 36);
          ctx.lineTo(carX - 14, carY + 70);
          ctx.moveTo(carX + 16, carY + 36);
          ctx.lineTo(carX + 14, carY + 70);
          ctx.stroke();
          ctx.restore();
        }

        // Draw the Car
        ctx.save();
        ctx.translate(carX, carY);

        // Spin rotation if in oil
        if (player.spinTimer > 0) {
          const spinAngle = (player.spinTimer * 12) % (Math.PI * 2);
          ctx.rotate(spinAngle);
        }

        // Shadow under car
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 18, 34, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wheels / Tires
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-19, -24, 6, 14); // front left
        ctx.fillRect(13, -24, 6, 14);  // front right
        ctx.fillRect(-19, 14, 6, 16);  // rear left
        ctx.fillRect(13, 14, 6, 16);   // rear right

        // Rims highlight
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-18, -20, 2, 6);
        ctx.fillRect(16, -20, 2, 6);
        ctx.fillRect(-18, 19, 2, 6);
        ctx.fillRect(16, 19, 2, 6);

        // Car Body Base
        ctx.fillStyle = spec.primaryColor;
        ctx.beginPath();
        // Nose
        ctx.moveTo(0, -32);
        ctx.bezierCurveTo(-14, -30, -16, -18, -16, -8);
        // Cabin waist
        ctx.lineTo(-17, 18);
        // Rear spoiler
        ctx.lineTo(-16, 28);
        ctx.lineTo(16, 28);
        ctx.lineTo(17, 18);
        ctx.lineTo(16, -8);
        ctx.bezierCurveTo(16, -18, 14, -30, 0, -32);
        ctx.fill();

        // Accent Racing Stripe / Aero kit
        ctx.fillStyle = spec.accentColor;
        ctx.fillRect(-3, -31, 6, 58);

        // Windshield and Cockpit
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.moveTo(-10, -14);
        ctx.lineTo(10, -14);
        ctx.lineTo(12, 6);
        ctx.lineTo(-12, 6);
        ctx.closePath();
        ctx.fill();

        // Cockpit glass reflection
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, -11);
        ctx.lineTo(8, -11);
        ctx.stroke();

        // Headlights (glow beam forward)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-13, -30, 5, 3);
        ctx.fillRect(8, -30, 5, 3);

        // Headlight glow projection on road
        const lightGrad = ctx.createRadialGradient(0, -50, 4, 0, -50, 70);
        lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        lightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = lightGrad;
        ctx.beginPath();
        ctx.moveTo(-13, -30);
        ctx.lineTo(-28, -90);
        ctx.lineTo(28, -90);
        ctx.lineTo(13, -30);
        ctx.closePath();
        ctx.fill();

        // Taillights
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-14, 27, 6, 2);
        ctx.fillRect(8, 27, 6, 2);

        // Rear Spoiler Wing
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-18, 26, 36, 4);

        ctx.restore(); // end car draw

        // 5. Overhead Tags: Name, Distance, Team, Local Indicator
        ctx.save();
        ctx.textAlign = 'center';

        // Local indicator arrow
        if (isLocal) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.moveTo(carX, carY - 48);
          ctx.lineTo(carX - 6, carY - 56);
          ctx.lineTo(carX + 6, carY - 56);
          ctx.closePath();
          ctx.fill();
        }

        // Racer Name Pill
        ctx.font = '700 12px "Outfit", sans-serif';
        const teamColor = player.team === 'red' ? '#ef4444' : '#3b82f6';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        const textWidth = ctx.measureText(player.name).width;
        ctx.fillRect(carX - textWidth / 2 - 8, carY - 60, textWidth + 16, 18);

        ctx.fillStyle = teamColor;
        ctx.fillText(player.name, carX, carY - 46);

        // Floating Radio Message Bubble if recently sent
        if (player.lastRadioMessage && (now - player.lastRadioMessage.timestamp < 3500)) {
          const msg = player.lastRadioMessage.text;
          ctx.font = '600 11px "Outfit", sans-serif';
          const bubbleW = ctx.measureText(msg).width + 16;
          const bubbleY = carY - 84;

          ctx.fillStyle = '#1e293b';
          ctx.strokeStyle = teamColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(carX - bubbleW / 2, bubbleY, bubbleW, 22, 6);
          ctx.fill();
          ctx.stroke();

          // Bubble pointer
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(carX - 4, bubbleY + 22);
          ctx.lineTo(carX + 4, bubbleY + 22);
          ctx.lineTo(carX, bubbleY + 27);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#f8fafc';
          ctx.fillText(msg, carX, bubbleY + 15);
        }

        ctx.restore();
      }

      // 6. Countdown Overlay if active
      if (status === 'COUNTDOWN') {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 84px "Outfit", sans-serif';

        if (countdown > 0) {
          ctx.fillStyle = countdown === 3 ? '#ef4444' : countdown === 2 ? '#f59e0b' : '#10b981';
          ctx.fillText(`${countdown}`, width / 2, height / 2 - 20);
          ctx.font = '700 22px "Outfit", sans-serif';
          ctx.fillStyle = '#f8fafc';
          ctx.fillText('REV YOUR ENGINES!', width / 2, height / 2 + 50);
        } else {
          ctx.fillStyle = '#22c55e';
          ctx.fillText('GO!', width / 2, height / 2 - 20);
        }
        ctx.restore();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [players, obstacles, trackLength, localPlayerId, countdown, status]);

  return (
    <div className="relative w-full h-full min-h-[460px] flex items-center justify-center overflow-hidden bg-slate-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full block touch-none cursor-crosshair select-none"
      />
    </div>
  );
};
