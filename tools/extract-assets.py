#!/usr/bin/env python3
"""Extrai fontes e CSS do <helmet> do design original para assets/fonts e src/ui/app.css.
Uso unico (resultado versionado): python3 tools/extract-assets.py <artefato.html> <full.keep>
Precisa de fonttools + brotli. Nao roda no build."""
import base64, gzip, hashlib, json, re, sys, io, pathlib
from fontTools import subset
from fontTools.ttLib import TTFont

root = pathlib.Path(__file__).resolve().parent.parent
art = open(sys.argv[1]).read()
full = open(sys.argv[2]).read()
man = json.loads(re.search(r'<script type="__bundler/manifest">(.*?)</script>', art, re.S).group(1))

def blob(uuid):
    v = man[uuid]; raw = base64.b64decode(v['data'])
    return gzip.decompress(raw) if v.get('compressed') else raw

helmet = re.search(r'<helmet.*?</helmet>', full, re.S).group(0)
styles = re.findall(r'<style>(.*?)</style>', helmet, re.S)
(root / 'assets/fonts').mkdir(parents=True, exist_ok=True)
written = set()

# ---- fontes de texto: so latin + latin-ext, pesos fundidos (fontes variaveis)
KEEP = {'latin', 'latin-ext'}
faces = {}  # (family, subset, uuid) -> dict
for m in re.finditer(r'/\*\s*([a-z-]+)\s*\*/\s*@font-face\s*\{(.*?)\}', styles[0], re.S):
    sub, b = m.group(1), m.group(2)
    if sub not in KEEP: continue
    fam = re.search(r"font-family:\s*'([^']+)'", b).group(1)
    w = int(re.search(r'font-weight:\s*(\d+)', b).group(1))
    uuid = re.search(r'url\("?([0-9a-f-]{36})', b).group(1)
    ur = re.search(r'unicode-range:\s*([^;]+);', b).group(1)
    d = faces.setdefault((fam, sub, uuid), {'w': [], 'ur': ur})
    d['w'].append(w)
css = ['/* GERADO por tools/extract-assets.py - fontes locais (sem CDN) */']
for (fam, sub, uuid), d in sorted(faces.items()):
    data = blob(uuid); h = hashlib.sha256(data).hexdigest()[:8]
    name = f"{fam.lower().replace(' ', '-')}-{sub}.{h}.woff2"
    (root / 'assets/fonts' / name).write_bytes(data); written.add(name)
    lo, hi = min(d['w']), max(d['w'])
    css.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{lo} {hi};font-display:swap;"
               f"src:url(\"../../assets/fonts/{name}\") format('woff2');unicode-range:{d['ur']}}}")

# ---- Phosphor: so os icones usados
src = (root / 'src/ui/template.body.html').read_text()
for p in (root / 'src/ui').glob('*.js'):
    if p.name != 'view.gen.js': src += p.read_text()
used = sorted(set(re.findall(r'\bph-([a-z0-9]+(?:-[a-z0-9]+)*)', src)) - {'fill', 'bold', 'duotone', 'light', 'thin'})
def style_of(fam):
    return next(x for x in styles if 'font-family: "%s";' % fam in x.split('}')[0])
weights = [('Phosphor', 'ph'), ('Phosphor-Fill', 'ph-fill'), ('Phosphor-Bold', 'ph-bold'), ('Phosphor-Duotone', 'ph-duotone')]
base = re.search(r'\.ph \{.*?\n\}', style_of('Phosphor'), re.S).group(0)
for fam, cls in weights:
    s = style_of(fam)
    ttf_uuid = re.findall(r'url\("([0-9a-f-]{36})[^"]*"\) format\("truetype"\)', s)[0]
    codes = {}   # nome -> [camada principal] ou, no duotone, [camada 20% (:before), camada solida (:after)]
    for n in used:
        pseudos = ('before', 'after') if cls == 'ph-duotone' else ('before',)
        got = []
        for ps in pseudos:
            m = re.search(r'\.%s\.ph-%s:%s\s*\{\s*content:\s*"\\([0-9a-f]+)"' % (re.escape(cls), re.escape(n), ps), s)
            if m: got.append(int(m.group(1), 16))
        if len(got) == len(pseudos): codes[n] = got
    missing = [n for n in used if n not in codes]
    if missing: print('AVISO', cls, 'sem glifo:', missing)
    font = TTFont(io.BytesIO(blob(ttf_uuid)))
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = []; opts.glyph_names = False
    opts.notdef_outline = True; opts.name_IDs = []; opts.hinting = False
    sub = subset.Subsetter(opts); sub.populate(unicodes=[c for v in codes.values() for c in v]); sub.subset(font)
    font.recalcTimestamp = False; font['head'].modified = font['head'].created = 0   # saida identica a cada rodada (sem data/hora)
    out = io.BytesIO(); font.flavor = 'woff2'; font.save(out); data = out.getvalue()
    h = hashlib.sha256(data).hexdigest()[:8]; name = f"phosphor-{cls[3:] or 'regular'}.{h}.woff2"
    (root / 'assets/fonts' / name).write_bytes(data); written.add(name)
    css.append(f"@font-face{{font-family:\"{fam}\";src:url(\"../../assets/fonts/{name}\") format('woff2');font-weight:normal;font-style:normal;font-display:block}}")
    if cls == 'ph':
        css.append(re.sub(r'font-family: "Phosphor"', 'font-family: "Phosphor"', re.sub(r'/\*.*?\*/|\s*-(?:moz|ms)-[^;]*;|\s*-webkit-font-feature-settings[^;]*;', '', base, flags=re.S)))
    else:
        b2 = re.search(r'\.%s \{.*?\n\}' % re.escape(cls), s, re.S).group(0)
        css.append(re.sub(r'/\*.*?\*/', '', b2, flags=re.S))
    if cls == 'ph-duotone':   # duotone = 2 camadas: :before a 20% e :after solida sobreposta (margin-left:-1em)
        css.append('.ph-duotone:before{opacity:.2}\n.ph-duotone:after{margin-left:-1em}')
        for n, (c1, c2) in codes.items():
            css.append(f".ph-duotone.ph-{n}:before{{content:\"\\{c1:x}\"}}.ph-duotone.ph-{n}:after{{content:\"\\{c2:x}\"}}")
    else:
        for n, (c,) in codes.items():
            css.append(f".{cls}.ph-{n}:before{{content:\"\\{c:x}\"}}")
for old in (root / 'assets/fonts').glob('*.woff2'):   # idempotente: some fonte velha de rodadas anteriores
    if old.name not in written: old.unlink()
css.append(styles[-1].strip())
css = '\n'.join(re.sub(r'\n\s*\n', '\n', c) for c in css) + '\n'
(root / 'src/ui').mkdir(parents=True, exist_ok=True)
(root / 'src/ui/app.css').write_text(css)
print('icones usados:', len(used), 'css bytes:', len(css))
