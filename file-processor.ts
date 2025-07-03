import { StateManager } from './StateManager';
import { FileValidator } from './FileValidator';
import type { AppState, AnalysisResults, ProcessingMode, WorkerMessage, ProgressUpdate } from '../types';

export class FileProcessor {
  private worker: Worker | null = null;
  private stateManager: StateManager<AppState>;
  private fileValidator: FileValidator;
  private abortController: AbortController | null = null;

  constructor(stateManager: StateManager<AppState>) {
    this.stateManager = stateManager;
    this.fileValidator = new FileValidator();
  }

  async processFile(file: File, brandBook: any): Promise<AnalysisResults> {
    // Validate file
    const validation = await this.fileValidator.validate(file);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid file');
    }

    // Determine processing mode
    const mode = this.determineProcessingMode(file);
    this.stateManager.setState({ 
      processingMode: mode,
      isProcessing: true,
      processingStartTime: Date.now()
    });

    // Initialize worker
    this.worker = new Worker(new URL('../workers/parser.worker.ts', import.meta.url), {
      type: 'module'
    });

    this.abortController = new AbortController();

    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker initialization failed'));
        return;
      }

      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        switch (e.data.type) {
          case 'progress':
            this.handleProgress(e.data.data as ProgressUpdate);
            break;
          case 'result':
            this.cleanup();
            this.stateManager.setState({ 
              isProcessing: false,
              analysisResults: e.data.data
            });
            resolve(e.data.data);
            break;
          case 'error':
            this.cleanup();
            this.stateManager.setState({ 
              isProcessing: false,
              error: new Error(e.data.data)
            });
            reject(new Error(e.data.data));
            break;
        }
      };

      this.worker.onerror = (error) => {
        this.cleanup();
        this.stateManager.setState({ 
          isProcessing: false,
          error: new Error('Worker error: ' + error.message)
        });
        reject(error);
      };

      // Send file to worker for processing
      this.worker.postMessage({
        type: 'analyze',
        data: { file, brandBook, mode }
      });
    });
  }

  private handleProgress(update: ProgressUpdate): void {
    // Notify UI of progress
    const event = new CustomEvent('processing-progress', { 
      detail: update 
    });
    document.dispatchEvent(event);
  }

  private determineProcessingMode(file: File): ProcessingMode {
    const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB
    return file.size > LARGE_FILE_THRESHOLD ? 
      ProcessingMode.LargeFile : 
      ProcessingMode.Standard;
  }

  cancelProcessing(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.cleanup();
    this.stateManager.setState({ 
      isProcessing: false,
      processingMode: null
    });
  }

  private cleanup(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.abortController = null;
  }
}