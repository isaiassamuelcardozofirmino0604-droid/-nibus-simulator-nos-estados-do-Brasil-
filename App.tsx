
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./style.css";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState(1);
  const [engineOn, setEngineOn] = useState(true);
  const [doorOpen, setDoorOpen] = useState(false);

  const controls = useRef({
    acceleration: false,
    braking: false,
    left: false,
    right: false,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 50, 250);

    const camera = new THREE.PerspectiveCamera(
      65,
      containerRef.current.clientWidth /
        containerRef.current.clientHeight,
      0.1,
      1000
    );

    camera.position.set(0, 4, 9);
    camera.lookAt(0, 1, -10);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, 2)
    );

    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );

    containerRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 2));

    const sunlight = new THREE.DirectionalLight(0xffffff, 2);
    sunlight.position.set(10, 20, 10);
    scene.add(sunlight);

    // Estrada
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 500),
      new THREE.MeshStandardMaterial({
        color: 0x333333,
      })
    );

    road.rotation.x = -Math.PI / 2;
    road.position.z = -150;
    road.position.y = 0;
    scene.add(road);

    // Faixas da estrada
    const markings: THREE.Mesh[] = [];

    for (let i = 0; i < 40; i++) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.03, 4),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
        })
      );

      line.position.set(0, 0.03, -i * 12);
      scene.add(line);
      markings.push(line);
    }

    // Grama
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 500),
      new THREE.MeshStandardMaterial({
        color: 0x398b36,
      })
    );

    grass.rotation.x = -Math.PI / 2;
    grass.position.set(0, -0.08, -150);
    scene.add(grass);

    // Ônibus
    const bus = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 3.1, 9),
      new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
      })
    );

    body.position.y = 2;
    bus.add(body);

    // Para-brisa
    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.9, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0x263c4d,
        metalness: 0.3,
        roughness: 0.2,
      })
    );

    windshield.position.set(0, 2.7, -4.53);
    bus.add(windshield);

    // Rodas
    for (const x of [-1.3, 1.3]) {
      for (const z of [-3, 3]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.65, 0.65, 0.35, 20),
          new THREE.MeshStandardMaterial({
            color: 0x171717,
          })
        );

        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.8, z);
        bus.add(wheel);
      }
    }

    bus.position.set(0, 0, 2);
    scene.add(bus);

    let animationId = 0;
    let currentSpeed = 0;
    let steering = 0;

    const clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);

      if (engineOn) {
        if (controls.current.acceleration) {
          currentSpeed += 5 * delta;
        }

        if (controls.current.braking) {
          currentSpeed -= 12 * delta;
        }
      }

      currentSpeed = THREE.MathUtils.clamp(
        currentSpeed,
        0,
        100
      );

      if (controls.current.left) steering += 1.5 * delta;
      if (controls.current.right) steering -= 1.5 * delta;

      steering = THREE.MathUtils.clamp(steering, -0.5, 0.5);

      bus.position.x = THREE.MathUtils.lerp(
        bus.position.x,
        steering * 5,
        delta * 2
      );

      bus.rotation.y = -steering * 0.3;

      // Movimento visual da estrada
      markings.forEach((line) => {
        line.position.z += currentSpeed * delta * 0.7;

        if (line.position.z > 8) {
          line.position.z -= 480;
        }
      });

      setSpeed(Math.round(currentSpeed));

      renderer.render(scene, camera);
    }

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);

      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();

          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];

          materials.forEach((material) => material.dispose());
        }
      });

      renderer.domElement.remove();
    };
  }, [engineOn]);

  function changeGear() {
    setGear((previous) => (previous >= 6 ? 1 : previous + 1));
  }

  function controlButton(
    name: keyof typeof controls.current,
    label: string
  ) {
    return (
      <button
        onPointerDown={(event) => {
          event.preventDefault();
          controls.current[name] = true;
        }}
        onPointerUp={() => {
          controls.current[name] = false;
        }}
        onPointerLeave={() => {
          controls.current[name] = false;
        }}
        onPointerCancel={() => {
          controls.current[name] = false;
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <main className="game">
      <div className="top-panel">
        <strong>ÔNIBUS SIMULATOR</strong>
        <span>ESTADOS DO BRASIL</span>
      </div>

      <div ref={containerRef} className="game-screen" />

      <div className="dashboard">
        <div>
          <strong>{speed}</strong>
          <small>KM/H</small>
        </div>

        <div>
          <strong>{gear}</strong>
          <small>MARCHA</small>
        </div>

        <div>
          <strong>{engineOn ? "LIGADO" : "DESLIGADO"}</strong>
          <small>MOTOR</small>
        </div>
      </div>

      <div className="controls">
        <section>
          {controlButton("left", "◀")}
          {controlButton("right", "▶")}
        </section>

        <section>
          {controlButton("braking", "FREIO")}
          {controlButton("acceleration", "ACELERADOR")}
        </section>

        <section>
          <button onClick={changeGear}>CÂMBIO {gear}</button>

          <button onClick={() => setDoorOpen(!doorOpen)}>
            {doorOpen ? "FECHAR PORTA" : "ABRIR PORTA"}
          </button>

          <button onClick={() => setEngineOn(!engineOn)}>
            {engineOn ? "DESLIGAR MOTOR" : "LIGAR MOTOR"}
          </button>
        </section>
      </div>

      <footer>
        <span>SIMULADOR BRASILEIRO 3D</span>
        <span>ANDROID / PC</span>
      </footer>
    </main>
  );
      }
