(function(){
    let canvas, ctx;
    let drawing = false;
    let currentColor = '#2D1B4E';
    let currentSize = 6;
    let initialized = false;
    let lastX = 0, lastY = 0;
  
    function getPos(e){
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const point = e.touches ? e.touches[0] : e;
      return {
        x: (point.clientX - rect.left) * scaleX,
        y: (point.clientY - rect.top) * scaleY
      };
    }
  
    function startDraw(e){
      drawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
      e.preventDefault();
    }
  
    function draw(e){
      if(!drawing) return;
      const pos = getPos(e);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastX = pos.x;
      lastY = pos.y;
      e.preventDefault();
    }
  
    function stopDraw(){
      drawing = false;
    }
  
    function clearCanvas(){
      ctx.fillStyle = '#FFF6E9';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  
    function setupCanvas(){
      canvas = document.getElementById('paintCanvas');
      if(!canvas) return;
      ctx = canvas.getContext('2d');
      clearCanvas();
  
      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', stopDraw);
      canvas.addEventListener('mouseleave', stopDraw);
  
      canvas.addEventListener('touchstart', startDraw);
      canvas.addEventListener('touchmove', draw);
      canvas.addEventListener('touchend', stopDraw);
  
      document.querySelectorAll('.paint-color').forEach(function(btn){
        btn.addEventListener('click', function(){
          document.querySelectorAll('.paint-color').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentColor = btn.dataset.color;
        });
      });
  
      const sizeSlider = document.getElementById('brushSize');
      if(sizeSlider){
        sizeSlider.addEventListener('input', function(){
          currentSize = parseInt(sizeSlider.value, 10);
        });
      }
  
      const clearBtn = document.getElementById('clearCanvasBtn');
      if(clearBtn){
        clearBtn.addEventListener('click', clearCanvas);
      }
  
      initialized = true;
    }
  
    window.initPaintCanvas = function(){
      if(!initialized) setupCanvas();
    };
  })();

  