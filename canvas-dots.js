// Dot class
class Dot {
  constructor(left, top, color, lineWidth, alphaTickCount) {
    this.left = left;
    this.top = top;
    this.magnitude = 0.001;
    this.angle = 0;
    this.color = color;
    this.lineWidth = lineWidth;
    this.alphaTickCount = alphaTickCount;
    this.alphaFrame = Math.floor(Math.random() * (alphaTickCount + 1));
    this.alphaIncreasing = Math.random() < 0.5;
    this.alpha = 0;
    this.targetMagnitude = 0.001;
    this.targetAngle = 0;
  }

  setAlpha() {
    if (
      (this.alphaFrame === this.alphaTickCount && this.alphaIncreasing) ||
      (this.alphaFrame === 0 && !this.alphaIncreasing)
    ) {
      this.alphaIncreasing = !this.alphaIncreasing;
    }

    if (this.alphaIncreasing) {
      this.alphaFrame++;
    } else {
      this.alphaFrame--;
    }

    this.alpha = this.alphaFrame / this.alphaTickCount;
  }

  getAlpha(mouseOver) {
    return mouseOver ? 1 : this.alpha;
  }

  draw(context, mouseOver) {
    this.setAlpha();
    context.globalAlpha = this.getAlpha(mouseOver);
    context.strokeStyle = this.color;
    context.lineWidth = this.lineWidth;
    context.lineCap = "round";

    context.save();
    context.beginPath();

    context.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      this.left,
      this.top
    );
    context.rotate(this.angle);

    context.moveTo(-this.magnitude / 2, 0);
    context.lineTo(this.magnitude / 2, 0);

    context.stroke();

    context.restore();
  }

  animate() {
    this.magnitude += (this.targetMagnitude - this.magnitude) * 0.1;
    this.angle += (this.targetAngle - this.angle) * 0.1;
  }

  setTarget(magnitude, angle) {
    this.targetMagnitude = magnitude;
    this.targetAngle = angle;
  }
}

// Main Canvas class
class InteractiveCanvas {
  constructor(canvasElement, options) {
    this.dotSpacing = options.dotSpacing;
    this.dotColor = options.dotColor;
    this.lineWidth = options.lineWidth;
    this.alphaTickCount = options.alphaTickCount;
    this.maxMagnitude = options.maxMagnitude;
    this.radius = options.radius;
    this.isMobile = window.innerWidth < 768;

    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.dots = [];
    this.relMousePosition = { x: 0, y: 0 };
    this.mouseMoved = false;
    this.mouseOver = false;

    this.resizeObserver = new ResizeObserver(([entry]) => this.handleResize(entry));
    this.resizeObserver.observe(this.canvas.parentElement);

    this.setupEventListeners();
    this.setupCanvas();
    this.createDots();
    this.animate();
  }

  setupCanvas() {
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
  }

  handleResize(entry) {
    const { width, height } = entry.contentRect;
    this.canvas.width = width * devicePixelRatio;
    this.canvas.height = height * devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.createDots();
  }

  setupEventListeners() {
    if (!this.isMobile) {
      this.canvas.addEventListener('mouseenter', () => this.mouseOver = true);
      this.canvas.addEventListener('mousemove', (e) => this.updateMousePosition(e));
      this.canvas.addEventListener('mouseleave', () => this.reset());
      document.addEventListener('touchstart', (e) => this.handleTouchStart(e));
      document.addEventListener('touchmove', (e) => this.updateMousePosition(e));
      document.addEventListener('touchend', () => this.reset());
    }
  }

  updateMousePosition(e) {
    if (e.targetTouches && e.targetTouches[0]) {
      e = e.targetTouches[0];
    }
    const rect = this.canvas.getBoundingClientRect();
    this.relMousePosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    this.mouseMoved = true;
  }

  handleTouchStart(e) {
    this.mouseOver = true;
    this.updateMousePosition(e);
  }

  reset() {
    this.mouseOver = false;
    this.dots.forEach(row => {
      row.forEach(dot => {
        dot.setTarget(0.001, 0);
      });
    });
  }

  createDots() {
    const { width, height } = this.canvas;
    const numRows = Math.ceil(height / (this.dotSpacing * devicePixelRatio));
    const numCols = Math.ceil(width / (this.dotSpacing * devicePixelRatio));

    this.dots = [...new Array(numRows)].map((row, i) =>
                                            [...new Array(numCols)].map((col, j) => {
      const top = (i + 0.5) * this.dotSpacing * devicePixelRatio;
      const left = (j + 0.5) * this.dotSpacing * devicePixelRatio;
      return new Dot(left, top, this.dotColor, this.lineWidth, this.alphaTickCount);
    })
                                           );
  }

  updateDotTransform() {
    if (!this.isMobile && this.mouseMoved && this.mouseOver) {
      const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

      this.dots.forEach(row => {
        row.forEach(dot => {
          const dx = this.relMousePosition.x * devicePixelRatio - dot.left;
          const dy = this.relMousePosition.y * devicePixelRatio - dot.top;
          const dist = Math.sqrt(dx ** 2 + dy ** 2) || 1;

          const angle = Math.atan2(dy, dx);
          const magnitude = clamp(this.radius / dist, 0.001, this.maxMagnitude);

          dot.alpha = 1;

          dot.setTarget(magnitude, angle);
        });
      });

      this.mouseMoved = false;
    }
  }

  draw() {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.dots.forEach(row => {
      row.forEach(dot => {
        dot.draw(this.ctx, this.mouseOver);
      });
    });
  }

  animate() {
    this.updateDotTransform();
    this.dots.forEach(row => row.forEach(dot => dot.animate()));
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

// Initialize the canvas for each canvas element with the data-dots-bg attribute
window.addEventListener('load', () => {
  const canvases = document.querySelectorAll('canvas[data-dots-bg]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const canvas = entry.target;
      if (entry.isIntersecting) {
        const bgColor = canvas.getAttribute('data-dots-bg');
        const dotColor = bgColor === 'light' ? '#9CDCFC' : '#094E71';
        const interactiveCanvas = new InteractiveCanvas(canvas, {
          dotSpacing: 10,
          dotColor: dotColor,
          lineWidth: 2,
          alphaTickCount: 200,
          maxMagnitude: 8,
          radius: 1000
        });
        canvas.interactiveCanvasInstance = interactiveCanvas;
      } else {
        if (canvas.interactiveCanvasInstance) {
          canvas.interactiveCanvasInstance.stopAnimation();
        }
      }
    });
  });

  canvases.forEach(canvas => observer.observe(canvas));

});
