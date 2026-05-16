let PhotoSwipeCtor = null;

async function ensurePhotoSwipe() {
  if (!PhotoSwipeCtor) {
    await import("photoswipe/style.css");
    PhotoSwipeCtor = (await import("photoswipe")).default;
  }
  return PhotoSwipeCtor;
}

/**
 * @param {{ objectUrl: string, width: number, height: number, sourceFileName: string | null }[]} decodedImages
 * @param {number} startIndex
 */
export async function openDecodeGallery(decodedImages, startIndex) {
  if (!decodedImages.length) return;

  const PhotoSwipe = await ensurePhotoSwipe();
  const dataSource = decodedImages.map((item) => ({
    src: item.objectUrl,
    width: item.width,
    height: item.height,
    alt: item.sourceFileName ?? "SSTV decoded image",
  }));

  const index = Math.max(0, Math.min(startIndex, dataSource.length - 1));
  const pswp = new PhotoSwipe({ dataSource, index });
  pswp.init();
}
