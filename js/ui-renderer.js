// UI渲染相关功能
let lastRenderedIndex = -2;

// 渲染网格
function renderGrid() {
    gridEl.innerHTML = '';
    gridEl.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    gridEl.style.gridTemplateRows = `repeat(${gameState.gridSize}, 1fr)`;

    gameState.cells.forEach((cellData, i) => {
        const cell = document.createElement('div');
        cell.id = `cell-container-${i}`;
        cell.className = 'relative group w-full h-full'; 
        cell.onclick = () => selectCell(i);

        if (cellData) {
            const c = getCreatureDef(cellData.creatureId);
            const isMax = cellData.level >= c.maxLevel;
            const borderClass = isMax ? 'max-level-border' : c.borderColor;
            
            cell.innerHTML = `
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
            cell.innerHTML = `
                <div id="cell-visual-${i}" class="absolute inset-0 rounded-xl border-2 border-ui-border bg-primary-dark hover:border-gray-500 opacity-50 hover:opacity-100 flex items-center justify-center transition-all">
                    <i data-lucide="plus" class="w-6 h-6 text-gray-500"></i>
                </div>
            `;
        }
        gridEl.appendChild(cell);
    });
    
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
        if (lastRenderedIndex !== -1) {
            detailPanel.innerHTML = `<div class="h-full flex flex-col items-center justify-center text-gray-500 opacity-60"><i data-lucide="microscope" class="w-16 h-16 mb-4 stroke-1"></i><p class="text-lg">请选择区域</p></div>`;
            lucide.createIcons();
            lastRenderedIndex = -1;
        }
        return;
    }

    const cell = gameState.cells[index];
    const isCellEmpty = !cell; 
    
    const needsFullRender = (index !== lastRenderedIndex) || 
                            (lastRenderedIndex === index && isCellEmpty !== (document.getElementById('build-list') !== null));

    if (needsFullRender) {
        lastRenderedIndex = index;
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
            const sortedCreatures = [...CREATURES].sort((a, b) => a.cost - b.cost);
            
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

    if (!cell) {
        CREATURES.forEach(c => {
            const wrapper = document.getElementById(`card-wrapper-${c.id}`);
            const card = document.getElementById(`card-inner-${c.id}`);
            const btn = document.getElementById(`btn-build-${c.id}`);
            const costTextDiv = document.getElementById(`btn-cost-text-${c.id}`);
            const outTextDiv = document.getElementById(`btn-out-text-${c.id}`);
            
            if (!wrapper || !card || !btn) return;

            const canAfford = gameState.energy >= c.cost;
            
            if (canAfford) {
                if(wrapper.classList.contains('grayscale')) {
                    wrapper.classList.remove('grayscale', 'opacity-60', 'cursor-not-allowed');
                    wrapper.classList.add('cursor-pointer');
                    
                    card.classList.remove('border-gray-700');
                    card.classList.add('border-accent-energy', 'shadow-lg', 'neon-border', 'hover:scale-[1.01]');
                    
                    btn.className = "shrink-0 w-[4.5rem] flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-all active:scale-95 group/btn border-t border-x bg-gradient-to-b from-[#2a3f5a] to-[#1a2c42] hover:from-[#324a68] hover:to-[#203550] border-accent-energy/30 btn-3d-blue";
                    btn.disabled = false;

                    if(costTextDiv) costTextDiv.className = "font-mono text-lg leading-none flex items-center gap-0.5 text-accent-energy group-hover/btn:text-white transition-colors";
                    if(outTextDiv) outTextDiv.className = "font-mono text-[10px] text-accent-life/90 group-hover/btn:text-accent-life";
                }
            } else {
                if(!wrapper.classList.contains('grayscale')) {
                    wrapper.classList.add('grayscale', 'opacity-60', 'cursor-not-allowed');
                    wrapper.classList.remove('cursor-pointer');
                    
                    card.classList.add('border-gray-700');
                    card.classList.remove('border-accent-energy', 'shadow-lg', 'neon-border', 'hover:scale-[1.01]');
                    
                    btn.className = "shrink-0 w-[4.5rem] flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-all active:scale-95 group/btn border-t border-x bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700 btn-3d-gray";
                    btn.disabled = true;

                    if(costTextDiv) costTextDiv.className = "font-mono text-lg leading-none flex items-center gap-0.5 text-gray-400";
                    if(outTextDiv) outTextDiv.className = "font-mono text-[10px] text-gray-600";
                }
            }
        });
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
    gameState.rogueShopItems.forEach((item, i) => { 
        const cost = baseCost; 
        const canAfford = gameState.energy >= cost && !item.bought; 

        let theme = { 
            border: 'border-gray-700', 
            bg: 'bg-gray-800/40', 
            title: 'text-gray-300', 
            icon: 'text-gray-500', 
            btnDef: 'border-gray-500 text-gray-300 hover:bg-gray-700 hover:border-gray-400', 
            badge: 'text-gray-500' 
        }; 

        switch(item.rarity) { 
            case 'uncommon': 
                theme = { 
                    border: 'border-green-600/50', bg: 'bg-green-900/10', title: 'text-green-100', icon: 'text-green-400', badge: 'text-green-500', 
                    btnDef: 'border-green-500 text-green-400 hover:bg-green-500/20 hover:border-green-400 hover:text-green-300' 
                }; break; 
            case 'rare': 
                theme = { 
                    border: 'border-sky-600/50', bg: 'bg-sky-900/10', title: 'text-sky-100', icon: 'text-sky-400', badge: 'text-sky-500', 
                    btnDef: 'border-sky-500 text-sky-400 hover:bg-sky-500/20 hover:border-sky-400 hover:text-sky-300' 
                }; break; 
            case 'epic': 
                theme = { 
                    border: 'border-purple-600/50', bg: 'bg-purple-900/10', title: 'text-purple-100', icon: 'text-purple-400', badge: 'text-purple-500', 
                    btnDef: 'border-purple-500 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400 hover:text-purple-300' 
                }; break; 
            case 'legendary': 
                theme = { 
                    border: 'border-amber-500/60', bg: 'bg-amber-900/10', title: 'text-amber-100', icon: 'text-amber-400', badge: 'text-amber-500', 
                    btnDef: 'border-amber-500 text-amber-400 hover:bg-amber-500/20 hover:border-amber-300 hover:text-amber-200' 
                }; break; 
        } 

        const wrapperClass = item.bought 
            ? `p-2 rounded-lg border border-gray-800 bg-gray-900/50 opacity-50 grayscale transition-all scale-95` 
            : `p-2 rounded-lg border ${theme.border} ${theme.bg} transition-all hover:scale-[1.02] hover:shadow-lg`; 

        let btnClass = "mt-1.5 px-2 py-1 w-full text-[10px] font-bold rounded border-2 transition-all flex items-center justify-center gap-1 shadow-sm "; 
        
        if (item.bought) { 
            btnClass += "border-gray-800 text-gray-600 bg-transparent cursor-default"; 
        } else if (canAfford) { 
            btnClass += `${theme.btnDef}`; 
        } else { 
            btnClass += "border-gray-800 text-gray-600 cursor-not-allowed"; 
        } 

        html += ` 
            <div class="${wrapperClass}"> 
                <div class="flex justify-between items-start mb-0.5"> 
                    <div class="flex items-center gap-2 overflow-hidden"> 
                        <i data-lucide="sparkles" class="w-3.5 h-3.5 ${theme.icon} shrink-0"></i> 
                        <div class="min-w-0"> 
                            <div class="text-xs font-bold ${theme.title} leading-none truncate">${item.name}</div> 
                        </div> 
                    </div> 
                    <div class="text-[9px] uppercase tracking-wider font-bold opacity-70 ${theme.badge} shrink-0">${item.rarity || 'Common'}</div> 
                </div> 
                
                <p class="text-[10px] text-gray-400 leading-tight line-clamp-2 h-6 opacity-90">${item.desc}</p> 
                
                <button class="${btnClass}" onclick="purchaseRogueItem('${item.id}')" ${item.bought || !canAfford ? 'disabled' : ''}> 
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

// 渲染关卡面板
function renderStagePanel() {
    const panel = document.getElementById('stage-panel');
    if (!panel) return;

    const conf = getStageConfig(gameState.currentStage);
    const rate = gameState.lastRatePerSec || 0;
    const ratio = Math.max(0, Math.min(1, rate / conf.reqRate));
    const payCost = conf.payCost;

    const canFreeClear = rate >= conf.reqRate;
    const canPayClear = gameState.energy >= payCost;

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
                                    <span id="stage-current-rate" class="font-mono ${canFreeClear ? 'text-accent-life' : 'text-gray-300'}">
                                ${rate.toFixed(1)}/s
                            </span> 
                                </div> 
                                <div class="w-full h-1.5 rounded-full bg-slate-900 overflow-hidden border border-white/5"> 
                                    <div id="stage-progress-bar" class="h-2 rounded-full bg-gradient-to-r from-green-400 to-sky-400 transition-all duration-300 ease-out"
                                 style="width: ${ratio * 100}%;"></div> 
                                </div> 
                            </div> 
                        </div> 

                        <button 
                            class="w-20 rounded-lg shadow-md transition-all duration-200 flex flex-col items-center justify-center shrink-0 gap-1.5 px-2 py-2
                                ${canFreeClear 
                                        ? 'bg-accent-gold text-slate-900 hover:bg-[#fcd34d] hover:scale-[1.02] active:scale-[0.96] cursor-pointer shadow-orange-500/20' 
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'}" 
                            onclick="${canFreeClear ? 'tryCompleteStage(false)' : ''}" 
                        > 
                            <span class="font-extrabold text-sm leading-none">达成</span> 
                            <i data-lucide="circle-arrow-right" class="w-5 h-5 stroke-[2.5]"></i> 
                        </button> 
                    </div> 

                    <button 
                        class="w-full py-1.5 rounded-lg border text-[11px] transition-transform transition-colors duration-200 flex items-center justify-center gap-1 
                            ${canPayClear 
                                    ? 'border-accent-gold/40 text-accent-gold hover:bg-accent-gold/10 active:scale-[0.98]' 
                                    : 'border-gray-700/50 text-gray-600 cursor-not-allowed'}" 
                        onclick="${canPayClear ? 'tryCompleteStage(true)' : ''}" 
                    > 
                        支付 <i data-lucide="zap" class="w-3 h-3 inline"></i> ${payCost} 强行通过 
                    </button> 

                </div> 
            `; 

    lucide.createIcons({ root: panel });
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