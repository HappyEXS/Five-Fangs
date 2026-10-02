import { t } from '../game/i18n.ts';
import { loadFailure, reloadGame } from '../game/update.ts';

/** Komunikat po nieudanym ładowaniu: nowa wersja gry albo problem z połączeniem. */
export function LoadFailureBanner() {
  const failure = loadFailure.value;
  if (failure === 'none') return null;
  const isUpdate = failure === 'update';
  return (
    <div class="banner" role="alert">
      <span>{t(isUpdate ? 'update.available' : 'load.failed')}</span>
      <button type="button" class="banner-action" onClick={() => reloadGame()}>
        {t(isUpdate ? 'update.reload' : 'load.retry')}
      </button>
    </div>
  );
}
