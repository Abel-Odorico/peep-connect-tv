#!/usr/bin/env python3
"""Build an explicit mock preview sharing the production skin and CSS."""
from pathlib import Path
import re
import json
root = Path(__file__).resolve().parent.parent
source = (root / 'dist/index.html').read_text()
version = json.loads((root / 'package.json').read_text())['version']
source = re.sub(r'((?:src|href)=")([^"]+\.(?:js|css))(")', lambda m: m[1]+m[2]+'?v='+version+m[3], source)
source = source.replace('<head>', '<head><base href="../dist/"><script src="../demo/studio-fixtures.js?v=0.18.1"></script>')
source = source.replace('<main id="main">', '<p class="tv-demo-notice" role="note">DEMONSTRAÇÃO 0.18.1 · Valores fictícios. Nenhuma conta ou TV é consultada.</p><main id="main">')
source = source.replace('</head>', '<link rel="stylesheet" href="../demo/studio-preview.css?v=0.18.1"></head>')
source = source.replace('Abel', 'Demonstração').replace('ABEL', 'DEMONSTRAÇÃO')
source = source.replace('Peep Connect — Sua TV, seu espaço', 'Peep Connect TV — Demonstração v3')
(root / 'demo/studio.html').write_text(source)
