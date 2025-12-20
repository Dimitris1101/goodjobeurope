"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    // renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff, 1);

    // scene / camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      100
    );
    camera.position.set(0, 0, 10);

    // plane + shader
    const geometry = new THREE.PlaneGeometry(30, 12);
    const uniforms = {
      uTime: { value: 0.0 },
      uResolution: {
        value: new THREE.Vector2(window.innerWidth, window.innerHeight),
      },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        precision mediump float;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        #define PI2 6.28318530718
        #define MAX_ITER 5
        uniform float uTime;
        uniform vec2 uResolution;

        void main() {
          float t = uTime * .12;
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          vec2 p = mod(uv * PI2, PI2) - 100.0;
          vec2 i = p;
          float c = 0.5;
          float inten = .0094;

          for (int n = 0; n < MAX_ITER; n++) {
            float tt = t * (4.5 - (2.2 / float(n + 122)));
            i = p + vec2(
              cos(tt - i.x) + sin(tt + i.y),
              sin(tt - i.y) + cos(tt + i.x)
            );
            c += 1.0 / length(vec2(
              p.x / (sin(i.x + tt) / inten + 1.0),
              p.y / (cos(i.y + tt) / inten)
            ));
          }

          c /= float(MAX_ITER);
          c = 1.10 - pow(c, 1.26);
          vec3 colour = vec3(0.098, 0.098, .098 + pow(abs(c), 4.1));
          gl_FragColor = vec4(colour, 1.0);
        }
      `,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const clock = new THREE.Clock();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener("resize", onResize);

    const animate = () => {
      uniforms.uTime.value = clock.getElapsedTime();
      rafRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="glslCanvas pointer-events-none fixed inset-0 -z-10 h-full w-full"
      aria-hidden="true"
    />
  );
}