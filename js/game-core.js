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
    rogueShopItems: [],
    rogueItemBar: [],          // 道具栏里的道具 id
    creatureBoostStacks: {},    // { [creatureId]: number } 记录各生物被强化了几次
    // ✅ 已解锁的生物 id：基础生产者默认解锁
    unlockedCreatureIds: new Set(['algae', 'kelp'])
};
function createCell(creatureId) {
    return {
        creatureId,
        level: 1,
        progress: 0,
        // 生态影响相关默认值
        buffs: 0,
        debuffs: 0,
        symbiosis: 0,
        competition: 0,
        mutationBuffs: 0,
        speedMultiplier: 1,
        state: 'normal' // 'normal' | 'dying' | 'dead'
    };
}
// 邻居缓存：减少每 tick 重算邻居的开销
const neighborCache = {
    orth: [], // 上下左右
    diag: []  // 斜角
};

function buildNeighborCache(size) {
    neighborCache.orth = [];
    neighborCache.diag = [];

    const w = size;
    const h = size;

    for (let i = 0; i < w * h; i++) {
        const x = i % w;
        const y = Math.floor(i / w);

        // 上下左右
        const orth = [];
        if (y > 0) orth.push(i - w);
        if (y < h - 1) orth.push(i + w);
        if (x > 0) orth.push(i - 1);
        if (x < w - 1) orth.push(i + 1);

        // 斜角
        const diag = [];
        if (y > 0 && x > 0) diag.push(i - w - 1);
        if (y > 0 && x < w - 1) diag.push(i - w + 1);
        if (y < h - 1 && x > 0) diag.push(i + w - 1);
        if (y < h - 1 && x < w - 1) diag.push(i + w + 1);

        neighborCache.orth[i] = orth;
        neighborCache.diag[i] = diag;
    }
}


// 关卡解锁表：按关卡解锁生物和棋盘大小（使用 id）
const STAGE_UNLOCKS = {
    1:  { creatureIds: ['plankton'] },                   // 荧光浮游虫
    3:  { creatureIds: ['crab', 'shrimp'] },             // 晶石蟹、电光虾
    5:  { gridSize: 4 },                                 // 解锁 4x4
    7:  { creatureIds: ['jellyfish'] },                  // 幽灵水母
    9:  { creatureIds: ['turtle', 'eel'] },              // 装甲海龟、雷霆鳗
    11: { gridSize: 5 },                                 // 解锁 5x5
    13: { creatureIds: ['hunter'] },                     // 深海猎手
    15: { creatureIds: ['leviathan'] },                  // 深渊巨兽
    17: { gridSize: 6 }                                  // 解锁 6x6
    // 17 关以后不再解锁新东西，就不用写
};

// 把当前棋盘从 oldSize 扩展到 newSize，保留原有生物在左上角
function expandGridPreserveCreatures(newSize) {
    const oldSize = gameState.gridSize;
    if (newSize <= oldSize) return;

    const oldCells = gameState.cells;
    const newCells = Array(newSize * newSize).fill(null);

    for (let y = 0; y < oldSize; y++) {
        for (let x = 0; x < oldSize; x++) {
            const oldIdx = y * oldSize + x;
            const newIdx = y * newSize + x;
            newCells[newIdx] = oldCells[oldIdx];
        }
    }

    gameState.gridSize = newSize;
    gameState.cells = newCells;
    buildNeighborCache(newSize);

    // 防止选中的格子越界
    if (gameState.selectedCellIndex >= newCells.length) {
        gameState.selectedCellIndex = -1;
    }
}

// 应用某一关的解锁效果（生物解锁 + 棋盘扩建）
function applyStageUnlocks(stage) {
    const unlock = STAGE_UNLOCKS[stage];
    if (!unlock) return;

    // 1）解锁生物（按 id）
    if (unlock.creatureIds && Array.isArray(unlock.creatureIds)) {
        unlock.creatureIds.forEach(id => {
            gameState.unlockedCreatureIds.add(id);
        });
    }

    // 2）扩建棋盘（只增不减）
    if (unlock.gridSize && unlock.gridSize > gameState.gridSize) {
        // ✅ 扩建棋盘但保留已有生物
        expandGridPreserveCreatures(unlock.gridSize);

        // 重新渲染网格
        renderGrid();

        // 如果当前仍有选中格子，刷新右侧面板；否则显示默认提示
        if (gameState.selectedCellIndex !== -1) {
            renderDetailPanel(gameState.selectedCellIndex, false);
        } else {
            renderDetailPanel(-1, false);
        }
    }
}



// 全局 UI 变量监控器（只负责算：状态是否跨过阈值，不直接操作 DOM）
const uiVarMonitor = {
    currentStage: null,
    // 用 Map 而不是数组：以 key 为索引，天然去重
    watchers: new Map(),   // key => { key, getValue, target, cmp, lastReached, onChange }

    // 每进一关，重置监视器
    initForStage(stageId) {
        this.currentStage = stageId;
        this.watchers.clear();
    },

    // 如果你在别处想手动清空，也可以调用 reset()
    reset() {
        this.watchers.clear();
    },

    /**
     * 监听一个「达到阈值」的变量/状态
     *  - key: 唯一标识（方便 debug & 用来去重）
     *  - getValue: () => any      当前值（通常来自 gameState）
     *  - target: any              阈值
     *  - cmp: (value, target) => boolean，默认 v >= t
     *  - onChange: (reached:boolean, value:any) => void
     *  - fireImmediately: 是否在注册时立刻回调一次
     */
    watchThreshold({ key, getValue, target, cmp = (v, t) => v >= t, onChange, fireImmediately = true }) {
        if (!key) {
            console.warn('[uiVarMonitor] watchThreshold 需要提供唯一 key');
            return;
        }
        if (typeof getValue !== 'function') {
            console.warn('[uiVarMonitor] watchThreshold 需要提供 getValue 函数, key =', key);
            return;
        }

        const safeCmp = typeof cmp === 'function' ? cmp : (v, t) => v >= t;
        const value = getValue();
        const reached = safeCmp(value, target);

        const watcher = {
            key,
            getValue,
            target,
            cmp: safeCmp,
            lastReached: reached,
            onChange
        };

        // ✅ 用 key 覆盖旧的 watcher，防止同一关内重复注册同一个 key
        this.watchers.set(key, watcher);

        // 注册时先同步一次当前状态
        if (fireImmediately && typeof onChange === 'function') {
            onChange(reached, value);
        }
    },

    // 每 tick 调用一次，驱动所有 watcher
    tick() {
        for (const w of this.watchers.values()) {
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



function getXY(index, size) { 
    return { x: index % size, y: Math.floor(index / size) }; 
}

function getIndex(x, y, size) { 
    if (x < 0 || x >= size || y < 0 || y >= size) return -1; 
    return y * size + x; 
}

function getNeighbors(index) {
    return neighborCache.orth[index] || [];
}

function getDiagonalNeighbors(index) {
    return neighborCache.diag[index] || [];
}

// 关卡相关函数
function getStageConfig(stage) {
    const p = STAGE_CONFIG.ratePower || 1.8;
    const base = STAGE_CONFIG.baseRate +
        STAGE_CONFIG.rateStep * Math.pow(Math.max(0, stage - 1), p);

    return {
        stage,
        reqRate: Math.round(base),
        payCost: Math.round(base * STAGE_CONFIG.payMultiplier)
    };
}

function enterStage(stage) {
    // 1. 更新当前关卡
    gameState.currentStage = stage;

    // 2. 应用这一关的解锁（可能解锁新生物 / 扩大棋盘）
    applyStageUnlocks(stage);

    // 3. 刷新本关商店数据
    rollRogueShop();

    // 4. 初始化本关 UI 监控器
    uiVarMonitor.initForStage(stage);

    // 5. 渲染左侧：关卡面板 + 肉鸽道具
    renderStagePanel();
    renderRogueItems();
    renderRogueItemBar(); // ✅ 新增：刷新道具栏

    // 6. 注册各类 watcher（关卡按钮 / 肉鸽按钮 / 右侧建造按钮）
    setupStageUiWatchers();
    setupRogueItemWatchers();
    if (typeof setupBuildButtonWatchers === 'function') {
        setupBuildButtonWatchers();
    }

    // 7. 刷新一次动态文本部分
    updateStagePanelDynamic();
}

// 按稀有度权重，从"未在道具栏内的道具"里抽取本轮商店道具
function rollRogueShop() {
    const ownedIds = new Set(gameState.rogueItemBar || []);
    const unlocked = gameState.unlockedCreatureIds || new Set();

    // 1）筛选可用道具
    const available = ROGUE_ITEMS_POOL.filter(item => {
        // (A) 已在道具栏里的普通道具不再出现
        if (ownedIds.has(item.id)) return false;

        // (B) 生物增幅道具：如果该生物未解锁 → 不出现
        if (item.kind === 'creature_boost') {
            if (!unlocked.has(item.targetCreatureId)) {
                return false;
            }
        }

        return true;
    });

    if (!available.length) {
        gameState.rogueShopItems = [];
        return;
    }

    const maxCount = 3;
    const pool = [...available];
    const picked = [];

    while (picked.length < maxCount && pool.length) {
        let totalWeight = 0;
        const weights = pool.map(item => {
            const rarity = item.rarity || '普通';
            const w = ROGUE_RARITY_WEIGHTS[rarity] || 1;
            totalWeight += w;
            return w;
        });

        let r = Math.random() * totalWeight;
        let chosenIndex = 0;
        for (let i = 0; i < pool.length; i++) {
            if (r < weights[i]) {
                chosenIndex = i;
                break;
            }
            r -= weights[i];
        }

        const chosen = pool.splice(chosenIndex, 1)[0];
        picked.push(chosen);
    }

    gameState.rogueShopItems = picked.map(item => ({
        ...item,
        bought: false
    }));
}


function purchaseRogueItem(itemId) {
    const conf = getStageConfig(gameState.currentStage);
    const baseCost = Math.round(conf.reqRate * 6);

    const item = gameState.rogueShopItems.find(it => it.id === itemId);
    if (!item || item.bought) return;

    const isCreatureBoost = item.kind === 'creature_boost' && item.stackable;

    // 能量不足
    if (gameState.energy < baseCost) {
        SoundSystem.playError && SoundSystem.playError();
        return;
    }

    // 扣费
    updateEnergy(-baseCost);

    // 标记本轮"已购买"，按钮要灰掉 —— 两种道具都一样
    item.bought = true;

    if (isCreatureBoost) {
        // ✅【新类型】针对某个生物叠加 +10% 产出
        const creatureId = item.targetCreatureId;
        const def = getCreatureDef(creatureId);

        if (def) {
            const inc = def.baseOutput * 0.10;

            // 实际数值叠加：叠在 activeBuffs 上，handleProduction 已经用这个算
            gameState.activeBuffs[creatureId] =
                (gameState.activeBuffs[creatureId] || 0) + inc;

            // 层数记录（仅用于 UI 展示）
            if (!gameState.creatureBoostStacks) {
                gameState.creatureBoostStacks = {};
            }
            gameState.creatureBoostStacks[creatureId] =
                (gameState.creatureBoostStacks[creatureId] || 0) + 1;
        }

        SoundSystem.playUpgrade && SoundSystem.playUpgrade();

        // 不进道具栏，其它逻辑不变
    } else {
        // ✅【原来的普通道具逻辑】—— 不变
        // 道具栏上限判断
        if (!gameState.rogueItemBar) {
            gameState.rogueItemBar = [];
        }
        if (!gameState.rogueItemBar.includes(itemId)) {
            // 如果你有上限判断（比如 >=5 就 return）可以保留
            if (gameState.rogueItemBar.length >= MAX_ROGUE_ITEM_BAR) {
                // 按你之前的设定：栏位满了就不响应
                return;
            }
            gameState.rogueItemBar.push(itemId);
        }

        if (item.mutationId && gameState.activeMutations) {
            gameState.activeMutations.add(item.mutationId);
        }

        SoundSystem.playUpgrade && SoundSystem.playUpgrade();
    }

    // ✅ 立即刷新商店列表（按钮变“已激活”）
    renderRogueItems();
    // ✅ 立即刷新道具栏（立刻看到新图标）
    renderRogueItemBar();
}



// 主动丢弃一个已购买的肉鸽道具（释放栏位，效果失效，但未来仍可被刷新到）
function removeRogueItem(itemId) {
    if (!Array.isArray(gameState.rogueItemBar)) return;

    const idx = gameState.rogueItemBar.indexOf(itemId);
    if (idx === -1) {
        SoundSystem && SoundSystem.playError && SoundSystem.playError();
        return;
    }

    // 1. 从道具栏移除
    gameState.rogueItemBar.splice(idx, 1);

    // 2. 取消这个道具带来的效果（mutation 之类）
    const def = getRogueItemDef(itemId);
    if (def && def.mutationId && gameState.activeMutations) {
        gameState.activeMutations.delete(def.mutationId);
    }

    // 3. 音效
    SoundSystem && SoundSystem.playRemove && SoundSystem.playRemove();

    // 4. 刷新 UI
    renderRogueItemBar && renderRogueItemBar();
    renderRogueItems && renderRogueItems();

    // ✔ 不用管池子：道具栏移除后，下一次 rollRogueShop 时它自然回到可抽集合
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
    gameState.energy = Math.max(0, gameState.energy + delta);
    energyEl.innerText = Math.floor(gameState.energy).toLocaleString();
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
    
    // ✅ 每帧只轻量刷新“当前选中格子”的详情数值，不重画整块面板
    const sel = gameState.selectedCellIndex;
    if (sel !== -1) {
        updateDetailPanelDynamic(sel);
    }

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

    const cellContainer = document.getElementById(`cell-container-${idx}`);
    if (cellContainer) {
        const rect = cellContainer.getBoundingClientRect();

        // 外层：负责定位 & 水平居中
        const wrapper = document.createElement('div');
        wrapper.className = 'fixed pointer-events-none z-20';
        
        const centerX = rect.left + rect.width / 2;
        const offsetY = -4; // 贴着上边缘稍微往上点
        wrapper.style.left = `${centerX}px`;
        wrapper.style.top = `${rect.top + offsetY}px`;
        wrapper.style.transform = 'translateX(-50%)';

        // 内层：负责内容 + 动画
        const float = document.createElement('div');
        float.className = 'flex items-center justify-center gap-1 text-xl font-black animate-float-up';
        float.innerHTML = `<i data-lucide="zap" class="w-4 h-4 fill-current"></i> ${Math.floor(amount)}`;
        float.style.color = '#fff';

        wrapper.appendChild(float);
        document.body.appendChild(wrapper);
        lucide.createIcons({ root: wrapper });

        setTimeout(() => wrapper.remove(), 1500);
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

    // 📱 手机端：选中格子时自动呼出右侧详情抽屉
    if (window.innerWidth <= 1024 && typeof toggleDetailPanelMobile === 'function') {
        toggleDetailPanelMobile(true);
    }
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
    gameState.cells[idx] = createCell(creatureId);
    
    renderGrid(); 
    lastRenderedIndex = -2; 
    renderDetailPanel(idx);

    // 📱 手机种植后自动收起右侧详情抽屉
    if (window.innerWidth <= 1024 && typeof toggleDetailPanelMobile === 'function') {
        toggleDetailPanelMobile(false);  // 关闭右侧抽屉
    }
}

// 调试功能
window.debugAddMutation = (id) => {
    gameState.activeMutations.add(id);
    if(gameState.selectedCellIndex !== -1) renderDetailPanel(gameState.selectedCellIndex, false);
};