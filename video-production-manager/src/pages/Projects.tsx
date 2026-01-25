/**
 * Shows Dashboard
 * Landing page for managing multiple shows
 */

import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Download, Upload, Trash2, Calendar, MapPin, Clock, Search, X, Archive, Eye, EyeOff } from 'lucide-react';
import { Card, Badge, ProgressBar } from '@/components/ui';
import { useProjectStore } from '@/hooks/useProjectStore';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import { useProductionStore } from '@/hooks/useStore';
import type { VideoDepProject } from '@/types';
import { cn } from '@/utils/helpers';
import { Logo } from '@/components/Logo';

export const Projects: React.FC = () => {
  const { listProjects, loadProject, deleteProject, createProject } = useProjectStore();
  const { setLastOpenedProjectId } = usePreferencesStore();
  const { defaultChecklistItems } = useProductionStore();
  const [shows, setShows] = useState<VideoDepProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newShowName, setNewShowName] = useState('');
  const [newShowClient, setNewShowClient] = useState('');
  const [newShowVenue, setNewShowVenue] = useState('');
  const [newShowRoom, setNewShowRoom] = useState('');
  const [newShowLoadIn, setNewShowLoadIn] = useState('');
  const [newShowLoadOut, setNewShowLoadOut] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShows, setSelectedShows] = useState<Set<string>>(new Set());
  const [archivedShows, setArchivedShows] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('archived-shows');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showArchived, setShowArchived] = useState(false);
  const [includeArchivedInSearch, setIncludeArchivedInSearch] = useState(false);

  useEffect(() => {
    loadShowsList();
  }, []);

  const loadShowsList = async () => {
    try {
      const projectList = await listProjects();
      setShows(projectList.sort((a, b) => b.modified - a.modified));
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load shows:', error);
      setIsLoading(false);
    }
  };

  const handleOpenShow = async (id: string) => {
    try {
      await loadProject(id);
      setLastOpenedProjectId(id);
      // Navigate to main app (handled by App.tsx)
    } catch (error) {
      console.error('Failed to open show:', error);
      alert('Failed to open show');
    }
  };

  const handleCreateShow = async () => {
    if (!newShowName.trim() || !newShowClient.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      // Generate IDs for default checklist items
      const initialChecklist = defaultChecklistItems.map((item, index) => ({
        ...item,
        id: `chk-${Date.now()}-${index}`,
        completed: false,
      }));

      const id = await createProject({
        production: {
          id: '',
          client: newShowClient.trim(),
          showName: newShowName.trim(),
          venue: newShowVenue.trim() || 'TBD',
          room: newShowRoom.trim() || '',
          loadIn: newShowLoadIn || new Date().toISOString().split('T')[0],
          loadOut: newShowLoadOut || new Date().toISOString().split('T')[0],
        },
        sources: [],
        sends: [],
        checklist: initialChecklist,
        ledScreens: [],
        projectionScreens: [],
        computers: [],
        ccus: [],
        cameras: [],
        mediaServers: [],
        mediaServerLayers: [],
        videoSwitchers: [],
        routers: [],
        serverAllocations: [],
        ipAddresses: [],
        cableSnakes: [],
        presets: [],
        usedEquipmentIds: [],
      });

      setShowCreateModal(false);
      setNewShowName('');
      setNewShowClient('');
      setNewShowVenue('');
      setNewShowRoom('');
      setNewShowLoadIn('');
      setNewShowLoadOut('');
      
      // Open the newly created show
      await handleOpenShow(id);
    } catch (error) {
      console.error('Failed to create show:', error);
      alert('Failed to create show');
    }
  };

  const handleDeleteShow = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteProject(id);
      await loadShowsList();
    } catch (error) {
      console.error('Failed to delete show:', error);
      alert('Failed to delete show');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return formatDate(timestamp);
  };

  const toggleShowSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedShows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedShows(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedShows.size === 0) return;
    
    const count = selectedShows.size;
    if (!confirm(`Are you sure you want to delete ${count} show${count > 1 ? 's' : ''}? This cannot be undone.`)) {
      return;
    }

    try {
      await Promise.all(Array.from(selectedShows).map(id => deleteProject(id)));
      setSelectedShows(new Set());
      await loadShowsList();
    } catch (error) {
      console.error('Failed to delete shows:', error);
      alert('Failed to delete some shows');
    }
  };

  const handleArchiveShows = () => {
    if (selectedShows.size === 0) return;
    
    const newArchived = new Set(archivedShows);
    selectedShows.forEach(id => newArchived.add(id));
    setArchivedShows(newArchived);
    localStorage.setItem('archived-shows', JSON.stringify(Array.from(newArchived)));
    setSelectedShows(new Set());
  };

  const handleExportShows = () => {
    // Export selected shows functionality
    alert('Export functionality coming soon');
  };

  const isShowPast = (show: VideoDepProject) => {
    const loadOutDate = show.production.loadoutDate || show.production.loadOut;
    if (!loadOutDate) return false;
    const loadOut = new Date(loadOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return loadOut < today;
  };

  const filteredShows = shows.filter(show => {
    const showId = (show as any).id;
    const isArchived = archivedShows.has(showId);
    
    // Handle archived filter
    if (isArchived && !showArchived) return false;
    
    // Handle search
    if (searchQuery) {
      if (!includeArchivedInSearch && isArchived) return false;
      
      const query = searchQuery.toLowerCase();
      return (
        show.production.showName.toLowerCase().includes(query) ||
        show.production.client.toLowerCase().includes(query) ||
        show.production.venue?.toLowerCase().includes(query) ||
        show.production.room?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Separate shows into current/future and past
  const currentShows = filteredShows.filter(show => !isShowPast(show));
  const pastShows = filteredShows.filter(show => isShowPast(show));

  const calculateCompletion = (show: VideoDepProject) => {
    const total = show.checklist?.length || 0;
    if (total === 0) return { completed: 0, dueSoon: 0, remaining: 0, percentage: 0 };
    
    const completed = show.checklist?.filter(c => c.completed).length || 0;
    const dueSoon = show.checklist?.filter(c => !c.completed && c.daysBeforeShow && c.daysBeforeShow <= 7).length || 0;
    const remaining = total - completed;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, dueSoon, remaining, percentage };
  };

  return (
    <div className="min-h-screen bg-av-background p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        {/* Top Row - Centered Search */}
        <div className="flex justify-center mb-6">
          {/* Search Bar with Archive Toggle */}
          <div className="flex items-center gap-2">
            <div className="w-96 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-av-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search shows${includeArchivedInSearch ? ' (including archived)' : ''}...`}
                className="w-full pl-10 pr-10 py-2 bg-av-surface border border-av-border rounded-lg text-av-text placeholder:text-av-text-muted focus:outline-none focus:border-av-accent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-av-text-muted hover:text-av-text"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Show/Hide Archived Toggle - Right of Search */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={cn(
                "p-2 rounded-lg transition-colors flex-shrink-0",
                showArchived 
                  ? "bg-av-accent text-white" 
                  : "bg-av-surface hover:bg-av-surface-light text-av-text"
              )}
              title={showArchived ? "Hide archived shows" : "Show archived shows"}
            >
              {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Include archived checkbox below search when searching */}
        {searchQuery && (
          <div className="flex justify-center mb-4">
            <label className="flex items-center gap-2 text-xs text-av-text-muted cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeArchivedInSearch}
                onChange={(e) => setIncludeArchivedInSearch(e.target.checked)}
                className="rounded"
              />
              Include archived shows
            </label>
          </div>
        )}

        {/* Bottom Row - Logo and Buttons */}
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <Logo size={48} showText={false} />
            <div>
              <h1 className="text-3xl font-bold text-av-text">Video Department</h1>
              <p className="text-av-text-muted">Production Management</p>
            </div>
          </div>

          {/* Action Buttons - Right aligned */}
          <div className="flex items-center gap-2">
            {/* Conditional buttons */}
            {selectedShows.size > 0 && (
              <>
                <button
                  onClick={handleArchiveShows}
                  className="p-2 bg-av-surface hover:bg-av-surface-light text-av-text rounded-lg transition-colors"
                  title={`Archive ${selectedShows.size} show${selectedShows.size > 1 ? 's' : ''}`}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                  title={`Delete ${selectedShows.size} show${selectedShows.size > 1 ? 's' : ''}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleExportShows}
                  className="p-2 bg-av-surface hover:bg-av-surface-light text-av-text rounded-lg transition-colors"
                  title={`Export ${selectedShows.size} show${selectedShows.size > 1 ? 's' : ''}`}
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            
            {/* Always visible buttons */}
            <button
              onClick={() => alert('Import coming soon')}
              className="p-2 bg-av-surface hover:bg-av-surface-light text-av-text rounded-lg transition-colors"
              title="Import show"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-av-accent hover:bg-av-accent-dark text-white rounded-lg transition-colors"
              title="Create new show"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Shows List */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="text-center py-12 text-av-text-muted">
            Loading shows...
          </div>
        ) : filteredShows.length === 0 ? (
          <Card className="p-12 text-center">
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-av-text-muted opacity-50" />
            <h3 className="text-xl font-semibold text-av-text mb-2">
              {searchQuery ? 'No shows found' : 'No shows yet'}
            </h3>
            <p className="text-av-text-muted mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Create your first show to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-av-accent hover:bg-av-accent-dark rounded-lg transition-colors text-white font-medium"
              >
                <Plus className="w-5 h-5" />
                Create Show
              </button>
            )}
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Current/Future Shows */}
            {currentShows.length > 0 && (
              <div className="space-y-3">
                {currentShows.map((show) => {
                  const stats = calculateCompletion(show);
                  const showId = (show as any).id;
                  const isSelected = selectedShows.has(showId);
                  const isArchived = archivedShows.has(showId);
                  
                  return (
                    <Card
                      key={showId}
                      className={cn(
                        "p-6 hover:border-av-accent transition-all cursor-pointer relative",
                        isSelected && "border-av-accent bg-av-accent/5"
                      )}
                      onClick={() => handleOpenShow(showId)}
                    >
                      <div className="flex items-center gap-6">
                        {/* Selection Checkbox */}
                        <div 
                          className="flex-shrink-0"
                          onClick={(e) => toggleShowSelection(showId, e)}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                            isSelected 
                              ? "bg-av-accent border-av-accent" 
                              : "border-av-border hover:border-av-accent"
                          )}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Show Info - 35% */}
                        <div className="flex-[35]">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-av-text">
                              {show.production.showName}
                            </h3>
                            {isArchived && (
                              <Badge variant="default" className="text-xs">
                                <Archive className="w-3 h-3 mr-1" />
                                Archived
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-av-text-muted mt-1">
                            {show.production.client}
                            {show.production.venue && ` • ${show.production.venue}`}
                            {show.production.room && ` • ${show.production.room}`}
                          </p>
                        </div>

                        {/* Dates - 15% */}
                        <div className="flex-[15] flex items-center gap-4 text-sm border-l border-r border-av-border px-6">
                          <div className="flex-1 text-center">
                            <p className="text-av-text-muted mb-1 text-xs">Load In</p>
                            <p className="text-av-accent font-medium">
                              {show.production.loadIn ? formatDate(new Date(show.production.loadIn).getTime()) : 'TBD'}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-av-border" />
                          <div className="flex-1 text-center">
                            <p className="text-av-text-muted mb-1 text-xs">Load Out</p>
                            <p className="text-av-accent font-medium">
                              {show.production.loadOut ? formatDate(new Date(show.production.loadOut).getTime()) : 'TBD'}
                            </p>
                          </div>
                        </div>

                        {/* Progress - 40% */}
                        <div className="flex-[40] pl-6">
                          <ProgressBar value={stats.percentage} showPercentage={false} className="mb-3" />
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-accent">{stats.completed}</p>
                              <p className="text-xs text-av-text-muted">Completed</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-warning">{stats.dueSoon}</p>
                              <p className="text-xs text-av-text-muted">Due Soon</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-text-muted">{stats.remaining}</p>
                              <p className="text-xs text-av-text-muted">Remaining</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-accent">{stats.percentage}%</p>
                              <p className="text-xs text-av-text-muted">Complete</p>
                            </div>
                          </div>
                        </div>

                        {/* Last Modified */}
                        <div className="flex-shrink-0 flex items-center gap-2 text-xs text-av-text-muted border-l border-av-border pl-6">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(show.modified)}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Divider between current and past */}
            {currentShows.length > 0 && pastShows.length > 0 && (
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-av-border" />
                <span className="text-sm text-av-text-muted font-medium">Past Shows</span>
                <div className="flex-1 h-px bg-av-border" />
              </div>
            )}

            {/* Past Shows */}
            {pastShows.length > 0 && (
              <div className="space-y-3 opacity-60">
                {pastShows.map((show) => {
                  const stats = calculateCompletion(show);
                  const showId = (show as any).id;
                  const isSelected = selectedShows.has(showId);
                  const isArchived = archivedShows.has(showId);
                  
                  return (
                    <Card
                      key={showId}
                      className={cn(
                        "p-6 hover:border-av-accent transition-all cursor-pointer relative",
                        isSelected && "border-av-accent bg-av-accent/5"
                      )}
                      onClick={() => handleOpenShow(showId)}
                    >
                      <div className="flex items-center gap-6">
                        {/* Selection Checkbox */}
                        <div 
                          className="flex-shrink-0"
                          onClick={(e) => toggleShowSelection(showId, e)}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
                            isSelected 
                              ? "bg-av-accent border-av-accent" 
                              : "border-av-border hover:border-av-accent"
                          )}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {/* Show Info - 35% */}
                        <div className="flex-[35]">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-av-text">
                              {show.production.showName}
                            </h3>
                            {isArchived && (
                              <Badge variant="default" className="text-xs">
                                <Archive className="w-3 h-3 mr-1" />
                                Archived
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-av-text-muted mt-1">
                            {show.production.client}
                            {show.production.venue && ` • ${show.production.venue}`}
                            {show.production.room && ` • ${show.production.room}`}
                          </p>
                        </div>

                        {/* Dates - 15% */}
                        <div className="flex-[15] flex items-center gap-4 text-sm border-l border-r border-av-border px-6">
                          <div className="flex-1 text-center">
                            <p className="text-av-text-muted mb-1 text-xs">Load In</p>
                            <p className="text-av-accent font-medium">
                              {show.production.loadIn ? formatDate(new Date(show.production.loadIn).getTime()) : 'TBD'}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-av-border" />
                          <div className="flex-1 text-center">
                            <p className="text-av-text-muted mb-1 text-xs">Load Out</p>
                            <p className="text-av-accent font-medium">
                              {show.production.loadOut ? formatDate(new Date(show.production.loadOut).getTime()) : 'TBD'}
                            </p>
                          </div>
                        </div>

                        {/* Progress - 40% */}
                        <div className="flex-[40] pl-6">
                          <ProgressBar value={stats.percentage} showPercentage={false} className="mb-3" />
                          <div className="grid grid-cols-4 gap-2">
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-accent">{stats.completed}</p>
                              <p className="text-xs text-av-text-muted">Completed</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-warning">{stats.dueSoon}</p>
                              <p className="text-xs text-av-text-muted">Due Soon</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-text-muted">{stats.remaining}</p>
                              <p className="text-xs text-av-text-muted">Remaining</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-av-accent">{stats.percentage}%</p>
                              <p className="text-xs text-av-text-muted">Complete</p>
                            </div>
                          </div>
                        </div>

                        {/* Last Modified */}
                        <div className="flex-shrink-0 flex items-center gap-2 text-xs text-av-text-muted border-l border-av-border pl-6">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(show.modified)}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Show Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <Card className="w-full max-w-lg p-6 m-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-av-text mb-6">Create New Show</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Show Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newShowName}
                  onChange={(e) => setNewShowName(e.target.value)}
                  className="w-full px-3 py-2 bg-av-surface border border-av-border rounded-lg text-av-text focus:outline-none focus:border-av-accent"
                  placeholder="e.g., Annual Conference 2026"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Client <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newShowClient}
                  onChange={(e) => setNewShowClient(e.target.value)}
                  className="w-full px-3 py-2 bg-av-surface border border-av-border rounded-lg text-av-text focus:outline-none focus:border-av-accent"
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Venue
                  </label>
                  <input
                    type="text"
                    value={newShowVenue}
                    onChange={(e) => setNewShowVenue(e.target.value)}
                    className="w-full px-3 py-2 bg-av-surface border border-av-border rounded-lg text-av-text focus:outline-none focus:border-av-accent"
                    placeholder="e.g., Convention Center"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Room
                  </label>
                  <input
                    type="text"
                    value={newShowRoom}
                    onChange={(e) => setNewShowRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-av-surface border border-av-border rounded-lg text-av-text focus:outline-none focus:border-av-accent"
                    placeholder="e.g., Main Ballroom"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Load-In Date
                  </label>
                  <input
                    type="date"
                    value={newShowLoadIn}
                    onChange={(e) => setNewShowLoadIn(e.target.value)}
                    className="w-full px-3 py-2 bg-av-surface border border-av-border rounded-lg text-av-text focus:outline-none focus:border-av-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Load-Out Date
                  </label>
                  <input
                    type="date"
                    value={newShowLoadOut}
                    onChange={(e) => setNewShowLoadOut(e.target.value)}
                    className="w-full px-3 py-2 bg-av-surface border border-av-border rounded-lg text-av-text focus:outline-none focus:border-av-accent"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-av-surface hover:bg-av-surface-light rounded-lg transition-colors text-av-text"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateShow}
                className="px-4 py-2 bg-av-accent hover:bg-av-accent-dark rounded-lg transition-colors text-white font-medium"
              >
                Create Show
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
