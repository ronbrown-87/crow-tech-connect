import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface PhotoLightboxProps {
  images: string[];
  captions?: Record<string, string>;
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  images,
  captions = {},
  currentIndex,
  isOpen,
  onClose,
  onNavigate
}) => {
  const handlePrevious = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrevious();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'Escape') onClose();
  };

  if (!images.length) return null;

  const currentImage = images[currentIndex];
  const currentCaption = captions[currentImage];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl w-full p-0 bg-black/95 border-none"
        onKeyDown={handleKeyDown}
      >
        <div className="relative flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 text-white hover:bg-white/20"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image container */}
          <div className="relative flex items-center justify-center min-h-[60vh] max-h-[80vh]">
            {/* Previous button */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-40 text-white hover:bg-white/20 h-12 w-12"
                onClick={handlePrevious}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
            )}

            {/* Image */}
            <img
              src={currentImage}
              alt={`Photo ${currentIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain"
            />

            {/* Next button */}
            {images.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-40 text-white hover:bg-white/20 h-12 w-12"
                onClick={handleNext}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            )}
          </div>

          {/* Caption and counter */}
          <div className="p-4 text-center">
            {currentCaption && (
              <p className="text-white/90 mb-2">{currentCaption}</p>
            )}
            <p className="text-white/60 text-sm">
              {currentIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PhotoLightbox;
