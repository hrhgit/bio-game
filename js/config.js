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
        cost: 50, baseOutput: 12, interval: 3500,
        foodConfig: null, 
        consumptionImpact: 0, starvationRate: 0, 
        color: 'text-fuchsia-300', baseColor: 'bg-fuchsia-950', fillColor: 'bg-fuchsia-600', borderColor: 'border-fuchsia-800', icon: 'sprout', desc: '富含稀有矿物质的植物。',
        relations: [{ target: 'algae', type: 'symbiosis', val: 0.1, msg: '藻带共生' }]
    },
    { 
        category: 'mollusk', id: 'plankton', name: '荧光浮游虫', tier: 2, maxLevel: 6, 
        cost: 150, baseOutput: 30, interval: 4000,
        foodConfig: { mode: 'OR', targets: ['algae'] }, 
        consumptionImpact: 0.3, starvationRate: -10, 
        color: 'text-cyan-300', baseColor: 'bg-cyan-950', fillColor: 'bg-cyan-600', borderColor: 'border-cyan-800', icon: 'bug', desc: '以蓝藻为食。',
        relations: [{ target: 'plankton', type: 'competition', val: -0.1, msg: '种群过密' }]
    },
    { 
        category: 'arthropod', id: 'crab', name: '晶石蟹', tier: 2, maxLevel: 6, 
        cost: 300, baseOutput: 60, interval: 5000,
        foodConfig: { mode: 'OR', targets: ['kelp'] }, 
        consumptionImpact: 0.3, starvationRate: -10, 
        color: 'text-pink-300', baseColor: 'bg-pink-950', fillColor: 'bg-pink-600', borderColor: 'border-pink-800', icon: 'gem', desc: '坚硬的甲壳，喜爱海带。',
        relations: [{ target: 'shrimp', type: 'symbiosis', val: 0.25, msg: '虾蟹互利' }]
    },
    { 
        category: 'arthropod', id: 'shrimp', name: '电光虾', tier: 2, maxLevel: 4, 
        cost: 200, baseOutput: 30, interval: 3000,
        foodConfig: { mode: 'OR', targets: ['algae', 'kelp'] }, 
        consumptionImpact: 0.3, starvationRate: -12, 
        color: 'text-yellow-300', baseColor: 'bg-yellow-950', fillColor: 'bg-yellow-600', borderColor: 'border-yellow-800', icon: 'zap', desc: '适应力强，可食用多种植物。',
        relations: [{ target: 'crab', type: 'symbiosis', val: 0.25, msg: '虾蟹互利' }]
    },
    { 
        category: 'mollusk', id: 'jellyfish', name: '幽灵水母', tier: 3, maxLevel: 8, 
        cost: 600, baseOutput: 100, interval: 5000,
        foodConfig: { mode: 'OR', targets: ['plankton', 'shrimp'] }, 
        consumptionImpact: 0.3, starvationRate: -15, 
        color: 'text-indigo-300', baseColor: 'bg-indigo-950', fillColor: 'bg-indigo-600', borderColor: 'border-indigo-800', icon: 'ghost', desc: '漂浮的捕食者。',
        relations: [
            { target: 'jellyfish', type: 'symbiosis', val: 0.1, msg: '水母群聚' },
            { target: 'eel', type: 'competition', val: -0.2, msg: '领地冲突' }
        ]
    },
    { 
        category: 'reptile', id: 'turtle', name: '装甲海龟', tier: 3, maxLevel: 20, 
        cost: 1000, baseOutput: 160, interval: 6000,
        foodConfig: { mode: 'OR', targets: ['crab', 'plankton'] }, 
        consumptionImpact: 0.3, starvationRate: -10, 
        color: 'text-emerald-300', baseColor: 'bg-emerald-950', fillColor: 'bg-emerald-600', borderColor: 'border-emerald-800', icon: 'shield', desc: '厚重的甲壳，食谱广泛。',
        relations: []
    },
    { 
        category: 'fish', id: 'eel', name: '雷霆鳗', tier: 3, maxLevel: 8, 
        cost: 1400, baseOutput: 160, interval: 4000,
        foodConfig: { mode: 'AND', targets: ['shrimp', 'plankton'] }, 
        consumptionImpact: 0.3, starvationRate: -18, 
        color: 'text-violet-300', baseColor: 'bg-violet-950', fillColor: 'bg-violet-600', borderColor: 'border-violet-800', icon: 'activity', desc: '敏捷的猎手，需多种食物。',
        relations: [
            { target: 'kelp', type: 'symbiosis', val: 0.3, msg: '伏击环境' },
            { target: 'jellyfish', type: 'competition', val: -0.2, msg: '领地冲突' }
        ]
    },
    { 
        category: 'fish', id: 'hunter', name: '深海猎手', tier: 4, maxLevel: 8, 
        cost: 2000, baseOutput: 300, interval: 6000,
        foodConfig: { mode: 'AND', targets: ['jellyfish', 'turtle'] }, 
        consumptionImpact: 0.3, starvationRate: -20, 
        color: 'text-orange-300', baseColor: 'bg-orange-950', fillColor: 'bg-orange-600', borderColor: 'border-orange-800', icon: 'crosshair', desc: '凶猛的顶级掠食者，成群狩猎。',
        relations: [{ target: 'algae', type: 'symbiosis', val: 0.3, msg: '富氧水域' }]
    },
    { 
        category: 'apex', id: 'leviathan', name: '深渊巨兽', tier: 5, maxLevel: 10, 
        cost: 4000, baseOutput: 650, interval: 8000,
        foodConfig: { mode: 'AND', targets: ['hunter', 'eel'] }, 
        consumptionImpact: 0.3, starvationRate: -30, 
        color: 'text-red-500', baseColor: 'bg-red-950', fillColor: 'bg-red-700', borderColor: 'border-red-800', icon: 'skull', desc: '深海的霸主，吞噬高阶猎手。',
        relations: [{ target: 'leviathan', type: 'competition', val: -0.5, msg: '王不见王' }]
    }
];

// =====================
// 生物索引表 & 快捷函数
// =====================
const CREATURE_MAP = {};
CREATURES.forEach(c => {
    CREATURE_MAP[c.id] = c;
});

function getCreatureDef(id) {
    return CREATURE_MAP[id];
}


// 关卡配置
const STAGE_CONFIG = {
    baseRate: 20,       // 第 1 关目标产出 /s
    rateStep: 12,       // "弯曲程度"的系数
    ratePower: 1.5,     // >1 就是越往后涨得越快；1.5~2 比较好调
    payMultiplier: 30   // 跳关需要的能量倍数
};

// 肉鸽道具稀有度主题
const RARITY_THEME = {
    '普通': {
        border: 'border-gray-700',
        bg: 'bg-gray-800/50',
        title: 'text-gray-300',
        icon: 'text-gray-500',
        badge: 'text-gray-500',
        btnEnabled: 'border-gray-500 text-gray-300 hover:bg-gray-700 hover:border-gray-400 hover:text-gray-300'
    },
    '稀有': {
        border: 'border-green-600/50',
        bg: 'bg-green-900/50',
        title: 'text-green-100',
        icon: 'text-green-400',
        badge: 'text-green-500',
        btnEnabled: 'border-green-600/50 text-green-400 hover:bg-green-500/20 hover:border-green-400/50 hover:text-green-300'
    },
    '罕见': {
        border: 'border-sky-600/50',
        bg: 'bg-sky-900/50',
        title: 'text-sky-100',
        icon: 'text-sky-400',
        badge: 'text-sky-500',
        btnEnabled: 'border-sky-600/50 text-sky-400 hover:bg-sky-500/20 hover:border-sky-400/50 hover:text-sky-300'
    },
    '史诗': {
        border: 'border-purple-600/50',
        bg: 'bg-purple-900/50',
        title: 'text-purple-100',
        icon: 'text-purple-400',
        badge: 'text-purple-500',
        btnEnabled: 'border-purple-600/50 text-purple-400 hover:bg-purple-500/20 hover:border-purple-400/50 hover:text-purple-300'
    },
    '传说': {
        border: 'border-amber-500/50',
        bg: 'bg-amber-900/50',
        title: 'text-amber-100',
        icon: 'text-amber-400',
        badge: 'text-amber-500',
        btnEnabled: 'border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:border-amber-300/50 hover:text-amber-200'
    }
};

// 肉鸽道具稀有度权重（权重越大，被刷出的概率越高）
const ROGUE_RARITY_WEIGHTS = {
    '普通': 60,
    '稀有': 25,
    '罕见': 10,
    '史诗': 4,
    '传说': 1
};

// 肉鸽道具池
const ROGUE_ITEMS_POOL = [
    { id:'chloroplast_outburst', name:'叶绿爆发', desc:'所有 T1 生产者 +30% 速度', mutationId:'chloroplast_outburst', rarity: '普通', icon: 'sprout', color: 'text-green-400', bgColor: 'bg-gray-500' },
    { id:'edge_effect', name:'边缘效应', desc:'边缘格子 +25% 速度', mutationId:'edge_effect', rarity: '普通', icon: 'border-all', color: 'text-blue-400', bgColor: 'bg-gray-500' },
    
    { id:'interlaced_complement', name:'交错生态', desc:'四周没有同类时 +40% 速度', mutationId:'interlaced_complement', rarity: '稀有', icon: 'grid-3x3', color: 'text-emerald-400', bgColor: 'bg-green-600' },
    { id:'predator_instinct', name:'掠食本能', desc:'T4 及以上掠食者 +20% 速度', mutationId:'predator_instinct', rarity: '稀有', icon: 'target', color: 'text-red-400', bgColor: 'bg-green-600' },
    
    { id:'triplet_resonance', name:'三相共振', desc:'同类三连成线时，该类 +50% 产出', mutationId:'triplet_resonance', rarity: '罕见', icon: 'zap', color: 'text-yellow-400', bgColor: 'bg-sky-600' },
    { id:'quantum_link', name:'量子牵引', desc:'共生/竞争改为包含斜角邻居', mutationId:'quantum_link', rarity: '罕见', icon: 'link', color: 'text-purple-400', bgColor: 'bg-sky-600' },
    
    { id:'quad_core', name:'四核矩阵', desc:'2x2 方阵同类时 +80% 速度', mutationId:'quad_core', rarity: '史诗', icon: 'box', color: 'text-indigo-400', bgColor: 'bg-purple-600' },
    { id:'hyper_symbiosis', name:'超共生', desc:'所有共生加成翻倍', mutationId:'hyper_symbiosis', rarity: '史诗', icon: 'heart', color: 'text-pink-400', bgColor: 'bg-purple-600' },
    { id:'greedy_digestion', name:'贪婪消化', desc:'食物富余转化为 Buff 的效率提高', mutationId:'greedy_digestion', rarity: '史诗', icon: 'utensils', color: 'text-orange-400', bgColor: 'bg-purple-600' },
    
    { id:'central_dogma', name:'中央意识核', desc:'中心 3x3 区域 +100% 速度', mutationId:'central_dogma', rarity: '传说', icon: 'cpu', color: 'text-amber-400', bgColor: 'bg-amber-600' },
    { id:'peace_treaty', name:'宁静条约', desc:'忽略所有竞争惩罚', mutationId:'peace_treaty', rarity: '传说', icon: 'shield', color: 'text-cyan-400', bgColor: 'bg-amber-600' }
];

// tier → 稀有度
const RARITY_BY_TIER = {
    1: '普通',
    2: '稀有',
    3: '罕见',
    4: '史诗',
    5: '传说'
};

// 为每个生物生成一个对应的「产出 +10%」可叠加道具
const PER_CREATURE_BOOST_ITEMS = CREATURES.map(cre => ({
    id: `boost_${cre.id}`,
    name: `${cre.name} 适应性强化`,
    desc: `为【${cre.name}】额外增加 10% 基础产出，可在不同刷新中多次购买并叠加。`,
    rarity: RARITY_BY_TIER[cre.tier] || '普通',

    icon: cre.icon || 'zap',
    color: cre.color || 'text-amber-300',
    bgColor: cre.fillColor || cre.baseColor || 'bg-slate-800',

    kind: 'creature_boost',
    stackable: true,
    targetCreatureId: cre.id
}));

ROGUE_ITEMS_POOL.push(...PER_CREATURE_BOOST_ITEMS);

// 游戏基础配置
const CONFIG = { 
    initialEnergy: 100, 
    tickRate: 100 
};

const MAX_ROGUE_ITEM_BAR = 5;