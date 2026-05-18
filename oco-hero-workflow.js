(() => {
  "use strict";

  const root = document.querySelector(".js-hero-workflow");
  if (!root) {
    return;
  }

  const nodes = [
    {
      id: "compliance",
      label: "Veeva Vault",
      meta: "Compliance",
      color: "var(--workflow-strategy)",
      description: "Approved, compliant content enters the campaign workflow from a regulated source of truth.",
      svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#F26724"/><path d="M18 19.5 31.4 46h2.7L46 19.5h-8L32.7 31l-5.6-11.5Z" fill="#fff"/></svg>',
      x: 18,
      y: 22
    },
    {
      id: "cdp",
      label: "Segment CDP",
      meta: "Audience Data",
      color: "var(--workflow-cdp)",
      description: "Audience identity, events, and segmentation are centralized here for downstream activation.",
      svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#52BD95"/><path d="M32 14c9.94 0 18 8.06 18 18S41.94 50 32 50c-3.82 0-7.36-1.19-10.28-3.22l5.3-5.3A10.95 10.95 0 0 0 32 43c6.08 0 11-4.92 11-11s-4.92-11-11-11c-4.33 0-8.08 2.5-9.88 6.14H34v9H14c0-12.15 9.85-22 22-22Z" fill="#fff"/></svg>',
      x: 40,
      y: 12
    },
    {
      id: "orchestration",
      label: "Marketing Cloud",
      meta: "Orchestration",
      color: "var(--workflow-orch)",
      description: "Salesforce Marketing Cloud acts as the central journey and activation engine.",
      logo: "https://upload.wikimedia.org/wikipedia/commons/f/f9/Salesforce.com_logo.svg",
      alt: "Salesforce logo",
      x: 50,
      y: 47
    },
    {
      id: "owned",
      label: "Email / Website",
      meta: "Owned Channels",
      color: "var(--workflow-owned)",
      description: "Owned experiences deliver approved content through email journeys and website touchpoints.",
      svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#1FB980"/><path d="M16 20h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V24a4 4 0 0 1 4-4Zm0 4v.45l16 10.67 16-10.67V24H16Zm32 16V29.26L34.22 38.4a4 4 0 0 1-4.44 0L16 29.26V40h32Z" fill="#fff"/></svg>',
      x: 18,
      y: 72
    },
    {
      id: "social",
      label: "Social Media",
      meta: "Paid / Organic",
      color: "var(--workflow-social)",
      description: "Social platforms receive audience-informed content for reach, engagement, and conversion support.",
      svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#EF5B98"/><path d="M22 24a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm20-6a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0 24a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm-16.73-9.47 10.88-5.06 1.7 3.66-10.88 5.06-1.7-3.66Zm1.7 1.28 10.88 5.06-1.7 3.66-10.88-5.06 1.7-3.66Z" fill="#fff"/></svg>',
      x: 82,
      y: 22
    },
    {
      id: "messaging",
      label: "WhatsApp / SMS",
      meta: "Messaging",
      color: "var(--workflow-message)",
      description: "Conversational messaging delivers lightweight, timely campaign nudges and reminders.",
      svg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#5D6CF9"/><path d="M20 18h24a8 8 0 0 1 8 8v11a8 8 0 0 1-8 8H31l-8.5 7v-7H20a8 8 0 0 1-8-8V26a8 8 0 0 1 8-8Zm7 10h10v4H27v-4Zm0 8h16v4H27v-4Z" fill="#fff"/></svg>',
      x: 82,
      y: 72
    },
    {
      id: "analytics",
      label: "Analytics",
      meta: "GA4 / BI",
      color: "var(--workflow-analytics)",
      description: "Performance, behavior, and conversion data close the loop and refine audience and campaign logic.",
      logo: "https://cdn.simpleicons.org/googleanalytics/E37400",
      alt: "Google Analytics logo",
      x: 50,
      y: 84
    }
  ];

  const edges = [
    ["compliance", "orchestration"],
    ["cdp", "orchestration"],
    ["cdp", "social"],
    ["cdp", "messaging"],
    ["orchestration", "owned"],
    ["orchestration", "social"],
    ["orchestration", "messaging"],
    ["owned", "analytics"],
    ["social", "analytics"],
    ["messaging", "analytics"],
    ["analytics", "cdp"],
    ["analytics", "orchestration"]
  ];

  const diagram = root.querySelector("[data-workflow-diagram]");
  const svg = root.querySelector("[data-workflow-svg]");
  const canvas = root.querySelector("[data-workflow-canvas]");
  const nodesLayer = root.querySelector("[data-workflow-nodes]");
  const tooltip = root.querySelector("[data-workflow-tooltip]");
  const resetFlowButton = root.querySelector("[data-workflow-reset]");
  const context = canvas && canvas.getContext ? canvas.getContext("2d") : null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!diagram || !svg || !canvas || !nodesLayer || !tooltip || !resetFlowButton || !context) {
    return;
  }

  let activeId = null;
  let hoverId = null;
  let width = 0;
  let height = 0;
  let animationFrameId = 0;
  let pulses = [];
  let animationStart = performance.now();

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeElements = new Map();
  const edgeElements = [];
  const desktopNodeLayout = {
    compliance: { x: 15.3225, y: 21.3 },
    owned: { x: 16.156, y: 70.247 },
    cdp: { x: 50.7996, y: -13.158 },
    social: { x: 87.1775, y: 21.3 },
    messaging: { x: 87.1775, y: 75.73 },
    analytics: { x: 49.931, y: 83.021 },
    orchestration: { x: 50.1, y: 44.8 }
  };

  function resolveColor(varReference) {
    const varName = varReference.replace("var(", "").replace(")", "").trim();
    return getComputedStyle(root).getPropertyValue(varName).trim();
  }

  function logoMarkup(node) {
    if (node.logo) {
      return '<span class="hero-workflow__node-logo"><img src="' + node.logo + '" alt="' + node.alt + '" loading="lazy" decoding="async"></span>';
    }
    return '<span class="hero-workflow__node-logo" aria-hidden="true">' + node.svg + "</span>";
  }

  function buildNodes() {
    nodes.forEach((node) => {
      const el = document.createElement("article");
      el.className = "hero-workflow__node";
      el.dataset.id = node.id;
      el.style.setProperty("--node-color", node.color);
      el.innerHTML = `
        <button class="hero-workflow__node-button" type="button" aria-label="${node.label}">
          ${logoMarkup(node)}
        </button>
        <div class="hero-workflow__node-label">${node.label}</div>
        <div class="hero-workflow__node-meta">${node.meta}</div>
      `;

      const button = el.querySelector(".hero-workflow__node-button");
      button.addEventListener("mouseenter", (event) => handleEnter(node.id, event));
      button.addEventListener("mousemove", moveTooltip);
      button.addEventListener("mouseleave", handleLeave);
      button.addEventListener("focus", (event) => handleEnter(node.id, event));
      button.addEventListener("blur", handleLeave);
      button.addEventListener("click", () => {
        activeId = activeId === node.id ? null : node.id;
        applyState();
      });

      nodesLayer.appendChild(el);
      nodeElements.set(node.id, el);
    });
  }

  function point(node) {
    if (window.innerWidth > 991) {
      const desktopPoint = desktopNodeLayout[node.id] || { x: node.x, y: node.y };
      return {
        x: width * (desktopPoint.x / 100),
        y: height * (desktopPoint.y / 100)
      };
    }

    const insetX = width * 0.015;
    const insetY = height * 0.015;
    return {
      x: insetX + (width * 0.97) * (node.x / 100),
      y: insetY + (height * 0.9) * (node.y / 100)
    };
  }

  function pointForEdge(node) {
    const pos = point(node);
    if (window.innerWidth > 991) {
      return {
        x: pos.x,
        y: Math.max(18, pos.y)
      };
    }
    return pos;
  }

  function resize() {
    width = diagram.clientWidth;
    height = diagram.clientHeight;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

    nodes.forEach((node) => {
      const pos = point(node);
      const el = nodeElements.get(node.id);
      if (el) {
        el.style.left = pos.x + "px";
        el.style.top = pos.y + "px";
      }
    });

    drawEdges();
    buildPulses();
    drawPulses();
  }

  function pathFor(fromNode, toNode) {
    const a = pointForEdge(fromNode);
    const b = pointForEdge(toNode);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const ux = dx / distance;
    const uy = dy / distance;
    const trim = trimFor(fromNode, toNode);
    const x1 = a.x + ux * trim;
    const y1 = a.y + uy * trim;
    const x2 = b.x - ux * trim;
    const y2 = b.y - uy * trim;
    const offset = Math.min(44, distance * 0.15);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 - (Math.abs(dx) > Math.abs(dy) ? offset : 0);
    return "M " + x1 + " " + y1 + " Q " + cx + " " + cy + " " + x2 + " " + y2;
  }

  function curveFor(fromNode, toNode) {
    const a = pointForEdge(fromNode);
    const b = pointForEdge(toNode);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(Math.hypot(dx, dy), 1);
    const ux = dx / distance;
    const uy = dy / distance;
    const trim = trimFor(fromNode, toNode);
    const x1 = a.x + ux * trim;
    const y1 = a.y + uy * trim;
    const x2 = b.x - ux * trim;
    const y2 = b.y - uy * trim;
    const offset = Math.min(44, distance * 0.15);
    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 - (Math.abs(dx) > Math.abs(dy) ? offset : 0);
    return { x1, y1, cx, cy, x2, y2 };
  }

  function trimFor(fromNode, toNode) {
    const isTopBridge =
      (fromNode.id === "cdp" && toNode.id === "social") ||
      (fromNode.id === "cdp" && toNode.id === "orchestration") ||
      (fromNode.id === "analytics" && toNode.id === "cdp");

    return isTopBridge ? 22 : 56;
  }

  function drawEdges() {
    svg.innerHTML = "";
    edgeElements.length = 0;

    edges.forEach(([fromId, toId]) => {
      const fromNode = nodeMap.get(fromId);
      const toNode = nodeMap.get(toId);
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const d = pathFor(fromNode, toNode);
      const curve = curveFor(fromNode, toNode);
      const base = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const flow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const edgeColor = resolveColor(fromNode.color);

      group.setAttribute("class", "hero-workflow__edge-group");
      group.style.setProperty("--edge-color", edgeColor);
      base.setAttribute("class", "hero-workflow__edge");
      base.setAttribute("d", d);
      flow.setAttribute("class", "hero-workflow__edge-flow");
      flow.setAttribute("d", d);
      group.append(base, flow);
      svg.appendChild(group);

      edgeElements.push({
        fromId,
        toId,
        group,
        color: edgeColor,
        curve
      });
    });

    applyState();
  }

  function buildPulses() {
    pulses = edgeElements.flatMap((edge, index) => ([
      { edgeIndex: index, offset: 0, speed: 0.16, radius: 1.9 },
      { edgeIndex: index, offset: 0.52, speed: 0.11, radius: 1.5 }
    ]));
  }

  function pointOnCurve(curve, t) {
    const inv = 1 - t;
    return {
      x: inv * inv * curve.x1 + 2 * inv * t * curve.cx + t * t * curve.x2,
      y: inv * inv * curve.y1 + 2 * inv * t * curve.cy + t * t * curve.y2
    };
  }

  function hexToRgba(hex, alpha) {
    const normalized = hex.replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
  }

  function drawPulses(now = performance.now()) {
    context.clearRect(0, 0, width, height);
    if (reduceMotion) {
      return;
    }

    const elapsedSeconds = (now - animationStart) / 1000;

    pulses.forEach((pulse) => {
      const edge = edgeElements[pulse.edgeIndex];
      if (!edge) {
        return;
      }

      const current = activeId || hoverId;
      const related = !current || edge.fromId === current || edge.toId === current;
      const alpha = related ? 0.98 : 0.22;
      const progress = (pulse.offset + elapsedSeconds * pulse.speed) % 1;
      const pos = pointOnCurve(edge.curve, progress);
      const glow = context.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, pulse.radius * 3.2);
      const pulseColor = related ? "#ff8bc2" : edge.color;

      glow.addColorStop(0, hexToRgba(pulseColor, alpha * 0.55));
      glow.addColorStop(1, hexToRgba(pulseColor, 0));

      context.beginPath();
      context.arc(pos.x, pos.y, pulse.radius * 3.2, 0, Math.PI * 2);
      context.fillStyle = glow;
      context.fill();

      context.beginPath();
      context.arc(pos.x, pos.y, pulse.radius, 0, Math.PI * 2);
      context.fillStyle = hexToRgba(pulseColor, alpha);
      context.fill();
    });
  }

  function animate(now) {
    drawPulses(now);
    animationFrameId = window.requestAnimationFrame(animate);
  }

  function linkedIds(id) {
    const linked = new Set([id]);
    edges.forEach(([fromId, toId]) => {
      if (fromId === id) {
        linked.add(toId);
      }
      if (toId === id) {
        linked.add(fromId);
      }
    });
    return linked;
  }

  function applyState() {
    const current = activeId || hoverId;
    const related = current ? linkedIds(current) : null;

    nodeElements.forEach((el, id) => {
      el.classList.toggle("is-active", id === activeId);
      el.classList.toggle("is-linked", !!related && related.has(id) && id !== activeId);
      el.classList.toggle("is-muted", !!related && !related.has(id));
    });

    edgeElements.forEach((edge) => {
      const isRelated = current && (edge.fromId === current || edge.toId === current);
      edge.group.classList.toggle("is-active", !!activeId && isRelated);
      edge.group.classList.toggle("is-hovered", !activeId && !!hoverId && isRelated);
      edge.group.classList.toggle("is-muted", !!current && !isRelated);
    });
  }

  function showTooltip(node, event) {
    tooltip.innerHTML = `
      <div class="hero-workflow__tooltip-meta">${node.meta}</div>
      <h2 class="hero-workflow__tooltip-title">${node.label}</h2>
    `;
    tooltip.classList.add("is-visible");
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (!tooltip.classList.contains("is-visible")) {
      return;
    }

    const offset = 18;
    const left = Math.min(window.innerWidth - tooltip.offsetWidth - 12, event.clientX + offset);
    const top = Math.min(window.innerHeight - tooltip.offsetHeight - 12, event.clientY + offset);
    tooltip.style.left = left + "px";
    tooltip.style.top = top + "px";
  }

  function hideTooltip() {
    tooltip.classList.remove("is-visible");
  }

  function resetFlow() {
    activeId = null;
    hoverId = null;
    hideTooltip();
    applyState();
    buildPulses();
    animationStart = performance.now();

    if (!reduceMotion) {
      window.cancelAnimationFrame(animationFrameId);
      animationFrameId = window.requestAnimationFrame(animate);
      return;
    }

    drawPulses(animationStart);
  }

  function handleEnter(id, event) {
    hoverId = id;
    showTooltip(nodeMap.get(id), event);
    applyState();
  }

  function handleLeave() {
    hoverId = null;
    hideTooltip();
    applyState();
  }

  buildNodes();
  resize();

  if (!reduceMotion) {
    animationStart = performance.now();
    animate();
  }

  window.addEventListener("resize", resize);
  resetFlowButton.addEventListener("click", resetFlow);
  window.addEventListener("beforeunload", () => window.cancelAnimationFrame(animationFrameId));
})();
