(async () => {
  const nav = document.querySelector('.day-nav');
  const scheduleContainer = document.getElementById('schedule-days');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function eventMarkup(event) {
    const isMandatory = event.mandatory === true;
    const description = isMandatory
      ? '<span class="mandatory-mark" aria-hidden="true"></span><span>' + event.descriptionHtml + '</span>'
      : event.descriptionHtml;
    const timeParts = event.time.split(' – ');
    const time = escapeHtml(timeParts[0]) +
      (timeParts.length > 1 ? ' <span>–</span> ' + escapeHtml(timeParts.slice(1).join(' – ')) : '');

    return '<div class="event' + (isMandatory ? ' mandatory' : '') + '">' +
      '<div class="time">' + time + '</div>' +
      '<div class="description' + (isMandatory ? ' mandatory-description' : '') + '">' + description + '</div>' +
      '<div class="location">' + event.locationHtml + '</div>' +
      '<div class="attendees">' + escapeHtml(event.attendees) + '</div>' +
    '</div>';
  }

  function dayMarkup(day) {
    return '<section class="day" id="' + escapeHtml(day.id) + '">' +
      '<div class="day-heading">' +
        '<span class="day-number">' + escapeHtml(day.number) + '</span>' +
        '<h2>' + escapeHtml(day.title) + '</h2>' +
        '<p class="day-date">' + escapeHtml(day.date) + '</p>' +
      '</div>' +
      '<div><div class="day-events">' +
        '<div class="event head"><div>Time</div><div>Description</div><div>Location</div><div>Attendees</div></div>' +
        day.events.map(eventMarkup).join('') +
      '</div><p class="note">' + escapeHtml(day.note) + '</p></div>' +
    '</section>';
  }

  try {
    const response = await fetch('./schedule.json', {cache: 'no-cache'});
    if (!response.ok) throw new Error('Unable to load schedule data');

    const schedule = await response.json();
    const days = schedule.days;

    nav.innerHTML = days.map((day, index) =>
      '<a' + (index === 0 ? ' class="active" aria-current="true"' : '') +
      ' href="#' + escapeHtml(day.id) + '">' +
      escapeHtml(day.id.replace('aug-', 'Aug ')) +
      '</a>'
    ).join('');
    scheduleContainer.innerHTML = days.map(dayMarkup).join('');

    const links = [...nav.querySelectorAll('a')];
    const sections = links.map(link => document.querySelector(link.hash));
    let activeId = '';
    let ticking = false;

    function setActive(id) {
      if (id === activeId) return;
      activeId = id;

      links.forEach(link => {
        const isActive = link.hash === '#' + id;
        link.classList.toggle('active', isActive);

        if (isActive) {
          link.setAttribute('aria-current', 'true');
          const centeredLeft = link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
          nav.scrollTo({left: Math.max(0, centeredLeft), behavior: 'auto'});
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    function updateActiveDay() {
      const marker = document.querySelector('.day-nav-wrap').getBoundingClientRect().bottom + 56;
      let current = sections[0];

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= marker) current = section;
        else break;
      }

      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = sections[sections.length - 1];
      }

      setActive(current.id);
      ticking = false;
    }

    links.forEach(link => {
      link.addEventListener('click', event => {
        const target = document.querySelector(link.hash);
        if (!target) return;

        event.preventDefault();
        const topNavHeight = document.querySelector('.nav').offsetHeight;
        const dayNavHeight = document.querySelector('.day-nav-wrap').offsetHeight;
        const targetTop = target.getBoundingClientRect().top + window.scrollY - topNavHeight - dayNavHeight - 20;

        window.scrollTo({top: targetTop, behavior: reducedMotion ? 'auto' : 'smooth'});
        history.replaceState(null, '', link.hash);
      });
    });

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateActiveDay);
      }
    }, {passive: true});

    window.addEventListener('resize', updateActiveDay);
    updateActiveDay();

    if (location.hash && document.querySelector(location.hash)) {
      requestAnimationFrame(() => document.querySelector(location.hash).scrollIntoView({
        behavior: 'auto',
        block: 'start'
      }));
    }
  } catch (error) {
    console.error(error);
    scheduleContainer.innerHTML = '<p class="schedule-status error">The schedule could not be loaded. Please refresh the page.</p>';
  }
})();
