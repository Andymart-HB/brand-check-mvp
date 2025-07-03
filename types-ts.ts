export interface BrandBook {
  name: string;
  size: string;
  colors: string[];
  fonts: string[];
  logoRequirements: {
    minWidth: number;
    minHeight: number;
  };
}

export interface BrandBooks {
  [key: string]: BrandBook;
}

export enum Severity {
  Minor = 'minor',
  Major = 'major',
  Critical = 'critical'
}

export enum ProcessingMode {
  Standard = 'standard',
  LargeFile = 'large-file'
}

export interface AppState {
  selectedClient: string | null;
  currentFile: File | null;
  processingMode: ProcessingMode | null;
  isProcessing: boolean;
  processingStartTime: number | null;
  analysisResults: AnalysisResults | null;
  error: Error | null;
}

export interface Issue {
  title: string;
  description: string;
  severity: Severity;
  location: string;
  category: string;
}

export interface Recommendation {
  title: string;
  description: string;
  impact: string;
}

export interface ColorCompliance {
  score: number;
  compliantColors: number;
  nonCompliantColors: string[];
  totalColors: number;
}

export interface FontCompliance {
  score: number;
  compliantFonts: number;
  nonCompliantFonts: string[];
  totalFonts: number;
}

export interface AnalysisElements {
  pageCount: number;
  wordCount: number;
  imageCount: number;
  colors: string[];
  fonts: FontData[];
  chunks?: number;
}

export interface FontData {
  name: string;
  usage?: number;
}

export interface CategoryScores {
  brand: number;
  technical: number;
  structure: number;
  accessibility: number;
}

export interface ComplianceData {
  color: ColorCompliance;
  font: FontCompliance;
  logo: number;
}

export interface AnalysisResults {
  overallScore: number;
  categoryScores: CategoryScores;
  elements: AnalysisElements;
  issues: Issue[];
  recommendations: Recommendation[];
  compliance: ComplianceData;
}

export interface ProgressUpdate {
  progress: number;
  message: string;
  details?: string;
}

export interface WorkerMessage {
  type: 'analyze' | 'progress' | 'result' | 'error';
  data?: any;
}

export interface FileValidationResult {
  isValid: boolean;
  mimeType: string;
  magicBytes: boolean;
  error?: string;
}

export interface DocumentAnalyzer {
  analyze(file: File, brandBook: BrandBook): Promise<AnalysisResults>;
}