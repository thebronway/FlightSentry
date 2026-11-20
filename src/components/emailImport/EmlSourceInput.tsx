'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, Code2, X, Play } from 'lucide-react';

interface EmlSourceInputProps {
  allowRawPaste?: boolean;
  isLoading: boolean;
  submitLabel?: string;
  onInspect: (payload: { rawSource: string; fileName: string | null }) => void;
  onClear?: () => void;
}

export default function EmlSourceInput({
  allowRawPaste = true,
  isLoading,
  submitLabel = 'Parse & Preview Email',
  onInspect,
  onClear,
}: EmlSourceInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'raw'>('file');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [rawSource, setRawSource] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const loadFile = async (file: File) => {
    setFileError(null);
    if (file.size > 2 * 1024 * 1024) {
      setFileError('File exceeds 2 MB maximum size.');
      return;
    }
    const text = await file.text();
    setSelectedFileName(file.name);
    setRawSource(text);
    onInspect({ rawSource: text, fileName: file.name });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void loadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void loadFile(file);
    }
  };

  const handleClear = () => {
    setSelectedFileName(null);
    setRawSource('');
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClear) onClear();
  };

  const handleRawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawSource.trim() || isLoading) return;
    onInspect({ rawSource, fileName: selectedFileName });
  };

  return (
    <div className="space-y-3">
      {allowRawPaste && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center p-0.5 rounded-lg bg-gunmetal-canvas border border-gunmetal-border">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`min-h-[44px] sm:min-h-[34px] px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                inputMode === 'file'
                  ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm'
                  : 'border border-transparent text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Upload .eml File</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('raw')}
              className={`min-h-[44px] sm:min-h-[34px] px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                inputMode === 'raw'
                  ? 'bg-gunmetal-border border border-slate-500 text-slate-100 shadow-sm'
                  : 'border border-transparent text-gunmetal-muted hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Paste Raw RFC 822</span>
            </button>
          </div>

          {(selectedFileName || rawSource.trim()) && (
            <button
              type="button"
              onClick={handleClear}
              className="min-h-[44px] sm:min-h-[34px] px-3 py-1 rounded-md text-xs font-semibold bg-gunmetal-canvas hover:bg-gunmetal-border text-slate-300 hover:text-white border border-gunmetal-border inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      )}

      {inputMode === 'file' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 rounded-xl border-2 border-dashed transition-colors cursor-pointer text-center space-y-2 ${
            dragActive
              ? 'border-sky-400 bg-sky-950/20'
              : 'border-gunmetal-border bg-gunmetal-canvas/40 hover:border-slate-500 hover:bg-gunmetal-canvas/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml,message/rfc822"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileText className="w-7 h-7 text-sky-400 mx-auto" />
          <div className="text-sm font-semibold text-slate-200">
            {selectedFileName ? (
              <span className="font-mono text-sky-300">{selectedFileName}</span>
            ) : (
              'Drop an .eml file here or click to browse'
            )}
          </div>
          <p className="text-xs text-gunmetal-muted">
            Supports raw airline confirmations, schedule changes, cancellations, .ics attachments, and forwarded message/rfc822 emails (max 2 MB).
          </p>
          {selectedFileName && !allowRawPaste && (
            <div className="pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="min-h-[36px] px-3 py-1 rounded-md text-xs font-semibold bg-gunmetal-card hover:bg-gunmetal-border text-slate-300 border border-gunmetal-border inline-flex items-center gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove File</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleRawSubmit} className="space-y-3">
          <textarea
            rows={10}
            value={rawSource}
            onChange={(e) => {
              setSelectedFileName(null);
              setRawSource(e.target.value);
            }}
            placeholder="Paste raw RFC 822 email source (including headers: From, Subject, Date, Content-Type, and MIME body)..."
            className="w-full p-3 rounded-lg bg-gunmetal-canvas border border-gunmetal-border text-slate-200 placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-slate-500"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !rawSource.trim()}
              className="min-h-[44px] sm:min-h-[38px] px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-slate-800/75 hover:bg-slate-700/85 border border-slate-500/80 hover:border-slate-400 text-slate-100 hover:text-white inline-flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-45 disabled:pointer-events-none cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-sky-400" />
              <span>{isLoading ? 'Parsing...' : submitLabel}</span>
            </button>
          </div>
        </form>
      )}

      {fileError && (
        <div className="p-2.5 rounded-lg bg-rose-950/45 border border-rose-700/70 text-xs text-rose-200">
          {fileError}
        </div>
      )}
    </div>
  );
}