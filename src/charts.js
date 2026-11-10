/* charts.js – handgebaute SVG-Charts ohne externe Abhängigkeiten */
(function (global) {
  'use strict';

  const PALETTE = ['#34d399', '#f6b73c', '#a78bfa', '#60a5fa', '#f472b6'];

  function esc(value) {
    return String(value).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function svgWrap(width, height, inner) {
    return (
      '<svg class="chart" viewBox="0 0 ' + width + ' ' + height + '" ' +
      'width="100%" height="100%" role="img" preserveAspectRatio="xMidYMid meet">' +
      inner +
      '</svg>'
    );
  }

  /**
   * Radar / Netzdiagramm.
   * opts: { labels, series:[{ values, color, label }], size, max, showLabels }
   */
  function radar(opts) {
    const labels = opts.labels || [];
    const series = (opts.series || []).filter(Boolean);
    const size = opts.size || 400;
    const max = opts.max || 5;
    const showLabels = opts.showLabels !== false;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - (showLabels ? 74 : 34);
    const n = labels.length;
    if (!n) return '';

    const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const point = (i, value) => {
      const r = (Math.max(0, Math.min(max, value)) / max) * radius;
      return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
    };

    let inner = '';

    // Ringe
    for (let level = 1; level <= 5; level++) {
      const pts = labels.map((_, i) => point(i, (max / 5) * level).map((v) => v.toFixed(1)).join(','));
      inner +=
        '<polygon points="' + pts.join(' ') + '" fill="none" stroke="rgba(255,255,255,' +
        (level === 5 ? '0.14' : '0.06') + ')" stroke-width="1"></polygon>';
    }

    // Achsen
    labels.forEach((_, i) => {
      const [x, y] = point(i, max);
      inner +=
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) +
        '" stroke="rgba(255,255,255,0.07)" stroke-width="1"></line>';
    });

    // Serien
    series.forEach((serie, index) => {
      const color = serie.color || PALETTE[index % PALETTE.length];
      const pts = labels.map((_, i) => point(i, Number(serie.values[i]) || 0));
      const poly = pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      inner +=
        '<polygon points="' + poly + '" fill="' + color + '" fill-opacity="' +
        (series.length > 1 ? '0.10' : '0.14') + '" stroke="' + color +
        '" stroke-width="2" stroke-linejoin="round"></polygon>';
      pts.forEach((p) => {
        inner +=
          '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.6" fill="' +
          color + '" stroke="#0f1513" stroke-width="1"></circle>';
      });
    });

    // Beschriftung
    if (showLabels) {
      labels.forEach((label, i) => {
        const a = angle(i);
        const lx = cx + Math.cos(a) * (radius + 20);
        const ly = cy + Math.sin(a) * (radius + 18);
        let anchor = 'middle';
        if (Math.cos(a) > 0.35) anchor = 'start';
        else if (Math.cos(a) < -0.35) anchor = 'end';
        inner +=
          '<text x="' + lx.toFixed(1) + '" y="' + ly.toFixed(1) + '" text-anchor="' + anchor +
          '" dominant-baseline="middle" font-size="9.5" fill="#8fa39b" ' +
          'font-family="Segoe UI, system-ui, sans-serif" letter-spacing="0.02em">' +
          esc(label) + '</text>';
      });
    }

    return svgWrap(size, size, inner);
  }

  /**
   * Horizontale Balken.
   * opts: { items:[{label,value,color,suffix}], width, rowHeight, labelWidth, max }
   */
  function bars(opts) {
    const items = opts.items || [];
    const width = opts.width || 440;
    const rowHeight = opts.rowHeight || 30;
    const labelWidth = opts.labelWidth || 124;
    const valueWidth = 56;
    const trackWidth = Math.max(40, width - labelWidth - valueWidth - 12);
    const max = opts.max || Math.max(1, ...items.map((d) => Number(d.value) || 0));
    const height = Math.max(rowHeight, items.length * rowHeight + 4);

    let inner = '';
    items.forEach((item, i) => {
      const y = i * rowHeight + 4;
      const value = Number(item.value) || 0;
      const w = Math.max(1.5, (value / max) * trackWidth);
      const color = item.color || PALETTE[i % PALETTE.length];
      const suffix = item.suffix || '';
      inner +=
        '<text x="0" y="' + (y + 11) + '" dominant-baseline="middle" font-size="11.5" fill="#c6d6d0" ' +
        'font-family="Segoe UI, system-ui, sans-serif">' + esc(item.label) + '</text>' +
        '<rect x="' + labelWidth + '" y="' + y + '" width="' + trackWidth + '" height="8" rx="4" ' +
        'fill="rgba(255,255,255,0.055)"></rect>' +
        '<rect x="' + labelWidth + '" y="' + y + '" width="' + w.toFixed(1) + '" height="8" rx="4" ' +
        'fill="' + color + '"></rect>' +
        '<text x="' + (width - 2) + '" y="' + (y + 11) + '" text-anchor="end" dominant-baseline="middle" ' +
        'font-size="11" fill="#e9f1ed" font-variant-numeric="tabular-nums" ' +
        'font-family="Segoe UI, system-ui, sans-serif">' + esc(formatNumber(value) + suffix) + '</text>';
    });

    return svgWrap(width, height, inner);
  }

  function formatNumber(value) {
    const rounded = Math.round(value * 10) / 10;
    return String(rounded).replace('.', ',');
  }

  function arcPath(cx, cy, outer, inner, start, end) {
    const pt = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const large = end - start > Math.PI ? 1 : 0;
    const [x0, y0] = pt(outer, start);
    const [x1, y1] = pt(outer, end);
    const [x2, y2] = pt(inner, end);
    const [x3, y3] = pt(inner, start);
    return (
      'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) +
      ' A' + outer + ' ' + outer + ' 0 ' + large + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2) +
      ' L' + x2.toFixed(2) + ' ' + y2.toFixed(2) +
      ' A' + inner + ' ' + inner + ' 0 ' + large + ' 0 ' + x3.toFixed(2) + ' ' + y3.toFixed(2) +
      ' Z'
    );
  }

  /**
   * Donut mit Mittelwert.
   * opts: { items:[{label,value,color}], size, thickness, centerLabel, centerValue }
   */
  function donut(opts) {
    const items = (opts.items || []).filter((d) => d.value > 0);
    const size = opts.size || 210;
    const thickness = opts.thickness || 26;
    const cx = size / 2;
    const cy = size / 2;
    const outer = size / 2 - 6;
    const inner = outer - thickness;
    const total = items.reduce((sum, d) => sum + d.value, 0);
    if (!total) return svgWrap(size, size, '');

    let inner_svg = '';
    let angle = -Math.PI / 2;
    const gap = 0.035;
    items.forEach((item, i) => {
      const sweep = (item.value / total) * Math.PI * 2;
      const start = angle + gap / 2;
      const end = angle + sweep - gap / 2;
      if (end > start) {
        inner_svg +=
          '<path d="' + arcPath(cx, cy, outer, inner, start, end) + '" fill="' +
          (item.color || PALETTE[i % PALETTE.length]) + '"></path>';
      }
      angle += sweep;
    });

    const centerLabel = opts.centerLabel || 'Sorten';
    const centerValue = opts.centerValue != null ? opts.centerValue : total;
    inner_svg +=
      '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" font-size="26" font-weight="600" ' +
      'fill="#e9f1ed" font-family="Segoe UI, system-ui, sans-serif">' + esc(centerValue) + '</text>' +
      '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="10.5" fill="#8fa39b" ' +
      'letter-spacing="0.08em" font-family="Segoe UI, system-ui, sans-serif">' +
      esc(String(centerLabel).toUpperCase()) + '</text>';

    return svgWrap(size, size, inner_svg);
  }

  /**
   * Streudiagramm.
   * opts: { points:[{x,y,label,color}], width, height, xLabel, yLabel, xMin, xMax, yMin, yMax }
   */
  function scatter(opts) {
    const points = opts.points || [];
    const width = opts.width || 560;
    const height = opts.height || 320;
    const padL = 46;
    const padR = 18;
    const padT = 18;
    const padB = 42;
    const xMin = opts.xMin != null ? opts.xMin : 0;
    const xMax = opts.xMax != null ? opts.xMax : 35;
    const yMin = opts.yMin != null ? opts.yMin : 0;
    const yMax = opts.yMax != null ? opts.yMax : 1;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const sx = (v) => padL + ((v - xMin) / (xMax - xMin)) * plotW;
    const sy = (v) => padT + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

    let inner = '';

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const value = yMin + ((yMax - yMin) / yTicks) * i;
      const y = sy(value);
      inner +=
        '<line x1="' + padL + '" y1="' + y.toFixed(1) + '" x2="' + (width - padR) + '" y2="' +
        y.toFixed(1) + '" stroke="rgba(255,255,255,0.06)" stroke-width="1"></line>' +
        '<text x="' + (padL - 10) + '" y="' + y.toFixed(1) + '" text-anchor="end" dominant-baseline="middle" ' +
        'font-size="10" fill="#6f837c" font-family="Segoe UI, system-ui, sans-serif">' +
        formatNumber(value) + '</text>';
    }

    const xTicks = 5;
    for (let i = 0; i <= xTicks; i++) {
      const value = xMin + ((xMax - xMin) / xTicks) * i;
      const x = sx(value);
      inner +=
        '<line x1="' + x.toFixed(1) + '" y1="' + padT + '" x2="' + x.toFixed(1) + '" y2="' +
        (padT + plotH) + '" stroke="rgba(255,255,255,0.05)" stroke-width="1"></line>' +
        '<text x="' + x.toFixed(1) + '" y="' + (padT + plotH + 18) + '" text-anchor="middle" ' +
        'font-size="10" fill="#6f837c" font-family="Segoe UI, system-ui, sans-serif">' +
        formatNumber(value) + '</text>';
    }

    points.forEach((p) => {
      const cx = sx(p.x);
      const cy = sy(p.y);
      const color = p.color || '#34d399';
      inner +=
        '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="4.6" fill="' + color +
        '" fill-opacity="0.82" stroke="#0a0f0d" stroke-width="1.2">' +
        '<title>' + esc(p.label + ' · THC ' + formatNumber(p.x) + ' % · CBD ' + formatNumber(p.y) + ' %') +
        '</title></circle>';
    });

    if (opts.xLabel) {
      inner +=
        '<text x="' + (padL + plotW / 2) + '" y="' + (height - 6) + '" text-anchor="middle" font-size="10.5" ' +
        'fill="#8fa39b" letter-spacing="0.08em" font-family="Segoe UI, system-ui, sans-serif">' +
        esc(String(opts.xLabel).toUpperCase()) + '</text>';
    }
    if (opts.yLabel) {
      inner +=
        '<text transform="translate(13 ' + (padT + plotH / 2) + ') rotate(-90)" text-anchor="middle" ' +
        'font-size="10.5" fill="#8fa39b" letter-spacing="0.08em" ' +
        'font-family="Segoe UI, system-ui, sans-serif">' +
        esc(String(opts.yLabel).toUpperCase()) + '</text>';
    }

    return svgWrap(width, height, inner);
  }

  /** HTML-Legende zu einer Chart-Serie. */
  function legend(items) {
    return (
      '<ul class="chart-legend">' +
      items.map((item) =>
        '<li><span class="legend-dot" style="background:' + item.color + '"></span>' +
        esc(item.label) + (item.value != null ? ' <b>' + esc(item.value) + '</b>' : '') + '</li>'
      ).join('') +
      '</ul>'
    );
  }

  global.Charts = {
    radar: radar,
    bars: bars,
    donut: donut,
    scatter: scatter,
    legend: legend,
    palette: PALETTE
  };
})(window);
