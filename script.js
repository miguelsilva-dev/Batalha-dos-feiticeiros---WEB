// --- CONSTANTES E CONFIGURAÇÕES DO JOGO ---
const FEITICOS = {
    1: { nome: "Bola de Fogo", dano: 35, mana: 15, efeito: "queimadura", sprite: "🔥" },
    2: { nome: "Raio Congelante", dano: 25, mana: 12, efeito: "congelamento", sprite: "❄️" },
    3: { nome: "Chuva de Meteoros", dano: 55, mana: 25, efeito: null, sprite: "🔥" },
    4: { nome: "Lança de Gelo", dano: 30, mana: 18, efeito: null, sprite: "❄️" },
    6: { nome: "Drenar Vida", dano: 20, mana: 22, efeito: "drenar", sprite: "☠️" },
    7: { nome: "Escudo Mágico", dano: 0, mana: 15, efeito: "escudo", sprite: "🛡️" },
    8: { nome: "Veneno Arcano", dano: 15, mana: 10, efeito: "veneno", sprite: "🐍" }
};

// --- CLASSES DE LÓGICA DO JOGO (MODEL) ---
class Personagem {
    constructor() {
        this.vida = 100;
        this.vida_max = 100;
        this.escudo = 0;
        this.veneno = 0;
    }

    receberDano(dano) {
        let danoSofrido = dano;
        let danoAbsorvido = 0;
        if (this.escudo > 0) {
            danoAbsorvido = Math.min(this.escudo, dano);
            danoSofrido = dano - danoAbsorvido;
            this.escudo -= danoAbsorvido;
        }
        this.vida = Math.max(0, this.vida - danoSofrido);
        return { danoSofrido, danoAbsorvido };
    }
}

class Jogador extends Personagem {
    constructor(nome = "Jogador") {
        super();
        this.nome = nome;
        this.sprite_path = "🧙"; // Emoji do jogador
        this.vida_max = 120;
        this.vida = 120;
        this.mana_max = 100;
        this.mana = 100;
        this.nivel = 1;
        this.exp = 0;
        this.pocoes_vida = 4;
        this.pocoes_mana = 4;
        this.ouro = 50;
    }

    curar(quantidade) { this.vida = Math.min(this.vida + quantidade, this.vida_max); }
    recuperarMana(quantidade) { this.mana = Math.min(this.mana + quantidade, this.mana_max); }

    ganharExp(quantidade) {
        this.exp += quantidade;
        if (this.exp >= this.nivel * 50) {
            return this.subirNivel();
        }
        return false;
    }

    subirNivel() {
        const expOverflow = this.exp - (this.nivel * 50);
        this.nivel++;
        this.vida_max += 20;
        this.mana_max += 15;
        this.vida = this.vida_max;
        this.mana = this.mana_max;
        this.exp = expOverflow;
        this.ouro += 30;
        return true;
    }
}

class Inimigo extends Personagem {
    constructor(nome, vida, tipo = "normal", sprite_path = "👺") {
        super();
        this.nome = nome;
        this.vida_max = vida;
        this.vida = vida;
        this.tipo = tipo;
        this.sprite_path = sprite_path;
        if (tipo === "boss") {
            this.vida_max = Math.floor(vida * 1.5);
            this.vida = this.vida_max;
        }
    }
}

// --- CLASSE DE LÓGICA PRINCIPAL (CONTROLLER) ---
class GameLogic {
    constructor(jogador) {
        this.jogador = jogador;
        this.inimigo = null;
        this.batalhasVencidas = 0;
    }

    iniciarNovaBatalha() {
        const inimigosNormais = [
            { nome: "Goblin Sombrio", vida: 60, sprite: "👺" },
            { nome: "Esqueleto Arcano", vida: 70, sprite: "💀" },
            { nome: "Lobo Espectral", vida: 65, sprite: "🐺" }
        ];
        const inimigosBoss = [
            { nome: "Dragão Ancião", vida: 200, sprite: "🐲" },
            { nome: "Lich Supremo", vida: 240, sprite: "👻" }
        ];
        
        if (this.batalhasVencidas > 0 && this.batalhasVencidas % 3 === 0) {
            const bossEscolhido = inimigosBoss[Math.random() > 0.6 ? 1 : 0];
            this.inimigo = new Inimigo(bossEscolhido.nome, bossEscolhido.vida + (this.jogador.nivel * 10), "boss", bossEscolhido.sprite);
            return { message: `🔥 UM PODEROSO BOSS APARECEU! 🔥\n⚔️ ${this.inimigo.nome} apareceu!`, tag: "log-boss" };
        } else {
            const inimigoEscolhido = inimigosNormais[Math.floor(Math.random() * inimigosNormais.length)];
            this.inimigo = new Inimigo(inimigoEscolhido.nome, inimigoEscolhido.vida + (this.jogador.nivel * 5), "normal", inimigoEscolhido.sprite);
            return { message: `⚔️ ${this.inimigo.nome} apareceu para a batalha!`, tag: null };
        }
    }

    processarVitoria() {
        this.batalhasVencidas++;
        let expBase = 25 + Math.floor(this.inimigo.vida_max / 10);
        let ouroBase = 15 + Math.floor(this.inimigo.vida_max / 15);
        if (this.inimigo.tipo === "boss") {
            expBase = Math.floor(expBase * 2.5);
            ouroBase = Math.floor(ouroBase * 3);
        }
        this.jogador.ouro += ouroBase;
        const subiuNivel = this.jogador.ganharExp(expBase);
        
        let logs = [
            { message: `🏆 Vitória! ${this.inimigo.nome} foi derrotado!`, tag: "log-vitoria" },
            { message: `💰 Ganhou ${ouroBase} de ouro e ${expBase} de EXP!`, tag: "log-ouro" }
        ];
        if (subiuNivel) {
            logs.push({ message: `🌟 NÍVEL SUPERIOR! ${this.jogador.nome} subiu para o nível ${this.jogador.nivel}!`, tag: "log-nivel" });
            logs.push({ message: "💎 Vida e mana restauradas!", tag: "log-cura" });
        }
        
        const chanceVida = [0, 1, 2, 3][this.weightedRandom([60, 25, 10, 5])];
        if (chanceVida > 0) {
            this.jogador.pocoes_vida += chanceVida;
            logs.push({ message: `🧪 Você encontrou ${chanceVida} Poção(ões) de Vida!`, tag: "log-cura" });
        }

        const chanceMana = [0, 1, 2, 3][this.weightedRandom([50, 30, 15, 5])];
        if (chanceMana > 0) {
            this.jogador.pocoes_mana += chanceMana;
            logs.push({ message: `💧 Você encontrou ${chanceMana} Poção(ões) de Mana!`, tag: "log-cura" });
        }
        
        return logs;
    }
    
    weightedRandom(weights) {
        let totalWeight = weights.reduce((acc, val) => acc + val, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < weights.length; i++) {
            if (random < weights[i]) return i;
            random -= weights[i];
        }
        return 0;
    }
}

// --- LÓGICA DA INTERFACE (VIEW) ---
class BatalhaGUI {
    constructor() {
        this.dom = {
            telaInicial: document.getElementById('tela-inicial'),
            telaJogo: document.getElementById('tela-jogo'),
            entryNome: document.getElementById('entry-nome'),
            btnIniciar: document.getElementById('btn-iniciar'),
            nomeJogadorLabel: document.getElementById('nome-jogador-label'),
            barraVidaJogador: document.getElementById('barra-vida-jogador'),
            barraManaJogador: document.getElementById('barra-mana-jogador'),
            statusJogador: document.getElementById('status-jogador'),
            nomeInimigoLabel: document.getElementById('nome-inimigo-label'),
            barraVidaInimigo: document.getElementById('barra-vida-inimigo'),
            statusInimigo: document.getElementById('status-inimigo'),
            spriteJogador: document.getElementById('sprite-jogador'),
            spriteInimigo: document.getElementById('sprite-inimigo'),
            logBatalha: document.getElementById('log-batalha'),
            feiticosGrid: document.getElementById('feiticos-grid'),
            itensGrid: document.getElementById('itens-grid'),
            arena: document.getElementById('arena')
        };

        this.jogador = null;
        this.gameLogic = null;
        this.processandoTurno = false;
        this.turnoJogador = true;

        this.dom.btnIniciar.addEventListener('click', () => this.iniciarJogo());
        this.dom.entryNome.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.iniciarJogo();
        });
    }

    iniciarJogo() {
        const nome = this.dom.entryNome.value.trim() || "Mago Misterioso";
        this.jogador = new Jogador(nome);
        this.gameLogic = new GameLogic(this.jogador);
        
        this.dom.telaInicial.style.display = 'none';
        this.dom.telaJogo.style.display = 'flex';
        
        this.criarBotoesAcao();
        this.novaBatalha();
    }

    log(message, tag) {
        const p = document.createElement('p');
        p.textContent = message;
        if (tag) {
            p.className = tag;
        }
        this.dom.logBatalha.appendChild(p);
        this.dom.logBatalha.scrollTop = this.dom.logBatalha.scrollHeight;
    }
    
    criarBotoesAcao() {
        this.dom.feiticosGrid.innerHTML = '';
        for (const [id, feitico] of Object.entries(FEITICOS)) {
            const btn = document.createElement('button');
            btn.className = 'btn-acao btn-feitico';
            btn.textContent = `${feitico.nome}`;
            btn.dataset.id = id;
            btn.addEventListener('click', () => this.usarFeitico(id));
            this.dom.feiticosGrid.appendChild(btn);
        }
        
        this.dom.itensGrid.innerHTML = '';
        const btnVida = document.createElement('button');
        btnVida.id = 'btn-pocao-vida';
        btnVida.className = 'btn-acao btn-pocao-vida';
        btnVida.addEventListener('click', () => this.usarPocao('vida'));
        
        const btnMana = document.createElement('button');
        btnMana.id = 'btn-pocao-mana';
        btnMana.className = 'btn-acao btn-pocao-mana';
        btnMana.addEventListener('click', () => this.usarPocao('mana'));
        
        this.dom.itensGrid.appendChild(btnVida);
        this.dom.itensGrid.appendChild(btnMana);
    }
    
    async animarProjetil(feiticoId, origem, alvo) {
        const feitico = FEITICOS[feiticoId];
        const projetil = document.createElement('div');
        projetil.className = 'projetil';
        projetil.textContent = feitico.sprite; // Usa o emoji do feitiço
        
        const origemRect = origem.getBoundingClientRect();
        const alvoRect = alvo.getBoundingClientRect();
        const arenaRect = this.dom.arena.getBoundingClientRect();
        
        const startX = origemRect.left + origemRect.width / 2 - arenaRect.left;
        const startY = origemRect.top + origemRect.height / 2 - arenaRect.top;
        const endX = alvoRect.left + alvoRect.width / 2 - arenaRect.left;
        const endY = alvoRect.top + alvoRect.height / 2 - arenaRect.top;

        projetil.style.left = `${startX}px`;
        projetil.style.top = `${startY}px`;
        
        this.dom.arena.appendChild(projetil);
        
        projetil.animate([
            { transform: `translate(-50%, -50%) translate(0, 0) rotate(0deg)` },
            { transform: `translate(-50%, -50%) translate(${endX - startX}px, ${endY - startY}px) rotate(360deg)` }
        ], {
            duration: 500,
            easing: 'ease-in'
        });

        await this.wait(500);
        this.dom.arena.removeChild(projetil);
        this.animarImpacto(alvo, alvoRect);
        await this.wait(200);
    }

    async animarChuvaDeMeteoros(alvo) {
        const numMeteoros = 4;
        const alvoRect = alvo.getBoundingClientRect();
        const arenaRect = this.dom.arena.getBoundingClientRect();
        const alvoX = alvoRect.left + alvoRect.width / 2 - arenaRect.left;
        const alvoY = alvoRect.top + alvoRect.height * 0.2;

        for (let i = 0; i < numMeteoros; i++) {
            const meteoro = document.createElement('div');
            meteoro.className = 'meteoro';
            meteoro.textContent = '🔥';
            const xInicial = alvoX + (Math.random() - 0.5) * 300;
            meteoro.style.left = `${xInicial}px`;
            meteoro.style.setProperty('--target-y', `${alvoY}px`);
            this.dom.arena.appendChild(meteoro);
            
            meteoro.addEventListener('animationend', () => {
                meteoro.remove();
                this.animarImpacto(alvo, alvo.getBoundingClientRect());
            });
            await this.wait(200);
        }
        await this.wait(500);
    }

    animarImpacto(alvo, alvoRect) {
        alvo.classList.add('hit');
        setTimeout(() => alvo.classList.remove('hit'), 300);

        const impacto = document.createElement('div');
        impacto.className = 'impacto';
        impacto.textContent = '💥'; // Emoji de impacto
        const arenaRect = this.dom.arena.getBoundingClientRect();
        impacto.style.left = `${alvoRect.left + alvoRect.width / 2 - arenaRect.left}px`;
        impacto.style.top = `${alvoRect.top + alvoRect.height / 2 - arenaRect.top}px`;
        this.dom.arena.appendChild(impacto);
        setTimeout(() => impacto.remove(), 300);
    }

    novaBatalha() {
        this.turnoJogador = true;
        this.processandoTurno = false;
        const { message, tag } = this.gameLogic.iniciarNovaBatalha();
        this.log(message, tag);
        this.log("É o seu turno! Escolha uma magia.", "log-turno");
        this.atualizarInterface();
    }

    async usarFeitico(id) {
        if (this.processandoTurno || !this.turnoJogador) return;
        const feitico = FEITICOS[id];
        if (this.jogador.mana < feitico.mana) {
            this.log("Mana insuficiente!", "log-erro");
            return;
        }
        
        this.processandoTurno = true;
        this.toggleAcoes(false);
        this.jogador.mana -= feitico.mana;
        this.atualizarInterface();

        const chanceAcerto = Math.min(100, (100 - feitico.dano) + this.jogador.nivel * 1);
        const acertou = Math.random() * 100 <= chanceAcerto;

        if (feitico.efeito === 'escudo') {
            await this.animarProjetil(id, this.dom.spriteJogador, this.dom.spriteJogador);
        } else if (id === '3') {
            await this.animarChuvaDeMeteoros(this.dom.spriteInimigo);
        } else {
            await this.animarProjetil(id, this.dom.spriteJogador, this.dom.spriteInimigo);
        }

        if (acertou) {
            const dano = feitico.dano + Math.floor(Math.random() * 11) - 5 + this.jogador.nivel * 2;
            this.gameLogic.inimigo.receberDano(dano);
            this.log(`Você usou ${feitico.nome} e causou ${dano} de dano! (${chanceAcerto}% de chance)`);
            if (feitico.efeito === 'escudo') {
                const valorEscudo = 40 + this.jogador.nivel * 5;
                this.jogador.escudo += valorEscudo;
                this.log(`🛡️ Você conjurou um escudo que absorverá ${valorEscudo} de dano!`, "log-escudo");
            } else if (feitico.efeito === 'veneno') {
                this.gameLogic.inimigo.veneno = 3;
                this.log(`🐍 O inimigo foi envenenado!`, "log-veneno");
            }
        } else {
            this.log(`Você usou ${feitico.nome} mas errou o alvo! (${chanceAcerto}% de chance)`, "log-erro");
        }
        
        this.atualizarInterface();
        setTimeout(() => this.verificarFimBatalha(), 500);
    }

    usarPocao(tipo) {
        if (this.processandoTurno || !this.turnoJogador) return;
        
        if (tipo === 'vida') {
            if (this.jogador.pocoes_vida <= 0) { this.log("Você não tem mais poções de vida!", "log-erro"); return; }
            if (this.jogador.vida >= this.jogador.vida_max) { this.log("Sua vida já está cheia!", "log-erro"); return; }
            this.jogador.pocoes_vida--;
            const cura = 50 + this.jogador.nivel * 5;
            this.jogador.curar(cura);
            this.log(`🧪 Você usou uma poção e recuperou ${cura} de vida!`, "log-cura");
        } else if (tipo === 'mana') {
            if (this.jogador.pocoes_mana <= 0) { this.log("Você não tem mais poções de mana!", "log-erro"); return; }
            if (this.jogador.mana >= this.jogador.mana_max) { this.log("Sua mana já está cheia!", "log-erro"); return; }
            this.jogador.pocoes_mana--;
            const recuperacao = 40 + this.jogador.nivel * 3;
            this.jogador.recuperarMana(recuperacao);
            this.log(`💧 Você usou uma poção e recuperou ${recuperacao} de mana!`, "log-cura");
        }
        
        this.processandoTurno = true;
        this.toggleAcoes(false);
        this.atualizarInterface();
        setTimeout(() => this.finalizarTurnoJogador(), 1000);
    }

    processarEfeitosStatus(personagem, nome, isJogador) {
        if (personagem.veneno > 0) {
            const danoVeneno = 10 + this.jogador.nivel * 2;
            const { danoSofrido } = personagem.receberDano(danoVeneno);
            this.log(`🐍 ${nome} sofreu ${danoSofrido} de dano de veneno!`, isJogador ? "log-erro" : "log-veneno");
            personagem.veneno--;
        }
    }

    verificarFimBatalha() {
        if (this.gameLogic.inimigo.vida <= 0) this.vitoria();
        else if (this.jogador.vida <= 0) this.derrota();
        else this.finalizarTurnoJogador();
    }

    finalizarTurnoJogador() {
        this.processarEfeitosStatus(this.jogador, this.jogador.nome, true);
        this.atualizarInterface();
        if (this.jogador.vida <= 0) { this.derrota(); return; }
        this.turnoJogador = false;
        this.log(`Turno de ${this.gameLogic.inimigo.nome}...`, "log-turno");
        setTimeout(() => this.processarTurnoInimigo(), 1200);
    }

    async processarTurnoInimigo() {
        const inimigo = this.gameLogic.inimigo;
        if (Math.random() * 100 > 80) {
            this.log(`${inimigo.nome} atacou mas errou!`, "log-vitoria");
            setTimeout(() => this.finalizarTurnoInimigo(), 1500);
            return;
        }

        const ataquesNormais = [1, 2, 4];
        const ataquesBoss = [1, 3, 8];
        const ataqueVisualId = inimigo.tipo === 'boss' ? ataquesBoss[Math.floor(Math.random() * ataquesBoss.length)] : ataquesNormais[Math.floor(Math.random() * ataquesNormais.length)];

        if (ataqueVisualId === 3 && inimigo.tipo === 'boss') {
            await this.animarChuvaDeMeteoros(this.dom.spriteJogador);
        } else {
            await this.animarProjetil(ataqueVisualId, this.dom.spriteInimigo, this.dom.spriteJogador);
        }

        let danoBase;
        if (inimigo.tipo === 'boss') {
            danoBase = 20 + Math.floor(Math.random() * (this.jogador.nivel * 2 + 1)) + this.jogador.nivel * 2;
            if (inimigo.nome.includes('Lich')) danoBase *= 1.2;
        } else {
            danoBase = 10 + Math.floor(Math.random() * (this.jogador.nivel * 2 + 1));
        }
        const { danoSofrido, danoAbsorvido } = this.jogador.receberDano(Math.floor(danoBase));
        
        if (danoAbsorvido > 0) this.log(`🛡️ Seu escudo absorveu ${danoAbsorvido} de dano!`, "log-escudo");
        this.log(`${inimigo.nome} ataca e causa ${danoSofrido} de dano!`, "log-erro");
        
        this.atualizarInterface();
        setTimeout(() => this.finalizarTurnoInimigo(), 1000);
    }

    finalizarTurnoInimigo() {
        this.processarEfeitosStatus(this.gameLogic.inimigo, this.gameLogic.inimigo.nome, false);
        this.atualizarInterface();
        if (this.gameLogic.inimigo.vida <= 0) { this.vitoria(); return; }
        if (this.jogador.vida <= 0) { this.derrota(); return; }
        this.turnoJogador = true;
        this.processandoTurno = false;
        this.log("Seu turno novamente!", "log-turno");
        this.atualizarInterface();
    }

    vitoria() {
        this.gameLogic.inimigo.vida = 0; // Garante que a vida seja 0 para a verificação
        const logs = this.gameLogic.processarVitoria();
        logs.forEach(log => this.log(log.message, log.tag));
        this.atualizarInterface();
        setTimeout(() => this.novaBatalha(), 6000);
    }

    derrota() {
        this.log("💀 Você foi derrotado... 💀", "log-erro");
        if (confirm("Fim de Jogo. Você foi derrotado!\nDeseja tentar novamente?")) {
            this.jogador.vida = this.jogador.vida_max;
            this.jogador.ouro = Math.max(0, this.jogador.ouro - 50);
            this.novaBatalha();
        } else {
            this.dom.telaJogo.style.display = 'none';
            this.dom.telaInicial.style.display = 'flex';
        }
    }
    
    toggleAcoes(habilitar) {
        const botoes = document.querySelectorAll('.btn-acao');
        botoes.forEach(btn => btn.disabled = !habilitar);
    }

    atualizarInterface() {
        if (!this.jogador) return;
        
        this.toggleAcoes(this.turnoJogador && !this.processandoTurno);
        
        // --- JOGADOR ---
        this.dom.nomeJogadorLabel.textContent = `🧙‍♂️ ${this.jogador.nome} (Nível ${this.jogador.nivel})`;
        const vidaPct = (this.jogador.vida / this.jogador.vida_max) * 100;
        this.dom.barraVidaJogador.style.width = `${vidaPct}%`;
        this.dom.barraVidaJogador.textContent = `${this.jogador.vida}/${this.jogador.vida_max}`;
        this.dom.barraVidaJogador.classList.toggle('baixa', vidaPct <= 30);
        
        this.dom.barraManaJogador.style.width = `${(this.jogador.mana / this.jogador.mana_max) * 100}%`;
        this.dom.barraManaJogador.textContent = `${this.jogador.mana}/${this.jogador.mana_max}`;

        let statusJogadorTxt = this.jogador.escudo > 0 ? `🛡️ Escudo: ${this.jogador.escudo}` : "";
        if (this.jogador.veneno > 0) statusJogadorTxt += ` 🐍 Veneno (${this.jogador.veneno}t)`;
        this.dom.statusJogador.textContent = statusJogadorTxt;
        
        document.getElementById('btn-pocao-vida').textContent = `❤️ Poção de Vida (${this.jogador.pocoes_vida})`;
        document.getElementById('btn-pocao-mana').textContent = `💧 Poção de Mana (${this.jogador.pocoes_mana})`;
        this.dom.spriteJogador.textContent = this.jogador.sprite_path;
        
        // --- INIMIGO (COM A CORREÇÃO) ---
        if (this.gameLogic && this.gameLogic.inimigo && this.gameLogic.inimigo.vida > 0) {
            const inimigo = this.gameLogic.inimigo;
            
            this.dom.spriteInimigo.style.display = 'block';

            const ts = inimigo.tipo === 'boss' ? " (BOSS)" : "";
            this.dom.nomeInimigoLabel.textContent = `${inimigo.sprite_path} ${inimigo.nome}${ts}`;
            this.dom.barraVidaInimigo.style.width = `${(inimigo.vida / inimigo.vida_max) * 100}%`;
            this.dom.barraVidaInimigo.textContent = `${inimigo.vida}/${inimigo.vida_max}`;

            let statusInimigoTxt = inimigo.escudo > 0 ? `🛡️ Escudo: ${inimigo.escudo}` : "";
            if (inimigo.veneno > 0) statusInimigoTxt += ` 🐍 Veneno (${inimigo.veneno}t)`;
            this.dom.statusInimigo.textContent = statusInimigoTxt;

            this.dom.spriteInimigo.textContent = inimigo.sprite_path;
            this.dom.spriteInimigo.classList.toggle('boss', inimigo.tipo === 'boss');
        } else {
            // Se não houver inimigo, limpa a área dele.
            this.dom.nomeInimigoLabel.textContent = "Aguardando oponente...";
            this.dom.barraVidaInimigo.style.width = `0%`;
            this.dom.barraVidaInimigo.textContent = "";
            this.dom.statusInimigo.textContent = "";
            this.dom.spriteInimigo.textContent = "";
            this.dom.spriteInimigo.style.display = 'none';
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// --- PONTO DE ENTRADA PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    new BatalhaGUI();
});