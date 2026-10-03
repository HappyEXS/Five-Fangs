// Panel edytora animacji: wybór rigu, skórki, postawy i klipu, odtwarzanie, kanały, znaczniki,
// walidacja oraz eksport i import klipu. Narzędzie deweloperskie, więc teksty bez i18n.
import { useSignal } from '@preact/signals';
import type { RawRig } from '../../content/schema-rig.ts';
import { ChannelRows } from './ChannelRows.tsx';
import type { AnimEditor } from './state.ts';

export interface AnimPanelProps {
  readonly editor: AnimEditor;
  readonly skinsOf: (rig: RawRig) => readonly string[];
}

function Select(props: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {props.label}
      <select value={props.value} onChange={(event) => props.onChange(event.currentTarget.value)}>
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Selection(props: AnimPanelProps) {
  const { editor } = props;
  const newName = useSignal('');
  const error = useSignal<string | null>(null);
  const rig = editor.rig.value;
  return (
    <div class="anim-bar">
      <Select
        label="rig"
        value={editor.rigId.value}
        options={editor.rigIds}
        onChange={editor.selectRig}
      />
      <Select
        label="skórka"
        value={editor.skin.value}
        options={props.skinsOf(rig)}
        onChange={(value) => {
          editor.skin.value = value;
        }}
      />
      <Select
        label="postawa"
        value={editor.stance.value}
        options={Object.keys(rig.stances)}
        onChange={(value) => {
          editor.stance.value = value;
        }}
      />
      <Select
        label="klip"
        value={editor.clipName.value}
        options={Object.keys(editor.clips.value)}
        onChange={editor.selectClip}
      />
      <label>
        <input
          type="checkbox"
          checked={editor.clip.value.loop}
          onChange={(event) => editor.setLoop(event.currentTarget.checked)}
        />
        pętla
      </label>
      <button type="button" disabled={!editor.dirty.value} onClick={editor.resetClip}>
        przywróć
      </button>
      <input
        type="text"
        placeholder="nowy klip"
        aria-label="nazwa nowego klipu"
        value={newName.value}
        onInput={(event) => {
          newName.value = event.currentTarget.value;
        }}
      />
      <button
        type="button"
        onClick={() => {
          error.value = editor.newClip(newName.value.trim());
          if (error.value === null) newName.value = '';
        }}
      >
        utwórz
      </button>
      {error.value !== null && <span class="anim-error">{error.value}</span>}
    </div>
  );
}

function Playback(props: { editor: AnimEditor }) {
  const { editor } = props;
  const markerName = useSignal('hit');
  const error = useSignal<string | null>(null);
  return (
    <div class="anim-bar">
      <button
        type="button"
        aria-pressed={editor.playing.value}
        onClick={() => {
          editor.playing.value = !editor.playing.value;
        }}
      >
        {editor.playing.value ? 'pauza' : 'odtwarzaj'} (spacja)
      </button>
      <button type="button" title="poprzednia klatka (,)" onClick={() => editor.stepKey(-1)}>
        ◀
      </button>
      <button type="button" title="następna klatka (.)" onClick={() => editor.stepKey(1)}>
        ▶
      </button>
      <input
        class="anim-scrub"
        type="range"
        aria-label="czas klipu"
        min={0}
        max={1}
        step={0.001}
        value={editor.time.value}
        onInput={(event) => {
          editor.playing.value = false;
          editor.setTime(Number(event.currentTarget.value));
        }}
      />
      <input
        type="number"
        aria-label="czas klipu liczbowo"
        min={0}
        max={1}
        step={0.01}
        value={Math.round(editor.time.value * 1000) / 1000}
        onChange={(event) => editor.setTime(Number(event.currentTarget.value))}
      />
      <label>
        czas (s)
        <input
          type="number"
          min={0.1}
          max={10}
          step={0.1}
          value={editor.duration.value}
          onChange={(event) => {
            const seconds = Number(event.currentTarget.value);
            if (seconds > 0) editor.duration.value = seconds;
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={editor.pivots.value}
          onChange={(event) => {
            editor.pivots.value = event.currentTarget.checked;
          }}
        />
        pivoty
      </label>
      <input
        type="text"
        aria-label="nazwa znacznika"
        value={markerName.value}
        onInput={(event) => {
          markerName.value = event.currentTarget.value;
        }}
      />
      <button
        type="button"
        title="ustaw znacznik w bieżącym czasie"
        onClick={() => {
          error.value = editor.addMarker(markerName.value.trim());
        }}
      >
        znacznik tutaj
      </button>
      <button type="button" onClick={() => editor.removeMarker(markerName.value.trim())}>
        usuń znacznik
      </button>
      {error.value !== null && <span class="anim-error">{error.value}</span>}
    </div>
  );
}

function ClipIo(props: { editor: AnimEditor }) {
  const { editor } = props;
  const importText = useSignal('');
  const message = useSignal<string | null>(null);
  return (
    <div class="anim-io">
      <div>
        <div class="anim-bar">
          <span>eksport: wpis do "clips" w pliku rigu</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(editor.exportText.value).then(
                () => {
                  message.value = 'skopiowano';
                },
                () => {
                  message.value = 'schowek niedostępny; zaznacz tekst ręcznie';
                },
              );
            }}
          >
            kopiuj
          </button>
        </div>
        <textarea readOnly aria-label="eksport klipu" value={editor.exportText.value} />
      </div>
      <div>
        <div class="anim-bar">
          <span>import: wklej klip</span>
          <button
            type="button"
            onClick={() => {
              const error = editor.importText(importText.value);
              message.value = error ?? 'wczytano';
              if (error === null) importText.value = '';
            }}
          >
            wczytaj
          </button>
          {message.value !== null && <span>{message.value}</span>}
        </div>
        <textarea
          aria-label="import klipu"
          value={importText.value}
          onInput={(event) => {
            importText.value = event.currentTarget.value;
          }}
        />
      </div>
    </div>
  );
}

export function AnimPanel(props: AnimPanelProps) {
  const { editor } = props;
  const issues = editor.issues.value;
  return (
    <div class="anim-panel">
      <Selection {...props} />
      <Playback editor={editor} />
      <ChannelRows editor={editor} />
      <div class={issues.length === 0 ? 'anim-valid' : 'anim-error'}>
        {issues.length === 0
          ? 'walidacja treści: OK'
          : issues.map((issue) => <div key={issue}>{issue}</div>)}
      </div>
      <ClipIo editor={editor} />
    </div>
  );
}
