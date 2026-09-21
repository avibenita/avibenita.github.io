/**
 * Browser-test Office/Excel stub. Intercepted in place of office.js so
 * dialogs can finish onReady, receive worksheet-shaped demo data, and
 * show #mainContent. Does not change production files.
 */
(function (root) {
  'use strict';

  var handlers = [];
  var readyInfo = { host: 'Excel', platform: 'PC' };

  function demoSheet() {
    var headers = ['Age', 'Income', 'Satisfaction', 'Group', 'Item1', 'Item2', 'Item3', 'Item4'];
    var groups = ['A', 'B', 'C'];
    var rows = [];
    var seed = 20260921;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    for (var i = 0; i < 48; i++) {
      rows.push([
        Math.round(22 + rnd() * 40),
        Math.round(28000 + rnd() * 70000),
        Math.round(40 + rnd() * 55),
        groups[i % 3],
        Math.round(1 + rnd() * 4),
        Math.round(1 + rnd() * 4),
        Math.round(1 + rnd() * 4),
        Math.round(1 + rnd() * 4)
      ]);
    }
    return {
      headers: headers,
      rows: rows,
      address: 'Sheet1!A1:H49',
      source: 'e2e-office-mock'
    };
  }

  var sheet = demoSheet();
  root.__STATISTICO_E2E_DEMO__ = sheet;

  function deliver(message) {
    var packed = typeof message === 'string' ? message : JSON.stringify(message);
    handlers.forEach(function (handler) {
      try { handler({ message: packed }); } catch (_e) {}
    });
  }

  root.__officeDeliver = deliver;
  root.__officeParentHandlers = handlers;

  root.Office = {
    onReady: function (cb) {
      if (typeof cb === 'function') {
        setTimeout(function () { cb(readyInfo); }, 0);
      }
      return Promise.resolve(readyInfo);
    },
    HostType: { Excel: 'Excel' },
    EventType: { DialogParentMessageReceived: 'DialogParentMessageReceived' },
    context: {
      host: 'Excel',
      ui: {
        addHandlerAsync: function (_type, handler, cb) {
          if (typeof handler === 'function') handlers.push(handler);
          if (typeof cb === 'function') cb({ status: 'succeeded' });
        },
        messageParent: function () {},
        displayDialogAsync: function (_url, _opts, cb) {
          if (typeof cb === 'function') cb({ status: 'failed', error: { code: 12004, message: 'e2e mock' } });
        }
      }
    }
  };

  var values = [sheet.headers].concat(sheet.rows);
  root.Excel = {
    run: function (cb) {
      var ctx = {
        workbook: {
          worksheets: {
            getActiveWorksheet: function () {
              return {
                load: function () {},
                getUsedRange: function () {
                  return { load: function () {}, values: values };
                }
              };
            }
          }
        },
        sync: function () { return Promise.resolve(); }
      };
      try {
        var out = cb(ctx);
        return Promise.resolve(out);
      } catch (err) {
        return Promise.reject(err);
      }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
