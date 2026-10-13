# Как добавлять новости (Pages CMS)

## Один раз: подключить сайт

1. Распакуйте архив в корень репозитория `settwor.github.io` (папки сохраняются) и сделайте commit.
   Файлы, которых нет в архиве (`bio.html`, `photo.html`, `releases.html`, `images/…`), не трогайте.
2. **Удалите** старый файл `news/First-Track-in-the-Brazilian-Funk-Genre_(12-12-2025).html`:
   теперь эта статья создаётся из `_posts/2025-12-12-first-track-in-the-brazilian-funk-genre.md`
   по тому же адресу. Файл `news/SE-TU-QUER-…html` оставьте.
3. В репозитории не должно быть файла `.nojekyll`. Если он есть, удалите его.
4. GitHub → Settings → Pages: Source = «Deploy from a branch», ветка `main`, папка `/ (root)`.
   После commit откройте вкладку Actions: сборка «pages build and deployment» должна стать зелёной.
5. Откройте https://app.pagescms.org, войдите через GitHub, установите приложение на репозиторий
   `settwor.github.io` и откройте его. Слева появится раздел **News**.

## Новая статья с телефона

1. app.pagescms.org → репозиторий → **News** → **Add an entry**.
2. Заполните поля:
   - **Title**: заголовок.
   - **Short summary**: 1–2 предложения (до 160 знаков). Показывается в Google и в превью ссылок.
   - **Date and time**: когда опубликовано.
   - **Cover picture**: загрузите фото (от 1200 px в ширину). Лучше заранее уменьшить до ~1600 px:
     Pages CMS кладёт файл в репозиторий как есть.
   - **Describe the picture**: что на фото, обычными словами (для поиска и доступности).
   - **Text of the article**: текст.
   - **Link to the release**: ссылка на Spotify (необязательно): появится кнопка «Open on Spotify».
3. Поля **Custom address** и **Old page address** оставьте пустыми.
4. Нажмите **Save**. Через 1–2 минуты статья появится на `news.html`, на главной (3 последние) и в `sitemap.xml`.

## Исправить статью после публикации

Откройте статью, поправьте текст и заполните **Date of the last correction**.
Страница покажет «Updated», а Google увидит новую дату изменения. Дату публикации не меняйте.

## Один раз после запуска

- Search Console → Sitemaps → добавьте `sitemap.xml`.
- Search Console → URL Inspection → вставьте адрес новой статьи → Request indexing.
- Проверьте разметку: https://search.google.com/test/rich-results (должна быть найдена NewsArticle).

## Статья SE TU QUER

Пока это запись-ссылка на старую страницу. Чтобы перенести её в редактор:
1. Откройте запись SE TU QUER в Pages CMS, вставьте текст из старой статьи в **Text of the article**.
2. В **Custom address** впишите `/news/SE-TU-QUER-Sets-a-New-Record-in-SETTWORs-History_(14-01-2026).html`
   и очистите **Old page address**.
3. Удалите файл `news/SE-TU-QUER-Sets-a-New-Record-in-SETTWORs-History_(14-01-2026).html`
   из репозитория (иначе будет конфликт адресов).

## Проверка на своём компьютере (со стилями)

Файлы сайта нельзя открывать двойным щелчком: страницы собираются Jekyll, а пути вида `/css/main.css` работают только с сервером.
1. Один раз: установите Python 3 и выполните `pip install pyyaml markdown`.
2. В папке сайта выполните `python3 tools/serve.py` и откройте http://localhost:8000.
3. После правок остановите сервер (Ctrl+C) и запустите снова.
Это упрощённая сборка для проверки вёрстки и текстов. Точную проверку даёт вкладка Actions на GitHub.
Картинок, которых нет в папке, локально не будет видно только если их нет в репозитории.

## Если страница news.html даёт 404

1. В корне репозитория должен лежать файл `news.html` (из архива).
2. Вкладка Actions: последняя сборка должна быть зелёной.
3. Подождите 1–2 минуты после сборки и обновите страницу с Ctrl+F5.
