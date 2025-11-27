// 游戏核心逻辑
let gameState = {
    energy: CONFIG.initialEnergy,
    gridSize: 3,
    totalTicks: 0, 
    isPaused: false,
    cells: [],
    selectedCellIndex: -1,
    purchasedUpgrades: new Set(),
    activeBuffs: {},
    activeMutations: new Set(),
    currentStage: 1,
    lastRatePerSec: 0,
    rogueShopItems: []
};

// 全局 UI 变量监控器（只负责算：状态是否跨过阈值，不直接操作 DOM）
const uiVarMonitor = {
    currentStage: null,
    watchers: [],   // { key, getValue, target, cmp, lastReached, onChange }

    // 每进一关，重置监视器
    initForStage(stageId) {
        this.currentStage = stageId;
        this.watchers = [];
    },

    /**
     * 监听一个「达到阈值」的变量/状态
     *  - key: 唯一标识（方便 debug）
     *  - getValue: () => any      当前值（通常来自 gameState）
     *  - target: any              阈值
     *  - cmp: (value, target) => boolean，默认 v >= t
     *  - onChange: (reached:boolean, value:any) => void
     *  - fireImmediately: 是否在注册时立刻回调一次
     */
    watchThreshold({ key, getValue, target, cmp = (v, t) => v >= t, onChange, fireImmediately = true }) {
        const value = getValue();
        const reached = cmp(value, target);

        const watcher = {
            key,
            getValue,
            target,
            cmp,
            lastReached: reached,
            onChange
        };

        this.watchers.push(watcher);

        // 注册时先同步一次当前状态
        if (fireImmediately && typeof onChange === 'function') {
            onChange(reached, value);
        }
    },

    // 每 tick 调用一次，驱动所有 watcher
    tick() {
        for (const w of this.watchers) {
            const value = w.getValue();
            const reached = w.cmp(value, w.target);
            if (reached !== w.lastReached) {
                w.lastReached = reached;
                if (typeof w.onChange === 'function') {
                    w.onChange(reached, value);
                }
            }
        }
    }
};

// 工具函数
function hasMutation(id) { 
    return gameState.activeMutations.has(id); 
}

function getCreatureDef(id) { 
    return CREATURES.find(c => c.id === id); 
}

function getXY(index, size) { 
    return { x: index % size, y: Math.floor(index / size) }; 
}

function getIndex(x, y, size) { 
    if (x < 0 || x >= size || y < 0 || y >= size) return -1; 
    return y * size + x; 
}

function getNeighbors(index) {
    const size = gameState.gridSize; 
    const neighbors = [];
    const row = Math.floor(index / size); 
    const col = index % size;
    if (row > 0) neighbors.push(index - size); 
    if (row < size - 1) neighbors.push(index + size);
    if (col > 0) neighbors.push(index - 1); 
    if (col < size - 1) neighbors.push(index + 1);
    return neighbors;
}

function getDiagonalNeighbors(index) { 
    const size = gameState.gridSize; 
    const { x, y } = getXY(index, size); 
    const diags = []; 
    const coords = [[x-1, y-1], [x+1, y-1], [x-1, y+1], [x+1, y+1]]; 
    coords.forEach(([nx, ny]) => { 
        const idx = getIndex(nx, ny, size); 
        if (idx !== -1) diags.push(idx); 
    }); 
    return diags; 
}

// 关卡相关函数
function getStageConfig(stage) {
    const base = STAGE_CONFIG.baseRate + (stage - 1) * STAGE_CONFIG.rateStep;
    return {
        stage,
        reqRate: base,
        payCost: Math.round(base * STAGE_CONFIG.payMultiplier)
    };
}

function enterStage(stage) {
    // 设置当前关卡
    gameState.currentStage = stage;

    // 刷新本关商店数据（不在里面渲染 UI）
    rollRogueShop();

    // 初始化本关的 UI 监控器
    uiVarMonitor.initForStage(stage);

    // 渲染左侧面板 UI
    renderStagePanel();
    renderRogueItems();

    // 注册本关需要的 watcher（左：关卡按钮 + 肉鸽；右：建造按钮）
    setupStageUiWatchers();
    setupRogueItemWatchers();
    setupBuildButtonWatchers();   // ✅ 新增：右侧建造按钮用同一套逻辑

    // 刷新一次动态部分
    updateStagePanelDynamic();
}

function rollRogueShop() {
    const pool = [...ROGUE_ITEMS_POOL];
    const picked = [];

    while (picked.length < 3 && pool.length) {
        const idx = Math.floor(Math.random() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
    }

    gameState.rogueShopItems = picked.map(item => ({ ...item, bought: false }));
    // ❌ 不再这里调用 renderRogueItems()
}

function purchaseRogueItem(itemId) {
    const conf = getStageConfig(gameState.currentStage);
    const baseCost = Math.round(conf.reqRate * 6);
    const item = gameState.rogueShopItems.find(it => it.id === itemId);
    if (!item || item.bought) return;

    if (gameState.energy < baseCost) {
        SoundSystem.playError();
        return;
    }

    updateEnergy(-baseCost);
    item.bought = true;

    if (item.mutationId) {
        gameState.activeMutations.add(item.mutationId);
    }

    SoundSystem.playUpgrade();
    // 不再需要手动重绘，watcher 会处理按钮状态更新
}

function tryCompleteStage(payInstead) {
    const conf = getStageConfig(gameState.currentStage);
    const rate = gameState.lastRatePerSec || 0;

    if (payInstead) {
        const cost = conf.payCost;
        if (gameState.energy < cost) {
            SoundSystem.playError();
            return;
        }
        updateEnergy(-cost);
    } else {
        if (rate < conf.reqRate) {
            SoundSystem.playError();
            return;
        }
    }

    SoundSystem.playUpgrade();
    const nextStage = gameState.currentStage + 1;
    // 直接用 enterStage 统一处理关卡切换 + UI + watcher
    enterStage(nextStage);
}

// 能量更新
function updateEnergy(delta) {
    gameState.energy += delta;
    energyEl.innerText = Math.floor(gameState.energy).toLocaleString();
    // 不再这里重绘左侧面板，让 watcher + gameLoop 来控制状态
}

// 布局加成检查
function checkLayoutBuffs(idx, creatureId, size, cells) {
    let patternBuff = 0;
    const { x, y } = getXY(idx, size);
    
    if (hasMutation('triplet_resonance')) {
        const left = getIndex(x-1, y, size); 
        const right = getIndex(x+1, y, size); 
        const up = getIndex(x, y-1, size); 
        const down = getIndex(x, y+1, size); 
        const isHorz = left!==-1 && right!==-1 && cells[left]?.creatureId === creatureId && cells[right]?.creatureId === creatureId; 
        const isVert = up!==-1 && down!==-1 && cells[up]?.creatureId === creatureId && cells[down]?.creatureId === creatureId; 
        if (isHorz || isVert) patternBuff += 0.5; 
    }
    
    if (hasMutation('interlaced_complement')) {
        const neighbors = getNeighbors(idx); 
        const hasSameNeighbor = neighbors.some(nIdx => cells[nIdx]?.creatureId === creatureId); 
        if (!hasSameNeighbor) patternBuff += 0.4; 
    }
    
    if (hasMutation('quad_core')) {
        const checkSquare = (dx, dy) => { 
            const n1 = getIndex(x+dx, y, size); 
            const n2 = getIndex(x, y+dy, size); 
            const n3 = getIndex(x+dx, y+dy, size); 
            return n1!==-1 && n2!==-1 && n3!==-1 && cells[n1]?.creatureId === creatureId && cells[n2]?.creatureId === creatureId && cells[n3]?.creatureId === creatureId; 
        }; 
        if (checkSquare(1,1) || checkSquare(-1,1) || checkSquare(1,-1) || checkSquare(-1,-1)) patternBuff += 0.8; 
    }
    
    if (hasMutation('edge_effect')) { 
        if (x === 0 || x === size-1 || y === 0 || y === size-1) patternBuff += 0.25; 
    }
    
    if (hasMutation('central_dogma') && size >= 3) { 
        const centerStart = Math.floor((size - 3) / 2); 
        const centerEnd = centerStart + 3; 
        if (x >= centerStart && x < centerEnd && y >= centerStart && y < centerEnd) patternBuff += 1.0; 
    }
    
    return patternBuff;
}

// 生态影响计算
function calculateEcologicalImpacts() {
    const impacts = gameState.cells.map(() => ({ 
        speedMultiplier: 1.0, 
        isStarving: false, 
        buffs: 0, 
        debuffs: 0, 
        symbiosis: 0, 
        competition: 0, 
        mutationBuffs: 0 
    }));
    
    const predatorCountsOnFood = new Array(gameState.cells.length).fill(0);
    
    // 计算捕食压力
    gameState.cells.forEach((cell, idx) => {
        if (!cell) return;
        const def = getCreatureDef(cell.creatureId);
        if (def.foodConfig) {
            const neighbors = getNeighbors(idx);
            neighbors.forEach(nIdx => {
                const nCell = gameState.cells[nIdx];
                if (nCell && def.foodConfig.targets.includes(nCell.creatureId)) { 
                    predatorCountsOnFood[nIdx]++; 
                }
            });
        }
    });
    
    // 计算每个格子的影响
    gameState.cells.forEach((cell, idx) => {
        if (!cell) return;
        const def = getCreatureDef(cell.creatureId);
        const neighbors = getNeighbors(idx);
        
        // 关系影响
        if (def.relations) {
            let searchIndices = neighbors;
            if (hasMutation('quantum_link')) { 
                searchIndices = [...neighbors, ...getDiagonalNeighbors(idx)]; 
            }
            
            def.relations.forEach(rel => {
                const targetIndices = searchIndices.filter(nIdx => { 
                    const nCell = gameState.cells[nIdx]; 
                    return nCell && nCell.creatureId === rel.target; 
                });
                
                if (targetIndices.length > 0) {
                    if (rel.val < 0 && hasMutation('peace_treaty')) return;
                    
                    let finalVal = rel.val;
                    if (rel.val > 0 && hasMutation('hyper_symbiosis')) finalVal *= 2;
                    
                    const effectValue = targetIndices.length * finalVal;
                    if (finalVal > 0) impacts[idx].symbiosis += effectValue; 
                    else impacts[idx].competition += effectValue;
                    
                    impacts[idx].speedMultiplier += effectValue;
                }
            });
        }
        
        // 布局加成
        const layoutBuff = checkLayoutBuffs(idx, cell.creatureId, gameState.gridSize, gameState.cells);
        if (layoutBuff > 0) { 
            impacts[idx].mutationBuffs += layoutBuff; 
            impacts[idx].speedMultiplier += layoutBuff; 
        }
        
        // 特定生物加成
        if (hasMutation('chloroplast_outburst') && def.tier === 1) { 
            impacts[idx].mutationBuffs += 0.3; 
            impacts[idx].speedMultiplier += 0.3; 
        }
        
        if (hasMutation('predator_instinct') && def.tier >= 4) { 
            impacts[idx].mutationBuffs += 0.2; 
            impacts[idx].speedMultiplier += 0.2; 
        }
        
        // 食物配置影响
        if (def.foodConfig) {
            const validFoodIndices = neighbors.filter(nIdx => { 
                const nCell = gameState.cells[nIdx]; 
                return nCell && def.foodConfig.targets.includes(nCell.creatureId); 
            });
            
            let isStarving = false;
            if (def.foodConfig.mode === 'AND') {
                const eatenTypes = new Set(validFoodIndices.map(i => gameState.cells[i].creatureId));
                isStarving = !def.foodConfig.targets.every(t => eatenTypes.has(t));
            } else { 
                isStarving = validFoodIndices.length === 0; 
            }
            
            if (isStarving) { 
                impacts[idx].isStarving = true; 
                impacts[idx].speedMultiplier = 0; 
            } else {
                let myFoodShare = 0;
                validFoodIndices.forEach(fIdx => { 
                    const eaters = predatorCountsOnFood[fIdx]; 
                    myFoodShare += (1 / eaters); 
                });
                
                if (myFoodShare > 1.0) {
                    const surplus = myFoodShare - 1.0;
                    const surplusRate = hasMutation('greedy_digestion') ? 0.45 : 0.3;
                    const extraBuff = surplus * surplusRate; 
                    impacts[idx].buffs += extraBuff; 
                    impacts[idx].speedMultiplier += extraBuff;
                }
            }
            
            if (validFoodIndices.length > 0) {
                const pressurePerFood = def.consumptionImpact / validFoodIndices.length;
                validFoodIndices.forEach(fIdx => { 
                    impacts[fIdx].debuffs += pressurePerFood; 
                    impacts[fIdx].speedMultiplier -= pressurePerFood; 
                });
            }
        }
    });
    
    return impacts;
}

// 游戏主循环
function gameLoop() {
    if (gameState.isPaused) return;
    
    gameState.totalTicks++;
    const currentDay = Math.floor(gameState.totalTicks * CONFIG.tickRate / 4000) + 1;
    document.getElementById('header-day').innerText = `Day ${currentDay}`;
    
    const impacts = calculateEcologicalImpacts();
    let totalRate = 0;
    
    gameState.cells.forEach((cell, idx) => {
        if (!cell) return;
        const def = getCreatureDef(cell.creatureId);
        const impact = impacts[idx];
        
        cell.speedMultiplier = impact.speedMultiplier;
        cell.buffs = impact.buffs;
        cell.debuffs = impact.debuffs;
        cell.symbiosis = impact.symbiosis;
        cell.competition = impact.competition;
        
        if (impact.isStarving || cell.speedMultiplier <= 0) { 
            cell.state = 'dying'; 
        } else { 
            cell.state = 'normal'; 
        }
        
        if (cell.speedMultiplier > 0) {
            const buffValue = gameState.activeBuffs[cell.creatureId] || 0;
            const baseWithBuff = def.baseOutput + buffValue;
            const leveledOutput = baseWithBuff * (1 + (cell.level - 1) * 0.2);
            totalRate += (leveledOutput * cell.speedMultiplier) / (def.interval / 1000);
        }
        
        if (cell.state === 'dying') {
            const decayAmount = impact.isStarving ? Math.abs(def.starvationRate) : Math.abs(impact.speedMultiplier * 5);
            cell.progress -= decayAmount;
            if (cell.progress <= 0) {
                if (cell.level > 1) { 
                    cell.level--; 
                    cell.progress = 100; 
                } else { 
                    killCreature(idx); 
                    return; 
                }
            }
        } else {
            const baseIncrement = (CONFIG.tickRate / def.interval) * 100;
            const actualIncrement = baseIncrement * cell.speedMultiplier;
            cell.progress += actualIncrement;
            if (cell.progress >= 100) { 
                handleProduction(idx, cell, def); 
                cell.progress = 0; 
            }
        }
        
        updateCellVisuals(idx, cell);
    });
    
    rateEl.innerText = `+${totalRate.toFixed(1)}/s`;
    gameState.lastRatePerSec = totalRate;
    updateStagePanelDynamic();
    
    if (gameState.selectedCellIndex !== -1) { 
        renderDetailPanel(gameState.selectedCellIndex, false); 
    }

    // ✅ 驱动所有 UI watcher（关卡按钮 + 肉鸽按钮）
    uiVarMonitor.tick();
}

// 生产处理
function handleProduction(idx, cell, def) {
    const buffValue = gameState.activeBuffs[cell.creatureId] || 0;
    const baseWithBuff = def.baseOutput + buffValue;
    const output = Math.floor(baseWithBuff * (1 + (cell.level - 1) * 0.2));
    produceEnergy(idx, output);
    
    if (cell.level < def.maxLevel) {
        cell.level++;
        SoundSystem.playLevelUp();
        const visualEl = document.getElementById(`cell-visual-${idx}`);
        if (cell.level >= def.maxLevel && visualEl) {
            visualEl.classList.remove(def.borderColor);
            visualEl.classList.add('max-level-border');
        }
    }
}

// 能量生产
function produceEnergy(idx, amount) {
    updateEnergy(amount);
    
    const cellEl = document.getElementById(`cell-visual-${idx}`);
    
    if (cellEl) {
        const rect = cellEl.getBoundingClientRect();
        const float = document.createElement('div');
        
        float.className = 'fixed pointer-events-none z-20 flex items-center justify-center gap-1 text-xl font-black animate-float-up';
        float.style.left = `${rect.left + rect.width / 2}px`;
        float.style.top = `${rect.top}px`;
        float.style.transform = 'translate(-50%, 0)';
        
        float.innerHTML = `<i data-lucide="zap" class="w-4 h-4 fill-current"></i> ${amount}`;
        float.style.color = '#fff';
        
        document.body.appendChild(float);
        lucide.createIcons({ root: float });
        
        setTimeout(() => float.remove(), 1500);
    }
    
    if (gameState.selectedCellIndex !== -1) {
        if (!gameState.cells[gameState.selectedCellIndex] || gameState.cells[gameState.selectedCellIndex]) {
            renderDetailPanel(gameState.selectedCellIndex, false);
        }
    }
}

// 生物操作
function removeCreature() { 
    if (gameState.selectedCellIndex !== -1) {
        killCreature(gameState.selectedCellIndex);
    }
}

function killCreature(idx) {
    SoundSystem.playRemove();
    const cell = gameState.cells[idx];
    if(!cell) return;
    gameState.cells[idx] = null;
    const cellEl = document.getElementById(`cell-container-${idx}`);
    if (cellEl) {
        cellEl.innerHTML = `<div id="cell-visual-${idx}" class="absolute inset-0 rounded-xl border-2 border-ui-border bg-primary-dark hover:border-gray-500 opacity-50 hover:opacity-100 flex items-center justify-center transition-all"><i data-lucide="plus" class="w-6 h-6 text-gray-500"></i></div>`;
        lucide.createIcons({root: cellEl});
    }
    if (gameState.selectedCellIndex === idx) renderDetailPanel(idx, false);
}

function selectCell(index) {
    SoundSystem.playPlace(); 
    gameState.selectedCellIndex = index;
    highlightCell(index);
    renderDetailPanel(index);
}

function highlightCell(index) {
    document.querySelectorAll('[id^="cell-visual-"]').forEach(v => v.classList.remove('selected-cell'));
    const target = document.getElementById(`cell-visual-${index}`);
    if (target) target.classList.add('selected-cell');
}

// 条件检查
function checkRequirements(index, creatureId) {
    const def = getCreatureDef(creatureId);
    if (!def.foodConfig) return { ok: true };

    const neighbors = getNeighbors(index);
    const targets = def.foodConfig.targets;
    const mode = def.foodConfig.mode;

    const neighborCreatures = neighbors.map(nIdx => gameState.cells[nIdx]?.creatureId).filter(Boolean);
    
    if (mode === 'AND') {
        const missing = targets.filter(t => !neighborCreatures.includes(t));
        if (missing.length > 0) {
            const missingNames = missing.map(id => getCreatureDef(id).name).join(' 和 ');
            return { ok: false, reason: `缺少相邻的 ${missingNames}` };
        }
    } else {
        const hasAny = targets.some(t => neighborCreatures.includes(t));
        if (!hasAny) {
            const targetNames = targets.map(id => getCreatureDef(id).name).join(' 或 ');
            return { ok: false, reason: `缺少相邻的 ${targetNames}` };
        }
    }
    return { ok: true };
}

// 放置生物
function placeCreature(creatureId) {
    const idx = gameState.selectedCellIndex;
    if (idx === -1) return;
    const def = getCreatureDef(creatureId);
    
    if (gameState.energy < def.cost) { 
        SoundSystem.playError();
        return; 
    }
    
    const check = checkRequirements(idx, creatureId);
    if (!check.ok) {
        SoundSystem.playError();
        
        const reqDiv = document.getElementById(`food-req-${creatureId}`);
        if (reqDiv) {
            reqDiv.classList.remove('animate-error-shake');
            void reqDiv.offsetWidth;
            reqDiv.classList.add('animate-error-shake');
        }
            
        const btn = document.getElementById(`btn-build-${creatureId}`);
        if(btn) {
            btn.classList.remove('animate-shake', 'shake-once');
            void btn.offsetWidth;
            btn.classList.add('shake-once');
        }
        return;
    }

    SoundSystem.playPlace();
    updateEnergy(-def.cost);
    gameState.cells[idx] = { creatureId: creatureId, level: 1, progress: 0, speedMultiplier: 1.0, state: 'normal' };
    
    renderGrid(); 
    lastRenderedIndex = -2; 
    renderDetailPanel(idx);
}

// 调试功能
window.debugAddMutation = (id) => {
    gameState.activeMutations.add(id);
    if(gameState.selectedCellIndex !== -1) renderDetailPanel(gameState.selectedCellIndex, false);
};