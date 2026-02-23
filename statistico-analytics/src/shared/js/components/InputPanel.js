/**
 * InputPanel Component
 * Reusable input panel for data selection and configuration
 * @module InputPanel
 */

import { dataHandler } from '../core/data-handler.js';

export class InputPanel {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      showDataOptions: true,
      allowMultipleSelection: true,
      minSelection: 1,
      maxSelection: Infinity,
      ...options
    };
    
    this.selectedVariables = [];
    this.dataOption = 'option1'; // default data option
    this.callbacks = {
      onSelectionChange: null,
      onDataOptionChange: null
    };
  }

  /**
   * Initialize the input panel
   */
  initialize() {
    if (!this.container) {
      console.error('InputPanel: Container not found');
      return;
    }

    this.render();
    this.attachEventListeners();
    this.loadDataFromSession();
  }

  /**
   * Render the input panel HTML
   */
  render() {
    this.container.innerHTML = `
      <div class="input-panel">
        ${this.options.showDataOptions ? this.renderDataOptions() : ''}
        ${this.renderVariableSelection()}
      </div>
    `;
  }

  /**
   * Render data options section
   */
  renderDataOptions() {
    return `
      <div class="input-section">
        <div class="input-section-title">
          <i class="fa fa-database"></i>
          Data Source
        </div>
        <div class="data-options">
          <div class="data-option ${this.dataOption === 'option1' ? 'active' : ''}" data-option="option1">
            <input type="radio" name="dataOption" value="option1" ${this.dataOption === 'option1' ? 'checked' : ''}>
            <div class="data-option-label">
              <div class="data-option-title">Current Selection</div>
              <div class="data-option-description">Use currently selected range in Excel</div>
            </div>
          </div>
          <div class="data-option ${this.dataOption === 'option2' ? 'active' : ''}" data-option="option2">
            <input type="radio" name="dataOption" value="option2" ${this.dataOption === 'option2' ? 'checked' : ''}>
            <div class="data-option-label">
              <div class="data-option-title">Named Range</div>
              <div class="data-option-description">Use a predefined named range</div>
            </div>
          </div>
          <div class="data-option ${this.dataOption === 'option3' ? 'active' : ''}" data-option="option3">
            <input type="radio" name="dataOption" value="option3" ${this.dataOption === 'option3' ? 'checked' : ''}>
            <div class="data-option-label">
              <div class="data-option-title">Worksheet Data</div>
              <div class="data-option-description">Use all data from active worksheet</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render variable selection section
   */
  renderVariableSelection() {
    const variables = dataHandler.variableNames || [];
    
    return `
      <div class="input-section">
        <div class="input-section-title">
          <i class="fa fa-list"></i>
          Variable Selection
          <span style="margin-left: auto; font-size: 12px; font-weight: normal; color: var(--text-muted);">
            ${this.selectedVariables.length} / ${variables.length} selected
          </span>
        </div>
        <div class="variable-list" id="variableList">
          ${variables.length > 0 ? variables.map(varName => this.renderVariableItem(varName)).join('') : 
            '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No variables available</div>'}
        </div>
      </div>
    `;
  }

  /**
   * Render individual variable item
   */
  renderVariableItem(varName) {
    const isSelected = this.selectedVariables.includes(varName);
    const varInfo = dataHandler.getVariableInfo(varName);
    
    return `
      <div class="variable-item ${isSelected ? 'selected' : ''}" data-variable="${varName}">
        <input type="${this.options.allowMultipleSelection ? 'checkbox' : 'radio'}" 
               name="variable" 
               value="${varName}" 
               ${isSelected ? 'checked' : ''}>
        <div class="variable-item-name">${varName}</div>
        ${varInfo ? `<div class="variable-item-type">n=${varInfo.count}</div>` : ''}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Data option change
    this.container.querySelectorAll('.data-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const optionValue = option.dataset.option;
        this.setDataOption(optionValue);
      });
    });

    // Variable selection change
    this.container.addEventListener('change', (e) => {
      if (e.target.name === 'variable') {
        this.handleVariableSelectionChange(e);
      }
    });

    // Variable item click
    this.container.addEventListener('click', (e) => {
      const varItem = e.target.closest('.variable-item');
      if (varItem) {
        const checkbox = varItem.querySelector('input[type="checkbox"], input[type="radio"]');
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  }

  /**
   * Handle variable selection change
   */
  handleVariableSelectionChange(e) {
    const varName = e.target.value;
    
    if (this.options.allowMultipleSelection) {
      if (e.target.checked) {
        if (!this.selectedVariables.includes(varName)) {
          if (this.selectedVariables.length < this.options.maxSelection) {
            this.selectedVariables.push(varName);
          } else {
            e.target.checked = false;
            alert(`Maximum ${this.options.maxSelection} variables allowed`);
            return;
          }
        }
      } else {
        this.selectedVariables = this.selectedVariables.filter(v => v !== varName);
      }
    } else {
      this.selectedVariables = [varName];
    }

    this.updateVariableList();
    
    if (this.callbacks.onSelectionChange) {
      this.callbacks.onSelectionChange(this.selectedVariables);
    }

    // Update dataHandler
    dataHandler.setSelectedVariables(this.selectedVariables);
    
    // Broadcast selection change
    this.broadcastSelectionChange();
  }

  /**
   * Set data option
   */
  setDataOption(option) {
    this.dataOption = option;
    
    // Update UI
    this.container.querySelectorAll('.data-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.option === option);
    });
    
    this.container.querySelectorAll('input[name="dataOption"]').forEach(input => {
      input.checked = input.value === option;
    });

    if (this.callbacks.onDataOptionChange) {
      this.callbacks.onDataOptionChange(option);
    }
  }

  /**
   * Update variable list display
   */
  updateVariableList() {
    const list = this.container.querySelector('#variableList');
    if (list) {
      const variables = dataHandler.variableNames || [];
      list.innerHTML = variables.map(varName => this.renderVariableItem(varName)).join('');
    }

    // Update selection count
    const countSpan = this.container.querySelector('.input-section-title span');
    if (countSpan) {
      const variables = dataHandler.variableNames || [];
      countSpan.textContent = `${this.selectedVariables.length} / ${variables.length} selected`;
    }
  }

  /**
   * Load data from sessionStorage
   */
  loadDataFromSession() {
    dataHandler.loadFromSessionStorage();
    
    // Try to get selection from parent (InputsXL)
    const parentSelection = dataHandler.getSelectedFromInputsXL();
    if (parentSelection && parentSelection.length > 0) {
      this.selectedVariables = parentSelection;
    }
    
    this.updateVariableList();
  }

  /**
   * Broadcast selection change to other windows/frames
   */
  broadcastSelectionChange() {
    // postMessage for cross-iframe communication
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'inputPanel_selectionChanged',
        selectedVariables: this.selectedVariables
      }, '*');
    }

    // localStorage for fallback
    try {
      localStorage.setItem('inputPanel_selectedVariables', JSON.stringify(this.selectedVariables));
      localStorage.setItem('inputPanel_selectionTimestamp', Date.now().toString());
    } catch (e) {
      // Ignore localStorage errors
    }
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
   * Get selected variables
   */
  getSelectedVariables() {
    return this.selectedVariables;
  }

  /**
   * Set selected variables programmatically
   */
  setSelectedVariables(variables) {
    if (Array.isArray(variables)) {
      this.selectedVariables = variables;
      this.updateVariableList();
      
      if (this.callbacks.onSelectionChange) {
        this.callbacks.onSelectionChange(this.selectedVariables);
      }
    }
  }

  /**
   * Get current data option
   */
  getDataOption() {
    return this.dataOption;
  }

  /**
   * Validate current selection
   */
  validate() {
    const errors = [];
    
    if (this.selectedVariables.length < this.options.minSelection) {
      errors.push(`Please select at least ${this.options.minSelection} variable(s)`);
    }
    
    if (this.selectedVariables.length > this.options.maxSelection) {
      errors.push(`Please select at most ${this.options.maxSelection} variable(s)`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Show validation errors
   */
  showErrors(errors) {
    let errorContainer = this.container.querySelector('.input-errors');
    if (!errorContainer) {
      errorContainer = document.createElement('div');
      errorContainer.className = 'input-errors';
      this.container.insertBefore(errorContainer, this.container.firstChild);
    }
    
    errorContainer.innerHTML = errors.map(error => `
      <div class="message error">
        <i class="fa fa-exclamation-circle"></i>
        <span>${error}</span>
      </div>
    `).join('');
  }

  /**
   * Clear errors
   */
  clearErrors() {
    const errorContainer = this.container.querySelector('.input-errors');
    if (errorContainer) {
      errorContainer.remove();
    }
  }
}
