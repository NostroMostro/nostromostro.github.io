document.addEventListener('DOMContentLoaded', () => {
  const section = document.getElementById('mercado');
  if (!section) return;

  fetch('data/premiums.json')
    .then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(data => {
      renderStats(data.stats);
      renderChart(data.daily);
      renderPaymentMethods(data.payment_methods);
      renderUpdated(data.updated_at);
    })
    .catch(() => {
      section.style.display = 'none';
    });

  function renderStats(stats) {
    const el24h = document.getElementById('stat-24h');
    const el7d = document.getElementById('stat-7d');
    const elTrades = document.getElementById('stat-trades');

    el24h.textContent = stats.avg_premium_24h !== null ? stats.avg_premium_24h + '%' : '--';
    el7d.textContent = stats.avg_premium_7d !== null ? stats.avg_premium_7d + '%' : '--';
    elTrades.textContent = stats.trades_30d;

    const elPrice = document.getElementById('stat-price');
    elPrice.textContent = stats.last_btc_price
      ? stats.last_btc_price.toLocaleString('es-ES') + ' €'
      : '--';
  }

  function renderUpdated(ts) {
    const el = document.getElementById('market-updated');
    if (!ts) return;
    const d = new Date(ts);
    el.textContent = 'Actualizado: ' + d.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function renderPaymentMethods(methods) {
    const container = document.getElementById('payment-ranking');
    if (!container || !methods || methods.length === 0) return;

    var total = methods.reduce(function(sum, m) { return sum + m.count; }, 0);
    if (total === 0) return;

    var title = document.createElement('h3');
    title.className = 'payment-ranking-title';
    title.textContent = 'Métodos de pago más usados (30d)';
    container.appendChild(title);

    var maxCount = methods[0].count;

    methods.forEach(function(item) {
      var pct = Math.round((item.count / total) * 100);
      var barWidth = Math.round((item.count / maxCount) * 100);

      var row = document.createElement('div');
      row.className = 'payment-bar-row';

      var label = document.createElement('span');
      label.className = 'payment-bar-label';
      label.textContent = item.method;

      var track = document.createElement('div');
      track.className = 'payment-bar-track';

      var fill = document.createElement('div');
      fill.className = 'payment-bar-fill';
      fill.style.width = barWidth + '%';

      track.appendChild(fill);

      var pctEl = document.createElement('span');
      pctEl.className = 'payment-bar-pct';
      pctEl.textContent = pct + '%';

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(pctEl);
      container.appendChild(row);
    });
  }

  function renderChart(daily) {
    const canvas = document.getElementById('premium-chart');
    if (!canvas || !daily || daily.length === 0) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    const values = daily.map(d => d.avg_premium);
    const minV = Math.min(0, Math.floor(Math.min(...values) - 1));
    const maxV = Math.ceil(Math.max(...values) + 1);
    const range = maxV - minV || 1;

    const toX = i => pad.left + (i / (daily.length - 1 || 1)) * plotW;
    const toY = v => pad.top + plotH - ((v - minV) / range) * plotH;

    // Styles
    const orange = '#f7931a';
    const orangeGlow = 'rgba(247, 147, 26, 0.15)';
    const textColor = '#8a8278';
    const gridColor = 'rgba(42, 37, 32, 0.5)';

    // Grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const v = minV + (range / steps) * i;
      const y = toY(v);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = '12px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(v.toFixed(1) + '%', pad.left - 8, y);
    }

    // X labels
    ctx.fillStyle = textColor;
    ctx.font = '11px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const labelStep = Math.max(1, Math.floor(daily.length / 6));
    daily.forEach((d, i) => {
      if (i % labelStep === 0 || i === daily.length - 1) {
        const parts = d.date.split('-');
        const label = parseInt(parts[2]) + '/' + parseInt(parts[1]);
        ctx.fillText(label, toX(i), h - pad.bottom + 10);
      }
    });

    // Area fill
    if (daily.length > 1) {
      const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
      gradient.addColorStop(0, 'rgba(247, 147, 26, 0.2)');
      gradient.addColorStop(1, 'rgba(247, 147, 26, 0)');

      ctx.beginPath();
      ctx.moveTo(toX(0), toY(values[0]));
      for (let i = 1; i < daily.length; i++) {
        ctx.lineTo(toX(i), toY(values[i]));
      }
      ctx.lineTo(toX(daily.length - 1), pad.top + plotH);
      ctx.lineTo(toX(0), pad.top + plotH);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Line
    ctx.beginPath();
    ctx.moveTo(toX(0), toY(values[0]));
    for (let i = 1; i < daily.length; i++) {
      ctx.lineTo(toX(i), toY(values[i]));
    }
    ctx.strokeStyle = orange;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = orangeGlow;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Dots
    daily.forEach((d, i) => {
      ctx.beginPath();
      ctx.arc(toX(i), toY(values[i]), 4, 0, Math.PI * 2);
      ctx.fillStyle = orange;
      ctx.fill();
      ctx.strokeStyle = '#0a0a0a';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Tooltip
    const tooltip = document.getElementById('chart-tooltip');

    canvas.addEventListener('mousemove', e => {
      const cRect = canvas.getBoundingClientRect();
      const mx = e.clientX - cRect.left;
      const my = e.clientY - cRect.top;

      if (mx < pad.left || mx > w - pad.right || my < pad.top || my > pad.top + plotH) {
        tooltip.style.display = 'none';
        return;
      }

      let closest = 0;
      let minDist = Infinity;
      daily.forEach((d, i) => {
        const dist = Math.abs(toX(i) - mx);
        if (dist < minDist) { minDist = dist; closest = i; }
      });

      if (minDist > 30) {
        tooltip.style.display = 'none';
        return;
      }

      const d = daily[closest];
      tooltip.textContent = '';
      const strong = document.createElement('strong');
      strong.textContent = d.date;
      tooltip.appendChild(strong);
      tooltip.appendChild(document.createElement('br'));
      tooltip.appendChild(document.createTextNode('Premium: ' + d.avg_premium + '%'));
      tooltip.appendChild(document.createElement('br'));
      tooltip.appendChild(document.createTextNode('Trades: ' + d.trades));
      tooltip.style.display = 'block';

      let tx = toX(closest) + 12;
      let ty = toY(values[closest]) - 10;
      if (tx + 150 > w) tx = toX(closest) - 160;
      if (ty < 0) ty = 10;
      tooltip.style.left = tx + 'px';
      tooltip.style.top = ty + 'px';
    });

    canvas.addEventListener('mouseleave', () => {
      tooltip.style.display = 'none';
    });

    // Resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => renderChart(daily), 200);
    });
  }
});
