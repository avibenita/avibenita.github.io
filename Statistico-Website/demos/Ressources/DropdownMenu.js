
class DropdownMenu extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });
    shadow.innerHTML = `
       <style>
         :host {
           display: block;
           position: relative;
           z-index: 99999;
           font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
           --surface-0: #0c1624;
           --surface-1: #1a1f2e;
           --surface-2: #242938;
           --border: #2d3748;
           --accent-1: rgb(255,165,120);
           --text-primary: #ffffff;
           --text-secondary: rgba(255,255,255,0.8);
           --panel-shadow: 0px 4px 20px rgba(0, 0, 0, 0.4);
         }
         .header {
           display: flex;
           justify-content: space-between;
           align-items: center;
           background: var(--surface-0);
           padding: 20px;
           border-bottom: 1px solid var(--border);
           position: relative;
           z-index: 9999;
         }
         .left { flex: 0 0 auto; color: var(--accent-1); font-weight: 600; font-size: 18px; }
         .center { flex: 1 1 auto; text-align: center; }
         .analysis-title { font-size: 22px; color: var(--accent-1); margin: 0; font-weight: 700; letter-spacing: 0.3px; }
         .variable-line { margin-top: 2px; font-size: 14px; color: var(--text-secondary); font-style: italic; display: none; }
         .variable-line .n { display: none; }
         .dropdown { 
           position: relative;
           z-index: 10000;
         }
         .dropbtn {
           position: relative;
           z-index: 10001;
           transition: all 0.3s ease;
           animation: subtle-glow 3s ease-in-out infinite;
           background: linear-gradient(145deg, #4a5568, #2d3748) !important;
           border: 1px solid #4a5568 !important;
           box-shadow:
             0 4px 8px rgba(0, 0, 0, 0.3),
             inset 0 1px 0 rgba(255, 255, 255, 0.1),
             inset 0 -1px 0 rgba(0, 0, 0, 0.2) !important;
           text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
           border-radius: 8px !important;
           font-weight: 600;
           color: #e2e8f0 !important;
           padding: 8px 16px;
           cursor: pointer;
           display: flex;
           align-items: center;
           gap: 6px;
           font-size: 12px;
         }
         @keyframes subtle-glow {
           0%, 100% {
             box-shadow:
               0 4px 8px rgba(0, 0, 0, 0.3),
               0 0 5px rgba(255, 165, 120, 0.3),
               inset 0 1px 0 rgba(255, 255, 255, 0.1),
               inset 0 -1px 0 rgba(0, 0, 0, 0.2);
           }
           50% {
             box-shadow:
               0 4px 8px rgba(0, 0, 0, 0.3),
               0 0 15px rgba(255, 165, 120, 0.5),
               0 0 25px rgba(255, 165, 120, 0.2),
               inset 0 1px 0 rgba(255, 255, 255, 0.1),
               inset 0 -1px 0 rgba(0, 0, 0, 0.2);
           }
         }
         .dropbtn:hover {
           background: linear-gradient(145deg, #5a6578, #3d4758) !important;
           box-shadow:
             0 6px 12px rgba(0, 0, 0, 0.4),
             0 0 20px rgba(255, 165, 120, 0.6),
             inset 0 1px 0 rgba(255, 255, 255, 0.15),
             inset 0 -1px 0 rgba(0, 0, 0, 0.25) !important;
           transform: translateY(-1px);
           animation: none;
         }
         .dropdown-content {
           display: none;
           position: absolute;
           top: 100%;
           right: 0;
           min-width: 420px;
           z-index: 10002;
           background: var(--surface-1);
           border: 1px solid var(--border);
           border-radius: 8px;
           box-shadow: var(--panel-shadow);
           padding: 8px 0;
           margin-top: 4px;
           opacity: 0;
           transform: scaleY(0);
           transform-origin: top;
           transition: all 0.25s ease-in-out;
         }
         .dropdown-content.show {
           display: block;
           opacity: 1;
           transform: scaleY(1);
         }
         .dropdown-content a {
           padding: 10px 16px;
           display: flex;
           align-items: center;
           text-decoration: none;
           color: var(--text-secondary);
           transition: all 0.2s ease;
           font-size: 14px;
           border-bottom: 1px solid rgba(255,255,255,0.1);
         }
         .dropdown-content a[aria-disabled="true"] {
           opacity: 0.5;
           pointer-events: none;
           cursor: not-allowed;
         }
         .dropdown-content a:last-child {
           border-bottom: none;
         }
         .dropdown-content a:hover {
           background-color: var(--accent-1);
           color: var(--surface-0);
           transform: translateX(2px);
         }
         .dropdown-content a.selected {
           background-color: var(--accent-1);
           color: var(--surface-0);
           font-weight: bold;
         }
         .dropdown-content a .option-icon {
           width: 20px;
           margin-right: 8px;
           text-align: center;
         }
       </style>
      <div class="header">
        <div class="left">Results Panel</div>
        <div class="center">
          <div id="analysisName" class="analysis-title">Interactive Histogram</div>
          <div class="variable-line" id="headerVariableLine"><span id="variableName">Variable Name</span> <span class="n">(n=<span id="sampleSize">0</span>)</span></div>
        </div>
        <div class="dropdown">
          <button class="dropbtn">Advanced Analysis Options ▼</button>
          <div class="dropdown-content">
            <a href="javascript:void(0)" data-case="Case00" data-name="Interactive Histogram"><span class="option-icon">📈</span>Interactive Histogram</a>
            <a href="javascript:void(0)" data-case="Case10" data-name="Box Plot Analysis"><span class="option-icon">📦</span>Box Plot Analysis</a>
            <a href="javascript:void(0)" data-case="Case20" data-name="Cumulative Distribution"><span class="option-icon">📈</span>Cumulative Distribution</a>
            <a href="javascript:void(0)" data-case="Case30" data-name="Percentiles"><span class="option-icon">📊</span>Percentiles</a>
            <a href="javascript:void(0)" data-case="Case40" data-name="Outliers Detection"><span class="option-icon">🎯</span>Outliers Detection</a>
            <a href="javascript:void(0)">--------------------------------------------------</a>
            <a href="javascript:void(0)" data-case="Case50" data-name="Tests of Normality"><span class="option-icon">📊</span>Tests of Normality</a>
            <a href="javascript:void(0)" data-case="Case60" data-name="PP-QQ Plots"><span class="option-icon">📈</span>PP-QQ Plots</a>
            <a href="javascript:void(0)" data-case="Case70" data-name="Hypothesis Testing"><span class="option-icon">📊</span>Hypothesis Testing</a>
            <a href="javascript:void(0)" data-case="Case90" data-name="Confidence Intervals"><span class="option-icon">📊</span>Confidence Intervals</a>
            <a href="javascript:void(0)" data-case="Case100" data-name="Kernel Density"><span class="option-icon">📈</span>Kernel Density</a>
          </div>
        </div>
      </div>
    `;
//////////////////////////////////////////////////
// Function to select analysis type
window.selectAnalysis = function(caseCode, analysisName, element) {
    console.log('Selecting analysis:', analysisName, caseCode);

    // Update active state for all options (if element is provided from old dropdown)
    if (element) {
        document.querySelectorAll('.analysis-option').forEach(option => {
            option.classList.remove('active');
        });
        element.classList.add('active');
    }

    // Update the center title with just the analysis name (no variable name)
    const selectedTitleElement = document.getElementById('selectedAnalysisTitle');
    if (selectedTitleElement) {
        selectedTitleElement.textContent = analysisName;
    }

    // Update the web component title if it exists
    if (typeof window.updateHeaderTitle === 'function') {
        window.updateHeaderTitle(analysisName);
    }

    // ✅ Show navigation loader before switching
    if (typeof window.showNavigationLoader === 'function') {
        window.showNavigationLoader();
        console.log('🔄 Navigation loader shown');
    }
    
    // Set navigation loading flag for target page
    try {
        localStorage.setItem('statsticoNavigationLoading', 'true');
    } catch(e) {}
    
    // Before switching, persist header state so target page can read it
    try {
        var pendingVar = (window.currentVariableName || '');
        var pendingN = (currentData && currentData.length) ? currentData.length : 0;
        var payload = { variableName: pendingVar, sampleSize: pendingN, timestamp: Date.now() };
        localStorage.setItem('statsticoPendingHeader', JSON.stringify(payload));
        // Optionally tag intended analysis
        try { localStorage.setItem('statsticoPendingAnalysis', String(caseCode||'')); } catch(_) {}
    } catch(e) {}

    // Close dropdown (old dropdown if it exists)
    const dropdown = document.getElementById('analysisDropdown');
    const btn = document.querySelector('.dropdown-btn');
    if (dropdown && btn) {
        dropdown.classList.remove('show');
        btn.classList.remove('open');
    }

    // Send message to VB6 using VB6 injected function
    console.log('📤 About to send to VB6:', caseCode);
    if (typeof window.sendMessageToVB6 === 'function') {
        console.log('✅ sendMessageToVB6 function exists, calling it now...');
        window.sendMessageToVB6(caseCode, caseCode);
        console.log('✅ sendMessageToVB6 called with:', caseCode, caseCode);
    } else {
        console.warn('⚠️ sendMessageToVB6 not available');
    }
};

// Function to update variable name display
window.updateVariableName = function(variableName) {
    // Store the variable name globally
    window.currentVariableName = variableName || 'Variable';

    console.log('Updating variable name to:', window.currentVariableName);

    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) {
        pageTitle.textContent = `${window.currentVariableName} - Analysis`;
    }

    // Update center title with current analysis (no variable name)
    const selectedTitleElement = document.getElementById('selectedAnalysisTitle');
    const activeOption = document.querySelector('.analysis-option.active');

    if (selectedTitleElement && activeOption) {
        const analysisName = activeOption.getAttribute('data-base-name') || activeOption.querySelector('.option-text').textContent;
        selectedTitleElement.textContent = analysisName;
    } else if (selectedTitleElement) {
        selectedTitleElement.textContent = 'Interactive Histogram';
    }

    // Update the variable name display under the title (without sample size initially)
    const variableNameDisplay = document.getElementById('variableNameDisplay');
    if (variableNameDisplay) {
        variableNameDisplay.textContent = window.currentVariableName;
        console.log('✅ Variable name display updated to:', window.currentVariableName);
    }

    // Update panel titles (remove variable names for cleaner look)
    const statisticsTitle = document.getElementById('statistics-title');
    if (statisticsTitle) {
        statisticsTitle.textContent = `Descriptive Statistics`;
    }

    const histogramTitle = document.getElementById('histogram-title');
    if (histogramTitle) {
        histogramTitle.textContent = `Interactive Histogram`;
    }
};

// Function to update title with sample size
window.updateTitleWithSampleSize = function(sampleSize) {
    const variableNameDisplay = document.getElementById('variableNameDisplay');
    if (variableNameDisplay && window.currentVariableName) {
        variableNameDisplay.textContent = `${window.currentVariableName} (n=${sampleSize})`;
        console.log('✅ Updated title with sample size:', `${window.currentVariableName} (n=${sampleSize})`);
    }
};


// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('analysisDropdown');
    const dropdownContainer = document.querySelector('.dropdown-container');

    if (dropdown && dropdownContainer && !dropdownContainer.contains(event.target)) {
        dropdown.classList.remove('show');
        document.querySelector('.dropdown-btn').classList.remove('open');
    }
});



//////////////////////////////////////////////////
    const analysisNameEl = shadow.getElementById("analysisName");
    const variableNameEl = shadow.getElementById("variableName");
    const sampleSizeEl = shadow.getElementById("sampleSize");
    const dropdown = shadow.querySelector(".dropdown-content");
    const btn = shadow.querySelector(".dropbtn");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isShowing = dropdown.classList.contains("show");
      dropdown.classList.toggle("show");
      const nowShowing = dropdown.classList.contains("show");
      console.log('🔘 Dropdown button clicked, dropdown is now:', nowShowing ? 'OPEN' : 'CLOSED');
      console.log('📊 Number of menu items:', shadow.querySelectorAll("a").length);
      

    });



    shadow.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (link.getAttribute('aria-disabled') === 'true') { return; }

        console.log('🖱️ Dropdown link clicked:', link.textContent.trim());

        const caseId = link.dataset.case;
        const name = link.dataset.name;

        console.log('📋 Data attributes:', { caseId, name });

        // Skip if this is a separator (no data attributes)
        if (!caseId || !name) {
          console.log('⚠️ Skipping separator or invalid link');
          return;
        }

        analysisNameEl.textContent = name;
        dropdown.querySelectorAll("a").forEach(a => a.classList.remove("selected"));
        link.classList.add("selected");
        dropdown.classList.remove("show");
        


        console.log('🔍 Checking for selectAnalysis function...');
        console.log('Type of window.selectAnalysis:', typeof window.selectAnalysis);

        // Call the existing selectAnalysis function (must access via window from shadow DOM)
        if (typeof window.selectAnalysis === 'function') {
          console.log('✅ Calling selectAnalysis with:', caseId, name);
          window.selectAnalysis(caseId, name, null);
        } else {
          console.error('❌ selectAnalysis function not found on window object');
          console.log('Available window functions:', Object.keys(window).filter(k => typeof window[k] === 'function'));
        }
      });
    });

    window.updateHeaderAnalysisName = (newTitle) => {
      analysisNameEl.textContent = newTitle;
      // ✅ Hide analysis name when empty
      analysisNameEl.style.display = newTitle ? 'block' : 'none';
      dropdown.querySelectorAll("a").forEach(link => {
        link.classList.remove("selected");
        if (link.dataset.name === newTitle) {
          link.classList.add("selected");
        }
      });
    };
    window.updateHeaderTitle = window.updateHeaderAnalysisName;
    window.updateHeaderVariableName = (newVariableName) => {
      variableNameEl.textContent = newVariableName || 'Variable Name';
      try{ var line = shadow.getElementById('headerVariableLine'); if(line) line.style.display = newVariableName ? 'block' : 'none'; }catch(e){}
    };
    window.updateHeaderSampleSize = (n) => {
      const value = (typeof n === 'number' ? n : Number(n) || 0);
      try { sampleSizeEl.textContent = value.toLocaleString(); } catch(_) { sampleSizeEl.textContent = String(value); }
      const nWrapper = sampleSizeEl && sampleSizeEl.parentElement;
      if (nWrapper && nWrapper.classList && nWrapper.classList.contains('n')) {
        nWrapper.style.display = value > 0 ? 'inline' : 'none';
      }
      try{ var line = shadow.getElementById('headerVariableLine'); if(line) line.style.display = value > 0 ? 'block' : 'none'; }catch(e){}
    };
    window.updateHeaderCenter = ({ analysisName, variableName, sampleSize } = {}) => {
      if (analysisName) window.updateHeaderAnalysisName(analysisName);
      if (variableName !== undefined) window.updateHeaderVariableName(variableName);
      if (sampleSize !== undefined) window.updateHeaderSampleSize(sampleSize);
    };
    // Consume any pending state buffered before the component was ready
    try {
      if (window.__pendingHeaderState) {
        const s = window.__pendingHeaderState;
        window.updateHeaderCenter({ analysisName: s.analysisName, variableName: s.variableName, sampleSize: s.sampleSize });
        // Do not delete to allow other pages to read; just mark consumed for this page if needed
      }
    } catch(e) {}
  }
}
customElements.define("dropdown-menu", DropdownMenu);

  // Global helpers to enable/disable the analysis dropdown menu
  window.disableAnalysisMenu = window.disableAnalysisMenu || function(){
    try{
      var el = document.querySelector('dropdown-menu');
      if(!el || !el.shadowRoot) return;
      var dd = el.shadowRoot.querySelector('.dropdown-content');
      if(!dd) return;
      dd.querySelectorAll('a').forEach(function(a){
        // keep separators clickable state as is (those without data-case/name)
        if (a.dataset && a.dataset.case && a.dataset.name) {
          a.setAttribute('aria-disabled','true');
        }
      });
    }catch(e){}
  };
  window.enableAnalysisMenu = window.enableAnalysisMenu || function(){
    try{
      var el = document.querySelector('dropdown-menu');
      if(!el || !el.shadowRoot) return;
      var dd = el.shadowRoot.querySelector('.dropdown-content');
      if(!dd) return;
      dd.querySelectorAll('a').forEach(function(a){ a.removeAttribute('aria-disabled'); });
    }catch(e){}
  };
  // Menu items are enabled by default; they get disabled when histogram is loading



