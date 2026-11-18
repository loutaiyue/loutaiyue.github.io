(() => {
  const player = document.querySelector(".pc-radio");
  const toggle = player?.querySelector(".pc-radio-toggle");
  const panel = player?.querySelector(".pc-radio-panel");
  const close = player?.querySelector(".pc-radio-close");
  const volume = player?.querySelector("#pc-radio-volume");
  const volumeValue = player?.querySelector(".pc-radio-volume-value");
  const status = player?.querySelector('[role="status"]');
  if (!player || !toggle || !panel || !close || !volume || !volumeValue) return;

  const storageKey = "personal-channel-radio-volume-v1";
  let audioContext = null;
  let output = null;
  let noiseBuffer = null;
  let timer = null;
  let playing = false;
  let step = 0;
  let nextStepAt = 0;
  let savedVolume = 0.18;
  const bpm = 88;
  const stepDuration = 60 / bpm / 4;
  const chords = [
    [48, 55, 59, 62, 64],
    [45, 52, 55, 59, 62],
    [41, 48, 52, 55, 59],
    [43, 50, 53, 57, 60],
  ];
  const melody = [76, null, 79, null, 81, null, 79, 76, 74, null, 76, null, 79, null, 83, null];
  const toFrequency = (midi) => 440 * 2 ** ((midi - 69) / 12);

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (storedValue !== null) {
      const stored = Number(storedValue);
      if (Number.isFinite(stored) && stored >= 0 && stored <= 0.45) {
        savedVolume = stored;
        volume.value = String(stored);
      }
    }
  } catch {
    // Keep the in-memory preference when browser storage is restricted.
  }

  function updateVolumeLabel() {
    volumeValue.value = `${Math.round((Number(volume.value) / 0.45) * 100)}%`;
  }

  function updateControls(message) {
    player.dataset.playing = String(playing);
    toggle.setAttribute("aria-pressed", String(playing));
    const label = playing ? "暂停个人电台音乐" : "播放个人电台音乐";
    toggle.setAttribute("aria-label", label);
    toggle.title = label;
    if (status && message) status.textContent = message;
  }

  function ensureAudio() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) throw new Error("当前浏览器不支持网页音频");
    if (audioContext) return;

    audioContext = new AudioContextConstructor();
    output = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    output.gain.value = 0;
    output.connect(compressor);
    compressor.connect(audioContext.destination);

    noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate, audioContext.sampleRate);
    const noise = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noise.length; i += 1) noise[i] = Math.random() * 2 - 1;
  }

  function envelope(gain, start, peak, attack, decay) {
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay);
  }

  function playTone(frequency, start, duration, peak, type = "triangle", cutoff = 2400) {
    const oscillator = audioContext.createOscillator();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, start);
    envelope(gain, start, peak, 0.015, duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.08);
  }

  function playNoise(start, duration, peak, cutoff, type = "highpass") {
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    source.buffer = noiseBuffer;
    filter.type = type;
    filter.frequency.setValueAtTime(cutoff, start);
    envelope(gain, start, peak, 0.004, duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  function playPad(start, chordIndex) {
    chords[chordIndex].forEach((note, index) => {
      const oscillator = audioContext.createOscillator();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      oscillator.type = index < 2 ? "triangle" : "sawtooth";
      oscillator.frequency.setValueAtTime(toFrequency(note), start);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(index < 2 ? 420 : 720, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(index < 2 ? 0.045 : 0.022, start + 0.2);
      gain.gain.setTargetAtTime(0.0001, start + stepDuration * 15, 0.35);
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      oscillator.start(start);
      oscillator.stop(start + stepDuration * 16 + 0.7);
    });
  }

  function scheduleStep(index, start) {
    const inBar = index % 16;
    if (inBar === 0) playPad(start, Math.floor(index / 16) % chords.length);
    if (inBar === 0 || inBar === 8) {
      const kick = audioContext.createOscillator();
      const gain = audioContext.createGain();
      kick.type = "sine";
      kick.frequency.setValueAtTime(105, start);
      kick.frequency.exponentialRampToValueAtTime(42, start + 0.16);
      gain.gain.setValueAtTime(0.11, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.19);
      kick.connect(gain);
      gain.connect(output);
      kick.start(start);
      kick.stop(start + 0.2);
    }
    if (inBar === 4 || inBar === 12) playNoise(start, 0.12, 0.025, 1800, "bandpass");
    if (inBar % 4 === 2) playNoise(start, 0.035, 0.009, 7200);
    if (inBar % 4 === 0 && melody[inBar] !== null) {
      playTone(toFrequency(melody[inBar]), start, 0.2, 0.018, "triangle", 2600);
    }
    if (inBar === 2 || inBar === 10) {
      const bassNote = chords[Math.floor(index / 16) % chords.length][0] - 12;
      playTone(toFrequency(bassNote), start, 0.27, 0.065, "sine", 300);
    }
  }

  function schedule() {
    const horizon = audioContext.currentTime + 0.14;
    while (nextStepAt < horizon) {
      scheduleStep(step, nextStepAt);
      nextStepAt += stepDuration;
      step = (step + 1) % (chords.length * 16);
    }
  }

  async function start() {
    try {
      ensureAudio();
      await audioContext.resume();
      playing = true;
      step = 0;
      nextStepAt = audioContext.currentTime + 0.05;
      output.gain.cancelScheduledValues(audioContext.currentTime);
      output.gain.setTargetAtTime(Number(volume.value), audioContext.currentTime, 0.08);
      schedule();
      timer = window.setInterval(schedule, 25);
      updateControls("个人电台正在播放原创轻电子循环");
    } catch {
      playing = false;
      updateControls("当前浏览器无法播放网页音频");
    }
  }

  function pause() {
    playing = false;
    window.clearInterval(timer);
    timer = null;
    if (audioContext && output) {
      output.gain.cancelScheduledValues(audioContext.currentTime);
      output.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
    }
    updateControls("个人电台已暂停");
  }

  toggle.addEventListener("click", () => {
    panel.hidden = false;
    if (playing) pause();
    else void start();
  });

  close.addEventListener("click", () => {
    panel.hidden = true;
    toggle.focus();
  });

  volume.addEventListener("input", () => {
    savedVolume = Number(volume.value);
    updateVolumeLabel();
    if (audioContext && output) {
      output.gain.setTargetAtTime(
        playing ? savedVolume : 0,
        audioContext.currentTime,
        0.04,
      );
    }
    try {
      window.localStorage.setItem(storageKey, String(savedVolume));
    } catch {
      // A denied write must not affect playback or the volume control.
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!player.contains(event.target)) panel.hidden = true;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      toggle.focus();
    }
  });

  volume.value = String(savedVolume);
  updateVolumeLabel();
  updateControls();
})();
