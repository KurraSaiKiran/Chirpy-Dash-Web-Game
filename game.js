class ChirpyDash {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = 'start'; // start, playing, gameOver
        
        // Game objects
        this.bird = {
            x: 100,
            y: 300,
            width: 40,
            height: 30,
            velocity: 0,
            gravity: 0.5,
            jumpPower: -8,
            rotation: 0,
            flapAnimation: 0,
            glowIntensity: 0,
            sparkles: [],
            skin: localStorage.getItem('chirpySkin') || 'classic',
            shield: 0,
            magnet: 0
        };
        
        this.pipes = [];
        this.pipeWidth = 60;
        this.pipeGap = 150;
        this.pipeSpeed = 2;
        
        this.powerups = [];
        this.raindrops = [];
        this.thunderIntensity = 0;
        
        this.score = 0;
        this.bestScore = localStorage.getItem('chirpyBestScore') || 0;
        this.playerNickname = '';
        
        // Initialize Supabase
        this.supabase = supabase.createClient(
            'https://iadtqegehglrdwomfdhv.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhZHRxZWdlaGdscmR3b21mZGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3Njc5ODIsImV4cCI6MjA3MzM0Mzk4Mn0.tUGL8MF1_P8oaA5z2PL3HccJKrlfzCmmxM28Ju_gG8s'
        );
        
        // Background elements
        this.clouds = [];
        this.lightning = [];
        this.backgroundOffset = 0;
        
        // Audio setup
        this.audioContext = null;
        this.initAudio();
        
        this.initClouds();
        this.setupEventListeners();
        this.gameLoop();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    playFlapSound() {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
    
    initClouds() {
        for (let i = 0; i < 8; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width * 2,
                y: Math.random() * 200 + 50,
                width: Math.random() * 100 + 80,
                height: Math.random() * 40 + 30,
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.3 + 0.2
            });
        }
    }
    
    setupEventListeners() {
        // Desktop controls
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleInput();
            }
        });
        
        // Mouse/touch controls
        this.canvas.addEventListener('click', () => this.handleInput());
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleInput();
        });
        
        // Restart button
        const restartBtn = document.getElementById('restartBtn');
        restartBtn.addEventListener('click', () => this.restart());
        restartBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.restart();
        });
        
        // Skin selection
        document.querySelectorAll('.skin').forEach(skin => {
            skin.addEventListener('click', () => this.selectSkin(skin.dataset.skin));
        });
        
        const playBtn = document.getElementById('playBtn');
        playBtn.addEventListener('click', () => this.hideSkinSelector());
        playBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.hideSkinSelector();
        });
        
        // Start button
        const startBtn = document.getElementById('startBtn');
        startBtn.addEventListener('click', () => this.handleStartGame());
        startBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleStartGame();
        });
    }
    
    handleInput() {
        if (this.gameState === 'start') {
            return;
        } else if (this.gameState === 'playing') {
            this.playFlapSound();
            this.bird.velocity = this.bird.jumpPower;
            this.bird.flapAnimation = 10;
            this.bird.glowIntensity = 20;
            
            // Add sparkles on flap
            for(let i = 0; i < 8; i++) {
                this.bird.sparkles.push({
                    x: this.bird.x + Math.random() * this.bird.width,
                    y: this.bird.y + Math.random() * this.bird.height,
                    vx: (Math.random() - 0.5) * 4,
                    vy: Math.random() * -3 - 1,
                    life: 30 + Math.random() * 20,
                    size: Math.random() * 3 + 1,
                    color: Math.random() > 0.5 ? '#ffd700' : '#3498db'
                });
            }
        }
    }
    
    async handleStartGame() {
        const nickname = document.getElementById('nicknameInput').value.trim();
        const errorDiv = document.getElementById('nicknameError');
        const startBtn = document.getElementById('startBtn');
        
        // Clear previous errors
        errorDiv.classList.add('hidden');
        
        if (!nickname) {
            this.showError('Please enter a nickname!');
            return;
        }
        
        if (nickname.length < 2) {
            this.showError('Nickname must be at least 2 characters!');
            return;
        }
        
        // Disable button and show loading
        startBtn.disabled = true;
        startBtn.textContent = 'Checking...';
        
        // Check if nickname is unique
        const isUnique = await this.checkNicknameUnique(nickname);
        
        if (!isUnique) {
            this.showError('Name already taken! Choose another.');
            startBtn.disabled = false;
            startBtn.textContent = 'Start Game';
            return;
        }
        
        this.playerNickname = nickname;
        startBtn.disabled = false;
        startBtn.textContent = 'Start Game';
        this.showSkinSelector();
    }
    
    showError(message) {
        const errorDiv = document.getElementById('nicknameError');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
    
    async checkNicknameUnique(nickname) {
        try {
            const { data, error } = await this.supabase
                .from('scores')
                .select('nickname')
                .ilike('nickname', nickname)
                .limit(1);
            
            if (error) throw error;
            return data.length === 0;
        } catch (err) {
            console.error('Error checking nickname:', err);
            return true; // Allow if check fails
        }
    }
    
    showSkinSelector() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('skinSelector').classList.remove('hidden');
    }
    
    hideSkinSelector() {
        document.getElementById('skinSelector').classList.add('hidden');
        this.startGame();
    }
    
    selectSkin(skinType) {
        document.querySelectorAll('.skin').forEach(s => s.classList.remove('active'));
        document.querySelector(`[data-skin="${skinType}"]`).classList.add('active');
        this.bird.skin = skinType;
        localStorage.setItem('chirpySkin', skinType);
    }
    
    startGame() {
        this.gameState = 'playing';
        this.score = 0;
        this.bird.y = 300;
        this.bird.velocity = 0;
        this.pipes = [];
        this.lightning = [];
        
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameUI').classList.remove('hidden');
        
        // Generate initial pipes
        for (let i = 0; i < 3; i++) {
            this.addPipe(this.canvas.width + i * 250);
        }
    }
    
    restart() {
        this.gameState = 'start';
        document.getElementById('gameOverScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('gameUI').classList.add('hidden');
    }
    
    addPipe(x) {
        const minHeight = 50;
        const maxHeight = this.canvas.height - this.pipeGap - minHeight - 100;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        const colors = ['#e74c3c', '#9b59b6', '#3498db', '#1abc9c', '#f39c12', '#e67e22'];
        
        this.pipes.push({
            x: x,
            topHeight: topHeight,
            bottomY: topHeight + this.pipeGap,
            bottomHeight: this.canvas.height - (topHeight + this.pipeGap) - 100,
            passed: false,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
    
    update() {
        if (this.gameState !== 'playing') return;
        
        // Update bird
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;
        this.bird.rotation = Math.min(Math.max(this.bird.velocity * 3, -30), 90);
        
        if (this.bird.flapAnimation > 0) {
            this.bird.flapAnimation--;
            this.bird.glowIntensity = Math.max(this.bird.glowIntensity - 2, 0);
        }
        
        // Update sparkles
        for(let i = this.bird.sparkles.length - 1; i >= 0; i--) {
            const sparkle = this.bird.sparkles[i];
            sparkle.life--;
            sparkle.x -= 2;
            sparkle.y += sparkle.vy;
            sparkle.vy += 0.1;
            if(sparkle.life <= 0) {
                this.bird.sparkles.splice(i, 1);
            }
        }
        
        // Update pipes
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= this.pipeSpeed;
            
            // Check if bird passed pipe
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                document.getElementById('score').textContent = this.score;
            }
            
            // Remove off-screen pipes
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
            }
        }
        
        // Add new pipes
        if (this.pipes.length > 0 && this.pipes[this.pipes.length - 1].x < this.canvas.width - 250) {
            this.addPipe(this.canvas.width);
        }
        
        // Spawn power-ups
        if (Math.random() < 0.005) {
            this.addPowerup();
        }
        
        // Update power-ups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            const powerup = this.powerups[i];
            powerup.x -= this.pipeSpeed;
            powerup.rotation += 0.1;
            
            // Check collection
            if (this.checkPowerupCollision(powerup)) {
                this.collectPowerup(powerup.type);
                this.powerups.splice(i, 1);
            } else if (powerup.x < -50) {
                this.powerups.splice(i, 1);
            }
        }
        
        // Update power-up effects
        if (this.bird.shield > 0) this.bird.shield--;
        if (this.bird.magnet > 0) this.bird.magnet--;
        
        // Enhanced weather
        this.thunderIntensity = Math.max(0, this.thunderIntensity - 1);
        if (Math.random() < 0.002) {
            this.thunderIntensity = 30;
        }
        
        // Rain drops
        if (this.score > 10 && Math.random() < 0.02) {
            this.raindrops.push({
                x: this.canvas.width + Math.random() * 100,
                y: Math.random() * 200,
                speed: Math.random() * 3 + 2
            });
        }
        
        for (let i = this.raindrops.length - 1; i >= 0; i--) {
            const drop = this.raindrops[i];
            drop.x -= drop.speed;
            drop.y += drop.speed * 0.5;
            if (drop.x < -10 || drop.y > this.canvas.height) {
                this.raindrops.splice(i, 1);
            }
        }
        
        // Update background
        this.backgroundOffset -= 0.5;
        if (this.backgroundOffset <= -this.canvas.width) {
            this.backgroundOffset = 0;
        }
        
        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed;
            if (cloud.x + cloud.width < 0) {
                cloud.x = this.canvas.width + Math.random() * 200;
            }
        });
        
        // Random lightning
        if (Math.random() < 0.003) {
            this.addLightning();
        }
        
        // Update lightning
        for (let i = this.lightning.length - 1; i >= 0; i--) {
            this.lightning[i].life--;
            if (this.lightning[i].life <= 0) {
                this.lightning.splice(i, 1);
            }
        }
        
        // Check collisions
        this.checkCollisions();
        
        this.updatePowerupUI();
    }
    
    addLightning() {
        this.lightning.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * 200,
            width: 3,
            height: Math.random() * 150 + 100,
            life: 15,
            opacity: 1
        });
    }
    
    checkCollisions() {
        // Ground collision
        if (this.bird.y + this.bird.height > this.canvas.height - 100) {
            if (this.bird.shield > 0) {
                this.bird.shield = 0;
                this.bird.y = this.canvas.height - 150;
                return;
            }
            this.gameOver();
            return;
        }
        
        // Ceiling collision
        if (this.bird.y < 0) {
            if (this.bird.shield > 0) {
                this.bird.shield = 0;
                this.bird.y = 50;
                return;
            }
            this.gameOver();
            return;
        }
        
        // Pipe collision
        for (const pipe of this.pipes) {
            if (this.bird.x < pipe.x + this.pipeWidth &&
                this.bird.x + this.bird.width > pipe.x) {
                
                if (this.bird.y < pipe.topHeight ||
                    this.bird.y + this.bird.height > pipe.bottomY) {
                    if (this.bird.shield > 0) {
                        this.bird.shield = 0;
                        return;
                    }
                    this.gameOver();
                    return;
                }
            }
        }
    }
    
    addPowerup() {
        const types = ['shield', 'magnet', 'boost'];
        this.powerups.push({
            x: this.canvas.width,
            y: Math.random() * 400 + 100,
            type: types[Math.floor(Math.random() * types.length)],
            rotation: 0
        });
    }
    
    checkPowerupCollision(powerup) {
        const distance = Math.sqrt(
            Math.pow(this.bird.x + this.bird.width/2 - powerup.x, 2) +
            Math.pow(this.bird.y + this.bird.height/2 - powerup.y, 2)
        );
        return distance < 30;
    }
    
    collectPowerup(type) {
        switch(type) {
            case 'shield':
                this.bird.shield = 300;
                break;
            case 'magnet':
                this.bird.magnet = 600;
                this.score += 2;
                break;
            case 'boost':
                this.bird.velocity = this.bird.jumpPower * 1.5;
                this.score += 1;
                break;
        }
    }
    
    updatePowerupUI() {
        const ui = document.getElementById('powerupUI');
        ui.innerHTML = '';
        if (this.bird.shield > 0) {
            ui.innerHTML += '<div class="powerup-icon" style="background: #3498db;">🛡️</div>';
        }
        if (this.bird.magnet > 0) {
            ui.innerHTML += '<div class="powerup-icon" style="background: #f39c12;">🧲</div>';
        }
    }
    
    async gameOver() {
        this.gameState = 'gameOver';
        
        // Update best score
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('chirpyBestScore', this.bestScore);
        }
        
        // Save score to Supabase
        await this.saveScore(this.playerNickname, this.score);
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('bestScore').textContent = this.bestScore;
        document.getElementById('gameUI').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.remove('hidden');
        
        // Load and display leaderboard
        await this.displayLeaderboard();
    }
    
    async saveScore(nickname, score) {
        try {
            const { error } = await this.supabase
                .from('scores')
                .upsert({ 
                    nickname, 
                    score 
                }, {
                    onConflict: 'nickname',
                    ignoreDuplicates: false
                });
            
            if (error) {
                console.error('Error saving score:', error);
                // If nickname conflict, update with higher score only
                if (error.code === '23505') {
                    await this.updateScoreIfHigher(nickname, score);
                }
            }
        } catch (err) {
            console.error('Failed to save score:', err);
        }
    }
    
    async updateScoreIfHigher(nickname, newScore) {
        try {
            const { data: currentData } = await this.supabase
                .from('scores')
                .select('score')
                .eq('nickname', nickname)
                .single();
            
            if (currentData && newScore > currentData.score) {
                await this.supabase
                    .from('scores')
                    .update({ score: newScore, created_at: new Date().toISOString() })
                    .eq('nickname', nickname);
            }
        } catch (err) {
            console.error('Failed to update score:', err);
        }
    }
    
    async getTopScores(limit = 10) {
        try {
            const { data, error } = await this.supabase
                .from('scores')
                .select('nickname, score, created_at')
                .order('score', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Failed to fetch scores:', err);
            return [];
        }
    }
    
    async displayLeaderboard() {
        const scores = await this.getTopScores(10);
        const leaderboardList = document.getElementById('leaderboardList');
        
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<p>No scores yet!</p>';
            return;
        }
        
        leaderboardList.innerHTML = scores.map((entry, index) => {
            const isCurrentPlayer = entry.nickname === this.playerNickname && entry.score === this.score;
            return `
                <div class="leaderboard-entry ${isCurrentPlayer ? 'current-player' : ''}">
                    <span>${index + 1}. ${entry.nickname}</span>
                    <span>${entry.score}</span>
                </div>
            `;
        }).join('');
    }
    
    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Enhanced animated background
        const intensity = this.thunderIntensity / 30;
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, intensity > 0.5 ? '#4a6741' : '#2c3e50');
        gradient.addColorStop(0.5, intensity > 0.3 ? '#5a7c50' : '#34495e');
        gradient.addColorStop(1, '#1a1a1a');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Thunder flash
        if (this.thunderIntensity > 25) {
            this.ctx.save();
            this.ctx.globalAlpha = (this.thunderIntensity - 25) / 5;
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
        
        // Draw clouds
        this.drawClouds();
        
        // Draw lightning
        this.drawLightning();
        
        // Draw ground
        this.ctx.fillStyle = '#27ae60';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        // Draw grass texture
        this.ctx.fillStyle = '#2ecc71';
        for (let i = 0; i < this.canvas.width; i += 20) {
            this.ctx.fillRect(i, this.canvas.height - 100, 10, 5);
        }
        
        if (this.gameState === 'playing' || this.gameState === 'gameOver') {
            // Draw rain
            this.drawRain();
            
            // Draw pipes
            this.drawPipes();
            
            // Draw power-ups
            this.drawPowerups();
            
            // Draw bird sparkles
            this.drawSparkles();
            
            // Draw bird with glow
            this.drawBirdGlow();
            this.drawBird();
        }
    }
    
    drawClouds() {
        this.clouds.forEach(cloud => {
            this.ctx.save();
            this.ctx.globalAlpha = cloud.opacity;
            
            // Cloud shadow
            this.ctx.fillStyle = '#1a1a1a';
            this.ctx.beginPath();
            this.ctx.ellipse(cloud.x + 5, cloud.y + 5, cloud.width/2, cloud.height/2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Main cloud
            this.ctx.fillStyle = '#34495e';
            this.ctx.beginPath();
            this.ctx.ellipse(cloud.x, cloud.y, cloud.width/2, cloud.height/2, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Cloud highlight
            this.ctx.fillStyle = '#4a6278';
            this.ctx.beginPath();
            this.ctx.ellipse(cloud.x - cloud.width/4, cloud.y - cloud.height/4, cloud.width/3, cloud.height/3, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.restore();
        });
    }
    
    drawLightning() {
        this.lightning.forEach(bolt => {
            this.ctx.save();
            this.ctx.globalAlpha = bolt.opacity * (bolt.life / 15);
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = bolt.width;
            this.ctx.shadowColor = '#3498db';
            this.ctx.shadowBlur = 10;
            
            this.ctx.beginPath();
            this.ctx.moveTo(bolt.x, bolt.y);
            
            // Create zigzag pattern
            let currentY = bolt.y;
            const segments = 8;
            const segmentHeight = bolt.height / segments;
            
            for (let i = 0; i < segments; i++) {
                const nextX = bolt.x + (Math.random() - 0.5) * 30;
                currentY += segmentHeight;
                this.ctx.lineTo(nextX, currentY);
            }
            
            this.ctx.stroke();
            this.ctx.restore();
        });
    }
    
    drawPipes() {
        this.pipes.forEach(pipe => {
            // Pipe gradient with unique color
            const gradient = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + this.pipeWidth, 0);
            const baseColor = pipe.color;
            const lightColor = this.lightenColor(baseColor, 20);
            const darkColor = this.darkenColor(baseColor, 20);
            
            gradient.addColorStop(0, darkColor);
            gradient.addColorStop(0.5, lightColor);
            gradient.addColorStop(1, darkColor);
            
            // Top pipe
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(pipe.x, 0, this.pipeWidth, pipe.topHeight);
            
            // Top pipe cap
            this.ctx.fillStyle = baseColor;
            this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, this.pipeWidth + 10, 20);
            
            // Bottom pipe
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(pipe.x, pipe.bottomY, this.pipeWidth, pipe.bottomHeight);
            
            // Bottom pipe cap
            this.ctx.fillStyle = baseColor;
            this.ctx.fillRect(pipe.x - 5, pipe.bottomY, this.pipeWidth + 10, 20);
            
            // Pipe highlights
            this.ctx.fillStyle = lightColor;
            this.ctx.fillRect(pipe.x + 5, 0, 5, pipe.topHeight);
            this.ctx.fillRect(pipe.x + 5, pipe.bottomY, 5, pipe.bottomHeight);
        });
    }
    
    lightenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
            (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
            (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
    }
    
    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2);
        this.ctx.rotate(this.bird.rotation * Math.PI / 180);
        
        // 3D Bird Shadow
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#000';
        this.ctx.scale(1, 0.5);
        this.ctx.translate(3, 8);
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.bird.width/2, this.bird.height/2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
        
        // 3D Bird Body with gradient
        const bodyGradient = this.ctx.createRadialGradient(-8, -8, 0, 0, 0, 25);
        bodyGradient.addColorStop(0, '#ffd700');
        bodyGradient.addColorStop(0.6, '#f1c40f');
        bodyGradient.addColorStop(1, '#d4ac0d');
        this.ctx.fillStyle = bodyGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.bird.width/2, this.bird.height/2, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Body highlight
        const highlight = this.ctx.createRadialGradient(-10, -10, 0, -5, -5, 12);
        highlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        highlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
        this.ctx.fillStyle = highlight;
        this.ctx.beginPath();
        this.ctx.ellipse(-5, -5, 8, 6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 3D Wings with animation
        const wingAngle = this.bird.flapAnimation > 0 ? -0.3 : 0.2;
        const wingGradient = this.ctx.createLinearGradient(-15, -10, -5, 10);
        wingGradient.addColorStop(0, '#5dade2');
        wingGradient.addColorStop(0.5, '#3498db');
        wingGradient.addColorStop(1, '#2874a6');
        
        this.ctx.save();
        this.ctx.rotate(wingAngle);
        this.ctx.fillStyle = wingGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(-8, 0, 12, 8, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Wing feather details
        this.ctx.strokeStyle = '#2874a6';
        this.ctx.lineWidth = 1;
        for(let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(-15 + i*3, -5);
            this.ctx.lineTo(-10 + i*3, 5);
            this.ctx.stroke();
        }
        this.ctx.restore();
        
        // 3D Beak with depth
        const beakGradient = this.ctx.createLinearGradient(15, -3, 22, 3);
        beakGradient.addColorStop(0, '#f39c12');
        beakGradient.addColorStop(0.5, '#e67e22');
        beakGradient.addColorStop(1, '#d35400');
        this.ctx.fillStyle = beakGradient;
        this.ctx.beginPath();
        this.ctx.moveTo(15, -3);
        this.ctx.lineTo(22, -1);
        this.ctx.lineTo(22, 1);
        this.ctx.lineTo(15, 3);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Beak highlight
        this.ctx.fillStyle = '#f39c12';
        this.ctx.beginPath();
        this.ctx.moveTo(15, -2);
        this.ctx.lineTo(20, -1);
        this.ctx.lineTo(20, 0);
        this.ctx.lineTo(15, 0);
        this.ctx.closePath();
        this.ctx.fill();
        
        // 3D Eye with depth
        const eyeGradient = this.ctx.createRadialGradient(8, -6, 0, 8, -5, 5);
        eyeGradient.addColorStop(0, '#fff');
        eyeGradient.addColorStop(0.7, '#f8f9fa');
        eyeGradient.addColorStop(1, '#e9ecef');
        this.ctx.fillStyle = eyeGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(8, -5, 5, 5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Eye pupil with reflection
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.ellipse(9, -4, 2.5, 2.5, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.ellipse(8.5, -5, 1, 1, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Particle trail effect
        if(this.bird.flapAnimation > 0) {
            for(let i = 0; i < 5; i++) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.6 - i * 0.1;
                this.ctx.fillStyle = '#3498db';
                this.ctx.beginPath();
                this.ctx.ellipse(-20 - i*3, Math.sin(Date.now()*0.01 + i) * 3, 2, 2, 0, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            }
        }
        
        // Shield effect
        if(this.bird.shield > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = 0.6;
            this.ctx.strokeStyle = '#3498db';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, this.bird.width/2 + 10, this.bird.height/2 + 10, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
        }
        
        this.ctx.restore();
    }
    
    drawPowerups() {
        this.powerups.forEach(powerup => {
            this.ctx.save();
            this.ctx.translate(powerup.x, powerup.y);
            this.ctx.rotate(powerup.rotation);
            
            const colors = {
                shield: '#3498db',
                magnet: '#f39c12',
                boost: '#2ecc71'
            };
            
            this.ctx.fillStyle = colors[powerup.type];
            this.ctx.shadowColor = colors[powerup.type];
            this.ctx.shadowBlur = 10;
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, 15, 15, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            const icons = { shield: '🛡️', magnet: '🧲', boost: '⚡' };
            this.ctx.fillText(icons[powerup.type], 0, 5);
            
            this.ctx.restore();
        });
    }
    
    drawRain() {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(173, 216, 230, 0.6)';
        this.ctx.lineWidth = 1;
        this.raindrops.forEach(drop => {
            this.ctx.beginPath();
            this.ctx.moveTo(drop.x, drop.y);
            this.ctx.lineTo(drop.x - 3, drop.y + 8);
            this.ctx.stroke();
        });
        this.ctx.restore();
    }
    
    drawSparkles() {
        this.bird.sparkles.forEach(sparkle => {
            this.ctx.save();
            this.ctx.globalAlpha = sparkle.life / 50;
            this.ctx.fillStyle = sparkle.color;
            this.ctx.shadowColor = sparkle.color;
            this.ctx.shadowBlur = 5;
            this.ctx.beginPath();
            this.ctx.ellipse(sparkle.x, sparkle.y, sparkle.size, sparkle.size, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });
    }
    
    drawBirdGlow() {
        if(this.bird.glowIntensity > 0) {
            this.ctx.save();
            this.ctx.globalAlpha = this.bird.glowIntensity / 30;
            this.ctx.shadowColor = '#ffd700';
            this.ctx.shadowBlur = 20;
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(this.bird.x + this.bird.width/2, this.bird.y + this.bird.height/2, 
                           this.bird.width/2 + 10, this.bird.height/2 + 10, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game when page loads
window.addEventListener('load', () => {
    new ChirpyDash();
});