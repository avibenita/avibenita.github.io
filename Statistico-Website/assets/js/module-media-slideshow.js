(function () {
  const STYLE_ID = 'statistico-media-slideshow-style';

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .media-showcase {
        min-height: 430px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) 310px;
        gap: 18px;
        height: 100%;
      }
      .media-showcase-stage {
        position: relative;
        min-height: 390px;
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid rgba(120,200,255,.18);
        background:
          radial-gradient(circle at 18% 12%, rgba(120,200,255,.16), transparent 34%),
          radial-gradient(circle at 82% 10%, rgba(255,165,120,.13), transparent 36%),
          linear-gradient(160deg, rgba(8,16,30,.92), rgba(3,8,18,.96));
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.05), 0 18px 46px rgba(0,0,0,.34);
      }
      .media-showcase-stage::after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, transparent 58%, rgba(3,8,18,.56));
      }
      .media-showcase-frame {
        width: 100%;
        height: 100%;
        min-height: 390px;
        display: block;
        object-fit: contain;
        background: rgba(0,0,0,.24);
      }
      .media-showcase-empty {
        height: 100%;
        min-height: 390px;
        display: grid;
        place-items: center;
        color: rgba(255,255,255,.62);
        text-align: center;
        padding: 24px;
      }
      .media-showcase-error {
        position: absolute;
        inset: auto 18px 86px 18px;
        z-index: 3;
        display: none;
        padding: 11px 13px;
        border-radius: 14px;
        border: 1px solid rgba(239,68,68,.34);
        background: rgba(127,29,29,.72);
        color: rgba(254,226,226,.96);
        font-size: .78rem;
        line-height: 1.4;
        backdrop-filter: blur(10px);
      }
      .media-showcase-error.is-visible {
        display: block;
      }
      .media-showcase-caption {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 16px;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 12px 14px;
        border-radius: 16px;
        background: rgba(5,12,24,.74);
        border: 1px solid rgba(255,255,255,.10);
        backdrop-filter: blur(12px);
      }
      .media-showcase-counter {
        color: rgba(214,238,255,.82);
        font-size: .74rem;
        font-weight: 850;
        letter-spacing: .08em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .media-showcase-controls {
        display: inline-flex;
        gap: 8px;
      }
      .media-showcase-control {
        width: 34px;
        height: 34px;
        border-radius: 12px;
        border: 1px solid rgba(120,200,255,.28);
        background: rgba(120,200,255,.10);
        color: rgba(235,247,255,.92);
        cursor: pointer;
        font: inherit;
        transition: transform .18s ease, border-color .18s ease, background .18s ease;
      }
      .media-showcase-control:hover {
        transform: translateY(-1px);
        border-color: rgba(255,165,120,.58);
        background: rgba(255,165,120,.16);
      }
      .media-showcase-panel {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .media-showcase-copy {
        padding: 18px;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.10);
        background:
          radial-gradient(circle at 18% 0%, rgba(255,165,120,.14), transparent 42%),
          linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.025));
      }
      .media-showcase-eyebrow {
        margin: 0 0 8px;
        color: rgba(120,200,255,.86);
        font-size: .68rem;
        font-weight: 850;
        letter-spacing: .12em;
        text-transform: uppercase;
      }
      .media-showcase-copy h4 {
        margin: 0 0 8px;
        color: #fff;
        font-size: 1.15rem;
        line-height: 1.12;
        letter-spacing: -.02em;
      }
      .media-showcase-copy p {
        margin: 0;
        color: rgba(255,255,255,.66);
        font-size: .86rem;
        line-height: 1.55;
      }
      .media-showcase-thumbs {
        display: grid;
        gap: 10px;
        overflow: auto;
        padding-right: 4px;
      }
      .media-showcase-thumb {
        display: grid;
        grid-template-columns: 38px minmax(0, 1fr);
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.04);
        color: rgba(255,255,255,.72);
        cursor: pointer;
        text-align: left;
        font: inherit;
      }
      .media-showcase-thumb.is-active {
        border-color: rgba(255,165,120,.62);
        background: linear-gradient(145deg, rgba(255,165,120,.16), rgba(120,200,255,.08));
        color: #fff;
        box-shadow: 0 0 0 1px rgba(255,165,120,.14), 0 10px 24px rgba(0,0,0,.18);
      }
      .media-showcase-thumb-icon {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: grid;
        place-items: center;
        background: rgba(120,200,255,.10);
        color: rgba(120,200,255,.92);
      }
      .media-showcase-thumb strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: .78rem;
      }
      .media-showcase-thumb span {
        display: block;
        margin-top: 2px;
        color: rgba(255,255,255,.42);
        font-size: .66rem;
      }
      @media (max-width: 980px) {
        .media-showcase {
          grid-template-columns: 1fr;
        }
        .media-showcase-panel {
          order: -1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function mediaType(item) {
    if (item.type) return item.type;
    return /\.(mp4|webm|mov)$/i.test(item.src || '') ? 'video' : 'image';
  }

  function iconFor(item) {
    return mediaType(item) === 'video' ? 'fa-film' : 'fa-image';
  }

  function renderMedia(item) {
    if (!item) {
      return '<div class="media-showcase-empty">Add MP4 or PNG entries to this module media manifest.</div>';
    }
    if (mediaType(item) === 'video') {
      return `
        <video class="media-showcase-frame" controls autoplay muted loop playsinline preload="auto">
          <source src="${item.src}" type="video/mp4">
        </video>
        <div class="media-showcase-error" data-media-error>
          This video could not be displayed by the browser. Check that the MP4 uses web-compatible H.264/AAC encoding.
        </div>`;
    }
    return `<img class="media-showcase-frame" src="${item.src}" alt="${item.title || 'Module slide'}" loading="lazy">`;
  }

  function render(container, config) {
    ensureStyles();
    const items = (config && config.items) || [];
    let activeIndex = 0;

    function draw() {
      const active = items[activeIndex];
      container.innerHTML = `
        <div class="media-showcase">
          <section class="media-showcase-stage">
            ${renderMedia(active)}
            <div class="media-showcase-caption">
              <div class="media-showcase-counter">${items.length ? activeIndex + 1 : 0} / ${items.length || 0}</div>
              <div class="media-showcase-controls">
                <button type="button" class="media-showcase-control" data-dir="-1" aria-label="Previous media">‹</button>
                <button type="button" class="media-showcase-control" data-dir="1" aria-label="Next media">›</button>
              </div>
            </div>
          </section>
          <aside class="media-showcase-panel">
            <article class="media-showcase-copy">
              <p class="media-showcase-eyebrow">${config.eyebrow || 'Module media tour'}</p>
              <h4>${active && active.title ? active.title : config.title || 'Add a slide title'}</h4>
              <p>${active && active.description ? active.description : config.description || 'Add a short explanation for this media item in the module manifest.'}</p>
            </article>
            <div class="media-showcase-thumbs">
              ${items.map((item, index) => `
                <button type="button" class="media-showcase-thumb${index === activeIndex ? ' is-active' : ''}" data-index="${index}">
                  <span class="media-showcase-thumb-icon"><i class="fa-solid ${iconFor(item)}"></i></span>
                  <span>
                    <strong>${item.title || `Slide ${index + 1}`}</strong>
                    <span>${mediaType(item) === 'video' ? 'MP4 walkthrough' : 'PNG still'}</span>
                  </span>
                </button>
              `).join('')}
            </div>
          </aside>
        </div>`;

      container.querySelectorAll('[data-dir]').forEach(button => {
        button.addEventListener('click', () => {
          if (!items.length) return;
          activeIndex = (activeIndex + Number(button.dataset.dir) + items.length) % items.length;
          draw();
        });
      });
      container.querySelectorAll('[data-index]').forEach(button => {
        button.addEventListener('click', () => {
          activeIndex = Number(button.dataset.index);
          draw();
        });
      });

      const video = container.querySelector('.media-showcase-frame');
      const error = container.querySelector('[data-media-error]');
      if (video && video.tagName === 'VIDEO') {
        video.addEventListener('error', () => {
          if (error) error.classList.add('is-visible');
        }, { once: true });
        video.load();
        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === 'function') {
          playAttempt.catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      }
    }

    draw();
  }

  window.StatisticoMediaSlideshow = { render };
})();
