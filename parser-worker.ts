import type { 
  WorkerMessage, 
  AnalysisResults, 
  ProcessingMode,
  BrandBook,
  Issue,
  Recommendation,
  ColorCompliance,
  FontCompliance,
  AnalysisElements,
  Severity
} from '../types';

// Web Worker context
declare const self: DedicatedWorkerGlobalScope;

class DocumentParser {
  private readonly CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
  
  async analyze(file: File, brandBook: BrandBook, mode: ProcessingMode): Promise<AnalysisResults> {
    if (mode === ProcessingMode.LargeFile) {
      return this.analyzeLargeFile(file, brandBook);
    }
    return this.analyzeStandardFile(file, brandBook);
  }

  private async analyzeLargeFile(file: File, brandBook: BrandBook): Promise<AnalysisResults> {
    const totalChunks = Math.ceil(file.size / this.CHUNK_SIZE);
    let processedBytes = 0;
    
    const analysisData = {
      chunks: [],
      totalWords: 0,
      extractedColors: [] as string[],
      foundFonts: [] as string[],
      imageCount: 0
    };

    // Process file in chunks using streams
    const stream = file.stream();
    const reader = stream.getReader();
    let chunkIndex = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        processedBytes += value.byteLength;
        
        // Send progress update
        self.postMessage({
          type: 'progress',
          data: {
            progress: (processedBytes / file.size) * 100,
            message: `Processing chunk ${chunkIndex + 1}/${totalChunks}...`,
            details: `${this.formatFileSize(processedBytes)} processed`
          }
        });

        // Simulate chunk analysis
        const chunkData = await this.analyzeChunk(value, chunkIndex);
        analysisData.chunks.push(chunkData);
        analysisData.totalWords += chunkData.words;
        analysisData.extractedColors.push(...chunkData.colors);
        analysisData.foundFonts.push(...chunkData.fonts);
        analysisData.imageCount += chunkData.images;

        chunkIndex++;

        // Memory cleanup every 5 chunks
        if (chunkIndex % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } finally {
      reader.releaseLock();
    }

    return this.finalizeAnalysis(analysisData, brandBook, file);
  }

  private async analyzeStandardFile(file: File, brandBook: BrandBook): Promise<AnalysisResults> {
    self.postMessage({
      type: 'progress',
      data: {
        progress: 20,
        message: 'Reading file...',
        details: 'Loading document content'
      }
    });

    // Simulate file reading
    await this.delay(300);

    self.postMessage({
      type: 'progress',
      data: {
        progress: 60,
        message: 'Analyzing document...',
        details: 'Extracting document elements'
      }
    });

    await this.delay(400);

    const mockData = this.generateMockAnalysisData(file);
    
    self.postMessage({
      type: 'progress',
      data: {
        progress: 90,
        message: 'Finalizing analysis...',
        details: 'Generating report'
      }
    });

    await this.delay(200);

    return this.performComplianceCheck(mockData, brandBook);
  }

  private async analyzeChunk(chunk: Uint8Array, index: number): Promise<any> {
    // Simulate chunk processing
    await this.delay(100);
    
    return {
      index,
      size: chunk.byteLength,
      words: Math.floor((chunk.byteLength / (1024 * 1024)) * 150),
      colors: this.generateRandomColors(Math.floor(Math.random() * 3) + 1),
      fonts: ['Arial', 'Helvetica', 'Times New Roman'].slice(0, Math.floor(Math.random() * 3) + 1),
      images: Math.floor(Math.random() * 3)
    };
  }

  private async finalizeAnalysis(data: any, brandBook: BrandBook, file: File): Promise<AnalysisResults> {
    const uniqueColors = [...new Set(data.extractedColors)];
    const uniqueFonts = [...new Set(data.foundFonts)];

    const elements: AnalysisElements = {
      pageCount: Math.max(1, Math.floor(file.size / (200 * 1024))),
      wordCount: data.totalWords,
      imageCount: data.imageCount,
      colors: uniqueColors.slice(0, 12),
      fonts: uniqueFonts.map(f => ({ name: f, usage: Math.floor(Math.random() * 40) + 10 })),
      chunks: data.chunks.length
    };

    return this.performComplianceCheck(elements, brandBook);
  }

  private performComplianceCheck(elements: AnalysisElements, brandBook: BrandBook): AnalysisResults {
    const colorCompliance = this.analyzeColorCompliance(elements.colors, brandBook.colors);
    const fontCompliance = this.analyzeFontCompliance(elements.fonts, brandBook.fonts);
    const logoCompliance = 75 + Math.floor(Math.random() * 25);

    const brandScore = Math.round((colorCompliance.score + fontCompliance.score + logoCompliance) / 3);
    const technicalScore = 80 + Math.floor(Math.random() * 20);
    const structureScore = 75 + Math.floor(Math.random() * 25);
    const accessibilityScore = 70 + Math.floor(Math.random() * 30);

    const issues = this.generateIssues(colorCompliance, fontCompliance, logoCompliance);
    const recommendations = this.generateRecommendations(issues);

    return {
      overallScore: Math.round((brandScore + technicalScore + structureScore + accessibilityScore) / 4),
      categoryScores: {
        brand: brandScore,
        technical: technicalScore,
        structure: structureScore,
        accessibility: accessibilityScore
      },
      elements,
      issues,
      recommendations,
      compliance: {
        color: colorCompliance,
        font: fontCompliance,
        logo: logoCompliance
      }
    };
  }

  private analyzeColorCompliance(docColors: string[], brandColors: string[]): ColorCompliance {
    let compliantColors = 0;
    const nonCompliantColors: string[] = [];

    docColors.forEach(color => {
      const isCompliant = brandColors.some(brandColor => 
        this.colorSimilarity(color, brandColor) > 0.8
      );
      
      if (isCompliant) {
        compliantColors++;
      } else {
        nonCompliantColors.push(color);
      }
    });

    const score = docColors.length > 0 ? 
      Math.round((compliantColors / docColors.length) * 100) : 100;

    return {
      score,
      compliantColors,
      nonCompliantColors,
      totalColors: docColors.length
    };
  }

  private analyzeFontCompliance(docFonts: any[], brandFonts: string[]): FontCompliance {
    let compliantFonts = 0;
    const nonCompliantFonts: string[] = [];

    docFonts.forEach(font => {
      const fontName = typeof font === 'string' ? font : font.name;
      const isCompliant = brandFonts.includes(fontName);
      
      if (isCompliant) {
        compliantFonts++;
      } else {
        nonCompliantFonts.push(fontName);
      }
    });

    const score = docFonts.length > 0 ? 
      Math.round((compliantFonts / docFonts.length) * 100) : 100;

    return {
      score,
      compliantFonts,
      nonCompliantFonts,
      totalFonts: docFonts.length
    };
  }

  private generateIssues(colorCompliance: ColorCompliance, fontCompliance: FontCompliance, logoCompliance: number): Issue[] {
    const issues: Issue[] = [];

    if (colorCompliance.score < 80) {
      issues.push({
        title: 'Non-brand Colors Detected',
        description: `${colorCompliance.nonCompliantColors.length} colors do not match brand guidelines.`,
        severity: colorCompliance.score < 60 ? Severity.Critical : Severity.Major,
        location: 'Multiple pages',
        category: 'color'
      });
    }

    if (fontCompliance.score < 90) {
      issues.push({
        title: 'Unauthorized Fonts Used',
        description: `Non-brand fonts detected: ${fontCompliance.nonCompliantFonts.join(', ')}.`,
        severity: fontCompliance.score < 70 ? Severity.Major : Severity.Minor,
        location: 'Document text',
        category: 'typography'
      });
    }

    if (logoCompliance < 85) {
      issues.push({
        title: 'Logo Placement Issues',
        description: 'Logos may not meet size or placement requirements.',
        severity: logoCompliance < 70 ? Severity.Major : Severity.Minor,
        location: 'Headers and footers',
        category: 'logo'
      });
    }

    return issues;
  }

  private generateRecommendations(issues: Issue[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    issues.forEach(issue => {
      switch (issue.category) {
        case 'color':
          recommendations.push({
            title: 'Update Color Palette',
            description: 'Replace non-brand colors with approved alternatives from the brand guidelines.',
            impact: 'High - Ensures brand consistency across all materials'
          });
          break;
        case 'typography':
          recommendations.push({
            title: 'Standardize Font Usage',
            description: 'Replace unauthorized fonts with brand-approved typefaces.',
            impact: 'Medium - Improves brand recognition and readability'
          });
          break;
        case 'logo':
          recommendations.push({
            title: 'Optimize Logo Placement',
            description: 'Ensure logos meet minimum size requirements and proper clear space.',
            impact: 'High - Critical for brand visibility and recognition'
          });
          break;
      }
    });

    if (recommendations.length === 0) {
      recommendations.push({
        title: 'Maintain Excellence',
        description: 'Document shows excellent brand compliance. Continue following established guidelines.',
        impact: 'Medium - Sustains high quality standards'
      });
    }

    return recommendations;
  }

  private generateMockAnalysisData(file: File): AnalysisElements {
    const fileSizeMB = file.size / (1024 * 1024);
    return {
      pageCount: Math.max(1, Math.floor(fileSizeMB / 0.5)),
      wordCount: Math.floor(fileSizeMB * 150) + Math.floor(Math.random() * 100),
      imageCount: Math.floor(Math.random() * 15) + 1,
      colors: this.generateRandomColors(8),
      fonts: [
        { name: 'Arial', usage: 45 },
        { name: 'Helvetica Neue', usage: 30 },
        { name: 'Times New Roman', usage: 25 }
      ]
    };
  }

  private generateRandomColors(count: number): string[] {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#f1c40f'];
    return colors.slice(0, count);
  }

  private colorSimilarity(color1: string, color2: string): number {
    // Simple similarity check - in production would use proper color distance algorithm
    return color1.toLowerCase() === color2.toLowerCase() ? 1 : Math.random() * 0.7;
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Worker message handler
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  if (e.data.type === 'analyze') {
    try {
      const { file, brandBook, mode } = e.data.data;
      const parser = new DocumentParser();
      const results = await parser.analyze(file, brandBook, mode);
      
      self.postMessage({
        type: 'result',
        data: results
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        data: error instanceof Error ? error.message : 'Analysis failed'
      });
    }
  }
};