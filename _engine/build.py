#!/usr/bin/env python3
"""
Сборка страницы домашки из конфига.

    python3 build.py config.json [--mode pages|offline|remote] [-o out.html]

Режимы картинок:
  pages   — img/<имя>.jpg рядом со страницей (для GitHub Pages)   [по умолчанию]
  offline — картинки вшиты в файл base64 (работает без интернета)
  remote  — абсолютные URL из конфига (images_remote)

Новая группа = новый конфиг. Шаблон не трогаем.
"""
import json, sys, base64, pathlib, argparse

HERE = pathlib.Path(__file__).parent
TEMPLATE = HERE / 'template.html'
ENDPOINT = ('https://script.google.com/macros/s/'
            'AKfycbx9CUvXuQ827FfwviQ0JxtdBl7_K7Jg54c-O9g4EmVjGiJwlK8shWJtrz1yOXHpkd5V4g/exec')


def collect_image_keys(cfg):
    """Какие картинки реально нужны этой домашке."""
    keys = {'cover', 'hero'}
    for block in ('mc', 'sp', 'ty', 'prep'):
        for item in cfg.get(block, []):
            if item.get('img'):
                keys.add(item['img'])
    return sorted(keys)


def build_images(cfg, mode, cfg_dir):
    keys = collect_image_keys(cfg)
    alias = cfg.get('images', {})            # ключ в задании -> имя файла
    if mode == 'remote':
        remote = cfg.get('images_remote', {})
        missing = [k for k in keys if k not in remote]
        if missing:
            sys.exit(f'нет remote-URL для: {", ".join(missing)}')
        return {k: remote[k] for k in keys}

    img_dir = (cfg_dir / cfg.get('images_dir', 'img')).resolve()
    out = {}
    for k in keys:
        fname = alias.get(k, k)
        src = img_dir / f'{fname}.jpg'
        if not src.exists():
            sys.exit(f'нет файла {src}')
        if mode == 'offline':
            out[k] = 'data:image/jpeg;base64,' + base64.b64encode(src.read_bytes()).decode()
        else:
            out[k] = f'img/{fname}.jpg'
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('config')
    ap.add_argument('--mode', default='pages', choices=['pages', 'offline', 'remote'])
    ap.add_argument('-o', '--out')
    a = ap.parse_args()

    cfg_path = pathlib.Path(a.config).resolve()
    cfg = json.loads(cfg_path.read_text(encoding='utf-8'))

    for field in ('unit', 'group', 'students', 'title', 'mc', 'sp', 'pairs', 'ty', 'prep', 'mission'):
        if field not in cfg:
            sys.exit(f'в конфиге нет обязательного поля: {field}')

    images = build_images(cfg, a.mode, cfg_path.parent)
    page_cfg = {k: v for k, v in cfg.items()
                if k not in ('images', 'images_dir', 'images_remote', 'notes')}

    html = TEMPLATE.read_text(encoding='utf-8')
    html = html.replace('__CONFIG__', json.dumps(page_cfg, ensure_ascii=False))
    html = html.replace('__IMAGES__', json.dumps(images, ensure_ascii=False))
    html = html.replace('__ENDPOINT__', cfg.get('endpoint', ENDPOINT))
    html = html.replace('__TITLE__', f"{cfg['title']} · {cfg['group']}")
    for stub in ('__CONFIG__', '__IMAGES__', '__ENDPOINT__', '__TITLE__'):
        if stub in html:
            sys.exit(f'в шаблоне остался {stub}')

    out = pathlib.Path(a.out) if a.out else cfg_path.parent / f'site_{a.mode}.html'
    out.write_text(html, encoding='utf-8')

    n = len(cfg['mc']) + len(cfg['sp']) + len(cfg['pairs']) + len(cfg['ty']) + len(cfg['prep'])
    print(f'{out}  ·  {round(len(html)/1024)} КБ  ·  {len(cfg["students"])} учеников  ·  '
          f'{n} заданий  ·  {len(images)} картинок')


if __name__ == '__main__':
    main()
