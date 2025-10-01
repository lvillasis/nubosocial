// utils/cropImageToBase64.ts
export async function cropImageToBase64(
  imageSrc: string,
  cropArea: { x: number; y: number; width: number; height: number },
  targetWidth: number,
  targetHeight: number
): Promise<File | null> {
  const image: HTMLImageElement = await new Promise((resolve, reject) => {
    const img = new window.Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous"; // evitar problemas con CORS
    img.onload = () => resolve(img);
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise<File>((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], "cropped.jpg", { type: "image/jpeg" }));
      }
    }, "image/jpeg");
  });
}
