import React, { useRef, useState } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { apiRequest, getAccessToken } from '@/lib/api-client';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
}

export default function ImageUpload({ value, onChange, className = '', label }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('الرجاء اختيار ملف صورة صالح (JPG, PNG, GIF, WebP).');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/v1/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAccessToken()}`
        },
        body: formData
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'فشل في رفع الصورة');
      }
      
      onChange(data.url);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الرفع');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-sm font-bold text-gray-900">{label}</label>}
      
      {value ? (
        <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
          <img src={value} alt="Uploaded preview" className="max-h-48 object-contain" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => onChange('')}
              className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition"
              title="حذف الصورة"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
            ${dragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) handleFile(e.target.files[0]);
            }}
            accept="image/*"
            className="hidden"
          />
          
          {uploading ? (
            <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          ) : (
            <div className="p-4 bg-white rounded-full shadow-sm">
              <UploadCloud className="w-8 h-8 text-primary-500" />
            </div>
          )}
          
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700">
              {uploading ? 'جاري الرفع...' : 'اضغط للرفع أو اسحب الصورة هنا'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF حتى 5MB</p>
          </div>
        </div>
      )}
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      {/* Fallback to manual URL entry just in case */}
      <div className="mt-2 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أو أدخل رابط الصورة مباشرة..."
          className="flex-1 bg-transparent border-b border-gray-200 py-1 text-xs text-gray-600 focus:outline-none focus:border-primary-500"
          dir="ltr"
        />
      </div>
    </div>
  );
}
