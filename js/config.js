// 游戏配置数据
const CATEGORIES = {
    'plant': { name: '海草藻类', color: 'text-green-400', icon: 'sprout', badgeColor: 'bg-green-900/50 border-green-800 text-green-300' },
    'mollusk': { name: '浮游软体', color: 'text-cyan-300', icon: 'ghost', badgeColor: 'bg-cyan-900/50 border-cyan-800 text-cyan-300' },
    'arthropod': { name: '甲壳节肢', color: 'text-orange-300', icon: 'gem', badgeColor: 'bg-orange-900/50 border-orange-800 text-orange-300' },
    'fish': { name: '深海鱼类', color: 'text-blue-400', icon: 'fish', badgeColor: 'bg-blue-900/50 border-blue-800 text-blue-300' },
    'reptile': { name: '两栖爬行', color: 'text-emerald-400', icon: 'shield', badgeColor: 'bg-emerald-900/50 border-emerald-800 text-emerald-300' },
    'apex': { name: '远古巨兽', color: 'text-red-500', icon: 'skull', badgeColor: 'bg-red-900/50 border-red-800 text-red-300' }
};

const CREATURES = [
    { 
        category: 'plant', id: 'algae', name: '光合蓝藻', tier: 1, maxLevel: 4, 
        cost: 40, baseOutput: 7, interval: 2500,
        foodConfig: null, 
        consumptionImpact: 0, starvationRate: 0, 
        color: 'text-green-300', baseColor: 'bg-green-950', fillColor: 'bg-green-600', borderColor: 'border-green-800', icon: 'leaf', desc: '基础生产者，吸收光能。',
        relations: [{ target: 'kelp', type: 'symbiosis', val: 0.1, msg: '藻带共生' }] 
    },
    { 
        category: 'plant', id: 'kelp', name: '紫晶海带', tier: 1, maxLevel: 4, 
        cost: 60, baseOutput: 10, interval: 3500,
        foodConfig: null, 
        consumptionImpact: 0, starvationRate: 0, 
        color: 'text-fuchsia-300', baseColor: 'bg-fuchsia-950', fillColor: 'bg-fuchsia-600', borderColor: 'border-fuchsia-800', icon: 'sprout', desc: '富含稀有矿物质的植物。',
        relations: [{ target: 'algae', type: 'symbiosis', val: 0.1, msg: '藻带共生' }]
    },
    { 
        category: 'mollusk', id: 'plankton', name: '荧光浮游虫', tier: 2, maxLevel: 6, 
        cost: 160, baseOutput: 32, interval: 4000,
        foodConfig: { mode: 'OR', targets: ['algae'] }, 
        consumptionImpact: 0.4, starvationRate: -10, 
        color: 'text-cyan-300', baseColor: 'bg-cyan-950', fillColor: 'bg-cyan-600', borderColor: 'border-cyan-800', icon: 'bug', desc: '以蓝藻为食。',
        relations: [{ target: 'plankton', type: 'competition', val: -0.1, msg: '种群过密' }]
    },
    { 
        category: 'arthropod', id: 'crab', name: '晶石蟹', tier: 2, maxLevel: 5, 
        cost: 200, baseOutput: 50, interval: 5000,
        foodConfig: { mode: 'OR', targets: ['kelp'] }, 
        consumptionImpact: 0.4, starvationRate: -10, 
        color: 'text-pink-300', baseColor: 'bg-pink-950', fillColor: 'bg-pink-600', borderColor: 'border-pink-800', icon: 'gem', desc: '坚硬的甲壳，喜爱海带。',
        relations: [{ target: 'shrimp', type: 'symbiosis', val: 0.25, msg: '虾蟹互利' }]
    },
    { 
        category: 'arthropod', id: 'shrimp', name: '电光虾', tier: 2, maxLevel: 8, 
        cost: 200, baseOutput: 24, interval: 3000,
        foodConfig: { mode: 'OR', targets: ['algae', 'kelp'] }, 
        consumptionImpact: 0.4, starvationRate: -12, 
        color: 'text-yellow-300', baseColor: 'bg-yellow-950', fillColor: 'bg-yellow-600', borderColor: 'border-yellow-800', icon: 'zap', desc: '适应力强，可食用多种植物。',
        relations: [{ target: 'crab', type: 'symbiosis', val: 0.25, msg: '虾蟹互利' }]
    },
    { 
        category: 'mollusk', id: 'jellyfish', name: '幽灵水母', tier: 3, maxLevel: 8, 
        cost: 800, baseOutput: 240, interval: 6000,
        foodConfig: { mode: 'OR', targets: ['plankton', 'shrimp'] }, 
        consumptionImpact: 0.6, starvationRate: -15, 
        color: 'text-indigo-300', baseColor: 'bg-indigo-950', fillColor: 'bg-indigo-600', borderColor: 'border-indigo-800', icon: 'ghost', desc: '漂浮的捕食者。',
        relations: [
            { target: 'jellyfish', type: 'symbiosis', val: 0.1, msg: '水母群聚' },
            { target: 'eel', type: 'competition', val: -0.2, msg: '领地冲突' }
        ]
    },
    { 
        category: 'reptile', id: 'turtle', name: '装甲海龟', tier: 3, maxLevel: 20, 
        cost: 1200, baseOutput: 300, interval: 8000,
        foodConfig: { mode: 'OR', targets: ['crab', 'plankton'] }, 
        consumptionImpact: 0.6, starvationRate: -10, 
        color: 'text-emerald-300', baseColor: 'bg-emerald-950', fillColor: 'bg-emerald-600', borderColor: 'border-emerald-800', icon: 'shield', desc: '厚重的甲壳，食谱广泛。',
        relations: []
    },
    { 
        category: 'fish', id: 'eel', name: '雷霆鳗', tier: 3, maxLevel: 12, 
        cost: 800, baseOutput: 140, interval: 4000,
        foodConfig: { mode: 'AND', targets: ['shrimp', 'plankton'] }, 
        consumptionImpact: 0.6, starvationRate: -18, 
        color: 'text-violet-300', baseColor: 'bg-violet-950', fillColor: 'bg-violet-600', borderColor: 'border-violet-800', icon: 'activity', desc: '敏捷的猎手，需多种食物。',
        relations: [
            { target: 'kelp', type: 'symbiosis', val: 0.3, msg: '伏击环境' },
            { target: 'jellyfish', type: 'competition', val: -0.2, msg: '领地冲突' }
        ]
    },
    { 
        category: 'fish', id: 'hunter', name: '深海猎手', tier: 4, maxLevel: 10, 
        cost: 2400, baseOutput: 600, interval: 6000,
        foodConfig: { mode: 'AND', targets: ['jellyfish', 'turtle'] }, 
        consumptionImpact: 0.8, starvationRate: -20, 
        color: 'text-orange-300', baseColor: 'bg-orange-950', fillColor: 'bg-orange-600', borderColor: 'border-orange-800', icon: 'crosshair', desc: '凶猛的顶级掠食者，成群狩猎。',
        relations: [{ target: 'algae', type: 'symbiosis', val: 0.3, msg: '富氧水域' }]
    },
    { 
        category: 'apex', id: 'leviathan', name: '深渊巨兽', tier: 5, maxLevel: 10, 
        cost: 4800, baseOutput: 1920, interval: 8000,
        foodConfig: { mode: 'AND', targets: ['hunter', 'eel'] }, 
        consumptionImpact: 0.9, starvationRate: -30, 
        color: 'text-red-500', baseColor: 'bg-red-950', fillColor: 'bg-red-700', borderColor: 'border-red-800', icon: 'skull', desc: '深海的霸主，吞噬高阶猎手。',
        relations: [{ target: 'leviathan', type: 'competition', val: -0.5, msg: '王不见王' }]
    }
];

// 关卡配置
const STAGE_CONFIG = {
    baseRate: 20,      // 第 1 关目标产出 /s
    rateStep: 15,      // 每关增加多少目标产出
    payMultiplier: 30  // 跳关需要的能量倍数
};

// 肉鸽道具池
const ROGUE_ITEMS_POOL = [
    { id:'chloroplast_outburst', name:'叶绿爆发', desc:'所有 T1 生产者 +30% 速度', mutationId:'chloroplast_outburst', rarity: '普通' },
    { id:'edge_effect', name:'边缘效应', desc:'边缘格子 +25% 速度', mutationId:'edge_effect', rarity: '普通' },
    
    { id:'interlaced_complement', name:'交错生态', desc:'四周没有同类时 +40% 速度', mutationId:'interlaced_complement', rarity: '稀有' },
    { id:'predator_instinct', name:'掠食本能', desc:'T4 及以上掠食者 +20% 速度', mutationId:'predator_instinct', rarity: '稀有' },
    
    { id:'triplet_resonance', name:'三相共振', desc:'同类三连成线时，该类 +50% 产出', mutationId:'triplet_resonance', rarity: '罕见' },
    { id:'quantum_link', name:'量子牵引', desc:'共生/竞争改为包含斜角邻居', mutationId:'quantum_link', rarity: '罕见' },
    
    { id:'quad_core', name:'四核矩阵', desc:'2x2 方阵同类时 +80% 速度', mutationId:'quad_core', rarity: '史诗' },
    { id:'hyper_symbiosis', name:'超共生', desc:'所有共生加成翻倍', mutationId:'hyper_symbiosis', rarity: '史诗' },
    { id:'greedy_digestion', name:'贪婪消化', desc:'食物富余转化为 Buff 的效率提高', mutationId:'greedy_digestion', rarity: '史诗' },
    
    { id:'central_dogma', name:'中央意识核', desc:'中心 3x3 区域 +100% 速度', mutationId:'central_dogma', rarity: '传说' },
    { id:'peace_treaty', name:'宁静条约', desc:'忽略所有竞争惩罚', mutationId:'peace_treaty', rarity: '传说' }
];

// 游戏基础配置
const CONFIG = { 
    initialEnergy: 100, 
    tickRate: 100 
};