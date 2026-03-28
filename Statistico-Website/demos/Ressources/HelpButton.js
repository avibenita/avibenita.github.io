/**
 * HelpButton.js - Reusable Help Button Component
 * 
 * Usage:
 * 1. Include this script in your HTML: <script src="./Ressources/HelpButton.js"></script>
 * 2. Add the help button HTML with data-help-file attribute
 * 3. The component will automatically initialize
 * 
 * Example:
 * <help-button data-help-file="./HelpFiles/help-boxplot.html" data-title="Box Plot Help"></help-button>
 */

class HelpButton extends HTMLElement {
  constructor() {
    super();
    this.helpFile = this.getAttribute('data-help-file') || './HelpFiles/help-default.html';
    this.helpTitle = this.getAttribute('data-title') || 'Help & Documentation';
  }

  connectedCallback() {
    this.helpFile = this.getAttribute('data-help-file') || './HelpFiles/help-default.html';
    this.helpEmbedded = this.getAttribute('data-help-embedded') || null;
    this.helpTitle = this.getAttribute('data-title') || 'Help & Documentation';
    
    console.log('✅ HelpButton component initialized');
    console.log('   → Help file:', this.helpFile);
    console.log('   → Embedded template:', this.helpEmbedded);
    console.log('   → Title:', this.helpTitle);
    
    this.render();
    this.attachEventListeners();
  }

  render() {
    // Create button
    const button = document.createElement('button');
    button.id = 'btnHelp';
    button.className = 'help-button';
    button.title = this.helpTitle;
    button.innerHTML = '<i class="fa-solid fa-question"></i>';
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'helpOverlay';
    overlay.className = 'help-overlay';
    overlay.innerHTML = `
      <div class="help-modal">
        <div class="help-header">
          <div class="help-header-title">
            <i class="fa-solid fa-book"></i>
            <h2>${this.helpTitle}</h2>
          </div>
          <button id="closeHelp" class="help-close-btn">
            <i class="fas fa-times"></i> Close
          </button>
        </div>
        <div id="helpContent" class="help-content">
          <div class="help-loading">
            <i class="fas fa-spinner fa-spin"></i> Loading help...
          </div>
        </div>
      </div>
    `;

    // Append to body
    document.body.appendChild(button);
    document.body.appendChild(overlay);

    // Add styles if not already present
    if (!document.getElementById('help-button-styles')) {
      this.injectStyles();
    }
  }

  injectStyles() {
    const style = document.createElement('style');
    style.id = 'help-button-styles';
    style.textContent = `
      /* Help Button Styles */
      .help-button {
        position: fixed;
        right: 16px;
        bottom: 1px;
        z-index: 2000;
        background: transparent;
        border: 1px solid var(--accent-1, rgb(255,165,120));
        color: var(--accent-1, rgb(255,165,120));
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .help-button:hover {
        background: var(--accent-1, rgb(255,165,120)) !important;
        color: white !important;
        transform: scale(1.1);
        box-shadow: 0 4px 20px rgba(255, 165, 120, 0.6);
      }

      .help-button:active {
        transform: scale(1.05);
      }

      /* Help Overlay */
      .help-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        backdrop-filter: blur(3px);
        animation: helpFadeIn 0.3s ease;
      }

      .help-overlay.show {
        display: flex !important;
        align-items: center;
        justify-content: center;
      }

      /* Help Modal */
      .help-modal {
        width: 90%;
        max-width: 1200px;
        height: 85vh;
        background: var(--surface-1, #1a1f2e);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        border: 2px solid var(--accent-1, rgb(255,165,120));
        display: flex;
        flex-direction: column;
        animation: helpSlideUp 0.4s ease;
        overflow: hidden;
      }

      /* Help Header */
      .help-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: var(--surface-2, #242938);
        border-bottom: 2px solid var(--accent-1, rgb(255,165,120));
        flex-shrink: 0;
      }

      .help-header-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .help-header-title i {
        font-size: 24px;
        color: var(--accent-1, rgb(255,165,120));
      }

      .help-header-title h2 {
        margin: 0;
        color: var(--accent-1, rgb(255,165,120));
        font-size: 1.5rem;
      }

      /* Close Button */
      .help-close-btn {
        background: linear-gradient(45deg, #dc3545, #c82333);
        color: white;
        border: 2px solid rgba(255,255,255,0.3);
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.6);
      }

      .help-close-btn:hover {
        background: linear-gradient(45deg, #ff4444, #dd2222);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(220, 53, 69, 0.8);
      }

      .help-close-btn:active {
        transform: translateY(0);
      }

      /* Help Content */
      .help-content {
        width: 100%;
        height: 100%;
        border: none;
        background: var(--surface-0, #0c1624);
        flex: 1;
        overflow-y: auto;
        padding: 0;
      }

      .help-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--accent-1, rgb(255,165,120));
        font-size: 18px;
        gap: 12px;
      }

      .help-loading i {
        font-size: 24px;
      }

      /* Animations */
      @keyframes helpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes helpSlideUp {
        from { 
          opacity: 0; 
          transform: translateY(30px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1); 
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .help-modal {
          width: 95%;
          height: 90vh;
        }

        .help-header {
          padding: 12px 16px;
        }

        .help-header-title h2 {
          font-size: 1.2rem;
        }

        .help-button {
          width: 40px;
          height: 40px;
          font-size: 18px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  attachEventListeners() {
    const btnHelp = document.getElementById('btnHelp');
    const helpOverlay = document.getElementById('helpOverlay');
    const closeHelp = document.getElementById('closeHelp');
    
    // Open help modal and load content
    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        console.log('📖 Opening help documentation:', this.helpTitle);
        helpOverlay.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.loadHelpContent();
      });
    }
    
    // Close help modal
    if (closeHelp) {
      closeHelp.addEventListener('click', () => {
        console.log('✖️ Closing help documentation');
        this.closeHelp();
      });
    }
    
    // Close on overlay click (outside modal)
    if (helpOverlay) {
      helpOverlay.addEventListener('click', (e) => {
        if (e.target === helpOverlay) {
          console.log('✖️ Closing help (clicked outside)');
          this.closeHelp();
        }
      });
    }
    
    // Close on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && helpOverlay.classList.contains('show')) {
        console.log('✖️ Closing help (ESC pressed)');
        this.closeHelp();
      }
    });
  }

  loadHelpContent() {
    const helpContent = document.getElementById('helpContent');
    if (!helpContent) return;

    // First, check for embedded content (bypasses CORS issues)
    if (this.helpEmbedded) {
      const template = document.getElementById(this.helpEmbedded);
      if (template) {
        console.log('✅ Loading embedded help content from template:', this.helpEmbedded);
        const clone = template.content.cloneNode(true);
        helpContent.innerHTML = '';
        helpContent.appendChild(clone);
        return;
      } else {
        console.warn('⚠️ Embedded template not found:', this.helpEmbedded);
      }
    }

    // Request VB6 to load the external file
    console.log('📥 Requesting help content from VB6:', this.helpFile);
    
    // Send message to VB6 to load the help file
    if (window.external && window.external.LoadHelpFile) {
      console.log('🔄 Using VB6 external.LoadHelpFile method');
      try {
        window.external.LoadHelpFile(this.helpFile);
      } catch (e) {
        console.warn('⚠️ external.LoadHelpFile not available:', e);
        this.loadHelpContentViaXHR();
      }
    } else if (typeof sendToVB6 === 'function') {
      console.log('🔄 Using sendToVB6 method');
      sendToVB6('LoadHelpFile', this.helpFile);
    } else {
      // Fallback: Try direct loading (will work on web server)
      console.log('🔄 Fallback to direct XMLHttpRequest');
      this.loadHelpContentViaXHR();
    }
  }

  loadHelpContentViaXHR() {
    const helpContent = document.getElementById('helpContent');
    if (!helpContent) return;

    console.log('📥 Fetching help content via XHR from:', this.helpFile);

    const xhr = new XMLHttpRequest();
    xhr.open('GET', this.helpFile, true);
    
    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 0) { // 0 for local files
        console.log('✅ Help content loaded successfully');
        helpContent.innerHTML = xhr.responseText;
      } else {
        console.error('❌ Failed to load help content. Status:', xhr.status);
        this.showHelpError(`Error ${xhr.status}: ${xhr.statusText}`);
      }
    };
    
    xhr.onerror = () => {
      console.error('❌ Network error while loading help content');
      this.showHelpError('Network error - CORS may be blocking local file access');
    };
    
    xhr.send();
  }

  showHelpError(errorMsg) {
    const helpContent = document.getElementById('helpContent');
    if (!helpContent) return;
    
    helpContent.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff6b6b; margin-bottom: 20px;"></i>
        <h3 style="color: var(--accent-1);">Unable to Load Help Content</h3>
        <p>Could not load the help file: <code>${this.helpFile}</code></p>
        <p style="font-size: 14px; color: var(--text-muted);">${errorMsg}</p>
        <p style="font-size: 13px; color: var(--text-muted); margin-top: 20px;">
          💡 <strong>Solution:</strong> Configure VB6 to handle the LoadHelpFile message.
        </p>
      </div>
    `;
  }

  // Method to receive help content from VB6
  receiveHelpContent(htmlContent) {
    const helpContent = document.getElementById('helpContent');
    if (!helpContent) return;
    
    console.log('✅ Received help content from VB6');
    helpContent.innerHTML = htmlContent;
  }

  closeHelp() {
    const helpOverlay = document.getElementById('helpOverlay');
    if (helpOverlay) {
      helpOverlay.classList.remove('show');
      document.body.style.overflow = '';
    }
  }
}

// Define the custom element
customElements.define('help-button', HelpButton);

// Expose receiveHelpContent as global function for VB6
window.receiveHelpContent = function(htmlContent) {
  console.log('📥 Global receiveHelpContent called');
  const helpButton = document.querySelector('help-button');
  if (helpButton && helpButton.receiveHelpContent) {
    helpButton.receiveHelpContent(htmlContent);
  } else {
    console.error('❌ Help button component not found');
  }
};

// Alternative: Simple function-based approach (if custom elements not preferred)
window.initHelpButton = function(options = {}) {
  const {
    helpFile = './HelpFiles/help-default.html',
    title = 'Help & Documentation',
    buttonPosition = { right: '16px', bottom: '16px' }
  } = options;

  console.log('🔧 Initializing help button with options:', options);

  // Create and inject styles
  if (!document.getElementById('help-button-styles')) {
    const style = document.createElement('style');
    style.id = 'help-button-styles';
    style.textContent = `
      /* Help Button Styles */
      .help-button {
        position: fixed;
        right: ${buttonPosition.right};
        bottom: ${buttonPosition.bottom};
        z-index: 2000;
        background: transparent;
        border: 1px solid var(--accent-1, rgb(255,165,120));
        color: var(--accent-1, rgb(255,165,120));
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      .help-button:hover {
        background: var(--accent-1, rgb(255,165,120)) !important;
        color: white !important;
        transform: scale(1.1);
        box-shadow: 0 4px 20px rgba(255, 165, 120, 0.6);
      }
      .help-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        backdrop-filter: blur(3px);
        animation: helpFadeIn 0.3s ease;
      }
      .help-overlay.show {
        display: flex !important;
        align-items: center;
        justify-content: center;
      }
      .help-modal {
        width: 90%;
        max-width: 1200px;
        height: 85vh;
        background: var(--surface-1, #1a1f2e);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        border: 2px solid var(--accent-1, rgb(255,165,120));
        display: flex;
        flex-direction: column;
        animation: helpSlideUp 0.4s ease;
        overflow: hidden;
      }
      .help-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 24px;
        background: var(--surface-2, #242938);
        border-bottom: 2px solid var(--accent-1, rgb(255,165,120));
        flex-shrink: 0;
      }
      .help-header-title {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .help-header-title i {
        font-size: 24px;
        color: var(--accent-1, rgb(255,165,120));
      }
      .help-header-title h2 {
        margin: 0;
        color: var(--accent-1, rgb(255,165,120));
        font-size: 1.5rem;
      }
      .help-close-btn {
        background: linear-gradient(45deg, #dc3545, #c82333);
        color: white;
        border: 2px solid rgba(255,255,255,0.3);
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.6);
      }
      .help-close-btn:hover {
        background: linear-gradient(45deg, #ff4444, #dd2222);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(220, 53, 69, 0.8);
      }
      .help-iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: white;
        flex: 1;
      }
      @keyframes helpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes helpSlideUp {
        from { opacity: 0; transform: translateY(30px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (max-width: 768px) {
        .help-modal { width: 95%; height: 90vh; }
        .help-button { width: 40px; height: 40px; font-size: 18px; }
      }
    `;
    document.head.appendChild(style);
  }

  // Create button
  const button = document.createElement('button');
  button.id = 'btnHelp';
  button.className = 'help-button';
  button.title = title;
  button.innerHTML = '<i class="fa-solid fa-question"></i>';
  
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'helpOverlay';
  overlay.className = 'help-overlay';
  overlay.innerHTML = `
    <div class="help-modal">
      <div class="help-header">
        <div class="help-header-title">
          <i class="fa-solid fa-book"></i>
          <h2>${title}</h2>
        </div>
        <button id="closeHelp" class="help-close-btn">
          <i class="fas fa-times"></i> Close
        </button>
      </div>
      <iframe id="helpFrame" src="${helpFile}" class="help-iframe"></iframe>
    </div>
  `;

  // Append to body
  document.body.appendChild(button);
  document.body.appendChild(overlay);

  // Attach event listeners
  const closeHelp = () => {
    overlay.classList.remove('show');
    document.body.style.overflow = '';
  };

  button.addEventListener('click', () => {
    console.log('📖 Opening help documentation:', title);
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  });

  document.getElementById('closeHelp').addEventListener('click', closeHelp);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeHelp();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) closeHelp();
  });

  console.log('✅ Help button initialized successfully');
};
function sendToVB6(caseCode, data) {
  try {
    console.log('📤 Sending to VB6 - Case:', caseCode);
    console.log('   Data:', data);

    // Use the VB6-injected sendMessageToVB6 function
    if (typeof window.sendMessageToVB6 === 'function') {
      console.log('✅ Found VB6 injected sendMessageToVB6 function');
      window.sendMessageToVB6(caseCode, data);
    } else {
      console.warn('⚠️ window.sendMessageToVB6 not found - VB6 not ready');
    }
  } catch(e) {
    console.error('❌ Error sending to VB6:', e);
  }
}

console.log('✅ VB6Communication.js loaded - sendToVB6 available');


