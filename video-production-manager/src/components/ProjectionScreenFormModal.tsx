import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Card } from '@/components/ui';
import type { ProjectionScreen, Resolution } from '@/types';

interface ProjectionScreenFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (screen: ProjectionScreen) => void;
  editingScreen?: ProjectionScreen | null;
}

export const ProjectionScreenFormModal: React.FC<ProjectionScreenFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingScreen
}) => {
  // Basic Info
  const [name, setName] = useState('');
  
  // Screen Dimensions
  const [horizontalFt, setHorizontalFt] = useState(0);
  const [horizontalIn, setHorizontalIn] = useState(0);
  const [verticalFt, setVerticalFt] = useState(0);
  const [verticalIn, setVerticalIn] = useState(0);
  
  // Projector Settings
  const [projectorResWidth, setProjectorResWidth] = useState(1920);
  const [projectorResHeight, setProjectorResHeight] = useState(1080);
  const [blendWidthPercent, setBlendWidthPercent] = useState(0);
  const [blendCount, setBlendCount] = useState(0);
  const [gainFactor, setGainFactor] = useState(1.0);
  const [totalLumens, setTotalLumens] = useState(0);
  const [lumensPerPj, setLumensPerPj] = useState(0);
  
  // Image/Throw Distance
  const [imageWidthFt, setImageWidthFt] = useState(0);
  const [imageWidthIn, setImageWidthIn] = useState(0);
  const [throwDistanceFt, setThrowDistanceFt] = useState(0);
  const [throwDistanceIn, setThrowDistanceIn] = useState(0);
  
  // Calculated Values (derived from inputs)
  const calculateValues = () => {
    // Convert dimensions to total inches and meters
    const hTotalInches = (horizontalFt * 12) + horizontalIn;
    const vTotalInches = (verticalFt * 12) + verticalIn;
    const hMeters = hTotalInches * 0.0254;
    const vMeters = vTotalInches * 0.0254;
    
    // Calculate area
    const sqFt = (hTotalInches / 12) * (vTotalInches / 12);
    const sqM = hMeters * vMeters;
    
    // Calculate ratio
    const ratio = hTotalInches / vTotalInches;
    
    // Calculate total pixels
    const totalPixels = projectorResWidth * projectorResHeight;
    
    // Calculate blend width in pixels
    const blendWidthPixels = Math.round((projectorResWidth * blendWidthPercent) / 100);
    
    // Calculate pixels per square foot
    const pixelsPerSqFt = totalPixels / sqFt;
    
    // Calculate pixels per inch
    const pixelsPerIn = Math.sqrt(totalPixels / (hTotalInches * vTotalInches));
    
    // Calculate nits (brightness) - lumens to nits conversion
    // nits = lumens / area_in_square_meters
    const nits = sqM > 0 ? totalLumens / sqM : 0;
    
    // Calculate lumen usage
    const lumenUsageTotal = lumensPerPj * (blendCount > 0 ? blendCount : 1);
    const lumenUsagePercentage = totalLumens > 0 ? (lumenUsageTotal / totalLumens) * 100 : 0;
    
    // Image width and throw distance (meters)
    const imageWidthMeters = ((imageWidthFt * 12) + imageWidthIn) * 0.0254;
    const throwDistanceMeters = ((throwDistanceFt * 12) + throwDistanceIn) * 0.0254;
    
    return {
      horizontal: { ft: horizontalFt, inches: horizontalIn, meters: hMeters },
      vertical: { ft: verticalFt, inches: verticalIn, meters: vMeters },
      ratio,
      sqFt,
      sqM,
      projectorResolution: { width: projectorResWidth, height: projectorResHeight },
      totalPixels,
      blendWidth: { percent: blendWidthPercent, pixels: blendWidthPixels },
      blendCount,
      gainFactor,
      totalLumens,
      lumensPerPj,
      lumenUsage: { total: lumenUsageTotal, percentage: lumenUsagePercentage },
      nits: Math.round(nits),
      pixelsPerSqFt: Math.round(pixelsPerSqFt),
      pixelsPerIn: Math.round(pixelsPerIn),
      contrastRatio: 0, // Not calculated, placeholder
      imageWidth: { ft: imageWidthFt, inches: imageWidthIn, meters: imageWidthMeters },
      throwDistance: { ft: throwDistanceFt, inches: throwDistanceIn, meters: throwDistanceMeters }
    };
  };
  
  const calculated = calculateValues();

  useEffect(() => {
    if (editingScreen) {
      setName(editingScreen.name);
      setHorizontalFt(editingScreen.horizontal.ft);
      setHorizontalIn(editingScreen.horizontal.inches);
      setVerticalFt(editingScreen.vertical.ft);
      setVerticalIn(editingScreen.vertical.inches);
      setProjectorResWidth(editingScreen.projectorResolution.width);
      setProjectorResHeight(editingScreen.projectorResolution.height);
      setBlendWidthPercent(editingScreen.blendWidth.percent);
      setBlendCount(editingScreen.blendCount);
      setGainFactor(editingScreen.gainFactor);
      setTotalLumens(editingScreen.totalLumens);
      setLumensPerPj(editingScreen.lumensPerPj);
      setImageWidthFt(editingScreen.imageWidth.ft);
      setImageWidthIn(editingScreen.imageWidth.inches);
      setThrowDistanceFt(editingScreen.throwDistance.ft);
      setThrowDistanceIn(editingScreen.throwDistance.inches);
    } else {
      // Reset form
      setName('');
      setHorizontalFt(0);
      setHorizontalIn(0);
      setVerticalFt(0);
      setVerticalIn(0);
      setProjectorResWidth(1920);
      setProjectorResHeight(1080);
      setBlendWidthPercent(0);
      setBlendCount(0);
      setGainFactor(1.0);
      setTotalLumens(0);
      setLumensPerPj(0);
      setImageWidthFt(0);
      setImageWidthIn(0);
      setThrowDistanceFt(0);
      setThrowDistanceIn(0);
    }
  }, [editingScreen, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const screen: ProjectionScreen = {
      id: editingScreen?.id || `SCREEN-${Date.now()}`,
      name,
      ...calculated
    };
    
    onSave(screen);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-av-surface border-b border-av-border p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-av-text">
            {editingScreen ? 'Edit Projection Screen' : 'Add Projection Screen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-av-surface-light text-av-text-muted hover:text-av-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-av-text mb-2">
              Screen Name <span className="text-av-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              placeholder="e.g., Main Screen, Screen 1"
            />
          </div>

          {/* Screen Dimensions */}
          <div>
            <h3 className="text-lg font-semibold text-av-text mb-4">Screen Dimensions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Horizontal (Width)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      value={horizontalFt}
                      onChange={(e) => setHorizontalFt(Number(e.target.value))}
                      className="input-field w-full"
                      placeholder="Feet"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={horizontalIn}
                      onChange={(e) => setHorizontalIn(Number(e.target.value))}
                      className="input-field w-full"
                      placeholder="Inches"
                    />
                  </div>
                </div>
                <p className="text-xs text-av-text-muted mt-1">
                  = {calculated.horizontal.meters.toFixed(2)}m
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Vertical (Height)
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      value={verticalFt}
                      onChange={(e) => setVerticalFt(Number(e.target.value))}
                      className="input-field w-full"
                      placeholder="Feet"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      min="0"
                      max="11"
                      value={verticalIn}
                      onChange={(e) => setVerticalIn(Number(e.target.value))}
                      className="input-field w-full"
                      placeholder="Inches"
                    />
                  </div>
                </div>
                <p className="text-xs text-av-text-muted mt-1">
                  = {calculated.vertical.meters.toFixed(2)}m
                </p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-av-surface-light rounded-md">
              <p className="text-sm text-av-text">
                <span className="text-av-text-muted">Ratio:</span> {calculated.ratio.toFixed(3)} | 
                <span className="ml-4 text-av-text-muted">Area:</span> {calculated.sqFt.toFixed(2)} sq ft ({calculated.sqM.toFixed(2)} sq m)
              </p>
            </div>
          </div>

          {/* Projector Settings */}
          <div>
            <h3 className="text-lg font-semibold text-av-text mb-4">Projector Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Projector Resolution
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={projectorResWidth}
                    onChange={(e) => setProjectorResWidth(Number(e.target.value))}
                    className="input-field w-full"
                    placeholder="Width (px)"
                  />
                  <span className="flex items-center text-av-text-muted">×</span>
                  <input
                    type="number"
                    min="0"
                    value={projectorResHeight}
                    onChange={(e) => setProjectorResHeight(Number(e.target.value))}
                    className="input-field w-full"
                    placeholder="Height (px)"
                  />
                </div>
                <p className="text-xs text-av-text-muted mt-1">
                  Total: {calculated.totalPixels.toLocaleString()} pixels
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Total Lumens
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalLumens}
                  onChange={(e) => setTotalLumens(Number(e.target.value))}
                  className="input-field w-full"
                  placeholder="Combined projector output"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Lumens Per Projector
                </label>
                <input
                  type="number"
                  min="0"
                  value={lumensPerPj}
                  onChange={(e) => setLumensPerPj(Number(e.target.value))}
                  className="input-field w-full"
                  placeholder="Individual projector output"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Gain Factor
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={gainFactor}
                  onChange={(e) => setGainFactor(Number(e.target.value))}
                  className="input-field w-full"
                  placeholder="Screen gain (typically 1.0-1.3)"
                />
              </div>
            </div>
          </div>

          {/* Blending */}
          <div>
            <h3 className="text-lg font-semibold text-av-text mb-4">Blending (for multi-projector setup)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Blend Width (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={blendWidthPercent}
                  onChange={(e) => setBlendWidthPercent(Number(e.target.value))}
                  className="input-field w-full"
                  placeholder="Overlap percentage"
                />
                <p className="text-xs text-av-text-muted mt-1">
                  = {calculated.blendWidth.pixels} pixels
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Number of Blends
                </label>
                <input
                  type="number"
                  min="0"
                  value={blendCount}
                  onChange={(e) => setBlendCount(Number(e.target.value))}
                  className="input-field w-full"
                  placeholder="Number of projector overlaps"
                />
              </div>
            </div>
          </div>

          {/* Throw Distance */}
          <div>
            <h3 className="text-lg font-semibold text-av-text mb-4">Image & Throw Distance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Image Width
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={imageWidthFt}
                    onChange={(e) => setImageWidthFt(Number(e.target.value))}
                    className="input-field w-full"
                    placeholder="Feet"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={imageWidthIn}
                    onChange={(e) => setImageWidthIn(Number(e.target.value))}
                    className="input-field w-full"
                    placeholder="Inches"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-av-text mb-2">
                  Throw Distance
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={throwDistanceFt}
                    onChange={(e) => setThrowDistanceFt(Number(e.target.value))}
                    className="input-field w-full"
                    placeholder="Feet"
                  />
                  <input
                    type="number"
                    min="0"
                    max="11"
                    value={throwDistanceIn}
                    onChange={(e) => setThrowDistanceIn(Number(e.target.value))}
                    className="input-field w-full"
                    placeholder="Inches"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Calculated Results */}
          <div className="p-4 bg-av-surface-light rounded-md">
            <h3 className="text-lg font-semibold text-av-text mb-3">Calculated Values</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-av-text-muted">Brightness</p>
                <p className="text-av-text font-semibold">{calculated.nits} nits</p>
              </div>
              <div>
                <p className="text-av-text-muted">Pixel Density</p>
                <p className="text-av-text font-semibold">{calculated.pixelsPerSqFt}/sq ft</p>
              </div>
              <div>
                <p className="text-av-text-muted">Pixels/Inch</p>
                <p className="text-av-text font-semibold">{calculated.pixelsPerIn}</p>
              </div>
              <div>
                <p className="text-av-text-muted">Lumen Usage</p>
                <p className="text-av-text font-semibold">{calculated.lumenUsage.percentage.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-av-border">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              {editingScreen ? 'Update Screen' : 'Add Screen'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};
