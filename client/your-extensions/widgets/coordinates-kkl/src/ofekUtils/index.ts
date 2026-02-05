// [WIDGET_ROOT]/src/ofekUtils/index.ts //_gali_ This file is intended to be an identical copy in each custom widget's src/ofekUtils/ directory.
// _gali_ Based on original /ofekUtils/index.ts with modifications for Step 1.
import { useRef, useEffect } from "react" //_ml_ Added for useEffectDidMount
import * as projection from 'esri/geometry/projection'
import SpatialReference from 'esri/geometry/SpatialReference'
import GeographicTransformationStep from 'esri/geometry/support/GeographicTransformationStep'
import GeographicTransformation from 'esri/geometry/support/GeographicTransformation'
import Point from 'esri/geometry/Point'//_ml_ added
import Camera from 'esri/Camera'//_ml_ added
import * as webMercatorUtils from 'esri/geometry/support/webMercatorUtils'//_ml_ added
import Viewpoint from 'esri/Viewpoint'//_ml_ added
import MapView from "@arcgis/core/views/MapView.js"//_ml_ added
import SceneView from "@arcgis/core/views/SceneView.js"//_ml_ added

import { getAppStore, AppMode } from 'jimu-core'
import { legalConfigFromFile } from '../legal/legalConfig';
//import { isWidgetAllowed } from '../legal/legalCheck';
import * as legalCheck from '../legal/legalCheck';

var isInitialized = false;
export var __wkidTM = 2039;
var __geoXfrm_sr_ITM: SpatialReference | null = null;
var __geoXfrm_geoStep_ITM2GEO: GeographicTransformationStep | null = null;
var __geoXfrm_geoTrans_ITM2GEO: GeographicTransformation | null = null;
var __geoXfrm_sr_GEO: SpatialReference | null = null;
var __geoXfrm_geoStep_GEO2ITM: GeographicTransformationStep | null = null;
var __geoXfrm_geoTrans_GEO2ITM: GeographicTransformation | null = null;
const urlParamsLowerCase = new URLSearchParams(window.location.search.toLowerCase()); // _gali_ Keep as local utility
export const OFEK_APP_VERSION_CONST = "v2025_05_14";
export const OFEK_CFG_MONITOR_FOLDER_CONST = "Naharia";
// _gali_ Interface for Map-specific context stored on window._app_.maps
// _gali_ This is a simplified version for Step 1. More properties will be added later.
interface MapContext {
  // _gali_ Basic properties for Step 1
  mapViewInstance?: MapView | SceneView;
  coordinatesWidgetId?: string; // ID of the coordinates-kkl widget on this map
  // _gali_ Placeholder for properties from SET-3 summary (will be populated in later steps)
  obliqueApp?: { name: ObliqueApp | null; ofekCfgObliqueAppUrl: string; };
  ofek3dAppUrl?: string;
  isWidgetAllowed?: boolean; // Will be set by allowance check
  newTab?: { name: string | null; state: string | null; };
}

// _gali_ Interface for the overall window._app_ structure
interface GlobalApp {
  isDbgLog?: boolean;
  isDbgLogLegal?: boolean;
  isDbgLogCo?: boolean;
  //allowance
  hasAlertedLegalIssue?: {
    [widgetType: string]: {
      [widgetId: string]: boolean
    }
  };

  // _gali_ Moved from index.html
  ofekAppVersion?: string;
  ofekCfgMonitorFolder?: string;

  // _gali_ Maps context
  maps?: { [mapWidgetId: string]: MapContext };
}

// _gali_ Extend Window interface for TypeScript to know about window._app_
declare global {
  interface Window {
    _app_?: GlobalApp;
  }
}
// _gali_ Existing enums remain as local exports
export enum ObliqueApp {
  Idan = "Idan",
  Orbit = "Orbit"
}
export enum enumNewTabApp { // _gali_ Renamed from NewTabApp to avoid conflict if you have a type NewTabApp
  Idan = "Idan",
  Orbit = "Orbit",
  HomeSite = "HomeSite", // _gali_ Assuming 'Ofek' meant 'HomeSite' or similar, adjust if needed
  GoogleMap = "GoogleMap",
  GovMap = "GovMap",
  Ofek3dApp = "Ofek3dApp"
}
export enum enumNewTab {
  watermarkName = "watermark",
  googlemapName = "googleMap",
  govmapName = "govMap",
  obliqueAppName = "obliqueApp",
  ofek3dAppName = "ofek3dApp",
}
//_gali_ Your original enumNewTabAppImgFileName is not included here as per your SET-3 summary.
//_gali_ Image file names will be handled by widget configurations.

// _gali_ Function to initialize the global _app_ object and its necessary structures.
// _gali_ This function will be called by each custom widget on mount.
export function initGlobalApp(widgetType: string, widgetId: string, widgetToken: string | null): string | null {
  // _gali_ Ensuring window object is available (for potential SSR or test environments)
  if (typeof window === 'undefined') {
    console.warn('ofekUtils: window object not found, skipping initGlobalApp.');
    return null;
  }

  // _gali_ Initialize window._app_ if it doesn't exist or is not an object
  if (typeof window._app_ !== 'object' || window._app_ === null) {
    window._app_ = {};
    __geoXfrm_setup(/*2039, 108021*/);// _gali_ Call without params __geoXfrm_setup()
    // console.log("ofekUtils: Initialized window._app_");
  }
  const _app = window._app_!; // _gali_ Assert _app_ is not null now

  // _gali_ Initialize global properties if they are not already set (first widget wins)
  if (_app.ofekAppVersion === undefined) _app.ofekAppVersion = OFEK_APP_VERSION_CONST;
  if (_app.ofekCfgMonitorFolder === undefined) _app.ofekCfgMonitorFolder = OFEK_CFG_MONITOR_FOLDER_CONST;
  if (_app.isDbgLog === undefined) { if (urlParamOption('dbg', "log")) _app.isDbgLog = true; }
  if (_app.isDbgLogLegal === undefined) { if (urlParamOption('dbg', "logLegal")) _app.isDbgLogLegal = true; }
  if (_app.isDbgLogCo === undefined) { if (urlParamOption('dbg', "logCo")) _app.isDbgLogCo = true; }
  if (_app.hasAlertedLegalIssue === undefined) {
    _app.hasAlertedLegalIssue = {};
  }
  if (_app.hasAlertedLegalIssue[widgetType] === undefined) {
    _app.hasAlertedLegalIssue[widgetType] = {};
  }
  if (_app.hasAlertedLegalIssue[widgetType][widgetId] === undefined) {
    _app.hasAlertedLegalIssue[widgetType][widgetId] = false;
  }


  // _gali_ Initialize maps object if it doesn't exist
  if (_app.maps === undefined) {
    _app.maps = {};
  }

  // _gali_ Find the parent map widget ID for context
  const mapWidgetId = findParentMapWidgetId(widgetId, widgetType); // _gali_ Pass widgetType for logging in findParentMapWidgetId

  const mapId = mapWidgetId || 'noMap'; // _gali_ Use 'noMap' as a key if widget is not on a map

  // _gali_ Initialize context for this mapWidgetId if it doesn't exist
  if (!_app.maps[mapId]) {
    _app.maps[mapId] = {};
    // console.log(`ofekUtils: Initialized context for map: ${contextKey}`);
  }

  _app.maps[mapId][widgetId] = {};

  const widgetContext = _app.maps[mapId][widgetId];

  // _gali_ Placeholder for allowance check for Step 1
  // _gali_ In AppMode.Design (Builder), widgets should always be visible for configuration.
  // _gali_ In AppMode.RunTime, for Step 1, we'll also assume true to avoid premature hiding.
  const appRuntimeInfo = getAppStore().getState().appRuntimeInfo;
  const currentAppMode = appRuntimeInfo?.appMode;
  if (currentAppMode === AppMode.Design) {
    widgetContext.isWidgetAllowed = true;
    // if (_app.isDbgLogLegal) console.log(`ofekUtils: Widget ${widgetType} (${widgetId}) on map ${contextKey} - ALLOWED (Design Mode).`);
  } else { // AppMode.Run or undefined
    widgetContext.isWidgetAllowed = legalCheck.isWidgetAllowed(
      mapId,
      widgetType,
      widgetId,
      widgetToken,
      (typeof window !== 'undefined' ? window.location.href : ''),  // Safe access
      legalConfigFromFile,
      _app.isDbgLogLegal
    );
    if (_app.isDbgLogLegal) console.log(`>> initGlobalApp: Widget ${widgetId} (${widgetType}) for map ${mapWidgetId || 'noMap'} allowance status (RUNTIME): ${widgetContext.isWidgetAllowed}.`);
  } // _gali_ STEP 1: Default to true for runtime
  // if (_app.isDbgLogLegal) console.log(`ofekUtils: Widget ${widgetType} (${widgetId}) on map ${contextKey} - Allowance (Step 1 default: true for Runtime).`);
  // console.log(`ofekUtils: Allowance check for ${widgetType} (${widgetId}) on map ${contextKey} (Step 1 default: true)`);

  return mapWidgetId; // _gali_ Return the found mapWidgetId
}

// _gali_ Your original findParentMapWidgetId, adapted slightly for logging consistency.
export function findParentMapWidgetId(widgetId: string, widgetLabelOrType?: string): string | null {
  //_gaya_ New function to reliably find parent map widget ID
  //_gaya_ This function is generic and can be used by both image-kkl and coordinates-kkl

  const _app = window._app_; // _gali_ Access potentially initialized _app

  //_gaya_ route findParentMapWidgetId 1
  const appConfig = getAppStore().getState().appConfig;

  const currentWidgetJson = appConfig.widgets[widgetId];
  if (!currentWidgetJson) {
    //_gaya_ route findParentMapWidgetId 1.1 - Widget JSON not found
    if (_app?.isDbgLog) console.log(`>> ofekUtils.findParentMapWidgetId: Widget JSON not found for ${widgetLabelOrType || 'widget'} ID: ${widgetId}`);
    return null;
  }

  //_gaya_ Helper to check if a widget is a map widget
  const isMapWidget = (id: string) => {
    const uri = appConfig.widgets[id]?.uri;
    return uri === 'widgets/arcgis/arcgis-map/' || uri === 'widgets/arcgis/arcgis-map-ofek/';
  };

  //_gaya_ If the widget itself is a map widget (e.g., a map widget calling this for some reason)
  if (isMapWidget(widgetId)) {
    //_gaya_ route findParentMapWidgetId 1.2 - Widget itself is a map widget
    if (_app?.isDbgLog) console.log(`>> ofekUtils.findParentMapWidgetId: Widget ${widgetLabelOrType || widgetId} is a map widget (returning itself).`);
    return widgetId;
  }

  //_gaya_ Iterate through all layouts in the appConfig to find which layout contains the current widgetId
  for (const layoutId in appConfig.layouts) {
    const layout = appConfig.layouts[layoutId];
    if (layout?.content) {
      for (const itemId in layout.content) {
        const layoutItem = layout.content[itemId];
        if (layoutItem.type === 'WIDGET' && layoutItem.widgetId === widgetId) {
          //_gaya_ Found the layout (layoutId) that contains our widget.
          //_gaya_ Now, find which widget *owns* this layoutId.
          //_gaya_ This layout (layoutId) could be a page's layout, a section's view's layout, OR a map widget's internal layout.

          //_gaya_ Check if this layout is directly owned by a Page or Section (not a map widget's internal layout)
          //_gaya_ If it's a page's layout, there's no direct map parent widget.
          let isPageLayout = false;
          for (const pageId in appConfig.pages) {
            if (appConfig.pages[pageId]?.layout?.LARGE === layoutId || //_gaya_ Check other sizes too if needed
              appConfig.pages[pageId]?.layout?.MEDIUM === layoutId ||
              appConfig.pages[pageId]?.layout?.SMALL === layoutId) {
              isPageLayout = true;
              break;
            }
          }
          if (appConfig.header?.layout?.LARGE === layoutId) isPageLayout = true; //_gaya_ Check header
          if (appConfig.footer?.layout?.LARGE === layoutId) isPageLayout = true; //_gaya_ Check footer
          //_gaya_ Also check section views
          for (const sectionId in appConfig.sections) {
            const section = appConfig.sections[sectionId];
            if (section?.views) {
              for (const viewId of section.views) {
                if (appConfig.views[viewId]?.layout?.LARGE === layoutId) {
                  isPageLayout = true; //_gaya_ Technically a view's layout, not directly inside a map
                  break;
                }
              }
            }
            if (isPageLayout) break;
          }

          if (isPageLayout) {
            //_gaya_ route findParentMapWidgetId 1.3 - Widget is in a page/section layout, not directly in a map.
            //_gaya_ This might be okay if the map widget ID is passed via useMapWidgetIds prop.
            if (_app?.isDbgLog) console.log(`>> ofekUtils.findParentMapWidgetId: Widget ${widgetLabelOrType || widgetId} is in a page/section layout (${layoutId}), not directly in a map widget's internal layout.`);
            //_gaya_ Fall through to check if `useMapWidgetIds` is available and points to a map.
          } else {
            //_gaya_ This layoutId is likely an internal layout of another widget.
            //_gaya_ Find which widget owns this layoutId.
            for (const potentialParentId in appConfig.widgets) {
              const potentialParentWidget = appConfig.widgets[potentialParentId];
              if (potentialParentWidget.layouts) {
                for (const layoutKey in potentialParentWidget.layouts) { // e.g., "MapFixedLayout", "default"
                  for (const sizeMode in potentialParentWidget.layouts[layoutKey]) {
                    if (potentialParentWidget.layouts[layoutKey][sizeMode] === layoutId) {
                      //_gaya_ Found the widget (potentialParentId) that owns this layout.
                      //_gaya_ Check if this owner is a map widget.
                      if (isMapWidget(potentialParentId)) {
                        //_gaya_ route findParentMapWidgetId 1.4 - Parent is a map widget
                        if (_app?.isDbgLog) console.log(`>> ofekUtils.findParentMapWidgetId: Widget ${widgetLabelOrType || widgetId} is inside map widget ${potentialParentId} (layout: ${layoutId}).`);
                        return potentialParentId;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  //_gaya_ If not found in a map widget's layout, it might be a widget that *uses* a map via `useMapWidgetIds`
  //_gaya_ This part is tricky as `useMapWidgetIds` might not be available during settings panel init.
  //_gaya_ The widget's `props.useMapWidgetIds[0]` is the most direct way to get the associated map.
  //_gaya_ This utility function is more about finding a "containing" map.
  //_gaya_ If the widget uses a map but is not *inside* its layout, this function won't find it.
  //_gaya_ The widget's `props.useMapWidgetIds[0]` will be the source of truth for the associated map.
  //_gaya_ This function is primarily useful for finding the parent if the widget is truly *nested inside* the map's layout editor.

  //_gaya_ route findParentMapWidgetId 1.5 - Parent map not found
  if (_app?.isDbgLog) console.log(`>> ofekUtils.findParentMapWidgetId: No parent map widget found for Widget ${widgetLabelOrType || widgetId} by traversing layouts. Check props.useMapWidgetIds in the widget itself.`);
  return null;
}

// _gali_ Your original utility functions, largely unchanged for Step 1 unless they used the old global _app.
// _gali_ `rdwt` uses its own module-scoped store, which is fine.
let widgetDataStore: { [widgetName: string]: { [varName: string]: any } } = {};
export function rdwt(widgetName: string, varName: string, operation: "wt" | "rd", varValue?: any) {
  if (!widgetDataStore[widgetName]) {
    widgetDataStore[widgetName] = {};
  }
  switch (operation) {
    case "wt":
      widgetDataStore[widgetName][varName] = varValue;
      break;
    case "rd":
      return widgetDataStore[widgetName][varName];
  }
}
function removeWhitespace(str: string): string {
  return str.replace(/\s/g, "");
}
export function urlParamOption(paramName: string, searchedOptions: string): boolean {
  var flg = false;
  paramName = paramName.toLowerCase();
  if (urlParamsLowerCase.has(paramName)) {
    let paramValueAsString = urlParamsLowerCase.get(paramName) || "";
    searchedOptions = removeWhitespace(searchedOptions.toLowerCase());
    if (!isBlank(paramValueAsString) && typeof (searchedOptions) === "string" && !isBlank(searchedOptions)) {
      paramValueAsString = paramValueAsString!.toLowerCase();
      let paramsArr = paramValueAsString.split(",");
      let searchedOptionsArr = searchedOptions.split(",");
      paramsArr.forEach(function (param) {
        searchedOptionsArr.forEach(function (searchedOption) {
          if (param === searchedOption) {
            flg = true;
          }
        });
      });
      //});
      //for (let i = 0; i < optionsArr.length; i++) {
      //  if (paramValueAsString === optionsArr[i]) {
      //    flg = true;
      //    break;
      //  }
      //}
    }
    return flg;
  }
  return false; // _gali_ Added explicit return if paramName is not found
}
// _gali_ Monitor function adapted to use _app context
export function monitor(CALLER: string, cmd: string, status?: string, info1?: string, info2?: string, info3?: string, info4?: string,
  info5?: string, info6?: string, info7?: string, info8?: string, info9?: string, info10?: string, info11?: string, info12?: string, info13?: string,
  info14?: string, info15?: string, info16?: string, info17?: string, info18?: string, info19?: string, info20?: string, info21?: string, info22?: string,
  info23?: string, info24?: string, info25?: string, info26?: string, info27?: string, info28?: string, info29?: string, info30?: string): void {

  status = status || "";
  info1 = info1 || ""; info2 = info2 || ""; info3 = info3 || ""; info4 = info4 || ""; info5 = info5 || ""; info6 = info6 || "";
  info7 = info7 || ""; info8 = info8 || ""; info9 = info9 || ""; info10 = info10 || ""; info11 = info11 || ""; info12 = info12 || "";
  info13 = info13 || ""; info14 = info14 || ""; info15 = info15 || ""; info16 = info16 || ""; info17 = info17 || ""; info18 = info18 || "";
  info19 = info19 || ""; info20 = info20 || ""; info21 = info21 || ""; info22 = info22 || ""; info23 = info23 || ""; info24 = info24 || "";
  info25 = info25 || ""; info26 = info26 || ""; info27 = info27 || ""; info28 = info28 || ""; info29 = info29 || ""; info30 = info30 || "";

  let filenameRest =
    `${CALLER.substring(0, 11) === "APPLICATION" ? "APPLICATION" : "widget"},` +//03 - "widget" or "APPLICATION"
    `${CALLER.substring(0, 11) === "APPLICATION" ? CALLER.substring(11) : CALLER},` +//04 - widget name or scene name and id
    `${cmd},` +//05 - cmd
    `${status},` +
    `${info1},${info2},${info3},${info4},${info5},${info6},${info7},${info8},${info9},` +
    `${info10},${info11},${info12},${info13},${info14},${info15},${info16},` +
    `${info17},${info18},${info19},${info20},${info21},${info22},${info23},${info24},` +
    `${info25},${info26},${info27},${info28},${info29},${info30}`;
  //filenameRest = filenameRest.replace(/\s+/g, '-').replace(/\.+/g, '-');
  filenameRest = filenameRest.replace(/\s+/g, '-');
  //
  const _app = window._app_;
  if (!_app) {
    console.log(`** monitor (_app not initialized) --${filenameRest}`);
  } else {
    if (_app.isDbgLog) console.log(`** monitor--${_app.ofekCfgMonitorFolder}/${_app.ofekAppVersion}/${filenameRest}`);
  }
}
// _gali_ Other utility functions, keep as is
export function __geoXfrm_setup(wkidTMValue?: number, wkidTMReverseValue?: number) { // _gali_ Made params optional
  if (isInitialized) {
    return __wkidTM;
  }
  __wkidTM = wkidTMValue ? wkidTMValue : 2039; // _gali_ Use passed value or default
  const wkidTMReverse = wkidTMReverseValue ? wkidTMReverseValue : 108021; // _gali_ Use passed value or default
  //transform ITM/GEO fwd/bwd
  __geoXfrm_sr_ITM = new SpatialReference({ wkid: __wkidTM });
  //transform bwd ITM2GEO
  __geoXfrm_geoStep_ITM2GEO = new GeographicTransformationStep({
    isInverse: true,//ITM2GEO is reverse transform
    wkid: wkidTMReverse
  });
  __geoXfrm_geoTrans_ITM2GEO = new GeographicTransformation({
    steps: [__geoXfrm_geoStep_ITM2GEO]
  });
  __geoXfrm_sr_GEO = new SpatialReference({ wkid: 4326 });
  //transform fwd GEO2ITM
  __geoXfrm_geoStep_GEO2ITM = new GeographicTransformationStep({
    isInverse: false,//GEO2ITM is forward transform, not reverse
    wkid: wkidTMReverse
  });
  __geoXfrm_geoTrans_GEO2ITM = new GeographicTransformation({
    steps: [__geoXfrm_geoStep_GEO2ITM]
  });
  isInitialized = true;
  return __wkidTM;
}

export async function itm2geo(geometryOrGeometries: any): Promise<any> {
  __geoXfrm_setup(/*2039, 108021*/);// _gali_ Call without params to use defaults or previously set __geoXfrm_setup()
  let ret = geometryOrGeometries;
  let sr: SpatialReference | undefined = geometryOrGeometries?.spatialReference;
  if (!sr && Array.isArray(geometryOrGeometries) && geometryOrGeometries.length > 0) {
    sr = geometryOrGeometries[0]?.spatialReference;
  }
  if (sr && !(sr.isWGS84 || sr.isGeographic || sr.isWebMercator)) {
    await projection.load();
    ret = projection.project(geometryOrGeometries, __geoXfrm_sr_GEO!, __geoXfrm_geoTrans_ITM2GEO!);
  }
  return ret;
}

export async function geo2itm(geometryOrGeometries: any): Promise<any> {
  __geoXfrm_setup(/*2039, 108021*/);// _gali_ Call without params __geoXfrm_setup()
  let ret = geometryOrGeometries;
  let sr: SpatialReference | undefined = geometryOrGeometries?.spatialReference;
  if (!sr && Array.isArray(geometryOrGeometries) && geometryOrGeometries.length > 0) {
    sr = geometryOrGeometries[0]?.spatialReference;
  }
  if (sr && (sr.isWGS84 || sr.isGeographic || sr.isWebMercator)) {
    await projection.load();
    ret = projection.project(geometryOrGeometries, __geoXfrm_sr_ITM!, __geoXfrm_geoTrans_GEO2ITM!);
  }
  return ret;
}

function localeIsSame(locale1: string, locale2: string): boolean {
  return locale1.split('-')[0] === locale2.split('-')[0];
}

export function isRtlLocale(): boolean {
  let isRtl = false;
  var rtlLocales = ["ar", "he"];
  let locale = (window as any).locale ? (window as any).locale : window.navigator.language ? window.navigator.language : "en-Us";
  for (let i = 0; i < rtlLocales.length; i++) {
    if (localeIsSame(rtlLocales[i], locale)) {
      isRtl = true;
      break;
    }
  }
  return isRtl;
}

export function openNewBackgroundTab(url: string): void {
  // https://stackoverflow.com/questions/10812628/open-a-new-tab-in-the-background
  var is_chrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  if (!is_chrome) {
    window.open(url, '_blank', "noopener, noreferrer");
  } else {
    openNewBackgroundTabChrome(url);
  }
}

function openNewBackgroundTabChrome(url: string): void {
  // https://stackoverflow.com/questions/10812628/open-a-new-tab-in-the-background
  var a = document.createElement("a");
  a.href = url;
  var evt = document.createEvent("MouseEvents");
  // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/initMouseEvent
  //the tenth parameter of initMouseEvent sets ctrl key    
  evt.initMouseEvent(
    "click",//1-type
    true,//2-canBubble
    true,//3-cancelable
    window,//4-view
    0,//5-detail
    0,//6-screenX
    0,//7=screenY
    0,//8-clientX
    0,//9-clientY
    true,//10-ctrlKey
    false,//11-altKey
    false,//12-shiftKey
    false,//13-metaKey
    0,//14-button
    null);//15-relatedTarget
  a.dispatchEvent(evt);
  //MLEV-TODO if users will ask to disable (though marker should stay till clicking icon again)
}

export function isBlank(str: string | null | undefined): boolean {
  return (!str || /^\s*$/.test(str))
}
export function isString(myVar: any): myVar is string {
  return typeof myVar === 'string' || myVar instanceof String;
}
export function isNumber(variable: any): boolean {
  //return (variable !== undefined && variable !== null && !isNaN(variable) && typeof Number(variable) === "number");
  return (variable !== undefined && variable !== null && !isNaN(variable));
}
export function urlParam(paramName: string, defaultValue?: any): any { // _gali_ Made defaultValue optional
  let urlParameters = new URLSearchParams(window.location.search.toLowerCase());
  paramName = paramName.toLowerCase();
  let paramValue = defaultValue;
  if (urlParameters.has(paramName)) {
    const paramValueAsString = urlParameters.get(paramName);
    if (paramValueAsString !== null && isNumber(paramValueAsString)) {
      paramValue = Number(paramValueAsString);
    } else if (paramValueAsString !== null) { // _gali_ Handle string params
      paramValue = paramValueAsString;
    }
  }
  return paramValue;
}
export function vpJsonFromStr(str: string): any {
  let arr = str.split(",");
  return vpJsonFromArr(arr);
}
export function vpJsonFromArr(arr: string[]): any {
  let vpJson: any = {
    rotation: null,
    scale: null,
    targetGeometry: null,
    camera: null,
    bmk: null
  };
  let i = 0;
  vpJson.rotation = parseFloat(arr[i++]);
  vpJson.scale = parseFloat(arr[i++]);
  let sr = {
    latestWkid: parseFloat(arr[i++]),
    wkid: parseFloat(arr[i++])
  };
  vpJson.targetGeometry = {
    spatialReference: sr,
    x: parseFloat(arr[i++]),
    y: parseFloat(arr[i++]),
    z: parseFloat(arr[i++])
  };
  let sr2 = {
    latestWkid: parseFloat(arr[i++]),
    wkid: parseFloat(arr[i++])
  };
  let position = {
    spatialReference: sr2,
    x: parseFloat(arr[i++]),
    y: parseFloat(arr[i++]),
    z: parseFloat(arr[i++])
  };
  vpJson.camera = {
    position: position,
    heading: parseFloat(arr[i++]),
    tilt: parseFloat(arr[i++])
  }
  if (arr.length > i) {
    let arr2 = arr.slice(i);
    vpJson.bmk = strFromArr(arr2);
  }
  return vpJson;
}

export function strFromArr(arr: string[]): string {
  return String.fromCharCode(...arr.map(Number));//was ...arr
}
export function strToArr(str: string): number[] {
  return str.split('').map(ascii);
}
export function arrMove(arr: any[], from: number, to: number): void {
  arr.splice(to, 0, arr.splice(from, 1)[0]);
}

function ascii(c: string): number {
  //https://stackoverflow.com/questions/94037/convert-character-to-ascii-code-in-javascript
  //return c.charCodeAt(0);
  return c.codePointAt(0)!;
}

export async function getViewpointFromUrl(view?: MapView | SceneView, mapContainerParam?: MapView | SceneView): Promise<Viewpoint | boolean> {//_ml_ added func
  const xLocation = urlParam('x', false);
  const yLocation = urlParam('y', false);
  let isXandYinUrl = false
  let bmk = null; // _gali_ bmk is set but never used, can be removed if not needed later
  const mapContainer = mapContainerParam ? mapContainerParam : view;

  if (!mapContainer)
    return false; // _gali_ Early exit if no map container

  if (xLocation !== false && yLocation !== false) {
    isXandYinUrl = true
    let camHeightAboveGroundUrl = urlParam('h', 200);
    if (camHeightAboveGroundUrl < 40) {
      camHeightAboveGroundUrl = 200;
    }
    if (xLocation > 10000 && yLocation > 10000) { //itm
      let xITM = xLocation as number;
      let yITM = yLocation as number;
      let byUrlCenterITM = new Point({
        x: xITM,
        y: yITM,
        spatialReference: new SpatialReference({
          wkid: __wkidTM
        })
      });
      let byUrlCenterGeo = await itm2geo(byUrlCenterITM) as Point;
      if (!byUrlCenterGeo) return false; // _gali_ Guard against projection failure
      let byUrlArrXYMercator = webMercatorUtils.lngLatToXY(byUrlCenterGeo.longitude, byUrlCenterGeo.latitude);
      let result = await mapContainer.map.ground.queryElevation(byUrlCenterGeo);
      let byUrlZGround = result.geometry.z;
      let byUrlComputedZCam = byUrlZGround + camHeightAboveGroundUrl;
      let cam = new Camera({
        position: {
          spatialReference: {
            wkid: 102100//3857 or 102100
          },
          x: byUrlArrXYMercator[0],
          y: byUrlArrXYMercator[1],
          z: byUrlComputedZCam
        },
        heading: 0, // face due north
        tilt: 0 // looking from above
      });
      let pCenterMercator = new Point({
        x: byUrlArrXYMercator[0],
        y: byUrlArrXYMercator[1],
        z: byUrlZGround,
        spatialReference: new SpatialReference({
          wkid: 102100
        })
      });
      try {
        let vp1 = new Viewpoint({
          rotation: 0,
          scale: 870,
          targetGeometry: pCenterMercator,
          camera: cam
        });
        return vp1
      } catch (e) {
        console.error(e);
        return false;
      }
    }
    else {//geo
      let xDegrees = xLocation as number;
      let yDegrees = yLocation as number;
      let pCenterGeo = new Point({
        x: xDegrees,
        y: yDegrees,
        spatialReference: new SpatialReference({
          wkid: 4326
        })
      });
      let arrXYMercator = webMercatorUtils.lngLatToXY(pCenterGeo.longitude, pCenterGeo.latitude);
      let result = await mapContainer.map.ground.queryElevation(pCenterGeo);
      let byUrlZGround = result.geometry.z;
      let byUrlComputedZCam = byUrlZGround + camHeightAboveGroundUrl;
      let cam = new Camera({
        position: {
          spatialReference: {
            wkid: 102100//3857 or 102100
          },
          x: arrXYMercator[0],
          y: arrXYMercator[1],
          z: byUrlComputedZCam
        },
        heading: 0, // face due north
        tilt: 0 // looking from above
      });
      let pCenterMercator = new Point({
        x: arrXYMercator[0],
        y: arrXYMercator[1],
        z: byUrlZGround,
        spatialReference: new SpatialReference({
          wkid: 102100
        })
      });
      try {
        let vp1 = new Viewpoint({
          rotation: 0,
          scale: 870,
          targetGeometry: pCenterMercator,
          camera: cam
        });
        return vp1
      } catch (e) {
        console.error(e);
        return false;
      }
    }
  }
  if (!isXandYinUrl && view) {// _gali_ Ensure view exists for initialViewProperties
    let vpUrlAsJson = urlParam('vp', false);
    if (vpUrlAsJson !== false && vpUrlAsJson !== null && vpUrlAsJson !== '') {
      try {
        // Viewpoint.fromJSON(jsonStr) alone is not enough! Don't know why!
        // JSON.parse needed first to create js obj, only then Viewpoint.fromJSON(js obj) will work.
        // note: Viewpoint.fromJSON() operates not only on JSON but also on javascript obj
        //if (vpUrlAsJson.indexOf("[") === 0) {
        //}
        let vpObj_ = null;
        switch (String(vpUrlAsJson).substring(0, 1)) {
          case "{":
          case "[":
            vpObj_ = JSON.parse(vpUrlAsJson);
            break;
          default:
            vpObj_ = JSON.parse(`[${vpUrlAsJson}]`);
            break;
        }
        let vpJson = null;
        if (isString(vpObj_)) {
          vpJson = vpJsonFromStr(vpObj_);
        }
        else if (Array.isArray(vpObj_)) {
          vpJson = vpJsonFromArr(vpObj_);
        }
        else if (vpObj_ !== null &&
          typeof vpObj_ === 'object') {
          vpJson = vpObj_;
        }
        if (vpJson) {
          if (vpJson.bmk) {
            bmk = vpJson.bmk;
            delete vpJson.bmk;
          }
          vpUrlAsJson = JSON.stringify(vpJson);
          vpObj_ = JSON.parse(vpUrlAsJson);
        }
        //
        //console.log(`vpObj_=${JSON.stringify(vpObj_, null, 2)}`);//dbg - identical to vpObj
        let vpObj = Viewpoint.fromJSON(vpObj_);
        if (vpObj) {
          //console.log(`vpObj =${JSON.stringify(vpObj)}`);//dbg
          view.map.initialViewProperties.viewpoint = vpObj;
          return vpObj.clone();
        }
      } catch (e) {
        console.error(e);
      }
    }
  }
  return false;
}

export function todayMilliseconds(): string {
  var d = new Date(),
    year = d.getFullYear(),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    hours = '' + d.getHours(),
    minutes = '' + d.getMinutes(),
    seconds = '' + d.getSeconds(),
    ms = '' + d.getMilliseconds();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  if (hours.length < 2) hours = '0' + hours;
  if (minutes.length < 2) minutes = '0' + minutes;
  if (seconds.length < 2) seconds = '0' + seconds;
  if (ms.length < 2) ms = '0' + ms;
  if (ms.length < 3) ms = '0' + ms;
  return `${year}${month}${day}-${hours}:${minutes}-${seconds}:${ms}`;
}

export const useEffectDidMount = (func: () => void, deps: React.DependencyList): void => {
  const didMount = useRef(false)
  useEffect(() => {
    if (didMount.current)
      func()
    else
      didMount.current = true
  }, deps)
}

