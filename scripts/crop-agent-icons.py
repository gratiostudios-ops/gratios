"""Extract the supplied 7×5 sticker sheet into named transparent PNG assets.
Usage: python3 frontend/scripts/crop-agent-icons.py /path/to/sheet.png
Requires Pillow, NumPy and SciPy; used only for asset preparation.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

NAMES = [
    'robot', 'chat', 'calendar', 'notes', 'search', 'idea', 'target',
    'email', 'folder', 'photo', 'music', 'video', 'camera', 'gaming',
    'globe', 'send', 'shopping', 'credit-card', 'wallet', 'home', 'car',
    'train', 'flight', 'map', 'hotel', 'fitness', 'health', 'nature',
    'education', 'books', 'cooking', 'coffee', 'pets', 'settings', 'community',
]
source = Image.open(sys.argv[1]).convert('RGB')
output = Path(__file__).resolve().parents[1] / 'assets' / 'agent-icons'
output.mkdir(parents=True, exist_ok=True)
xs = [0, 225, 445, 655, 870, 1080, 1295, 1536]
ys = [0, 235, 402, 584, 783, 986]
for index, name in enumerate(NAMES):
    row, col = divmod(index, 7)
    box = (xs[col], ys[row], xs[col + 1], ys[row + 1])
    box = {'education': (10, 783, 245, 986), 'books': (245, 783, 445, 986), 'wallet': (852, 402, 1081, 584), 'hotel': (642, 594, 870, 783), 'fitness': (866, 595, 1087, 783)}.get(name, box)
    crop = source.crop(box)
    pixels = np.array(crop).astype('int16')
    seed = (pixels.min(2) < 105) | ((pixels.max(2) - pixels.min(2)) > 48)
    labels, count = ndimage.label(seed)
    sizes = np.bincount(labels.ravel())
    keep = sizes > 24
    keep[0] = False
    edge_labels = np.unique(np.concatenate((labels[0], labels[-1], labels[:, 0], labels[:, -1])))
    largest = sizes[1:].argmax() + 1
    keep[edge_labels] = False
    keep[largest] = True
    mask = keep[labels]
    mask = ndimage.binary_fill_holes(ndimage.binary_closing(mask, iterations=1))
    outline = ndimage.binary_dilation(mask, iterations=6)
    rgba = np.full((*mask.shape, 4), 255, dtype='uint8')
    rgba[:, :, :3][mask] = np.array(crop)[mask]
    rgba[:, :, 3] = outline.astype('uint8') * 255
    image = Image.fromarray(rgba)
    box = image.getbbox()
    image = image.crop(box)
    canvas = Image.new('RGBA', (256, 256))
    image.thumbnail((232, 232), Image.Resampling.LANCZOS)
    canvas.alpha_composite(image, ((256 - image.width) // 2, (256 - image.height) // 2))
    canvas.save(output / (name + '.png'), optimize=True)
