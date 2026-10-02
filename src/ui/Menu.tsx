// Menu główne i ustawienia: język, zapis gry (eksport, import, reset), zgłoszenie problemu.
import { useSignal } from '@preact/signals';
import { LANGUAGES } from '../content/i18n/index.ts';
import { recentErrors } from '../game/errors.ts';
import type { Game } from '../game/game.ts';
import { language, t } from '../game/i18n.ts';
import { buildReport } from '../game/report.ts';
import { gameVersion, versionLabel } from '../game/version.ts';

function downloadText(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function Settings(props: { game: Game; onClose: () => void }) {
  const { game } = props;
  const message = useSignal<string | null>(null);
  const confirmReset = useSignal(false);
  const report = useSignal<string | null>(null);

  const onImport = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined) return;
    void file.text().then((text) => {
      const outcome = game.importSave(text);
      message.value = t(
        outcome === 'ok'
          ? 'settings.import.ok'
          : outcome === 'newer'
            ? 'settings.import.newer'
            : 'settings.import.corrupt',
      );
    });
  };

  const onReport = (): void => {
    const text = buildReport({
      version: gameVersion,
      userAgent: navigator.userAgent,
      language: language.value,
      screen: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}`,
      scene: game.scene.value.name,
      save: game.save.value,
      errors: recentErrors(),
      lastBattle: game.lastBattle.value,
      now: new Date(),
    });
    navigator.clipboard.writeText(text).then(
      () => {
        report.value = null;
        message.value = t('settings.report.copied');
      },
      () => {
        // Schowek bywa zablokowany; wtedy gracz kopiuje raport z pola tekstowego.
        report.value = text;
        message.value = t('settings.report.manual');
      },
    );
  };

  return (
    <section class="panel settings" aria-label={t('menu.settings')}>
      <fieldset class="settings-group">
        <legend>{t('settings.language')}</legend>
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            class="button"
            aria-pressed={language.value === lang}
            onClick={() => game.setLanguage(lang)}
          >
            {t(`language.${lang}`)}
          </button>
        ))}
      </fieldset>
      <fieldset class="settings-group">
        <legend>{t('settings.save')}</legend>
        <button
          type="button"
          class="button"
          onClick={() => downloadText('five-fangs-save.json', game.exportSave())}
        >
          {t('settings.export')}
        </button>
        <label class="button">
          {t('settings.import')}
          <input type="file" accept="application/json,.json" hidden onChange={onImport} />
        </label>
        {confirmReset.value ? (
          <>
            <span>{t('settings.reset.confirm')}</span>
            <button
              type="button"
              class="button button-danger"
              onClick={() => {
                game.resetProgress();
                confirmReset.value = false;
              }}
            >
              {t('settings.reset.yes')}
            </button>
            <button
              type="button"
              class="button"
              onClick={() => {
                confirmReset.value = false;
              }}
            >
              {t('common.cancel')}
            </button>
          </>
        ) : (
          <button
            type="button"
            class="button"
            onClick={() => {
              confirmReset.value = true;
            }}
          >
            {t('settings.reset')}
          </button>
        )}
      </fieldset>
      <fieldset class="settings-group">
        <legend>{t('settings.report')}</legend>
        <button type="button" class="button" onClick={onReport}>
          {t('settings.report.copy')}
        </button>
      </fieldset>
      {message.value !== null && <p class="settings-message">{message.value}</p>}
      {report.value !== null && <textarea class="report" readOnly value={report.value} />}
      <button type="button" class="button" onClick={props.onClose}>
        {t('common.close')}
      </button>
    </section>
  );
}

export function Menu(props: { game: Game }) {
  const { game } = props;
  const settings = useSignal(false);
  return (
    <div class="screen menu">
      <h1 class="title">{t('app.title')}</h1>
      {settings.value ? (
        <Settings
          game={game}
          onClose={() => {
            settings.value = false;
          }}
        />
      ) : (
        <nav class="menu-actions">
          <button
            type="button"
            class="button button-primary"
            onClick={() => game.go({ name: 'map' })}
          >
            {t('menu.play')}
          </button>
          <button
            type="button"
            class="button"
            onClick={() => game.go({ name: 'heroes', back: { name: 'menu' } })}
          >
            {t('heroes.title')}
          </button>
          <button
            type="button"
            class="button"
            onClick={() => {
              settings.value = true;
            }}
          >
            {t('menu.settings')}
          </button>
        </nav>
      )}
      <footer class="version">{t('app.version', { version: versionLabel(gameVersion) })}</footer>
    </div>
  );
}
