from pathlib import Path
from PIL import Image


TARGET_RATIO = 5 / 7


def crop_image(img: Image.Image, target_ratio: float = TARGET_RATIO) -> Image.Image:
    w, h = img.size
    current_ratio = w / h

    if current_ratio > target_ratio:
        new_w = int(h * target_ratio)
        left = (w - new_w) // 2
        right = left + new_w
        top = 0
        bottom = h
    else:
        new_h = int(w / target_ratio)
        top = (h - new_h) // 2
        bottom = top + new_h
        left = 0
        right = w

    return img.crop((left, top, right, bottom))


def transcode_image(
    src_path: str | Path,
    *,
    jpeg_quality: int = 85,
    webp_quality: int = 80,
    webp_lossless: bool = False,
    resize_to: tuple[int, int] | None = None,
):
    src_path = Path(src_path)

    if not src_path.exists():
        raise FileNotFoundError(src_path)

    stem = src_path.stem
    folder = src_path.parent

    img = Image.open(src_path).convert("RGBA")
    img = crop_image(img)

    if resize_to:
        img = img.resize(resize_to, Image.LANCZOS)

    png_path = folder / f"{stem}.png"
    img.save(
        png_path,
        format="PNG",
        optimize=True,
        interlace=1,
    )

    jpg_path = folder / f"{stem}.jpg"
    img.convert("RGB").save(
        jpg_path,
        format="JPEG",
        quality=jpeg_quality,
        progressive=True,
        optimize=True,
        subsampling="4:2:0",
    )

    webp_path = folder / f"{stem}.webp"
    img.save(
        webp_path,
        format="WEBP",
        quality=webp_quality,
        lossless=webp_lossless,
        method=6,
    )

    return {
        "png": png_path,
        "jpeg": jpg_path,
        "webp": webp_path,
    }
