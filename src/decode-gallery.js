let PhotoSwipeCtor = null;

/** @type {import("photoswipe").default | null} */
let activePswp = null;

async function ensurePhotoSwipe() {
  if (!PhotoSwipeCtor) {
    await import("photoswipe/style.css");
    await import("./photoswipe-gallery-buttons.css");
    PhotoSwipeCtor = (await import("photoswipe")).default;
  }
  return PhotoSwipeCtor;
}

/**
 * @param {{ id: string, objectUrl: string, width: number, height: number, sourceFileName: string | null }[]} decodedImages
 */
function buildDataSource(decodedImages) {
  return decodedImages.map((item) => ({
    id: item.id,
    src: item.objectUrl,
    width: item.width,
    height: item.height,
    alt: item.sourceFileName ?? "SSTV decoded image",
  }));
}

/**
 * @param {{ id: string, objectUrl: string, width: number, height: number, sourceFileName: string | null }[]} decodedImages
 * @param {number} startIndex
 * @param {{ onDeleteImage?: (id: string) => void, onDownloadImage?: (id: string) => void }} [options]
 */
export async function openDecodeGallery(decodedImages, startIndex, options = {}) {
  if (!decodedImages.length) return;

  const PhotoSwipe = await ensurePhotoSwipe();
  const dataSource = buildDataSource(decodedImages);
  const index = Math.max(0, Math.min(startIndex, dataSource.length - 1));
  const pswp = new PhotoSwipe({ dataSource, index });

  const { onDeleteImage, onDownloadImage } = options;

  if (onDeleteImage || onDownloadImage) {
    pswp.on("uiRegister", () => {
      if (onDownloadImage) {
        pswp.ui.registerElement({
          name: "download-decode",
          order: 7,
          isButton: true,
          appendTo: "bar",
          title: "Download image",
          ariaLabel: "Download image",
          html: "Download image",
          onClick: () => {
            const item = pswp.options.dataSource?.[pswp.currIndex];
            if (item?.id) onDownloadImage(item.id);
          },
        });
      }

      if (onDeleteImage) {
        pswp.ui.registerElement({
          name: "delete-decode",
          order: 8,
          isButton: true,
          appendTo: "bar",
          title: "Delete from history",
          ariaLabel: "Delete from history",
          html: "Delete from history",
          onClick: () => {
            const item = pswp.options.dataSource?.[pswp.currIndex];
            if (item?.id) onDeleteImage(item.id);
          },
        });
      }
    });
  }

  pswp.on("destroy", () => {
    if (activePswp === pswp) activePswp = null;
  });

  activePswp = pswp;
  pswp.init();
}

/**
 * @param {{ id: string, objectUrl: string, width: number, height: number, sourceFileName: string | null }[]} decodedImages
 */
export function refreshOpenDecodeGallery(decodedImages) {
  const pswp = activePswp;
  if (!pswp) return;

  if (!decodedImages.length) {
    pswp.close();
    return;
  }

  const prevIndex = pswp.currIndex;
  const prevId = pswp.options.dataSource?.[prevIndex]?.id;

  pswp.options.dataSource = buildDataSource(decodedImages);

  let newIndex = decodedImages.findIndex((item) => item.id === prevId);
  if (newIndex < 0) {
    newIndex = Math.min(prevIndex, decodedImages.length - 1);
  }

  if (newIndex !== pswp.currIndex) {
    pswp.goTo(newIndex);
  }

  for (let i = 0; i < decodedImages.length; i++) {
    pswp.refreshSlideContent(i);
  }

  pswp.dispatch("change");
}
