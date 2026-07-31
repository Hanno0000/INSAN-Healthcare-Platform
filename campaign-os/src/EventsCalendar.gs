// ================================
// EGYPTIAN EVENTS CALENDAR  (improvement I5)
//
// Nothing in this system knew a season was coming. Audit B recorded it as B10:
// no way to plan around Ramadan, Eid or awareness days — the highest-attention
// windows of the year in this market, and the only content that genuinely
// cannot be produced retrospectively. Seasonal content needs its clinical
// review, its material and its timing arranged before the period begins.
//
// This answers one question: **what falls inside, or just before, the window
// being planned?** The planner is told, in its brief, and the operator can ask
// directly from the menu.
//
// It never computes a Hijri date. Ramadan and Eid are entered by hand per year
// in CONFIG.EVENTS_CALENDAR.MOVEABLE, and a year with no entry is reported as
// missing rather than estimated — a Ramadan date one day out would misplan a
// month of content about medication timing.
// ================================

var EventsCalendar = {

  _config: function() {
    return CONFIG.EVENTS_CALENDAR || {};
  },

  // ------------------------------------------------------------------ dates

  _startOfDay: function(date) {
    var d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d;
  },

  _addDays: function(date, days) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  },

  _parseISO: function(text) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(text || '').trim());

    if (!m) {
      return null;
    }

    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setHours(0, 0, 0, 0);

    // Rejects 2027-02-31 and similar, which JavaScript would silently roll over
    // into March.
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 ||
        d.getDate() !== Number(m[3])) {
      return null;
    }

    return d;
  },

  _format: function(date) {
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    return date.getFullYear() + '-' + m + '-' + d;
  },

  // A fixed event's window in a given year. Windows that cross the year end —
  // exam season runs from December into January — produce a range whose end is
  // in the following year, which is why the end is built from the start rather
  // than from the same year.
  _fixedWindow: function(event, year) {
    var start = new Date(year, event.month - 1, event.day);
    start.setHours(0, 0, 0, 0);

    if (!event.endMonth) {
      return { start: start, end: start };
    }

    var endYear = (event.endMonth < event.month) ? year + 1 : year;
    var end = new Date(endYear, event.endMonth - 1, event.endDay || event.day);
    end.setHours(0, 0, 0, 0);

    return { start: start, end: end };
  },

  // ----------------------------------------------------------------- lookup

  // Everything relevant to a planning window: events inside it, and events
  // close enough after it that their lead time has already begun.
  //
  // Returns { events: [...], missing: [...] } — `missing` names moveable
  // events with no date recorded for a year the window touches, because a
  // planner that silently omits Ramadan is worse than one that says it does
  // not know when Ramadan is.
  forRange: function(startDate, days) {
    var config = this._config();

    if (!config.ENABLED) {
      return { events: [], missing: [] };
    }

    var windowStart = this._startOfDay(startDate);
    var windowEnd = this._addDays(windowStart, Math.max(0, (days || 1) - 1));
    var trailing = config.TRAILING_DAYS || 0;

    var years = {};
    years[windowStart.getFullYear()] = true;
    years[windowEnd.getFullYear()] = true;
    // A long lead time can reach back into the previous year's window.
    years[windowStart.getFullYear() - 1] = true;
    years[windowEnd.getFullYear() + 1] = true;

    var found = [];
    var missing = [];

    var fixed = config.FIXED || [];
    for (var i = 0; i < fixed.length; i++) {
      for (var year in years) {
        var window = this._fixedWindow(fixed[i], Number(year));
        var hit = this._relevance(window, windowStart, windowEnd, fixed[i], trailing);

        if (hit) {
          found.push(hit);
        }
      }
    }

    var moveable = config.MOVEABLE || [];
    for (var m = 0; m < moveable.length; m++) {
      for (var y in years) {
        var recorded = (moveable[m].dates || {})[String(y)];
        var start = recorded ? this._parseISO(recorded.start) : null;

        if (!start) {
          // Only worth reporting for years the window actually touches — the
          // ±1 years are scanned for lead time, not for completeness.
          if (Number(y) === windowStart.getFullYear() ||
              Number(y) === windowEnd.getFullYear()) {
            missing.push({ key: moveable[m].key, name: moveable[m].name, year: String(y) });
          }
          continue;
        }

        var end = recorded.end ? this._parseISO(recorded.end) : start;
        var moveHit = this._relevance(
          { start: start, end: end || start }, windowStart, windowEnd, moveable[m], trailing
        );

        if (moveHit) {
          found.push(moveHit);
        }
      }
    }

    // Nearest first — a period starting inside the window matters more than
    // one whose lead time has merely begun.
    found.sort(function(a, b) { return a.start.getTime() - b.start.getTime(); });

    return { events: this._dedupe(found), missing: missing };
  },

  // Is this event's window, or its lead-in, relevant to the planning window?
  _relevance: function(window, windowStart, windowEnd, event, trailing) {
    var leadStart = this._addDays(window.start, -(event.leadDays || 0));
    var effectiveEnd = this._addDays(window.end, trailing || 0);

    var overlaps = window.start <= windowEnd && effectiveEnd >= windowStart;
    var leadIn = !overlaps && leadStart <= windowEnd && window.start > windowEnd;

    if (!overlaps && !leadIn) {
      return null;
    }

    return {
      key: event.key,
      name: event.name,
      weight: event.weight || 'medium',
      start: window.start,
      end: window.end,
      startText: this._format(window.start),
      endText: this._format(window.end),
      state: overlaps ? 'in-window' : 'approaching',
      daysUntilStart: Math.round(
        (window.start.getTime() - windowStart.getTime()) / 86400000
      )
    };
  },

  _dedupe: function(events) {
    var seen = {};
    var out = [];

    for (var i = 0; i < events.length; i++) {
      var id = events[i].key + '|' + events[i].startText;
      if (!seen[id]) {
        seen[id] = true;
        out.push(events[i]);
      }
    }

    return out;
  },

  // ------------------------------------------------------------- for the AI

  // The block injected into the planner's brief. Deliberately says what is
  // missing as well as what is known: a planner told nothing about Ramadan
  // plans a normal month, which is the failure this exists to prevent.
  briefBlock: function(startDate, days) {
    var result = this.forRange(startDate, days);

    if (!result.events.length && !result.missing.length) {
      return '';
    }

    var lines = ['=== WHAT IS HAPPENING DURING THIS WINDOW ===', ''];

    if (result.events.length) {
      lines.push(
        'These periods fall inside the window being planned, or begin soon',
        'enough that content for them has to be planned now. A period changes',
        'what is worth publishing; it is not a decoration.',
        ''
      );

      for (var i = 0; i < result.events.length; i++) {
        var e = result.events[i];
        lines.push(
          '- ' + e.name +
          ' | ' + e.startText + (e.endText !== e.startText ? ' to ' + e.endText : '') +
          ' | ' + e.state +
          ' | importance: ' + e.weight
        );
      }

      lines.push(
        '',
        'Seasonal content belongs to the Seasonal Campaigns campaign and only',
        'where that campaign has a usable card. Do not reassign another',
        'campaign to a period — a medical campaign scheduled during Ramadan is',
        'still that campaign.'
      );
    }

    if (result.missing.length) {
      var names = [];
      for (var m = 0; m < result.missing.length; m++) {
        names.push(result.missing[m].name + ' (' + result.missing[m].year + ')');
      }

      lines.push(
        '',
        '⚠️ DATES NOT RECORDED: ' + names.join(', ') + '.',
        'These follow the Hijri calendar and are entered by hand. This system',
        'does not estimate them. If one of them falls inside this window, the',
        'plan will be wrong and nobody will notice until the period arrives —',
        'say so in your notes.'
      );
    }

    lines.push('', '=== END OF WINDOW CONTEXT ===');

    return lines.join('\n');
  },

  // ------------------------------------------------------- for the operator

  // Everything in the next N days, for the menu. Answers the question the
  // system could not answer at all before: what is coming that we should
  // already be preparing for?
  upcoming: function(days) {
    return this.forRange(new Date(), days || 90);
  }
};


// ================================
// MENU — AI Workers → Planning → What Is Coming
// ================================

function showUpcomingEvents() {
  var ui = SpreadsheetApp.getUi();
  var horizon = 90;

  try {
    var result = EventsCalendar.upcoming(horizon);
    var lines = ['The next ' + horizon + ' days', ''];

    if (!result.events.length) {
      lines.push('Nothing recorded in this window.');
    }

    for (var i = 0; i < result.events.length; i++) {
      var e = result.events[i];
      lines.push(
        (e.state === 'in-window' ? '• ' : '→ ') + e.name +
        '  ' + e.startText + (e.endText !== e.startText ? ' – ' + e.endText : '') +
        (e.daysUntilStart > 0 ? '  (in ' + e.daysUntilStart + ' days)' : '') +
        (e.weight === 'critical' || e.weight === 'high' ? '  [' + e.weight + ']' : '')
      );
    }

    if (result.missing.length) {
      lines.push('', '⚠️ Dates you have not entered yet:');

      for (var m = 0; m < result.missing.length; m++) {
        lines.push('   ' + result.missing[m].name + ' — ' + result.missing[m].year);
      }

      lines.push(
        '',
        'These follow the Hijri calendar and are confirmed by announcement, so',
        'the system will not estimate them. Add them to',
        'CONFIG.EVENTS_CALENDAR.MOVEABLE as YYYY-MM-DD.',
        '',
        'Ramadan needs the most notice: medication-timing content has to be',
        'written and clinically reviewed before the month starts.'
      );
    }

    ui.alert('What Is Coming', lines.join('\n'), ui.ButtonSet.OK);

  } catch (e) {
    ui.alert('What Is Coming', e.message || e.toString(), ui.ButtonSet.OK);
  }
}
