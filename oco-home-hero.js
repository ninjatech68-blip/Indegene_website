(() => {
  "use strict";

  const root = document.querySelector(".js-home-motion");
  if (!root) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const field = root.querySelector(".oco-home-motion__field");
  const core = root.querySelector(".oco-home-motion__core");
  const nodes = [...root.querySelectorAll("[data-home-node]")];
  const routes = {
    strategy: root.querySelector(".oco-home-motion__route--one"),
    content: root.querySelector(".oco-home-motion__route--two"),
    governance: root.querySelector(".oco-home-motion__route--three"),
    activation: root.querySelector(".oco-home-motion__route--four"),
    measurement: root.querySelector(".oco-home-motion__route--five")
  };

  const phases = [
    { node: "strategy", route: "strategy" },
    { node: "content", route: "content" },
    { node: "governance", route: "governance" },
    { node: "activation", route: "activation" },
    { node: "measurement", route: "measurement" }
  ];

  let phaseIndex = 0;
  let cycleId = 0;

  function applyPhase(index) {
    const phase = phases[index];
    nodes.forEach((node) => {
      const isActive = node.dataset.homeNode === phase.node;
      node.classList.toggle("is-active", isActive);
    });

    Object.entries(routes).forEach(([key, route]) => {
      route?.classList.toggle("is-active", key === phase.route);
    });

    core?.classList.add("is-active");
    window.setTimeout(() => core?.classList.remove("is-active"), 420);
  }

  function tickPhase() {
    applyPhase(phaseIndex);
    phaseIndex = (phaseIndex + 1) % phases.length;
  }

  tickPhase();

  if (!reducedMotion) {
    cycleId = window.setInterval(tickPhase, 2200);
    root.classList.add("is-interactive");

    const pointer = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let rafId = 0;

    function animate() {
      current.x += (pointer.x - current.x) * 0.08;
      current.y += (pointer.y - current.y) * 0.08;

      if (field) {
        field.style.transform = `translate3d(${current.x * 10}px, ${current.y * 10}px, 0)`;
      }

      rafId = window.requestAnimationFrame(animate);
    }

    root.addEventListener("pointermove", (event) => {
      const rect = root.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    root.addEventListener("pointerleave", () => {
      pointer.x = 0;
      pointer.y = 0;
    });

    rafId = window.requestAnimationFrame(animate);

    window.addEventListener("beforeunload", () => {
      if (cycleId) {
        window.clearInterval(cycleId);
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    });
  }
})();
