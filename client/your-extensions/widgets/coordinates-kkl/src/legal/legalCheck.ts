// coordinates-kkl src/legal/legalCheck.ts _ml_ new file
import type { LegalConfig } from './legalTypes'; // _gaya_ Import the interface
/**
 * _gaya_ Checks if a widget is allowed to operate based on token, URL, and date limits.
 * @param token - The token from the widget's configuration.
 * @param url - The current application URL (window.location.href).
 * @param legalCfg - The parsed content from legalConfig.ts.
 * @param isDbgLogLegal - Debug flag for legal checks.
 * @param widgetType - The type of widget (e.g., "Coordinates-Kkl", "Image-Kkl").
 * @returns True if the widget is allowed, false otherwise.
 */
export function isWidgetAllowed(mapId: string, widgetType: string, widgetId: string, token: string, url: string, legalCfg: LegalConfig, isDbgLogLegal: boolean): boolean {
  //_gaya_ route isWidgetAllowed 1
  return true;
  const _app = (typeof window !== 'undefined' && (window as any)._app_) || null; // Inside function - SAFE!

  const LEGAL_SETTING_UNCONDITIONED = legalCfg.LEGAL_SETTING_UNCONDITIONED;
  const LEGAL_SETTING_CONDITIONED = legalCfg.LEGAL_SETTING_CONDITIONED;
  const LEGAL_URL_OPTIONS_ARR = legalCfg.LEGAL_URL_OPTIONS_ARR;
  const LEGAL_LAST_DATE = legalCfg.LEGAL_LAST_DATE; // yyyy-mm-dd
  const NO_LAST_DATE = legalCfg.NO_LAST_DATE; // anything defined there (e.g. "no-last-date")

  const normalizedCurrentUrl = url.toLowerCase();
  let allowed = false; //_gaya_ Initial assumption is not allowed

  //Step 1: Check allowance based on token and URL
  let errMsg = null;
  let alertFlg = false;
  if (token === LEGAL_SETTING_UNCONDITIONED) {
    allowed = true;
    if (isDbgLogLegal) console.log(`>> legalCheck: Widget ${widgetType} (${widgetId} in map ${mapId}) allowed - Unconditioned token.`);
  } else if (token === LEGAL_SETTING_CONDITIONED) {
    if (isDbgLogLegal) console.log(`>> legalCheck: Widget ${widgetType} (${widgetId} in map ${mapId}) token ok. Proceeding to URL check.`);
    const allowedByUrl = LEGAL_URL_OPTIONS_ARR.some(allowedUrl => {
      return normalizedCurrentUrl.startsWith(allowedUrl.toLowerCase());
    });
    if (allowedByUrl) {
      if (isDbgLogLegal) console.log(`>> legalCheck: Widget ${widgetType} (${widgetId} in map ${mapId}) URL matches. Proceeding to date check.`);
      allowed = true;
    } else {
      allowed = false;
      errMsg = `Widget ${widgetType} (${widgetId} in map ${mapId}) NOT allowed:\n- token is ok, but no matching URL. URL: "${url}"."`;
      if (isDbgLogLegal) console.log(`>> legalCheck: ${errMsg}`);
      //_gaya_ Check to alert only once per [widgetType][widgetId]
      if (_app && _app.hasAlertedLegalIssue && _app.hasAlertedLegalIssue[widgetType] && _app.hasAlertedLegalIssue[widgetType][widgetId] === false) {
        _app.hasAlertedLegalIssue[widgetType][widgetId] = true;
        alertFlg = true;
      }
    }
  } else {
    allowed = false;
    errMsg = `Widget ${widgetType} (${widgetId} in map ${mapId}) NOT allowed:\n- Invalid token: "${token}".`;
    if (isDbgLogLegal) console.log(`>> legalCheck: ${errMsg}`);
    if (_app && _app.hasAlertedLegalIssue && _app.hasAlertedLegalIssue[widgetType] && _app.hasAlertedLegalIssue[widgetType][widgetId] === false) {
      _app.hasAlertedLegalIssue[widgetType][widgetId] = true;
      alertFlg = true;
    }
  }

  //Step 2: If allowed by conditioed token and URL, perform date check
  if (allowed && token === LEGAL_SETTING_CONDITIONED) {
    //if NO_LAST_DATE is "no-last-date", then no date limit applies
    if (LEGAL_LAST_DATE === NO_LAST_DATE) {
      if (isDbgLogLegal) console.log(`>> legalCheck: Widget ${widgetType} (${widgetId} in map ${mapId}) has no date limit.`);
    } else {
      //Parse dates. Ensure dates are compared as start of day to avoid time issues.
      const lastDate = new Date(LEGAL_LAST_DATE);
      if (isNaN(lastDate.getTime())) {
        allowed = false;
        errMsg = `Widget ${widgetType} (${widgetId} in map ${mapId}) NOT allowed:\n- Last date defined "${LEGAL_LAST_DATE}" is not a legal Date format.`;
        if (isDbgLogLegal) console.log(`>> legalCheck: ${errMsg}`);
        if (_app && _app.hasAlertedLegalIssue && _app.hasAlertedLegalIssue[widgetType] && _app.hasAlertedLegalIssue[widgetType][widgetId] === false) {
          _app.hasAlertedLegalIssue[widgetType][widgetId] = true;
          alertFlg = true;
        }
      }
      else {
        lastDate.setHours(0, 0, 0, 0); //_gaya_ Normalize to start of day

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0); //_gaya_ Normalize to start of day

        //_gaya_ Check if current date is after the last allowed date
        if (currentDate.getTime() > lastDate.getTime()) {
          allowed = false;
          errMsg = `Widget ${widgetType} (${widgetId} in map ${mapId}) NOT allowed:\n- Last allowed date has passed. Current: ${currentDate.toISOString().slice(0, 10)}, Last: ${LEGAL_LAST_DATE}`;
          if (isDbgLogLegal) console.log(`>> legalCheck: ${errMsg}`);
          if (_app && _app.hasAlertedLegalIssue && _app.hasAlertedLegalIssue[widgetType] && _app.hasAlertedLegalIssue[widgetType][widgetId] === false) {
            _app.hasAlertedLegalIssue[widgetType][widgetId] = true;
            alertFlg = true;
          }
        } else {
          //_gaya_ Allowed by date: Check for warning messages
          //_gaya_ Calculate difference in days. Math.ceil is used to count current partial day as a full day difference.
          const diffDays = Math.ceil((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

          //_gaya_ Only alert if not already alerted for this widget type
          if (_app && _app.hasAlertedLegalIssue && _app.hasAlertedLegalIssue[widgetType] && _app.hasAlertedLegalIssue[widgetType][widgetId] === false) {
            if (diffDays === 0) { //today is the last day
              //_gaya_ route isWidgetAllowed 2.3.1 - Last day warning
              _app.hasAlertedLegalIssue[widgetType][widgetId] = true;
              if (isDbgLogLegal) console.log(`>> legalCheck: Widget ${widgetType} (${widgetId} in map ${mapId}) allowed. Last allowed date is TODAY.`);
              alert(`Widget ${widgetType} (${widgetId} in map ${mapId}) Last allowed date is TODAY.`);
            }
            //_gaya_ Check for 5, 10, 15, 20, 25, 35 days before last date
            else if ([1, 2, 3, 4, 5, 10, 15, 20, 25, 35].includes(diffDays)) {
              _app.hasAlertedLegalIssue[widgetType][widgetId] = true; //_gaya_ Set flag BEFORE alert
              if (isDbgLogLegal) console.log(`>> legalCheck: Widget ${widgetType} (${widgetId} in map ${mapId}) allowed. ${diffDays} days before last allowed date.`);
              alert(`Widget ${widgetType} (${widgetId} in map ${mapId}) Last allowed date is ${LEGAL_LAST_DATE}.`);
            } else {
              //No specific warning needed
              if (isDbgLogLegal) console.log(`>> legalCheck: Widget ${widgetType} (${widgetId} in map ${mapId}) allowed. ${diffDays} days before last allowed date (no specific warning).`);
            }
          }
        }
      }
    }
  }

  if (errMsg !== null && alertFlg) {
    setTimeout(() => {
      alert(`${errMsg}\nThis Widget will not function and will be removed.`);
    }, 9000)
  }

  return allowed;
}
// coordinates-kkl src/legal/legalCheck.ts
