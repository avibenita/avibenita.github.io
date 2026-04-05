(function () {
    const panelRegistry = new Map();

    function formatPct(value) {
        return `${(value * 100).toFixed(1)}%`;
    }

    function safeNum(value, fallback = 0) {
        return Number.isFinite(value) ? value : fallback;
    }

    function insightLabel(score) {
        if (score < 35) return 'Neutral';
        if (score < 60) return 'Informative';
        if (score < 80) return 'Strong';
        return 'Highly informative';
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function buildLines(state, tab) {
        const calcType = state.calcType || 'probability';
        const mean = safeNum(state.mean);
        const stddev = safeNum(state.stddev, 1);
        const result = safeNum(state.result);
        const z = stddev > 0 ? (result - mean) / stddev : 0;
        const probability = safeNum(state.probability, 0.5);
        const leftTail = safeNum(state.leftTail, probability);
        const rightTail = safeNum(state.rightTail, 1 - leftTail);
        const absZ = Math.abs(z);

        if (tab === 'teach') {
            return [
                `Unusualness is determined by distance from the mean in sigma units; here that distance is ${absZ.toFixed(3)}σ.`,
                'Increasing sigma spreads the curve, so the same x becomes less extreme.',
                'CDF answers "how much is below", while PDF answers "how dense values are near this point."'
            ];
        }

        if (tab === 'apply') {
            if (calcType === 'quantile') {
                return [
                    `This cutoff corresponds to the ${formatPct(probability)} percentile used in threshold-based decisions.`,
                    `${(1 - probability) < 0.05 ? 'It is in a tail region often used for critical-value rules.' : 'It remains inside the broad central region, not a strict critical cutoff.'}`,
                    `Reference position: z = ${z.toFixed(3)}.`
                ];
            }

            if (calcType === 'between') {
                return [
                    `This interval captures ${formatPct(leftTail)} to ${formatPct(safeNum(state.upperTailCdf, leftTail + result))}, i.e. ${formatPct(result)} total coverage.`,
                    'Use this directly for acceptance bands, tolerance windows, or risk envelopes.',
                    `${result < 0.5 ? 'Coverage is relatively narrow, so misses outside the interval are common.' : 'Coverage is broad, so misses outside the interval are less common.'}`
                ];
            }

            return [
                `If treated as a right-tail cutoff, this point implies a one-sided p-value of about ${rightTail.toFixed(4)}.`,
                `${rightTail < 0.05 ? 'This would cross conventional significance thresholds in a right-tailed test.' : 'This is above common significance thresholds, so it is not decision-critical in a right-tailed test.'}`,
                `Reference position: z = ${z.toFixed(3)}.`
            ];
        }

        if (calcType === 'quantile') {
            return [
                `${formatPct(probability)} of observations are expected at or below x = ${result.toFixed(3)}.`,
                `Only ${formatPct(1 - probability)} remain above this threshold, so it is ${probability > 0.9 || probability < 0.1 ? 'tail-oriented' : 'centrally positioned'}.`,
                `This maps to z = ${z.toFixed(3)} (${z >= 0 ? 'above' : 'below'} the mean).`
            ];
        }

        if (calcType === 'between') {
            const lower = safeNum(state.lowerBound);
            const upper = safeNum(state.upperBound);
            return [
                `The interval [${lower.toFixed(3)}, ${upper.toFixed(3)}] contains ${formatPct(result)} of modeled outcomes.`,
                `Outside-interval probability is ${formatPct(1 - result)}, so this range is ${result >= 0.8 ? 'high-coverage' : 'moderate-coverage'}.`,
                'This directly supports interval-based quality and risk decisions.'
            ];
        }

        const x = safeNum(state.xValue);
        return [
            `At x = ${x.toFixed(3)}, the model places ${formatPct(leftTail)} at or below this point and ${formatPct(rightTail)} above it.`,
            `${rightTail < 0.1 ? 'This sits in a relatively rare upper region.' : 'This remains within a commonly observed region.'}`,
            `Standardized position is z = ${z.toFixed(3)} relative to mean ${mean.toFixed(3)}.`
        ];
    }

    function computeInsightScore(state) {
        const calcType = state.calcType || 'probability';
        const mean = safeNum(state.mean);
        const stddev = safeNum(state.stddev, 1);
        const result = safeNum(state.result);
        const leftTail = safeNum(state.leftTail, calcType === 'quantile' ? safeNum(state.probability, 0.5) : result);
        const rightTail = safeNum(state.rightTail, 1 - leftTail);
        const z = stddev > 0 ? (result - mean) / stddev : 0;
        const absZ = Math.abs(z);

        let score = 18 + absZ * 26;
        const tail = Math.min(leftTail, rightTail);
        if (tail < 0.1) score += 8;
        if (tail < 0.05) score += 10;
        if (tail < 0.01) score += 12;
        if (calcType === 'between') score = 22 + (1 - safeNum(state.result)) * 55;
        if (calcType === 'quantile') score += 6;
        return Math.round(clamp(score, 8, 100));
    }

    function getPanel(targetId) {
        return panelRegistry.get(targetId);
    }

    function closeModal(targetId) {
        const panel = getPanel(targetId);
        if (!panel) return;
        const modal = document.getElementById(panel.modalId);
        if (!modal) return;
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
    }

    function openModal(targetId) {
        const panel = getPanel(targetId);
        if (!panel) return;
        const modal = document.getElementById(panel.modalId);
        if (!modal) return;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function renderPanel(targetId) {
        const panel = getPanel(targetId);
        if (!panel) return;

        const mount = document.getElementById(targetId);
        const modal = document.getElementById(panel.modalId);
        if (!mount || !modal) return;

        const lines = buildLines(panel.state, panel.activeTab);
        const score = computeInsightScore(panel.state);
        const scoreLabel = insightLabel(score);

        const inlineScoreEl = mount.querySelector('.ai-inline-score');
        const content = modal.querySelector('.ai-panel-content');
        const scoreValueEl = modal.querySelector('.ai-score-value');
        const scoreLabelEl = modal.querySelector('.ai-score-label');
        const scoreBarEl = modal.querySelector('.ai-score-fill');
        const subheadEl = modal.querySelector('.ai-subhead');
        const premiumPillEl = modal.querySelector('.ai-premium-pill');
        const unlockWrapEl = modal.querySelector('.ai-unlock-wrap');
        const unlockBtnEl = modal.querySelector('.ai-unlock-btn');

        if (!inlineScoreEl || !content || !scoreValueEl || !scoreLabelEl || !scoreBarEl || !subheadEl || !premiumPillEl || !unlockWrapEl || !unlockBtnEl) return;

        inlineScoreEl.textContent = panel.isPremiumUnlocked
            ? `Insight strength: ${score}/100`
            : `AI+ locked • preview active`;

        if (panel.isPremiumUnlocked) {
            content.innerHTML = lines.map(line => `<div class="ai-line">${line}</div>`).join('');
            premiumPillEl.textContent = 'AI+ Enabled';
            premiumPillEl.classList.add('enabled');
            unlockWrapEl.style.display = 'none';
        } else {
            const firstLine = lines[0] || 'Preview insight unavailable.';
            const secondLine = lines[1] || 'Unlock AI+ for decision-ready depth and workflow mapping.';
            content.innerHTML = `
                <div class="ai-line">${firstLine}</div>
                <div class="ai-line locked">${secondLine}</div>
            `;
            premiumPillEl.textContent = 'AI+ Locked';
            premiumPillEl.classList.remove('enabled');
            unlockWrapEl.style.display = 'block';
        }

        scoreValueEl.textContent = `${score} / 100`;
        scoreLabelEl.textContent = scoreLabel;
        scoreBarEl.style.width = `${score}%`;
        subheadEl.textContent = panel.activeTab === 'interpret'
            ? 'Decision-focused reading of the current result'
            : panel.activeTab === 'teach'
                ? 'Compact conceptual guidance tied to current state'
                : 'Workflow bridge for practical statistical use';

        modal.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === panel.activeTab);
        });
    }

    function ensureModal(targetId) {
        const panel = getPanel(targetId);
        if (!panel) return null;
        const existing = document.getElementById(panel.modalId);
        if (existing) return existing;

        const modal = document.createElement('div');
        modal.id = panel.modalId;
        modal.className = 'ai-insights-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="ai-insights-backdrop" data-ai-close></div>
            <div class="ai-insights-dialog" role="dialog" aria-modal="true" aria-label="AI insights">
                <div class="ai-panel-head">
                    <span class="ai-title"><i class="fas fa-sparkles"></i> Insight Lens</span>
                    <span class="ai-premium-pill">AI+ Locked</span>
                    <button class="ai-close-btn" type="button" aria-label="Close insights"><i class="fas fa-times"></i></button>
                </div>
                <div class="ai-subhead"></div>
                <div class="ai-tabs">
                    <button class="ai-tab-btn active" data-tab="interpret" type="button">Interpret</button>
                    <button class="ai-tab-btn" data-tab="teach" type="button">Teach</button>
                    <button class="ai-tab-btn" data-tab="apply" type="button">Apply</button>
                </div>
                <div class="ai-panel-content"></div>
                <div class="ai-unlock-wrap">
                    <div class="ai-unlock-note">Premium reasoning includes deeper interpretation, teaching clarity, and applied workflow guidance.</div>
                    <button class="ai-unlock-btn" type="button">Unlock AI+ insights</button>
                </div>
                <div class="ai-score-wrap">
                    <div class="ai-score-head">
                        <span>Insight strength</span>
                        <span class="ai-score-value">0 / 100</span>
                    </div>
                    <div class="ai-score-track"><div class="ai-score-fill"></div></div>
                    <div class="ai-score-label">Neutral</div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const current = getPanel(targetId);
                if (!current) return;
                current.activeTab = btn.dataset.tab;
                renderPanel(targetId);
            });
        });

        modal.querySelectorAll('[data-ai-close]').forEach(el => {
            el.addEventListener('click', () => closeModal(targetId));
        });

        const closeBtn = modal.querySelector('.ai-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(targetId));

        const unlockBtn = modal.querySelector('.ai-unlock-btn');
        if (unlockBtn) {
            unlockBtn.addEventListener('click', () => {
                const current = getPanel(targetId);
                if (!current) return;
                current.isPremiumUnlocked = true;
                renderPanel(targetId);
            });
        }

        return modal;
    }

    function initPanel(targetId) {
        const mount = document.getElementById(targetId);
        if (!mount) return;

        if (!panelRegistry.has(targetId)) {
            panelRegistry.set(targetId, {
                state: {},
                activeTab: 'interpret',
                modalId: `aiInsightsModal-${targetId}`,
                isPremiumUnlocked: false
            });
        }

        mount.innerHTML = `
            <div class="ai-inline-trigger">
                <button class="ai-open-btn" type="button">
                    <i class="fas fa-sparkles"></i>
                    Insight Lens
                </button>
                <span class="ai-inline-score">Insight strength: --</span>
            </div>
        `;

        ensureModal(targetId);

        const openBtn = mount.querySelector('.ai-open-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => openModal(targetId));
        }
    }

    function update(targetId, state) {
        if (!document.getElementById(targetId)) return;
        initPanel(targetId);
        const panel = getPanel(targetId);
        if (!panel) return;
        panel.state = state || {};
        renderPanel(targetId);
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        panelRegistry.forEach((_value, key) => closeModal(key));
    });

    window.StatisticoAIInsights = {
        update
    };
})();
