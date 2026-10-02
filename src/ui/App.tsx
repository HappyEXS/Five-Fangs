import { LANGUAGES } from '../content/i18n/index.ts';
import { language, t } from '../game/i18n.ts';

export function App() {
  return (
    <div class="screen">
      <h1 class="title">{t('app.title')}</h1>
      <p class="hint">{t('scene.empty.message')}</p>
      <fieldset class="language">
        <legend>{t('settings.language')}</legend>
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            class="language-option"
            aria-pressed={language.value === lang}
            onClick={() => {
              language.value = lang;
            }}
          >
            {t(`language.${lang}`)}
          </button>
        ))}
      </fieldset>
    </div>
  );
}
