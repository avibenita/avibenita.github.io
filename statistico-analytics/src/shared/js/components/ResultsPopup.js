/**
 * ResultsPopup Component
 * Reusable modal/popup for displaying analysis results
 * @module ResultsPopup
 */

export class ResultsPopup {
  constructor(options = {}) {
    this.options = {
      title: 'Analysis Results',
      showDropdown: true,
      dropdownOptions: [],
      ...options
    };
    
    this.modal = null;
    this.isOpen = false;
    this.callbacks = {
      onClose: null,
      onDropdownSelect: null,
      onTabChange: null
    };
    this.currentTab = null;
  }

  /**
   * Initialize the popup
   */
  initialize() {
    this.createModal();
    this.attachEventListeners();
  }

  /**
   * Create modal HTML
   */
  createModal() {
    // Remove existing modal if any
    const existing = document.getElementById('results-modal');
    if (existing) {
      existing.remove();
    }

    this.modal = document.createElement('div');
    this.modal.id = 'results-modal';
    this.modal.className = 'modal-overlay';
    this.modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <div class="modal-title">
            <i class="fa fa-chart-bar"></i>
            ${this.options.title}
          </div>
          <div class="modal-header-actions">
            ${this.options.showDropdown ? this.renderDropdown() : ''}
            <button class="close-btn" id="closeModal">&times;</button>
          </div>
        </div>
        <div class="modal-body" id="modalBody">
          <div class="results-loading" style="text-align: center; padding: 40px;">
            <i class="fa fa-spinner fa-spin" style="font-size: 32px; color: var(--accent-1);"></i>
            <p style="margin-top: 16px; color: var(--text-muted);">Loading results...</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
  }

  /**
   * Render dropdown menu
   */
  renderDropdown() {
    if (!this.options.dropdownOptions || this.options.dropdownOptions.length === 0) {
      return '';
    }

    return `
      <div class="dropdown">
        <button class="dropbtn" id="dropdownBtn">
          Further Analysis ▼
        </button>
        <div class="dropdown-content" id="dropdownContent">
          ${this.options.dropdownOptions.map(opt => `
            <a href="#" data-analysis="${opt.value}">
              ${opt.icon ? `<i class="${opt.icon}"></i> ` : ''}${opt.label}
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector('#closeModal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Dropdown toggle
    const dropdownBtn = this.modal.querySelector('#dropdownBtn');
    if (dropdownBtn) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDropdown();
      });
    }

    // Dropdown options
    const dropdownLinks = this.modal.querySelectorAll('.dropdown-content a');
    dropdownLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const analysisType = link.dataset.analysis;
        if (this.callbacks.onDropdownSelect) {
          this.callbacks.onDropdownSelect(analysisType);
        }
        this.hideDropdown();
      });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      this.hideDropdown();
    });
  }

  /**
   * Open the popup
   */
  open() {
    this.modal.classList.add('active');
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close the popup
   */
  close() {
    this.modal.classList.remove('active');
    this.isOpen = false;
    document.body.style.overflow = 'auto';
    
    if (this.callbacks.onClose) {
      this.callbacks.onClose();
    }
  }

  /**
   * Toggle dropdown
   */
  toggleDropdown() {
    const dropdown = this.modal.querySelector('#dropdownContent');
    if (dropdown) {
      dropdown.classList.toggle('show');
    }
  }

  /**
   * Hide dropdown
   */
  hideDropdown() {
    const dropdown = this.modal.querySelector('#dropdownContent');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }

  /**
   * Set modal title
   */
  setTitle(title) {
    const titleElement = this.modal.querySelector('.modal-title');
    if (titleElement) {
      titleElement.innerHTML = `<i class="fa fa-chart-bar"></i> ${title}`;
    }
  }

  /**
   * Set content
   */
  setContent(htmlContent) {
    const body = this.modal.querySelector('#modalBody');
    if (body) {
      body.innerHTML = htmlContent;
      this.attachTabListeners();
    }
  }

  /**
   * Set loading state
   */
  setLoading(isLoading, message = 'Loading results...') {
    const body = this.modal.querySelector('#modalBody');
    if (body) {
      if (isLoading) {
        body.innerHTML = `
          <div class="results-loading" style="text-align: center; padding: 40px;">
            <i class="fa fa-spinner fa-spin" style="font-size: 32px; color: var(--accent-1);"></i>
            <p style="margin-top: 16px; color: var(--text-muted);">${message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Add tab content
   */
  addTab(tabId, tabLabel, tabContent) {
    const body = this.modal.querySelector('#modalBody');
    if (!body) return;

    // Check if tabs container exists
    let tabsContainer = body.querySelector('.results-tabs');
    let contentContainer = body.querySelector('.tab-contents');
    
    if (!tabsContainer) {
      body.innerHTML = `
        <div class="results-tabs"></div>
        <div class="tab-contents"></div>
      `;
      tabsContainer = body.querySelector('.results-tabs');
      contentContainer = body.querySelector('.tab-contents');
    }

    // Add tab button
    const tabButton = document.createElement('button');
    tabButton.className = 'tab-button';
    tabButton.dataset.tab = tabId;
    tabButton.textContent = tabLabel;
    tabsContainer.appendChild(tabButton);

    // Add tab content
    const tabContentDiv = document.createElement('div');
    tabContentDiv.className = 'tab-content';
    tabContentDiv.dataset.tab = tabId;
    tabContentDiv.innerHTML = tabContent;
    contentContainer.appendChild(tabContentDiv);

    // Activate first tab by default
    if (!this.currentTab) {
      this.showTab(tabId);
    }

    this.attachTabListeners();
  }

  /**
   * Show specific tab
   */
  showTab(tabId) {
    const body = this.modal.querySelector('#modalBody');
    if (!body) return;

    // Update tab buttons
    body.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // Update tab contents
    body.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.dataset.tab === tabId);
    });

    this.currentTab = tabId;

    if (this.callbacks.onTabChange) {
      this.callbacks.onTabChange(tabId);
    }
  }

  /**
   * Attach tab listeners
   */
  attachTabListeners() {
    const tabButtons = this.modal.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.showTab(btn.dataset.tab);
      });
    });
  }

  /**
   * Add section to current content
   */
  addSection(title, content) {
    const body = this.modal.querySelector('#modalBody');
    if (!body) return;

    const section = document.createElement('div');
    section.className = 'results-section';
    section.innerHTML = `
      <div class="results-section-title">
        <i class="fa fa-chart-line"></i>
        ${title}
      </div>
      <div class="results-section-content">
        ${content}
      </div>
    `;
    body.appendChild(section);
  }

  /**
   * Show error message
   */
  showError(message) {
    this.setContent(`
      <div class="message error">
        <i class="fa fa-exclamation-circle"></i>
        <span>${message}</span>
      </div>
    `);
  }

  /**
   * Register callback
   */
  on(event, callback) {
    if (this.callbacks.hasOwnProperty(event)) {
      this.callbacks[event] = callback;
    }
  }

  /**
   * Destroy the popup
   */
  destroy() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.isOpen = false;
    document.body.style.overflow = 'auto';
  }
}
