/**
 * Figure Crop Client Script
 * Sizes figure containers based on actual image dimensions and crop percentages
 *
 * Problem: CSS clip-path clips visually but doesn't affect layout space.
 * Solution: JavaScript reads image natural dimensions and sizes figure to cropped size.
 *
 * Example: Image is 452×340px, crop-x="50" crop-y="50"
 * - Result: Figure sized to 226×170px (50% of natural size)
 * - Image displays at natural size, clipped by overflow:hidden
 * - Figcaption appears directly below the cropped area
 */

/**
 * Size cropped figures based on actual image dimensions
 * @param {NodeList|Array} figures - Optional list of figures to process (defaults to all cropped figures)
 */
export function initFigureCrop(figures = null) {
  // Find all figures with crop parameters
  const croppedFigures = figures || document.querySelectorAll('figure[style*="--crop-"]');

  croppedFigures.forEach(figure => {
    const img = figure.querySelector('img');
    if (!img) return;

    // Read crop percentages from custom properties
    const styles = getComputedStyle(figure);
    const cropX = parseFloat(styles.getPropertyValue('--crop-x')) || 100;
    const cropY = parseFloat(styles.getPropertyValue('--crop-y')) || 100;

    // Function to size figure once image loads
    const sizeFigure = () => {
      // Get image natural dimensions
      const natWidth = img.naturalWidth;
      const natHeight = img.naturalHeight;

      if (!natWidth || !natHeight) {
        // Image not loaded yet
        return;
      }

      // Calculate cropped dimensions (percentage of natural size)
      const croppedWidth = Math.round(natWidth * (cropX / 100));
      const croppedHeight = Math.round(natHeight * (cropY / 100));

      // Set figure dimensions to match cropped area
      figure.style.width = croppedWidth + 'px';
      figure.style.height = croppedHeight + 'px';
      figure.style.overflow = 'hidden';
      figure.style.display = 'block';

      // Ensure image displays at natural size
      img.style.maxWidth = 'none';
      img.style.maxHeight = 'none';
      img.style.display = 'block';

      // Handle positioned crops (pos-x/pos-y shift the image within viewport)
      const posX = styles.getPropertyValue('--pos-x');
      const posY = styles.getPropertyValue('--pos-y');

      if (posX || posY) {
        // Image is absolutely positioned - set on img not figure
        img.style.position = 'absolute';
        if (posX) img.style.left = posX;
        if (posY) img.style.top = posY;
        // Figure dimensions stay the same (crop size)
      }
    };

    // Size immediately if already loaded, otherwise wait
    if (img.complete && img.naturalWidth > 0) {
      sizeFigure();
    } else {
      img.addEventListener('load', sizeFigure);
      // Also handle error case to prevent hanging
      img.addEventListener('error', () => {
        console.warn('Figure crop: Image failed to load', img.src);
      });
    }
  });
}

// Auto-initialize on DOM ready (for standalone HTML viewing)
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFigureCrop());
  } else {
    // DOM already loaded
    initFigureCrop();
  }
}
