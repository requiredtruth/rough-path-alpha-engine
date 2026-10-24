from pathlib import Path
import hashlib,zipfile,shutil
root=Path(__file__).resolve().parents[1];out=root/'releases/v1.9.1';out.mkdir(parents=True,exist_ok=True)
for source,name in [(root/'dist/RoughPathAlpha.apk','RoughPathAlpha.apk'),(root/'spec.md','spec.md')]:shutil.copyfile(source,out/name)
with zipfile.ZipFile(out/'source.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if not p.is_file() or any(x in rel.parts for x in ['.git','build','dist','releases','.android-sdk','.jdk','node_modules','__pycache__']):continue
  if p.suffix in ['.jks','.keystore','.pem']:continue
  z.write(p,'rough-path-alpha-engine/'+str(rel))
(out/'SHA256SUMS').write_text(''.join(hashlib.sha256((out/n).read_bytes()).hexdigest()+'  '+n+'\n' for n in ['RoughPathAlpha.apk','source.zip','spec.md']))
print(out)
