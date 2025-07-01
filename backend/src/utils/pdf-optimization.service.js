const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const moment = require('moment');

class PDFOptimizationService {
  constructor() {
    this.cache = new Map();
    this.cacheSize = 100;
    this.cacheTTL = 3600000; // 1 hour
    this.statsCollector = {
      totalGenerated: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageGenerationTime: 0,
      batchOperations: 0
    };
  }

  /**
   * Generate cache key for PDF
   */
  generateCacheKey(declaration, options = {}) {
    const keyData = {
      id: declaration._id,
      lastModified: declaration.updatedAt || declaration.createdAt,
      options: {
        enhanced: options.enhanced,
        template: options.template,
        digitalSignature: options.digitalSignature,
        includeQR: options.includeQR
      }
    };
    
    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex');
  }

  /**
   * Get PDF from cache if available
   */
  getCachedPDF(cacheKey) {
    const cachedItem = this.cache.get(cacheKey);
    
    if (!cachedItem) {
      this.statsCollector.cacheMisses++;
      return null;
    }
    
    // Check if cache item is expired
    if (Date.now() - cachedItem.timestamp > this.cacheTTL) {
      this.cache.delete(cacheKey);
      this.statsCollector.cacheMisses++;
      return null;
    }
    
    this.statsCollector.cacheHits++;
    return cachedItem.buffer;
  }

  /**
   * Cache PDF buffer
   */
  cachePDF(cacheKey, pdfBuffer) {
    // Clean old entries if cache is full
    if (this.cache.size >= this.cacheSize) {
      this.cleanOldCacheEntries();
    }
    
    this.cache.set(cacheKey, {
      buffer: pdfBuffer,
      timestamp: Date.now(),
      size: pdfBuffer.length
    });
  }

  /**
   * Clean old cache entries
   */
  cleanOldCacheEntries() {
    const entries = Array.from(this.cache.entries());
    const sortedEntries = entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% of entries
    const entriesToRemove = Math.floor(this.cacheSize * 0.2);
    for (let i = 0; i < entriesToRemove; i++) {
      this.cache.delete(sortedEntries[i][0]);
    }
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const totalRequests = this.statsCollector.cacheHits + this.statsCollector.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.statsCollector.cacheHits / totalRequests) * 100 : 0;
    
    const cacheSize = Array.from(this.cache.values())
      .reduce((total, item) => total + item.size, 0);
    
    return {
      cacheSize: this.cache.size,
      maxCacheSize: this.cacheSize,
      totalSizeBytes: cacheSize,
      totalSizeMB: (cacheSize / 1024 / 1024).toFixed(2),
      hitRate: hitRate.toFixed(2),
      totalRequests,
      cacheHits: this.statsCollector.cacheHits,
      cacheMisses: this.statsCollector.cacheMisses,
      totalGenerated: this.statsCollector.totalGenerated,
      batchOperations: this.statsCollector.batchOperations,
      averageGenerationTime: this.statsCollector.averageGenerationTime
    };
  }

  /**
   * Optimize PDF buffer (compression, cleanup)
   */
  async optimizePDF(pdfBuffer) {
    try {
      // Basic PDF optimization
      // Remove unnecessary whitespace and comments
      let pdfString = pdfBuffer.toString('binary');
      
      // Remove comments (lines starting with %)
      pdfString = pdfString.replace(/^%.*$/gm, '');
      
      // Remove multiple whitespaces
      pdfString = pdfString.replace(/\s+/g, ' ');
      
      // Remove whitespace around operators
      pdfString = pdfString.replace(/\s*([<>(){}\[\]])\s*/g, '$1');
      
      const optimizedBuffer = Buffer.from(pdfString, 'binary');
      
      return {
        originalSize: pdfBuffer.length,
        optimizedSize: optimizedBuffer.length,
        compressionRatio: ((pdfBuffer.length - optimizedBuffer.length) / pdfBuffer.length * 100).toFixed(2),
        buffer: optimizedBuffer
      };
    } catch (error) {
      console.error('PDF optimization error:', error);
      return {
        originalSize: pdfBuffer.length,
        optimizedSize: pdfBuffer.length,
        compressionRatio: 0,
        buffer: pdfBuffer
      };
    }
  }

  /**
   * Batch process optimization
   */
  async optimizeBatchPDFs(pdfResults) {
    const optimizedResults = [];
    
    for (const result of pdfResults) {
      if (result.success && result.buffer) {
        try {
          const optimization = await this.optimizePDF(result.buffer);
          optimizedResults.push({
            ...result,
            buffer: optimization.buffer,
            originalSize: optimization.originalSize,
            optimizedSize: optimization.optimizedSize,
            compressionRatio: optimization.compressionRatio,
            optimized: true
          });
        } catch (error) {
          optimizedResults.push({
            ...result,
            optimized: false,
            optimizationError: error.message
          });
        }
      } else {
        optimizedResults.push(result);
      }
    }
    
    return optimizedResults;
  }

  /**
   * Memory usage monitoring
   */
  getMemoryUsage() {
    const memUsage = process.memoryUsage();
    return {
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`,
      arrayBuffers: `${(memUsage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
    };
  }

  /**
   * Performance monitoring
   */
  recordGenerationTime(startTime, endTime) {
    const duration = endTime - startTime;
    const currentAvg = this.statsCollector.averageGenerationTime;
    const count = this.statsCollector.totalGenerated;
    
    this.statsCollector.averageGenerationTime = 
      (currentAvg * count + duration) / (count + 1);
    this.statsCollector.totalGenerated++;
  }

  /**
   * Health check for PDF service
   */
  async healthCheck() {
    const stats = this.getCacheStats();
    const memory = this.getMemoryUsage();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Enhanced PDF Service',
      cache: stats,
      memory: memory,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const stats = this.getCacheStats();
    const memory = this.getMemoryUsage();
    
    return {
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss'),
      summary: {
        totalPDFsGenerated: stats.totalGenerated,
        batchOperations: stats.batchOperations,
        averageGenerationTime: `${stats.averageGenerationTime.toFixed(2)}ms`,
        cacheEfficiency: `${stats.hitRate}%`
      },
      cache: {
        status: stats.cacheSize < stats.maxCacheSize ? 'healthy' : 'full',
        utilization: `${((stats.cacheSize / stats.maxCacheSize) * 100).toFixed(2)}%`,
        totalSize: stats.totalSizeMB + ' MB',
        hitRate: stats.hitRate + '%'
      },
      memory: {
        status: parseFloat(memory.heapUsed) < 512 ? 'healthy' : 'high',
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal
      },
      recommendations: this.generateRecommendations(stats, memory)
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(stats, memory) {
    const recommendations = [];
    
    if (parseFloat(stats.hitRate) < 50) {
      recommendations.push('Cache hit rate is low. Consider increasing cache size or TTL.');
    }
    
    if (parseFloat(memory.heapUsed) > 400) {
      recommendations.push('High memory usage detected. Consider reducing batch sizes.');
    }
    
    if (stats.averageGenerationTime > 5000) {
      recommendations.push('Generation time is high. Consider optimizing template complexity.');
    }
    
    if (stats.cacheSize >= stats.maxCacheSize * 0.9) {
      recommendations.push('Cache is nearly full. Consider increasing cache size.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal. No recommendations at this time.');
    }
    
    return recommendations;
  }

  /**
   * Export performance data
   */
  async exportPerformanceData(filePath) {
    try {
      const report = this.generatePerformanceReport();
      await fs.writeFile(filePath, JSON.stringify(report, null, 2));
      return { success: true, filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PDFOptimizationService();
