// Okno ustawień: język, zapis gry (eksport, import, reset), zgłoszenie problemu.
import { useSignal } from '@preact/signals';
import { useLayoutEffect, useRef } from 'preact/hooks';
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

export function Settings(props: { game: Game; onClose: () => void }) {
  const { game, onClose } = props;
  const message = useSignal<string | null>(null);
  const confirmReset = useSignal(false);
  const report = useSignal<string | null>(null);

  // Okno modalne przeglądarki: samo przejmuje fokus, trzyma go w środku, zamyka się na Escape
  // i wyłącza resztę strony. Otwieramy je przed pierwszym malowaniem, żeby nie mignęło jako
  // zwykły element.
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    dialog.current?.showModal();
  }, []);

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
    <dialog ref={dialog} class="sheet settings" aria-label={t('nav.settings')} onClose={onClose}>
      <header class="settings-head">
        <h2 class="settings-title">{t('nav.settings')}</h2>
        <button type="button" class="btn" data-action="close" onClick={onClose}>
          {t('common.close')}
        </button>
      </header>
      <fieldset class="settings-group">
        <legend>{t('settings.language')}</legend>
        {LANGUAGES.map((lang) => (
          <button
            key={lang}
            type="button"
            class="btn"
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
          class="btn"
          onClick={() => downloadText('five-fangs-save.json', game.exportSave())}
        >
          {t('settings.export')}
        </button>
        <label class="btn">
          {t('settings.import')}
          <input type="file" accept="application/json,.json" hidden onChange={onImport} />
        </label>
        {confirmReset.value ? (
          <>
            <span>{t('settings.reset.confirm')}</span>
            <button
              type="button"
              class="btn btn-danger"
              onClick={() => {
                game.resetProgress();
                confirmReset.value = false;
              }}
            >
              {t('settings.reset.yes')}
            </button>
            <button
              type="button"
              class="btn"
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
            class="btn"
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
        <button type="button" class="btn" onClick={onReport}>
          {t('settings.report.copy')}
        </button>
      </fieldset>
      {message.value !== null && <p class="settings-message">{message.value}</p>}
      {report.value !== null && <textarea class="report" readOnly value={report.value} />}
      <p class="note">{t('app.version', { version: versionLabel(gameVersion) })}</p>
    </dialog>
  );
}
