"""Generate a double-clickable edition with the same engine and local assets."""
from pathlib import Path
import re
ROOT = Path(__file__).resolve().parent.parent
parts=[]
for name in ['config','data','story','audio','engine','ui','layout','save','effects','card-label','image-bank','app']:
    source=(ROOT/'src'/f'{name}.js').read_text()
    source=re.sub(r'^import .*?;\n','',source,flags=re.M)
    source=re.sub(r'^export ', '', source, flags=re.M)
    parts.append(source)
js="(()=>{\n'use strict';\n"+'\n'.join(parts)+"\n})();"
js=js.replace('</script', '<\\/script')
html=(ROOT/'index.html').read_text()
html=re.sub(r'\s*<script defer src="src/analytics\.js(?:\?[^"]*)?"></script>','',html)
html=re.sub(r'<link rel="stylesheet" href="styles\.css(?:\?[^"]*)?">',lambda _: '<style>'+(ROOT/'styles.css').read_text()+'</style>',html)
html=re.sub(r'<script type="module" src="src/app\.js(?:\?[^"]*)?"></script>', lambda _: '<script>'+js+'</script>', html)
html=re.sub(r"\s*<script>if\(location.protocol==='file:'.*?</script>",'',html,flags=re.S)
(ROOT/'offline.html').write_text(html)
print('offline.html generated; all images and audio are local relative paths.')
