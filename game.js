// ============================================================
// game.js — IELTS 闖關密碼：遊戲邏輯
// Depends on: data.js (FAMILIES, ENGINES, EXAMS)
// ============================================================

// ============ STATE ============
let apiKey = '';
let score = 0;
let phase = 0;
let p1Round = 0, p1Total = 6, p1Score = 0;
let p2Round = 0, p2Total = 6, p2Score = 0;
let p3Round = 0, p3Total = 3, p3Score = 0, p3Step = 0;
let selectedFamilies = [];
let currentExam = null;
let shuffledExams = [];
let p3PickedHypernyms = [];
let p3ChosenEngine = null;

// ============ HELPERS ============
function $(id) { return document.getElementById(id); }

function shuffle(a) {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $(id).classList.add('active');
    window.scrollTo(0, 0);
}

function confetti() {
    const colors = ['#6c5ce7', '#00cec9', '#fdcb6e', '#00b894', '#e17055'];
    for (let i = 0; i < 30; i++) {
        const el = document.createElement('div');
        el.className = 'confetti-piece';
        el.style.left = Math.random() * 100 + 'vw';
        el.style.top = '-10px';
        el.style.background = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDuration = (1 + Math.random()) + 's';
        el.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2000);
    }
}

function renderSteps(containerId, total, current) {
    const c = $(containerId);
    c.innerHTML = '';
    for (let i = 0; i < total; i++) {
        if (i > 0) c.innerHTML += '<div class="step-line"></div>';
        const cls = i < current ? 'done' : i === current ? 'active' : '';
        c.innerHTML += `<div class="step-dot ${cls}">${i + 1}</div>`;
    }
}

// ============ API (GitCode Kimi K2) ============
const API_URL = 'https://api-ai.gitcode.com/v1/chat/completions';

async function testApi() {
    apiKey = $('apiKey').value.trim();
    if (!apiKey) { $('apiStatus').textContent = '請輸入 API Key'; return; }
    $('apiStatus').innerHTML = '<span class="loading"></span> 驗證中...';
    try {
        const r = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({ model: 'moonshotai/Kimi-K2-Instruct', messages: [{ role: 'user', content: 'Say OK' }], max_tokens: 10, stream: false })
        });
        if (r.ok) {
            $('apiStatus').innerHTML = '<span style="color:var(--green)">✅ Kimi 2.5 API Key 有效！AI 評分已啟用</span>';
        } else {
            $('apiStatus').innerHTML = '<span style="color:var(--coral)">❌ Key 無效（' + r.status + '），請檢查</span>';
            apiKey = '';
        }
    } catch (e) {
        $('apiStatus').innerHTML = '<span style="color:var(--coral)">❌ 連線失敗</span>';
        apiKey = '';
    }
}

async function askAI(prompt) {
    if (!apiKey) return null;
    try {
        const r = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({ model: 'moonshotai/Kimi-K2-Instruct', messages: [{ role: 'user', content: prompt }], stream: true, max_tokens: 4096, temperature: 0.6, top_p: 0.95 })
        });
        if (!r.ok) return null;
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
                if (!line.startsWith('data:')) continue;
                const data = line.slice(5).trim();
                if (data === '[DONE]') break;
                try {
                    const c = JSON.parse(data).choices?.[0]?.delta?.content;
                    if (c) result += c;
                } catch (e) { }
            }
        }
        return result || null;
    } catch (e) { return null; }
}

// ============ START ============
function startGame() {
    apiKey = $('apiKey').value.trim();
    shuffledExams = shuffle(EXAMS);
    Analytics.startSession();
    startPhase1();
}

// ============ PHASE 1: Family Identifier ============
function startPhase1() {
    phase = 1; p1Round = 0; p1Score = 0;
    showScreen('phase1');
    nextP1();
}

function nextP1() {
    if (p1Round >= p1Total) { finishPhase1(); return; }
    selectedFamilies = [];
    currentExam = shuffledExams[p1Round % shuffledExams.length];
    renderSteps('p1Steps', p1Total, p1Round);
    $('p1Progress').style.width = (p1Round / p1Total * 100) + '%';
    $('p1Question').innerHTML = `<div class="q-text">"${currentExam.q}"</div><p style="margin-top:.5rem;font-size:.8rem;color:var(--dim)">📌 ${currentExam.topic}</p>`;

    let html = '';
    FAMILIES.forEach(f => {
        html += `<div class="family-btn" data-id="${f.id}" onclick="toggleFamily(this,${f.id})"><span class="family-icon">${f.icon}</span><span class="family-name">${f.name}</span></div>`;
    });
    $('p1Families').innerHTML = html;
    $('p1Submit').disabled = true;
    $('p1Feedback').innerHTML = '<span class="hint-text">選擇 1-3 個你認為相關的家族</span>';
    Analytics.startTimer();
}

function toggleFamily(el, id) {
    if (el.classList.contains('correct') || el.classList.contains('wrong')) return;
    const idx = selectedFamilies.indexOf(id);
    if (idx > -1) { selectedFamilies.splice(idx, 1); el.classList.remove('selected'); }
    else { selectedFamilies.push(id); el.classList.add('selected'); }
    $('p1Submit').disabled = selectedFamilies.length === 0;
}

function checkPhase1() {
    const correct = currentExam.fam;
    const allBtns = $('p1Families').querySelectorAll('.family-btn');
    let hit = 0, miss = 0;
    allBtns.forEach(btn => {
        const id = parseInt(btn.dataset.id);
        const isCorrect = correct.includes(id);
        const isSelected = selectedFamilies.includes(id);
        if (isSelected && isCorrect) { btn.classList.add('correct'); hit++; }
        else if (isSelected && !isCorrect) { btn.classList.add('wrong'); miss++; }
        else if (!isSelected && isCorrect) { btn.style.border = '2px dashed var(--green)'; }
    });
    const perfect = hit === correct.length && miss === 0;
    if (perfect) {
        p1Score++; score += 10;
        $('p1Feedback').innerHTML = '<span style="color:var(--green);font-weight:700">🎯 完美！+10 分</span>';
    } else {
        $('p1Feedback').innerHTML = `<span style="color:var(--coral)">正確家族：${correct.map(i => FAMILIES[i].icon + FAMILIES[i].name).join(' + ')}</span>`;
    }
    Analytics.recordP1(currentExam, selectedFamilies, correct);
    $('p1Submit').disabled = true;
    p1Round++;
    setTimeout(nextP1, 1800);
}

function finishPhase1() {
    $('p1Progress').style.width = '100%';
    const pct = Math.round(p1Score / p1Total * 100);
    const aha = pct >= 80
        ? '🎉 你發現了嗎？任何 IELTS 題目都能歸類到 9 個家族！'
        : '💡 多練幾次，你會發現所有題目都有固定的家族歸類！';
    $('p1Feedback').innerHTML = `
    <div class="aha-box glass"><div class="aha-icon">💡</div><div class="aha-text">${aha}</div>
    <p style="margin-top:.5rem;color:var(--dim);font-size:.85rem">正確率：${pct}%（${p1Score}/${p1Total}）</p></div>
    <button class="btn btn-primary" onclick="startPhase2()" style="margin-top:1rem">進入關卡 2 ⚙️</button>`;
    if (pct >= 80) confetti();
}

// ============ PHASE 2: Engine Match ============
function startPhase2() {
    phase = 2; p2Round = 0; p2Score = 0;
    showScreen('phase2');
    nextP2();
}

function nextP2() {
    if (p2Round >= p2Total) { finishPhase2(); return; }
    renderSteps('p2Steps', p2Total, p2Round);
    $('p2Progress').style.width = (p2Round / p2Total * 100) + '%';
    const eng = ENGINES[p2Round % ENGINES.length];
    const formula = eng.formula.replace(/\{[^}]+\}/g, '______');
    $('p2Question').innerHTML = `<p style="font-size:.85rem;color:var(--dim);margin-bottom:.5rem">這個公式屬於哪個引擎？</p><div class="q-text" style="font-style:normal;font-size:1.1rem">"${formula}"</div>`;

    const options = shuffle(ENGINES).slice(0, 5);
    if (!options.find(o => o.id === eng.id)) {
        options[Math.floor(Math.random() * options.length)] = eng;
    }
    const shuffledOpts = shuffle(options);
    let html = '';
    shuffledOpts.forEach(o => {
        html += `<div class="engine-btn" onclick="checkP2('${o.id}','${eng.id}',this)"><span class="e-id">${o.id}</span> ${o.label}<div class="e-formula">${o.formula.substring(0, 50)}...</div></div>`;
    });
    $('p2Engines').innerHTML = html;
    $('p2Feedback').innerHTML = '';
    Analytics.startTimer();
}

function checkP2(picked, correct, el) {
    if ($('p2Engines').querySelector('.correct')) return;
    const allBtns = $('p2Engines').querySelectorAll('.engine-btn');
    const eng = ENGINES.find(e => e.id === correct);
    if (picked === correct) {
        el.classList.add('selected');
        el.style.borderColor = 'var(--green)';
        el.style.background = 'rgba(0,184,148,.15)';
        p2Score++; score += 10;
        $('p2Feedback').innerHTML = '<span style="color:var(--green);font-weight:700">✅ 正確！+10 分</span>';
    } else {
        el.style.borderColor = 'var(--coral)';
        el.classList.add('wrong');
        allBtns.forEach(b => {
            if (b.querySelector('.e-id').textContent === correct) {
                b.style.borderColor = 'var(--green)';
                b.style.background = 'rgba(0,184,148,.15)';
            }
        });
        $('p2Feedback').innerHTML = `<span style="color:var(--coral)">正確答案是 ${correct}</span>`;
    }
    Analytics.recordP2(correct, picked, eng ? eng.formula : '');
    p2Round++;
    setTimeout(nextP2, 1500);
}

function finishPhase2() {
    $('p2Progress').style.width = '100%';
    const pct = Math.round(p2Score / p2Total * 100);
    $('p2Feedback').innerHTML = `
    <div class="aha-box glass"><div class="aha-icon">⚡</div><div class="aha-text">Aha! 12 個引擎 = 12 種句型，填入不同詞就能應對不同主題！</div>
    <p style="margin-top:.5rem;color:var(--dim);font-size:.85rem">正確率：${pct}%（${p2Score}/${p2Total}）</p></div>
    <button class="btn btn-primary" onclick="startPhase3()" style="margin-top:1rem">進入關卡 3 🔨</button>`;
    if (pct >= 60) confetti();
}

// ============ PHASE 3: Build Argument ============
function startPhase3() {
    phase = 3; p3Round = 0; p3Score = 0;
    showScreen('phase3');
    nextP3();
}

function nextP3() {
    if (p3Round >= p3Total) { finishPhase3(); return; }
    p3Step = 0; p3PickedHypernyms = []; p3ChosenEngine = null;
    currentExam = shuffledExams[(p1Total + p3Round) % shuffledExams.length];
    renderSteps('p3Steps', p3Total, p3Round);
    $('p3Progress').style.width = (p3Round / p3Total * 100) + '%';
    $('p3Question').innerHTML = `<div class="q-text">"${currentExam.q}"</div><p style="margin-top:.5rem"><span class="tag tag-green">家族：${currentExam.fam.map(i => FAMILIES[i].icon).join('+')}</span> <span class="tag tag-purple">引擎：${currentExam.eng.join(', ')}</span></p>`;
    showP3Step();
    Analytics.startTimer();
}

function showP3Step() {
    const c = $('p3StepContent');
    $('p3Feedback').innerHTML = '';

    if (p3Step === 0) {
        // Pick hypernyms
        let chips = '';
        currentExam.fam.forEach(fi => {
            const f = FAMILIES[fi];
            chips += `<p style="margin:.5rem 0;font-size:.85rem">${f.icon} ${f.name}：</p>`;
            f.hypernyms.forEach((h, hi) => {
                chips += `<span class="hypernym-chip" onclick="pickHypernym(this,'${h}')">${h}<span style="color:var(--dim);font-size:.7rem;margin-left:6px">${f.hyEN[hi].split('/')[0].trim()}</span></span>`;
            });
        });
        c.innerHTML = `<div style="max-width:650px;width:100%;text-align:center"><h3 style="color:var(--teal);margin-bottom:.5rem">Step 1：挑選 2-3 個替換詞</h3>${chips}<br><button class="btn btn-primary btn-sm" id="p3NextBtn" onclick="p3GoStep(1)" style="margin-top:1rem" disabled>下一步 →</button></div>`;
    } else if (p3Step === 1) {
        // Pick engine
        let html = '<h3 style="color:var(--teal);margin-bottom:.5rem;text-align:center">Step 2：選一個引擎</h3>';
        ENGINES.forEach(e => {
            const rec = currentExam.eng.includes(e.id);
            html += `<div class="engine-btn" onclick="pickEngine(this,'${e.id}')" style="${rec ? 'border-color:rgba(0,206,201,.3)' : ''}"><span class="e-id">${e.id}</span> ${e.label} ${rec ? '<span class="tag tag-green">推薦</span>' : ''}<div class="e-formula">${e.formula}</div></div>`;
        });
        c.innerHTML = `<div class="engine-grid" style="max-width:600px">${html}</div>`;
    } else if (p3Step === 2) {
        // Write
        const eng = ENGINES.find(e => e.id === p3ChosenEngine);
        c.innerHTML = `<div style="max-width:650px;width:100%;text-align:center">
      <h3 style="color:var(--teal);margin-bottom:.5rem">Step 3：用引擎公式寫論點</h3>
      <div class="glass" style="margin:.5rem 0;padding:1rem"><p style="font-size:.85rem;color:var(--dim)">引擎 ${eng.id} 公式：</p><p style="color:var(--gold);font-weight:600">${eng.formula}</p>
      <p style="font-size:.8rem;margin-top:.5rem;color:var(--dim)">你選的替換詞：${p3PickedHypernyms.map(h => `<span class="tag tag-purple">${h}</span>`).join(' ')}</p></div>
      <div class="write-area"><textarea id="p3Text" placeholder="把替換詞填入引擎公式，寫出一個完整句子..."></textarea></div>
      <button class="btn btn-primary" onclick="submitP3()">提交論點 ✨</button></div>`;
    }
}

function pickHypernym(el, name) {
    el.classList.toggle('picked');
    const idx = p3PickedHypernyms.indexOf(name);
    if (idx > -1) p3PickedHypernyms.splice(idx, 1);
    else p3PickedHypernyms.push(name);
    const btn = $('p3NextBtn');
    if (btn) btn.disabled = p3PickedHypernyms.length < 1;
}

function pickEngine(el, id) {
    document.querySelectorAll('#p3StepContent .engine-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    p3ChosenEngine = id;
    setTimeout(() => { p3Step = 2; showP3Step(); }, 400);
}

function p3GoStep(s) { p3Step = s; showP3Step(); }

async function submitP3() {
    const text = $('p3Text').value.trim();
    if (text.length < 20) {
        $('p3Feedback').innerHTML = '<span style="color:var(--coral)">請至少寫 20 個字元</span>';
        return;
    }
    score += 15; p3Score++;
    let aiFb = null;

    if (apiKey) {
        $('p3Feedback').innerHTML = '<span class="loading"></span> Kimi 2.5 評分中...';
        aiFb = await askAI(`You are an IELTS examiner. The student was given this question: "${currentExam.q}". They chose engine ${p3ChosenEngine} and hypernyms: ${p3PickedHypernyms.join(', ')}. They wrote: "${text}". Give brief feedback (2-3 sentences) in Traditional Chinese: 1) Did they use the engine formula correctly? 2) Is the argument relevant? 3) One specific improvement tip. End with an estimated band score (6-9).`);
        $('p3Feedback').innerHTML = `<div class="ai-feedback glass"><h3>🤖 Kimi 2.5 評分</h3><p style="white-space:pre-wrap">${aiFb || 'AI 回應失敗，但你的論點已記錄！'}</p></div>`;
    } else {
        $('p3Feedback').innerHTML = `<div class="glass" style="max-width:650px;padding:1rem;text-align:center"><span style="color:var(--green);font-weight:700">✅ 論點已提交！+15 分</span><p style="color:var(--dim);font-size:.85rem;margin-top:.5rem">💡 點擊「驗證」啟用 Kimi 2.5 AI 個人化評分</p></div>`;
    }
    Analytics.recordP3(currentExam, p3ChosenEngine, p3PickedHypernyms, text, aiFb);
    p3Round++;
    setTimeout(() => {
        $('p3Feedback').innerHTML += '<br><button class="btn btn-primary btn-sm" onclick="nextP3()" style="margin-top:.5rem">' + (p3Round < p3Total ? '下一題 →' : '完成關卡 3') + '</button>';
    }, 1000);
}

function finishPhase3() {
    $('p3Progress').style.width = '100%';
    $('p3StepContent').innerHTML = `
    <div class="aha-box glass"><div class="aha-icon">🔥</div><div class="aha-text">Aha! 同一個引擎，換不同替換詞就能寫不同主題的論點！<br>家族 = 詞庫，引擎 = 句型，兩者組合 = 無限論點！</div></div>
    <button class="btn btn-primary" onclick="startPhase4()" style="margin-top:1rem">進入 Boss 關 🏆</button>`;
    confetti();
}

// ============ PHASE 4: Full SOP ============
function startPhase4() {
    phase = 4;
    showScreen('phase4');
    currentExam = shuffledExams[Math.floor(Math.random() * shuffledExams.length)];
    $('p4Question').innerHTML = `<div class="q-text">"${currentExam.q}"</div>`;

    const fams = currentExam.fam.map(i => FAMILIES[i]);
    const engs = currentExam.eng;
    let hyList = '';
    fams.forEach(f => { f.hypernyms.slice(0, 3).forEach(h => { hyList += `<span class="tag tag-purple">${h}</span> `; }); });

    $('p4SopSteps').innerHTML = `
    <div class="glass" style="margin:.5rem 0;padding:1rem">
      <p><strong>Step 1</strong> 家族：${fams.map(f => f.icon + ' ' + f.name).join(' + ')}</p>
      <p style="margin-top:.5rem"><strong>Step 2</strong> 可用替換詞：${hyList}</p>
      <p style="margin-top:.5rem"><strong>Step 3</strong> 推薦引擎：${engs.map(e => '<span class="tag tag-green">' + e + '</span>').join(' ')}</p>
      <p style="margin-top:.8rem;font-size:.85rem;color:var(--dim)">引擎公式提示：</p>
      ${engs.map(eid => { const eng = ENGINES.find(e => e.id === eid); return `<p style="font-size:.8rem;color:var(--gold);margin:2px 0">${eng.id}: ${eng.formula}</p>`; }).join('')}
    </div>`;
    $('p4WriteArea').style.display = 'block';
    $('p4AI').style.display = 'none';
    Analytics.startTimer();
}

async function submitFinal() {
    const text = $('p4Text').value.trim();
    if (text.length < 30) { alert('請至少寫 30 個字元的段落'); return; }
    score += 25;
    $('p4AI').style.display = 'block';
    let aiFb = null;
    let bandScore = null;

    if (apiKey) {
        $('p4AI').innerHTML = '<h3>🤖 Kimi 2.5 AI 評分</h3><p><span class="loading"></span> 分析中...</p>';
        aiFb = await askAI(`You are a senior IELTS examiner. A student practiced the "4-step SOP" for IELTS Task 2 argument generation.

Question: "${currentExam.q}"
Families used: ${currentExam.fam.map(i => FAMILIES[i].name).join(', ')}
Engines recommended: ${currentExam.eng.join(', ')}
Student's paragraph: "${text}"

Please evaluate in Traditional Chinese:
1. 🎯 引擎使用（是否正確使用了推薦的引擎公式結構？）
2. 📝 論點品質（論點是否相關、有邏輯、有說服力？）
3. 📊 預估 Band Score（6.0-9.0）
4. ✨ 一個具體改進建議
5. 💡 Aha Moment：指出學生可能沒意識到的一個亮點

Format your response clearly with these 5 sections.`);
        $('p4AI').innerHTML = `<h3>🤖 Kimi 2.5 AI 評分</h3><div style="white-space:pre-wrap;line-height:1.6">${aiFb || 'AI 回應失敗'}</div>`;
        // Try to extract band score from AI feedback
        const bandMatch = aiFb ? aiFb.match(/(\d\.\d|\d)\s*(?:\/9|分)/) : null;
        if (bandMatch) bandScore = parseFloat(bandMatch[1]);
    } else {
        $('p4AI').innerHTML = '<h3>🤖 評分結果</h3><p>✅ 段落已提交！+25 分</p><p style="color:var(--dim);font-size:.85rem">點擊「驗證」啟用 Kimi 2.5 AI 評分和 Band Score</p>';
    }
    Analytics.recordP4(currentExam, text, aiFb, bandScore);
    $('p4AI').innerHTML += '<button class="btn btn-primary" onclick="showVictory()" style="margin-top:1rem;width:100%">🏆 查看最終成績</button>';
}

// ============ VICTORY ============
function showVictory() {
    showScreen('victory');
    confetti(); setTimeout(confetti, 500); setTimeout(confetti, 1000);

    $('finalStats').innerHTML = `
    <div class="stat"><div class="stat-val">${score}</div><div class="stat-label">總分</div></div>
    <div class="stat"><div class="stat-val">${p1Score}/${p1Total}</div><div class="stat-label">家族辨識</div></div>
    <div class="stat"><div class="stat-val">${p2Score}/${p2Total}</div><div class="stat-label">引擎配對</div></div>
    <div class="stat"><div class="stat-val">${p3Score}/${p3Total}</div><div class="stat-label">論點鍛造</div></div>`;

    $('finalAha').innerHTML = `
    <div class="aha-icon">🎓</div>
    <div class="aha-text">你已經掌握了整套 SOP！</div>
    <p style="margin-top:1rem;color:var(--text);font-size:.9rem;line-height:1.6">
      ✅ <strong>9 個家族</strong> = 你的詞庫（給你名詞）<br>
      ✅ <strong>12 個引擎</strong> = 你的句型（給你結構）<br>
      ✅ <strong>4 步 SOP</strong> = 看題→找家族→選引擎→填詞<br><br>
      🔑 <strong>記住：家族 × 引擎 = 無限論點</strong>
    </p>`;

    Analytics.endSession(score);
    Analytics.renderDashboard('analyticsDashboard');
}

// ============ HYPERNYM VOCABULARY PRACTICE ============
let hpRound = 0, hpTotal = 12, hpScore = 0;
let hpQuestions = [];
let hpLocked = false;
let hpMode = 'local'; // 'local' or 'ai'
let _hpAIError = ''; // detailed error for debugging

// Build all possible hypernym pairs from all families
function _buildHypernymPool() {
    const pool = [];
    FAMILIES.forEach(f => {
        f.hypernyms.forEach((zh, i) => {
            pool.push({
                famId: f.id,
                famIcon: f.icon,
                famName: f.name,
                zh: zh,
                en: f.hyEN[i],
                enShort: f.hyEN[i].split('/')[0].trim()
            });
        });
    });
    return pool;
}

// ---- LOCAL fallback: Generate 12 mixed questions without LLM ----
function _generateHpQuestionsLocal() {
    const pool = _buildHypernymPool();
    const questions = [];

    // Type A: Chinese → English (4 questions)
    const poolA = shuffle(pool).slice(0, 4);
    poolA.forEach(item => {
        const wrongs = shuffle(pool.filter(p => p.zh !== item.zh)).slice(0, 3);
        const options = shuffle([item, ...wrongs]);
        questions.push({
            type: 'A',
            prompt: item.zh,
            promptSub: `${item.famIcon} ${item.famName}`,
            answer: item.en,
            answerShort: item.enShort,
            options: options.map(o => ({ label: o.en, correct: o.zh === item.zh })),
            famId: item.famId
        });
    });

    // Type B: English → Family (4 questions)
    const poolB = shuffle(pool).slice(0, 4);
    poolB.forEach(item => {
        const wrongFams = shuffle(FAMILIES.filter(f => f.id !== item.famId)).slice(0, 3);
        const correctFam = FAMILIES[item.famId];
        const options = shuffle([
            { label: `${correctFam.icon} ${correctFam.name}`, correct: true },
            ...wrongFams.map(f => ({ label: `${f.icon} ${f.name}`, correct: false }))
        ]);
        questions.push({
            type: 'B',
            prompt: item.en,
            promptSub: `這個英文替換詞屬於哪個家族？`,
            answer: `${correctFam.icon} ${correctFam.name}`,
            answerShort: correctFam.name,
            options: options,
            famId: item.famId,
            zh: item.zh
        });
    });

    // Type C: Engine fill-in-the-blank (4 questions)
    const poolC = shuffle(pool).slice(0, 4);
    const engPool = shuffle(ENGINES);
    poolC.forEach((item, i) => {
        const eng = engPool[i % engPool.length];
        const formula = eng.formula.replace(/\{[^}]+\}/, '______');
        const wrongs = shuffle(pool.filter(p => p.zh !== item.zh)).slice(0, 3);
        const options = shuffle([
            { label: `${item.zh}（${item.enShort}）`, correct: true },
            ...wrongs.map(w => ({ label: `${w.zh}（${w.enShort}）`, correct: false }))
        ]);
        questions.push({
            type: 'C',
            prompt: formula,
            promptSub: `${eng.id} ${eng.label} — 選擇最合適的替換詞填入 ______`,
            answer: `${item.zh}（${item.enShort}）`,
            answerShort: item.zh,
            options: options,
            famId: item.famId,
            engineId: eng.id
        });
    });

    return shuffle(questions);
}

// ---- AI-powered: Only generate Type D (IELTS contextual sentences) via LLM ----
// Types A & B are still generated locally — AI adds the high-value Type D questions
function _buildAIPrompt(requestCount) {
    // Build a compact hypernym reference: "famId.idx: 中文 = english"
    const ref = FAMILIES.map(f =>
        f.hypernyms.map((zh, i) =>
            `${f.id}.${i}: ${zh} = ${f.hyEN[i].split('/').slice(0, 3).join('/')}`
        ).join('\n')
    ).join('\n');

    return `Generate ${requestCount} IELTS essay fill-in-the-blank questions using the TEMPLATE FORMULAS below.

HYPERNYM LIST (famId.index: Chinese = English):
${ref}

TEMPLATE FORMULAS (pick ONE per question, fill in real-world details to make a natural Band 7+ IELTS sentence):

Family 0 (制度與政策) — choose one:
  T0a: The government must regulate {X} and fund {Y} to protect ______.
  T0b: Rather than {extreme A or B}, a balanced approach would be to strengthen ______.
  T0c: ______ should require transparency and accountability while protecting individual freedom.

Family 1 (受影響群體) — choose one:
  T1a: It damages ______'s {health/future/dignity} when {cause}, leading to {negative outcome}.
  T1b: ______ who {disadvantaged condition} deserve support and protection, not neglect.
  T1c: Without {action}, we face ______ being left behind and excluded from opportunity.

Family 2 (經濟與資源) — choose one:
  T2a: It is too expensive for {group} when ______ rises sharply, resulting in widening inequality.
  T2b: ______ creates jobs and revenue, benefiting local communities and the broader economy.
  T2c: Without adequate ______, we face service collapse and growing inequality across society.

Family 3 (健康與心理) — choose one:
  T3a: It damages ______ when {cause}, leading to anxiety, burnout, and long-term harm.
  T3b: If {intervention is provided}, ______ improves significantly, reducing demand on healthcare.
  T3c: Without addressing ______, we face a public health crisis affecting millions of people.

Family 4 (環境與永續) — choose one:
  T4a: It damages the environment through ______ and unchecked resource extraction.
  T4b: If {green policy is adopted}, ______ drops significantly, helping reverse climate change.
  T4c: Without urgent action on ______, we face ecological collapse and irreversible climate damage.

Family 5 (科技與數位) — choose one:
  T5a: Technology improves efficiency, but seriously damages ______ for vulnerable users.
  T5b: The government must regulate {tech/platforms/data} while protecting ______ and innovation.
  T5c: Schools should teach ______ so students can verify information and resist manipulation.

Family 6 (教育與發展) — choose one:
  T6a: Schools should teach ______ so students can apply it meaningfully in real life.
  T6b: It damages ______ when rigid exam systems and relentless academic pressure take hold.
  T6c: Rather than one extreme approach, a balanced curriculum should integrate ______ with choice.

Family 7 (倫理與自由) — choose one:
  T7a: It damages ______ when {authority} controls what people say, create, or believe.
  T7b: Rather than total control or total freedom, society must protect ______ while preventing harm.
  T7c: ______ alone rarely reduces crime; rehabilitation and addressing root causes matter more.

Family 8 (生活方式與社會變遷) — choose one:
  T8a: ______ is accelerating because modern technology and globalisation have shifted expectations.
  T8b: It damages tradition and community when ______ replaces long-established customs and norms.
  T8c: Rather than resisting change entirely, societies should preserve ______ while adapting to modernity.

STRICT OUTPUT FORMAT — JSON array of exactly ${requestCount} objects, NO other text:
[
  {"s":"...one sentence with exactly one ______...","c":"famId.index","w":["famId.index","famId.index","famId.index"]},
  ... (repeat for all ${requestCount} questions)
]

Rules:
- EVERY object MUST have ALL THREE fields: "s", "c", and "w". No exceptions.
- If you cannot complete an object with all 3 fields, DO NOT output that object at all.
- Output EXACTLY ${requestCount} objects — no more, no fewer.
- Before writing the closing ']', verify: does every object have "s", "c", and "w"?
- "c": the single correct hypernym key as "famId.index" (integer.integer, e.g. "3.0")
- "w": exactly 3 wrong-but-plausible keys from DIFFERENT families than "c"
- Use ${requestCount} different families across the ${requestCount} questions
- Output ONLY the raw JSON array. No markdown. No explanation. No trailing text.

Example (follow this structure exactly):
[{"s":"It damages ______ when teenagers compare themselves to filtered online lives, leading to low self-esteem.","c":"3.0","w":["2.3","5.1","0.4"]},{"s":"The government must regulate social platforms and fund awareness campaigns to protect ______.","c":"1.0","w":["3.1","6.2","4.0"]},{"s":"Schools should teach ______ so students can evaluate news sources critically.","c":"5.3","w":["6.1","0.2","7.0"]}]`
}

async function _generateHpQuestionsAI() {
    // Read user target; cap what we ask AI at 4 to prevent token truncation
    const aiDCount = parseInt(document.getElementById('aiQuestionCount')?.value || '3', 10);
    const aiRequest = Math.min(aiDCount, 4);
    const prompt = _buildAIPrompt(aiRequest);
    // Use a dedicated fetch with higher max_tokens
    if (!apiKey) { _hpAIError = 'API Key 為空'; return null; }
    let raw;
    try {
        const r = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
            body: JSON.stringify({
                model: 'moonshotai/Kimi-K2-Instruct',
                messages: [{ role: 'user', content: prompt }],
                stream: false,
                max_tokens: 2048,
                temperature: 0.7
            })
        });
        if (!r.ok) { _hpAIError = `API 回傳錯誤 ${r.status}`; return null; }
        const json = await r.json();
        raw = json.choices?.[0]?.message?.content;
    } catch (e) {
        _hpAIError = `網路錯誤：${e.message}`;
        return null;
    }

    if (!raw) { _hpAIError = 'API 回傳內容為空'; return null; }

    // ── Robust JSON object extractor ──────────────────────────────────────
    // Walks the raw string char-by-char and pulls out every complete {...}
    // object, even if the outer array is truncated or contains unescaped chars.
    function _extractValidJsonObjects(str) {
        const results = [];
        let depth = 0, start = -1, inStr = false, esc = false;
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (esc) { esc = false; continue; }
            if (c === '\\' && inStr) { esc = true; continue; }
            if (c === '"') { inStr = !inStr; continue; }
            if (inStr) continue;
            if (c === '{') { if (depth === 0) start = i; depth++; }
            else if (c === '}') {
                depth--;
                if (depth === 0 && start !== -1) {
                    try { results.push(JSON.parse(str.slice(start, i + 1))); } catch (_) { /* skip bad object */ }
                    start = -1;
                }
            }
        }
        return results;
    }

    try {
        let jsonStr = raw.trim();
        // Strip markdown code fences if present
        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }
        // Fix common LLM JSON issues:
        // 1. Missing commas between objects: }\n{ → },\n{
        jsonStr = jsonStr.replace(/\}\s*\n\s*\{/g, '},\n{');
        // 2. Trailing comma before ]
        jsonStr = jsonStr.replace(/,\s*\]/g, ']');
        // 3. If LLM forgot the wrapping brackets, add them
        jsonStr = jsonStr.trim();
        if (jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
            jsonStr = '[' + jsonStr + ']';
        }

        // Try full parse first; fall back to object-by-object extraction
        let items = null;
        try {
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed) && parsed.length > 0) items = parsed;
        } catch (_) { /* will try extractor below */ }

        if (!items || items.length === 0) {
            console.log('[HP-AI] Full JSON.parse failed, trying char-by-char extractor...');
            items = _extractValidJsonObjects(raw); // use original raw, not jsonStr
        }

        console.log(`[HP-AI] Extracted ${items?.length ?? 0} item(s) from AI response.`);
        if (items?.length) console.log('[HP-AI] First item:', JSON.stringify(items[0]).substring(0, 120));

        if (!items || items.length === 0) {
            _hpAIError = `AI 回傳無法解析（JSON 格式錯誤或完全截斷）`;
            console.warn('[HP-AI] No items at all — falling back to local.');
            return null;
        }

        const pool = _buildHypernymPool();

        // Helper: resolve "famId.index" → pool item
        // Strips non-digit chars from index part so "3.u0" → idx=0 (AI sometimes adds "u" prefix)
        function resolve(key) {
            const parts = key.split('.');
            const fid = parseInt(parts[0], 10);
            const idxStr = (parts[1] || '').replace(/\D/g, ''); // "u0" → "0", "u1" → "1"
            const idx = parseInt(idxStr, 10);
            if (isNaN(fid) || isNaN(idx)) return undefined;
            return pool.find(p => p.famId === fid && FAMILIES[fid]?.hypernyms.indexOf(p.zh) === idx);
        }

        // Build Type D questions from AI output
        const typeDQuestions = [];
        for (const item of items) {
            if (!item.s || !item.c || !item.w || !Array.isArray(item.w)) {
                console.warn('[HP-AI] Skipped item (missing fields):', JSON.stringify(item).substring(0, 80));
                continue;
            }
            const correct = resolve(item.c);
            if (!correct) {
                console.warn(`[HP-AI] resolve() failed for c="${item.c}" — key not found in pool.`);
                continue;
            }
            const wrongs = item.w.map(resolve).filter(Boolean).slice(0, 3);
            if (wrongs.length < 3) {
                // Fill missing wrongs from pool
                const needed = 3 - wrongs.length;
                const fill = shuffle(pool.filter(p => p.famId !== correct.famId && !wrongs.some(w => w.zh === p.zh))).slice(0, needed);
                wrongs.push(...fill);
            }
            const options = shuffle([
                { label: `${correct.zh}（${correct.enShort}）`, correct: true },
                ...wrongs.map(w => ({ label: `${w.zh}（${w.enShort}）`, correct: false }))
            ]);
            typeDQuestions.push({
                type: 'D',
                prompt: item.s,
                promptSub: '📝 IELTS 實戰填空 — 選擇最合適的概念填入 ______',
                answer: `${correct.zh}（${correct.enShort}）`,
                answerShort: correct.zh,
                options,
                famId: correct.famId
            });
        }

        console.log(`[HP-AI] Built ${typeDQuestions.length} Type-D question(s).`);

        // Even if Type D is 0 (all resolve() failed), still return A+B+C so AI mode doesn't silently collapse
        const localQ = _generateHpQuestionsLocal();
        const typeA = localQ.filter(q => q.type === 'A').slice(0, 4);
        const typeB = localQ.filter(q => q.type === 'B').slice(0, 4);
        const typeC = localQ.filter(q => q.type === 'C').slice(0, 4);

        if (typeDQuestions.length === 0) {
            console.warn('[HP-AI] No Type-D resolved — using A+B+C local mix instead.');
            _hpAIError = `AI 出題成功但 resolve 失敗，改用本地 C 型補位`;
            return shuffle([...typeA, ...typeB, ...typeC]);
        }

        // Fill: take what AI gave, pad with Type C if AI returned fewer than target
        const dSlice = typeDQuestions.slice(0, aiDCount);
        const cPad = typeC.slice(0, Math.max(0, aiDCount - dSlice.length));
        const mixed = shuffle([...typeA, ...typeB, ...dSlice, ...cPad]);
        console.log(`[HP-AI] Final mix: ${typeA.length}A + ${typeB.length}B + ${dSlice.length}D + ${cPad.length}C-pad = ${mixed.length} questions total.`);

        return mixed;
    } catch (e) {
        console.error('AI question parse error:', e, '\nRaw:', raw?.substring(0, 300));
        _hpAIError = `JSON 解析失敗：${e.message}`;
        return null;
    }
}

// ---- Start Hypernym Practice ----
async function startHypernymPractice() {
    hpRound = 0; hpScore = 0; hpLocked = false; _hpAIError = '';

    // Auto-read API key from input if not yet set
    if (!apiKey) {
        const inputVal = $('apiKey')?.value?.trim();
        if (inputVal) apiKey = inputVal;
    }

    showScreen('hypernymPractice');
    $('hpSteps').innerHTML = '';
    $('hpProgress').style.width = '0%';
    $('hpAnswers').innerHTML = '';
    $('hpFeedback').innerHTML = '';

    // Try AI generation if API key exists
    if (apiKey) {
        hpMode = 'ai';
        $('hpModeLabel').textContent = '🤖 AI 正在生成題目...';
        $('hpQuestion').innerHTML = `
            <div style="text-align:center;padding:2rem">
                <div class="loading" style="display:inline-block;margin-bottom:1rem"></div>
                <p style="color:var(--dim);font-size:.9rem">Kimi K2 正在根據你的詞庫生成<br>12 道 IELTS 情境題...</p>
                <p style="color:var(--dim);font-size:.75rem;margin-top:.5rem">⏱ 大約需要 5-10 秒</p>
            </div>`;
        const aiQuestions = await _generateHpQuestionsAI();
        if (aiQuestions && aiQuestions.length >= 8) {
            hpQuestions = aiQuestions;
            hpTotal = hpQuestions.length;

            // Count question types for the status banner
            const typeCount = {};
            hpQuestions.forEach(q => { typeCount[q.type] = (typeCount[q.type] || 0) + 1; });
            const typeLabels = { A: '🔤中→英', B: '🏛️英→族', C: '⚙️引擎填空', D: '📝IELTS實戰' };
            const breakdown = Object.entries(typeCount)
                .map(([t, n]) => `${typeLabels[t] || t} ×${n}`)
                .join('　');

            $('hpFeedback').innerHTML = `
                <div style="padding:.6rem 1rem;background:linear-gradient(135deg,rgba(124,58,237,.15),rgba(37,99,235,.15));border:1px solid rgba(124,58,237,.3);border-radius:8px;max-width:600px;width:100%;text-align:center;animation:fadeIn .5s ease">
                    <span style="font-size:.85rem;font-weight:600;color:#a78bfa">🤖 AI 出題成功！</span>
                    <span style="font-size:.8rem;color:var(--dim);margin-left:.5rem">${hpTotal} 題已生成</span>
                    <div style="font-size:.75rem;color:var(--dim);margin-top:.3rem">${breakdown}</div>
                </div>`;

            // Auto-hide banner after 3 seconds
            setTimeout(() => { if (hpRound <= 1) $('hpFeedback').innerHTML = ''; }, 3500);

            nextHp();
            return;
        }
        // AI failed → fallback with detailed message
        hpMode = 'local';
        const errDetail = _hpAIError ? `<div style="font-size:.75rem;color:var(--dim);margin-top:.3rem">原因：${_hpAIError}</div>` : '';
        $('hpFeedback').innerHTML = `
            <div style="padding:.6rem 1rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;max-width:550px;width:100%;text-align:center">
                <span style="font-size:.85rem;color:var(--coral)">⚠️ AI 出題失敗</span>
                <span style="font-size:.8rem;color:var(--dim);margin-left:.3rem">— 改用本地隨機出題（📦 共 12 題）</span>
                ${errDetail}
            </div>`;
    } else {
        hpMode = 'local';
    }

    hpQuestions = _generateHpQuestionsLocal();
    hpTotal = hpQuestions.length;
    nextHp();
}

function nextHp() {
    if (hpRound >= hpTotal) { finishHp(); return; }
    hpLocked = false;
    const q = hpQuestions[hpRound];
    renderSteps('hpSteps', hpTotal, hpRound);
    $('hpProgress').style.width = (hpRound / hpTotal * 100) + '%';

    // Mode label
    const modeMap = {
        'A': '🔤 中文 → 英文配對',
        'B': '🏛️ 英文 → 家族歸類',
        'C': '⚙️ 引擎填空',
        'D': '📝 IELTS 實戰填空'
    };
    const modePrefix = hpMode === 'ai' ? '🤖 ' : '';
    $('hpModeLabel').textContent = modePrefix + (modeMap[q.type] || '');

    // Question
    if (q.type === 'A') {
        $('hpQuestion').innerHTML = `
            <p style="font-size:.85rem;color:var(--dim);margin-bottom:.5rem">${q.promptSub}</p>
            <div class="q-text" style="font-size:1.8rem;font-style:normal">${q.prompt}</div>
            <p style="margin-top:.5rem;font-size:.85rem;color:var(--dim)">選出對應的英文替換詞</p>`;
    } else if (q.type === 'B') {
        $('hpQuestion').innerHTML = `
            <p style="font-size:.85rem;color:var(--dim);margin-bottom:.5rem">${q.promptSub}</p>
            <div class="q-text" style="font-size:1.1rem;font-style:normal">${q.prompt}</div>`;
    } else if (q.type === 'D') {
        $('hpQuestion').innerHTML = `
            <p style="font-size:.85rem;color:var(--dim);margin-bottom:.5rem">${q.promptSub}</p>
            <div class="q-text" style="font-size:1rem;font-style:italic;line-height:1.6;color:var(--text)">“${q.prompt}”</div>
            <p style="margin-top:.5rem;font-size:.8rem;color:var(--accent)">✨ AI 生成的 IELTS 情境句</p>`;
    } else {
        $('hpQuestion').innerHTML = `
            <p style="font-size:.85rem;color:var(--dim);margin-bottom:.5rem">${q.promptSub}</p>
            <div class="q-text" style="font-size:1rem;font-style:normal;color:var(--gold)">${q.prompt}</div>`;
    }

    // Options
    let html = '<div class="family-grid" style="max-width:600px">';
    q.options.forEach((opt, i) => {
        html += `<div class="family-btn" style="text-align:left;padding:.8rem 1rem;font-size:.85rem" 
                      onclick="checkHp(${i}, this)">
                    ${opt.label}
                 </div>`;
    });
    html += '</div>';
    $('hpAnswers').innerHTML = html;
    $('hpFeedback').innerHTML = '';
}

function checkHp(idx, el) {
    if (hpLocked) return;
    hpLocked = true;
    const q = hpQuestions[hpRound];
    const picked = q.options[idx];
    const allBtns = $('hpAnswers').querySelectorAll('.family-btn');

    if (picked.correct) {
        el.classList.add('correct');
        hpScore++;
        let extra = '';
        if (q.type === 'A') {
            extra = `<div style="margin-top:.5rem;font-size:.85rem;color:var(--dim)">完整列表：${q.answer}</div>`;
        } else if (q.type === 'B') {
            extra = `<div style="margin-top:.5rem;font-size:.85rem;color:var(--dim)">${q.zh} → ${q.answer}</div>`;
        }
        $('hpFeedback').innerHTML = `<span style="color:var(--green);font-weight:700">✅ 正確！</span>${extra}`;
    } else {
        el.classList.add('wrong');
        // Highlight correct answer
        allBtns.forEach((btn, i) => {
            if (q.options[i].correct) {
                btn.classList.add('correct');
            }
        });
        let extra = '';
        if (q.type === 'A') {
            extra = `<div style="margin-top:.5rem;font-size:.85rem;color:var(--dim)">正確答案：${q.answer}</div>`;
        } else if (q.type === 'B') {
            extra = `<div style="margin-top:.5rem;font-size:.85rem;color:var(--dim)">${q.zh} 屬於 ${q.answer}</div>`;
        } else {
            extra = `<div style="margin-top:.5rem;font-size:.85rem;color:var(--dim)">正確填入：${q.answer}</div>`;
        }
        $('hpFeedback').innerHTML = `<span style="color:var(--coral)">❌ 再想想</span>${extra}`;
    }

    hpRound++;
    setTimeout(nextHp, 2000);
}

function finishHp() {
    $('hpProgress').style.width = '100%';
    const pct = Math.round(hpScore / hpTotal * 100);
    const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--coral)';

    // Collect per-family results
    const famResults = {};
    hpQuestions.forEach((q, i) => {
        const fId = q.famId;
        if (!famResults[fId]) famResults[fId] = { correct: 0, total: 0 };
        famResults[fId].total++;
        if (i < hpRound && q.options.find((o, j) => o.correct)) {
            // Check if this round was answered correctly by checking score pattern
        }
    });

    // Build per-type stats
    let typeACorrect = 0, typeATotal = 0;
    let typeBCorrect = 0, typeBTotal = 0;
    let typeCCorrect = 0, typeCTotal = 0;
    // We track via the order of questions and score
    // Simpler: just show overall

    let emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎯' : pct >= 50 ? '💪' : '📖';
    const modeBadge = hpMode === 'ai'
        ? '<span style="display:inline-block;padding:.2rem .6rem;background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:6px;font-size:.7rem;font-weight:600;margin-left:.5rem;vertical-align:middle">🤖 AI 出題</span>'
        : '<span style="display:inline-block;padding:.2rem .6rem;background:rgba(255,255,255,.1);border-radius:6px;font-size:.7rem;margin-left:.5rem;vertical-align:middle">📦 本地出題</span>';

    const typeCDLine = hpMode === 'ai'
        ? '📝 <strong>IELTS 實戰填空</strong>：AI 生成的真實 IELTS 情境句填空'
        : '⚙️ <strong>引擎填空</strong>：練習在句型中選用正確替換詞';

    $('hpQuestion').innerHTML = '';
    $('hpAnswers').innerHTML = '';
    $('hpFeedback').innerHTML = `
    <div class="glass" style="padding:1.5rem;max-width:500px;width:100%;text-align:center">
        <div style="font-size:3rem;margin-bottom:.5rem">${emoji}</div>
        <h3>Hypernym 詞庫訓練完成！${modeBadge}</h3>
        <div style="font-size:2.5rem;font-weight:900;color:${color};margin:1rem 0">${hpScore} / ${hpTotal}</div>
        <p style="color:var(--dim);font-size:.9rem">正確率：${pct}%</p>

        <div style="margin-top:1.5rem;text-align:left">
            <h4 style="font-size:.9rem;margin-bottom:.5rem">📋 題型分析</h4>
            <div style="font-size:.85rem;color:var(--text);line-height:1.8">
                🔤 <strong>中文→英文配對</strong>：練習從中文概念找到英文表達<br>
                🏛️ <strong>英文→家族歸類</strong>：練習判斷英文詞彙的歸屬家族<br>
                ${typeCDLine}
            </div>
        </div>

        ${pct < 70 ? `
        <div style="margin-top:1rem;padding:.75rem;background:rgba(255,255,255,.05);border-radius:8px;border-left:3px solid var(--coral);text-align:left">
            <p style="font-size:.85rem;color:var(--coral);font-weight:600">🔴 建議強化</p>
            <p style="font-size:.8rem;color:var(--dim);margin-top:.3rem">
                多練習幾次！每個家族的替換詞都很重要。<br>
                小技巧：先記住每個家族的「代表詞」，再擴展到完整列表。
            </p>
        </div>` : pct < 90 ? `
        <div style="margin-top:1rem;padding:.75rem;background:rgba(255,255,255,.05);border-radius:8px;border-left:3px solid var(--accent);text-align:left">
            <p style="font-size:.85rem;color:var(--accent);font-weight:600">🟡 接近精通</p>
            <p style="font-size:.8rem;color:var(--dim);margin-top:.3rem">
                你已經記住了大部分替換詞！再多練幾次就能達到自動反應。
            </p>
        </div>` : `
        <div style="margin-top:1rem;padding:.75rem;background:rgba(255,255,255,.05);border-radius:8px;border-left:3px solid var(--green);text-align:left">
            <p style="font-size:.85rem;color:var(--green);font-weight:600">🟢 已精通！</p>
            <p style="font-size:.8rem;color:var(--dim);margin-top:.3rem">
                太棒了！你的 Hypernym 詞庫已經非常扎實，可以進入闖關模式挑戰了！
            </p>
        </div>`}

        <div style="display:flex;gap:.5rem;margin-top:1.5rem;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="startHypernymPractice()" style="flex:1">🔄 再練一次</button>
            <button class="btn btn-outline" onclick="showScreen('landing')" style="flex:1">🏠 回首頁</button>
        </div>
    </div>`;

    if (pct >= 80) confetti();
}
