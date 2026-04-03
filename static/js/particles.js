(function () {
  class ParticleSystem {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.maxDistance = 120;
      this.animationId = null;
      this.contentBox = null;
      this.init();
    }

    init() {
      this.canvas = document.getElementById("particle-canvas");
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      this.resize();
      this.updateContentBoxBounds();
      this.createParticles();
      this.animate();
      window.addEventListener("resize", () => this.resize());
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.updateContentBoxBounds();
      this.repositionTrappedParticles();
      this.adjustParticleCount();
    }

    calculateParticleCount() {
      const area = this.canvas.width * this.canvas.height;
      const base = 1920 * 1080;
      const count = Math.round((area / base) * 65);
      return Math.max(20, Math.min(100, count));
    }

    adjustParticleCount() {
      const target = this.calculateParticleCount();
      const current = this.particles.length;
      if (current < target) {
        for (let i = current; i < target; i++) this.addSingleParticle();
      } else if (current > target) {
        this.particles = this.particles.slice(0, target);
      }
    }

    addSingleParticle() {
      let x, y, attempts = 0;
      do {
        x = Math.random() * this.canvas.width;
        y = Math.random() * this.canvas.height;
        attempts++;
      } while (attempts < 50 && this.isInsideBox(x, y, 3));

      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2.5 + 1.5,
        opacity: Math.random() * 0.25 + 0.2,
      });
    }

    updateContentBoxBounds() {
      // Avoid spawning particles inside the main text container
      const box = document.querySelector(".container");
      if (box) {
        const r = box.getBoundingClientRect();
        this.contentBox = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
      }
    }

    createParticles() {
      this.particles = [];
      const count = this.calculateParticleCount();
      for (let i = 0; i < count; i++) this.addSingleParticle();
    }

    isInsideBox(x, y, r) {
      if (!this.contentBox) return false;
      return (
        x + r >= this.contentBox.left &&
        x - r <= this.contentBox.right &&
        y + r >= this.contentBox.top &&
        y - r <= this.contentBox.bottom
      );
    }

    repositionTrappedParticles() {
      if (!this.contentBox) return;
      this.particles.forEach((p) => {
        if (this.isInsideBox(p.x, p.y, p.radius)) {
          const pos = this.findNearestEscape(p.x, p.y, p.radius);
          p.x = pos.x;
          p.y = pos.y;
        }
      });
    }

    findNearestEscape(x, y, r) {
      const b = this.contentBox;
      const distances = {
        left: Math.abs(x - (b.left - r - 10)),
        right: Math.abs(x - (b.right + r + 10)),
        top: Math.abs(y - (b.top - r - 10)),
        bottom: Math.abs(y - (b.bottom + r + 10)),
      };
      const side = Object.keys(distances).reduce((a, c) => distances[a] < distances[c] ? a : c);
      let nx = x, ny = y;
      if (side === "left")   nx = b.left - r - 10;
      if (side === "right")  nx = b.right + r + 10;
      if (side === "top")    ny = b.top - r - 10;
      if (side === "bottom") ny = b.bottom + r + 10;
      nx = Math.max(r, Math.min(this.canvas.width - r, nx));
      ny = Math.max(r, Math.min(this.canvas.height - r, ny));
      return { x: nx, y: ny };
    }

    willCollideWithBox(x, y, r) {
      if (!this.contentBox) return false;
      const b = this.contentBox;
      return x >= b.left - r && x <= b.right + r && y >= b.top - r && y <= b.bottom + r;
    }

    getCollisionSide(ox, oy, nx, ny, r) {
      const result = { horizontal: false, vertical: false };
      const b = this.contentBox;
      if ((ox <= b.left - r && nx >= b.left - r) || (ox >= b.right + r && nx <= b.right + r))
        result.horizontal = true;
      if ((oy <= b.top - r && ny >= b.top - r) || (oy >= b.bottom + r && ny <= b.bottom + r))
        result.vertical = true;
      return result;
    }

    updateParticles() {
      this.particles.forEach((p) => {
        const nx = p.x + p.vx;
        const ny = p.y + p.vy;

        if (this.contentBox && this.willCollideWithBox(nx, ny, p.radius)) {
          const side = this.getCollisionSide(p.x, p.y, nx, ny, p.radius);
          if (side.horizontal) p.vx = -p.vx;
          if (side.vertical)   p.vy = -p.vy;
        } else {
          p.x = nx;
          p.y = ny;
        }

        // Wrap around edges
        if (p.x < 0)                  p.x = this.canvas.width;
        if (p.x > this.canvas.width)  p.x = 0;
        if (p.y < 0)                  p.y = this.canvas.height;
        if (p.y > this.canvas.height) p.y = 0;
      });
    }

    drawParticles() {
      this.particles.forEach((p) => {
        this.ctx.save();
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = "#4c856c";
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
    }

    drawConnections() {
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const dx = this.particles[i].x - this.particles[j].x;
          const dy = this.particles[i].y - this.particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < this.maxDistance) {
            const alpha = (1 - dist / this.maxDistance) * 0.22;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.strokeStyle = "#26a96c";
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
            this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
            this.ctx.stroke();
            this.ctx.restore();
          }
        }
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.updateParticles();
      this.drawConnections();
      this.drawParticles();
      this.animationId = requestAnimationFrame(() => this.animate());
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new ParticleSystem());
  } else {
    new ParticleSystem();
  }
})();
