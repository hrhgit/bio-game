// 百科全书功能
let wikiTimeout;

function toggleEncyclopedia() {
    const modalContent = document.getElementById('modal-content');
    if (wikiTimeout) clearTimeout(wikiTimeout);
    if (modal.classList.contains('hidden')) {
        if (!gameState.isPaused) document.getElementById('pause-btn').click();
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('scale-95');
        buildEncyclopedia();
        wikiTimeout = setTimeout(() => { drawConnections(); }, 300);
    } else {
        modal.classList.add('opacity-0');
        modalContent.classList.add('scale-95');
        wikiTimeout = setTimeout(() => {
            modal.classList.add('hidden');
            if (gameState.isPaused) document.getElementById('pause-btn').click();
        }, 300);
    }
}

function buildEncyclopedia() {
    for (let t = 1; t <= 5; t++) {
        const row = document.querySelector(`.tier-row[data-tier="${t}"]`);
        if (!row) continue;
        row.innerHTML = '';
        const tierCreatures = CREATURES.filter(c => c.tier === t);
        tierCreatures.forEach(c => {
            const node = document.createElement('div');
            node.id = `wiki-node-${c.id}`;
            node.className = `flex flex-col items-center p-3 bg-secondary-dark border border-gray-700 rounded-xl shadow-lg w-32 relative z-10 cursor-pointer hover:border-accent-energy hover:scale-105 transition-all duration-200 group`;
            node.onclick = () => showWikiDetail(c.id);
            node.innerHTML = `
                <div class="w-12 h-12 rounded-lg ${c.baseColor} border ${c.borderColor} flex items-center justify-center mb-2 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.5)] transition-all">
                    <i data-lucide="${c.icon}" class="w-6 h-6 ${c.color}"></i>
                </div>
                <span class="text-xs text-gray-200 text-center group-hover:text-accent-energy transition-colors">${c.name}</span>
                <div class="absolute -top-2 -right-2 bg-primary-dark border border-gray-600 text-[10px] px-1.5 rounded text-gray-400">T${c.tier}</div>
            `;
            row.appendChild(node);
        });
    }
    lucide.createIcons();
}

function showWikiDetail(creatureId) {
    const c = getCreatureDef(creatureId);
    if (!c) return;
    const detailOverlay = document.getElementById('wiki-detail-overlay');
    const detailCard = document.getElementById('wiki-detail-card');
    const detailContent = document.getElementById('wiki-detail-content');
    
    let html = `
        <div class="flex items-start gap-5 mb-6 border-b border-ui-border pb-6">
            <div class="w-24 h-24 rounded-2xl ${c.baseColor} border-2 ${c.borderColor} flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.5)] shrink-0">
                <i data-lucide="${c.icon}" class="w-12 h-12 ${c.color}"></i>
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-start">
                    <div>
                        <h2 class="text-3xl text-white mb-1 flex items-center gap-2">${c.name} <span class="px-3 py-1 rounded-full bg-gray-800 border border-gray-600 text-xs text-gray-300 font-mono">Tier ${c.tier}</span></h2>
                        <p class="text-sm text-gray-400 italic">${c.desc}</p>
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2 mt-4">
                    <div class="bg-primary-dark/50 p-2 rounded border border-ui-border text-center">
                        <div class="text-xs text-gray-500">造价</div>
                        <div class="text-accent-energy font-mono"><i data-lucide="zap" class="w-3 h-3 inline"></i> ${c.cost}</div>
                    </div>
                    <div class="bg-primary-dark/50 p-2 rounded border border-ui-border text-center">
                        <div class="text-xs text-gray-500">基础产出</div>
                        <div class="text-accent-life font-mono">+${c.baseOutput}</div>
                    </div>
                    <div class="bg-primary-dark/50 p-2 rounded border border-ui-border text-center">
                        <div class="text-xs text-gray-500">生产周期</div>
                        <div class="text-white font-mono">${c.interval/1000}s</div>
                    </div>
                </div>
            </div>
        </div>
        <div class="mb-6"><h3 class="text-lg text-white mb-3 flex items-center gap-2"><i data-lucide="utensils" class="w-5 h-5 text-orange-400"></i> 能量来源 (捕食)</h3>
    `;
    if (c.foodConfig) {
        const targets = c.foodConfig.targets.map(tid => {
            const t = getCreatureDef(tid);
            return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-800 border border-gray-600 text-gray-300 text-xs"><i data-lucide="${t.icon}" class="w-3 h-3"></i> ${t.name}</span>`;
        }).join(' ');
        const modeBadge = c.foodConfig.mode === 'AND' ? `<span class="text-red-400 border border-red-900/50 bg-red-900/20 px-1 rounded">AND (必须同时)</span>` : `<span class="text-green-400 border border-green-900/50 bg-green-900/20 px-1 rounded">OR (任选其一)</span>`;
        html += `
            <div class="bg-primary-dark/30 p-4 rounded-xl border border-ui-border space-y-3">
                <div class="text-sm text-gray-300"><span class="text-gray-500">捕食模式:</span> ${modeBadge}</div>
                <div class="text-sm text-gray-300"><span class="text-gray-500">猎物列表:</span> ${targets}</div>
                <div class="grid grid-cols-2 gap-4 pt-2">
                    <div class="text-xs"><div class="text-gray-500">富余加速 (Buff)</div><div class="text-green-400 font-mono">+30% / 份</div></div>
                    <div class="text-xs"><div class="text-gray-500">造成捕食压力 (Debuff)</div><div class="text-orange-400 font-mono">-${Math.round(c.consumptionImpact * 100)}% (均摊)</div></div>
                </div>
            </div>`;
    } else {
        html += `<div class="p-3 rounded-xl bg-green-900/10 border border-green-900/30 text-green-400 text-sm flex items-center gap-2"><i data-lucide="sprout" class="w-4 h-4"></i> 自养生物 (无需进食)</div>`;
    }
    html += `</div><div><h3 class="text-lg text-white mb-3 flex items-center gap-2"><i data-lucide="network" class="w-5 h-5 text-blue-400"></i> 环境效应 (共生/竞争)</h3>`;
    if (c.relations && c.relations.length > 0) {
        html += `<div class="space-y-2">`;
        c.relations.forEach(rel => {
            const t = getCreatureDef(rel.target);
            const isGood = rel.val > 0;
            const colorClass = isGood ? 'border-cyan-900/50 bg-cyan-900/10' : 'border-purple-900/50 bg-purple-900/10';
            const iconColor = isGood ? 'text-cyan-400' : 'text-purple-400';
            const valText = isGood ? `+${Math.round(rel.val * 100)}%` : `${Math.round(rel.val * 100)}%`;
            html += `
                <div class="flex items-center justify-between p-3 rounded-lg border ${colorClass}">
                    <div class="flex items-center gap-3">
                        <div class="p-1.5 rounded bg-primary-dark border border-gray-700"><i data-lucide="${t.icon}" class="w-4 h-4 text-gray-400"></i></div>
                        <div><div class="text-sm text-gray-200">${rel.msg}</div><div class="text-xs text-gray-500">相邻 ${t.name} 时</div></div>
                    </div>
                    <div class="font-mono text-lg ${iconColor}">${valText}</div>
                </div>`;
        });
        html += `</div>`;
    } else {
        html += `<div class="text-sm text-gray-500 italic p-2">该生物没有特殊的共生或竞争关系。</div>`;
    }
    html += `</div>`;
    detailContent.innerHTML = html;
    lucide.createIcons({root: detailContent});
    detailOverlay.classList.remove('hidden');
    setTimeout(() => { detailOverlay.classList.remove('opacity-0'); detailCard.classList.remove('scale-95'); detailCard.classList.add('scale-100'); }, 10);
}

function closeWikiDetail(event) {
    const detailOverlay = document.getElementById('wiki-detail-overlay');
    const detailCard = document.getElementById('wiki-detail-card');
    if (event && event.target === detailCard) return;
    detailOverlay.classList.add('opacity-0');
    detailCard.classList.remove('scale-100');
    detailCard.classList.add('scale-95');
    setTimeout(() => { detailOverlay.classList.add('hidden'); }, 300);
}

function drawConnections() {
    const container = document.getElementById('wiki-content-wrapper');
    const svg = document.getElementById('connection-lines');
    const oldLines = svg.querySelectorAll('path.connection-line');
    oldLines.forEach(l => l.remove());
    const containerRect = container.getBoundingClientRect();
    svg.setAttribute('height', container.offsetHeight);
    svg.setAttribute('width', container.offsetWidth);

    function getIconBoxCoords(nodeId) {
        const node = document.getElementById(nodeId);
        if (!node) return null;
        const iconBox = node.querySelector('div'); 
        const rect = iconBox.getBoundingClientRect();
        return { top: rect.top - containerRect.top, bottom: rect.bottom - containerRect.top, centerX: (rect.left + rect.width / 2) - containerRect.left, centerY: (rect.top + rect.height / 2) - containerRect.top };
    }

    function createPath(d, color, dashArray, width, type) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('class', 'connection-line cursor-pointer transition-all duration-300');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', width);
        path.setAttribute('fill', 'none');
        if (type === 'food') path.setAttribute('marker-end', 'url(#arrowhead)');
        if (dashArray) path.setAttribute('stroke-dasharray', dashArray);
        path.addEventListener('mouseenter', () => {
            path.setAttribute('stroke-width', parseInt(width) + 2);
            path.setAttribute('stroke', type === 'food' ? '#94a3b8' : (type === 'symbiosis' ? '#22d3ee' : '#c084fc'));
            path.setAttribute('filter', 'url(#glow-line)');
            path.setAttribute('stroke-dasharray', '0'); 
            svg.appendChild(path); 
        });
        path.addEventListener('mouseleave', () => {
            path.setAttribute('stroke-width', width);
            path.setAttribute('stroke', color);
            path.removeAttribute('filter');
            if (dashArray) path.setAttribute('stroke-dasharray', dashArray);
        });
        svg.appendChild(path);
    }

    CREATURES.forEach(creature => {
        const predatorCoords = getIconBoxCoords(`wiki-node-${creature.id}`);
        if (!predatorCoords) return;
        if (creature.foodConfig) {
            const isAndMode = creature.foodConfig.mode === 'AND';
            const dashStyle = isAndMode ? '0' : '6, 6'; 
            const widthStyle = isAndMode ? '2.5' : '1.5'; 
            creature.foodConfig.targets.forEach(preyId => {
                const preyCoords = getIconBoxCoords(`wiki-node-${preyId}`);
                if (!preyCoords) return;
                const startX = preyCoords.centerX;
                const startY = preyCoords.top; 
                const endX = predatorCoords.centerX;
                const endY = predatorCoords.bottom + 5;
                const dist = Math.abs(startY - endY);
                const curveFactor = dist > 200 ? 0.6 : 0.5; 
                const d = `M ${startX} ${startY} C ${startX} ${startY - dist * curveFactor}, ${endX} ${endY + dist * curveFactor}, ${endX} ${endY}`;
                createPath(d, '#475569', dashStyle, widthStyle, 'food');
            });
        }
        if (creature.relations) {
            creature.relations.forEach(rel => {
                const targetCoords = getIconBoxCoords(`wiki-node-${rel.target}`);
                if (!targetCoords) return;
                const isSelf = (creature.id === rel.target);
                let d = '';
                if (isSelf) {
                    const startX = predatorCoords.centerX;
                    const startY = predatorCoords.top;
                    const r = 25;
                    d = `M ${startX - 5} ${startY} C ${startX - r} ${startY - r*1.5}, ${startX + r} ${startY - r*1.5}, ${startX + 5} ${startY}`;
                } else {
                    const startX = predatorCoords.centerX;
                    const startY = predatorCoords.top;
                    const endX = targetCoords.centerX;
                    const endY = targetCoords.top;
                    if (Math.abs(startY - endY) < 20) {
                        const midX = (startX + endX) / 2;
                        const arcHeight = 80; 
                        d = `M ${startX} ${startY} Q ${midX} ${startY - arcHeight} ${endX} ${endY}`;
                    } else {
                        const dist = Math.abs(startY - endY);
                        d = `M ${startX} ${startY} C ${startX} ${startY - dist * 0.5}, ${endX} ${endY + dist * 0.5}, ${endX} ${endY}`;
                    }
                }
                if (rel.type === 'symbiosis') { createPath(d, '#0891b2', null, '2', 'symbiosis'); } 
                else if (rel.type === 'competition') { createPath(d, '#9333ea', '2, 4', '2', 'competition'); }
            });
        }
    });
}

// 窗口大小改变时重绘连接线
window.addEventListener('resize', () => {
    if (!document.getElementById('encyclopedia-modal').classList.contains('hidden')) {
        if (typeof drawConnections === 'function') {
            drawConnections();
        }
    }
});