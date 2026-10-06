/**
 * Cross-module handoff for Prepare Data.
 * Analysis dialogs can later call set() then open the workspace;
 * they must not add dead buttons until the workspace is opened from here.
 */
(function (global) {
  'use strict';

  var INTENT_KEY = 'statisticoPrepareIntent_v1';
  var RECIPE_KEY = 'statisticoPrepareRecipe_v1';

  function read(key, fallback) {
    try {
      var raw = global.sessionStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try { global.sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function getRecipe() {
    var rec = read(RECIPE_KEY, { steps: [] });
    if (!rec || !Array.isArray(rec.steps)) rec = { steps: [] };
    return rec;
  }

  function setRecipe(recipe) {
    write(RECIPE_KEY, {
      steps: (recipe && recipe.steps) || [],
      savedAt: new Date().toISOString(),
      sourceAddress: recipe && recipe.sourceAddress || ''
    });
  }

  function appendSteps(steps) {
    var rec = getRecipe();
    (steps || []).forEach(function (s) {
      if (!s || !s.type) return;
      if (s.enabled == null) s.enabled = true;
      rec.steps.push(s);
    });
    setRecipe(rec);
    return rec;
  }

  function setIntent(intent) {
    write(INTENT_KEY, intent || null);
  }

  function peekIntent() {
    return read(INTENT_KEY, null);
  }

  function consumeIntent() {
    var intent = peekIntent();
    try { global.sessionStorage.removeItem(INTENT_KEY); } catch (e) {}
    return intent;
  }

  /**
   * @param {object} intent
   * @param {string} intent.source Module id that requested preparation
   * @param {string} intent.open 'quality' | 'dataset'
   * @param {string} [intent.reason]
   * @param {string[]} [intent.variables]
   * @param {object} [intent.prefill] Operation draft for Prepare Dataset
   */
  global.StatisticoPrepareIntent = {
    INTENT_KEY: INTENT_KEY,
    RECIPE_KEY: RECIPE_KEY,
    getRecipe: getRecipe,
    setRecipe: setRecipe,
    appendSteps: appendSteps,
    clearRecipe: function () { setRecipe({ steps: [] }); },
    set: setIntent,
    peek: peekIntent,
    consume: consumeIntent
  };
})(typeof window !== 'undefined' ? window : globalThis);
