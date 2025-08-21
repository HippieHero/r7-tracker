# R7 Tracker — Vercel Starter (Vite + React + PWA)

## Как задеплоить через Vercel
1. Скачай архив ниже и распакуй у себя.
2. Создай пустой репозиторий на GitHub (например `r7-tracker`).
3. Залей файлы из папки (кнопка **Add files → Upload files** в веб‑интерфейсе GitHub).
4. На vercel.com → **New Project** → **Import Git Repository** → выбери `r7-tracker`.
5. Framework: Vite (подхватится автоматически). Build: `npm run build`. Output: `dist`.
6. Готово: получишь `https://<project>.vercel.app`. Эту ссылку ставь в Telegram/на сайт.

### Параметры для автозаполнения
`?mode=home|gym&level=S|M|P&start=YYYY-MM-DD&name=Мария&days=30`

- Иконки PWA: `public/icons/`. Замени на брендовые PNG.
- Цвет статус‑бара: `index.html` (`theme-color`) и `public/manifest.webmanifest`.
- Сервис‑воркер: `public/service-worker.js` (простая cache-first стратегия).
