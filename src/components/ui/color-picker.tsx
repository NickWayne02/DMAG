import React, { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

// Convert Hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Convert RGB to Hex
const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1).toUpperCase();
};

export function ColorPicker({ color, onChange, className }: ColorPickerProps) {
  const { t } = useLanguage();
  const [hexInput, setHexInput] = useState(color);
  const [rgb, setRgb] = useState(hexToRgb(color));

  // Sync internal state when external color changes
  useEffect(() => {
    setHexInput(color.toUpperCase());
    setRgb(hexToRgb(color));
  }, [color]);

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/i.test(val)) {
      onChange(val);
    }
  };

  const handleRgbChange = (channel: 'r' | 'g' | 'b', value: string) => {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    num = Math.max(0, Math.min(255, num));
    
    const newRgb = { ...rgb, [channel]: num };
    setRgb(newRgb);
    onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  return (
    <div className={`flex flex-col gap-4 p-4 bg-card rounded-xl border border-border shadow-lg ${className || ''}`}>
      {/* react-colorful HexPicker provides SV area + Hue slider */}
      <div className="w-full flex justify-center">
        <div className="custom-color-picker-wrapper w-full max-w-50">
          <HexColorPicker color={color} onChange={onChange} style={{ width: '100%', height: '200px' }} />
        </div>
      </div>

      <div className="flex gap-4">
        {/* RGB Inputs */}
        <div className="flex-1 space-y-2">
          <Label className="text-xs text-muted-foreground">RGB</Label>
          <div className="flex gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground text-center">R</span>
              <Input 
                value={rgb.r.toString()} 
                onChange={(e) => handleRgbChange('r', e.target.value)}
                className="h-8 px-2 text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground text-center">G</span>
              <Input 
                value={rgb.g.toString()} 
                onChange={(e) => handleRgbChange('g', e.target.value)}
                className="h-8 px-2 text-center"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted-foreground text-center">B</span>
              <Input 
                value={rgb.b.toString()} 
                onChange={(e) => handleRgbChange('b', e.target.value)}
                className="h-8 px-2 text-center"
              />
            </div>
          </div>
        </div>

        {/* HEX Input */}
        <div className="w-24 space-y-2">
          <Label className="text-xs text-muted-foreground">Hex</Label>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-transparent">H</span> {/* Spacer */}
            <Input 
              value={hexInput} 
              onChange={handleHexChange}
              className="h-8 px-2 font-mono uppercase"
              maxLength={7}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
