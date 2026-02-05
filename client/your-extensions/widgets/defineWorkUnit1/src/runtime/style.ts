/**
 * style.ts
 * סגנונות CSS-in-JS עבור הווידג'ט
 */

import { css } from "jimu-core";

/**
 * מחזיר את הסגנונות הראשיים של הווידג'ט
 */
export function getWidgetStyles() {
  return css`
    /* מיכל הווידג'ט הראשי */
    .define-work-unit-widget {
      direction: rtl;
      font-family: Arial, sans-serif;
      padding: 12px;
      min-width: 280px;
      position: relative;
    }

    /* שורת כותרת - כפתור עזרה בלבד */
    /*.widget-header {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: center;
      margin-bottom: 4px;
    }*/

    /* שורת כותרת - כפתורי יצירה/עריכה מימין, עזרה משמאל */
    .widget-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .header-main-buttons {
      display: flex;
      flex-direction: row;
      gap: 8px;
    }

    /* קבוצת כפתורים */
    .button-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 4px;
    }

    .button-row {
      display: flex;
      flex-direction: row-reverse;
      gap: 8px;
    }

    /* כפתור בסגנון ESRI */
    .esri-button {
      padding: 0px 4px;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #fff;
      color: #333;
      cursor: pointer;
      font-size: 14px;
      text-align: center;
      transition: all 0.2s ease;
      width: auto;
	  min-height: 24px;
    }

    .esri-button:hover {
      background-color: #f0f0f0;
    }

    .esri-button.active {
      background-color: #0079c1;
      color: #fff;
      border-color: #0079c1;
    }

    .esri-button:disabled {
      background-color: #e0e0e0;
      color: #999;
      cursor: not-allowed;
      border-color: #ccc;
    }

    /* כפתורים בשורה - מתפרסים שווה */
    /*.button-row .esri-button {
      flex: 1;
    }*/

    /* כפתור עזרה - רוחב אוטומטי */
    .help-button {
      flex: 0 0 auto;
      width: auto;
    }

    /* Dropdown בסגנון ESRI */
    .esri-dropdown {
      width: 100%;
      min-width: 200px;
      padding: 0;
      border: 1px solid #ccc;
      border-radius: 4px;
      background-color: #fff;
      font-size: 14px;
      cursor: pointer;
      text-align: start;
    }

    .esri-dropdown:disabled {
      background-color: #f5f5f5;
      color: #999;
      cursor: not-allowed;
    }

    /* כפתורי ציור מלבן/פוליגון */
    .draw-buttons {
      display: flex;
      flex-direction: row;
      gap: 8px;
      margin-bottom: 4px;
    }

    /* שורת כפתורים: צרף עומדים + מחק רשימה */
    .stands-action-buttons {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      gap: 8px;
    }

    /* שורת כפתורים תחתונה - בטל מימין, שמור משמאל (ב-RTL) */
    .bottom-buttons {
      display: flex;
      flex-direction: row-reverse;
      justify-content: space-between;
      align-items: center;
      margin-top: 16px;
      gap: 8px;
    }

    /* תווית מיושרת לימין */
    .field-label-right {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #333;
      display: block;
      text-align: start;
    }

    /* תווית שדה */
    .field-label {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 4px;
      color: #333;
      display: block;
      text-align: left;
    }

    /* שדה תצוגה (ערך ירוק) */
    .field-value {
      font-size: 14px;
      color: #2e7d32;
      font-weight: bold;
      padding: 4px 0;
    }

    /* מיכל שדה */
    .field-container {
      margin-bottom: 4px;
      text-align: right;
    }

    /* שורת שדה אינליין (תווית וערך באותה שורה) */
    .field-inline {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      margin-bottom: 0px;
    }

    .field-inline .field-label {
      margin-bottom: 0;
      white-space: nowrap;
    }

    .field-inline .field-value {
      flex: 1;
    }

    /* שורת מידע - יער והודעה באותה שורה */
    .info-row {
      display: flex;
      flex-direction: row;
      align-items: baseline;
      gap: 16px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }

    .info-item {
      display: flex;
      flex-direction: row;
      align-items: baseline;
      gap: 4px;
    }

    .info-item .field-label {
      margin-bottom: 0;
      white-space: nowrap;
    }

    .info-item .field-value {
      white-space: nowrap;
    }

    .info-item .message-text {
      font-size: 13px;
      color: #1565c0;
      font-style: italic;
      white-space: nowrap;
    }
    .message-text.warning {
      color: #e65100;
    }

    /* הודעה */
    .message-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      margin-bottom: 0px;
      min-height: 24px;
    }

    .message-text {
      font-size: 13px;
      color: #1565c0;
      font-style: italic;
    }

    /* רשימת עומדים */
    .stands-list {
      font-size: 13px;
      color: #2e7d32;
      font-weight: normal;
      padding: 0px 2px;
      background-color: #f9f9f9;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      overflow: auto;
      min-height: 40px;
      max-height: 200px;
      resize: vertical;
      direction: rtl;
      /*white-space: nowrap;*/
    }

    .stands-list.wrapped {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .stands-list strong {
      font-weight: bold;
      color: #1b5e20;  /* ירוק כהה יותר */
    }

    .stands-list.empty {
      color: #999;
      font-weight: normal;
      font-style: italic;
      padding: 8px;
    }

    /* רשימת עומדים לצירוף (זמנית) */
    .stands-to-add-list {
      font-size: 13px;
      color: #1565c0;
      padding: 0px 2px;
      background-color: #e3f2fd;
      border: 1px dashed #90caf9;
      border-radius: 4px;
      overflow: auto;
      min-height: 40px;
      max-height: 200px;
      resize: vertical;
	    direction: rtl;
      /*white-space: nowrap;*/
    }

    .stands-to-add-list.wrapped {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* רשימת עומדים עם checkboxes */
    .stands-checkboxes {
      height: 95px;
      min-height: 50px;
      max-height: 300px;
      resize: vertical;
      overflow: auto;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 0px;
      background-color: #fff;
      direction: rtl;
    }

    .stand-checkbox-item {
      display: flex;
      flex-direction: row;
      align-items: start;
      gap: 8px;
      padding: 0px 8px;
    }

    .stand-checkbox-item input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .stand-checkbox-item label {
      cursor: pointer;
      font-size: 14px;
    }

    .stand-checkbox-item.disabled {
      opacity: 0.5;
    }

    .stand-checkbox-item.to-remove label {
      color: #c62828;
      font-weight: bold;
      text-decoration: line-through;
    }

    .stand-checkbox-item.disabled input[type="checkbox"] {
      cursor: not-allowed;
    }

    .stand-checkbox-item.disabled label {
      cursor: not-allowed;
      color: #999;
    }

    /* רשימת עומדים להסרה */
    .stands-to-remove-list {
      font-size: 13px;
      color: #c62828;
      padding: 0px 2px;
      background-color: #ffebee;
      border: 1px dashed #ef5350;
      border-radius: 4px;
      overflow: auto;
      min-height: 40px;
      max-height: 200px;
      resize: vertical;
      direction: rtl;
      /*white-space: nowrap;*/
    }
    
    .stands-to-remove-list.wrapped {
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* שורת תווית עם כפתור wrap */
    .list-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .wrap-button {
      background: none;
      border: none;
      color: #0079c1;
      cursor: pointer;
      font-size: 12px;
      padding: 0 4px;
    }

    .wrap-button:hover {
      text-decoration: underline;
    }

    /* קו מפריד */
    .separator {
      border-top: 1px solid #e0e0e0;
      margin: 4px 0;
    }

    /* Spinner / Loading */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(255, 255, 255, 0.8);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e0e0e0;
      border-top-color: #0079c1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Loading spinner for stands layer - small inline version - top */
    .loading-stands {
      display: inline-flex;
      align-items: center;
      margin-right: 8px;
    }

    .loading-spinner-small {
      width: 14px;
      height: 14px;
      border: 2px solid #1976d2;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    /* Loading spinner for stands layer - small inline version - end */

    .loading-message {
      margin-top: 12px;
      font-size: 14px;
      color: #333;
    }

    /* הודעת שגיאה */
    .error-message {
      background-color: #ffebee;
      border: 1px solid #ef5350;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 4px;
      color: #c62828;
      font-size: 13px;
      text-align: right;
      cursor: pointer;
    }

    /* שורה עם תווית ודרופדאון/רשימה */
    .field-row {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 4px;
    }

    .field-row .field-label {
      white-space: nowrap;
      padding-top: 4px;
      min-width: 110px; /* set according to the widest dropdown label */
    }

    .field-row .esri-dropdown {
      flex: 1;
    }

    .field-row .stands-checkboxes {
      flex: 1;
    }

    /* מצב debug */
    .debug-state {
      background-color: #f3e5f5;
      border: 1px solid #ce93d8;
      border-radius: 4px;
      padding: 4px 8px;
      margin-bottom: 4px;
      font-size: 11px;
      font-family: monospace;
      color: #6a1b9a;
    }

    .correction-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .correction-dialog {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      text-align: center;
      direction: rtl;
    }

    .correction-dialog p {
      margin-bottom: 16px;
      font-size: 16px;
    }

    .correction-dialog-buttons {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .correction-dialog-buttons button {
      padding: 8px 20px;
      border-radius: 4px;
      border: 1px solid #ccc;
      cursor: pointer;
      font-size: 14px;
    }

    .correction-dialog-buttons button:first-child {
      background: #4CAF50;
      color: white;
      border-color: #4CAF50;
    }

    .correction-dialog-buttons button:nth-child(2) {
      background: #f44336;
      color: white;
      border-color: #f44336;
    }

    .correction-dialog-buttons button:last-child {
      background: #e0e0e0;
    }
  `;
}

/**
 * סגנונות לחלון העזרה הנפרד
 */

export function getHelpPanelStyles() {
  return css`
    .help-panel {
      position: fixed;
      background-color: #fffde7;
      border: 2px solid #f9a825;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 9999;
      max-width: 450px;
      min-width: 250px;
      overflow: hidden;
      direction: rtl;
    }

    .help-panel-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: linear-gradient(to bottom, #ffd54f, #ffca28);
      border-bottom: 1px solid #f9a825;
      cursor: grab;
      user-select: none;
    }

    .help-panel-header:active {
      cursor: grabbing;
    }

    .help-panel-title {
      font-weight: bold;
      font-size: 14px;
      color: #333;
    }

    .help-panel-close {
      background: #e53935;
      border: none;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      color: #fff;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .help-panel-close:hover {
      background: #c62828;
    }

    .help-panel-content {
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: #333;
      padding: 12px;
      max-height: 400px;
      overflow-y: auto;
    }
  `;
}
