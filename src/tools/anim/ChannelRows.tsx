// Wiersze kanałów edytora animacji: suwak wartości, pole liczbowe, ścieżka klatek kluczowych.
import { snapTime } from './clip-edit.ts';
import type { AnimEditor, ChannelInfo } from './state.ts';

/** Zakres suwaka: kąty w stopniach, przesunięcia korzenia w jednostkach rigu. */
const ANGLE_RANGE = 180;
const OFFSET_RANGE = 20;

/** Czas 0..1 dla pozycji wskaźnika na ścieżce. */
function timeAt(track: Element, clientX: number): number {
  const rect = track.getBoundingClientRect();
  return rect.width === 0 ? 0 : snapTime((clientX - rect.left) / rect.width);
}

/**
 * Ścieżka kanału: klatki kluczowe jako znaczniki, igła bieżącego czasu. Kliknięcie ustawia czas,
 * kliknięcie klatki do niej przeskakuje, przeciągnięcie klatki ze środka klipu ją przesuwa.
 */
function Track(props: { editor: AnimEditor; channel: string }) {
  const { editor, channel } = props;
  const keys = editor.clip.value.channels[channel] ?? [];
  const now = editor.time.value;
  return (
    <div
      class="anim-track"
      onPointerDown={(event) => {
        if (event.target !== event.currentTarget) return;
        // Zgrubne ustawianie czasu kliknięciem: co setną część klipu.
        editor.setTime(Math.round(timeAt(event.currentTarget, event.clientX) * 100) / 100);
      }}
    >
      {keys.map(([time], index) => {
        const movable = index > 0 && index < keys.length - 1;
        return (
          <button
            type="button"
            // Kluczem jest indeks, nie czas: element musi przetrwać przesuwanie klatki,
            // inaczej przeglądarka zgubi przechwycony wskaźnik.
            key={index}
            class="anim-key"
            aria-label={`klatka ${channel} w czasie ${time}`}
            aria-pressed={Math.abs(time - now) < 0.0005}
            style={{ left: `${time * 100}%` }}
            onPointerDown={(event) => {
              editor.playing.value = false;
              editor.setTime(time);
              if (movable) event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!movable || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              const track = event.currentTarget.parentElement;
              if (track === null) return;
              // Klatka podąża za wskaźnikiem; bieżący czas idzie razem z nią.
              editor.moveKey(channel, editor.time.value, timeAt(track, event.clientX));
            }}
          />
        );
      })}
      <span class="anim-needle" style={{ left: `${now * 100}%` }} />
    </div>
  );
}

function ChannelRow(props: { editor: AnimEditor; channel: ChannelInfo }) {
  const { editor, channel } = props;
  const value = editor.valueAt(channel);
  const range = channel.isBone ? ANGLE_RANGE : OFFSET_RANGE;
  const hasKey = editor.hasKey(channel.id);
  const animated = editor.clip.value.channels[channel.id] !== undefined;
  return (
    <div class="anim-row">
      <span class={animated ? 'anim-name' : 'anim-name anim-name-rest'}>{channel.id}</span>
      <input
        type="range"
        aria-label={`${channel.id}: wartość`}
        min={-range}
        max={range}
        step={channel.isBone ? 1 : 0.5}
        value={value}
        onInput={(event) => editor.setValue(channel, Number(event.currentTarget.value))}
      />
      <input
        type="number"
        aria-label={`${channel.id}: wartość liczbowo`}
        step={channel.isBone ? 1 : 0.5}
        value={Math.round(value * 10) / 10}
        onChange={(event) => {
          const next = Number(event.currentTarget.value);
          if (Number.isFinite(next)) editor.setValue(channel, next);
        }}
      />
      <Track editor={editor} channel={channel.id} />
      <button
        type="button"
        title={hasKey ? 'usuń klatkę w bieżącym czasie' : 'dodaj klatkę w bieżącym czasie'}
        aria-pressed={hasKey}
        disabled={hasKey && !editor.canRemoveKey(channel.id)}
        onClick={() => editor.toggleKey(channel)}
      >
        ◆
      </button>
    </div>
  );
}

/** Ścieżka znaczników (np. `hit`) nad kanałami, w tej samej skali czasu. */
function MarkerRow(props: { editor: AnimEditor }) {
  const { editor } = props;
  const markers = Object.entries(editor.clip.value.markers);
  return (
    <div class="anim-row">
      <span class="anim-name">znaczniki</span>
      <span />
      <span />
      <div class="anim-track">
        {markers.map(([name, time]) => (
          <button
            type="button"
            key={name}
            class="anim-marker"
            title={`${name}: ${time}`}
            style={{ left: `${time * 100}%` }}
            onClick={() => editor.setTime(time)}
          >
            {name}
          </button>
        ))}
        <span class="anim-needle" style={{ left: `${editor.time.value * 100}%` }} />
      </div>
      <span />
    </div>
  );
}

export function ChannelRows(props: { editor: AnimEditor }) {
  const { editor } = props;
  return (
    <div class="anim-channels">
      <MarkerRow editor={editor} />
      {editor.channels.value.map((channel) => (
        <ChannelRow key={channel.id} editor={editor} channel={channel} />
      ))}
    </div>
  );
}
