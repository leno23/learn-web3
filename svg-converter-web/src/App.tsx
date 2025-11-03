import React, { useMemo, useState } from 'react';

type SelectedFile = {
  file: File;
  url: string;
};

const MAX_FILES = 20;

export function App() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const totalSizeMb = useMemo(() => {
    return files.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024);
  }, [files]);

  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;
    const chosen = Array.from(list);
    const onlySvg = chosen.filter((f) => f.type === 'image/svg+xml' || f.name.toLowerCase().endsWith('.svg'));
    if (onlySvg.length !== chosen.length) {
      setError('仅支持 SVG 文件');
    } else {
      setError(null);
    }

    const limited = onlySvg.slice(0, MAX_FILES);
    const mapped: SelectedFile[] = limited.map((file) => ({ file, url: URL.createObjectURL(file) }));
    // revoke previous
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles(mapped);
    e.currentTarget.value = '';
  }

  async function upload() {
    if (files.length === 0) return;
    setIsUploading(true);
    setError(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f.file, f.file.name));
      const resp = await fetch(`${apiBase}/convert`, {
        method: 'POST',
        body: form
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '上传失败');
        throw new Error(text || '上传失败');
      }
      const blob = await resp.blob();
      // try get filename
      const cd = resp.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || (files.length === 1 ? files[0].file.name.replace(/\.svg$/i, '') + '.png' : 'converted.zip');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  }

  function clearAll() {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    setFiles([]);
  }

  return (
    <div className="container">
      <h1>SVG → PNG 批量转换</h1>
      <p className="sub">最多选择 {MAX_FILES} 个 SVG 文件，批量下载 PNG（多个文件将自动打包 ZIP）。</p>

      <div className="actions">
        <label className="button">
          选择文件
          <input type="file" accept=".svg,image/svg+xml" multiple onChange={onSelect} hidden />
        </label>
        <button className="button primary" onClick={upload} disabled={files.length === 0 || isUploading}>
          {isUploading ? '上传中…' : '开始转换'}
        </button>
        <button className="button" onClick={clearAll} disabled={files.length === 0 || isUploading}>
          清空
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="meta">已选择 {files.length} 个文件 · 总大小 {totalSizeMb.toFixed(2)} MB</div>

      <div className="grid">
        {files.map((f) => (
          <div className="card" key={f.url}>
            <div className="thumb">
              <img src={f.url} alt={f.file.name} />
            </div>
            <div className="name" title={f.file.name}>{f.file.name}</div>
            <div className="size">{(f.file.size / 1024).toFixed(1)} KB</div>
          </div>
        ))}
      </div>
    </div>
  );
}


