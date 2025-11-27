// 音效系统
const SoundSystem = {
    ctx: null, 
    muted: false, 
    masterGain: null,
    
    init: function() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; 
        this.masterGain.connect(this.ctx.destination);
    },
    
    toggle: function() {
        this.muted = !this.muted;
        const btn = document.getElementById('sound-btn');
        if (this.muted) {
            btn.innerHTML = '<i data-lucide="volume-x" class="w-5 h-5 text-red-400"></i>';
            if (this.masterGain) this.masterGain.gain.value = 0;
        } else {
            btn.innerHTML = '<i data-lucide="volume-2" class="w-5 h-5"></i>';
            if (this.masterGain) this.masterGain.gain.value = 0.3;
            this.init(); 
            if(this.ctx.state === 'suspended') this.ctx.resume();
        }
        lucide.createIcons({root: btn});
    },
    
    playTone: function(freq, type, duration, startTime = 0) {
        if (this.muted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    },
    
    playPlace: function() { 
        this.init(); 
        this.playTone(600, 'sine', 0.1); 
        this.playTone(800, 'sine', 0.1, 0.05); 
    },
    
    playRemove: function() { 
        this.init(); 
        this.playTone(150, 'sawtooth', 0.2); 
    },
    
    playLevelUp: function() { 
        this.init(); 
        this.playTone(880, 'sine', 0.3, 0); 
        this.playTone(1108, 'sine', 0.3, 0.1); 
        this.playTone(1318, 'sine', 0.5, 0.2); 
    },
    
    playUpgrade: function() { 
        this.init(); 
        this.playTone(440, 'triangle', 0.2, 0);
        this.playTone(554, 'triangle', 0.2, 0.1); 
        this.playTone(659, 'triangle', 0.4, 0.2); 
    },
    
    playError: function() { 
        this.init(); 
        this.playTone(150, 'square', 0.1); 
        this.playTone(100, 'square', 0.1, 0.1); 
    }
};