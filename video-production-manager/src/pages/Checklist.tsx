// @ts-nocheck
import React from 'react';
import { CheckSquare, Square, Clock, AlertTriangle, CheckCircle2, Filter, Plus, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, Badge, ProgressBar } from '@/components/ui';
import { useProductionStore, useChecklistProgress } from '@/hooks/useStore';
import { useProjectStore } from '@/hooks/useProjectStore';
import { usePreferencesStore } from '@/hooks/usePreferencesStore';
import { useChecklistAPI, type ChecklistItem } from '@/hooks/useChecklistAPI';
import { useProductionEvents } from '@/hooks/useProductionEvents';
import type { TimestampedEntry } from '@/types';
import { cn } from '@/utils/helpers';

const categoryLabels: Record<string, string> = {
  'SCREENS': 'Screens',
  'SWITCH': 'Switch',
  'IMAG': 'IMAG',
  'MEDIA_SERVERS': 'Media Servers',
  'SOURCES': 'Sources',
  'DESTINATIONS': 'Destinations',
  'DISPLAYS': 'Displays',
  'OUTSIDE_VENDORS': 'Outside Vendors',
  'DOCUMENTATION': 'Documentation',
  'NOTES': 'Notes',
};

export const Checklist: React.FC = () => {
  // Use new stores
  const { activeProject, saveProject } = useProjectStore();
  
  // Always use global (localStorage) preferences for UI state - NOT synced across users
  const { collapsedCategories, toggleCategoryCollapsed } = usePreferencesStore();
  
  // Fallback to old store for backward compatibility
  const oldStore = useProductionStore();
  const projectStore = useProjectStore();
  
  // API hook for checklist operations
  const checklistAPI = useChecklistAPI();
  
  // Local state for checklist items
  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);
  
  const production = activeProject?.production || oldStore.production;
  const defaultChecklistItems = oldStore.defaultChecklistItems;
  
  // Get production ID for API calls and WebSocket
  const productionId = activeProject?.production?.id || oldStore.production?.id;
  
  // Fetch checklist items from API on mount
  React.useEffect(() => {
    if (productionId && oldStore.isConnected) {
      checklistAPI.fetchChecklistItems(productionId)
        .then(items => {
          console.log('📋 Fetched checklist items:', items.length);
          if (items.length > 0) {
            console.log('📋 Sample item structure:', {
              uuid: items[0].uuid,
              moreInfo: items[0].moreInfo,
              moreInfoType: Array.isArray(items[0].moreInfo) ? 'array' : typeof items[0].moreInfo,
              completionNote: items[0].completionNote,
              completionNoteType: Array.isArray(items[0].completionNote) ? 'array' : typeof items[0].completionNote
            });
          }
          setChecklist(items);
        })
        .catch(console.error);
    }
  }, [productionId, oldStore.isConnected]);
  
  // Real-time event subscriptions
  useProductionEvents({
    productionId,
    onEntityCreated: React.useCallback((event) => {
      if (event.entityType === 'checklist-item') {
        console.log('🔔 Checklist item created by', event.userName);
        setChecklist(prev => {
          // Avoid duplicates using uuid
          if (prev.some(item => item.uuid === event.entity.uuid)) return prev;
          return [...prev, event.entity];
        });
      }
    }, []),
    onEntityUpdated: React.useCallback((event) => {
      if (event.entityType === 'checklist-item') {
        console.log('🔔 Checklist item updated by', event.userName);
        setChecklist(prev => prev.map(item => 
          item.uuid === event.entity.uuid ? event.entity : item
        ));
      }
    }, []),
    onEntityDeleted: React.useCallback((event) => {
      if (event.entityType === 'checklist-item') {
        console.log('🔔 Checklist item deleted by', event.userName);
        setChecklist(prev => prev.filter(item => item.uuid !== event.entityId));
      }
    }, [])
  });
  
  const { total, completed, percentage } = useChecklistProgress();
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [showCompleted, setShowCompleted] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showCompletionModal, setShowCompletionModal] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<string>('');
  const [editItemText, setEditItemText] = React.useState('');
  const [editItemMoreInfo, setEditItemMoreInfo] = React.useState('');
  const [editItemAssignedTo, setEditItemAssignedTo] = React.useState<string>('');
  const [editItemHistoryInfo, setEditItemHistoryInfo] = React.useState<TimestampedEntry[]>([]);
  const [editItemHistoryCompletion, setEditItemHistoryCompletion] = React.useState<TimestampedEntry[]>([]);
  const [editItemDays, setEditItemDays] = React.useState<number | undefined>(undefined);
  const [completionItemId, setCompletionItemId] = React.useState<string>('');
  const [completionNote, setCompletionNote] = React.useState('');
  const [addCategory, setAddCategory] = React.useState('');
  const [newItemText, setNewItemText] = React.useState('');
  const [newItemMoreInfo, setNewItemMoreInfo] = React.useState('');
  const [newItemDays, setNewItemDays] = React.useState<number | undefined>(undefined);
  const [newItemDate, setNewItemDate] = React.useState<string>('');
  const [editItemDate, setEditItemDate] = React.useState<string>('');
  const [selectedDefaultItem, setSelectedDefaultItem] = React.useState<string>('');
  const [expandedNoteIds, setExpandedNoteIds] = React.useState<Set<string>>(new Set());

  // Handle navigation from Dashboard - scroll to category and reveal it
  React.useEffect(() => {
    const scrollToCategory = sessionStorage.getItem('scrollToCategory');
    if (scrollToCategory) {
      // Expand the category if it's collapsed (remove from collapsedCategories)
      if (collapsedCategories.includes(scrollToCategory)) {
        toggleCategoryCollapsed(scrollToCategory);
      }
      
      // Scroll to the category card after a short delay
      setTimeout(() => {
        const element = document.getElementById(`category-${scrollToCategory}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
      
      // Clear the sessionStorage
      sessionStorage.removeItem('scrollToCategory');
    }
  }, [collapsedCategories, toggleCategoryCollapsed]);

  const categories = React.useMemo(() => {
    const cats = new Set(checklist.map(item => item.category));
    return ['all', ...Array.from(cats)];
  }, [checklist]);

  const filteredChecklist = React.useMemo(() => {
    return checklist.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesCompleted = showCompleted || !item.completed;
      const matchesSearch = searchQuery === '' ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.moreInfo && item.moreInfo.some(entry => entry.text.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (item.assignedTo && item.assignedTo.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesCompleted && matchesSearch;
    });
  }, [checklist, selectedCategory, showCompleted, searchQuery]);

  const groupedChecklist = React.useMemo(() => {
    const groups: Record<string, typeof checklist> = {};
    
    // Initialize all categories from categoryLabels
    Object.keys(categoryLabels).forEach(category => {
      groups[category] = [];
    });
    
    // Add items to their categories
    filteredChecklist.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    
    return groups;
  }, [filteredChecklist]);

  const getCategoryProgress = (category: string) => {
    const items = checklist.filter(item => item.category === category);
    const completedItems = items.filter(item => item.completed);
    return {
      total: items.length,
      completed: completedItems.length,
      percentage: items.length > 0 ? (completedItems.length / items.length) * 100 : 0,
    };
  };

  const handleAddItem = async () => {
    if (!productionId) {
      alert('No production selected');
      return;
    }
    
    let itemData: any = null;
    
    if (selectedDefaultItem === 'custom') {
      if (!newItemText.trim()) return; // Don't close modal if text is empty
      // Generate unique ID for new checklist item
      const newId = `chk-${Date.now()}`;
      
      itemData = {
        id: newId,
        productionId,
        title: newItemText.trim(),
        category: addCategory,
        moreInfo: newItemMoreInfo.trim() || undefined,
        daysBeforeShow: newItemDays,
        completed: false
      };
    } else if (selectedDefaultItem) {
      const defaultItem = defaultChecklistItems[parseInt(selectedDefaultItem)];
      if (!defaultItem) return;
      
      // Generate unique ID for new checklist item
      const newId = `chk-${Date.now()}`;
      
      itemData = {
        id: newId,
        productionId,
        title: defaultItem.title || defaultItem.item,
        category: addCategory,
        moreInfo: newItemMoreInfo.trim() || defaultItem.moreInfo,
        daysBeforeShow: newItemDays !== undefined ? newItemDays : defaultItem.daysBeforeShow,
        reference: defaultItem.reference,
        completed: false
      };
    } else {
      return;
    }
    
    try {
      await checklistAPI.createChecklistItem(itemData);
      // Don't add optimistically - let WebSocket handle it to avoid duplicates
      
      // Close modal and reset form
      setShowAddModal(false);
      setNewItemText('');
      setNewItemMoreInfo('');
      setNewItemDays(undefined);
      setNewItemDate('');
      setSelectedDefaultItem('');
    } catch (error) {
      console.error('Failed to add checklist item:', error);
      alert('Failed to add checklist item. Please try again.');
    }
  };

  const handleToggleItem = (itemId: string) => {
    const item = checklist.find(i => i.id === itemId || i.uuid === itemId);
    if (item && !item.completed) {
      // If marking as complete, show completion note modal
      setCompletionItemId(item.uuid);
      setCompletionNote('');
      setShowCompletionModal(true);
    } else if (item) {
      // If unchecking, just toggle
      checklistAPI.toggleChecklistItem(item.uuid, false, item.version)
        .then(result => {
          if ('error' in result) {
            alert('This item was modified by another user. Refreshing...');
            // Fetch fresh data
            if (productionId) {
              checklistAPI.fetchChecklistItems(productionId).then(setChecklist);
            }
          } else {
            setChecklist(prev => prev.map(i => i.uuid === item.uuid ? result : i));
          }
        })
        .catch(error => {
          console.error('Failed to toggle checklist item:', error);
          alert('Failed to toggle checklist item. Please try again.');
        });
    }
  };

  const handleSaveCompletion = async () => {
    if (!completionItemId) return;
    
    const item = checklist.find(i => i.uuid === completionItemId);
    if (!item) return;
    
    try {
      // Create completion note entry with proper structure
      const completionNoteEntry = completionNote.trim() ? {
        id: `entry-${Date.now()}`,
        text: completionNote.trim(),
        timestamp: Date.now(),
        type: 'completion' as const
      } : undefined;
      
      // Ensure completionNote is an array before appending
      const existingCompletionNote = Array.isArray(item.completionNote) ? item.completionNote : [];
      
      // Append to existing completionNote array
      const updatedCompletionNote = completionNoteEntry 
        ? [...existingCompletionNote, completionNoteEntry]
        : existingCompletionNote;
      
      console.log('📝 [Checklist.tsx] Saving completion note:', {
        existingCount: existingCompletionNote.length,
        newEntry: completionNoteEntry,
        totalCount: updatedCompletionNote.length
      });
      
      // Toggle the item with completion note
      const result = await checklistAPI.updateChecklistItem(item.uuid, {
        completed: true,
        completionNote: updatedCompletionNote,
        completionDate: new Date().toISOString(),
        version: item.version
      });
      
      if ('error' in result) {
        alert('This item was modified by another user. Refreshing...');
        if (productionId) {
          checklistAPI.fetchChecklistItems(productionId).then(setChecklist);
        }
      } else {
        setChecklist(prev => prev.map(i => i.uuid === item.uuid ? result : i));
        console.log('Checklist item toggled:', completionItemId, 'Note:', completionNote);
      }
    } catch (error) {
      console.error('Failed to complete checklist item:', error);
      alert('Failed to complete checklist item. Please try again.');
      return; // Don't close modal on error
    }
    
    // Clear modal state
    setShowCompletionModal(false);
    setCompletionItemId('');
    setCompletionNote('');
  };

  const handleSkipCompletion = async () => {
    if (!completionItemId) return;
    
    const item = checklist.find(i => i.uuid === completionItemId);
    if (!item) return;
    
    try {
      const result = await checklistAPI.toggleChecklistItem(item.uuid, true, item.version);
      
      if ('error' in result) {
        alert('This item was modified by another user. Refreshing...');
        if (productionId) {
          checklistAPI.fetchChecklistItems(productionId).then(setChecklist);
        }
      } else {
        setChecklist(prev => prev.map(i => i.uuid === item.uuid ? result : i));
        console.log('Checklist item toggled (no note):', completionItemId);
      }
    } catch (error) {
      console.error('Failed to complete checklist item:', error);
      alert('Failed to complete checklist item. Please try again.');
      return;
    }
    
    // Clear modal state
    setShowCompletionModal(false);
    setCompletionItemId('');
    setCompletionNote('');
  };

  const handleEditItem = (itemId: string) => {
    const item = checklist.find(i => i.id === itemId || i.uuid === itemId);
    if (item) {
      setEditingItem(item.uuid);
      setEditItemText(item.title);
      setEditItemMoreInfo('');  // Clear input field for new entry
      setEditItemAssignedTo(item.assignedTo || '');
      
      // Ensure arrays are properly initialized
      const moreInfoArray = Array.isArray(item.moreInfo) ? item.moreInfo : [];
      const completionNoteArray = Array.isArray(item.completionNote) ? item.completionNote : [];
      
      setEditItemHistoryInfo(moreInfoArray);
      setEditItemHistoryCompletion(completionNoteArray);
      setEditItemDays(item.daysBeforeShow);
      setEditItemDate(calculateDateFromDays(item.daysBeforeShow));
      setExpandedNoteIds(new Set()); // Reset expanded notes
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    
    const item = checklist.find(i => i.uuid === editingItem);
    if (!item) return;
    
    const updates: any = {
      title: editItemText.trim(),
      assignedTo: editItemAssignedTo || undefined,
      daysBeforeShow: editItemDays,
      version: item.version
    };
    
    // Append new moreInfo entry if user entered text
    if (editItemMoreInfo.trim()) {
      const newEntry = {
        id: `entry-${Date.now()}`,
        text: editItemMoreInfo.trim(),
        timestamp: Date.now(),
        type: 'info' as const
      };
      updates.moreInfo = [...editItemHistoryInfo, newEntry];
      console.log('📝 [Checklist.tsx] Appending moreInfo entry:', {
        existingCount: editItemHistoryInfo.length,
        newEntry,
        totalCount: updates.moreInfo.length,
        fullArray: updates.moreInfo
      });
    }
    
    console.log('📝 [Checklist.tsx] Calling updateChecklistItem with updates:', updates);
    
    try {
      const result = await checklistAPI.updateChecklistItem(item.uuid, updates);
      
      if ('error' in result) {
        alert('This item was modified by another user. Refreshing...');
        if (productionId) {
          checklistAPI.fetchChecklistItems(productionId).then(setChecklist);
        }
        return;
      }
      
      console.log('✅ [Checklist.tsx] Item updated successfully:', {
        uuid: result.uuid,
        moreInfo: result.moreInfo,
        moreInfoCount: Array.isArray(result.moreInfo) ? result.moreInfo.length : 'not array'
      });
      
      setChecklist(prev => prev.map(i => i.uuid === item.uuid ? result : i));
      console.log('✅ Checklist item updated:', editingItem, updates);
    } catch (error) {
      console.error('❌ Failed to update checklist item:', error);
      alert('Failed to save changes. Please try again.');
      return; // Don't close modal on error
    }
    
    setShowEditModal(false);
    setEditingItem('');
    setEditItemText('');
    setEditItemMoreInfo('');
    setEditItemAssignedTo('');
    setEditItemHistoryInfo([]);
    setEditItemHistoryCompletion([]);
    setEditItemDays(undefined);
    setEditItemDate('');
    setExpandedNoteIds(new Set());
  };

  const calculateDueDate = (daysBeforeShow: number): string => {
    if (!production?.loadIn) return '';
    const loadInDate = new Date(production.loadIn);
    const dueDate = new Date(loadInDate);
    dueDate.setDate(dueDate.getDate() - daysBeforeShow);
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const calculateDateFromDays = (days: number | undefined): string => {
    if (!production?.loadIn || days === undefined) return '';
    const loadInDate = new Date(production.loadIn);
    const dueDate = new Date(loadInDate);
    dueDate.setDate(dueDate.getDate() - days);
    return dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format for input
  };

  const calculateDaysFromDate = (dateString: string): number | undefined => {
    if (!production?.loadIn || !dateString) return undefined;
    const loadInDate = new Date(production.loadIn);
    const selectedDate = new Date(dateString);
    const diffTime = loadInDate.getTime() - selectedDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleOpenAddModal = (category: string) => {
    setAddCategory(category);
    setNewItemText('');
    setNewItemMoreInfo('');
    setNewItemDays(undefined);
    setSelectedDefaultItem('');
    setShowAddModal(true);
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this checklist item?')) return;
    
    const item = checklist.find(i => i.id === id || i.uuid === id);
    if (!item) return;
    
    try {
      await checklistAPI.deleteChecklistItem(item.uuid);
      // Optimistically remove from local state - WebSocket will confirm
      setChecklist(prev => prev.filter(i => i.uuid !== item.uuid));
    } catch (error) {
      console.error('Failed to delete checklist item:', error);
      alert('Failed to delete checklist item. Please try again.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-av-text">Production Checklist</h2>
      </div>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="flex items-center gap-8">
          {/* Left Half - Progress Bar */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-av-text">Overall Progress</h3>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-av-accent" />
                <span className="text-av-accent">{completed}/{total}</span>
              </div>
            </div>
            <ProgressBar value={percentage} showPercentage={false} />
          </div>
          
          {/* Right Half - Counters */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-av-accent">{completed}</p>
              <p className="text-xs text-av-text-muted">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-av-warning">
                {checklist.filter(i => !i.completed && i.daysBeforeShow && i.daysBeforeShow <= 7).length}
              </p>
              <p className="text-xs text-av-text-muted">Due Soon</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-av-text-muted">{total - completed}</p>
              <p className="text-xs text-av-text-muted">Remaining</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Search and Category Filter */}
      <Card className="p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search checklist items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field w-full pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-av-surface rounded transition-colors text-av-text-muted hover:text-av-text"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => {
              const cat = e.target.value;
              setSelectedCategory(cat);
              if (cat !== 'all') {
                // Scroll to category
                setTimeout(() => {
                  const element = document.getElementById(`category-${cat}`);
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }
            }}
            className="input-field w-56"
          >
            <option value="all">All Categories</option>
            {Object.entries(categoryLabels).map(([key, label]) => {
              const progress = getCategoryProgress(key);
              return (
                <option key={key} value={key}>
                  {label} ({progress.completed}/{progress.total})
                </option>
              );
            })}
          </select>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
              showCompleted
                ? 'bg-av-accent/20 text-av-accent border border-av-accent/30'
                : 'bg-av-surface-light text-av-text-muted border border-av-border'
            )}
          >
            {showCompleted ? 'Hide Completed' : 'Show Completed'}
          </button>
        </div>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-6">
        {Object.entries(groupedChecklist).map(([category, items]) => {
          const isCollapsed = collapsedCategories.includes(category);
          return (
            <Card key={category} id={`category-${category}`} className="overflow-hidden">
              <div 
                className="px-4 py-3 bg-av-surface-light border-b border-av-border flex items-center justify-between cursor-pointer hover:bg-av-surface transition-colors"
                onClick={() => toggleCategoryCollapsed(category)}
              >
                <div className="flex items-center gap-2">
                  {isCollapsed ? (
                    <ChevronRight className="w-4 h-4 text-av-text-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-av-text-muted" />
                  )}
                  <h3 className="font-semibold text-av-text">
                    {categoryLabels[category] || category}
                    <span className="ml-2 text-sm font-normal text-av-text-muted">
                      ({getCategoryProgress(category).completed}/{getCategoryProgress(category).total})
                    </span>
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar 
                    value={getCategoryProgress(category).percentage} 
                    showPercentage={false}
                    className="w-32"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenAddModal(category);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-av-accent/10 hover:bg-av-accent/20 text-av-accent rounded transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
              {!isCollapsed && (
              <div className="divide-y divide-av-border">
              {items.map((item, index) => {
                // Get latest entry from arrays - with safety checks
                const moreInfoArray = Array.isArray(item.moreInfo) ? item.moreInfo : [];
                const completionNoteArray = Array.isArray(item.completionNote) ? item.completionNote : [];
                
                const latestInfo = moreInfoArray.length > 0 && moreInfoArray[moreInfoArray.length - 1]?.text
                  ? moreInfoArray[moreInfoArray.length - 1].text 
                  : '';
                const latestCompletion = completionNoteArray.length > 0 && completionNoteArray[completionNoteArray.length - 1]?.text
                  ? completionNoteArray[completionNoteArray.length - 1].text 
                  : '';
                
                const middleContent = item.completed 
                  ? (latestCompletion || latestInfo)
                  : latestInfo;
                
                const tooltipText = `${item.title}${middleContent ? '\n' + middleContent : ''}${item.daysBeforeShow ? '\nDue: ' + item.daysBeforeShow + ' days before show' : ''}`;
                
                return (
                  <div
                    key={item.uuid}
                    className={cn(
                      'flex items-center gap-3 py-2 px-3 hover:bg-av-surface-light/50 transition-colors group',
                      item.completed && 'opacity-60'
                    )}
                    style={{ animationDelay: `${index * 30}ms` }}
                    title={tooltipText}
                    onDoubleClick={() => handleEditItem(item.id)}
                  >
                    {/* Checkbox */}
                    <button 
                      className="flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleItem(item.id);
                      }}
                    >
                      {item.completed ? (
                        <CheckSquare className="w-5 h-5 text-av-accent" />
                      ) : (
                        <Square className="w-5 h-5 text-av-text-muted hover:text-av-accent transition-colors" />
                      )}
                    </button>
                    
                    {/* Item Description - 30% */}
                    <div 
                      className={cn(
                        'text-sm cursor-pointer truncate',
                        item.completed ? 'text-av-text-muted line-through' : 'text-av-text'
                      )}
                      style={{ width: '30%' }}
                    >
                      {item.title}
                    </div>
                    
                    {/* More Info / Completion Note - 55% */}
                    <div 
                      className="text-sm text-av-text-muted truncate cursor-pointer"
                      style={{ width: '55%' }}
                    >
                      {middleContent}
                    </div>
                    
                    {/* Due in Advance - 15% */}
                    <div className="flex items-center gap-2 justify-end" style={{ width: '15%' }}>
                      {item.daysBeforeShow && !item.completed && (
                        <Badge 
                          variant={item.daysBeforeShow <= 7 ? 'danger' : item.daysBeforeShow <= 14 ? 'warning' : 'default'}
                          className="flex items-center gap-1 w-32 justify-center"
                        >
                          <Clock className="w-3 h-3" />
                          {item.daysBeforeShow}d
                          {production?.loadIn && (
                            <span className="ml-1 text-xs">({calculateDueDate(item.daysBeforeShow)})</span>
                          )}
                        </Badge>
                      )}
                      <button
                        onClick={(e) => handleDeleteItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 rounded transition-all text-red-400 hover:text-red-300"
                        title="Delete item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
              )}
          </Card>
          );
        })}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-av-surface border border-av-border rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-av-text">
                Add Item to {categoryLabels[addCategory]}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-av-text-muted hover:text-av-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Select Item
                </label>
                <select
                  value={selectedDefaultItem}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedDefaultItem(value);
                    if (value === 'custom') {
                      setNewItemText('');
                      setNewItemMoreInfo('');
                      setNewItemDays(undefined);
                      setNewItemDate('');
                    } else if (value) {
                      const defaultItem = defaultChecklistItems[parseInt(value)];
                      if (defaultItem) {
                        setNewItemText('');
                        setNewItemMoreInfo(defaultItem.moreInfo || '');
                        setNewItemDays(defaultItem.daysBeforeShow);
                        setNewItemDate(calculateDateFromDays(defaultItem.daysBeforeShow));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-black focus:outline-none focus:border-av-accent"
                >
                  <option value="">-- Select an item --</option>
                  {defaultChecklistItems
                    .map((item, index) => ({ item, index }))
                    .filter(({ item }) => item.category === addCategory)
                    .map(({ item, index }) => (
                      <option key={index} value={index}>
                        {item.item}
                      </option>
                    ))}
                  <option value="custom">Custom...</option>
                </select>
              </div>

              {selectedDefaultItem === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Item Description
                  </label>
                  <input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    placeholder="Enter item description..."
                    className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  More Info (Optional)
                </label>
                <input
                  type="text"
                  value={newItemMoreInfo}
                  onChange={(e) => setNewItemMoreInfo(e.target.value)}
                  placeholder="Additional details or notes..."
                  className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Days in Advance
                  </label>
                  <input
                    type="number"
                    value={newItemDays || ''}
                    onChange={(e) => {
                      const days = e.target.value ? parseInt(e.target.value) : undefined;
                      setNewItemDays(days);
                      setNewItemDate(calculateDateFromDays(days));
                    }}
                    placeholder="e.g., 30"
                    className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newItemDate}
                    onChange={(e) => {
                      setNewItemDate(e.target.value);
                      setNewItemDays(calculateDaysFromDate(e.target.value));
                    }}
                    onClick={(e) => e.currentTarget.select()}
                    className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-av-surface-light text-av-text rounded-md hover:bg-av-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!selectedDefaultItem || (selectedDefaultItem === 'custom' && !newItemText.trim())}
                  className="flex-1 px-4 py-2 bg-av-accent text-white rounded-md hover:bg-av-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Completion Note Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCompletionModal(false)}>
          <div className="bg-av-surface border border-av-border rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-av-text">
                Task Completed
              </h3>
              <button onClick={handleSkipCompletion} className="text-av-text-muted hover:text-av-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-av-text-muted mb-4">
              Would you like to add a completion note for this task?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Completion Note (Optional)
                </label>
                <textarea
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Enter any notes about completing this task..."
                  rows={3}
                  className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSkipCompletion}
                  className="flex-1 px-4 py-2 bg-av-surface-light text-av-text rounded-md hover:bg-av-surface transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={handleSaveCompletion}
                  className="flex-1 px-4 py-2 bg-av-accent text-white rounded-md hover:bg-av-accent/80 transition-colors"
                >
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-av-surface border border-av-border rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-av-text">
                Edit Checklist Item
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-av-text-muted hover:text-av-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Item Description
                </label>
                <input
                  type="text"
                  value={editItemText}
                  onChange={(e) => setEditItemText(e.target.value)}
                  placeholder="Enter item description..."
                  className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Assign To
                </label>
                <select
                  value={editItemAssignedTo}
                  onChange={(e) => setEditItemAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                >
                  <option value="">Unassigned</option>
                  <option value="Production Manager">Production Manager</option>
                  <option value="Technical Director">Technical Director</option>
                  <option value="Video Engineer">Video Engineer</option>
                  <option value="LED Tech">LED Tech</option>
                  <option value="Video Crew">Video Crew</option>
                  <option value="Client">Client</option>
                  <option value="Vendor">Vendor</option>
                </select>
                <p className="text-xs text-av-text-muted mt-1">Future: Will send email, create calendar event, and Slack message</p>
              </div>

              {/* Combined Notes Viewer */}
              {(editItemHistoryInfo.length > 0 || editItemHistoryCompletion.length > 0) && (
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Notes
                  </label>
                  <div className={`space-y-2 mb-2 ${(editItemHistoryInfo.length + editItemHistoryCompletion.length) > 5 ? 'max-h-64 overflow-y-auto pr-2' : ''}`}>
                    {[...editItemHistoryInfo, ...editItemHistoryCompletion]
                      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
                      .map((entry, idx) => {
                        const noteId = entry.id || `entry-${idx}-${entry.timestamp}`;
                        const isExpanded = expandedNoteIds.has(noteId);
                        const noteText = entry.text || '';
                        const isTruncated = noteText.length > 80;
                        const displayText = (!isExpanded && isTruncated) ? noteText.substring(0, 80) + '...' : noteText;
                        
                        return (
                          <div 
                            key={noteId} 
                            className="bg-av-surface-light rounded border border-av-border overflow-hidden"
                          >
                            <div 
                              className="flex items-center gap-2 p-2 cursor-pointer hover:bg-av-surface-light/80 transition-colors"
                              onClick={() => {
                                if (isTruncated) {
                                  setExpandedNoteIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(noteId)) {
                                      next.delete(noteId);
                                    } else {
                                      next.add(noteId);
                                    }
                                    return next;
                                  });
                                }
                              }}
                            >
                              {/* Timestamp Badge */}
                              <div className="flex-shrink-0">
                                <span className={cn(
                                  "text-xs px-2 py-1 rounded",
                                  entry.type === 'completion' 
                                    ? "bg-green-500/20 text-green-400" 
                                    : "bg-blue-500/20 text-blue-400"
                                )}>
                                  {entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: 'numeric', 
                                    minute: '2-digit',
                                    hour12: true 
                                  }) : 'Unknown'}
                                </span>
                              </div>
                              
                              {/* Note Text */}
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-sm text-av-text",
                                  !isExpanded && "truncate"
                                )}>
                                  {displayText}
                                </p>
                              </div>
                              
                              {/* Expand/Collapse Icon */}
                              {isTruncated && (
                                <div className="flex-shrink-0">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-av-text-muted" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-av-text-muted" />
                                  )}
                                </div>
                              )}
                              
                              {/* Delete Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (entry.type === 'completion') {
                                    const updated = editItemHistoryCompletion.filter(e => e.id !== entry.id);
                                    setEditItemHistoryCompletion(updated);
                                  } else {
                                    const updated = editItemHistoryInfo.filter(e => e.id !== entry.id);
                                    setEditItemHistoryInfo(updated);
                                  }
                                  // Remove from expanded set if it was expanded
                                  setExpandedNoteIds(prev => {
                                    const next = new Set(prev);
                                    next.delete(noteId);
                                    return next;
                                  });
                                }}
                                className="flex-shrink-0 text-red-400 hover:text-red-300 p-1"
                                title="Delete note"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Add Notes */}
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Add Notes
                </label>
                <input
                  type="text"
                  value={editItemMoreInfo}
                  onChange={(e) => setEditItemMoreInfo(e.target.value)}
                  placeholder="Add additional details or notes..."
                  className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Days in Advance
                  </label>
                  <input
                    type="number"
                    value={editItemDays || ''}
                    onChange={(e) => {
                      const days = e.target.value ? parseInt(e.target.value) : undefined;
                      setEditItemDays(days);
                      setEditItemDate(calculateDateFromDays(days));
                    }}
                    placeholder="e.g., 30"
                    className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-av-text mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={editItemDate}
                    onChange={(e) => {
                      setEditItemDate(e.target.value);
                      setEditItemDays(calculateDaysFromDate(e.target.value));
                    }}
                    onClick={(e) => e.currentTarget.select()}
                    className="w-full px-3 py-2 bg-av-cardBg border border-av-border rounded-md text-av-text focus:outline-none focus:border-av-accent input-field"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-av-surface-light text-av-text rounded-md hover:bg-av-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editItemText.trim()}
                  className="flex-1 px-4 py-2 bg-av-accent text-white rounded-md hover:bg-av-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {Object.keys(groupedChecklist).length === 0 && (
        <Card className="p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-av-accent mx-auto mb-4" />
          <h3 className="text-lg font-medium text-av-text mb-2">All caught up!</h3>
          <p className="text-sm text-av-text-muted">
            {showCompleted ? 'No tasks in this category' : 'All tasks are completed'}
          </p>
        </Card>
      )}
    </div>
  );
};
