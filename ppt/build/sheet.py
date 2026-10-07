# Contact sheets of the rendered slides, for looking at several at once.
import glob, sys
from PIL import Image
names = sorted(glob.glob('render/slide-*.png'))
per = 4
for k in range(0, len(names), per):
    ims = [Image.open(n).convert('RGB').resize((1000, 562), Image.LANCZOS) for n in names[k:k + per]]
    S = Image.new('RGB', (2000, 562 * ((len(ims) + 1) // 2)), 'white')
    for i, im in enumerate(ims):
        S.paste(im, ((i % 2) * 1000, (i // 2) * 562))
    S.save(f'render/sheet-{k // per + 1}.jpg', quality=88)
