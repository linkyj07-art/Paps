(() => {
  const _0x281b15 = {
    checked: !1,
    loggedIn: !1,
    email: "",
    error: ""
  };
  const _0x487226 = "modDataLookupRecords";
  const _0xa2a4dc = "modDataLookupSelectedMarkets";
  const _0x47d3ac = "mod_data";
  const _0x4fe6f2 = "confirmed_tomorrow_leads";
  const _0x2e5921 = "confirmed_today_leads";
  const _0x40a668 = "unknown";
  const _0x5a35a4 = {
    [_0x47d3ac]: "MOD Data Today - IDF, TWF, BOI",
    [_0x4fe6f2]: "Confirmed for Tomorrow - All Leads",
    [_0x2e5921]: "Confirmed for Today - All Leads"
  };
  const _0x1dea7c = "tr[data-row-key-value]";
  const _0x5994b5 = ".slds-global-header__item_search";
  const _0x2c1961 = ".slds-global-header__item_search button.search-button";
  const _0x192742 = ".assistantPanel, .uiPanel, .forceSearchAssistantDialog, .saDialogPaneContainer";
  const _0x5e7d61 = ".forceSearchAssistantDialog";
  const _0x2c3d21 = "lightning-input.saInput input.slds-input[type=\"search\"][aria-controls^=\"suggestionsList-\"]";
  const _0x8367a1 = "search_dialog-instant-results-list";
  const _0x4c9a04 = "search_dialog-instant-result-item .instant-result-item-record-suggestion";
  const _0x3a0cfe = ".forceSearchAssistantSecondaryPanel[aria-label=\"Record Preview\"]";
  const _0x2d240c = "a[href*=\"/related/Work_Orders__r/view\"]";
  const _0xe353d9 = "a[data-refid=\"recordId\"][href^=\"/lightning/r/\"][data-recordid]";
  const _0x491fd0 = {
    records: [],
    selectedMarkets: new Set(),
    jsonMode: "all",
    logMode: "debug",
    busy: !1,
    currentRun: null,
    reportContext: null,
    authStatus: _0x281b15,
    debugLines: [],
    errorLines: []
  };
  class _0x433840 extends Error {
    constructor() {
      super("Stopped by user");
      this.name = "StopProcessError";
    }
  }
  const _0x38fe33 = _0x4a0fac => {
    if (!_0x4a0fac) {
      return "";
    }
    const _0x4fc43a = _0x4a0fac.getAttribute("href");
    if (_0x4fc43a) {
      return new URL(_0x4fc43a, window.location.origin).href;
    } else {
      return _0x4a0fac.href || "";
    }
  };
  const _0x1bacad = _0x1c1c41 => new Promise(_0x95799f => window.setTimeout(_0x95799f, _0x1c1c41));
  const _0x49feb3 = (_0x1ca918 = _0x491fd0.currentRun) => Boolean(_0x1ca918?.stopRequested);
  function _0x447c7d(_0x739903 = _0x491fd0.currentRun) {
    if (_0x49feb3(_0x739903)) {
      throw new _0x433840();
    }
  }
  async function _0x481f24(_0x28e303, _0x41eca5 = _0x491fd0.currentRun) {
    const _0x31510f = Date.now();
    while (Date.now() - _0x31510f < _0x28e303) {
      _0x447c7d(_0x41eca5);
      await _0x1bacad(Math.min(100, _0x28e303 - (Date.now() - _0x31510f)));
    }
    _0x447c7d(_0x41eca5);
  }
  const _0xa4b589 = _0x5cf0c3 => {
    const _0x4b3726 = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Boise",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
      hourCycle: "h23"
    }).formatToParts(_0x5cf0c3);
    const _0x14045c = Object.fromEntries(_0x4b3726.map(_0x133975 => [_0x133975.type, _0x133975.value]));
    return _0x14045c.year + "-" + _0x14045c.month + "-" + _0x14045c.day + " " + _0x14045c.hour + ":" + _0x14045c.minute + ":" + _0x14045c.second + " " + _0x14045c.timeZoneName;
  };
  const _0x459c41 = () => {
    const _0x48b35e = new Date();
    return {
      utc: _0x48b35e.toISOString(),
      local: _0xa4b589(_0x48b35e)
    };
  };
  const _0x3f28d0 = {
    async load() {
      const _0x33d54a = await chrome.storage.local.get(_0x487226);
      if (Array.isArray(_0x33d54a[_0x487226])) {
        return _0x33d54a[_0x487226];
      } else {
        return [];
      }
    },
    async save(_0x3f6b06) {
      const _0x5180a0 = {
        [_0x487226]: _0x3f6b06
      };
      await chrome.storage.local.set(_0x5180a0);
    },
    async loadSelectedMarkets() {
      const _0x2defc0 = await chrome.storage.local.get(_0xa2a4dc);
      if (Array.isArray(_0x2defc0[_0xa2a4dc])) {
        return _0x2defc0[_0xa2a4dc];
      } else {
        return [];
      }
    },
    async saveSelectedMarkets(_0x535461) {
      const _0x4df099 = {
        [_0xa2a4dc]: [..._0x535461]
      };
      await chrome.storage.local.set(_0x4df099);
    },
    async clear() {
      await chrome.storage.local.remove([_0x487226, _0xa2a4dc]);
    }
  };
  const _0x25714b = function () {
    const _0x343875 = document.createElement("div");
    _0x343875.id = "mod-data-lookup-helper";
    _0x343875.innerHTML = "\n      <div class=\"mdl-widget\" role=\"region\" aria-label=\"Record lookup helper\">\n        <div class=\"mdl-header\">\n          <div>\n            <div class=\"mdl-title\">Record Lookup</div>\n            <div class=\"mdl-report\" data-role=\"report\">Report: Unknown</div>\n            <div class=\"mdl-report-hint\" data-role=\"report-hint\" hidden>Open a supported list view: MOD Data Today, Confirmed for Today, or Confirmed for Tomorrow.</div>\n            <div class=\"mdl-auth mdl-auth-checking\" data-role=\"auth\">Papa: Checking login...</div>\n            <div class=\"mdl-subtitle\" data-role=\"status\">Ready</div>\n          </div>\n          <div class=\"mdl-header-actions\">\n            <button class=\"mdl-icon-button mdl-stop-button\" type=\"button\" data-action=\"stop\" title=\"Stop\" hidden disabled><span aria-hidden=\"true\"></span></button>\n            <button class=\"mdl-icon-button\" type=\"button\" data-action=\"collapse\" title=\"Collapse\">−</button>\n          </div>\n        </div>\n        <div class=\"mdl-body\">\n          <section class=\"mdl-column mdl-selected-panel\" data-role=\"selected-panel\" hidden>\n            <div class=\"mdl-panel-title-row\">\n              <div class=\"mdl-panel-title\">Markets Selected</div>\n              <div class=\"mdl-panel-count\" data-role=\"selected-market-count\">0</div>\n            </div>\n            <button type=\"button\" data-action=\"search\">Search Records</button>\n            <div class=\"mdl-selected-table-wrap\">\n              <table class=\"mdl-selected-table\">\n                <thead>\n                  <tr>\n                    <th aria-label=\"Remove\"></th>\n\t                    <th>Market</th>\n\t                    <th>Found</th>\n\t                    <th>Product</th>\n\t                    <th>Not Found</th>\n\t                    <th>Total</th>\n\t                  </tr>\n                </thead>\n                <tbody data-role=\"selected-market-rows\"></tbody>\n                <tfoot>\n                  <tr>\n\t                    <td></td>\n\t                    <td>Total</td>\n\t                    <td data-role=\"selected-market-found-total\">0</td>\n\t                    <td data-role=\"selected-market-product-total\">0</td>\n\t                    <td data-role=\"selected-market-not-found-total\">0</td>\n\t                    <td data-role=\"selected-market-grand-total\">0</td>\n\t                  </tr>\n                </tfoot>\n              </table>\n            </div>\n          </section>\n          <section class=\"mdl-column mdl-market-panel\" data-role=\"market-panel\" hidden>\n            <div class=\"mdl-panel-title-row\">\n              <div class=\"mdl-panel-title\">Markets Detected</div>\n              <div class=\"mdl-panel-count\" data-role=\"detected-market-count\">0</div>\n            </div>\n            <div class=\"mdl-market-actions\">\n              <button type=\"button\" data-action=\"select-all-markets\">All</button>\n              <button type=\"button\" data-action=\"clear-markets\">Clear</button>\n            </div>\n            <div class=\"mdl-market-list\" data-role=\"markets\"></div>\n          </section>\n          <section class=\"mdl-column mdl-main-panel\">\n            <div class=\"mdl-actions\">\n              <button type=\"button\" data-action=\"scan\">Scan Rows</button>\n              <button type=\"button\" data-action=\"upload\">Upload Records</button>\n              <button type=\"button\" data-action=\"clear\">Clear</button>\n            </div>\n            <div class=\"mdl-counts\">\n              <span data-role=\"total\">0 records</span>\n              <span data-role=\"selected\">0 selected</span>\n\t              <span data-role=\"queued\">0 queued</span>\n\t              <span data-role=\"found\">0 found</span>\n\t              <span data-role=\"no-product\">0 no product</span>\n\t              <span data-role=\"incomplete\">0 incomplete</span>\n\t              <span data-role=\"not-found\">0 not found</span>\n            </div>\n            <button\n              class=\"mdl-advanced-toggle\"\n              type=\"button\"\n              data-action=\"toggle-advanced\"\n              aria-expanded=\"false\"\n              aria-controls=\"mdl-advanced-actions\"\n            >Advanced tools ▾</button>\n            <div class=\"mdl-advanced-actions\" id=\"mdl-advanced-actions\" data-role=\"advanced-actions\" hidden>\n              <button type=\"button\" data-action=\"debug\">Debug First</button>\n              <button type=\"button\" data-action=\"open-logs\">Debug Logs</button>\n              <div class=\"mdl-json-actions\">\n                <button type=\"button\" data-action=\"open-json-all\">JSON All</button>\n                <button type=\"button\" data-action=\"open-json-found\">JSON Found</button>\n              </div>\n              <button type=\"button\" data-action=\"open-error-logs\">Error Logs</button>\n            </div>\n          </section>\n          <div class=\"mdl-modal\" data-role=\"json-modal\" hidden>\n            <div class=\"mdl-modal-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Captured JSON\">\n              <div class=\"mdl-modal-header\">\n                <div class=\"mdl-modal-title\" data-role=\"json-title\">Captured JSON</div>\n                <button class=\"mdl-icon-button\" type=\"button\" data-action=\"close-json\" title=\"Close JSON\">×</button>\n              </div>\n              <textarea data-role=\"json\" spellcheck=\"false\" aria-label=\"Captured JSON\"></textarea>\n              <div class=\"mdl-modal-actions\">\n                <button type=\"button\" data-action=\"copy\">Copy JSON</button>\n                <button type=\"button\" data-action=\"close-json\">Close</button>\n              </div>\n            </div>\n          </div>\n          <div class=\"mdl-modal\" data-role=\"log-modal\" hidden>\n            <div class=\"mdl-modal-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Debug logs\">\n              <div class=\"mdl-modal-header\">\n                <div class=\"mdl-modal-title\" data-role=\"log-title\">Debug Logs</div>\n                <button class=\"mdl-icon-button\" type=\"button\" data-action=\"close-logs\" title=\"Close logs\">×</button>\n              </div>\n              <textarea data-role=\"debug\" spellcheck=\"false\" aria-label=\"Debug log\"></textarea>\n              <div class=\"mdl-modal-actions\">\n                <button type=\"button\" data-action=\"copy-log\" data-role=\"log-copy\">Copy Debug Log</button>\n                <button type=\"button\" data-action=\"close-logs\">Close</button>\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n    ";
    _0x343875.addEventListener("click", async _0x59189d => {
      const _0x3e5d13 = _0x59189d.target.closest("button[data-action]");
      if (!_0x3e5d13) {
        return;
      }
      const _0x2366e3 = _0x3e5d13.getAttribute("data-action");
      _0x6abc36("Action clicked: " + _0x2366e3);
      if (_0x2366e3 !== "stop") {
        if (_0x2366e3 !== "open-logs") {
          if (_0x2366e3 !== "open-error-logs") {
            if (_0x2366e3 !== "open-json-all") {
              if (_0x2366e3 !== "open-json-found") {
                if (_0x2366e3 !== "close-logs") {
                  if (_0x2366e3 !== "close-json") {
                    if (_0x2366e3 !== "copy") {
                      if (_0x2366e3 !== "copy-log") {
                        if (_0x2366e3 !== "toggle-advanced") {
                          if (!_0x491fd0.busy && (_0x2366e3 === "scan" && (await async function () {
                            const _0x555061 = {
                              stoppable: !0
                            };
                            await _0x2af401("Loading all rows...", async _0x4fa14b => {
                              const _0x488d99 = _0x7e508f();
                              _0x491fd0.reportContext = _0x488d99;
                              _0x6abc36("Detected report: " + (_0x488d99.name || "(unknown)") + " (" + _0x488d99.type + ")");
                              _0x6abc36("Detected columns: " + ([...document.querySelectorAll("[data-label]")].map(_0x1af599 => _0x1af599.getAttribute("data-label")).filter(Boolean).filter((_0x5cb263, _0x39e685, _0x1ece01) => _0x1ece01.indexOf(_0x5cb263) === _0x39e685).join(", ") || "(none)"));
                              const _0x2e3862 = await _0x504c36(_0x488d99, _0x4fa14b);
                              _0x491fd0.records = _0x509848(_0x2e3862);
                              await _0xb409b7();
                              await _0x3f28d0.save(_0x491fd0.records);
                              _0x6abc36("Scan extracted " + _0x491fd0.records.length + " usable records");
                              _0x231576("Scanned " + _0x491fd0.records.length + " rows");
                              _0x4eb678();
                            }, _0x555061);
                          }()), _0x2366e3 === "search" && (await async function () {
                            if (!_0x491fd0.records.length) {
                              _0x231576("No scanned records to search");
                              return;
                            }
                            const _0x3c6211 = {
                              stoppable: !0
                            };
                            await _0x2af401("Searching records...", async _0x2d61dd => {
                              const _0x15a064 = _0x509848([..._0x491fd0.records]);
                              const _0x1a8081 = _0x4c050a();
                              if (!_0x1a8081.length) {
                                _0x231576("Select at least one market");
                                return;
                              }
                              const _0x1065c2 = _0x15a064.map((_0x40c672, _0x562bd7) => ({
                                record: _0x40c672,
                                index: _0x562bd7
                              })).filter(({
                                record: _0x5280c5
                              }) => _0x1a8081.includes(_0x5280c5.market)).filter(({
                                record: _0x1db7cd
                              }) => !_0x4a7bb5(_0x1db7cd)).map(({
                                index: _0x515176
                              }) => _0x515176);
                              _0x6abc36("Search queued " + _0x1065c2.length + " records across " + _0x1a8081.length + " selected markets");
                              if (_0x1065c2.length) {
                                for (let _0x1b06b9 = 0; _0x1b06b9 < _0x1065c2.length; _0x1b06b9 += 1) {
                                  _0x447c7d(_0x2d61dd);
                                  const _0x5be783 = _0x1065c2[_0x1b06b9];
                                  const _0x5b1280 = _0x15a064[_0x5be783];
                                  if (!_0x4a7bb5(_0x5b1280)) {
                                    if (!_0x5b1280.leadName || !_0x5b1280.leadUrl) {
                                      _0x6abc36("Skipping row " + (_0x5b1280.rowNumber || _0x5be783 + 1) + ": missing lead name or URL");
                                      const _0x1925c7 = _0x459c41();
                                      const _0x5ea861 = {
                                        ..._0x5b1280
                                      };
                                      _0x5ea861.searchStatus = "error";
                                      _0x5ea861.searchResult = {};
                                      _0x5ea861.searchError = "Missing lead name or lead URL";
                                      _0x5ea861.searchedAt = _0x1925c7.utc;
                                      _0x5ea861.searchedAtLocal = _0x1925c7.local;
                                      _0x15a064[_0x5be783] = _0x5ea861;
                                      _0x491fd0.records = _0x509848(_0x15a064);
                                      await _0x3f28d0.save(_0x491fd0.records);
                                      _0x4eb678();
                                      continue;
                                    }
                                    _0x231576("Searching " + (_0x1b06b9 + 1) + " of " + _0x1065c2.length + ": " + _0x5b1280.leadName);
                                    try {
                                      const _0x321554 = {
                                        run: _0x2d61dd
                                      };
                                      const _0x598357 = await _0x2892e2(_0x5b1280, _0x321554);
                                      _0x447c7d(_0x2d61dd);
                                      const _0x39f2d8 = _0x459c41();
                                      const _0x4ee89a = _0x300fe8(_0x598357);
                                      const _0x4dcdb3 = _0x598357.found ? _0x598357.data : {};
                                      _0x6abc36("Search result for " + _0x5b1280.leadName + ": " + _0x4ee89a);
                                      _0x15a064[_0x5be783] = {
                                        ..._0x5b1280,
                                        ..._0x256465(_0x5b1280, _0x4dcdb3),
                                        searchStatus: _0x4ee89a,
                                        searchResult: _0x4dcdb3,
                                        searchError: _0x2e747a(_0x598357, _0x4ee89a),
                                        searchedAt: _0x39f2d8.utc,
                                        searchedAtLocal: _0x39f2d8.local
                                      };
                                    } catch (_0x4c5137) {
                                      if (_0x4c5137 instanceof _0x433840) {
                                        throw _0x4c5137;
                                      }
                                      const _0x537615 = "Search error for " + _0x5b1280.leadName + ": " + (_0x4c5137?.message || String(_0x4c5137));
                                      _0x6abc36(_0x537615);
                                      _0x1303c5(_0x537615, _0x4c5137);
                                      const _0x483e8a = _0x459c41();
                                      _0x15a064[_0x5be783] = {
                                        ..._0x5b1280,
                                        searchStatus: "error",
                                        searchResult: {},
                                        searchError: String(_0x4c5137?.message || _0x4c5137),
                                        searchedAt: _0x483e8a.utc,
                                        searchedAtLocal: _0x483e8a.local
                                      };
                                    }
                                    _0x491fd0.records = _0x509848(_0x15a064);
                                    await _0x3f28d0.save(_0x491fd0.records);
                                    _0x4eb678();
                                    await _0x481f24(300, _0x2d61dd);
                                  }
                                }
                                _0x231576("Search pass complete");
                              } else {
                                _0x231576("No pending records in selected markets");
                              }
                            }, _0x3c6211);
                          }()), _0x2366e3 === "upload" && (await async function () {
                            if (!_0x491fd0.records.length) {
                              _0x231576("No scanned records to upload");
                              return;
                            }
                            const _0x21b6fd = {
                              silent: !0
                            };
                            await _0x32d3b8(_0x21b6fd);
                            if (!_0x491fd0.authStatus.loggedIn) {
                              _0x231576("Not logged in. Click the extension to log in.");
                              return;
                            }
                            const _0x43e67c = function () {
                              const _0x3d8c51 = _0x4c050a();
                              if (_0x3d8c51.length) {
                                // Upload both found leads (full data) AND not-found
                                // leads (name only) so the latter can be completed
                                // manually on the website's "Needs Entry" tab.
                                return _0x491fd0.records.filter(_0x37a200 => _0x3d8c51.includes(_0x37a200.market) && (_0x4a7bb5(_0x37a200) || _0x37a200.searchStatus === "not_found"));
                              } else {
                                return [];
                              }
                            }();
                            if (!_0x43e67c.length) {
                              _0x231576("No searched records in selected markets to upload");
                              return;
                            }
                            await _0x2af401("Uploading records...", async _0x38ac15 => {
                              try {
                                _0x447c7d(_0x38ac15);
                                _0x6abc36("Uploading " + _0x43e67c.length + " found records");
                                const _0x16b562 = {
                                  geocode: "queue",
                                  queueGeocode: !0,
                                  googleFallback: !0
                                };
                                const _0x39345a = {
                                  type: "contextLayer:uploadRecords",
                                  rows: _0x43e67c,
                                  options: _0x16b562
                                };
                                const _0x426c8b = await _0x4ec7be(_0x39345a);
                                _0x447c7d(_0x38ac15);
                                _0x231576(function (_0xdf0a5e) {
                                  const _0x2576ac = Number(_0xdf0a5e?.created || 0);
                                  const _0x11443f = Number(_0xdf0a5e?.updated || 0);
                                  const _0x585864 = Array.isArray(_0xdf0a5e?.skipped) ? _0xdf0a5e.skipped.length : 0;
                                  const _0x2612ca = _0xdf0a5e?.geocoding || {};
                                  const _0x2c1e55 = Number(_0x2612ca.queued || 0);
                                  return "Uploaded " + (_0x2576ac + _0x11443f) + " records: " + _0x2576ac + " new, " + _0x11443f + " updated, " + _0x585864 + " skipped. " + _0x2c1e55 + " queued for geocoding.";
                                }(_0x426c8b));
                                _0x6abc36("Upload result: " + JSON.stringify(_0x426c8b));
                              } catch (_0x1f61ad) {
                                if (_0x1f61ad instanceof _0x433840) {
                                  throw _0x1f61ad;
                                }
                                const _0x3e0e68 = _0x1f61ad?.message || String(_0x1f61ad);
                                const _0x9b68d6 = {
                                  silent: !0
                                };
                                if (/not logged in|not authorized|unauthorized/i.test(_0x3e0e68)) {
                                  await _0x32d3b8(_0x9b68d6);
                                }
                                _0x231576("Upload failed: " + _0x3e0e68);
                                _0x6abc36("Upload failed: " + _0x3e0e68);
                                _0x1303c5("Upload failed: " + _0x3e0e68, _0x1f61ad);
                              }
                            });
                          }()), _0x2366e3 === "debug" && (await async function () {
                            if (!_0x491fd0.records.length) {
                              _0x231576("No scanned records to debug");
                              _0x6abc36("No scanned records in storage. Run Scan Rows first.");
                              return;
                            }
                            const _0x55353b = _0x491fd0.records.find(_0x520f8c => !_0x4a7bb5(_0x520f8c)) || _0x491fd0.records[0];
                            await _0x2af401("Debugging: " + (_0x55353b.leadName || "unnamed lead"), async _0x3150b4 => {
                              _0x6abc36("Debug run started");
                              _0x6abc36("Lead name: " + (_0x55353b.leadName || "(missing)"));
                              _0x6abc36("Lead URL: " + (_0x55353b.leadUrl || "(missing)"));
                              try {
                                const _0x212272 = {
                                  debug: !0,
                                  run: _0x3150b4
                                };
                                const _0x22fdfc = await _0x2892e2(_0x55353b, _0x212272);
                                _0x6abc36("Debug result: " + JSON.stringify(_0x22fdfc));
                                _0x231576(_0x22fdfc.found ? "Debug found matching Lead" : "Debug did not find match");
                              } catch (_0x572999) {
                                if (_0x572999 instanceof _0x433840) {
                                  throw _0x572999;
                                }
                                const _0x3928a7 = "Debug error: " + (_0x572999?.message || String(_0x572999));
                                _0x6abc36("Debug error: " + (_0x572999?.stack || _0x572999?.message || String(_0x572999)));
                                _0x1303c5(_0x3928a7, _0x572999);
                                _0x231576("Debug error");
                              }
                            });
                          }()), _0x2366e3 === "clear" && (await async function () {
                            if (!_0x491fd0.records.length) {
                              _0x231576("No records to clear");
                              return;
                            }
                            _0x6abc36("Clearing " + _0x491fd0.records.length + " records");
                            _0x491fd0.records = [];
                            _0x491fd0.reportContext = null;
                            await _0xb409b7();
                            await _0x3f28d0.clear();
                            _0x231576("Cleared");
                            _0x4eb678();
                          }()), _0x2366e3 === "collapse" && (_0x25714b.host.classList.toggle("mdl-collapsed"), _0x6abc36(_0x25714b.host.classList.contains("mdl-collapsed") ? "Widget collapsed" : "Widget expanded")), _0x2366e3 === "select-all-markets" && (_0x491fd0.selectedMarkets = new Set(_0x2f4d41()), await _0x105852(), _0x6abc36("Selected all markets"), _0x4eb678()), _0x2366e3 === "clear-markets" && (await _0xb409b7(), _0x6abc36("Cleared selected markets"), _0x4eb678()), _0x2366e3 === "remove-market")) {
                            const _0x510526 = _0x3e5d13.getAttribute("data-market");
                            if (_0x510526) {
                              _0x491fd0.selectedMarkets.delete(_0x510526);
                              await _0x105852();
                              _0x6abc36("Removed selected market: " + _0x510526);
                              _0x4eb678();
                            }
                          }
                        } else {
                          (function () {
                            if (!_0x25714b.advancedActions || !_0x25714b.advancedToggle) {
                              return;
                            }
                            const _0x302462 = _0x25714b.advancedActions.hidden;
                            _0x25714b.advancedActions.hidden = !_0x302462;
                            _0x25714b.advancedToggle.setAttribute("aria-expanded", String(_0x302462));
                            _0x25714b.advancedToggle.textContent = _0x302462 ? "Advanced tools ▴" : "Advanced tools ▾";
                          })();
                        }
                      } else {
                        await async function () {
                          const _0x62a218 = _0x5c2a9d();
                          _0x25714b.debug.value = _0x62a218;
                          await navigator.clipboard.writeText(_0x62a218);
                          _0x231576(_0x491fd0.logMode === "error" ? "Error log copied" : "Debug log copied");
                        }();
                      }
                    } else {
                      await async function () {
                        const _0x4b824f = _0x381b90();
                        _0x25714b.json.value = _0x4b824f;
                        await navigator.clipboard.writeText(_0x4b824f);
                        _0x231576("JSON copied");
                        _0x6abc36("Copied " + _0x4e625b().length + " " + _0x491fd0.jsonMode + " JSON records");
                      }();
                    }
                  } else {
                    _0x25714b.jsonModal.hidden = !0;
                  }
                } else {
                  _0x25714b.logModal.hidden = !0;
                }
              } else {
                _0xac6db3("found");
              }
            } else {
              _0xac6db3("all");
            }
          } else {
            _0x4fb0f1("error");
          }
        } else {
          _0x4fb0f1("debug");
        }
      } else {
        (function () {
          if (!_0x491fd0.currentRun?.stoppable) {
            return;
          }
          _0x491fd0.currentRun.stopRequested = true;
          _0x231576("Stopping...");
          _0x6abc36("Stop requested");
          _0x31e640(true);
        })();
      }
    });
    _0x343875.addEventListener("change", async _0x3a0ebe => {
      const _0x22ede5 = _0x3a0ebe.target.closest("input[data-role=\"market-checkbox\"]");
      if (_0x22ede5 && !_0x491fd0.busy) {
        if (_0x22ede5.checked) {
          _0x491fd0.selectedMarkets.add(_0x22ede5.value);
          _0x6abc36("Selected market: " + _0x22ede5.value);
        } else {
          _0x491fd0.selectedMarkets.delete(_0x22ede5.value);
          _0x6abc36("Deselected market: " + _0x22ede5.value);
        }
        await _0x105852();
        _0x4eb678();
      }
    });
    return {
      host: _0x343875,
      status: _0x343875.querySelector("[data-role=\"status\"]"),
      report: _0x343875.querySelector("[data-role=\"report\"]"),
      auth: _0x343875.querySelector("[data-role=\"auth\"]"),
      total: _0x343875.querySelector("[data-role=\"total\"]"),
      selected: _0x343875.querySelector("[data-role=\"selected\"]"),
      queued: _0x343875.querySelector("[data-role=\"queued\"]"),
      found: _0x343875.querySelector("[data-role=\"found\"]"),
      noProduct: _0x343875.querySelector("[data-role=\"no-product\"]"),
      incomplete: _0x343875.querySelector("[data-role=\"incomplete\"]"),
      notFound: _0x343875.querySelector("[data-role=\"not-found\"]"),
      selectedPanel: _0x343875.querySelector("[data-role=\"selected-panel\"]"),
      selectedMarketRows: _0x343875.querySelector("[data-role=\"selected-market-rows\"]"),
      selectedMarketCount: _0x343875.querySelector("[data-role=\"selected-market-count\"]"),
      selectedMarketFoundTotal: _0x343875.querySelector("[data-role=\"selected-market-found-total\"]"),
      selectedMarketProductTotal: _0x343875.querySelector("[data-role=\"selected-market-product-total\"]"),
      selectedMarketNotFoundTotal: _0x343875.querySelector("[data-role=\"selected-market-not-found-total\"]"),
      selectedMarketGrandTotal: _0x343875.querySelector("[data-role=\"selected-market-grand-total\"]"),
      marketPanel: _0x343875.querySelector("[data-role=\"market-panel\"]"),
      detectedMarketCount: _0x343875.querySelector("[data-role=\"detected-market-count\"]"),
      markets: _0x343875.querySelector("[data-role=\"markets\"]"),
      reportHint: _0x343875.querySelector("[data-role=\"report-hint\"]"),
      json: _0x343875.querySelector("[data-role=\"json\"]"),
      jsonTitle: _0x343875.querySelector("[data-role=\"json-title\"]"),
      jsonModal: _0x343875.querySelector("[data-role=\"json-modal\"]"),
      logModal: _0x343875.querySelector("[data-role=\"log-modal\"]"),
      logTitle: _0x343875.querySelector("[data-role=\"log-title\"]"),
      logCopy: _0x343875.querySelector("[data-role=\"log-copy\"]"),
      debug: _0x343875.querySelector("[data-role=\"debug\"]"),
      advancedToggle: _0x343875.querySelector("[data-action=\"toggle-advanced\"]"),
      advancedActions: _0x343875.querySelector("[data-role=\"advanced-actions\"]")
    };
  }();
  async function _0x504c36(_0x1c10e3, _0x54ae03 = _0x491fd0.currentRun) {
    const _0x41dc7c = new Map();
    let _0x48a28e = 0;
    let _0x4e11f6 = 0;
    _0x59fe4e().scrollTop = 0;
    window.scrollTo(0, 0);
    await _0x481f24(350, _0x54ae03);
    for (let _0x91bb3a = 0; _0x91bb3a < 160; _0x91bb3a += 1) {
      _0x447c7d(_0x54ae03);
      const _0x450d01 = _0x422e03();
      const _0x33fda0 = /\d+\+\s+items?/.test(_0x450d01);
      const _0x4ccbea = _0x22980b(_0x450d01);
      const _0x2d8a37 = _0x143dfb(_0x1c10e3).filter(_0x33b983);
      let _0x20a4a0 = 0;
      _0x2d8a37.forEach(_0x5d8333 => {
        const _0x186672 = _0x44a79e(_0x5d8333);
        if (_0x186672 && !_0x41dc7c.has(_0x186672)) {
          _0x41dc7c.set(_0x186672, _0x2878f2(_0x5d8333));
          _0x20a4a0 += 1;
        }
      });
      const _0x2b43a1 = _0x41dc7c.size;
      const _0x55ca2f = document.querySelectorAll(_0x1dea7c).length;
      _0x231576(!_0x33fda0 && _0x4ccbea > 0 ? "Rows loaded: " + _0x2b43a1 + " of " + _0x4ccbea : "Rows loaded: " + _0x2b43a1 + (_0x33fda0 ? "+" : ""));
      if (_0x20a4a0 || _0x91bb3a === 0) {
        _0x6abc36("Scan pass " + (_0x91bb3a + 1) + ": added=" + _0x20a4a0 + ", unique=" + _0x2b43a1 + ", rendered=" + _0x55ca2f + ", count=" + (_0x450d01 || "(unknown)"));
      }
      if (!_0x33fda0 && _0x4ccbea > 0 && _0x2b43a1 >= _0x4ccbea) {
        break;
      }
      const _0xfafdd6 = _0x380cfc();
      if (_0x2b43a1 !== _0x4e11f6 || _0xfafdd6) {
        _0x48a28e = 0;
      } else {
        _0x48a28e += 1;
        if (_0x48a28e >= 3) {
          break;
        }
      }
      _0x4e11f6 = _0x2b43a1;
      await _0x481f24(650, _0x54ae03);
    }
    return [..._0x41dc7c.values()];
  }
  function _0x2878f2(_0x348df6) {
    const _0x111d8f = _0x459c41();
    const _0x1715a4 = {
      ..._0x348df6
    };
    _0x1715a4.searchStatus = "pending";
    _0x1715a4.searchResult = {};
    _0x1715a4.searchError = "";
    _0x1715a4.capturedAt = _0x111d8f.utc;
    _0x1715a4.capturedAtLocal = _0x111d8f.local;
    return _0x1715a4;
  }
  function _0x44a79e(_0x399bb0) {
    return _0x399bb0.rowRecordId || _0x399bb0.leadId || _0x399bb0.leadUrl || _0x399bb0.leadName;
  }
  function _0x143dfb(_0xd67069 = _0x7e508f()) {
    const _0x48c9ac = [...document.querySelectorAll(_0x1dea7c)];
    if (_0xd67069.type === _0x4fe6f2) {
      return _0x48c9ac.map(_0x7e562b => function (_0x9d55de, _0x8e8776) {
        const _0x1361df = _0x9d55de.querySelector("[data-label=\"Name\"] a[href*=\"/lightning/r/\"]");
        const _0x51f094 = _0x38fe33(_0x1361df);
        return {
          sourceReportName: _0x8e8776.name,
          sourceReportType: _0x8e8776.type,
          rowNumber: _0x9d55de.getAttribute("data-row-number") || "",
          rowRecordId: _0x9d55de.getAttribute("data-row-key-value") || "",
          appointmentDate: _0x46b90e(_0x9d55de, "Appointment Date"),
          appointmentTime: _0x46b90e(_0x9d55de, "Appointment Time"),
          leadName: _0x664ce6(_0x1361df),
          leadUrl: _0x51f094,
          leadId: _0x2c3882(_0x51f094),
          market: _0x46b90e(_0x9d55de, "Market"),
          leadSource: _0x46b90e(_0x9d55de, "Lead Source"),
          subSource: _0x46b90e(_0x9d55de, "Sub Source")
        };
      }(_0x7e562b, _0xd67069));
    } else if (_0xd67069.type === _0x2e5921) {
      return _0x48c9ac.map(_0x1bdd97 => function (_0x3fb882, _0x4f645e) {
        const _0x273d0f = _0x3fb882.querySelector("[data-label=\"Name\"] a[href*=\"/lightning/r/\"]");
        const _0x184002 = _0x38fe33(_0x273d0f);
        const _0x579e10 = _0x46b90e(_0x3fb882, "Appointment Date/Time");
        const _0x552c71 = function (_0x2a4561) {
          const [_0x2c610f = "", ..._0x44c7f1] = String(_0x2a4561 || "").split(",");
          return {
            date: _0x2c610f.trim(),
            time: _0x44c7f1.join(",").trim()
          };
        }(_0x579e10);
        return {
          sourceReportName: _0x4f645e.name,
          sourceReportType: _0x4f645e.type,
          rowNumber: _0x3fb882.getAttribute("data-row-number") || "",
          rowRecordId: _0x3fb882.getAttribute("data-row-key-value") || "",
          appointmentDate: _0x552c71.date,
          appointmentTime: _0x552c71.time,
          appointmentDateTime: _0x579e10,
          leadName: _0x664ce6(_0x273d0f),
          leadUrl: _0x184002,
          leadId: _0x2c3882(_0x184002),
          market: _0x46b90e(_0x3fb882, "Market"),
          leadSource: "",
          subSource: _0x46b90e(_0x3fb882, "Sub Source")
        };
      }(_0x1bdd97, _0xd67069));
    } else {
      return _0x48c9ac.map(_0x5831cd => function (_0x639163, _0x24a29a) {
        const _0x348456 = _0x639163.querySelector("[data-label=\"Lead\"] a[href*=\"/lightning/r/\"]");
        const _0x2c3ade = _0x639163.querySelector("[data-label=\"Work Type\"] a[href*=\"/lightning/r/\"]");
        const _0x399969 = _0x38fe33(_0x348456);
        return {
          sourceReportName: _0x24a29a.name,
          sourceReportType: _0x24a29a.type,
          rowNumber: _0x639163.getAttribute("data-row-number") || "",
          rowRecordId: _0x639163.getAttribute("data-row-key-value") || "",
          appointmentTime: _0x46b90e(_0x639163, "Appointment Time"),
          leadName: _0x664ce6(_0x348456),
          leadUrl: _0x399969,
          leadId: _0x2c3882(_0x399969),
          workType: _0x664ce6(_0x2c3ade),
          workTypeUrl: _0x38fe33(_0x2c3ade),
          market: _0x46b90e(_0x639163, "Market")
        };
      }(_0x5831cd, _0xd67069));
    }
  }
  function _0x33b983(_0x57c849) {
    return Boolean(_0x57c849.rowRecordId && _0x57c849.rowRecordId !== "HEADER" && (_0x57c849.leadName || _0x57c849.leadUrl));
  }
  async function _0x2892e2(_0x4df682, _0x5d9e02 = {}) {
    const _0x432eeb = Boolean(_0x5d9e02.debug);
    const _0x3c65b2 = _0x5d9e02.run || _0x491fd0.currentRun;
    _0x447c7d(_0x3c65b2);
    if (_0x432eeb) {
      _0x6abc36("Opening or reusing search assistant panel");
    }
    let _0x5dc6a1;
    let _0x17e25e = await _0x57a20e(_0x3c65b2);
    if (_0x432eeb) {
      (function (_0x31170a) {
        _0x6abc36("Panel found: " + Boolean(_0x31170a));
        _0x6abc36("Matching dialog search inputs in panel: " + _0x31170a.querySelectorAll(_0x2c3d21).length);
        _0x6abc36("All search inputs in panel: " + _0x31170a.querySelectorAll("input[type=\"search\"]").length);
        _0x6abc36("Record suggestion rows: " + _0x31170a.querySelectorAll(_0x4c9a04).length);
      })(_0x17e25e);
    }
    try {
      _0x5dc6a1 = await _0x26a0d8(_0x17e25e, _0x3c65b2);
    } catch (_0x433cf7) {
      _0x6abc36("Search input was not ready; recovering search assistant panel: " + _0x433cf7.message);
      _0x17e25e = await async function (_0x15e5a0, _0x20b355 = _0x491fd0.currentRun) {
        _0x10b691(_0x15e5a0);
        await _0x481f24(250, _0x20b355);
        const _0xcbb04 = _0x3eabea();
        if (_0xcbb04 && _0x501bc7(_0xcbb04)) {
          _0x6abc36("Search assistant input refocused after dismissing transient UI");
          return _0xcbb04;
        }
        if (_0xcbb04 && _0x14dce0(_0xcbb04)) {
          _0x6abc36("Search assistant recovered after dismissing transient UI");
          return _0xcbb04;
        }
        const _0x293393 = {
          bubbles: !0,
          composed: !0,
          key: "Escape"
        };
        _0x6abc36("Reopening search assistant panel after stale input state");
        document.dispatchEvent(new KeyboardEvent("keydown", _0x293393));
        document.dispatchEvent(new KeyboardEvent("keyup", {
          bubbles: !0,
          composed: !0,
          key: "Escape"
        }));
        await _0x481f24(300, _0x20b355);
        return await _0x57a20e(_0x20b355);
      }(_0x17e25e, _0x3c65b2);
      _0x5dc6a1 = await _0x26a0d8(_0x17e25e, _0x3c65b2);
    }
    if (_0x432eeb) {
      _0x4b5ad2(_0x5dc6a1, "before input");
    }
    const _0xeb5277 = _0x191190(_0x17e25e);
    await async function (_0x198d67, _0x583eab, _0x24fdd5 = {}) {
      const _0x339b83 = Boolean(_0x24fdd5.debug);
      const _0x5f4f7b = _0x24fdd5.run || _0x491fd0.currentRun;
      _0x447c7d(_0x5f4f7b);
      _0x198d67.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
      _0x581e05(_0x198d67, "down");
      _0x198d67.click();
      _0x198d67.focus();
      _0x198d67.select?.();
      await _0x481f24(50, _0x5f4f7b);
      if (_0x339b83) {
        _0x6abc36("Trying native value setter input");
      }
      const _0x5697ed = Object.getPrototypeOf(_0x198d67);
      const _0x4a2bff = Object.getOwnPropertyDescriptor(_0x5697ed, "value")?.set;
      if (_0x4a2bff) {
        _0x4a2bff.call(_0x198d67, "");
        _0x198d67.dispatchEvent(_0x5b4561("input", "", "deleteContentBackward"));
        _0x4a2bff.call(_0x198d67, _0x583eab);
      } else {
        _0x198d67.value = _0x583eab;
      }
      const _0x4a929f = {
        bubbles: !0,
        composed: !0
      };
      _0x198d67.dispatchEvent(_0x5b4561("beforeinput", _0x583eab, "insertText"));
      _0x198d67.dispatchEvent(_0x5b4561("input", _0x583eab, "insertText"));
      _0x5b909c(_0x198d67, _0x583eab);
      _0x198d67.dispatchEvent(new Event("change", _0x4a929f));
      await _0x481f24(250, _0x5f4f7b);
      if (_0x198d67.value === _0x583eab) {
        if (_0x339b83) {
          _0x6abc36("Native value setter worked");
        }
        return;
      }
      if (_0x339b83) {
        _0x6abc36("Native value setter did not stick. Current value: " + JSON.stringify(_0x198d67.value));
      }
      await async function (_0x45707c, _0x22dbc1, _0x352e5c = {}) {
        const _0x41d4d8 = Boolean(_0x352e5c.debug);
        const _0x5abcfc = _0x352e5c.run || _0x491fd0.currentRun;
        _0x447c7d(_0x5abcfc);
        _0x45707c.focus();
        _0x45707c.select?.();
        document.execCommand("delete");
        await _0x481f24(50, _0x5abcfc);
        const _0x4771b5 = document.execCommand("insertText", !1, _0x22dbc1);
        const _0x416cd4 = {
          bubbles: !0,
          composed: !0
        };
        _0x45707c.dispatchEvent(_0x5b4561("beforeinput", _0x22dbc1, "insertText"));
        _0x45707c.dispatchEvent(_0x5b4561("input", _0x22dbc1, "insertText"));
        _0x5b909c(_0x45707c, _0x22dbc1);
        _0x45707c.dispatchEvent(new Event("change", _0x416cd4));
        await _0x481f24(250, _0x5abcfc);
        if (_0x41d4d8) {
          _0x6abc36("execCommand insertText returned " + _0x4771b5 + "; input value is " + JSON.stringify(_0x45707c.value));
        }
      }(_0x198d67, _0x583eab, {
        debug: _0x339b83,
        run: _0x5f4f7b
      });
    }(_0x5dc6a1, _0x4df682.leadName, {
      debug: _0x432eeb,
      run: _0x3c65b2
    });
    if (_0x432eeb) {
      _0x4b5ad2(_0x5dc6a1, "after input");
    }
    await async function (_0xeed044, _0x2485da = {}) {
      const _0x3da070 = _0x2485da.run || _0x491fd0.currentRun;
      const _0x1caea4 = _0x2485da.beforeSignature || "";
      const _0x392335 = _0x2485da.query || "";
      const _0x3b6dc3 = Date.now();
      let _0x1edf4b = -1;
      while (Date.now() - _0x3b6dc3 < 10000) {
        _0x447c7d(_0x3da070);
        const _0x4495d0 = Date.now() - _0x3b6dc3;
        const _0x141e63 = Math.floor(_0x4495d0 / 1000);
        const _0x381d03 = _0x5b1678(_0xeed044);
        const _0x57a831 = _0x381d03.length;
        const _0x1ded60 = _0x191190(_0xeed044);
        const _0x700d8d = Boolean(_0x1ded60 && _0x1ded60 !== _0x1caea4);
        const _0xc59566 = _0x381d03.some(_0x7766de => _0x4c4cb8(_0x7766de, _0x392335));
        if (_0x57a831 && (_0x700d8d || _0xc59566 || !_0x1caea4)) {
          _0x6abc36("Search results ready after " + _0x4495d0 + "ms: " + _0x57a831 + " Lead results, changed=" + _0x700d8d + ", matchesQuery=" + _0xc59566);
          return;
        }
        if (_0x141e63 !== _0x1edf4b) {
          _0x1edf4b = _0x141e63;
          _0x6abc36("Waiting for Lead results: " + _0x141e63 + "s, panelBusy=" + _0x36466d(_0xeed044) + ", visibleLeads=" + _0x57a831 + ", changed=" + _0x700d8d + ", matchesQuery=" + _0xc59566 + ", allResults=" + _0xeed044.querySelectorAll(_0x4c9a04).length);
        }
        await _0x481f24(100, _0x3da070);
      }
      _0x6abc36("No refreshed Lead results after 10000ms; continuing with current visible result list");
    }(_0x17e25e, {
      beforeSignature: _0xeb5277,
      query: _0x4df682.leadName,
      run: _0x3c65b2
    });
    const _0x440fe3 = _0x5b1678(_0x17e25e);
    _0x6abc36("Visible Lead results for " + _0x4df682.leadName + ": " + _0x440fe3.length + " (" + (_0x440fe3.map(_0x19caf0).join(" | ") || "none") + ")");
    const _0x37866f = {
      name: _0x4df682.leadName,
      href: _0x4df682.leadUrl
    };
    const _0x5ca7ea = _0x37866f;
    for (const _0x3993f6 of _0x440fe3) {
      _0x447c7d(_0x3c65b2);
      _0x6abc36("Hovering result for " + _0x4df682.leadName + ": " + _0x19caf0(_0x3993f6));
      const _0x59db38 = _0x2aaaee(_0x17e25e);
      _0x535beb(_0x3993f6);
      _0x3993f6.focus?.();
      const _0xcaeaec = {
        debug: _0x432eeb,
        run: _0x3c65b2
      };
      const _0x446c1a = await _0x4749e0(_0x17e25e, _0x59db38, _0xcaeaec);
      _0x6abc36("Preview identity for " + _0x4df682.leadName + ": " + JSON.stringify(_0x446c1a));
      if (!_0x3551bf(_0x446c1a, _0x5ca7ea)) {
        continue;
      }
      const _0x899fbc = _0x84a102(_0x17e25e);
      let _0x5c1aaf = {};
      if (!_0x5d51bf(_0x4df682)) {
        // Lead was found. Try to pull the Work Order / Product; if the first
        // attempt comes back empty, go back and retry (re-hover the matched
        // result so the preview + related list reload) up to 3 times total.
        const _woMaxAttempts = 3;
        for (let _woAttempt = 0; _woAttempt < _woMaxAttempts; _woAttempt += 1) {
          _0x5c1aaf = await _0x429119(_0x17e25e, _0x3c65b2);
          if (_0x5c1aaf.workType) {
            break;
          }
          if (_woAttempt < _woMaxAttempts - 1) {
            _0x6abc36("Work Order not found for " + _0x4df682.leadName + " on attempt " + (_woAttempt + 1) + "; going back to retry");
            _0x535beb(_0x3993f6);
            _0x3993f6.focus?.();
            await _0x481f24(500, _0x3c65b2);
          }
        }
        _0x6abc36(_0x5c1aaf.workType ? "Work Order Work Type for " + _0x4df682.leadName + ": " + _0x5c1aaf.workType : "No Work Order Work Type found for " + _0x4df682.leadName + " after " + _woMaxAttempts + " attempts");
      }
      return {
        found: !0,
        data: {
          name: _0x446c1a.name,
          recordId: _0x446c1a.recordId,
          href: _0x446c1a.href,
          company: _0x899fbc.company,
          phone: _0x899fbc.phone,
          email: _0x899fbc.email,
          city: _0x899fbc.city,
          ..._0x5c1aaf
        }
      };
    }
    const _0xca62 = {
      found: !1,
      reason: "No visible Lead search result matched expected record ID"
    };
    return _0xca62;
  }
  async function _0x57a20e(_0x5b103e = _0x491fd0.currentRun) {
    _0x447c7d(_0x5b103e);
    const _0x1af058 = _0x3eabea();
    if (_0x1af058) {
      _0x6abc36("Search assistant panel already open and visible");
      return _0x1af058;
    }
    const _0x1e8cb3 = function () {
      const _0x40bf2e = document.querySelector(_0x5994b5);
      const _0x3805d3 = _0x40bf2e?.querySelector("button.search-button[aria-label^=\"Search\"]");
      if (_0x44794a(_0x3805d3)) {
        return _0x3805d3;
      }
      const _0xd58b1a = document.querySelector(_0x2c1961);
      if (_0x44794a(_0xd58b1a)) {
        return _0xd58b1a;
      } else {
        return [...document.querySelectorAll("button.search-button, button[aria-label^=\"Search\"], button[title*=\"Search\"]")].find(_0x4da37a => _0x44794a(_0x4da37a) && Boolean(_0x4da37a.closest(_0x5994b5) || _0x4da37a.matches("button.search-button")));
      }
    }();
    if (!_0x1e8cb3) {
      throw new Error("Global search button was not found");
    }
    (function () {
      const _0x1eb0ec = document.querySelectorAll(_0x2c1961);
      const _0x472af4 = document.querySelectorAll("button.search-button, button[aria-label*=\"Search\"], button[title*=\"Search\"]");
      _0x6abc36("Strict global search buttons: " + _0x1eb0ec.length);
      _0x6abc36("Broad search-like buttons: " + _0x472af4.length);
      [..._0x472af4].slice(0, 5).forEach((_0x4f1b30, _0x421674) => {
        _0x6abc36("Search button " + (_0x421674 + 1) + ": class=" + JSON.stringify(_0x4f1b30.className) + ", text=" + JSON.stringify(_0x4f1b30.textContent.trim()) + ", aria=" + JSON.stringify(_0x4f1b30.getAttribute("aria-label")) + ", title=" + JSON.stringify(_0x4f1b30.getAttribute("title")) + ", visible=" + (_0x4f1b30.offsetParent !== null));
      });
    })();
    _0x6abc36("Clicking global search button");
    (function (_0x309142) {
      const _0x17838e = {
        bubbles: !0,
        view: window
      };
      const _0x45d09c = {
        bubbles: !0,
        view: window
      };
      _0x309142.scrollIntoView({
        block: "nearest",
        inline: "nearest"
      });
      _0x581e05(_0x309142, "down");
      _0x309142.focus?.();
      _0x309142.dispatchEvent(new PointerEvent("pointerup", _0x17838e));
      _0x309142.dispatchEvent(new MouseEvent("mouseup", _0x45d09c));
      _0x309142.click();
    })(_0x1e8cb3);
    try {
      return await _0x3b6c9a(() => _0x3eabea(), 8000, "search assistant panel", _0x5b103e);
    } catch (_0x54b177) {
      (function () {
        const _0x3797da = [...document.querySelectorAll(_0x192742)];
        const _0x464d68 = [...document.querySelectorAll("input[type=\"search\"]")];
        _0x6abc36("Search panel candidates: " + _0x3797da.length);
        _0x3797da.slice(0, 8).forEach((_0x47ba94, _0x45be00) => {
          _0x6abc36("Panel candidate " + (_0x45be00 + 1) + ": tag=" + _0x47ba94.tagName.toLowerCase() + ", class=" + JSON.stringify(_0x47ba94.className) + ", hidden=" + JSON.stringify(_0x47ba94.getAttribute("aria-hidden")) + ", matchingInputs=" + (_0x47ba94.querySelectorAll?.(_0x2c3d21).length || 0) + ", inputs=" + (_0x47ba94.querySelectorAll?.("input[type=\"search\"]").length || 0) + ", previews=" + (_0x47ba94.querySelectorAll?.(".forceSearchAssistantSecondaryPanel[aria-label=\"Record Preview\"]").length || 0) + ", results=" + (_0x47ba94.querySelectorAll?.(_0x8367a1).length || 0));
        });
        _0x6abc36("All search inputs on page: " + _0x464d68.length);
        _0x464d68.slice(0, 8).forEach((_0x45f8a, _0x275609) => {
          _0x6abc36("Search input " + (_0x275609 + 1) + ": class=" + JSON.stringify(_0x45f8a.className) + ", placeholder=" + JSON.stringify(_0x45f8a.getAttribute("placeholder")) + ", aria-controls=" + JSON.stringify(_0x45f8a.getAttribute("aria-controls")) + ", visible=" + (_0x45f8a.offsetParent !== null));
        });
      })();
      throw _0x54b177;
    }
  }
  function _0x501bc7(_0x3f31a5) {
    const _0x4e2259 = _0x14dce0(_0x3f31a5);
    return !!_0x4e2259 && !_0x4e2259.disabled && _0x4e2259.getAttribute("aria-disabled") !== "true" && (_0x4e2259.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    }), _0x581e05(_0x4e2259, "down"), _0x4e2259.click(), _0x4e2259.focus(), document.activeElement === _0x4e2259 || _0x4e2259.matches(":focus"));
  }
  function _0x10b691(_0x16917e) {
    const _0x3f4681 = document.activeElement;
    const _0x48517a = {
      bubbles: !0,
      view: window,
      clientX: 1,
      clientY: 1
    };
    const _0xff7671 = {
      bubbles: !0,
      view: window,
      clientX: 1,
      clientY: 1
    };
    _0x3f4681?.blur?.();
    _0x16917e?.querySelectorAll?.(_0x2d240c).forEach(_0x3d91fd => {
      _0x581e05(_0x3d91fd, "out");
    });
    document.body.dispatchEvent(new PointerEvent("pointermove", _0x48517a));
    document.body.dispatchEvent(new MouseEvent("mousemove", _0xff7671));
  }
  function _0x3eabea() {
    const _0x24aa29 = [...document.querySelectorAll(".assistantPanel.uiPanel.open.active[aria-hidden=\"false\"]")].filter(_0x44794a).find(_0x516c2d);
    if (_0x24aa29) {
      return _0x24aa29;
    }
    const _0x30b99e = _0x14dce0(document);
    const _0x50a516 = _0x30b99e?.closest(".assistantPanel, .uiPanel, .forceSearchAssistantDialog, .saDialogPaneContainer");
    if (_0x50a516 && _0x4377e0(_0x30b99e)) {
      const _0x537cd3 = _0x50a516.closest(".assistantPanel, .uiPanel") || _0x50a516;
      if (_0x44794a(_0x537cd3) && (_0x516c2d(_0x537cd3) || _0x14dce0(_0x537cd3))) {
        return _0x537cd3;
      }
    }
    const _0x342f7b = [...document.querySelectorAll(_0x192742)].find(_0x1ae169 => _0x44794a(_0x1ae169) && _0x14dce0(_0x1ae169));
    if (_0x342f7b) {
      return _0x342f7b.closest(".assistantPanel, .uiPanel") || _0x342f7b;
    } else {
      return null;
    }
  }
  async function _0x26a0d8(_0x38ad0f, _0x25860d = _0x491fd0.currentRun) {
    return await _0x3b6c9a(() => {
      if (!_0x44794a(_0x38ad0f)) {
        return null;
      }
      const _0xcd917 = _0x14dce0(_0x38ad0f);
      if (!_0xcd917 || _0xcd917.disabled || _0xcd917.getAttribute("aria-disabled") === "true") {
        return null;
      } else {
        return _0xcd917;
      }
    }, 8000, "search input to be ready", _0x25860d);
  }
  function _0x191190(_0x8d6337) {
    return _0x5b1678(_0x8d6337).map(_0x19caf0).join("||");
  }
  function _0x4c4cb8(_0xb2fb15, _0x5e2481) {
    const _0x47348f = _0x103912(_0x19caf0(_0xb2fb15));
    const _0x5a0a12 = _0x103912(_0x5e2481).split(" ").filter(_0x50af58 => _0x50af58.length >= 3);
    return !!_0x5a0a12.length && _0x5a0a12.some(_0x3283dc => _0x47348f.includes(_0x3283dc));
  }
  function _0x516c2d(_0x39eca9) {
    return Boolean(_0x39eca9?.querySelector?.(_0x5e7d61) && _0x14dce0(_0x39eca9) && _0x39eca9.querySelector(_0x8367a1));
  }
  function _0x14dce0(_0x41d1ce) {
    return [...(_0x41d1ce.querySelectorAll?.(_0x2c3d21) || [])].find(_0x4377e0);
  }
  function _0x4377e0(_0x5c206f) {
    const _0x478798 = _0x5c206f?.closest?.(_0x5e7d61);
    return Boolean(_0x478798 && _0x44794a(_0x478798) && _0x44794a(_0x5c206f));
  }
  function _0x44794a(_0xbcff02) {
    const _0x283a2a = _0xbcff02?.getBoundingClientRect?.();
    const _0x20e707 = _0xbcff02 ? window.getComputedStyle(_0xbcff02) : null;
    return Boolean(_0xbcff02 && _0xbcff02.getClientRects().length > 0 && _0x283a2a && _0x283a2a.width > 0 && _0x283a2a.height > 0 && _0x20e707?.display !== "none" && _0x20e707?.visibility !== "hidden" && Number(_0x20e707?.opacity || 1) > 0 && _0xbcff02.getAttribute?.("aria-hidden") !== "true");
  }
  function _0x5b1678(_0x5654fc) {
    return [..._0x5654fc.querySelectorAll(_0x4c9a04)].filter(_0x1c7fe4);
  }
  function _0x5b4561(_0x4a498f, _0x136a4d, _0x1812f3) {
    const _0x5cb4f4 = {
      bubbles: !0,
      cancelable: !0,
      composed: !0,
      inputType: _0x1812f3,
      data: _0x136a4d
    };
    return new InputEvent(_0x4a498f, _0x5cb4f4);
  }
  function _0x5b909c(_0x4c7ceb, _0xffd054) {
    const _0x149884 = _0xffd054.slice(-1) || " ";
    const _0x472166 = {
      bubbles: !0,
      composed: !0,
      key: _0x149884
    };
    const _0x146e17 = {
      bubbles: !0,
      composed: !0,
      key: _0x149884
    };
    _0x4c7ceb.dispatchEvent(new KeyboardEvent("keydown", _0x472166));
    _0x4c7ceb.dispatchEvent(new KeyboardEvent("keyup", _0x146e17));
  }
  function _0x1c7fe4(_0x3d9ece) {
    const _0x341b93 = _0x3d9ece.querySelector(".secondary")?.textContent?.trim();
    const _0x154620 = _0x3d9ece.querySelector("img[title=\"Lead\"], img[alt=\"Lead\"]");
    return _0x341b93 === "Lead" || Boolean(_0x154620);
  }
  function _0x535beb(_0x1bd1fd) {
    _0x1bd1fd.scrollIntoView({
      block: "nearest",
      inline: "nearest"
    });
    _0x581e05(_0x1bd1fd, "hover");
  }
  function _0x581e05(_0x3c4102, _0x38e9bb) {
    const _0xfe2a9c = _0x38e9bb === "down" ? ["pointerover", "pointerenter", "pointerdown"] : _0x38e9bb === "out" ? ["pointerout", "pointerleave"] : ["pointerover", "pointerenter", "pointermove"];
    const _0xf57bf2 = _0x38e9bb === "down" ? ["mouseover", "mouseenter", "mousedown"] : _0x38e9bb === "out" ? ["mouseout", "mouseleave"] : ["mouseover", "mouseenter", "mousemove"];
    const _0x125adb = {
      bubbles: !0,
      view: window
    };
    for (const _0x3f3737 of _0xfe2a9c) {
      _0x3c4102.dispatchEvent(new PointerEvent(_0x3f3737, _0x125adb));
    }
    const _0x2df393 = {
      bubbles: !0,
      view: window
    };
    for (const _0x448895 of _0xf57bf2) {
      _0x3c4102.dispatchEvent(new MouseEvent(_0x448895, _0x2df393));
    }
  }
  function _0x19caf0(_0x4c5c9e) {
    return _0x4c5c9e.querySelector(".primary")?.textContent?.replace(/\s+/g, " ").trim() || _0x4c5c9e.querySelector("[id^=\"suggestion-tooltip-label-\"]")?.textContent?.trim() || _0x4c5c9e.textContent?.replace(/\s+/g, " ").trim() || "(unlabeled result)";
  }
  function _0x44543b(_0x3fdb82) {
    return _0x3fdb82.querySelector(_0x3a0cfe) || _0x3fdb82;
  }
  function _0x2aaaee(_0x3a6cf8) {
    const _0x17568a = function (_0x1ff219) {
      return _0x1ff219.querySelector(".forceSearchRecordPreviewHeader h2.recordTitle a[data-refid=\"recordId\"][data-recordid][href^=\"/lightning/r/\"][href$=\"/view\"]");
    }(_0x3a6cf8);
    if (!_0x17568a) {
      return null;
    }
    const _0x226d58 = _0x10b360(_0x17568a.getAttribute("href"));
    const _0x54e0b8 = _0x17568a.dataset.recordid || _0x2c3882(_0x226d58);
    return {
      name: _0x17568a.getAttribute("title") || _0x17568a.textContent.trim(),
      href: _0x226d58,
      recordId: _0x54e0b8
    };
  }
  async function _0x4749e0(_0x5350da, _0x5d9078, _0xfda7c2 = {}) {
    const _0x379c69 = Boolean(_0xfda7c2.debug);
    const _0xf53280 = _0xfda7c2.run || _0x491fd0.currentRun;
    const _0x4f36df = Date.now();
    let _0x2536b1 = null;
    let _0x34c587 = 0;
    while (Date.now() - _0x4f36df < 5000) {
      _0x447c7d(_0xf53280);
      const _0x24be8d = _0x5350da.querySelector(_0x3a0cfe);
      const _0x13412d = _0x5350da.querySelector(".saDialogPaneRight");
      const _0x1e94c8 = _0x36466d(_0x5350da, _0x24be8d, _0x13412d);
      const _0x35566c = _0x2aaaee(_0x5350da);
      if (!_0x1e94c8 && _0x35566c?.recordId) {
        if (_0x35566c.recordId === _0x2536b1) {
          _0x34c587 += 1;
        } else {
          _0x2536b1 = _0x35566c.recordId;
          _0x34c587 = 1;
        }
        if ((!_0x5d9078?.recordId || _0x35566c.recordId !== _0x5d9078.recordId) && _0x34c587 >= 2) {
          if (_0x379c69) {
            _0x6abc36("Preview settled in " + (Date.now() - _0x4f36df) + "ms");
          }
          return _0x35566c;
        }
        if (_0x34c587 >= 4 && Date.now() - _0x4f36df >= 1000) {
          if (_0x379c69) {
            _0x6abc36("Preview was already stable after " + (Date.now() - _0x4f36df) + "ms");
          }
          return _0x35566c;
        }
      }
      await _0x481f24(100, _0xf53280);
    }
    const _0x331f0a = _0x2aaaee(_0x5350da);
    if (_0x379c69) {
      _0x6abc36("Preview wait timed out after " + (Date.now() - _0x4f36df) + "ms; using " + JSON.stringify(_0x331f0a));
    }
    return _0x331f0a;
  }
  function _0x36466d(_0x294903, _0x70e9a6 = null, _0x1e18d3 = null) {
    return Boolean(_0x70e9a6?.getAttribute("aria-busy") === "true" || _0x1e18d3?.getAttribute("aria-busy") === "true" || _0x294903?.getAttribute?.("aria-busy") === "true" || Boolean(_0x294903?.querySelector?.(".forceInlineSpinner:not(.hideEl)")));
  }
  function _0x3551bf(_0x34d7e9, _0x37ed25) {
    const _0x1ec888 = _0x2c3882(_0x37ed25.href);
    return Boolean(_0x34d7e9 && _0x34d7e9.recordId && _0x1ec888 && _0x34d7e9.recordId === _0x1ec888);
  }
  function _0x84a102(_0x52c92e) {
    const _0x1cf667 = _0x44543b(_0x52c92e);
    return {
      company: _0x1846f2(_0x1cf667, "Company"),
      phone: _0x1846f2(_0x1cf667, "Phone"),
      email: _0x1846f2(_0x1cf667, "Email"),
      city: _0x1846f2(_0x1cf667, "City")
    };
  }
  async function _0x429119(_0x5415a5, _0x330c85 = _0x491fd0.currentRun) {
    const _0x47f796 = _0x44543b(_0x5415a5).querySelector(_0x2d240c);
    if (!_0x47f796) {
      _0x6abc36("Work Orders related link was not present in Lead preview");
      return {};
    }
    _0x6abc36("Hovering Work Orders related link");
    _0x535beb(_0x47f796);
    try {
      const _0x2c3727 = await async function (_0x4e1ed3, _0x2e4eae = _0x491fd0.currentRun) {
        const _0x5f2395 = Date.now();
        let _0x439611 = -1;
        while (Date.now() - _0x5f2395 < 3500) {
          _0x447c7d(_0x2e4eae);
          const _0x589d94 = _0x505a05(_0x4e1ed3);
          if (_0x589d94) {
            return _0x589d94;
          }
          const _0x377207 = Math.floor((Date.now() - _0x5f2395) / 1000);
          if (_0x377207 !== _0x439611) {
            _0x439611 = _0x377207;
            _0x6abc36("Waiting for Work Orders table: " + _0x377207 + "s, relatedLinks=" + document.querySelectorAll(_0x2d240c).length + ", candidateTables=" + _0xf36039(_0x4e1ed3).length);
          }
          await _0x481f24(100, _0x2e4eae);
        }
        return null;
      }(_0x5415a5, _0x330c85);
      if (_0x2c3727) {
        return function (_0x34d21e) {
          const _0x4cb97e = _0x557b99(_0x34d21e);
          const _0x49cf04 = _0x4cb97e.indexOf("Work Type");
          if (_0x49cf04 === -1) {
            return {};
          }
          const _0x120183 = [..._0x34d21e.querySelectorAll("tbody tr")].find(_0x44794a);
          if (!_0x120183) {
            return {};
          }
          const _0x32d5e2 = [..._0x120183.querySelectorAll("th, td")][_0x49cf04];
          if (!_0x32d5e2) {
            return {};
          }
          const _0x5764e7 = _0x32d5e2.querySelector(_0xe353d9);
          const _0xa992e2 = (_0x5764e7?.getAttribute?.("title") || _0x5764e7?.textContent || _0x32d5e2.textContent || "").replace(/\s+/g, " ").trim();
          if (!_0xa992e2) {
            return {};
          }
          const _0x4115ef = _0x5764e7 ? _0x10b360(_0x5764e7.getAttribute("href")) : "";
          return {
            workType: _0xa992e2,
            workTypeUrl: _0x4115ef,
            workTypeId: _0x5764e7?.dataset?.recordid || _0x2c3882(_0x4115ef),
            product: _0xa992e2
          };
        }(_0x2c3727);
      } else {
        return {};
      }
    } finally {
      _0x10b691(_0x5415a5);
      if (_0x501bc7(_0x5415a5)) {
        _0x6abc36("Search input refocused after Work Orders hover");
      }
      await _0x481f24(100, _0x330c85);
    }
  }
  function _0x505a05(_0x4383d8) {
    return _0xf36039(_0x4383d8).find(_0x3ef6e8 => {
      const _0x5599b8 = [..._0x3ef6e8.querySelectorAll("tbody tr")].find(_0x44794a);
      return Boolean(_0x5599b8);
    }) || null;
  }
  function _0xf36039(_0x412042) {
    const _0x450725 = [_0x44543b(_0x412042), _0x412042, document];
    const _0x4f0632 = [];
    for (const _0x65782c of _0x450725) {
      _0x65782c.querySelectorAll?.("table[role=\"grid\"]").forEach(_0x22fd92 => {
        if (!_0x4f0632.includes(_0x22fd92) && _0x2f24ed(_0x22fd92)) {
          _0x4f0632.push(_0x22fd92);
        }
      });
    }
    return _0x4f0632;
  }
  function _0x2f24ed(_0x4785ab) {
    const _0x3667be = _0x557b99(_0x4785ab);
    return _0x3667be.includes("Work Order Number") && _0x3667be.includes("Work Type");
  }
  function _0x557b99(_0x5cd071) {
    return [..._0x5cd071.querySelectorAll("thead th")].map(_0x40d16d => (_0x40d16d.getAttribute("title") || _0x40d16d.getAttribute("aria-label") || _0x40d16d.textContent || "").replace(/\s+/g, " ").trim());
  }
  function _0x5d51bf(_0x3d49da) {
    return _0x28285a(_0x3d49da.workType || _0x3d49da.product || _0x3d49da.searchResult?.workType || _0x3d49da.searchResult?.product);
  }
  function _0x460c41(_0x40c79e) {
    return _0x40c79e.searchStatus === "found" && !_0x5d51bf(_0x40c79e);
  }
  function _0x256465(_0x492a5b, _0x544d00) {
    if (_0x5d51bf(_0x492a5b) || !_0x544d00?.workType) {
      return {};
    } else {
      return {
        workType: _0x544d00.workType,
        workTypeUrl: _0x544d00.workTypeUrl || "",
        workTypeId: _0x544d00.workTypeId || "",
        product: _0x544d00.product || _0x544d00.workType
      };
    }
  }
  function _0x1846f2(_0x14b8ee, _0x12ca4d) {
    const _0x63466e = [..._0x14b8ee.querySelectorAll(".forceSearchRecordPreviewBody li")].find(_0x49bc46 => {
      const _0x25dd39 = _0x49bc46.querySelector("lightning-formatted-text.slds-form-element__label");
      return _0x25dd39?.getAttribute("title") === _0x12ca4d || _0x25dd39?.textContent?.trim() === _0x12ca4d;
    });
    if (!_0x63466e) {
      return null;
    }
    const _0x1b8ad9 = _0x63466e.querySelector("div.slds-truncate");
    if (!_0x1b8ad9) {
      return null;
    }
    const _0x234a40 = _0x1b8ad9.querySelector("lightning-formatted-text[title]:not(.slds-form-element__label)") || _0x1b8ad9.querySelector("a[href^=\"mailto:\"]") || _0x1b8ad9.querySelector(".uiOutputPhone") || _0x1b8ad9;
    return (_0x234a40.getAttribute?.("title") || _0x234a40.textContent || "").replace(/\s+/g, " ").trim() || null;
  }
  function _0x509848(_0x19ebd3) {
    return _0x19ebd3.filter(_0x1f9b37 => _0x1f9b37.rowRecordId !== "HEADER").map(_0x1cb108);
  }
  function _0x1cb108(_0x390016) {
    const {
      lookupStatus: _0x43a9a9,
      lookupData: _0x1bc491,
      lookupError: _0x45079e,
      ..._0x2078b7
    } = _0x390016;
    const _0x37146b = {
      ..._0x2078b7
    };
    _0x37146b.searchStatus = _0x2078b7.searchStatus || _0x43a9a9 || "pending";
    _0x37146b.searchResult = _0x2078b7.searchResult || _0x1bc491 || {};
    _0x37146b.searchError = _0x2078b7.searchError || _0x45079e || "";
    return _0x37146b;
  }
  function _0x4a7bb5(_0x27873c) {
    return _0x27873c.searchStatus === "found";
  }
  function _0x300fe8(_0x1c8e51) {
    if (_0x1c8e51.found) {
      if (function (_0x13d16f) {
        return ["company", "phone", "email", "city"].some(_0x56c7d4 => _0x28285a(_0x13d16f[_0x56c7d4]));
      }(_0x1c8e51.data)) {
        return "found";
      } else {
        return "incomplete";
      }
    } else {
      return "not_found";
    }
  }
  function _0x28285a(_0x1fd69c) {
    if (typeof _0x1fd69c == "string") {
      return _0x1fd69c.trim() !== "";
    } else {
      return _0x1fd69c != null;
    }
  }
  function _0x2e747a(_0x1ee863, _0x2c5324) {
    if (_0x2c5324 === "found") {
      return "";
    } else if (_0x2c5324 === "incomplete") {
      return "Matched Lead, but preview fields were empty";
    } else {
      return _0x1ee863.reason || "No matching Lead found";
    }
  }
  function _0x7e508f() {
    const _0x426156 = _0x3d3413();
    const _0x49931c = _0x103912(_0x426156);
    let _0x1171f9 = _0x40a668;
    if (_0x49931c === _0x103912(_0x5a35a4[_0x47d3ac])) {
      _0x1171f9 = _0x47d3ac;
    }
    if (_0x49931c === _0x103912(_0x5a35a4[_0x4fe6f2])) {
      _0x1171f9 = _0x4fe6f2;
    }
    if (_0x49931c === _0x103912(_0x5a35a4[_0x2e5921])) {
      _0x1171f9 = _0x2e5921;
    }
    return {
      name: _0x426156 || _0x5a35a4[_0x1171f9] || "",
      type: _0x1171f9
    };
  }
  function _0x3d3413() {
    return document.querySelector("lst-list-view-picker .slds-page-header__title")?.textContent?.trim() || document.querySelector(".slds-page-header__title")?.textContent?.trim() || "";
  }
  function _0x46b90e(_0x193176, _0x156e8b) {
    const _0x3b679f = _0x193176.querySelector("[data-label=\"" + _0x58a0a8(_0x156e8b) + "\"]");
    if (!_0x3b679f) {
      return "";
    }
    const _0x48541c = _0x3b679f.querySelector("lightning-formatted-date-time") || _0x3b679f.querySelector("lst-formatted-text [title]") || _0x3b679f.querySelector("lightning-formatted-text[title]") || _0x3b679f.querySelector("a[title]") || _0x3b679f.querySelector("[title]");
    return function (_0x1478db, _0x9ee87a) {
      return String(_0x1478db || "").replace(new RegExp("\\bEdit " + function (_0x2cfd55) {
        return String(_0x2cfd55).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }(_0x9ee87a) + "\\b", "gi"), "").replace(/\s+/g, " ").trim();
    }(_0x48541c?.getAttribute?.("title") || _0x48541c?.textContent || _0x3b679f.textContent || "", _0x156e8b);
  }
  function _0x664ce6(_0x5a8690) {
    return (_0x5a8690?.getAttribute?.("title") || _0x5a8690?.textContent || "").replace(/\s+/g, " ").trim();
  }
  function _0x58a0a8(_0x4b31a9) {
    if (window.CSS?.escape) {
      return CSS.escape(_0x4b31a9);
    } else {
      return String(_0x4b31a9).replace(/["\\]/g, "\\$&");
    }
  }
  function _0x2f4d41() {
    return [...new Set(_0x491fd0.records.map(_0x57fa0e => _0x57fa0e.market).filter(Boolean))].sort((_0x5072be, _0x32666e) => _0x5072be.localeCompare(_0x32666e));
  }
  function _0x4c050a() {
    return _0x2f4d41().filter(_0x20c58d => _0x491fd0.selectedMarkets.has(_0x20c58d));
  }
  function _0x24c8bc() {
    const _0x4065dd = _0x4c050a();
    if (_0x4065dd.length) {
      return _0x491fd0.records.filter(_0x5a28e8 => _0x4065dd.includes(_0x5a28e8.market));
    } else {
      return [];
    }
  }
  async function _0xb409b7() {
    _0x491fd0.selectedMarkets.clear();
    await _0x105852();
  }
  function _0x146563() {
    const _0x14fae8 = new Set(_0x2f4d41());
    _0x491fd0.selectedMarkets = new Set([..._0x491fd0.selectedMarkets].filter(_0x3e6424 => _0x14fae8.has(_0x3e6424)));
  }
  async function _0x105852() {
    _0x146563();
    await _0x3f28d0.saveSelectedMarkets(_0x491fd0.selectedMarkets);
  }
  function _0x422e03() {
    const _0x4e9587 = _0x3d3413();
    const _0x524566 = _0x4e9587 ? document.querySelector("[aria-label=\"" + _0x58a0a8(_0x4e9587) + "\"].countSortedByFilteredBy") : null;
    return _0x524566?.textContent?.trim() || document.querySelector(".countSortedByFilteredBy")?.textContent?.trim() || "";
  }
  function _0x22980b(_0x4dd2d5) {
    const _0x4ac9c6 = _0x4dd2d5.match(/(\d+)\+?\s+items?/);
    if (_0x4ac9c6) {
      return Number(_0x4ac9c6[1]);
    } else {
      return 0;
    }
  }
  function _0x380cfc() {
    const _0xcc65b4 = _0x59fe4e();
    const _0x6b23fb = _0xcc65b4.scrollTop;
    const _0x11702f = window.scrollY;
    const _0x1afcbe = Math.max(0, _0xcc65b4.scrollHeight - _0xcc65b4.clientHeight);
    const _0x4cbce8 = Math.max(240, Math.floor(_0xcc65b4.clientHeight * 0.85));
    _0xcc65b4.scrollTop = Math.min(_0x1afcbe, _0x6b23fb + _0x4cbce8);
    window.scrollTo(0, Math.min(document.body.scrollHeight, _0x11702f + Math.max(window.innerHeight * 0.85, 240)));
    return _0xcc65b4.scrollTop !== _0x6b23fb || window.scrollY !== _0x11702f;
  }
  function _0x59fe4e() {
    return [...document.querySelectorAll(".slds-scrollable_y, .slds-scrollable, [role='grid']")].filter(_0x33a63c => _0x33a63c.scrollHeight > _0x33a63c.clientHeight).at(-1) || document.scrollingElement || document.documentElement;
  }
  async function _0x3b6c9a(_0x27b93b, _0x5eedee = 10000, _0xf6db52 = "condition", _0x5d0357 = _0x491fd0.currentRun) {
    const _0x4d1844 = Date.now();
    while (Date.now() - _0x4d1844 < _0x5eedee) {
      _0x447c7d(_0x5d0357);
      const _0x58bde8 = _0x27b93b();
      if (_0x58bde8) {
        return _0x58bde8;
      }
      await _0x481f24(100, _0x5d0357);
    }
    throw new Error("Timed out waiting for " + _0xf6db52);
  }
  async function _0x2af401(_0x33212d, _0x4f781b, _0x26e3be = {}) {
    _0x491fd0.busy = !0;
    const _0x5c4117 = {
      stopRequested: !1,
      stoppable: Boolean(_0x26e3be.stoppable)
    };
    _0x491fd0.currentRun = _0x5c4117;
    _0x231576(_0x33212d);
    _0x31e640(!0);
    try {
      await _0x4f781b(_0x5c4117);
    } catch (_0x212289) {
      if (_0x212289 instanceof _0x433840) {
        _0x231576("Stopped");
        _0x6abc36("Stopped by user");
        return;
      }
      _0x1303c5(_0x33212d + " failed: " + (_0x212289?.message || String(_0x212289)), _0x212289);
      throw _0x212289;
    } finally {
      _0x491fd0.busy = !1;
      if (_0x491fd0.currentRun === _0x5c4117) {
        _0x491fd0.currentRun = null;
      }
      _0x31e640(!1);
      _0x4eb678();
    }
  }
  function _0x31e640(_0x29a4e2) {
    _0x25714b.host.querySelectorAll("button").forEach(_0xa27bf0 => {
      const _0x103ca4 = _0xa27bf0.getAttribute("data-action");
      const _0x341782 = _0x103ca4 === "stop";
      const _0x74a25 = ["toggle-advanced", "open-logs", "open-error-logs", "close-logs", "copy-log", "open-json-all", "open-json-found", "close-json", "copy"].includes(_0x103ca4);
      if (_0x341782) {
        const _0x1a5443 = Boolean(_0x491fd0.busy && _0x491fd0.currentRun?.stoppable);
        _0xa27bf0.hidden = !_0x1a5443;
        _0xa27bf0.disabled = !_0x1a5443 || _0x49feb3();
        return;
      }
      _0xa27bf0.disabled = !_0x74a25 && _0x29a4e2;
    });
  }
  function _0x231576(_0x261426) {
    _0x25714b.status.textContent = _0x261426;
    _0x6abc36("Status: " + _0x261426);
  }
  function _0x4ec7be(_0x3a1eeb) {
    return new Promise((_0x2674c7, _0x15c1a1) => {
      chrome.runtime.sendMessage(_0x3a1eeb, _0x29685a => {
        if (chrome.runtime.lastError) {
          _0x15c1a1(new Error(chrome.runtime.lastError.message));
        } else if (_0x29685a?.ok) {
          _0x2674c7(_0x29685a.data);
        } else {
          _0x15c1a1(new Error(_0x29685a?.error || "Extension request failed."));
        }
      });
    });
  }
  async function _0x32d3b8(_0x11e49c = {}) {
    try {
      const _0x15e18e = await _0x4ec7be({
        type: "contextLayer:getAuthStatus"
      });
      _0x491fd0.authStatus = {
        checked: !0,
        loggedIn: Boolean(_0x15e18e.loggedIn),
        email: _0x15e18e.email || "",
        error: ""
      };
    } catch (_0x2264b1) {
      _0x1303c5("Papa login status check failed: " + (_0x2264b1?.message || String(_0x2264b1)), _0x2264b1);
      _0x491fd0.authStatus = {
        checked: !0,
        loggedIn: !1,
        email: "",
        error: _0x2264b1?.message || String(_0x2264b1)
      };
    }
    if (!_0x11e49c.silent) {
      _0x6abc36(_0x491fd0.authStatus.loggedIn ? "Papa login active: " + (_0x491fd0.authStatus.email || "(unknown)") : "Papa login inactive" + (_0x491fd0.authStatus.error ? ": " + _0x491fd0.authStatus.error : ""));
    }
    _0xa43983();
  }
  function _0xa43983() {
    if (_0x25714b.auth) {
      _0x25714b.auth.classList.toggle("mdl-auth-checking", !_0x491fd0.authStatus.checked);
      _0x25714b.auth.classList.toggle("mdl-auth-logged-in", _0x491fd0.authStatus.loggedIn);
      _0x25714b.auth.classList.toggle("mdl-auth-logged-out", _0x491fd0.authStatus.checked && !_0x491fd0.authStatus.loggedIn);
      if (_0x491fd0.authStatus.checked) {
        if (_0x491fd0.authStatus.loggedIn) {
          _0x25714b.auth.textContent = "Papa: Logged in" + (_0x491fd0.authStatus.email ? " as " + _0x491fd0.authStatus.email : "");
        } else {
          _0x25714b.auth.textContent = "Papa: Not logged in. Click the extension to log in.";
        }
      } else {
        _0x25714b.auth.textContent = "Papa: Checking login...";
      }
    }
  }
  function _0x6abc36(_0x5a9ba9) {
    const _0x652c59 = new Date().toLocaleTimeString();
    _0x491fd0.debugLines.push("[" + _0x652c59 + "] " + _0x5a9ba9);
    _0x491fd0.debugLines = _0x491fd0.debugLines.slice(-500);
    console.debug("[Record Lookup]", _0x5a9ba9);
    _0x3fe4e3();
  }
  function _0x1303c5(_0x368e25, _0x24b425 = null) {
    const _0x4497d4 = new Date().toLocaleTimeString();
    const _0x15badf = function (_0x525e57) {
      if (_0x525e57) {
        return _0x525e57?.stack || _0x525e57?.message || String(_0x525e57);
      } else {
        return "";
      }
    }(_0x24b425);
    _0x491fd0.errorLines.push("[" + _0x4497d4 + "] " + _0x368e25 + (_0x15badf ? "\n" + _0x15badf : ""));
    _0x491fd0.errorLines = _0x491fd0.errorLines.slice(-300);
    console.error("[Record Lookup]", _0x368e25, _0x24b425 || "");
    _0x3fe4e3();
  }
  function _0x4b5ad2(_0x13a9ef, _0x15433c) {
    _0x6abc36(_0x15433c + ": active=" + (document.activeElement === _0x13a9ef) + ", value=" + JSON.stringify(_0x13a9ef.value) + ", placeholder=" + JSON.stringify(_0x13a9ef.getAttribute("placeholder")) + ", aria-controls=" + JSON.stringify(_0x13a9ef.getAttribute("aria-controls")));
  }
  function _0x4eb678() {
    const _0x1bdf35 = _0x24c8bc().length;
    const _0x5c3cff = _0x24c8bc().filter(_0x46d092 => !_0x4a7bb5(_0x46d092)).length;
    const _0x4c4bba = _0x491fd0.records.filter(_0x54e592 => _0x54e592.searchStatus === "found").length;
    const _0x17325f = _0x491fd0.records.filter(_0x460c41).length;
    const _0x44199e = _0x491fd0.records.filter(_0x27171f => _0x27171f.searchStatus === "incomplete").length;
    const _0x5c1615 = _0x491fd0.records.filter(_0x4537ea => _0x4537ea.searchStatus === "not_found").length;
    const _0x1746a7 = function () {
      const _0x173312 = _0x3d3413();
      const _0x46c9e7 = _0x491fd0.reportContext?.name || _0x3fa2d0(_0x491fd0.records)?.name;
      return _0x173312 || _0x46c9e7 || "Unknown";
    }();
    _0x25714b.report.textContent = "Report: " + _0x1746a7;
    if (_0x25714b.reportHint) {
      _0x25714b.reportHint.hidden = _0x1746a7 !== "Unknown";
    }
    _0x25714b.total.textContent = _0x491fd0.records.length + " records";
    _0x25714b.selected.textContent = _0x1bdf35 + " selected";
    _0x25714b.queued.textContent = _0x5c3cff + " queued";
    _0x25714b.found.textContent = _0x4c4bba + " found";
    _0x25714b.noProduct.textContent = _0x17325f + " no product";
    _0x25714b.incomplete.textContent = _0x44199e + " incomplete";
    _0x25714b.notFound.textContent = _0x5c1615 + " not found";
    _0x25714b.selectedMarketCount.textContent = String(_0x4c050a().length);
    _0x25714b.detectedMarketCount.textContent = String(_0x2f4d41().length);
    _0xa43983();
    _0x418026();
    (function () {
      const _0x225bc7 = _0x491fd0.records.length > 0;
      const _0x3205ba = _0x4c050a().length > 0;
      _0x25714b.host.classList.toggle("mdl-has-records", _0x225bc7);
      _0x25714b.host.classList.toggle("mdl-has-selected-markets", _0x3205ba);
      _0x25714b.marketPanel.hidden = !_0x225bc7;
      _0x25714b.selectedPanel.hidden = !_0x3205ba;
    })();
    (function () {
      if (!_0x25714b.selectedMarketRows) {
        return;
      }
      _0x25714b.selectedMarketRows.replaceChildren();
      const _0x3bb081 = _0x4c050a();
      const _0x1a8cc9 = {
        found: 0,
        productFound: 0,
        notFound: 0,
        total: 0
      };
      _0x3bb081.forEach(_0x1ccf08 => {
        const _0x6a4e7e = function (_0x154bb5) {
          const _0x78b4fa = _0x491fd0.records.filter(_0x12d698 => _0x12d698.market === _0x154bb5);
          return {
            market: _0x154bb5,
            found: _0x78b4fa.filter(_0x45af2a => _0x45af2a.searchStatus === "found").length,
            productFound: _0x78b4fa.filter(_0x39e24e => _0x39e24e.searchStatus === "found" && _0x5d51bf(_0x39e24e)).length,
            notFound: _0x78b4fa.filter(_0x44bb9b => _0x44bb9b.searchStatus === "not_found").length,
            total: _0x78b4fa.length
          };
        }(_0x1ccf08);
        _0x1a8cc9.found += _0x6a4e7e.found;
        _0x1a8cc9.productFound += _0x6a4e7e.productFound;
        _0x1a8cc9.notFound += _0x6a4e7e.notFound;
        _0x1a8cc9.total += _0x6a4e7e.total;
        const _0x4f1998 = document.createElement("tr");
        const _0x153496 = document.createElement("td");
        const _0x1283d3 = document.createElement("button");
        _0x1283d3.className = "mdl-remove-market-button";
        _0x1283d3.type = "button";
        _0x1283d3.setAttribute("data-action", "remove-market");
        _0x1283d3.setAttribute("data-market", _0x1ccf08);
        _0x1283d3.setAttribute("title", "Remove " + _0x1ccf08);
        _0x1283d3.textContent = "-";
        _0x153496.appendChild(_0x1283d3);
        const _0x374df7 = document.createElement("td");
        _0x374df7.textContent = _0x6a4e7e.market;
        const _0x4f52f5 = document.createElement("td");
        _0x4f52f5.textContent = String(_0x6a4e7e.found);
        const _0x2934ba = document.createElement("td");
        _0x2934ba.textContent = String(_0x6a4e7e.productFound);
        const _0x891d5b = document.createElement("td");
        _0x891d5b.textContent = String(_0x6a4e7e.notFound);
        const _0x50b154 = document.createElement("td");
        _0x50b154.textContent = String(_0x6a4e7e.total);
        _0x4f1998.append(_0x153496, _0x374df7, _0x4f52f5, _0x2934ba, _0x891d5b, _0x50b154);
        _0x25714b.selectedMarketRows.appendChild(_0x4f1998);
      });
      _0x25714b.selectedMarketFoundTotal.textContent = String(_0x1a8cc9.found);
      _0x25714b.selectedMarketProductTotal.textContent = String(_0x1a8cc9.productFound);
      _0x25714b.selectedMarketNotFoundTotal.textContent = String(_0x1a8cc9.notFound);
      _0x25714b.selectedMarketGrandTotal.textContent = String(_0x1a8cc9.total);
    })();
    (function () {
      if (!_0x25714b.markets) {
        return;
      }
      const _0x12252c = _0x2f4d41();
      const _0x8c3ee9 = _0x25714b.host.querySelector("button[data-action=\"clear-markets\"]");
      if (_0x8c3ee9) {
        _0x8c3ee9.disabled = !_0x491fd0.selectedMarkets.size || _0x491fd0.busy;
      }
      _0x25714b.markets.replaceChildren();
      if (!_0x12252c.length) {
        const _0x965e4 = document.createElement("div");
        _0x965e4.className = "mdl-market-empty";
        _0x965e4.textContent = "Scan rows to choose markets.";
        _0x25714b.markets.appendChild(_0x965e4);
        return;
      }
      _0x12252c.forEach(_0x50b99d => {
        const _0x2b7ac3 = function (_0x4b9f2e) {
          const _0x42b6a9 = _0x491fd0.records.filter(_0x137f5b => _0x137f5b.market === _0x4b9f2e);
          const _0x3a6745 = _0x42b6a9.filter(_0x3d1bcd => !_0x4a7bb5(_0x3d1bcd));
          const _0x4a38b2 = {
            total: _0x42b6a9.length,
            queued: _0x3a6745.length
          };
          return _0x4a38b2;
        }(_0x50b99d);
        const _0x5034c2 = document.createElement("label");
        _0x5034c2.className = "mdl-market-option";
        const _0x3dc2a8 = document.createElement("input");
        _0x3dc2a8.type = "checkbox";
        _0x3dc2a8.value = _0x50b99d;
        _0x3dc2a8.checked = _0x491fd0.selectedMarkets.has(_0x50b99d);
        _0x3dc2a8.setAttribute("data-role", "market-checkbox");
        const _0x5d3695 = document.createElement("span");
        _0x5d3695.className = "mdl-market-name";
        _0x5d3695.textContent = _0x50b99d;
        const _0x36fafb = document.createElement("span");
        _0x36fafb.className = "mdl-market-total";
        _0x36fafb.textContent = String(_0x2b7ac3.total);
        _0x5034c2.append(_0x3dc2a8, _0x5d3695, _0x36fafb);
        _0x25714b.markets.appendChild(_0x5034c2);
      });
    })();
    _0x3fe4e3();
  }
  function _0x3fa2d0(_0x3655aa) {
    const _0x15c040 = _0x3655aa.find(_0x464cb5 => _0x464cb5.sourceReportName || _0x464cb5.sourceReportType);
    if (_0x15c040) {
      return {
        name: _0x15c040.sourceReportName || _0x5a35a4[_0x15c040.sourceReportType] || "",
        type: _0x15c040.sourceReportType || _0x40a668
      };
    } else {
      return null;
    }
  }
  function _0x3fe4e3() {
    if (_0x25714b.logTitle) {
      _0x25714b.logTitle.textContent = _0x491fd0.logMode === "error" ? "Error Logs" : "Debug Logs";
    }
    if (_0x25714b.logCopy) {
      _0x25714b.logCopy.textContent = _0x491fd0.logMode === "error" ? "Copy Error Log" : "Copy Debug Log";
    }
    if (_0x25714b.debug) {
      _0x25714b.debug.value = _0x5c2a9d();
    }
  }
  function _0x418026() {
    if (_0x25714b.jsonTitle) {
      _0x25714b.jsonTitle.textContent = _0x491fd0.jsonMode === "found" ? "Found JSON" : "All JSON";
    }
    if (_0x25714b.json) {
      _0x25714b.json.value = _0x381b90();
    }
  }
  function _0x5c2a9d() {
    if (_0x491fd0.logMode === "error") {
      return _0x491fd0.errorLines.join("\n");
    } else {
      return _0x491fd0.debugLines.join("\n");
    }
  }
  function _0x381b90() {
    return JSON.stringify(_0x4e625b(), null, 2);
  }
  function _0x4e625b() {
    if (_0x491fd0.jsonMode === "found") {
      return _0x491fd0.records.filter(_0x4a7bb5);
    } else {
      return _0x491fd0.records;
    }
  }
  function _0x4fb0f1(_0x59de0e = "debug") {
    _0x491fd0.logMode = _0x59de0e === "error" ? "error" : "debug";
    _0x25714b.logModal.hidden = false;
    _0x3fe4e3();
  }
  function _0xac6db3(_0x1bdab3 = "all") {
    _0x491fd0.jsonMode = _0x1bdab3 === "found" ? "found" : "all";
    _0x25714b.jsonModal.hidden = !1;
    _0x418026();
  }
  function _0x103912(_0x2bbf3e) {
    return String(_0x2bbf3e || "").trim().replace(/\s+/g, " ").toLowerCase();
  }
  function _0x10b360(_0x1fe354) {
    if (!_0x1fe354) {
      return null;
    }
    try {
      return new URL(_0x1fe354, location.origin).pathname;
    } catch {
      return _0x1fe354;
    }
  }
  function _0x2c3882(_0x2bbbe6) {
    const _0x51613a = _0x10b360(_0x2bbbe6);
    return _0x51613a?.match(/\/lightning\/r\/(?:[^/]+\/)?([^/]+)\/view/)?.[1] || null;
  }
  document.documentElement.appendChild(_0x25714b.host);
  chrome.storage.onChanged.addListener((_0x49427f, _0x2c9b46) => {
    const _0x701f9d = {
      silent: !0
    };
    if (_0x2c9b46 === "local" && _0x49427f.contextLayerAuth) {
      _0x32d3b8(_0x701f9d);
    }
  });
  (async function () {
    const _0x39d48b = {
      silent: !0
    };
    _0x491fd0.records = _0x509848(await _0x3f28d0.load());
    _0x491fd0.reportContext = _0x3fa2d0(_0x491fd0.records);
    _0x491fd0.selectedMarkets = new Set(await _0x3f28d0.loadSelectedMarkets());
    _0x146563();
    await _0x3f28d0.saveSelectedMarkets(_0x491fd0.selectedMarkets);
    await _0x3f28d0.save(_0x491fd0.records);
    _0x6abc36("Initialized with " + _0x491fd0.records.length + " saved records");
    _0x4eb678();
    await _0x32d3b8(_0x39d48b);
  })();
})();