import React from 'react';
import { Calculator, ArrowRight, RefreshCw } from 'lucide-react';
import { Card, Button, Input, Badge } from '@/components/ui';
import { resolutionPresets } from '@/data/sampleData';
import { cn } from '@/utils/helpers';

export const ScalingCalculator: React.FC = () => {
  const [inputWidth, setInputWidth] = React.useState<number>(1920);
  const [inputHeight, setInputHeight] = React.useState<number>(1080);
  const [outputWidth, setOutputWidth] = React.useState<number>(3840);
  const [outputHeight, setOutputHeight] = React.useState<number>(2160);
  const [ppi, setPpi] = React.useState<number>(72);

  const scaleFactor = React.useMemo(() => {
    return outputWidth / inputWidth;
  }, [inputWidth, outputWidth]);

  const scaledResolution = React.useMemo(() => ({
    width: Math.round(inputWidth * scaleFactor),
    height: Math.round(inputHeight * scaleFactor),
  }), [inputWidth, inputHeight, scaleFactor]);

  const pixelsToInches = (pixels: number) => (pixels / ppi).toFixed(2);
  const inchesToPixels = (inches: number) => Math.round(inches * ppi);

  const aspectRatio = React.useMemo(() => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(inputWidth, inputHeight);
    return `${inputWidth / divisor}:${inputHeight / divisor}`;
  }, [inputWidth, inputHeight]);

  const swapResolutions = () => {
    setInputWidth(outputWidth);
    setInputHeight(outputHeight);
    setOutputWidth(inputWidth);
    setOutputHeight(inputHeight);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-av-text">Scaling Calculator</h2>
        <p className="text-sm text-av-text-muted">
          Calculate resolution scaling, pixel-to-inch conversions, and more
        </p>
      </div>

      {/* Resolution Presets */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-av-text-muted mb-3">Quick Presets</h3>
        <div className="flex flex-wrap gap-2">
          {resolutionPresets.filter(p => p.width > 0).map(preset => (
            <button
              key={preset.name}
              onClick={() => {
                setInputWidth(preset.width);
                setInputHeight(preset.height);
              }}
              className="px-3 py-1.5 rounded-md text-sm bg-av-surface-light hover:bg-av-border text-av-text-muted hover:text-av-text transition-colors"
            >
              {preset.name}
              <span className="ml-2 text-xs opacity-60">
                {preset.width}×{preset.height}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Main Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resolution Scaling */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Calculator className="w-5 h-5 text-av-accent" />
            <h3 className="text-lg font-display font-semibold text-av-text">Resolution Scaling</h3>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Input Resolution */}
            <div className="flex-1 w-full">
              <p className="text-sm text-av-text-muted mb-3">Input Resolution</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-av-text-muted">Width</label>
                  <input
                    type="number"
                    value={inputWidth}
                    onChange={(e) => setInputWidth(Number(e.target.value))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-av-text-muted">Height</label>
                  <input
                    type="number"
                    value={inputHeight}
                    onChange={(e) => setInputHeight(Number(e.target.value))}
                    className="input-field w-full"
                  />
                </div>
              </div>
              <p className="text-xs text-av-text-muted mt-2">
                Aspect Ratio: <span className="text-av-accent">{aspectRatio}</span>
              </p>
            </div>

            {/* Swap Button */}
            <button
              onClick={swapResolutions}
              className="p-3 rounded-full bg-av-surface-light hover:bg-av-border transition-colors"
              title="Swap resolutions"
            >
              <RefreshCw className="w-5 h-5 text-av-text-muted" />
            </button>

            {/* Output Resolution */}
            <div className="flex-1 w-full">
              <p className="text-sm text-av-text-muted mb-3">Output Resolution</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-av-text-muted">Width</label>
                  <input
                    type="number"
                    value={outputWidth}
                    onChange={(e) => setOutputWidth(Number(e.target.value))}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-av-text-muted">Height</label>
                  <input
                    type="number"
                    value={outputHeight}
                    onChange={(e) => setOutputHeight(Number(e.target.value))}
                    className="input-field w-full"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="mt-6 p-4 bg-av-surface-light rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-av-text-muted mb-1">Scale Factor</p>
                <p className="text-xl font-bold text-av-accent">
                  {scaleFactor.toFixed(2)}×
                </p>
              </div>
              <div>
                <p className="text-xs text-av-text-muted mb-1">Scaled Width</p>
                <p className="text-xl font-bold text-av-text">
                  {scaledResolution.width}
                </p>
              </div>
              <div>
                <p className="text-xs text-av-text-muted mb-1">Scaled Height</p>
                <p className="text-xl font-bold text-av-text">
                  {scaledResolution.height}
                </p>
              </div>
              <div>
                <p className="text-xs text-av-text-muted mb-1">Total Pixels</p>
                <p className="text-xl font-bold text-av-info">
                  {(scaledResolution.width * scaledResolution.height).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Pixel to Inches */}
        <Card className="p-6">
          <h3 className="text-lg font-display font-semibold text-av-text mb-4">
            Pixel ↔ Inches
          </h3>
          
          <div className="mb-4">
            <label className="text-sm text-av-text-muted">PPI (Pixels Per Inch)</label>
            <input
              type="number"
              value={ppi}
              onChange={(e) => setPpi(Number(e.target.value))}
              className="input-field w-full mt-1"
            />
            <p className="text-xs text-av-text-muted mt-1">
              Standard: 72 for web, 96 for Windows, 300 for print
            </p>
          </div>

          <div className="space-y-4 mt-6">
            <div className="p-3 bg-av-surface-light rounded-lg">
              <p className="text-xs text-av-text-muted mb-1">Width in Inches</p>
              <p className="text-lg text-av-text">
                {pixelsToInches(inputWidth)}" 
                <span className="text-av-text-muted text-sm ml-2">
                  ({(parseFloat(pixelsToInches(inputWidth)) * 2.54).toFixed(2)} cm)
                </span>
              </p>
            </div>
            <div className="p-3 bg-av-surface-light rounded-lg">
              <p className="text-xs text-av-text-muted mb-1">Height in Inches</p>
              <p className="text-lg text-av-text">
                {pixelsToInches(inputHeight)}"
                <span className="text-av-text-muted text-sm ml-2">
                  ({(parseFloat(pixelsToInches(inputHeight)) * 2.54).toFixed(2)} cm)
                </span>
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* LED Pixel Pitch Calculator */}
      <Card className="p-6">
        <h3 className="text-lg font-display font-semibold text-av-text mb-4">
          LED Pixel Pitch Reference
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-av-border">
                <th className="text-left py-2 px-3 text-av-text-muted font-medium">Pixel Pitch</th>
                <th className="text-left py-2 px-3 text-av-text-muted font-medium">Min Viewing Distance</th>
                <th className="text-left py-2 px-3 text-av-text-muted font-medium">Pixels per sq/m</th>
                <th className="text-left py-2 px-3 text-av-text-muted font-medium">Best Use</th>
              </tr>
            </thead>
            <tbody>
              {[
                { pitch: '1.5mm', distance: '5ft / 1.5m', pixels: '444,444', use: 'Broadcast, Close viewing' },
                { pitch: '2.6mm', distance: '8ft / 2.5m', pixels: '147,929', use: 'Indoor events' },
                { pitch: '3.9mm', distance: '13ft / 4m', pixels: '65,746', use: 'Concerts, Large venues' },
                { pitch: '4.8mm', distance: '16ft / 5m', pixels: '43,403', use: 'Outdoor events' },
                { pitch: '6mm', distance: '20ft / 6m', pixels: '27,778', use: 'Large outdoor' },
              ].map((row) => (
                <tr key={row.pitch} className="border-b border-av-border/50 hover:bg-av-surface-light/50">
                  <td className="py-2 px-3 text-av-accent">{row.pitch}</td>
                  <td className="py-2 px-3">{row.distance}</td>
                  <td className="py-2 px-3">{row.pixels}</td>
                  <td className="py-2 px-3 text-av-text-muted">{row.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
