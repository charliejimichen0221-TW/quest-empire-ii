// ============================================================
// analytics.js — 學習分析模組（純記憶體 + 匯出）
// 不使用 localStorage，所有資料在記憶體中收集，可匯出 JSON
// ============================================================

const Analytics = (() => {
    // --- Session data (in-memory only) ---
    const session = {
        startTime: null,
        endTime: null,
        totalScore: 0,
        phases: {
            p1: { rounds: [], score: 0, total: 0 },
            p2: { rounds: [], score: 0, total: 0 },
            p3: { rounds: [], score: 0, total: 0 },
            p4: { round: null }
        },
        // Confusion matrices
        familyConfusion: {},   // { "wrongId": { "correctId": count } }
        engineConfusion: {},   // { "wrongId": { "correctId": count } }
        // Per-family / per-engine stats
        familyStats: {},       // { famId: { seen, correct } }
        engineStats: {},       // { engId: { seen, correct } }
        // Streaks
        longestStreak: 0,
        currentStreak: 0
    };

    let _roundTimer = null;

    // --- Initialize session ---
    function startSession() {
        session.startTime = new Date().toISOString();
        session.phases.p1 = { rounds: [], score: 0, total: 0 };
        session.phases.p2 = { rounds: [], score: 0, total: 0 };
        session.phases.p3 = { rounds: [], score: 0, total: 0 };
        session.phases.p4 = { round: null };
        session.familyConfusion = {};
        session.engineConfusion = {};
        session.familyStats = {};
        session.engineStats = {};
        session.longestStreak = 0;
        session.currentStreak = 0;
        session.totalScore = 0;
    }

    // --- Timer helpers ---
    function startTimer() {
        _roundTimer = Date.now();
    }

    function getElapsed() {
        return _roundTimer ? Date.now() - _roundTimer : 0;
    }

    // --- Streak tracking ---
    function _recordStreak(correct) {
        if (correct) {
            session.currentStreak++;
            if (session.currentStreak > session.longestStreak) {
                session.longestStreak = session.currentStreak;
            }
        } else {
            session.currentStreak = 0;
        }
    }

    // --- Phase 1: Family Identification ---
    function recordP1(exam, selectedFams, correctFams) {
        const elapsed = getElapsed();
        const hit = selectedFams.filter(f => correctFams.includes(f));
        const miss = selectedFams.filter(f => !correctFams.includes(f));
        const missed = correctFams.filter(f => !selectedFams.includes(f));
        const perfect = hit.length === correctFams.length && miss.length === 0;

        const round = {
            examId: exam.id,
            topic: exam.topic,
            question: exam.q,
            selected: selectedFams,
            correct: correctFams,
            hit: hit,
            miss: miss,
            missed: missed,
            perfect: perfect,
            timeMs: elapsed
        };

        session.phases.p1.rounds.push(round);
        session.phases.p1.total++;
        if (perfect) session.phases.p1.score++;

        // Family stats
        correctFams.forEach(fId => {
            if (!session.familyStats[fId]) session.familyStats[fId] = { seen: 0, correct: 0 };
            session.familyStats[fId].seen++;
            if (selectedFams.includes(fId)) session.familyStats[fId].correct++;
        });

        // Confusion matrix: when user picks wrong family
        miss.forEach(wrongId => {
            correctFams.forEach(correctId => {
                const key = `F${wrongId}`;
                if (!session.familyConfusion[key]) session.familyConfusion[key] = {};
                const cKey = `F${correctId}`;
                session.familyConfusion[key][cKey] = (session.familyConfusion[key][cKey] || 0) + 1;
            });
        });

        _recordStreak(perfect);
    }

    // --- Phase 2: Engine Match ---
    function recordP2(correctEngId, pickedEngId, formula) {
        const elapsed = getElapsed();
        const correct = pickedEngId === correctEngId;

        const round = {
            correctEngine: correctEngId,
            pickedEngine: pickedEngId,
            formula: formula,
            correct: correct,
            timeMs: elapsed
        };

        session.phases.p2.rounds.push(round);
        session.phases.p2.total++;
        if (correct) session.phases.p2.score++;

        // Engine stats
        if (!session.engineStats[correctEngId]) session.engineStats[correctEngId] = { seen: 0, correct: 0 };
        session.engineStats[correctEngId].seen++;
        if (correct) session.engineStats[correctEngId].correct++;

        // Confusion matrix
        if (!correct) {
            const key = pickedEngId;
            if (!session.engineConfusion[key]) session.engineConfusion[key] = {};
            session.engineConfusion[key][correctEngId] = (session.engineConfusion[key][correctEngId] || 0) + 1;
        }

        _recordStreak(correct);
    }

    // --- Phase 3: Build Argument ---
    function recordP3(exam, chosenEngine, pickedHypernyms, text, aiFeedback) {
        const elapsed = getElapsed();

        const round = {
            examId: exam.id,
            topic: exam.topic,
            question: exam.q,
            chosenEngine: chosenEngine,
            hypernyms: pickedHypernyms,
            studentText: text,
            wordCount: text.split(/\s+/).filter(w => w).length,
            charCount: text.length,
            aiFeedback: aiFeedback || null,
            timeMs: elapsed
        };

        session.phases.p3.rounds.push(round);
        session.phases.p3.total++;
        session.phases.p3.score++;

        // Track engine usage
        if (chosenEngine) {
            if (!session.engineStats[chosenEngine]) session.engineStats[chosenEngine] = { seen: 0, correct: 0 };
            session.engineStats[chosenEngine].seen++;
            session.engineStats[chosenEngine].correct++;
        }

        _recordStreak(true);
    }

    // --- Phase 4: Full SOP ---
    function recordP4(exam, text, aiFeedback, bandScore) {
        const elapsed = getElapsed();

        session.phases.p4.round = {
            examId: exam.id,
            topic: exam.topic,
            question: exam.q,
            families: exam.fam.map(i => ({ id: i, name: FAMILIES[i]?.name || `F${i}` })),
            engines: exam.eng,
            studentText: text,
            wordCount: text.split(/\s+/).filter(w => w).length,
            charCount: text.length,
            aiFeedback: aiFeedback || null,
            bandScore: bandScore || null,
            timeMs: elapsed
        };
    }

    // --- Finalize session ---
    function endSession(totalScore) {
        session.endTime = new Date().toISOString();
        session.totalScore = totalScore;
    }

    // --- Generate summary report ---
    function getSummary() {
        const p1Acc = session.phases.p1.total > 0
            ? Math.round((session.phases.p1.score / session.phases.p1.total) * 100)
            : 0;
        const p2Acc = session.phases.p2.total > 0
            ? Math.round((session.phases.p2.score / session.phases.p2.total) * 100)
            : 0;

        // Find weakest families
        const weakFamilies = Object.entries(session.familyStats)
            .map(([id, s]) => ({ id: parseInt(id), name: FAMILIES[parseInt(id)]?.name, accuracy: s.seen > 0 ? Math.round((s.correct / s.seen) * 100) : 0, seen: s.seen }))
            .filter(f => f.seen > 0)
            .sort((a, b) => a.accuracy - b.accuracy);

        // Find weakest engines
        const weakEngines = Object.entries(session.engineStats)
            .map(([id, s]) => ({ id, accuracy: s.seen > 0 ? Math.round((s.correct / s.seen) * 100) : 0, seen: s.seen }))
            .filter(e => e.seen > 0)
            .sort((a, b) => a.accuracy - b.accuracy);

        // Average response time per phase
        const p1AvgTime = session.phases.p1.rounds.length > 0
            ? Math.round(session.phases.p1.rounds.reduce((s, r) => s + r.timeMs, 0) / session.phases.p1.rounds.length)
            : 0;
        const p2AvgTime = session.phases.p2.rounds.length > 0
            ? Math.round(session.phases.p2.rounds.reduce((s, r) => s + r.timeMs, 0) / session.phases.p2.rounds.length)
            : 0;

        return {
            duration: session.startTime && session.endTime
                ? Math.round((new Date(session.endTime) - new Date(session.startTime)) / 1000)
                : 0,
            totalScore: session.totalScore,
            phase1: { accuracy: p1Acc, avgTimeMs: p1AvgTime, score: session.phases.p1.score, total: session.phases.p1.total },
            phase2: { accuracy: p2Acc, avgTimeMs: p2AvgTime, score: session.phases.p2.score, total: session.phases.p2.total },
            phase3: { score: session.phases.p3.score, total: session.phases.p3.total },
            longestStreak: session.longestStreak,
            weakFamilies: weakFamilies.slice(0, 3),
            weakEngines: weakEngines.slice(0, 3),
            familyConfusion: session.familyConfusion,
            engineConfusion: session.engineConfusion
        };
    }

    // --- Export full session data as JSON download ---
    function exportJSON() {
        const data = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            session: session,
            summary: getSummary()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        a.href = url;
        a.download = `ielts_game_log_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- Export as CSV (flat summary) ---
    function exportCSV() {
        const s = getSummary();
        const rows = [
            ['Metric', 'Value'],
            ['Date', session.startTime],
            ['Duration (sec)', s.duration],
            ['Total Score', s.totalScore],
            ['P1 Family Accuracy %', s.phase1.accuracy],
            ['P1 Avg Time (ms)', s.phase1.avgTimeMs],
            ['P2 Engine Accuracy %', s.phase2.accuracy],
            ['P2 Avg Time (ms)', s.phase2.avgTimeMs],
            ['P3 Arguments Written', s.phase3.total],
            ['Longest Streak', s.longestStreak],
            ['Weakest Family 1', s.weakFamilies[0]?.name || 'N/A'],
            ['Weakest Family 2', s.weakFamilies[1]?.name || 'N/A'],
            ['Weakest Engine 1', s.weakEngines[0]?.id || 'N/A'],
            ['Weakest Engine 2', s.weakEngines[1]?.id || 'N/A'],
        ];

        // Add P3 written text
        session.phases.p3.rounds.forEach((r, i) => {
            rows.push([`P3 Round ${i + 1} Text`, `"${(r.studentText || '').replace(/"/g, '""')}"`]);
            rows.push([`P3 Round ${i + 1} Words`, r.wordCount]);
            rows.push([`P3 Round ${i + 1} Engine`, r.chosenEngine]);
        });

        // Add P4
        if (session.phases.p4.round) {
            rows.push(['P4 Final Text', `"${(session.phases.p4.round.studentText || '').replace(/"/g, '""')}"`]);
            rows.push(['P4 Words', session.phases.p4.round.wordCount]);
            rows.push(['P4 Band Score', session.phases.p4.round.bandScore || 'N/A']);
        }

        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:-]/g, '');
        a.href = url;
        a.download = `ielts_game_log_${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- AI Coach: Build prompt from session data ---
    function _buildCoachPrompt() {
        const s = getSummary();

        // Family accuracy details
        const famDetails = Object.entries(session.familyStats)
            .map(([id, stat]) => {
                const fam = FAMILIES[parseInt(id)];
                const pct = stat.seen > 0 ? Math.round((stat.correct / stat.seen) * 100) : 0;
                return `${fam?.icon || ''} ${fam?.name || id}: ${pct}% (${stat.correct}/${stat.seen})`;
            }).join('\n');

        // Engine accuracy details
        const engDetails = Object.entries(session.engineStats)
            .map(([id, stat]) => {
                const pct = stat.seen > 0 ? Math.round((stat.correct / stat.seen) * 100) : 0;
                return `${id}: ${pct}% (${stat.correct}/${stat.seen})`;
            }).join('\n');

        // Confusion patterns
        let confusions = '';
        Object.entries(session.familyConfusion).forEach(([wrong, targets]) => {
            Object.entries(targets).forEach(([correct, count]) => {
                const wId = parseInt(wrong.replace('F', ''));
                const cId = parseInt(correct.replace('F', ''));
                confusions += `家族混淆：把 ${FAMILIES[cId]?.name} 誤選成 ${FAMILIES[wId]?.name}（${count}次）\n`;
            });
        });
        Object.entries(session.engineConfusion).forEach(([wrong, targets]) => {
            Object.entries(targets).forEach(([correct, count]) => {
                confusions += `引擎混淆：把 ${correct} 誤選成 ${wrong}（${count}次）\n`;
            });
        });

        // Student written texts
        let writtenTexts = '';
        session.phases.p3.rounds.forEach((r, i) => {
            writtenTexts += `\n--- P3 第${i + 1}題 ---\n題目：${r.question}\n使用引擎：${r.chosenEngine}\n替換詞：${r.hypernyms?.join(', ')}\n學生寫的：${r.studentText}\n字數：${r.wordCount}`;
        });
        if (session.phases.p4.round) {
            const p4 = session.phases.p4.round;
            writtenTexts += `\n--- P4 Boss關 ---\n題目：${p4.question}\n學生寫的：${p4.studentText}\n字數：${p4.wordCount}`;
            if (p4.bandScore) writtenTexts += `\nBand Score：${p4.bandScore}`;
        }

        return `你是一位專業的 IELTS 寫作教練。以下是學生在「IELTS 闖關密碼」遊戲中的完整表現數據。請根據這些數據，用繁體中文產出一份「須強化方向」分析報告。

📊 整體表現：
- 總分：${s.totalScore}
- 遊戲時長：${s.duration} 秒
- 最長連對：${s.longestStreak} 題

📌 Phase 1 家族辨識（正確率 ${s.phase1.accuracy}%，平均反應 ${(s.phase1.avgTimeMs / 1000).toFixed(1)}秒）：
${famDetails || '無資料'}

📌 Phase 2 引擎配對（正確率 ${s.phase2.accuracy}%，平均反應 ${(s.phase2.avgTimeMs / 1000).toFixed(1)}秒）：
${engDetails || '無資料'}

📌 混淆模式：
${confusions || '無混淆記錄'}

📌 學生寫的論點：
${writtenTexts || '無文字記錄'}

請分析並輸出以下格式：

🔴 最需強化（1-2 項最關鍵的弱點）
每項包含：問題描述 + 為什麼重要 + 具體改善行動

🟡 可以進步（1-2 項次要改善空間）
每項包含：現狀描述 + 建議練習方式

🟢 已掌握（列出學生做得好的地方，給予肯定）

🎯 本週練習建議
針對最弱的部分，建議一個具體的 15 分鐘練習計劃

注意：
- 請具體、可行，不要泛泛而談
- 如果學生寫的論點有明顯文法或邏輯問題，請指出
- 如果家族混淆，請解釋兩個家族的區別
- 如果引擎混淆，請解釋兩個引擎公式的差異`;
    }

    // --- Ask AI Coach ---
    async function askAICoach() {
        const apiKey = document.getElementById('apiKey')?.value?.trim();
        if (!apiKey) return null;

        const prompt = _buildCoachPrompt();
        try {
            const r = await fetch('https://api-ai.gitcode.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                body: JSON.stringify({
                    model: 'moonshotai/Kimi-K2-Instruct',
                    messages: [{ role: 'user', content: prompt }],
                    stream: true,
                    max_tokens: 4096,
                    temperature: 0.6,
                    top_p: 0.95
                })
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

    // --- Render dashboard on Victory screen ---
    function renderDashboard(containerId) {
        const s = getSummary();
        const el = document.getElementById(containerId);
        if (!el) return;

        // Radar-style bars for family mastery
        const familyBars = Object.entries(session.familyStats)
            .map(([id, stat]) => {
                const fam = FAMILIES[parseInt(id)];
                const pct = stat.seen > 0 ? Math.round((stat.correct / stat.seen) * 100) : 0;
                const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--coral)';
                return `<div style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0">
                    <span style="width:90px;font-size:.8rem;text-align:right">${fam?.icon || ''} ${fam?.name || id}</span>
                    <div style="flex:1;height:18px;background:rgba(255,255,255,.08);border-radius:9px;overflow:hidden">
                        <div style="width:${pct}%;height:100%;background:${color};border-radius:9px;transition:width .5s"></div>
                    </div>
                    <span style="width:40px;font-size:.8rem;font-weight:700;color:${color}">${pct}%</span>
                </div>`;
            }).join('');

        // Engine mastery bars
        const engineBars = Object.entries(session.engineStats)
            .map(([id, stat]) => {
                const pct = stat.seen > 0 ? Math.round((stat.correct / stat.seen) * 100) : 0;
                const color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--coral)';
                return `<div style="display:flex;align-items:center;gap:.5rem;margin:.25rem 0">
                    <span style="width:90px;font-size:.8rem;text-align:right">${id}</span>
                    <div style="flex:1;height:18px;background:rgba(255,255,255,.08);border-radius:9px;overflow:hidden">
                        <div style="width:${pct}%;height:100%;background:${color};border-radius:9px;transition:width .5s"></div>
                    </div>
                    <span style="width:40px;font-size:.8rem;font-weight:700;color:${color}">${pct}%</span>
                </div>`;
            }).join('');

        // Confusion alerts
        let confusionAlerts = '';
        Object.entries(session.familyConfusion).forEach(([wrong, targets]) => {
            Object.entries(targets).forEach(([correct, count]) => {
                const wId = parseInt(wrong.replace('F', ''));
                const cId = parseInt(correct.replace('F', ''));
                confusionAlerts += `<div style="font-size:.85rem;color:var(--coral);margin:.2rem 0">
                    ⚠️ 你把 ${FAMILIES[cId]?.icon}${FAMILIES[cId]?.name} 誤選成 ${FAMILIES[wId]?.icon}${FAMILIES[wId]?.name}（${count}次）
                </div>`;
            });
        });
        Object.entries(session.engineConfusion).forEach(([wrong, targets]) => {
            Object.entries(targets).forEach(([correct, count]) => {
                confusionAlerts += `<div style="font-size:.85rem;color:var(--coral);margin:.2rem 0">
                    ⚠️ 你把 ${correct} 誤選成 ${wrong}（${count}次）
                </div>`;
            });
        });

        el.innerHTML = `
        <div class="glass" style="max-width:650px;width:100%;padding:1.5rem;margin-top:1.5rem">
            <h3 style="margin-bottom:1rem">📊 學習分析儀表板</h3>

            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;margin-bottom:1.5rem;text-align:center">
                <div><div style="font-size:1.5rem;font-weight:900;color:var(--accent)">${s.duration}s</div><div style="font-size:.7rem;color:var(--dim)">總時長</div></div>
                <div><div style="font-size:1.5rem;font-weight:900;color:var(--green)">${s.longestStreak}</div><div style="font-size:.7rem;color:var(--dim)">最長連對</div></div>
                <div><div style="font-size:1.5rem;font-weight:900;color:var(--accent)">${s.phase1.avgTimeMs ? (s.phase1.avgTimeMs / 1000).toFixed(1) + 's' : '-'}</div><div style="font-size:.7rem;color:var(--dim)">P1 平均反應</div></div>
                <div><div style="font-size:1.5rem;font-weight:900;color:var(--accent)">${s.phase2.avgTimeMs ? (s.phase2.avgTimeMs / 1000).toFixed(1) + 's' : '-'}</div><div style="font-size:.7rem;color:var(--dim)">P2 平均反應</div></div>
            </div>

            ${familyBars ? `<h4 style="margin:.75rem 0 .5rem;font-size:.9rem">🏛️ 家族掌握度</h4>${familyBars}` : ''}
            ${engineBars ? `<h4 style="margin:.75rem 0 .5rem;font-size:.9rem">⚙️ 引擎掌握度</h4>${engineBars}` : ''}
            ${confusionAlerts ? `<h4 style="margin:.75rem 0 .5rem;font-size:.9rem">🔍 混淆提醒</h4>${confusionAlerts}` : ''}

            <div id="aiCoachSection" style="margin-top:1.5rem">
                <h4 style="margin-bottom:.5rem;font-size:.9rem">🤖 AI 教練：須強化方向</h4>
                <div id="aiCoachContent" style="font-size:.85rem;line-height:1.7;color:var(--text)">
                    <span class="loading"></span> Kimi 2.5 正在分析你的表現數據...
                </div>
            </div>

            <div style="display:flex;gap:.5rem;margin-top:1.5rem;flex-wrap:wrap">
                <button class="btn btn-sm btn-outline" onclick="Analytics.exportJSON()" style="flex:1">📥 匯出 JSON</button>
                <button class="btn btn-sm btn-outline" onclick="Analytics.exportCSV()" style="flex:1">📥 匯出 CSV</button>
            </div>
        </div>`;

        // Auto-trigger AI Coach in background
        _triggerAICoach();
    }

    // --- Trigger AI Coach analysis ---
    async function _triggerAICoach() {
        const coachEl = document.getElementById('aiCoachContent');
        if (!coachEl) return;

        const apiKey = document.getElementById('apiKey')?.value?.trim();
        if (!apiKey) {
            coachEl.innerHTML = `<div style="padding:.75rem;background:rgba(255,255,255,.05);border-radius:8px;border-left:3px solid var(--accent)">
                <p style="color:var(--dim)">💡 輸入 API Key 並驗證後，AI 教練會自動分析你的表現並提供個人化強化建議。</p>
                <p style="color:var(--dim);margin-top:.5rem;font-size:.8rem">目前可參考上方的掌握度長條圖和混淆提醒來自行判斷弱點。</p>
            </div>`;
            return;
        }

        try {
            const result = await askAICoach();
            if (result) {
                // Format the result with colored sections
                const formatted = result
                    .replace(/🔴/g, '<span style="font-size:1.1rem">🔴</span>')
                    .replace(/🟡/g, '<span style="font-size:1.1rem">🟡</span>')
                    .replace(/🟢/g, '<span style="font-size:1.1rem">🟢</span>')
                    .replace(/🎯/g, '<span style="font-size:1.1rem">🎯</span>')
                    .replace(/\n/g, '<br>');
                coachEl.innerHTML = `<div style="padding:1rem;background:rgba(255,255,255,.05);border-radius:8px;border-left:3px solid var(--teal);white-space:pre-wrap">${formatted}</div>`;
            } else {
                coachEl.innerHTML = '<span style="color:var(--coral)">AI 分析失敗，請確認 API Key 是否有效。</span>';
            }
        } catch (e) {
            coachEl.innerHTML = '<span style="color:var(--coral)">AI 連線失敗。</span>';
        }
    }

    // --- Public API ---
    return {
        startSession,
        startTimer,
        recordP1,
        recordP2,
        recordP3,
        recordP4,
        endSession,
        getSummary,
        exportJSON,
        exportCSV,
        renderDashboard,
        askAICoach
    };
})();
