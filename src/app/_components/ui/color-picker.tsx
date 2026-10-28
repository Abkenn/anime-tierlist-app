'use client';

import { Popover } from '@base-ui/react/popover';
import { Check, Copy, SwatchBook } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useId, useRef, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import {
  type ColorFormat,
  formatColor,
  parseColor,
} from '@/app/_lib/color-format';
import type { HexColor } from '@/app/_types/tierlist.types';
import { SegmentedControl } from './segmented-control';

type ColorPickerProps = {
  label: string;
  color: HexColor;
  onChange: (color: HexColor) => void;
};
const formats = [
  { value: 'hex', label: 'HEX' },
  { value: 'rgb', label: 'RGB' },
  { value: 'hsl', label: 'HSL' },
] as const;

export const ColorPicker = ({ label, color, onChange }: ColorPickerProps) => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ColorFormat>('hex');
  const [draft, setDraft] = useState<{
    color: HexColor;
    format: ColorFormat;
    text: string;
  }>();
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const reducedMotion = useReducedMotion();
  const value =
    draft?.color === color && draft.format === format
      ? draft.text
      : formatColor(color, format);
  const valid = parseColor(value) !== null;
  const isCopied = copied === value;
  const changeColor = (text: string) => {
    const next = parseColor(text);
    setDraft({
      color: next ?? color,
      format,
      text: format === 'hex' ? text.toUpperCase() : text,
    });
    if (next) {
      onChange(next);
    }
  };
  const copy = async () => {
    try {
      const text = value;
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setError('');
    } catch {
      input.current?.focus();
      input.current?.select();
      setError('Select the color and copy it.');
    }
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setFormat('hex');
          setDraft(undefined);
          setCopied('');
          setError('');
        }
      }}
    >
      <Popover.Trigger
        aria-label={label}
        title={label}
        className="absolute right-0 bottom-0 flex size-6 cursor-pointer items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 max-lg:opacity-60"
      >
        <SwatchBook
          aria-hidden="true"
          className="size-[clamp(0.625rem,calc(var(--tier-size)*0.1),0.875rem)]"
        />
      </Popover.Trigger>

      {open && (
        <Popover.Portal>
          <Popover.Positioner
            side="right"
            align="end"
            sideOffset={6}
            collisionPadding={8}
            className="z-50"
          >
            <Popover.Popup
              aria-label={label}
              className="w-60 border border-divider bg-popover p-3 text-popover-foreground shadow-md"
              render={
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                />
              }
            >
              <HexColorPicker
                color={color}
                onChange={(text) => {
                  const next = parseColor(text);
                  if (next) {
                    setDraft(undefined);
                    onChange(next);
                  }
                }}
                className="tier-color-picker"
                style={{ width: '100%', height: 160 }}
              />

              <div className="mt-3 flex justify-center">
                <SegmentedControl<ColorFormat>
                  label="Color format"
                  name={`color-format-${id}`}
                  value={format}
                  onChange={(next) => {
                    setFormat(next);
                    setDraft(undefined);
                  }}
                  options={formats}
                />
              </div>

              <div className="group/color relative mt-2">
                <input
                  ref={input}
                  name="colorValue"
                  aria-label={`${format.toUpperCase()} color`}
                  aria-invalid={!valid}
                  autoComplete="off"
                  spellCheck={false}
                  value={value}
                  onFocus={(event) => event.currentTarget.select()}
                  onChange={(event) => changeColor(event.target.value)}
                  onBlur={() => setDraft(undefined)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && valid) {
                      event.preventDefault();
                      setDraft(undefined);
                    }
                  }}
                  onCopy={(event) => {
                    const field = event.currentTarget;
                    event.clipboardData.setData(
                      'text/plain',
                      value.slice(
                        field.selectionStart ?? 0,
                        field.selectionEnd ?? value.length,
                      ),
                    );
                    event.preventDefault();
                  }}
                  onPaste={(event) => {
                    const next = parseColor(
                      event.clipboardData.getData('text/plain'),
                    );
                    if (next) {
                      event.preventDefault();
                      setDraft(undefined);
                      onChange(next);
                    }
                  }}
                  className="h-10 w-full border border-input bg-transparent pl-2 pr-10 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
                />
                <button
                  type="button"
                  aria-label={isCopied ? 'Color copied' : 'Copy color'}
                  title={isCopied ? 'Copied' : 'Copy color'}
                  disabled={!valid}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void copy()}
                  className="absolute inset-y-1 right-1 flex w-8 cursor-pointer items-center justify-center bg-popover hover:bg-accent focus-visible:outline-2"
                >
                  {isCopied ? (
                    <Check aria-hidden="true" className="size-3.5" />
                  ) : (
                    <Copy aria-hidden="true" className="size-3.5" />
                  )}
                </button>
              </div>

              {error && (
                <p role="status" className="mt-2 text-xs">
                  {error}
                </p>
              )}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
};
