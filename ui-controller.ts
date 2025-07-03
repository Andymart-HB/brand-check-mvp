import { StateManager } from './StateManager';
import { FileProcessor } from './FileProcessor';
import { BrandDataService } from './BrandDataService';
import { sanitize } from './Sanitizer';
import type { AppState, AnalysisResults, Issue, Recommendation, ProcessingMode } from '../types';

export class UIController {
  private stateManager: StateManager<AppState>;
  private fileProcessor: FileProcessor;
  private brandDataService: BrandDataService;
  private elements: Map<string, HTMLElement> = new Map();

  constructor(
    stateManager: StateManager<AppState>, 
    fileProcessor: FileProcessor,
    brandDataService: BrandDataService
  ) {
    this.stateManager = stateManager;
    this.fileProcessor = fileProcessor;
    this.brandDataService = brandDataService;
  }

  init(): void {
    this.cacheElements();
    this.bindEventListeners();
    this.setupDropZone();
    this.subscribeToState();
    this.subscribeToProgress();
  }

  private cacheElements(): void {
    const selectors = {
      clientSelect: '#clientSelect',
      clientInfo: '#clientInfo',
      brandBookSize: '#brandBookSize',
      dropZone: '#dropZone',
      fileInput: '#fileInput',
      browseBtn: '.browse-btn',
      processingMode: '#processingMode',
      modeTitle: '#modeTitle',
      modeDetails: '#modeDetails',
      timeEstimate: '#timeEstimate',
      progressSection: '#progressSection',
      progressLabel: '#progressLabel',
      progressPercent: '#progressPercent',
      progressFill: '#progressFill',
      currentStep: '#currentStep',
      processedSize: '#processedSize',
      timeRemaining: '#timeRemaining',
      memoryUsage: '#memoryUsage',
      cancelBtn: '#cancelBtn',
      errorSection: '#errorSection',
      errorMessage: '#errorMessage',
      retryBtn: '#retryBtn',
      resultsSection: '#resultsSection',
      overallScore: '#overallScore',
      resultFileSize: '#resultFileSize',
      resultProcessingMode: '#resultProcessingMode',
      resultAnalysisTime: '#resultAnalysisTime'
    };

    Object.entries(selectors).forEach(([key, selector]) => {
      const element = document.querySelector(selector);
      if (element) {
        this.elements.set(key, element as HTMLElement);
      }
    });
  }

  private bindEventListeners(): void {
    // Client selection
    this.elements.get('clientSelect')?.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.handleClientSelection(target.value);
    });

    // File input
    this.elements.get('fileInput')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files?.[0]) {
        this.handleFileSelection(target.files[0]);
      }
    });

    // Browse button
    this.elements.get('browseBtn')?.addEventListener('click', () => {
      this.elements.get('fileInput')?.click();
    });

    // Cancel button
    this.elements.get('cancelBtn')?.addEventListener('click', () => {
      this.fileProcessor.cancelProcessing();
    });

    // Retry button
    this.elements.get('retryBtn')?.addEventListener('click', () => {
      this.resetApplication();
    });

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;
        if (tabName) this.switchTab(tabName);
      });
    });

    // Export buttons
    document.getElementById('exportJsonBtn')?.addEventListener('click', () => {
      this.exportResults('json');
    });

    document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
      this.exportResults('pdf');
    });

    // Keyboard navigation for dropzone
    this.elements.get('dropZone')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.elements.get('fileInput')?.click();
      }
    });
  }

  private setupDropZone(): void {
    const dropZone = this.elements.get('dropZone');
    if (!dropZone) return;

    dropZone.setAttribute('role', 'button');
    dropZone.setAttribute('tabindex', '0');
    dropZone.setAttribute('aria-label', 'Click or drag files here to upload');

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
      dropZone.setAttribute('aria-dropeffect', 'copy');
    });

    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      dropZone.removeAttribute('aria-dropeffect');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      dropZone.removeAttribute('aria-dropeffect');
      
      const files = e.dataTransfer?.files;
      if (files?.[0]) {
        this.handleFileSelection(files[0]);
      }
    });

    dropZone.addEventListener('click', () => {
      this.elements.get('fileInput')?.click();
    });
  }

  private subscribeToState(): void {
    this.stateManager.subscribe(state => {
      if (state.error) {
        this.showError(state.error.message);
      }
    });
  }

  private subscribeToProgress(): void {
    document.addEventListener('processing-progress', ((e: CustomEvent) => {
      const { progress, message, details } = e.detail;
      this.updateProgress(progress, message, details);
    }) as EventListener);
  }

  private async handleClientSelection(clientId: string): Promise<void> {
    if (!clientId) {
      this.elements.get('clientInfo')?.classList.add('hidden');
      this.stateManager.setState({ selectedClient: null });
      return;
    }

    const brandBook = await this.brandDataService.getBrandBook(clientId);
    if (brandBook) {
      this.stateManager.setState({ selectedClient: clientId });
      
      const brandBookSize = this.elements.get('brandBookSize');
      if (brandBookSize) {
        brandBookSize.textContent = brandBook.size;
      }
      
      this.elements.get('clientInfo')?.classList.remove('hidden');
      this.elements.get('clientInfo')?.classList.add('fade-in');
    }
  }

  private async handleFileSelection(file: File): Promise<void> {
    const state = this.stateManager.getState();
    
    if (!state.selectedClient) {
      this.showError('Please select a client brand guideline before uploading documents.');
      return;
    }

    this.stateManager.setState({ 
      currentFile: file,
      error: null 
    });

    try {
      this.showProcessingMode(file);
      this.showProgress();
      this.hideResults();
      this.hideError();

      const brandBook = await this.brandDataService.getBrandBook(state.selectedClient);
      const results = await this.fileProcessor.processFile(file, brandBook);
      
      this.displayResults(results);
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Processing failed');
    }
  }

  private showProcessingMode(file: File): void {
    const mode = file.size > 100 * 1024 * 1024 ? ProcessingMode.LargeFile : ProcessingMode.Standard;
    const modeSection = this.elements.get('processingMode');
    const modeTitle = this.elements.get('modeTitle');
    const modeDetails = this.elements.get('modeDetails');
    const timeEstimate = this.elements.get('timeEstimate');

    if (modeTitle) {
      modeTitle.textContent = mode === ProcessingMode.LargeFile ? 
        'Large File Processing Mode' : 'Standard Processing Mode';
    }

    if (modeDetails) {
      if (mode === ProcessingMode.LargeFile) {
        modeDetails.innerHTML = sanitize(`
          <strong>Enhanced Processing:</strong> File exceeds 100MB threshold. Using chunked processing with progress tracking.
          <br><strong>File Size:</strong> ${this.formatFileSize(file.size)}
          <br><strong>Chunk Size:</strong> 10MB chunks for optimal performance
          <br><strong>Memory Management:</strong> Automatic cleanup and optimization enabled
        `);
      } else {
        modeDetails.innerHTML = sanitize(`
          <strong>Standard Processing:</strong> File will be processed quickly in standard mode.
          <br><strong>File Size:</strong> ${this.formatFileSize(file.size)}
          <br><strong>Expected Duration:</strong> 2-5 seconds
        `);
      }
    }

    if (timeEstimate) {
      timeEstimate.textContent = mode === ProcessingMode.LargeFile ? 
        `Estimated processing time: ${this.estimateProcessingTime(file.size)}` :
        'Processing will complete shortly';
    }

    modeSection?.classList.remove('hidden');
    modeSection?.classList.add('fade-in');
  }

  private updateProgress(progress: number, message: string, details?: string): void {
    const progressPercent = this.elements.get('progressPercent');
    const progressFill = this.elements.get('progressFill');
    const progressLabel = this.elements.get('progressLabel');
    const currentStep = this.elements.get('currentStep');

    if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;
    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressLabel) progressLabel.textContent = message;
    if (currentStep && details) currentStep.textContent = details;

    // Update ARIA attributes
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-valuenow', String(Math.round(progress)));
      progressBar.setAttribute('aria-valuemin', '0');
      progressBar.setAttribute('aria-valuemax', '100');
      progressBar.setAttribute('aria-label', message);
    }
  }

  private displayResults(results: AnalysisResults): void {
    const state = this.stateManager.getState();
    const processingTime = Date.now() - (state.processingStartTime || 0);

    // Hide progress, show results
    this.elements.get('progressSection')?.classList.add('hidden');
    this.elements.get('resultsSection')?.classList.remove('hidden');
    this.elements.get('resultsSection')?.classList.add('fade-in');

    // Update score
    this.animateNumber(this.elements.get('overallScore'), 0, results.overallScore, 1000);

    // Update context
    if (state.currentFile) {
      const resultFileSize = this.elements.get('resultFileSize');
      if (resultFileSize) resultFileSize.textContent = this.formatFileSize(state.currentFile.size);
    }

    const resultMode = this.elements.get('resultProcessingMode');
    if (resultMode) {
      resultMode.textContent = state.processingMode === ProcessingMode.LargeFile ? 
        'Large File Mode' : 'Standard Mode';
    }

    const resultTime = this.elements.get('resultAnalysisTime');
    if (resultTime) resultTime.textContent = this.formatTime(processingTime);

    // Update categories
    this.updateCategoryScores(results.categoryScores);
    
    // Update overview stats
    this.updateOverviewStats(results.elements);
    
    // Display issues
    this.displayIssues(results.issues);
    
    // Display recommendations
    this.displayRecommendations(results.recommendations);
  }

  private updateCategoryScores(scores: any): void {
    const categories = ['brand', 'technical', 'structure', 'accessibility'];
    
    categories.forEach((category, index) => {
      const score = scores[category];
      const scoreEl = document.getElementById(`${category}Score`);
      const fillEl = document.getElementById(`${category}Fill`);
      
      if (scoreEl && fillEl) {
        setTimeout(() => {
          this.animateNumber(scoreEl, 0, score, 800);
          fillEl.style.width = `${score}%`;
        }, index * 200);
      }
    });
  }

  private updateOverviewStats(elements: any): void {
    const stats = {
      pageCount: elements.pageCount || 0,
      wordCount: this.formatNumber(elements.wordCount || 0),
      imageCount: elements.imageCount || 0,
      colorCount: elements.colors?.length || 0
    };

    Object.entries(stats).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (el) el.textContent = String(value);
    });

    // Display color swatches
    this.displayColorPalette(elements.colors || []);
  }

  private displayColorPalette(colors: string[]): void {
    const container = document.getElementById('colorSwatches');
    if (!container) return;

    container.innerHTML = '';
    colors.forEach((color, index) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', `Color: ${color}`);
      swatch.style.animationDelay = `${index * 100}ms`;
      container.appendChild(swatch);
    });
  }

  private displayIssues(issues: Issue[]): void {
    const container = document.getElementById('issuesList');
    if (!container) return;

    if (issues.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--color-secondary); padding: var(--spacing-lg);">✅ No issues detected. Excellent work!</p>';
      return;
    }

    container.innerHTML = '';
    issues.forEach((issue, index) => {
      const issueEl = document.createElement('div');
      issueEl.className = 'issue-item';
      issueEl.setAttribute('data-severity', issue.severity);
      issueEl.style.animationDelay = `${index * 150}ms`;
      
      issueEl.innerHTML = sanitize(`
        <div class="issue-header">
          <span class="issue-title">${issue.title}</span>
          <span class="issue-severity" data-severity="${issue.severity}">${issue.severity.toUpperCase()}</span>
        </div>
        <div class="issue-description">${issue.description}</div>
        <div class="issue-location">Location: ${issue.location}</div>
      `);
      
      container.appendChild(issueEl);
    });
  }

  private displayRecommendations(recommendations: Recommendation[]): void {
    const container = document.getElementById('recommendationsList');
    if (!container) return;

    container.innerHTML = '';
    recommendations.forEach((rec, index) => {
      const recEl = document.createElement('div');
      recEl.style.cssText = 'padding: var(--spacing-lg); background: #f0fff4; border-radius: var(--radius-md); border-left: 4px solid var(--color-secondary); margin-bottom: var(--spacing-md);';
      recEl.style.animationDelay = `${index * 200}ms`;
      
      recEl.innerHTML = sanitize(`
        <div style="font-weight: 600; color: var(--color-secondary); margin-bottom: var(--spacing-sm);">${rec.title}</div>
        <div style="color: var(--color-text); margin-bottom: var(--spacing-sm);">${rec.description}</div>
        <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); font-style: italic;">Impact: ${rec.impact}</div>
      `);
      
      container.appendChild(recEl);
    });
  }

  private switchTab(tabName: string): void {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.setAttribute('aria-selected', 'false');
    });
    
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    activeTab?.setAttribute('aria-selected', 'true');

    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.setAttribute('aria-hidden', 'true');
    });
    
    const activePanel = document.getElementById(`${tabName}Tab`);
    activePanel?.setAttribute('aria-hidden', 'false');
  }

  private showProgress(): void {
    this.elements.get('progressSection')?.classList.remove('hidden');
    this.elements.get('progressSection')?.classList.add('fade-in');
  }

  private hideResults(): void {
    this.elements.get('resultsSection')?.classList.add('hidden');
  }

  private showError(message: string): void {
    const errorMessage = this.elements.get('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    
    this.elements.get('errorSection')?.classList.remove('hidden');
    this.elements.get('errorSection')?.setAttribute('role', 'alert');
    
    // Mark dropzone as invalid
    this.elements.get('dropZone')?.setAttribute('aria-invalid', 'true');
  }

  private hideError(): void {
    this.elements.get('errorSection')?.classList.add('hidden');
    this.elements.get('dropZone')?.setAttribute('aria-invalid', 'false');
  }

  private resetApplication(): void {
    this.stateManager.setState({
      selectedClient: null,
      currentFile: null,
      processingMode: null,
      isProcessing: false,
      processingStartTime: null,
      analysisResults: null,
      error: null
    });

    // Reset UI
    const clientSelect = this.elements.get('clientSelect') as HTMLSelectElement;
    if (clientSelect) clientSelect.value = '';
    
    this.elements.get('clientInfo')?.classList.add('hidden');
    this.elements.get('processingMode')?.classList.add('hidden');
    this.elements.get('progressSection')?.classList.add('hidden');
    this.elements.get('resultsSection')?.classList.add('hidden');
    this.hideError();
  }

  private async exportResults(format: 'json' | 'pdf'): Promise<void> {
    const state = this.stateManager.getState();
    if (!state.analysisResults) return;

    if (format === 'json') {
      const data = JSON.stringify(state.analysisResults, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `brand-compliance-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PDF export would require a library like jsPDF
      alert('PDF export coming soon. Use JSON export for now.');
    }
  }

  private animateNumber(element: HTMLElement | null, start: number, end: number, duration: number): void {
    if (!element) return;
    
    const startTime = performance.now();
    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(start + (end - start) * progress);
      element.textContent = String(current);
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private estimateProcessingTime(fileSize: number): string {
    const mbPerSecond = 10; // Estimate
    const seconds = Math.ceil(fileSize / (mbPerSecond * 1024 * 1024));
    return this.formatTime(seconds * 1000);
  }
}