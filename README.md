# RoastPro Automation

Автоматична генерація й публікація Instagram/Threads-каруселей для @roastpro.ca.
Працює як cron-задача на GitHub Actions — без сервера, без ручного запуску.

## Як це працює

1. **Генерація тексту** — Claude API пише тему, заголовок, статистику, чек-лист і CTA для нової каруселі (5 слайдів). Перед генерацією скрипт читає файл `data/topics-history.json` (останні ~15 тем) і просить Claude не повторювати їх — після публікації нова тема дописується туди ж, тож з часом теми не зациклюються.
2. **Рендер слайдів** — Puppeteer заповнює HTML-шаблони (`templates/`) згенерованим текстом і робить із них PNG (1080×1080).
3. **Хостинг картинок** — готові PNG комітяться в окрему гілку цього ж репозиторію (`generated-media`) і стають доступні за публічним посиланням `raw.githubusercontent.com` — це потрібно, бо Instagram/Threads API самі завантажують картинку за URL, файл їм не передати напряму.
4. **Публікація** — карусель іде в Instagram (усі 4 слайди), перший слайд і той самий підпис — окремим постом у Threads.
5. **Розклад** — GitHub Actions запускає весь пайплайн автоматично двічі на тиждень (вівторок і четвер, налаштовується в `.github/workflows/post-carousel.yml`).

## Налаштування (один раз)

### 1. Завантаж цей проєкт на GitHub

```bash
cd roastpro-automation
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ТВІЙ_ЮЗЕРНЕЙМ/roastpro-automation.git
git push -u origin main
```

**Важливо:** репозиторій має бути **публічним** — інакше `raw.githubusercontent.com` посилання на картинки не будуть доступні для Instagram/Threads серверів. Якщо не хочеш публічний репозиторій — заміни `src/hostImages.js` на завантаження в інший сервіс (Vercel Blob, Cloudinary, S3 тощо).

### 2. Додай секрети в GitHub

Settings → Secrets and variables → Actions → New repository secret. Додай:

| Назва | Що це |
|---|---|
| `ANTHROPIC_API_KEY` | Твій ключ з console.anthropic.com |
| `IG_ACCESS_TOKEN` | Access token з Meta Developer Console (Instagram use case) |
| `THREADS_ACCESS_TOKEN` | Access token з Meta Developer Console (Threads use case) |

`GITHUB_TOKEN` додавати не треба — GitHub Actions видає його автоматично для кожного запуску з правами запису в цей самий репозиторій.

### 3. Перевір розклад

Відкрий `.github/workflows/post-carousel.yml` — рядок `cron: '0 14 * * 2,4'` означає вівторок і четвер о 14:00 UTC (10:00 ранку за Торонто, взимку; влітку зсунеться на годину через літній час — просто врахуй це або постав `13 * * 2,4` для точнішого влучання). [crontab.guru](https://crontab.guru) допомагає підібрати вираз.

### 4. Тестовий запуск

Не чекай на розклад — запусти вручну:
GitHub → вкладка **Actions** → **Post RoastPro carousel** → **Run workflow**.

Перевір логи виконання: якщо щось впаде (наприклад, невірний токен), помилка буде видно прямо там.

## Локальне тестування (опційно)

```bash
npm install
cp .env.example .env   # заповни реальними значеннями
node --env-file=.env src/index.js
```

## Структура проєкту

```
templates/          — HTML-шаблони слайдів (hook, stat, checklist, cta)
src/generateContent.js  — генерація тексту через Claude API
src/topicHistory.js     — читає/дописує data/topics-history.json, щоб теми не повторювались
src/renderSlides.js     — Puppeteer: HTML → PNG
src/hostImages.js       — публікація PNG у GitHub для публічних URL
src/publish.js          — виклики Instagram/Threads Graph API
src/index.js            — оркестратор усього пайплайну
.github/workflows/      — розклад cron-задачі
```

## Що можна допрацювати далі

- Додати п'ятий слайд (наприклад, "до/після" або відгук)
- Логувати опубліковані пости в окремий файл, щоб бачити історію без заходу в Instagram
- Додати автоматичні чернетки відповідей на коментарі (окремий скрипт + webhook)
- Змінити частоту в cron-розкладі, коли буде видно перші метрики
