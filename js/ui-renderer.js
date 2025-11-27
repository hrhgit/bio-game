// UI渲染相关功能
let lastRenderedIndex = -2;
let lastPanelMode = 'empty';

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
                    <span id="cell-level-${i}" class="text-[10px] ${isMax ? 'text-accent-gold font-black' : 'text-white/70'} drop-shadow-md">
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
function updateCellVisuals(idx, cellData) {
    const visualEl = document.getElementById(`cell-visual-${idx}`);
    const progressEl = document.getElementById(`cell-progress-${idx}`);
    const levelEl = document.getElementById(`cell-level-${idx}`);
    const overlayEl = document.getElementById(`cell-overlay-${idx}`);
    const rateEl = document.getElementById(`cell-rate-${idx}`);
    const iconWrapper = visualEl?.querySelector('.icon-wrapper');

    if (!visualEl || !cellData) return;

    if (progressEl) progressEl.style.height = `${cellData.progress}%`;
    if (levelEl) {
        const isMax = cellData.level >= getCreatureDef(cellData.creatureId).maxLevel;
        levelEl.innerText = `LV.${cellData.level}${isMax ? ' MAX' : ''}`;
        levelEl.className = `text-[10px] ${isMax ? 'text-accent-gold font-normal' : 'text-white/90 font-normal'}`;
        if (isMax) {
            visualEl.classList.remove(getCreatureDef(cellData.creatureId).borderColor);
            visualEl.classList.add('max-level-border');
        }
    }

    visualEl.classList.remove('dying-state');
    overlayEl.className = 'absolute inset-0 z-0 pointer-events-none transition-opacity duration-300 opacity-0'; 
    iconWrapper.classList.remove('animate-shake');
    
    let iconsHtml = '';

    if (cellData.state === 'dying') {
        visualEl.classList.add('dying-state');
        overlayEl.className = 'absolute inset-0 z-0 pointer-events-none dying-overlay opacity-100';
        iconWrapper.classList.add('animate-shake');
        iconsHtml += `<span class="text-red-500 text-xs">⚠</span>`;
    } else {
        if (cellData.speedMultiplier > 1.0) {
            iconsHtml += `<span class="text-green-400 text-xs">▲</span>`;
        } else if (cellData.speedMultiplier < 1.0) {
            iconsHtml += `<span class="text-red-400 text-xs">▼</span>`;
        }

        if (cellData.buffs > 0) {
            iconsHtml += `<i data-lucide="utensils" class="w-3 h-3 text-green-400"></i>`;
        }

        if (cellData.symbiosis > 0) {
            iconsHtml += `<i data-lucide="heart-handshake" class="w-3 h-3 text-cyan-400"></i>`;
        }

        if (cellData.mutationBuffs > 0) {
            iconsHtml += `<i data-lucide="sparkles" class="w-3 h-3 text-purple-300"></i>`;
        }

        if (cellData.debuffs > 0) {
            iconsHtml += `<i data-lucide="bone" class="w-3 h-3 text-yellow-500"></i>`;
        }

        if (cellData.competition < 0) {
            iconsHtml += `<i data-lucide="users" class="w-3 h-3 text-purple-400"></i>`;
        }
    }

    if (iconsHtml) {
        rateEl.className = "absolute top-1 right-1 z-20 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded px-1.5 py-0.5 pointer-events-none border border-white/10";
        rateEl.innerHTML = iconsHtml;
        lucide.createIcons({ root: rateEl });
    } else {
        rateEl.className = "hidden";
        rateEl.innerHTML = "";
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
        const def = getCreatureDef(cell.creatureId);
        const buffValue = gameState.activeBuffs[cell.creatureId] || 0;
        const currentOutput = Math.floor((def.baseOutput + buffValue) * (1 + (cell.level - 1) * 0.2));
        
        const effEl = document.getElementById('panel-efficiency');
        if(effEl) effEl.innerText = `${currentOutput} / ${def.interval / 1000}s`;

        const lvlEl = document.getElementById('panel-level-text');
        if(lvlEl) {
            const isMax = cell.level >= def.maxLevel;
            lvlEl.innerText = `LV.${cell.level} / ${def.maxLevel}`;
            lvlEl.className = isMax ? 'text-accent-gold' : 'text-gray-400';
        }

        const statusEl = document.getElementById('panel-status-text');
        if(statusEl) {
            let statusHtml = '';
            if (cell.buffs > 0) statusHtml += `<div class="flex items-center gap-1 text-green-400 text-xs mt-1"><i data-lucide="chevrons-up" class="w-3 h-3"></i> 食物充沛 (+${Math.round(cell.buffs * 100)}%)</div>`;
            if (cell.symbiosis > 0) statusHtml += `<div class="flex items-center gap-1 text-cyan-400 text-xs mt-1"><i data-lucide="heart-handshake" class="w-3 h-3"></i> 环境共生 (+${Math.round(cell.symbiosis * 100)}%)</div>`;
            if (cell.competition < 0) statusHtml += `<div class="flex items-center gap-1 text-purple-400 text-xs mt-1"><i data-lucide="users" class="w-3 h-3"></i> 资源竞争 (${Math.round(cell.competition * 100)}%)</div>`;
            if (cell.debuffs > 0) statusHtml += `<div class="flex items-center gap-1 text-yellow-500 text-xs mt-1"><i data-lucide="chevrons-down" class="w-3 h-3"></i> 受到捕食 (-${Math.round(cell.debuffs * 100)}%)</div>`;
            if (cell.mutationBuffs > 0) statusHtml += `<div class="flex items-center gap-1 text-purple-300 text-xs mt-1"><i data-lucide="sparkles" class="w-3 h-3"></i> 突变加成 (+${Math.round(cell.mutationBuffs * 100)}%)</div>`;
            if (cell.speedMultiplier <= 0) statusHtml = `<div class="flex items-center gap-1 text-red-500 text-xs mt-1"><i data-lucide="skull" class="w-3 h-3"></i> 极度饥饿/被捕食殆尽</div>`;
            
            if (statusHtml === '') statusHtml = `<div class="flex items-center gap-1 text-gray-500 text-xs mt-1">生态平衡</div>`;
            
            if (statusEl.innerHTML !== statusHtml) {
                statusEl.innerHTML = statusHtml;
                lucide.createIcons({root: statusEl});
            }
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

    const stageConf = getStageConfig(gameState.currentStage); 
    const baseCost = Math.round(stageConf.reqRate * 6); 

    let html = ''; 
    gameState.rogueShopItems.forEach((item) => { 
        const cost = baseCost; 
        const canAfford = gameState.energy >= cost && !item.bought; 

        const rarity = item.rarity || '普通';
        const theme = RARITY_THEME[rarity] || RARITY_THEME['普通'];

        const wrapperClass = item.bought
            ? `p-2 rounded-lg border-2 border-gray-800 bg-gray-900/50 opacity-50 grayscale transition-all scale-95`
            : `p-2 rounded-lg border-2 ${theme.border} ${theme.bg} transition-all hover:shadow-lg`;

        let btnClass = "mt-1.5 px-2 py-1 w-full text-[10px] font-bold rounded border-2 transition-all flex items-center justify-center gap-1 shadow-sm ";

        if (item.bought) {
            btnClass += "border-gray-800 text-gray-600 bg-transparent cursor-default";
        } else if (canAfford) {
            btnClass += theme.btnEnabled;
        } else {
            btnClass += "border-gray-800 text-gray-600 cursor-not-allowed";
        }


        html += ` 
            <div class="${wrapperClass}"> 
                <div class="flex justify-between items-start mb-0.5"> 
                    <div class="flex items-center gap-2 overflow-hidden"> 
                        <div class="w-7 h-7 rounded-full ${item.bgColor || 'bg-gray-500'} flex items-center justify-center shrink-0">
                            <i data-lucide="${item.icon || 'sparkles'}" class="w-4 h-4 text-white"></i>
                        </div>
                        <div class="min-w-0"> 
                            <div class="text-xs font-bold ${theme.title} leading-none truncate">${item.name}</div> 
                        </div> 
                    </div> 
                    <div class="text-[9px] font-bold opacity-70 ${theme.badge} shrink-0">${item.rarity || '普通'}</div> 
                </div> 
                
                <p class="text-[10px] text-gray-400 leading-tight line-clamp-2 h-6 opacity-90">${item.desc}</p> 
                
                <button 
                    id="rogue-item-btn-${item.id}"
                    class="${btnClass}" 
                    onclick="purchaseRogueItem('${item.id}')" 
                    ${item.bought || !canAfford ? 'disabled' : ''}> 
                    ${item.bought 
                        ? '<span>已激活</span>' 
                        : `<span>购买</span> <span class="font-mono opacity-90 ml-1 flex items-center"><i data-lucide="zap" class="w-2.5 h-2.5 fill-current mr-0.5"></i>${cost}</span>` 
                    } 
                </button> 
            </div> 
        `; 
    }); 

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

        html += `
            <div class="relative group">
                <div class="w-10 h-10 rounded-lg ${def.bgColor || 'bg-gray-700'} flex items-center justify-center border border-white/10 shadow-md">
                    <i data-lucide="${def.icon || 'sparkles'}" class="w-5 h-5 text-white"></i>
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

// 给肉鸽按钮挂一个"能量是否足够"的 watcher
// 给肉鸽按钮挂 watcher：根据“当前能量是否足够且未购买”来控制启用/禁用
// 肉鸽道具按钮：用监视器统一控制「是否可购买」 → 启用 / 禁用 + 颜色
function setupRogueItemWatchers() {
    const stageConf = getStageConfig(gameState.currentStage);
    const baseCost = Math.round(stageConf.reqRate * 6);

    gameState.rogueShopItems.forEach(item => {
        uiVarMonitor.watchThreshold({
            key: `rogue-item-${item.id}`,
            // 当前是否可以购买：能量足够 && 未购买
            getValue: () => (gameState.energy >= baseCost && !item.bought),
            target: true,
            cmp: (val, target) => !!val === target, // 只在 true/false 变化时触发
            onChange(canBuy) {
                const btn = document.getElementById(`rogue-item-btn-${item.id}`);
                if (!btn) return;

                // 已经买过的，锁死样式，不再改
                if (item.bought) {
                    btn.disabled = true;
                    btn.className =
                        "mt-1.5 px-2 py-1 w-full text-[10px] font-bold rounded border-2 " +
                        "transition-all flex items-center justify-center gap-1 shadow-sm " +
                        "border-gray-800 text-gray-600 bg-transparent cursor-default";
                    btn.innerHTML = `<span>已激活</span>`;
                    return;
                }

                // 公共基础样式（你原来 btnClass 的前半段）
                const baseBtnClass =
                    "mt-1.5 px-2 py-1 w-full text-[10px] font-bold rounded border-2 " +
                    "transition-all flex items-center justify-center gap-1 shadow-sm ";
                // 各品质对应的可购买样式（和你 renderRogueItems 里的 theme.btnDef 保持一致）
                const theme = RARITY_THEME[item.rarity || '普通'] || RARITY_THEME['普通'];
                const enabledClass = theme.btnEnabled;
                const disabledClass = "border-gray-800 text-gray-600 cursor-not-allowed";

                if (canBuy) {
                    btn.disabled = false;
                    btn.className = baseBtnClass + enabledClass;
                } else {
                    btn.disabled = true;
                    btn.className = baseBtnClass + disabledClass;
                }

                // 按钮里的文字保持原来逻辑（不在这里改 innerHTML）
                // 初始渲染时已经写好 “购买 + 价格”，这里只负责样式和禁用状态。
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
                    class="w-20 rounded-lg shadow-md transition-all duration-200 flex flex-col items-center justify-center shrink-0 gap-1.5 px-2 py-2
                           bg-gray-700 text-gray-500 cursor-not-allowed opacity-50"
                > 
                    <span class="font-extrabold text-sm leading-none">达成</span> 
                    <i data-lucide="circle-arrow-right" class="w-5 h-5 stroke-[2.5]"></i> 
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
                    w-20 rounded-lg shadow-md transition-all duration-200
                    flex flex-col items-center justify-center shrink-0 gap-1.5 px-2 py-2
                    bg-accent-gold text-slate-900 hover:bg-[#fcd34d]
                    hover:scale-[1.02] active:scale-[0.96] cursor-pointer shadow-orange-500/20
                `.replace(/\s+/g, ' ');
                btn.onclick = () => tryCompleteStage(false);
            } else {
                // 未达标：灰掉、禁用
                btn.className = `
                    w-20 rounded-lg shadow-md transition-all duration-200
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