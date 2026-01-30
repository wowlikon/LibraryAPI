const NS = "http://www.w3.org/2000/svg";
const $svg = $("#canvas");

const CONFIG = {
  holeRadius: 60,
  maxRadius: 220,
  tilt: 0.4,

  ringsCount: 7,
  ringSpeed: 0.002,
  ringStroke: 5,

  particlesCount: 40,
  particleSpeedBase: 0.02,
  particleFallSpeed: 0.2,
};

function create(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (let k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

const $layerBack = $(create("g", { id: "layer-back" }));
const $layerHole = $(create("g", { id: "layer-hole" }));
const $layerFront = $(create("g", { id: "layer-front" }));

$svg.append($layerBack, $layerHole, $layerFront);

const holeHalo = create("circle", {
  cx: 0,
  cy: 0,
  r: CONFIG.holeRadius + 4,
  fill: "#ffffff",
  stroke: "none",
});
const holeBody = create("circle", {
  cx: 0,
  cy: 0,
  r: CONFIG.holeRadius,
  fill: "#000000",
});
$layerHole.append(holeHalo, holeBody);

class Ring {
  constructor(offset) {
    this.progress = offset;

    const style = {
      fill: "none",
      stroke: "#000",
      "stroke-linecap": "round",
      "stroke-width": CONFIG.ringStroke,
    };

    this.elBack = create("path", style);
    this.elFront = create("path", style);

    $layerBack.append(this.elBack);
    $layerFront.append(this.elFront);
  }

  update() {
    this.progress += CONFIG.ringSpeed;
    if (this.progress >= 1) this.progress -= 1;

    const t = this.progress;

    const currentR =
      CONFIG.maxRadius - t * (CONFIG.maxRadius - CONFIG.holeRadius);
    const currentRy = currentR * CONFIG.tilt;

    const distFromHole = currentR - CONFIG.holeRadius;
    const distFromEdge = CONFIG.maxRadius - currentR;

    const fadeHole = Math.min(1, distFromHole / 40);
    const fadeEdge = Math.min(1, distFromEdge / 40);

    const opacity = fadeHole * fadeEdge;

    if (opacity <= 0.01) {
      this.elBack.setAttribute("opacity", 0);
      this.elFront.setAttribute("opacity", 0);
    } else {
      const dBack = `M ${-currentR} 0 A ${currentR} ${currentRy} 0 0 1 ${currentR} 0`;
      const dFront = `M ${-currentR} 0 A ${currentR} ${currentRy} 0 0 0 ${currentR} 0`;

      this.elBack.setAttribute("d", dBack);
      this.elFront.setAttribute("d", dFront);

      this.elBack.setAttribute("opacity", opacity);
      this.elFront.setAttribute("opacity", opacity);

      const sw =
        CONFIG.ringStroke *
        (0.6 + 0.4 * (distFromHole / (CONFIG.maxRadius - CONFIG.holeRadius)));
      this.elBack.setAttribute("stroke-width", sw);
      this.elFront.setAttribute("stroke-width", sw);
    }
  }
}

class Particle {
  constructor() {
    this.el = create("circle", { fill: "#000" });
    this.reset(true);
    $layerFront.append(this.el);
    this.inFront = true;
  }

  reset(randomStart = false) {
    this.angle = Math.random() * Math.PI * 2;
    this.r = randomStart
      ? CONFIG.holeRadius +
        Math.random() * (CONFIG.maxRadius - CONFIG.holeRadius)
      : CONFIG.maxRadius;

    this.speed = CONFIG.particleSpeedBase + Math.random() * 0.02;
    this.size = 1.5 + Math.random() * 2.5;
  }

  update() {
    const acceleration = CONFIG.maxRadius / this.r;
    this.angle += this.speed * acceleration;
    this.r -= CONFIG.particleFallSpeed * (acceleration * 0.8);

    const x = Math.cos(this.angle) * this.r;
    const y = Math.sin(this.angle) * this.r * CONFIG.tilt;

    const isNowFront = Math.sin(this.angle) > 0;

    if (this.inFront !== isNowFront) {
      this.inFront = isNowFront;
      if (this.inFront) {
        $layerFront.append(this.el);
      } else {
        $layerBack.append(this.el);
      }
    }

    const distFromHole = this.r - CONFIG.holeRadius;
    const distFromEdge = CONFIG.maxRadius - this.r;

    const fadeHole = Math.min(1, distFromHole / 30);
    const fadeEdge = Math.min(1, distFromEdge / 30);
    const opacity = fadeHole * fadeEdge;

    this.el.setAttribute("cx", x);
    this.el.setAttribute("cy", y);
    this.el.setAttribute("r", this.size * Math.min(1, this.r / 100));
    this.el.setAttribute("opacity", opacity);

    if (this.r <= CONFIG.holeRadius) {
      this.reset(false);
    }
  }
}

const rings = [];
for (let i = 0; i < CONFIG.ringsCount; i++) {
  rings.push(new Ring(i / CONFIG.ringsCount));
}

const particles = [];
for (let i = 0; i < CONFIG.particlesCount; i++) {
  particles.push(new Particle());
}

function animate() {
  rings.forEach((r) => r.update());
  particles.forEach((p) => p.update());
  requestAnimationFrame(animate);
}

animate();
