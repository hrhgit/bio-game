// UI渲染相关功能
let lastRenderedIndex = -2;
let lastPanelMode = 'empty';

// 根据网格大小获取动态样式配置
// ui-renderer.js -> getGridScaleStyles

// ui-renderer.js -> getGridScaleStyles

function getGridScaleStyles() {
    const size = gameState.gridSize;
    
    // 3x3 (默认大尺寸)
    if (size <= 3) {
        return {
            levelText: 'text-[11px]',
            iconSize: 'w-3.5 h-3.5',
            arrowText: 'text-xs',
            gap: 'gap-0.5',
            floatText: 'text-xl'
        };
    } 
    // 4x4 (中等)
    else if (size === 4) {
        return {
            levelText: 'text-[10px]',
            iconSize: 'w-3 h-3',
            arrowText: 'text-[10px]',
            gap: 'gap-0.5',
            floatText: 'text-sm'
        };
    } 
    // ✅ 5x5 (紧凑 - 稍微比 4x4 小一点点，但比 6x6 大)
    else if (size === 5) {
        return {
            levelText: 'text-[9px]',     // 9px 字体，比 4x4 的 10px 小
            iconSize: 'w-2.5 h-2.5',     // 2.5 (10px) 图标
            arrowText: 'text-[9px]',
            gap: 'gap-px',
            floatText: 'text-[11px]'     // 飘字 11px
        };
    }
    // ✅ 6x6 (极小 - 只有到 6x6 时才缩到最小)
    else {
        return {
            levelText: 'text-[8px]',     // 8px 极限小字体
            iconSize: 'w-2 h-2',         // 2 (8px) 极小图标，防止拥挤
            arrowText: 'text-[8px]',
            gap: 'gap-px',
            floatText: 'text-[9px]'      // 飘字 9px，防止遮挡
        };
    }
}
// 判断某个生物是否已经解锁（按 id）
function isCreatureUnlocked(creatureDef) {
    return gameState.unlockedCreatureIds.has(creatureDef.id);
}

// 根据 id 获取肉鸽道具定义
function getRogueItemDef(id) {
    return ROGUE_ITEMS_POOL.find(it => it.id === id);
}

// 渲染单个格子的 HTML 结构


function buildCellInnerHTML(i, cellData) {
    // ✅ 获取动态样式
    const styles = getGridScaleStyles();

    if (cellData) {
        const c = getCreatureDef(cellData.creatureId);
        const isMax = cellData.level >= c.maxLevel;
        const borderClass = isMax ? 'max-level-border' : c.borderColor;

        return `
            <div id="cell-visual-${i}" class="absolute inset-0 rounded-xl border-2 transition-all duration-300 flex items-center justify-center overflow-hidden ${c.baseColor} ${borderClass}">
                <div id="cell-progress-${i}" class="absolute bottom-0 left-0 w-full transition-all duration-100 ease-linear z-0 ${c.fillColor}" style="height: ${cellData.progress}%"></div>
                <div id="cell-overlay-${i}" class="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300 opacity-0"></div>
                <div class="absolute inset-0 z-10 flex items-center justify-center icon-wrapper transition-transform duration-300">
                    <i data-lucide="${c.icon}" class="w-8 h-8 ${c.color}"></i>
                </div>
                <div class="absolute bottom-1.5 left-0 w-full text-center z-10">
                    <span id="cell-level-${i}" class="${styles.levelText} ${isMax ? 'text-accent-gold font-black' : 'text-white/70'} drop-shadow-md">
                        LV.${cellData.level}${isMax ? ' MAX' : ''}
                    </span>
                </div>
                <div id="cell-rate-${i}" class="absolute top-1 right-1 z-20 text-[10px]"></div>
            </div>
            <div class="float-container absolute -top-2 left-0 w-full pointer-events-none z-50 flex justify-center overflow-visible"></div>
        `;
    } else {
        return `
            <div id="cell-visual-${i}" class="absolute inset-0 rounded-xl border-2 border-ui-border bg-primary-dark hover:border-gray-500 opacity-50 hover:opacity-100 flex items-center justify-center transition-all">
                <i data-lucide="plus" class="w-6 h-6 text-gray-500"></i>
            </div>
        `;
    }
}

// 局部渲染某个 index 的格子
function renderSingleCell(i) {
    const cellData = gameState.cells[i];
    let cell = document.getElementById(`cell-container-${i}`);
    if (!cell) {
        cell = document.createElement('div');
        cell.id = `cell-container-${i}`;
        cell.className = 'relative group w-full h-full';
        cell.onclick = () => selectCell(i);
        gridEl.appendChild(cell);
    }
    cell.innerHTML = buildCellInnerHTML(i, cellData);
}


// 渲染网格
function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${gameState.gridSize}, 1fr)`;

    // 根据棋盘大小调整格子间距（3x3 大一点，6x6 紧凑一点）
    const baseGap = 48;
    const gap = Math.max(16, baseGap - (gameState.gridSize - 3) * 6);
    gridEl.style.gap = `${gap}px`;

    for (let i = 0; i < gameState.gridSize * gameState.gridSize; i++) {
        const cellData = gameState.cells[i];
        const cell = document.createElement('div');
        cell.id = `cell-container-${i}`;
        cell.className = 'relative group w-full h-full';
        cell.onclick = () => selectCell(i);
        cell.innerHTML = buildCellInnerHTML(i, cellData || null);
        gridEl.appendChild(cell);
    }

    if (gameState.selectedCellIndex !== -1) highlightCell(gameState.selectedCellIndex);
    lucide.createIcons();
}


// 更新单元格视觉效果





// ui-renderer.js -> updateCellVisuals

function updateCellVisuals(idx, cellData) {
    const visualEl = document.getElementById(`cell-visual-${idx}`);
    const progressEl = document.getElementById(`cell-progress-${idx}`);
    const levelEl = document.getElementById(`cell-level-${idx}`);
    const overlayEl = document.getElementById(`cell-overlay-${idx}`);
    const rateEl = document.getElementById(`cell-rate-${idx}`);
    const iconWrapper = visualEl?.querySelector('.icon-wrapper');

    if (!visualEl || !cellData) return;

    // ✅ 获取动态样式配置
    const styles = getGridScaleStyles();
    // 提取常用的类名，方便下面拼接字符串
    const sz = styles.iconSize;   // e.g. "w-3 h-3"
    const txt = styles.arrowText; // e.g. "text-[10px]"

    // 1. 更新进度条
    if (progressEl) {
        progressEl.style.height = `${cellData.progress}%`;
    }

    // 2. 更新等级文本
    if (levelEl) {
        const def = getCreatureDef(cellData.creatureId);
        const isMax = cellData.level >= def.maxLevel;
        const newText = `LV.${cellData.level}${isMax ? ' MAX' : ''}`;
        
        if (levelEl.innerText !== newText) {
            levelEl.innerText = newText;
            // ✅ 使用 styles.levelText 动态控制字体大小
            levelEl.className = `${styles.levelText} ${isMax ? 'text-accent-gold font-normal' : 'text-white/90 font-normal'}`;
        }
        
        if (isMax) {
            if (!visualEl.classList.contains('max-level-border')) {
                visualEl.classList.remove(def.borderColor);
                visualEl.classList.add('max-level-border');
            }
        }
    }

    // 3. 状态特效
    if (cellData.state === 'dying') {
        if (!visualEl.classList.contains('dying-state')) {
            visualEl.classList.add('dying-state');
            overlayEl.className = 'absolute inset-0 z-0 pointer-events-none dying-overlay opacity-100';
            iconWrapper.classList.add('animate-shake');
        }
    } else {
        if (visualEl.classList.contains('dying-state')) {
            visualEl.classList.remove('dying-state');
            overlayEl.className = 'absolute inset-0 z-0 pointer-events-none transition-opacity duration-300 opacity-0';
            iconWrapper.classList.remove('animate-shake');
        }
    }

    // 4. 图标生成 (使用动态尺寸 sz 和 txt)
    let iconsHtml = '';

    if (cellData.state === 'dying') {
        iconsHtml += `<span class="text-red-500 ${txt}">!</span>`;
    } else {
        // 速度箭头
        if (cellData.speedMultiplier > 1.0) iconsHtml += `<span class="text-green-400 ${txt}">▲</span>`;
        else if (cellData.speedMultiplier < 1.0) iconsHtml += `<span class="text-red-400 ${txt}">▼</span>`;

        // 基础 Buff
        if (cellData.buffs > 0) iconsHtml += `<i data-lucide="utensils" class="${sz} text-green-400"></i>`;
        if (cellData.symbiosis > 0) iconsHtml += `<i data-lucide="heart-handshake" class="${sz} text-cyan-400"></i>`;

        // 肉鸽道具图标
        if (cellData.mutationBuffs > 0) {
            const def = getCreatureDef(cellData.creatureId);
            const { x, y } = getXY(idx, gameState.gridSize);
            const size = gameState.gridSize;

            if (hasMutation('abyssal_pressure') && y === size - 1) iconsHtml += `<i data-lucide="arrow-down-to-line" class="${sz} text-blue-300"></i>`;
            if (hasMutation('surface_bloom') && y === 0 && def.category === 'plant') iconsHtml += `<i data-lucide="sun" class="${sz} text-yellow-300"></i>`;
            if (hasMutation('cornerstones') && ((x===0&&y===0) || (x===size-1&&y===0) || (x===0&&y===size-1) || (x===size-1&&y===size-1))) iconsHtml += `<i data-lucide="move-diagonal" class="${sz} text-gray-300"></i>`;
            if (hasMutation('pioneer_swarm') && (x===0 || x===size-1 || y===0 || y===size-1)) iconsHtml += `<i data-lucide="maximize" class="${sz} text-cyan-300"></i>`;
            
            if (hasMutation('central_dogma')) {
                const center = (size - 1) / 2;
                if (Math.abs(x - center) < 0.6 && Math.abs(y - center) < 0.6) iconsHtml += `<i data-lucide="target" class="${sz} text-fuchsia-400"></i>`;
            }

            if (hasMutation('hyper_metabolism')) {
                const checkLine = (isRow) => {
                    let sequence = [];
                    for (let k = 0; k < size; k++) {
                        const cIdx = isRow ? getIndex(k, y, size) : getIndex(x, k, size);
                        const c = gameState.cells[cIdx];
                        if (c) sequence.push(getCreatureDef(c.creatureId).tier);
                    }
                    if (sequence.length < 2) return false;
                    for (let i = 0; i < sequence.length - 1; i++) {
                        if (sequence[i] >= sequence[i+1]) return false;
                    }
                    return true;
                };
                if (checkLine(true) || checkLine(false)) iconsHtml += `<i data-lucide="trending-up" class="${sz} text-amber-400"></i>`;
            }

            if (hasMutation('triplet_resonance')) {
                 const checkTriple = (dx, dy) => {
                    const n1 = getIndex(x-dx, y-dy, size);
                    const n2 = getIndex(x+dx, y+dy, size);
                    return n1!==-1 && n2!==-1 && gameState.cells[n1]?.creatureId===cellData.creatureId && gameState.cells[n2]?.creatureId===cellData.creatureId;
                };
                if (checkTriple(1,0) || checkTriple(0,1)) iconsHtml += `<i data-lucide="align-justify" class="${sz} text-sky-300"></i>`;
            }

            if (hasMutation('quad_core')) {
                const checkSquare = (dx, dy) => { 
                    const n1 = getIndex(x+dx, y, size); 
                    const n2 = getIndex(x, y+dy, size); 
                    const n3 = getIndex(x+dx, y+dy, size); 
                    return n1!==-1 && n2!==-1 && n3!==-1 && gameState.cells[n1]?.creatureId === cellData.creatureId && gameState.cells[n2]?.creatureId === cellData.creatureId && gameState.cells[n3]?.creatureId === cellData.creatureId; 
                }; 
                if (checkSquare(1,1) || checkSquare(-1,1) || checkSquare(1,-1) || checkSquare(-1,-1)) iconsHtml += `<i data-lucide="box" class="${sz} text-purple-400"></i>`;
            }
            
            if (hasMutation('interlaced_complement')) {
                const neighbors = getNeighbors(idx);
                const hasSame = neighbors.some(n => gameState.cells[n]?.creatureId === cellData.creatureId);
                if (!hasSame) iconsHtml += `<i data-lucide="grid-2x2" class="${sz} text-emerald-400"></i>`;
            }

            if (hasMutation('ecological_mosaic')) {
                const neighbors = getNeighbors(idx);
                const validNeighbors = neighbors.filter(n => gameState.cells[n]);
                if (validNeighbors.length > 0) {
                    const neighborTypes = new Set(validNeighbors.map(n => gameState.cells[n].creatureId));
                    if (neighborTypes.size === validNeighbors.length && !neighborTypes.has(cellData.creatureId)) {
                        iconsHtml += `<i data-lucide="layout-dashboard" class="${sz} text-teal-300"></i>`;
                    }
                }
            }

            if (hasMutation('chloroplast_outburst') && def.tier === 1 && def.category === 'plant') iconsHtml += `<i data-lucide="leaf" class="${sz} text-green-400"></i>`;
            if (hasMutation('predator_instinct') && def.tier >= 4 && def.foodConfig) iconsHtml += `<i data-lucide="swords" class="${sz} text-red-400"></i>`;
            if (hasMutation('schooling_storm') && def.category === 'arthropod') iconsHtml += `<i data-lucide="shell" class="${sz} text-orange-300"></i>`;
            if (hasMutation('apex_presence') && def.tier <= 2) iconsHtml += `<i data-lucide="crown" class="${sz} text-amber-400"></i>`;
        }

        // 基础 Debuff
        if (cellData.debuffs > 0) iconsHtml += `<i data-lucide="bone" class="${sz} text-yellow-500"></i>`;
        if (cellData.competition < 0) iconsHtml += `<i data-lucide="users" class="${sz} text-purple-400"></i>`;
    }

    const lastHtml = rateEl.getAttribute('data-last-html');
    if (lastHtml !== iconsHtml) {
        if (iconsHtml) {
            // ✅ 使用 styles.gap 动态调整间距
            rateEl.className = `absolute top-1 right-1 z-20 flex flex-wrap justify-end items-center ${styles.gap} bg-black/60 backdrop-blur-md rounded px-1.5 py-0.5 pointer-events-none border border-white/10 max-w-[90%]`;
            rateEl.innerHTML = iconsHtml;
            lucide.createIcons({ root: rateEl });
        } else {
            rateEl.className = "hidden";
            rateEl.innerHTML = "";
        }
        rateEl.setAttribute('data-last-html', iconsHtml);
    }
}

// 渲染详情面板
function renderDetailPanel(index, animate = true) {
    if (index === -1) {
        if (lastPanelMode !== 'empty') {
            detailPanel.innerHTML = `
                <div class="h-full flex flex-col items-center justify-center text-gray-500 opacity-60">
                    <i data-lucide="microscope" class="w-16 h-16 mb-4 stroke-1"></i>
                    <p class="text-lg">请选择区域</p>
                </div>`;
            lucide.createIcons();
            lastRenderedIndex = -1;
            lastPanelMode = 'empty';
        }
        return;
    }

    const cell = gameState.cells[index];
    const currentMode = cell ? 'detail' : 'build';
    const needsFullRender = (index !== lastRenderedIndex) || (currentMode !== lastPanelMode);

    if (needsFullRender) {
        lastRenderedIndex = index;
        lastPanelMode = currentMode;
        const animClass = animate ? 'animate-fade-in' : '';
        
        if (cell) {
            const def = getCreatureDef(cell.creatureId);
            const isMax = cell.level >= def.maxLevel;
            
            detailPanel.innerHTML = `
                <div class="bg-primary-dark border border-ui-border rounded-xl p-5 ${animClass}">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-16 h-16 rounded-xl ${def.fillColor} border ${def.borderColor} flex items-center justify-center shadow-lg relative">
                            <i data-lucide="${def.icon}" class="w-8 h-8 text-white"></i>
                            ${isMax ? '<div class="absolute -top-2 -right-2 text-yellow-400 animate-bounce">👑</div>' : ''}
                        </div>
                        <div>
                            <h3 class="text-xl ${def.color}">${def.name}</h3>
                            <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span id="panel-level-text" class="${isMax ? 'text-accent-gold' : 'text-gray-400'}">LV.${cell.level} / ${def.maxLevel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-3 text-sm text-gray-400 bg-secondary-dark/50 p-4 rounded-lg">
                        <div class="flex justify-between items-start">
                            <span>当前产出 (单次/周期)</span>
                            <div class="text-right">
                                <span id="panel-efficiency" class="text-accent-energy text-lg">--</span>
                                <div id="panel-status-text"></div>
                            </div>
                        </div>
                    </div>
                    <button onclick="removeCreature()" class="mt-6 w-full py-3 border border-red-900/50 text-red-400 rounded-lg hover:bg-red-900/20 transition flex items-center justify-center gap-2 group">
                        <i data-lucide="trash-2" class="w-4 h-4"></i> 清除物种
                    </button>
                </div>`;
        } else {
            let html = `<div id="build-list" class="space-y-3 ${animClass} pb-4">`;
            // 只显示已解锁的生物，并按价格排序
            const sortedCreatures = CREATURES
                .filter(c => isCreatureUnlocked(c))
                .sort((a, b) => a.cost - b.cost);
            
            const neighbors = getNeighbors(index);
            const neighborCreatureIds = neighbors.map(nIdx => gameState.cells[nIdx]?.creatureId).filter(Boolean);

            sortedCreatures.forEach(c => {
                const canAfford = gameState.energy >= c.cost;
                let isEnvSatisfied = true;
                let foodStatusHTML = '';

                if (c.foodConfig) {
                    const isAnd = c.foodConfig.mode === 'AND';
                    let satisfyCount = 0;

                    const targetBadges = c.foodConfig.targets.map(tid => {
                        const t = getCreatureDef(tid);
                        const isPresent = neighborCreatureIds.includes(tid);
                        
                        if (isPresent) satisfyCount++;

                        if (isPresent) {
                            return `<span class="inline-flex items-center gap-1 bg-green-900/10 px-1.5 py-0.5 rounded border border-green-500/30 whitespace-nowrap">
                                <i data-lucide="check" class="w-2.5 h-2.5 text-green-500 stroke-[3]"></i>
                                <i data-lucide="${t.icon}" class="w-2.5 h-2.5 ${t.color}"></i>
                                <span class="text-[9px] ${t.color}">${t.name}</span>
                            </span>`;
                        } else {
                            return `<span class="inline-flex items-center gap-1 bg-red-900/10 px-1.5 py-0.5 rounded border border-red-900/30 whitespace-nowrap">
                                <i data-lucide="x" class="w-2.5 h-2.5 text-red-500 stroke-[3]"></i>
                                <i data-lucide="${t.icon}" class="w-2.5 h-2.5 ${t.color} opacity-50"></i>
                                <span class="text-[9px] ${t.color} opacity-50 line-through decoration-red-500/50">${t.name}</span>
                            </span>`;
                        }
                    });

                    if (isAnd) {
                        isEnvSatisfied = satisfyCount === c.foodConfig.targets.length;
                    } else {
                        isEnvSatisfied = satisfyCount > 0;
                    }

                    const separator = isAnd 
                        ? `<span class="text-red-500/50 mx-0.5 text-[9px]">+</span>` 
                        : `<span class="text-gray-600 mx-0.5 text-[9px]">/</span>`;
                    
                    const modeIcon = isAnd 
                        ? `<i data-lucide="link" class="w-3 h-3 ${isEnvSatisfied ? 'text-green-400' : 'text-red-400'}" title="必须同时摄取"></i>` 
                        : `<i data-lucide="utensils" class="w-3 h-3 ${isEnvSatisfied ? 'text-green-400' : 'text-gray-500'}" title="任选其一"></i>`;

                    foodStatusHTML = `<div id="food-req-${c.id}" class="flex items-center gap-1 overflow-hidden mt-0.5 transition-transform duration-200 origin-left">
                        ${modeIcon}
                        <div class="flex items-center truncate text-[10px]">
                            ${targetBadges.join(separator)}
                        </div>
                    </div>`;
                } else {
                    foodStatusHTML = `<span id="food-req-${c.id}" class="text-accent-life text-[10px] flex items-center gap-1"><i data-lucide="sprout" class="w-3 h-3"></i> 自养</span>`;
                }

                let wrapperClass = "relative group transition-all duration-200";
                let cardClass = "w-full h-[4.5rem] rounded-xl border-2 px-3 flex items-center gap-3 transition-all overflow-hidden";
                let btnClass = "shrink-0 w-[4.5rem] h-12 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all active:scale-95 group/btn border-t border-x";
                
                let costIconClass = "w-3.5 h-3.5 fill-current";
                let costTextClass = "font-mono text-lg font-normal leading-none flex items-center gap-0.5";
                let outTextClass = "font-mono text-[10px] font-normal";
                
                let btnTopContent = `<i data-lucide="zap" class="${costIconClass}"></i><span>${c.cost}</span>`;
                let btnBottomContent = `<span>+${c.baseOutput}/${c.interval / 1000}s</span>`;

                if (canAfford) {
                    wrapperClass += " cursor-pointer"; 
                    cardClass += " bg-[#162032] border-accent-energy shadow-lg neon-border hover:scale-[1.01]";
                    btnClass += " bg-gradient-to-b from-[#2a3f5a] to-[#1a2c42] hover:from-[#324a68] hover:to-[#203550] border-accent-energy/30 btn-3d-blue";
                    costTextClass += " text-accent-energy group-hover/btn:text-white transition-colors";
                    outTextClass += " text-accent-life/90 group-hover/btn:text-accent-life";
                } else {
                    wrapperClass += " grayscale opacity-60 cursor-not-allowed"; 
                    cardClass += " bg-[#162032] border-gray-700"; 
                    btnClass += " bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 btn-3d-gray"; 
                    costTextClass += " text-gray-400";
                    outTextClass += " text-gray-600";
                }

                const category = CATEGORIES[c.category];
                const badge = category ? `<div class="shrink-0 px-1.5 py-0.5 rounded border border-gray-700 bg-black/20 flex items-center gap-1 text-gray-400"><i data-lucide="${category.icon}" class="w-2.5 h-2.5"></i><span class="text-[9px]">${category.name}</span></div>` : '';

                html += `
                    <div id="card-wrapper-${c.id}" class="${wrapperClass}">
                        <div id="card-inner-${c.id}" class="${cardClass}">
                            
                            <div class="shrink-0">
                                <div class="w-11 h-11 rounded-lg ${c.fillColor} flex items-center justify-center shadow-inner border shrink-0 border-white/10">
                                    <i data-lucide="${c.icon}" class="w-6 h-6 text-white stroke-[2]"></i>
                                </div>
                            </div>

                            <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5 h-full">
                                <div class="flex items-center justify-between w-full pr-2">
                                    <span class="text-sm text-gray-100 truncate">${c.name}</span>
                                    ${badge}
                                </div>
                                <div class="flex flex-col justify-center h-6">
                                    ${foodStatusHTML}
                                </div>
                            </div>

                            <button id="btn-build-${c.id}" onclick="placeCreature('${c.id}')" class="${btnClass}" ${canAfford ? '' : 'disabled'}>
                                <div id="btn-cost-text-${c.id}" class="${costTextClass}">
                                    ${btnTopContent}
                                </div>
                                <div id="btn-out-text-${c.id}" class="${outTextClass}">
                                    ${btnBottomContent}
                                </div>
                            </button>

                        </div>
                    </div>`;
            });
            html += `</div>`;
            detailPanel.innerHTML = html;
        }
        lucide.createIcons();
    }
    if (cell) {
        updateDetailPanelDynamic(index);
    }
 
}
// 只更新右侧详情面板里“会变的那部分”（效率、等级、状态）
// 不重画整个 HTML
// 只更新右侧详情面板里"会变的那部分"（效率、等级、状态）
function updateDetailPanelDynamic(index) {
    const cell = gameState.cells[index];
    if (!cell) return;

    const def = getCreatureDef(cell.creatureId);
    const buffValue = gameState.activeBuffs[cell.creatureId] || 0;
    // 基础产出 + 道具叠加(boost) + 等级加成
    const currentOutput = Math.floor(
        (def.baseOutput + buffValue) * (1 + (cell.level - 1) * 0.2)
    );

    // 1. 更新产出文本
    const effEl = document.getElementById('panel-efficiency');
    if (effEl) {
        effEl.innerText = `${currentOutput} / ${def.interval / 1000}s`;
    }

    // 2. 更新等级文本
    const lvlEl = document.getElementById('panel-level-text');
    if (lvlEl) {
        const isMax = cell.level >= def.maxLevel;
        lvlEl.innerText = `LV.${cell.level} / ${def.maxLevel}`;
        lvlEl.className = isMax ? 'text-accent-gold' : 'text-gray-400';
    }

    // 3. 更新状态列表 (Buff/Debuff 详情)
    const statusEl = document.getElementById('panel-status-text');
    if (statusEl) {
        let statusHtml = '';

        // --- A. 基础机制显示 (食物/共生/竞争/捕食) ---
        if (cell.buffs > 0) {
            statusHtml += `<div class="flex items-center gap-1 text-green-400 text-xs mt-1">
                <i data-lucide="leaf" class="w-3 h-3"></i> 食物充沛 (+${Math.round(cell.buffs * 100)}%)
            </div>`;
        }
        if (cell.symbiosis > 0) {
            statusHtml += `<div class="flex items-center gap-1 text-emerald-400 text-xs mt-1">
                <i data-lucide="sparkles" class="w-3 h-3"></i> 环境共生 (+${Math.round(cell.symbiosis * 100)}%)
            </div>`;
        }
        if (cell.competition < 0) {
            statusHtml += `<div class="flex items-center gap-1 text-amber-400 text-xs mt-1">
                <i data-lucide="shield-alert" class="w-3 h-3"></i> 资源竞争 (${Math.round(cell.competition * 100)}%)
            </div>`;
        }
        if (cell.debuffs > 0) {
            statusHtml += `<div class="flex items-center gap-1 text-red-400 text-xs mt-1">
                <i data-lucide="flame" class="w-3 h-3"></i> 受到捕食 (-${Math.round(cell.debuffs * 100)}%)
            </div>`;
        }
        if (cell.speedMultiplier <= 0) {
            statusHtml += `<div class="flex items-center gap-1 text-red-500 text-xs mt-1">
                <i data-lucide="skull" class="w-3 h-3"></i> 极度饥饿/被捕食殆尽
            </div>`;
        }

        // --- B. 肉鸽道具详情拆解 (替代原本笼统的 "突变加成") ---
        // 我们在这里临时计算一遍哪些道具对【这个格子】生效，并列出来
        const activeItemBuffs = [];
        const { x, y } = getXY(index, gameState.gridSize);
        const size = gameState.gridSize;

        // 辅助：获取并格式化
        const addBuff = (name, val, icon = 'zap', color = 'text-violet-300') => {
            if (val > 0.001) { // 忽略 0 加成
                activeItemBuffs.push({ name, val, icon, color });
            }
        };

        // 1. 深海高压
        if (hasMutation('abyssal_pressure') && y === size - 1) 
            addBuff('深海高压', 0.2, 'arrow-down-to-line');

        // 2. 表层光合
        if (hasMutation('surface_bloom') && y === 0 && def.category === 'plant') 
            addBuff('表层光合', 0.3, 'sun', 'text-yellow-300');

        // 3. 四角基石
        if (hasMutation('cornerstones')) {
            const isCorner = (x===0&&y===0) || (x===size-1&&y===0) || (x===0&&y===size-1) || (x===size-1&&y===size-1);
            if (isCorner) addBuff('四角基石', 0.4, 'move-diagonal');
        }

        // 4. 先锋群落
        if (hasMutation('pioneer_swarm') && (x===0 || x===size-1 || y===0 || y===size-1)) 
            addBuff('先锋群落', 0.2, 'maximize');

        // 5. 中央意识核
        if (hasMutation('central_dogma')) {
            const center = (size - 1) / 2;
            if (Math.abs(x - center) < 0.6 && Math.abs(y - center) < 0.6) 
                addBuff('中央意识核', 2.0, 'target', 'text-fuchsia-400');
        }

        // 6. 进化阶梯 (原急速代谢)
        if (hasMutation('hyper_metabolism')) {
            const checkLine = (isRow) => {
                let sequence = [];
                for (let k = 0; k < size; k++) {
                    const cIdx = isRow ? getIndex(k, y, size) : getIndex(x, k, size);
                    const c = gameState.cells[cIdx];
                    if (c) sequence.push(getCreatureDef(c.creatureId).tier);
                }
                if (sequence.length < 2) return 0;
                for (let i = 0; i < sequence.length - 1; i++) {
                    if (sequence[i] >= sequence[i+1]) return 0;
                }
                return sequence.length;
            };
            const rowLen = checkLine(true);
            const colLen = checkLine(false);
            if (rowLen) addBuff(`进化阶梯(横-${rowLen})`, 0.2 * rowLen, 'trending-up', 'text-amber-400');
            if (colLen) addBuff(`进化阶梯(纵-${colLen})`, 0.2 * colLen, 'trending-up', 'text-amber-400');
        }

        // 7. 三相共振
        if (hasMutation('triplet_resonance')) {
            const checkTriple = (dx, dy) => {
                const n1 = getIndex(x-dx, y-dy, size);
                const n2 = getIndex(x+dx, y+dy, size);
                return n1!==-1 && n2!==-1 && gameState.cells[n1]?.creatureId===cell.creatureId && gameState.cells[n2]?.creatureId===cell.creatureId;
            };
            if (checkTriple(1,0) || checkTriple(0,1)) 
                addBuff('三相共振', 0.6, 'align-justify', 'text-sky-300');
        }

        // 8. 四核矩阵
        if (hasMutation('quad_core')) {
            const checkSquare = (dx, dy) => { 
                const n1 = getIndex(x+dx, y, size); 
                const n2 = getIndex(x, y+dy, size); 
                const n3 = getIndex(x+dx, y+dy, size); 
                return n1!==-1 && n2!==-1 && n3!==-1 && gameState.cells[n1]?.creatureId === cell.creatureId && gameState.cells[n2]?.creatureId === cell.creatureId && gameState.cells[n3]?.creatureId === cell.creatureId; 
            }; 
            if (checkSquare(1,1) || checkSquare(-1,1) || checkSquare(1,-1) || checkSquare(-1,-1)) 
                addBuff('四核矩阵', 0.8, 'box', 'text-purple-400');
        }

        // 9. 交错生态
        if (hasMutation('interlaced_complement')) {
            const neighbors = getNeighbors(index);
            const hasSame = neighbors.some(n => gameState.cells[n]?.creatureId === cell.creatureId);
            if (!hasSame) addBuff('交错生态', 0.2, 'grid-2x2');
        }

        // 10. 生态马赛克
        if (hasMutation('ecological_mosaic')) {
            const neighbors = getNeighbors(index);
            const validNeighbors = neighbors.filter(n => gameState.cells[n]);
            if (validNeighbors.length > 0) {
                const neighborTypes = new Set(validNeighbors.map(n => gameState.cells[n].creatureId));
                if (neighborTypes.size === validNeighbors.length && !neighborTypes.has(cell.creatureId)) {
                    addBuff('生态马赛克', 0.6, 'layout-dashboard', 'text-teal-300');
                }
            }
        }

        // 11. 叶绿爆发
        if (hasMutation('chloroplast_outburst') && def.tier === 1 && def.category === 'plant') 
            addBuff('叶绿爆发', 0.2, 'leaf', 'text-green-400');

        // 12. 掠食本能
        if (hasMutation('predator_instinct') && def.tier >= 4 && def.foodConfig) 
            addBuff('掠食本能', 0.4, 'swords', 'text-red-400');

        // 13. 潮汐共振 (全局)
        if (hasMutation('tidal_resonance')) 
            addBuff('潮汐共振', 0.18, 'waves', 'text-blue-300');

        // 需要全局统计的道具：临时统计一下
        if (hasMutation('schooling_storm') || hasMutation('thriving_diversity') || hasMutation('apex_presence')) {
            const allCreatureIds = new Set();
            let arthropodCount = 0;
            let highTierCount = 0;
            gameState.cells.forEach(c => {
                if (c) {
                    allCreatureIds.add(c.creatureId);
                    const d = getCreatureDef(c.creatureId);
                    if (d.category === 'arthropod') arthropodCount++;
                    if (d.tier >= 4) highTierCount++;
                }
            });

            if (hasMutation('schooling_storm') && def.category === 'arthropod') 
                addBuff('甲壳风暴', arthropodCount * 0.1, 'shell');
            
            if (hasMutation('thriving_diversity')) 
                addBuff('繁荣多样性', allCreatureIds.size * 0.05, 'library');
            
            if (hasMutation('apex_presence') && highTierCount > 0 && def.tier <= 2) 
                addBuff('顶级威压', highTierCount * 1.0, 'crown', 'text-amber-400');
        }

        // 14. 捕食循环 (全局)
        if (hasMutation('predation_cycle') && gameState.deathCounter > 0) {
            const val = Math.min(1.0, gameState.deathCounter * 0.05);
            addBuff('捕食循环', val, 'recycle', 'text-rose-400');
        }


        // 渲染道具 Buff 列表
        activeItemBuffs.forEach(item => {
            statusHtml += `<div class="flex items-center gap-1 ${item.color} text-xs mt-1">
                <i data-lucide="${item.icon}" class="w-3 h-3"></i> ${item.name} (+${Math.round(item.val * 100)}%)
            </div>`;
        });

        // 兜底文本
        if (statusHtml === '') {
            statusHtml = `<div class="flex items-center gap-1 text-gray-500 text-xs mt-1">
                生态平衡 (无加成)
            </div>`;
        }

        if (statusEl.innerHTML !== statusHtml) {
            statusEl.innerHTML = statusHtml;
            lucide.createIcons({ root: statusEl });
        }
    }
}


// 渲染肉鸽道具



function renderRogueItems() { 
    const cont = document.getElementById('rogue-items-container'); 
    if (!cont) return; 

    cont.className = "flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2"; 

    if (!gameState.rogueShopItems.length) { 
        cont.innerHTML = `<div class="text-xs text-gray-500 text-center mt-4">暂无增益</div>`; 
        return; 
    } 

    let html = ''; 
    gameState.rogueShopItems.forEach((item) => { 
        // 1. 计算价格
        const cost = calculateRogueItemCost(item);
        const canAfford = gameState.energy >= cost && !item.bought; 

        // 2. ✅✅✅ 关键修复：直接访问 RARITY_THEME，不加 window 前缀
        // 之前因为加了 window. 导致读取失败，变成空对象，所以颜色全没了
        const rarity = item.rarity || '普通'; 
        let theme = {};
        try {
            if (typeof RARITY_THEME !== 'undefined' && RARITY_THEME[rarity]) {
                theme = RARITY_THEME[rarity];
            } else if (typeof RARITY_THEME !== 'undefined') {
                theme = RARITY_THEME['普通'];
            }
        } catch (e) {
            console.error("Theme load error:", e);
        }

        // 3. 卡片边框与背景
        // 如果 theme 读取成功，这里就会有颜色；否则显示默认边框
        const wrapperClass = item.bought
            ? `p-2 rounded-lg border-2 border-gray-800 bg-gray-900/50 opacity-50 grayscale transition-all scale-95`
            : `p-2 rounded-lg border-2 ${theme.border || 'border-gray-600'} ${theme.bg || 'bg-gray-800'} transition-all hover:shadow-lg`;

        // 4. 按钮样式
        let btnClass = "shrink-0 w-[4.5rem] h-full flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 text-[10px] transition-all shadow-sm px-1 py-1 ";

        if (item.bought) {
            btnClass += "border-gray-800 text-gray-600 bg-transparent cursor-default";
        } else if (canAfford) {
            // 这里之前你看到的是绿色的兜底样式，现在应该能正确读到 theme.btnEnabled 了
            btnClass += theme.btnEnabled || "border-green-600 text-green-400"; 
        } else {
            btnClass += "border-gray-800 text-gray-600 cursor-not-allowed";
        }

        // 5. ✅ 图标颜色与底色
        // 优先用道具自带(生物强化)，其次用品质主题(RARITY_THEME)，最后兜底
        const iconBg = item.bgColor || theme.iconBg || 'bg-gray-700';
        const iconColor = item.color || theme.icon || 'text-white';

        html += ` 
            <div class="${wrapperClass}"> 
                <div class="flex items-stretch gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5 overflow-hidden"> 
                            <div class="w-7 h-7 rounded-full ${iconBg} flex items-center justify-center shrink-0">
                                <i data-lucide="${item.icon || 'sparkles'}" class="w-4 h-4 ${iconColor}"></i>
                            </div>
                            <div class="min-w-0 flex items-center gap-1.5"> 
                                <div class="text-xs ${theme.title || 'text-gray-300'} leading-none truncate">${item.name}</div> 
                                <div class="text-[9px] opacity-70 ${theme.badge || 'text-gray-500'} shrink-0">${rarity}</div> 
                            </div> 
                        </div> 
                        <p class="text-[10px] text-gray-400 leading-tight line-clamp-2 h-6 opacity-90">${item.desc}</p> 
                    </div>

                    <button id="rogue-item-btn-${item.id}" class="${btnClass}" onclick="purchaseRogueItem('${item.id}')" ${item.bought || !canAfford ? 'disabled' : ''}> 
                        ${item.bought ? '<span>已激活</span>' : `<span>购买</span><span class="font-mono opacity-90 flex items-center gap-0.5 mt-0.5"><i data-lucide="zap" class="w-3 h-3 fill-current"></i>${cost}</span>`} 
                    </button> 
                </div>
            </div>`; 
    });

    // ... (保留原本的物种倍率 boostBadges 代码) ...
    const boostBadges = [];
    CREATURES.forEach(cre => {
        if (!gameState.unlockedCreatureIds || !gameState.unlockedCreatureIds.has(cre.id)) return;
        if (!cre.baseOutput || cre.baseOutput <= 0) return;
        const buffValue = (gameState.activeBuffs && gameState.activeBuffs[cre.id]) || 0;
        const multiplier = (cre.baseOutput + buffValue) / cre.baseOutput;
        const stacks = gameState.creatureBoostStacks ? (gameState.creatureBoostStacks[cre.id] || 0) : 0;
        boostBadges.push({ name: cre.name, multiplier, stacks });
    });

    if (boostBadges.length) {
        html += `
            <div class="mt-3 pt-2 border-t border-ui-border/60">
                <div class="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
                    <i data-lucide="activity" class="w-3 h-3"></i>
                    <span>物种特殊倍率</span>
                </div>
                <div class="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-300">
                    ${
                        boostBadges.map(b => `
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/30">
                                <span class="text-gray-400">${b.name}</span>
                                <span class="font-mono text-emerald-300">${b.multiplier.toFixed(2)}×</span>
                                ${ b.stacks > 0 ? `<span class="text-amber-300 text-[10px]">(${b.stacks}层)</span>` : '' }
                            </span>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }

    cont.innerHTML = html; 
    lucide.createIcons({ root: cont }); 
}
// 渲染下方道具栏（最多 5 个）
function renderRogueItemBar() {
    const cont = document.getElementById('item-bar-container');
    if (!cont) return;

    cont.className = "w-full h-full flex items-center justify-center";

    const itemsInBar = gameState.rogueItemBar || [];

    // 没有任何道具时，显示一段提示文案
    if (!itemsInBar.length) {
        cont.innerHTML = `
            <div class="text-xs text-gray-500 opacity-70">
                道具栏：还没有携带任何增益道具
            </div>
        `;
        return;
    }

    // 有道具时，用图标展示
    let html = `
        <div class="flex items-center gap-3 px-2 py-1 rounded-xl bg-primary-dark/60 border border-ui-border/70 shadow-inner">
    `;

    itemsInBar.slice(0, MAX_ROGUE_ITEM_BAR).forEach((itemId) => {
        const def = getRogueItemDef(itemId);
        if (!def) return;

        const rarity = def.rarity || '普通';
        const theme = RARITY_THEME[rarity] || RARITY_THEME['普通'];
        
        // 背景色逻辑：优先用生物自带背景，否则用品质背景
        const finalBgColor = def.bgColor || theme.iconBg || 'bg-gray-700';
        
        // ✅ 强制白色图标
        const finalIconColor = 'text-white';

        html += `
            <div 
                class="relative group cursor-pointer"
                onclick="showRogueItemDetail('${itemId}')"
            >
                <div class="w-10 h-10 rounded-lg ${finalBgColor} flex items-center justify-center border border-white/10 shadow-md transition-transform hover:scale-105">
                    <i data-lucide="${def.icon || 'sparkles'}" class="w-5 h-5 ${finalIconColor}"></i>
                </div>
                <!-- 悬停提示：黑底白字圆角块 -->
                <div class="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150
                            absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                            px-2 py-1 bg-black text-white text-[11px] rounded-lg shadow-lg whitespace-nowrap z-50">
                    ${def.name}
                </div>
            </div>
        `;
    });

    html += `</div>`;
    cont.innerHTML = html;

    // 创建 lucide 图标
    lucide.createIcons({ root: cont });
}

// 道具栏：点击某个道具时，在右侧详情面板显示其效果
// 道具栏：点击某个道具时，在右侧详情面板显示其效果
function showRogueItemDetail(itemId) {
    const itemDef = getRogueItemDef(itemId);
    if (!itemDef) return;

    if (typeof lastPanelMode !== 'undefined') {
        lastPanelMode = 'rogue';
    }
    if (typeof lastRenderedIndex !== 'undefined') {
        lastRenderedIndex = -1;
    }

    const animClass = 'animate-fade-in';
    const rarity = itemDef.rarity || '普通';
    
    // 获取主题配置
    const theme = (window.RARITY_THEME && RARITY_THEME[rarity]) ? RARITY_THEME[rarity] : { iconBg: 'bg-gray-700' };

    // 背景色逻辑：优先用生物自带背景，否则用品质背景
    const bgClass = itemDef.bgColor || theme.iconBg || 'bg-gray-800';
    
    // 强制白色图标
    const iconColor = 'text-white';

    detailPanel.innerHTML = `
        <div class="bg-primary-dark border border-ui-border rounded-xl p-5 ${animClass}">
            <div class="flex items-center gap-4 mb-4">
                <div class="w-14 h-14 rounded-xl ${bgClass} flex items-center justify-center shadow-lg border border-white/10">
                    <i data-lucide="${itemDef.icon || 'sparkles'}" class="w-7 h-7 ${iconColor}"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <h3 class="text-lg text-white truncate">${itemDef.name}</h3>
                        <span class="text-[11px] px-2 py-0.5 rounded-full border border-white/10 text-amber-300 whitespace-nowrap">
                            ${rarity}
                        </span>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                        深海试炼增益道具
                    </div>
                </div>
            </div>
            
            <div class="space-y-3 text-sm text-gray-300 bg-secondary-dark/40 p-4 rounded-lg leading-relaxed">
                <div class="flex items-start gap-2">
                    <i data-lucide="info" class="w-4 h-4 text-accent-life mt-0.5 shrink-0"></i>
                    <p>${itemDef.desc}</p>
                </div>
            </div>

            <div class="mt-4 text-[11px] text-gray-500 mb-6">
                已购买的道具会持续生效，直到被丢弃。
            </div>

            <button 
                onclick="removeRogueItem('${itemId}'); renderDetailPanel(-1);" 
                class="w-full py-3 border border-red-900/50 text-red-400 rounded-lg hover:bg-red-900/20 transition flex items-center justify-center gap-2 group"
            >
                <i data-lucide="trash-2" class="w-4 h-4 group-hover:scale-110 transition-transform"></i> 
                <span>丢弃道具</span>
            </button>
        </div>
    `;

    lucide.createIcons({ root: detailPanel });

    lucide.createIcons({ root: detailPanel });
}

// ================== 手机端侧栏抽屉 ==================

function isMobileViewport() {
    return window.innerWidth <= 1024;
}

function toggleLeftPanelMobile(force) {
    const panel = document.getElementById('left-panel');
    if (!panel) return;
    const willOpen = typeof force === 'boolean'
        ? force
        : !panel.classList.contains('mobile-panel-open');

    // 打开左抽屉时顺便关掉右抽屉，避免重叠
    const detail = document.getElementById('detail-panel-wrapper');
    if (willOpen && detail) {
        detail.classList.remove('mobile-panel-open');
    }

    panel.classList.toggle('mobile-panel-open', willOpen);
}

function toggleDetailPanelMobile(force) {
    const panel = document.getElementById('detail-panel-wrapper');
    if (!panel) return;
    const willOpen = typeof force === 'boolean'
        ? force
        : !panel.classList.contains('mobile-panel-open');

    // 打开右抽屉时顺便关掉左抽屉
    const left = document.getElementById('left-panel');
    if (willOpen && left) {
        left.classList.remove('mobile-panel-open');
    }

    panel.classList.toggle('mobile-panel-open', willOpen);
}

// 绑定两个按钮
document.addEventListener('DOMContentLoaded', () => {
    const leftBtn = document.getElementById('btn-toggle-left-panel');
    const rightBtn = document.getElementById('btn-toggle-detail-panel');

    if (leftBtn) {
        leftBtn.addEventListener('click', () => {
            if (!isMobileViewport()) return;
            toggleLeftPanelMobile();
        });
    }

    if (rightBtn) {
        rightBtn.addEventListener('click', () => {
            if (!isMobileViewport()) return;
            toggleDetailPanelMobile();
        });
    }
});

// 教程模态框开关
function toggleGuide() {
    const modal = document.getElementById('guide-modal');
    const content = document.getElementById('guide-content');
    
    if (modal.classList.contains('hidden')) {
        // 打开
        if (!gameState.isPaused) document.getElementById('pause-btn').click(); // 自动暂停
        
        modal.classList.remove('hidden');
        // 强制重绘，确保 transition 生效
        void modal.offsetWidth;
        
        modal.classList.remove('opacity-0');
        content.classList.remove('scale-95');
        
        // 生成图标
        lucide.createIcons({ root: content });
    } else {
        // 关闭
        modal.classList.add('opacity-0');
        content.classList.add('scale-95');
        
        setTimeout(() => {
            modal.classList.add('hidden');
            // 如果是因为开教程暂停的，关掉时可以考虑自动恢复，
            // 但为了安全起见（玩家可能想思考一下），通常保持暂停状态让玩家手动开始
        }, 300);
    }
}

// 颜色映射表：将 config.js 里的类名映射为实际颜色
const TAILWIND_COLORS = {
    'text-green-300': '#86efac',
    'text-fuchsia-300': '#f0abfc',
    'text-cyan-300': '#67e8f9',
    'text-pink-300': '#f9a8d4',
    'text-yellow-300': '#fde047',
    'text-indigo-300': '#a5b4fc',
    'text-emerald-300': '#6ee7b7',
    'text-violet-300': '#c4b5fd',
    'text-orange-300': '#fdba74',
    'text-red-500': '#ef4444',
    // 兜底颜色
    'default': '#ffffff'
};

// 触发格子的生产呼吸光特效
function triggerProductionGlow(idx, def) {
    const visualEl = document.getElementById(`cell-visual-${idx}`);
    if (!visualEl) return;

    // 1. 获取生物对应的 HEX 颜色
    const colorHex = TAILWIND_COLORS[def.color] || TAILWIND_COLORS['default'];

    // 2. 设置 CSS 变量
    visualEl.style.setProperty('--glow-color', colorHex);

    // 3. 重置并触发动画
    // 移除类 -> 强制重绘 (reflow) -> 添加类，确保动画每次都能从头播放
    visualEl.classList.remove('production-glow-effect');
    void visualEl.offsetWidth; 
    visualEl.classList.add('production-glow-effect');
}

// 给肉鸽按钮挂一个"能量是否足够"的 watcher
// 给肉鸽按钮挂 watcher：根据“当前能量是否足够且未购买”来控制启用/禁用
// 肉鸽道具按钮：用监视器统一控制「是否可购买」 → 启用 / 禁用 + 颜色


function setupRogueItemWatchers() {
    gameState.rogueShopItems.forEach(item => {
        uiVarMonitor.watchThreshold({
            key: `rogue-item-${item.id}`,
            // 使用统一计价函数
            getValue: () => (gameState.energy >= calculateRogueItemCost(item) && !item.bought),
            target: true,
            cmp: (val, target) => !!val === target,
            onChange(canBuy) {
                const btn = document.getElementById(`rogue-item-btn-${item.id}`);
                if (!btn) return;
                
                // 如果已购买，保持已激活状态，不被 watcher 覆盖
                if (item.bought) {
                    // 这里通常不需要动，因为 renderRogueItems 已经渲染好了，
                    // 但为了保险，可以保留之前的 disabled 逻辑，或者直接 return
                    return; 
                }

                // ✅✅✅ 关键修复：正确获取品质主题（去除 window. 前缀）
                const rarity = item.rarity || '普通';
                let theme = {};
                
                // 尝试获取主题，如果获取失败则回退到'普通'
                if (typeof RARITY_THEME !== 'undefined') {
                    theme = RARITY_THEME[rarity] || RARITY_THEME['普通'] || {};
                }

                // 获取品质对应的按钮样式
                // 如果 theme.btnEnabled 存在（例如 sky-600），就用它；否则才兜底用 green
                const enabledClass = theme.btnEnabled || "border-green-600 text-green-400";
                const disabledClass = "border-gray-800 text-gray-600 cursor-not-allowed";

                const baseClass = "shrink-0 w-[4.5rem] h-full flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 text-[10px] transition-all shadow-sm px-1 py-1 ";

                if (canBuy) {
                    btn.disabled = false;
                    // 这里将应用正确的品质色（如蓝色/紫色/金色）
                    btn.className = baseClass + enabledClass;
                } else {
                    btn.disabled = true;
                    btn.className = baseClass + disabledClass;
                }
            }
        });
    });
}


// 右侧建造按钮：使用监视器控制「能量是否足够」 → 启用 / 禁用 + 动画样式
function setupBuildButtonWatchers() {
    CREATURES
        .filter(c => gameState.unlockedCreatureIds.has(c.id))
        .forEach(c => {
            uiVarMonitor.watchThreshold({
                key: `build-btn-${c.id}`,
                getValue: () => gameState.energy,
                target: c.cost,
                onChange(canAfford) {
                    const wrapper = document.getElementById(`card-wrapper-${c.id}`);
                    const card = document.getElementById(`card-inner-${c.id}`);
                    const btn = document.getElementById(`btn-build-${c.id}`);
                    const costTextDiv = document.getElementById(`btn-cost-text-${c.id}`);
                    const outTextDiv = document.getElementById(`btn-out-text-${c.id}`);

                // 当前没有打开建造面板时，这些元素都不存在，直接跳过

                if (!wrapper || !card || !btn) return;

                if (canAfford) {
                    // 可购买：去灰、加 hover、3D 蓝按钮
                    wrapper.classList.remove('grayscale', 'opacity-60', 'cursor-not-allowed');
                    wrapper.classList.add('cursor-pointer');
                    
                    card.classList.remove('border-gray-700');
                    card.classList.add('border-accent-energy', 'shadow-lg', 'neon-border', 'hover:scale-[1.01]');
                    
                    btn.className = "shrink-0 w-[4.5rem] flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-all active:scale-95 group/btn border-t border-x bg-gradient-to-b from-[#2a3f5a] to-[#1a2c42] hover:from-[#324a68] hover:to-[#203550] border-accent-energy/30 btn-3d-blue";
                    btn.disabled = false;

                    if (costTextDiv) {
                        costTextDiv.className = "font-mono text-lg leading-none flex items-center gap-0.5 text-accent-energy group-hover/btn:text-white transition-colors";
                    }
                    if (outTextDiv) {
                        outTextDiv.className = "font-mono text-[10px] text-accent-life/90 group-hover/btn:text-accent-life";
                    }
                } else {
                    // 不可购买：灰掉、禁止 hover 高亮
                    wrapper.classList.add('grayscale', 'opacity-60', 'cursor-not-allowed');
                    wrapper.classList.remove('cursor-pointer');
                    
                    card.classList.add('border-gray-700');
                    card.classList.remove('border-accent-energy', 'shadow-lg', 'neon-border', 'hover:scale-[1.01]');
                    
                    btn.className = "shrink-0 w-[4.5rem] flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-all active:scale-95 group/btn border-t border-x bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 btn-3d-gray";
                    btn.disabled = true;

                    if (costTextDiv) {
                        costTextDiv.className = "font-mono text-lg leading-none flex items-center gap-0.5 text-gray-400";
                    }
                    if (outTextDiv) {
                        outTextDiv.className = "font-mono text-[10px] text-gray-600";
                    }
                }
            }
        });
    });
}

// 渲染关卡面板
function renderStagePanel() {
    const panel = document.getElementById('stage-panel');
    if (!panel) return;

    const conf = getStageConfig(gameState.currentStage);
    const rate = gameState.lastRatePerSec || 0;
    const ratio = Math.max(0, Math.min(1, rate / conf.reqRate));
    const payCost = conf.payCost;

    const nextStage = gameState.currentStage + 1;
    const nextUnlock = STAGE_UNLOCKS[nextStage];
    let unlockBadgeHtml = '';

    if (nextUnlock) {
        const hints = [];
        if (nextUnlock.creatureIds && nextUnlock.creatureIds.length) {
            hints.push('解锁新物种');
        }
        if (nextUnlock.gridSize) {
            hints.push('拓展网格');
        }
        const label = hints.join(' · ') || '新内容解锁';

        // 🔴 纯文字角标：轻微倾斜 + 文字自己呼吸放缩
        unlockBadgeHtml = `
            <div class="absolute -top-1 -right-1 pointer-events-none select-none">
                <span class="inline-block rotate-12">
                    <span class="unlock-badge-text inline-block">
                        ${label}
                    </span>
                </span>
            </div>
        `;
    } 
    panel.innerHTML = ` 
        <div class="rounded-xl border border-ui-border bg-primary-dark/70 p-3 space-y-3 backdrop-blur-sm"> 
            <div class="flex gap-2 items-stretch"> 
                <div class="flex-1 flex flex-col justify-between gap-2"> 
                    <div class="flex justify-between items-start"> 
                        <div> 
                            <div class="text-[11px] text-gray-400 mb-0.5">当前关卡</div> 
                            <div class="text-lg text-white font-semibold leading-none">第 ${conf.stage} 关</div> 
                        </div> 
                        <div class="text-right"> 
                            <div class="text-[11px] text-gray-400 mb-0.5">目标效率</div> 
                            <div class="text-xs text-accent-life font-mono leading-none">≥ ${conf.reqRate.toFixed(1)}/s</div> 
                        </div> 
                    </div> 

                    <div class="space-y-1"> 
                        <div class="flex justify-between text-[10px] text-gray-400"> 
                            <span>当前效率</span> 
                            <span id="stage-current-rate" class="font-mono text-gray-300">
                                ${rate.toFixed(1)}/s
                            </span> 
                        </div> 
                        <div class="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-white/5"> 
                            <div id="stage-progress-bar" class="h-2 rounded-full bg-gradient-to-r from-green-400 to-sky-400 transition-all duration-300 ease-out"
                                 style="width: ${ratio * 100}%;"></div> 
                        </div> 
                    </div> 
                </div> 

                <!-- FREE CLEAR 按钮：静态结构 + id -->
                <button 
                    id="stage-free-btn"
                    class="relative w-20 rounded-lg shadow-md transition-all duration-200
                        flex flex-col items-center justify-center shrink-0 gap-1.5 px-2 py-2
                        bg-gray-700 text-gray-500 cursor-not-allowed opacity-50"
                > 
                    <span class="font-extrabold text-sm leading-none">达成</span> 
                    <i data-lucide="circle-arrow-right" class="w-5 h-5 stroke-[2.5]"></i> 

                    ${unlockBadgeHtml}
                </button> 
            </div> 

            <!-- PAY CLEAR 按钮：同理 -->
            <button 
                id="stage-pay-btn"
                class="w-full py-1.5 rounded-lg border text-[11px] transition-transform transition-colors duration-200 flex items-center justify-center gap-1 
                       border-gray-700/50 text-gray-600 cursor-not-allowed"
            > 
                支付 <i data-lucide="zap" class="w-3 h-3 inline"></i> ${payCost} 强行通过 
            </button> 
        </div>`; 

    lucide.createIcons({ root: panel });
}

// 给关卡按钮挂 watcher
function setupStageUiWatchers() {
    const conf = getStageConfig(gameState.currentStage);

    // 1. 监控 当前效率 是否达到目标 (free clear)
    uiVarMonitor.watchThreshold({
        key: 'stage-free-clear',
        getValue: () => gameState.lastRatePerSec || 0,
        target: conf.reqRate,
        onChange(reached) {
            const btn = document.getElementById('stage-free-btn');
            if (!btn) return;

            if (reached) {
                // 达标：高亮、可点击
                btn.className = `
                    relative w-20 rounded-lg shadow-md transition-all duration-200
                    flex flex-col items-center justify-center shrink-0 gap-1.5 px-2 py-2
                    bg-accent-gold text-slate-900 hover:bg-[#fcd34d]
                    hover:scale-[1.02] active:scale-[0.96] cursor-pointer shadow-orange-500/20
                `.replace(/\s+/g, ' ');
                btn.onclick = () => tryCompleteStage(false);
            } else {
                // 未达标：灰掉、禁用
                btn.className = `
                    relative w-20 rounded-lg shadow-md transition-all duration-200
                    flex flex-col items-center justify-center shrink-0 gap-1.5 px-2 py-2
                    bg-gray-700 text-gray-500 cursor-not-allowed opacity-50
                `.replace(/\s+/g, ' ');
                btn.onclick = null;
            }
        }
    });

    // 2. 监控 能量是否足够强行通过 (pay clear)
    uiVarMonitor.watchThreshold({
        key: 'stage-pay-clear',
        getValue: () => gameState.energy,
        target: conf.payCost,
        onChange(canPay) {
            const btn = document.getElementById('stage-pay-btn');
            if (!btn) return;

            if (canPay) {
                btn.className = `
                    w-full py-1.5 rounded-lg border text-[11px]
                    transition-transform transition-colors duration-200
                    flex items-center justify-center gap-1 
                    border-accent-gold/40 text-accent-gold
                    hover:bg-accent-gold/10 active:scale-[0.98]
                `.replace(/\s+/g, ' ');
                btn.onclick = () => tryCompleteStage(true);
            } else {
                btn.className = `
                    w-full py-1.5 rounded-lg border text-[11px]
                    transition-transform transition-colors duration-200
                    flex items-center justify-center gap-1 
                    border-gray-700/50 text-gray-600 cursor-not-allowed
                `.replace(/\s+/g, ' ');
                btn.onclick = null;
            }
        }
    });
}

// 更新关卡面板动态部分
function updateStagePanelDynamic() {
    const conf = getStageConfig(gameState.currentStage);
    const rate = gameState.lastRatePerSec || 0;
    const ratio = Math.max(0, Math.min(1, rate / conf.reqRate));

    const rateSpan = document.getElementById('stage-current-rate');
    const bar = document.getElementById('stage-progress-bar');

    if (rateSpan) {
        rateSpan.innerText = `${rate.toFixed(1)}/s`;
        rateSpan.className = 
            'font-mono ' + (rate >= conf.reqRate ? 'text-accent-life' : 'text-gray-300');
    }

    if (bar) {
        bar.style.width = `${ratio * 100}%`;
    }
}

