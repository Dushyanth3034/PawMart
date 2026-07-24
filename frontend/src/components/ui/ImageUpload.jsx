import React, { useRef, useState } from 'react';
import { UploadCloud, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ImageUpload({ 
  value, 
  onChange, 
  onUpload, 
  label = "Upload Image", 
  aspectRatio = "square", 
  className = "",
  type = "logo"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      await processFile(files[0]);
    }
  };

  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPG, PNG, and WEBP are allowed.');
      return;
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      
      // Temporary preview
      const previewUrl = URL.createObjectURL(file);
      onChange(previewUrl);

      // Perform actual upload
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', type);

      const finalUrl = await onUpload(formData);
      onChange(finalUrl);
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully!`);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.response?.data?.message || 'Failed to upload image. Please try again.');
      onChange(value && !value.startsWith('blob:') ? value : ''); // Revert preview
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const aspectRatioClass = aspectRatio === 'banner' ? 'aspect-[3/1]' : 'aspect-square';

  // Fix image source url logic for local uploads vs external urls
  const getImageSource = () => {
    if (!value) return '';
    if (value.startsWith('blob:') || value.startsWith('http')) return value;
    
    // For local uploads starting with /uploads
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    // Base URL is usually /api/v1, so we need to get just the domain
    const hostUrl = baseUrl.replace('/api/v1', '');
    return `${hostUrl}${value}`;
  };

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-bold text-secondary mb-2">{label}</label>
      
      <div 
        className={`
          relative flex flex-col items-center justify-center w-full 
          ${aspectRatioClass}
          rounded-[16px] border-2 border-dashed transition-all duration-200 overflow-hidden group
          ${isDragging ? 'border-primary bg-primary/5' : 'border-black/[0.07] bg-surface hover:border-primary/50 hover:bg-black/[0.02]'}
          ${value && !isUploading ? 'border-none p-0' : 'p-6'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input 
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          onChange={handleFileChange}
          disabled={isUploading}
        />

        {value ? (
          <>
            <img 
              src={getImageSource()}
              alt={label}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay for hovering when image exists */}
            {!isUploading && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 cursor-pointer">
                <UploadCloud className="text-white mb-1" size={24} />
                <span className="text-white text-xs font-bold">Replace Image</span>
                
                <button 
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-white mb-2" size={32} />
                <span className="text-white text-sm font-bold">Uploading...</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-muted pointer-events-none">
            {isUploading ? (
              <>
                <Loader2 className="animate-spin text-primary mb-3" size={32} />
                <p className="text-sm font-bold text-secondary">Uploading...</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <ImageIcon className="text-primary" size={24} />
                </div>
                <p className="text-sm font-bold text-secondary mb-1">
                  <span className="text-primary hover:underline">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted">JPG, PNG or WEBP (max. 5MB)</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
