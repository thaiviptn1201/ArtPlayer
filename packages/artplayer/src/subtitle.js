import { errorHandle, getExt, setStyles, setStyle } from './utils';

export default class Subtitle {
  constructor(art) {
    this.art = art;
    this.state = true;
    this.vttText = '';
    const { url } = this.art.option.subtitle;
    if (url) {
      this.checkExt(url);
      this.init();
    }
  }

  init() {
    const { events: { proxy }, option: { subtitle }, refs: { $video, $subtitle } } = this.art;
    setStyles($subtitle, subtitle.style || {});
    const $track = document.createElement('track');
    $track.default = true;
    $track.kind = 'metadata';
    this.load(subtitle.url).then(data => {
      $track.src = data;
      $video.appendChild($track);
      this.art.refs.$track = $track;
      if ($video.textTracks && $video.textTracks[0]) {
        const [track] = $video.textTracks;
        proxy(track, 'cuechange', () => {
          const [cue] = track.activeCues;
          $subtitle.innerHTML = '';
          if (cue) {
            const template = document.createElement('div');
            template.appendChild(cue.getCueAsHTML());
            $subtitle.innerHTML = template.innerHTML
              .split(/\r?\n/)
              .map(item => `<p>${item}</p>`)
              .join('');
          }
          this.art.emit('subtitle:update', $subtitle);
        });
      }
    });
  }

  load(url) {
    const { notice } = this.art;
    let type;
    return fetch(url)
      .then(response => {
        type = response.headers.get('Content-Type');
        return response.text();
      })
      .then(text => {
        if ((/x-subrip/gi).test(type)) {
          this.vttText = this.srtToVtt(text);
        } else {
          this.vttText = text;
        }
        return this.vttToBlob(this.vttText);
      })
      .catch(err => {
        notice.show(err);
        console.warn(err);
        throw err;
      });
  }

  srtToVtt(text) {
    return 'WEBVTT \r\n\r\n'.concat(
      text
        .replace(/\{\\([ibu])\}/g, '</$1>')
        .replace(/\{\\([ibu])1\}/g, '<$1>')
        .replace(/\{([ibu])\}/g, '<$1>')
        .replace(/\{\/([ibu])\}/g, '</$1>')
        .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2')
        .concat('\r\n\r\n')
    );
  }

  vttToBlob(vttText) {
    return URL.createObjectURL(
      new Blob([vttText], {
        type: 'text/vtt'
      })
    );
  }

  checkExt(url) {
    const ext = getExt(url);
    errorHandle(
      ext === 'vtt' || ext === 'srt',
      `'subtitle.url' option require 'vtt' or 'srt' format, but got '${ext}'.`
    );
  }

  show() {
    const { refs: { $subtitle }, i18n, notice } = this.art;
    setStyle($subtitle, 'display', 'block');
    this.state = true;
    notice.show(i18n.get('Show subtitle'));
    this.art.emit('subtitle:show', $subtitle);
  }

  hide() {
    const { refs: { $subtitle }, i18n, notice } = this.art;
    setStyle($subtitle, 'display', 'none');
    this.state = false;
    notice.show(i18n.get('Hide subtitle'));
    this.art.emit('subtitle:hide', $subtitle);
  }

  toggle() {
    if (this.state) {
      this.hide();
    } else {
      this.show();
    }
  }

  switch(url) {
    const { $track } = this.art.refs;
    this.checkExt(url);
    errorHandle($track, 'You need to initialize the subtitle option first.');
    this.load(url).then(data => {
      $track.src = data;
      this.art.emit('subtitle:switch', url);
    });
  }
}