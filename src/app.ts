import './app.css';
import { FileProcessor } from './modules/FileProcessor';
import { UIController } from './modules/UIController';
import { BrandDataService } from './modules/BrandDataService';
import { StateManager } from './modules/StateManager';
import type { AppState } from './types';

class BrandComplianceApp {
  private fileProcessor: FileProcessor;
  private uiController: UIController;
  private brandDataService: BrandDataService;
  private stateManager: StateManager<AppState>;

  constructor() {
    this.stateManager = new StateManager<AppState>({
      selectedClient: null,
      currentFile: null,
      processingMode: null,
      isProcessing: false,
      processingStartTime: null,
      analysisResults: null,
      error: null
    });

    this.brandDataService = new BrandDataService();
    this.fileProcessor = new FileProcessor(this.stateManager);
    this.uiController = new UIController(this.stateManager, this.fileProcessor, this.brandDataService);
  }

  async init(): Promise<void> {
    try {
      await this.brandDataService.init();
      this.uiController.init();
      console.log('✅ Brand Compliance System initialized');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.stateManager.setState({ error: error instanceof Error ? error : new Error('Unknown error') });
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new BrandComplianceApp().init());
} else {
  new BrandComplianceApp().init();
}
