(function () {
    const panelRegistry = new Map();

    function formatPct(value) {
        return `${(value * 100).toFixed(1)}%`;
    }

    function safeNum(value, fallback = 0) {
        return Number.isFinite(value) ? value : fallback;
    }

    function buildLines(state, tab) {
        const calcType = state.calcType || 'probability';
        const mean = safeNum(state.mean);
        const stddev = safeNum(state.stddev, 1);
        const result = safeNum(state.result);
        const z = stddev > 0 ? (result - mean) / stddev : 0;
        const probability = safeNum(state.probability, 0.5);

        if (tab === 'teach') {
            return [
                `Mean (mu) sets the center at ${mean.toFixed(3)}, while sigma controls spread at ${stddev.toFixed(3)}.`,
                'As sigma increases, the curve widens and the peak becomes lower.',
                'PDF shows density near a point; CDF shows accumulated probability up to a point.'
            ];
        }

        if (tab === 'apply') {
            if (calcType === 'quantile') {
                return [
                    `This cutoff is the ${formatPct(probability)} quantile of the model.`,
                    'Use this as a threshold for risk limits or critical-value style decision rules.',
                    `The implied standardized cutoff is z = ${z.toFixed(3)}.`
                ];
            }

            if (calcType === 'between') {
                return [
                    `This interval contains ${formatPct(result)} of the modeled outcomes.`,
                    'Interval probabilities map directly to confidence-style coverage intuition.',
                    'This is useful for acceptance bands, tolerance windows, and risk envelopes.'
                ];
            }

            return [
                `This left-tail probability (${formatPct(result)}) can be interpreted as a one-sided tail area.`,
                'Tail areas connect directly to significance-style reasoning in hypothesis workflows.',
                `The selected point corresponds to z = ${z.toFixed(3)} from the mean.`
            ];
        }

        if (calcType === 'quantile') {
            return [
                `${formatPct(probability)} of observations are expected at or below x = ${result.toFixed(3)}.`,
                `This cutoff lies ${Math.abs(z).toFixed(3)} standard deviations ${z >= 0 ? 'above' : 'below'} the mean.`,
                'For symmetric normal models, the complementary tail can be read directly from this percentile.'
            ];
        }

        if (calcType === 'between') {
            const lower = safeNum(state.lowerBound);
            const upper = safeNum(state.upperBound);
            return [
                `The selected interval [${lower.toFixed(3)}, ${upper.toFixed(3)}] contains ${formatPct(result)} of outcomes.`,
                'This is a direct coverage statement under the current normal assumptions.',
                'Narrower intervals reduce coverage; wider intervals increase coverage.'
            ];
        }

        const x = safeNum(state.xValue);
        return [
            `At x = ${x.toFixed(3)}, the model places ${formatPct(result)} of outcomes at or below this point.`,
            `This location is z = ${z.toFixed(3)} relative to mean ${mean.toFixed(3)}.`,
            'Because the normal model is symmetric, center-adjacent points produce near 50% cumulative probability.'
        ];
    }

    function renderPanel(targetId) {
        const panel = panelRegistry.get(targetId);
        if (!panel) return;

        const mount = document.getElementById(targetId);
        if (!mount) return;

        const lines = buildLines(panel.state, panel.activeTab);
        const content = mount.querySelector('.ai-panel-content');
        const unlockBtn = mount.querySelector('.ai-unlock-btn');
        const badge = mount.querySelector('.ai-badge');

        if (!content || !unlockBtn || !badge) return;

        if (!panel.premiumEnabled) {
            content.innerHTML = `
                <div class="ai-line">${lines[0]}</div>
                <div class="ai-line locked">${lines[1] || 'Premium insight available.'}</div>
            `;
            unlockBtn.style.display = 'inline-flex';
            badge.textContent = 'Preview';
        } else {
            content.innerHTML = lines.map(line => `<div class="ai-line">${line}</div>`).join('');
            unlockBtn.style.display = 'none';
            badge.textContent = 'AI+ Enabled';
        }

        mount.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === panel.activeTab);
        });
    }

    function initPanel(targetId) {
        const mount = document.getElementById(targetId);
        if (!mount) return;

        if (!panelRegistry.has(targetId)) {
            panelRegistry.set(targetId, {
                state: {},
                activeTab: 'interpret',
                premiumEnabled: false
            });
        }

        mount.innerHTML = `
            <div class="ai-insights-panel">
                <div class="ai-panel-head">
                    <span class="ai-title"><i class="fas fa-brain"></i> AI Insights</span>
                    <span class="ai-badge">Preview</span>
                </div>
                <div class="ai-tabs">
                    <button class="ai-tab-btn active" data-tab="interpret" type="button">Interpret</button>
                    <button class="ai-tab-btn" data-tab="teach" type="button">Teach</button>
                    <button class="ai-tab-btn" data-tab="apply" type="button">Apply</button>
                </div>
                <div class="ai-panel-content"></div>
                <button class="ai-unlock-btn" type="button">Unlock full AI+ insights</button>
            </div>
        `;

        mount.querySelectorAll('.ai-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = panelRegistry.get(targetId);
                if (!panel) return;
                panel.activeTab = btn.dataset.tab;
                renderPanel(targetId);
            });
        });

        const unlockBtn = mount.querySelector('.ai-unlock-btn');
        if (unlockBtn) {
            unlockBtn.addEventListener('click', () => {
                const panel = panelRegistry.get(targetId);
                if (!panel) return;
                panel.premiumEnabled = true;
                renderPanel(targetId);
            });
        }
    }

    function update(targetId, state) {
        if (!document.getElementById(targetId)) return;
        initPanel(targetId);
        const panel = panelRegistry.get(targetId);
        if (!panel) return;
        panel.state = state || {};
        renderPanel(targetId);
    }

    window.StatisticoAIInsights = {
        update
    };
})();
