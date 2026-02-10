'use client'
import React, { useState } from 'react';

interface ImageGalleryProps {
  images: string[];
  title: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const openLightbox = (image: string, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const goToNext = () => {
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(images[nextIndex]);
  };

  const goToPrevious = () => {
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setCurrentIndex(prevIndex);
    setSelectedImage(images[prevIndex]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'Escape') closeLightbox();
  };

  return (
    <div className="image-gallery-container">
      <h3 className="section-header">Image Gallery ({images.length} Images)</h3>
      
      {/* Gallery Grid */}
      <div className="image-gallery-grid">
        {images.map((image, index) => (
          <div
            key={index}
            className="image-gallery-item"
            onClick={() => openLightbox(image, index)}
          >
            <img
              src={image}
              alt={`${title} - Image ${index + 1}`}
              className="image-gallery-thumbnail"
            />
            <div className="image-gallery-overlay">
              <span>Click to enlarge</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="image-lightbox"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <button
            className="lightbox-close"
            onClick={closeLightbox}
            aria-label="Close lightbox"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                className="lightbox-nav lightbox-prev"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                className="lightbox-nav lightbox-next"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}

          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt={`${title} - Image ${currentIndex + 1}`}
              className="lightbox-image"
            />
            <div className="lightbox-caption">
              Image {currentIndex + 1} of {images.length}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .image-gallery-container {
          margin-bottom: 2rem;
        }

        .image-gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .image-gallery-item {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s ease;
          background: #f5f5f5;
        }

        .image-gallery-item:hover {
          transform: scale(1.02);
        }

        .image-gallery-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .image-gallery-item:hover .image-gallery-thumbnail {
          transform: scale(1.1);
        }

        .image-gallery-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
          color: white;
          padding: 1rem;
          opacity: 0;
          transition: opacity 0.2s ease;
          display: flex;
          align-items: flex-end;
          font-size: 0.875rem;
        }

        .image-gallery-item:hover .image-gallery-overlay {
          opacity: 1;
        }

        /* Lightbox Styles */
        .image-lightbox {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.95);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .lightbox-content {
          max-width: 90vw;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .lightbox-image {
          max-width: 100%;
          max-height: 85vh;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        }

        .lightbox-caption {
          color: white;
          margin-top: 1rem;
          font-size: 0.875rem;
          text-align: center;
        }

        .lightbox-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          font-size: 2.5rem;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
          line-height: 1;
          padding: 0;
        }

        .lightbox-close:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .lightbox-nav {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          font-size: 3rem;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
          line-height: 1;
          padding: 0;
        }

        .lightbox-nav:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .lightbox-prev {
          left: 2rem;
        }

        .lightbox-next {
          right: 2rem;
        }

        /* Mobile Responsiveness */
        @media (max-width: 767px) {
          .image-gallery-grid {
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 0.5rem;
          }

          .lightbox-nav {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 2rem;
          }

          .lightbox-prev {
            left: 0.5rem;
          }

          .lightbox-next {
            right: 0.5rem;
          }

          .lightbox-close {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ImageGallery;
