/* Local, dependency-free controls for the project page. */
(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const videos = [...document.querySelectorAll('.result-video')];
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const autoplayButton = document.querySelector('#autoplay');
  const speedSelect = document.querySelector('#playback-speed');
  const dialog = document.querySelector('#video-dialog');
  const dialogVideo = document.querySelector('#dialog-video');
  let autoplay = !motionPreference.matches;
  let speed = 1;
  let dialogSource = null;
  const visible = new Set();
  const manualPause = new WeakSet();
  const systemPause = new WeakSet();
  const pause = video => {
    if (!video.paused) { systemPause.add(video); video.pause(); }
  };
  const play = video => {
    video.muted = true;
    video.playbackRate = speed;
    const promise = video.play();
    if (promise) promise.catch(() => {});
  };
  const eligible = video => !video.closest('[hidden]') && !document.hidden && !dialog.open;
  function updateAutoplayLabel() {
    autoplayButton.setAttribute('aria-pressed', String(autoplay));
    document.querySelector('#autoplay-label').textContent = `Autoplay ${autoplay ? 'on' : 'off'}`;
  }
  function resumeVisible() {
    if (autoplay) visible.forEach(video => {
      if (eligible(video) && !manualPause.has(video)) play(video);
    });
  }
  videos.forEach(video => {
    video.addEventListener('pause', () => {
      if (systemPause.has(video)) systemPause.delete(video);
      else if (eligible(video) && visible.has(video)) manualPause.add(video);
    });
    video.addEventListener('play', () => manualPause.delete(video));
    video.addEventListener('error', () => {
      const message = video.parentElement.querySelector('.video-error');
      if (message) message.hidden = false;
    });
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target;
        if (entry.isIntersecting) {
          visible.add(video);
          if (autoplay && eligible(video) && !manualPause.has(video)) play(video);
        } else {
          visible.delete(video);
          pause(video);
        }
      });
    }, { threshold: 0.22 });
    videos.forEach(video => observer.observe(video));
  }
  autoplayButton.addEventListener('click', () => {
    autoplay = !autoplay;
    updateAutoplayLabel();
    if (autoplay) { videos.forEach(video => manualPause.delete(video)); resumeVisible(); }
    else videos.forEach(pause);
  });
  motionPreference.addEventListener('change', event => {
    if (event.matches) { autoplay = false; videos.forEach(pause); updateAutoplayLabel(); }
  });
  speedSelect.addEventListener('change', () => {
    speed = Number(speedSelect.value);
    [...videos, dialogVideo].forEach(video => { video.playbackRate = speed; });
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { videos.forEach(pause); dialogVideo.pause(); }
    else resumeVisible();
  });
  document.querySelectorAll('[data-filter-section]').forEach(toolbar => {
    const section = document.getElementById(toolbar.dataset.filterSection);
    const cards = [...section.querySelectorAll('.video-card')];
    const buttons = [...toolbar.querySelectorAll('[data-filter]')];
    buttons.forEach(button => button.addEventListener('click', () => {
      const dataset = button.dataset.filter;
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      let count = 0;
      cards.forEach(card => {
        card.hidden = dataset !== 'all' && card.dataset.dataset !== dataset;
        if (card.hidden) pause(card.querySelector('video'));
        else count++;
      });
      section.querySelector('.result-count').textContent = `Showing ${count} of ${cards.length} sequences`;
    }));
  });
  document.querySelectorAll('.sync-button').forEach(button => {
    button.addEventListener('click', () => {
      const groupVideos = [...button.closest('.sample-group').querySelectorAll('video')];
      groupVideos.forEach(video => { manualPause.delete(video); video.currentTime = 0; play(video); });
    });
  });
  document.querySelectorAll('[data-expand]').forEach(button => {
    button.addEventListener('click', () => {
      const card = button.closest('.video-card');
      dialogSource = card.querySelector('video');
      videos.forEach(pause);
      document.querySelector('#dialog-title').textContent = button.dataset.expand;
      document.querySelector('#dialog-caption').textContent = card.querySelector('.card-footer > span').textContent;
      dialogVideo.src = dialogSource.currentSrc || dialogSource.querySelector('source').src;
      dialogVideo.poster = dialogSource.poster;
      dialogVideo.currentTime = dialogSource.currentTime || 0;
      dialog.showModal();
      document.body.classList.add('modal-open');
      play(dialogVideo);
    });
  });
  document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialogSource && Number.isFinite(dialogVideo.currentTime)) dialogSource.currentTime = dialogVideo.currentTime;
    dialogVideo.pause();
    dialogVideo.removeAttribute('src');
    dialogVideo.load();
    document.body.classList.remove('modal-open');
    resumeVisible();
  });
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
  let ticking = false;
  function updateNavigation() {
    let current = 0;
    sections.forEach((section, index) => { if (section.getBoundingClientRect().top <= 150) current = index; });
    navLinks.forEach((link, index) => {
      link.classList.toggle('active', index === current);
      if (index === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    ticking = false;
  }
  document.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(updateNavigation); ticking = true; }
  }, { passive: true });
  updateAutoplayLabel();
  updateNavigation();
})();
