// SimpleAnalysisSync Class - Handles cross-device synchronization
class SimpleAnalysisSync {
  constructor(appointmentId) {
    this.appointmentId = appointmentId;
    this.storageKey = `ai_analyses_${appointmentId}`;
    this.syncedKey = `synced_${appointmentId}`;
  }

  // Save analysis to both localStorage AND server with proper sync
  async saveAnalysis(analysisData) {
    console.log('💾 Saving analysis:', analysisData.id);
    
    // Always save to localStorage first (immediate)
    this.saveToLocalStorage(analysisData);
    
    // Try to save to server and mark as synced
    try {
      await this.saveToServer(analysisData);
      this.markAsSynced(analysisData.id);
      console.log('✅ Analysis saved to cloud and marked as synced');
      return { success: true, synced: true };
    } catch (error) {
      console.warn('⚠️ Failed to save to cloud, saved locally only:', error);
      this.markAsUnsynced(analysisData.id);
      return { success: true, synced: false };
    }
  }

  // Load analyses with proper merging from both sources
  async loadAnalyses() {
    console.log('📥 Loading analyses from all sources...');
    
    let serverAnalyses = [];
    let localAnalyses = [];

    // Try to load from server first
    try {
      serverAnalyses = await this.loadFromServer();
      console.log(`📡 Loaded ${serverAnalyses.length} analyses from server`);
    } catch (error) {
      console.warn('⚠️ Failed to load from server:', error);
    }
    
    // Load from localStorage
    localAnalyses = this.loadFromLocalStorage();
    console.log(`💻 Loaded ${localAnalyses.length} analyses from localStorage`);

    // Merge analyses (server takes precedence, but include unsynced local items)
    const analysisMap = new Map();
    
    // Add server analyses first (these are authoritative)
    serverAnalyses.forEach(analysis => {
      analysisMap.set(analysis.id, { ...analysis, source: 'server' });
    });
    
    // Add local analyses that aren't on server or are newer
    localAnalyses.forEach(analysis => {
      const existing = analysisMap.get(analysis.id);
      if (!existing) {
        // This analysis doesn't exist on server, include it
        analysisMap.set(analysis.id, { ...analysis, source: 'local' });
      } else if (new Date(analysis.timestamp) > new Date(existing.timestamp)) {
        // Local version is newer, use it but try to sync
        analysisMap.set(analysis.id, { ...analysis, source: 'local-newer' });
        this.backgroundSync(analysis);
      }
    });

    const mergedAnalyses = Array.from(analysisMap.values()).sort((a, b) => a.id - b.id);
    
    // Update localStorage with merged data
    this.saveAllToLocalStorage(mergedAnalyses);
    
    // Sync any unsynced local items in background
    await this.syncPendingAnalyses();
    
    console.log(`✅ Merged ${mergedAnalyses.length} total analyses`);
    return mergedAnalyses;
  }

  // Background sync for unsynced analyses
  async syncPendingAnalyses() {
    const localAnalyses = this.loadFromLocalStorage();
    const unsyncedAnalyses = localAnalyses.filter(analysis => 
      !this.isSynced(analysis.id)
    );

    if (unsyncedAnalyses.length === 0) return;

    console.log(`🔄 Syncing ${unsyncedAnalyses.length} pending analyses...`);
    
    for (const analysis of unsyncedAnalyses) {
      try {
        await this.saveToServer(analysis);
        this.markAsSynced(analysis.id);
        console.log(`✅ Synced analysis ${analysis.id} to server`);
      } catch (error) {
        console.warn(`❌ Failed to sync analysis ${analysis.id}:`, error);
      }
    }
  }

  // Background sync a single analysis
  async backgroundSync(analysisData) {
    try {
      await this.saveToServer(analysisData);
      this.markAsSynced(analysisData.id);
      console.log(`🔄 Background synced analysis ${analysisData.id}`);
    } catch (error) {
      console.warn(`⚠️ Background sync failed for ${analysisData.id}:`, error);
    }
  }

  // Save to server
  async saveToServer(analysisData) {
    const response = await fetch('/api/simple-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        appointmentId: this.appointmentId,
        analysisData: analysisData
      })
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    return response.json();
  }

  // Load from server
  async loadFromServer() {
    const response = await fetch(`/api/simple-analysis/${this.appointmentId}`, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    return data.analyses || [];
  }

  // Enhanced localStorage operations
  saveToLocalStorage(analysisData) {
    let savedData = { analyses: [], recordingCount: 0 };
    
    try {
      const existing = localStorage.getItem(this.storageKey);
      if (existing) {
        savedData = JSON.parse(existing);
      }
    } catch (error) {
      console.error('Error reading localStorage:', error);
    }

    savedData.analyses = savedData.analyses || [];
    
    // Update existing or add new
    const existingIndex = savedData.analyses.findIndex(a => a.id === analysisData.id);
    if (existingIndex >= 0) {
      savedData.analyses[existingIndex] = analysisData;
    } else {
      savedData.analyses.push(analysisData);
    }
    
    savedData.recordingCount = Math.max(
      savedData.recordingCount || 0, 
      analysisData.id || 0
    );

    localStorage.setItem(this.storageKey, JSON.stringify(savedData));
  }

  saveAllToLocalStorage(analyses) {
    const savedData = {
      analyses: analyses,
      recordingCount: analyses.length > 0 ? Math.max(...analyses.map(a => a.id)) : 0,
      lastSync: new Date().toISOString()
    };
    localStorage.setItem(this.storageKey, JSON.stringify(savedData));
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        return data.analyses || [];
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
    return [];
  }

  // Sync tracking methods
  markAsSynced(analysisId) {
    try {
      const syncData = this.getSyncData();
      syncData[analysisId] = {
        synced: true,
        lastSync: new Date().toISOString()
      };
      localStorage.setItem(this.syncedKey, JSON.stringify(syncData));
    } catch (error) {
      console.error('Error marking as synced:', error);
    }
  }

  markAsUnsynced(analysisId) {
    try {
      const syncData = this.getSyncData();
      syncData[analysisId] = {
        synced: false,
        lastAttempt: new Date().toISOString()
      };
      localStorage.setItem(this.syncedKey, JSON.stringify(syncData));
    } catch (error) {
      console.error('Error marking as unsynced:', error);
    }
  }

  isSynced(analysisId) {
    try {
      const syncData = this.getSyncData();
      return syncData[analysisId]?.synced === true;
    } catch (error) {
      console.error('Error checking sync status:', error);
      return false;
    }
  }

  getSyncData() {
    try {
      const data = localStorage.getItem(this.syncedKey);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting sync data:', error);
      return {};
    }
  }

  // Delete analysis from both places with proper sync
  async deleteAnalysis(analysisId) {
    console.log(`🗑️ Deleting analysis ${analysisId}`);
    
    // Delete from localStorage
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        data.analyses = data.analyses.filter(a => a.id !== analysisId);
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }
      
      // Also remove sync tracking
      const syncData = this.getSyncData();
      delete syncData[analysisId];
      localStorage.setItem(this.syncedKey, JSON.stringify(syncData));
      
    } catch (error) {
      console.error('Error deleting from localStorage:', error);
    }

    // Delete from server
    try {
      await fetch(`/api/simple-analysis/${this.appointmentId}/${analysisId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      console.log('✅ Analysis deleted from server');
    } catch (error) {
      console.warn('⚠️ Failed to delete from server:', error);
    }
  }

  // Clear all analyses with proper sync
  async clearAllAnalyses() {
    console.log('🗑️ Clearing all analyses');
    
    // Clear localStorage
    try {
      localStorage.removeItem(this.storageKey);
      localStorage.removeItem(this.syncedKey);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }

    // Clear from server
    try {
      const analyses = await this.loadFromServer();
      for (const analysis of analyses) {
        await this.deleteAnalysis(analysis.id);
      }
      console.log('✅ All analyses cleared from server');
    } catch (error) {
      console.warn('⚠️ Failed to clear from server:', error);
    }
  }

  // Utility method to check connection and sync status
  async getStatus() {
    try {
      const localAnalyses = this.loadFromLocalStorage();
      const unsyncedCount = localAnalyses.filter(a => !this.isSynced(a.id)).length;
      
      // Test server connection
      const serverReachable = await this.testConnection();
      
      return {
        localCount: localAnalyses.length,
        unsyncedCount,
        serverReachable,
        lastSync: this.getLastSyncTime()
      };
    } catch (error) {
      return {
        localCount: 0,
        unsyncedCount: 0,
        serverReachable: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  getLastSyncTime() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.lastSync;
      }
    } catch (error) {
      console.error('Error getting last sync time:', error);
    }
    return null;
  }
}