/** @jsx jsx */
/**
 * widget.tsx
 * Main widget - Define Work Unit - הגדרת יחידת עבודה
 * משמש את מנהלי העבודה בקרן קיימת לישראל, לניהול ומעקב משימות העבודה ביערות שבאחריותם
 *
 * ===
 * Places that are OK to keep using objectId
 * These are fine because they work within a single consistent source:
 * 1 WorkUnit operations (editingWorkUnit.objectId) - always from server
 * 2 Layer queries with objectIdField - server operations
 * 3 HTML keys (key={stand.objectId}) - just for React rendering
 * 4 partialStandIds Set - populated from server query within same operation
 * 5 lastDrawnStandIds, lastAddedStandIds - UI highlights within same session
 */

import { React, jsx, hooks, type AllWidgetProps, ReactDOM/*, loadArcGISJSAPIModules*/ } from "jimu-core";
import { JimuMapViewComponent, type JimuMapView } from "jimu-arcgis";

import Graphic from "esri/Graphic";
import Point from 'esri/geometry/Point';
import Polygon from 'esri/geometry/Polygon';
import Polyline from 'esri/geometry/Polyline';
import SimpleFillSymbol from "esri/symbols/SimpleFillSymbol";
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import SketchViewModel from 'esri/widgets/Sketch/SketchViewModel';

import * as geometryEngine from 'esri/geometry/geometryEngine';
// geometryOperators (modern, replaces deprecated geometryEngine)
import * as intersectionOperator from 'esri/geometry/operators/intersectionOperator';
import * as intersectsOperator from 'esri/geometry/operators/intersectsOperator';
import * as differenceOperator from 'esri/geometry/operators/differenceOperator';
import * as unionOperator from 'esri/geometry/operators/unionOperator';
import * as equalsOperator from 'esri/geometry/operators/equalsOperator';
import * as containsOperator from 'esri/geometry/operators/containsOperator';
import * as areaOperator from 'esri/geometry/operators/areaOperator';
import * as simplifyOperator from 'esri/geometry/operators/simplifyOperator';

import * as projection from 'esri/geometry/projection';
import TextSymbol from 'esri/symbols/TextSymbol';
import { __geoXfrm_setup, geo2itm, itm2geo } from "./geoUtils";

import defaultMessages from "./translations/default";
import { getWidgetStyles, getHelpPanelStyles } from "./style";
import {
  type CorrectionResult,
  type CorrectionChoice,
  type WidgetState,
  type WidgetData,
  type Stand,
  type Forest,
  type Compartment,
  type WorkUnit,
  initialWidgetData
} from "../config/types";
import { LAYERS_CONFIG } from '../config/layers.config';
import { defaultConfig } from '../config/config';
import {
  getAllLayers,
  queryStandByObjectId,
  hitTestForLayer,
  queryForests,
  queryCompartmentsByForest,
  queryStandsByCompartment,
  queryStandsByForest,
  createWorkUnit,
  updateWorkUnit,
  deleteWorkUnit,
  queryWorkUnitsIndex,
  generateWorkUnitId,
  queryWorkUnitByObjectId,
  isWorkUnitEditable,
  parseStandsString,
  queryStandsByList,
  isLockAvailable,
  acquireLock,
  getLockTimestamp,
  releaseLock,
  refreshLock,
  buildStandsStringForServer,
  buildStandsDisplayString,
  parseStandsStringWithPartial
} from "./map-utils";

import {
  applyFilterToLayer,
  clearFilterFromLayer,
  initializeAllLayerDataSources,
  debugLogDataSources // for debug. called by onActiveViewChange
} from "./data-source-utils";


/**
 * Help Panel Component - renders outside widget using Portal
 */
interface HelpPanelProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
  anchorRect: DOMRect | null;
  isHoverMode?: boolean;
}

function HelpPanel(props: HelpPanelProps): React.ReactElement | null {
  const { isOpen, title, content, onClose, anchorRect, isHoverMode = false } = props;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [isPositioned, setIsPositioned] = React.useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });

  // Calculate position after panel is rendered and we can measure it
  React.useEffect(() => {
    if (!isOpen || !anchorRect) {
      setIsPositioned(false);
      return;
    }

    // Use requestAnimationFrame to ensure panel is rendered before measuring
    const rafId = requestAnimationFrame(() => {
      const gap = 15;

      // Measure actual panel size (or use defaults if not yet rendered)
      let panelWidth = 450;
      let panelHeight = 300;

      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        panelWidth = rect.width || 450;
        panelHeight = rect.height || 300;
      }

      // Calculate available space
      const spaceOnLeft = anchorRect.left;
      const spaceOnRight = window.innerWidth - anchorRect.right;
      const spaceOnTop = anchorRect.top;
      const spaceOnBottom = window.innerHeight - anchorRect.bottom;

      console.log('[HELP] Widget rect:', anchorRect.left, '-', anchorRect.right, 'x', anchorRect.top, '-', anchorRect.bottom);
      console.log('[HELP] Panel size:', panelWidth, 'x', panelHeight);
      console.log('[HELP] Space - left:', spaceOnLeft, 'right:', spaceOnRight, 'top:', spaceOnTop, 'bottom:', spaceOnBottom);

      let left: number;
      let top: number;

      // Priority 1: Left (if enough space)
      if (spaceOnLeft >= panelWidth + gap) {
        left = anchorRect.left - panelWidth - gap;
        top = anchorRect.top;
        // Ensure panel doesn't go above screen
        if (top < gap) top = gap;
        // Ensure panel doesn't go below screen
        if (top + panelHeight > window.innerHeight - gap) {
          top = window.innerHeight - panelHeight - gap;
        }
        console.log('[HELP] Positioning: LEFT');
      }
      // Priority 2: Right (if enough space)
      else if (spaceOnRight >= panelWidth + gap) {
        left = anchorRect.right + gap;
        top = anchorRect.top;
        // Ensure panel doesn't go above screen
        if (top < gap) top = gap;
        // Ensure panel doesn't go below screen
        if (top + panelHeight > window.innerHeight - gap) {
          top = window.innerHeight - panelHeight - gap;
        }
        console.log('[HELP] Positioning: RIGHT');
      }
      // Priority 3: Bottom (if enough space)
      else if (spaceOnBottom >= panelHeight + gap) {
        top = anchorRect.bottom + gap;
        // Center horizontally relative to widget, but keep on screen
        left = anchorRect.left + (anchorRect.width / 2) - (panelWidth / 2);
        if (left < gap) left = gap;
        if (left + panelWidth > window.innerWidth - gap) {
          left = window.innerWidth - panelWidth - gap;
        }
        console.log('[HELP] Positioning: BOTTOM');
      }
      // Priority 4: Top (if enough space)
      else if (spaceOnTop >= panelHeight + gap) {
        top = anchorRect.top - panelHeight - gap;
        // Center horizontally relative to widget, but keep on screen
        left = anchorRect.left + (anchorRect.width / 2) - (panelWidth / 2);
        if (left < gap) left = gap;
        if (left + panelWidth > window.innerWidth - gap) {
          left = window.innerWidth - panelWidth - gap;
        }
        console.log('[HELP] Positioning: TOP');
      }
      // Fallback: Best fit - prefer left side for RTL
      else {
        // Try to position with minimal overlap
        left = Math.max(gap, Math.min(anchorRect.left - panelWidth - gap, window.innerWidth - panelWidth - gap));
        top = Math.max(gap, Math.min(anchorRect.top, window.innerHeight - panelHeight - gap));
        console.log('[HELP] Positioning: FALLBACK (best fit)');
      }

      setPosition({ top, left });
      setIsPositioned(true);
    });

    return () => cancelAnimationFrame(rafId);
  }, [isOpen, anchorRect]);

  // Handle click outside (only for non-hover mode)
  // Exclude clicks on the map - so help stays open when selecting work units
  React.useEffect(() => {
    if (!isOpen || isHoverMode) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Check if click is on the map - if so, don't close help panel
        const target = event.target as HTMLElement;
        const isMapClick = target.closest('.esri-view') ||
          target.closest('.jimu-widget-map') ||
          target.closest('[data-widgetid*="map"]');
        if (isMapClick) {
          return; // Don't close help when clicking on map
        }
        onClose();
      }
    };

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, isHoverMode, onClose]);

  // Handle dragging
  React.useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      setPosition({
        top: event.clientY - dragOffset.current.y,
        left: event.clientX - dragOffset.current.x
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (event: React.MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    setIsDragging(true);
    event.preventDefault();
  };

  if (!isOpen) return null;

  const style: React.CSSProperties = position ? {
    top: position.top,
    left: position.left,
    visibility: isPositioned ? 'visible' : 'hidden'
  } : {
    top: -9999,
    left: -9999,
    visibility: 'hidden'
  };

  const panelContent = (
    <div css={getHelpPanelStyles()}>
      <div ref={panelRef} className="help-panel" style={style}>
        <div
          className="help-panel-header"
          onMouseDown={handleDragStart}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <button className="help-panel-close" onClick={onClose}>
            ×
          </button>
          <span className="help-panel-title">{title}</span>
        </div>
        <div className="help-panel-content">{content}</div>
      </div>
    </div>
  );

  // Render to document.body using Portal
  return ReactDOM.createPortal(panelContent, document.body);
}

/**
 * Main Widget Component
 */
function Widget(props: AllWidgetProps<any>): React.ReactElement {
  // === Translations ===
  const translate = hooks.useTranslation(defaultMessages);

  // === Main widget state ===
  const [data, setData] = React.useState<WidgetData>(initialWidgetData);

  // === Help hover mode state ===
  const [isHelpHoverMode, setIsHelpHoverMode] = React.useState(false);

  // === Map view reference ===
  const [jimuMapView, setJimuMapView] = React.useState<JimuMapView | null>(null);
  const [mapWidgetId, setMapWidgetId] = React.useState<string | null>(null);

  // === Layers references ===
  const [layers, setLayers] = React.useState<{
    forests: __esri.FeatureLayer | null;
    compartments: __esri.FeatureLayer | null;
    stands: __esri.FeatureLayer | null;
    workUnits: __esri.FeatureLayer | null;
  }>({ forests: null, compartments: null, stands: null, workUnits: null });

  // === Ref for widget container (to calculate help panel position) ===
  const widgetRef = React.useRef<HTMLDivElement>(null);
  const [widgetRect, setWidgetRect] = React.useState<DOMRect | null>(null);

  // === Wrap state for lists ===
  const [wrappedLists, setWrappedLists] = React.useState({
    workUnitStands: false,
    standsToAdd: false,
    standsToRemove: false,
    selectorStands: false,
    pendingCorrection: false,
  });

  // State for confirmation dialog
  const [correctionDialog, setCorrectionDialog] = React.useState<{
    visible: boolean;
    drawnPolygon?: __esri.Polygon;
    message?: string;
  } | null>(null);

  const toggleWrap = (listName: 'workUnitStands' | 'standsToAdd' | 'standsToRemove' | 'selectorStands' | 'pendingCorrection') => {
    setWrappedLists(prev => ({
      ...prev,
      [listName]: !prev[listName]
    }));
  };


  // === Debug mode ===
  const isDebugMode = window.location.search.includes("dbg=log");//qq

  // === Graphics layer for highlighting selected stands (orange) ===
  const highlightLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Graphics layer for stands to add (cyan) ===
  const standsToAddLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === SketchViewModel for drawing ===
  const sketchVMRef = React.useRef<__esri.SketchViewModel | null>(null);
  const sketchLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Graphics layer for all compartments of forest (built from stands) ===
  const compartmentsLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Graphics layer for selected compartment highlight ===
  const selectedCompartmentLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Graphics layer for compartment labels ===
  const compartmentLabelsLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Graphics layer for hover highlight (compartment or stand) ===
  const hoverHighlightLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Track previous state for way change detection ===
  const prevStateRef = React.useRef<WidgetState>(data.currentState);

  // === Cache for forests (read once) ===
  const forestsCacheRef = React.useRef<Forest[] | null>(null);//qq

  // === Cache for forest stands (by forest number) ===
  const forestStandsCacheRef = React.useRef<{ forestNum: number; stands: Stand[] } | null>(null);

  // === Cache for work units index ===
  const workUnitsIndexRef = React.useRef<{ workUnitId: string; status: string; forestNum: string }[] | null>(null);

  // === Graphics layer for stands to remove (red) ===
  const standsToRemoveLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Graphics layer for highlighting selected work unit (in selector dialog) ===
  const workUnitHighlightLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Graphics layer for work unit polygon outline ===
  const workUnitPolygonLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);

  // === Locking mechanism refs ===
  const lastLockedTimeRef = React.useRef<number>(0);
  const heartbeatIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  const showWorkUnitSelectorRef = React.useRef(false);

  // Add a flag (e.g., at the top of your file or in config)
  const INIT_ALL_DATASOURCES = true;  // Set to false to disable

  // useEffect - ordered by groups
  // =============================================================================
  // GROUP A: MOUNT ONLY (run once or on ref changes)
  // =============================================================================
  // A1. Find map widget automatically (was #4)
  React.useEffect(() => { // === useEffect#A1 Find map widget automatically === Mount Only
    const state = window.jimuConfig?.isBuilder ? window._appState : window._appState;

    if (state?.appConfig?.widgets) {
      const widgets = state.appConfig.widgets;
      const mapWidget = Object.values(widgets).find((w: any) => w.manifest?.name === "arcgis-map");
      if (mapWidget) {
        console.log("[MAP] Found map widget:", (mapWidget as any).id);
        setMapWidgetId((mapWidget as any).id);
      }
    }
    __geoXfrm_setup(projection).then(() => {
      // No need to await it - it will complete in background
      // and subsequent calls return immediately.
      console.log('[INIT] geoUtils initialized');
    }).catch(err => {
      console.error('[INIT] geoUtils initialization failed:', err);
    });
  }, []);

  // A2. Create graphics layers and SketchViewModel (was #8)
  React.useEffect(() => { // === useEffect#A2 Create graphics layers and SketchViewModel === Mount Only
    if (!jimuMapView?.view) return;

    // Create highlight layer for workUnitStands (orange)
    if (!highlightLayerRef.current) {
      const highlightLayer = new GraphicsLayer({
        id: 'defineWorkUnit-highlight',
        title: 'Selected Stands Highlight',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(highlightLayer);
      highlightLayerRef.current = highlightLayer;
      console.log('[LAYERS] Orange highlight layer created');
    }

    // Create layer for standsToAdd (cyan)
    if (!standsToAddLayerRef.current) {
      const standsToAddLayer = new GraphicsLayer({
        id: 'defineWorkUnit-standsToAdd',
        title: 'Stands To Add Highlight',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(standsToAddLayer);
      standsToAddLayerRef.current = standsToAddLayer;
      console.log('[LAYERS] Cyan standsToAdd layer created');
    }

    // Create compartments layer (all compartments of forest)
    if (!compartmentsLayerRef.current) {
      const compartmentsLayer = new GraphicsLayer({
        id: 'defineWorkUnit-compartments',
        title: 'Compartments (from stands)',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(compartmentsLayer);
      compartmentsLayerRef.current = compartmentsLayer;
      console.log('[LAYERS] Compartments layer created');
    }

    // Create selected compartment highlight layer
    if (!selectedCompartmentLayerRef.current) {
      const selectedCompLayer = new GraphicsLayer({
        id: 'defineWorkUnit-selectedCompartment',
        title: 'Selected Compartment',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(selectedCompLayer);
      selectedCompartmentLayerRef.current = selectedCompLayer;
      console.log('[LAYERS] Selected compartment layer created');
    }

    // Create sketch layer
    if (!sketchLayerRef.current) {
      const sketchLayer = new GraphicsLayer({
        id: 'defineWorkUnit-sketch',
        title: 'Sketch Layer',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(sketchLayer);
      sketchLayerRef.current = sketchLayer;
      console.log('[LAYERS] Sketch layer created');
    }

    // Create SketchViewModel
    if (!sketchVMRef.current && sketchLayerRef.current) {
      const sketchVM = new SketchViewModel({
        view: jimuMapView.view,
        layer: sketchLayerRef.current,
        updateOnGraphicClick: false,  // Prevent auto-entering update mode
        defaultCreateOptions: {
          mode: 'hybrid'
        },
        polylineSymbol: {
          type: 'simple-line',
          color: [0, 255, 255, 1],  // Cyan (selected color)
          width: 3,
          style: 'short-dash'  // Dashed line
        } as any
      });
      sketchVMRef.current = sketchVM;
      console.log('[LAYERS] SketchViewModel created');
    }

    // Load projection engine for geometry operations
    projection.load().then(() => {
      console.log('[PROJECTION] Projection engine loaded');
    });

    // Create layer for standsToRemove (red)
    if (!standsToRemoveLayerRef.current) {
      const standsToRemoveLayer = new GraphicsLayer({
        id: 'defineWorkUnit-standsToRemove',
        title: 'Stands To Remove Highlight',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(standsToRemoveLayer);
      standsToRemoveLayerRef.current = standsToRemoveLayer;
      console.log('[LAYERS] Red standsToRemove layer created');
    }

    // Create layer for work unit polygon outline
    if (!workUnitPolygonLayerRef.current) {
      const workUnitPolygonLayer = new GraphicsLayer({
        id: 'defineWorkUnit-workUnitPolygon',
        title: 'Work Unit Polygon',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(workUnitPolygonLayer);
      workUnitPolygonLayerRef.current = workUnitPolygonLayer;
      console.log('[LAYERS] Work unit polygon layer created');
    }

    // Create layer for work unit highlight (in selector dialog)
    if (!workUnitHighlightLayerRef.current) {
      const workUnitHighlightLayer = new GraphicsLayer({
        id: 'defineWorkUnit-workUnitHighlight',
        title: 'Work Unit Highlight',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(workUnitHighlightLayer);
      workUnitHighlightLayerRef.current = workUnitHighlightLayer;
      console.log('[LAYERS] Work unit highlight layer created');
    }

    // Create layer for compartment labels
    if (!compartmentLabelsLayerRef.current) {
      const labelsLayer = new GraphicsLayer({
        id: 'defineWorkUnit-compartmentLabels',
        title: 'Compartment Labels',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(labelsLayer);
      compartmentLabelsLayerRef.current = labelsLayer;
      console.log('[LAYERS] Compartment labels layer created');
    }

    // Create layer for hover highlight
    if (!hoverHighlightLayerRef.current) {
      const hoverLayer = new GraphicsLayer({
        id: 'defineWorkUnit-hoverHighlight',
        title: 'Hover Highlight',
        listMode: 'hide'
      });
      jimuMapView.view.map.add(hoverLayer);
      hoverHighlightLayerRef.current = hoverLayer;
      console.log('[LAYERS] Hover highlight layer created');
    }

    return () => {
      // Cleanup on unmount
      if (highlightLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(highlightLayerRef.current);
        highlightLayerRef.current = null;
      }
      if (standsToAddLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(standsToAddLayerRef.current);
        standsToAddLayerRef.current = null;
      }
      if (compartmentsLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(compartmentsLayerRef.current);
        compartmentsLayerRef.current = null;
      }
      if (selectedCompartmentLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(selectedCompartmentLayerRef.current);
        selectedCompartmentLayerRef.current = null;
      }
      if (sketchLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(sketchLayerRef.current);
        sketchLayerRef.current = null;
      }
      if (sketchVMRef.current) {
        sketchVMRef.current.destroy();
        sketchVMRef.current = null;
      }
      if (standsToRemoveLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(standsToRemoveLayerRef.current);
        standsToRemoveLayerRef.current = null;
      }
      if (workUnitHighlightLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(workUnitHighlightLayerRef.current);
        workUnitHighlightLayerRef.current = null;
      }
      if (workUnitPolygonLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(workUnitPolygonLayerRef.current);
        workUnitPolygonLayerRef.current = null;
      }
      if (compartmentLabelsLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(compartmentLabelsLayerRef.current);
        compartmentLabelsLayerRef.current = null;
      }
      if (hoverHighlightLayerRef.current && jimuMapView?.view?.map) {
        jimuMapView.view.map.remove(hoverHighlightLayerRef.current);
        hoverHighlightLayerRef.current = null;
      }
      console.log('[LAYERS] Cleanup complete');
    };
  }, [jimuMapView]);

  // A3. Load work units index from localStorage (was #13)
  React.useEffect(() => { // === useEffect#A3 Load work units index from localStorage on mount === Mount Only
    const STORAGE_KEY = 'defineWorkUnit_workUnitsIndex';
    const TIMESTAMP_KEY = 'defineWorkUnit_workUnitsIndex_timestamp';
    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const timestamp = localStorage.getItem(TIMESTAMP_KEY);

      if (stored && timestamp) {
        const age = Date.now() - parseInt(timestamp);
        if (age < CACHE_DURATION) {
          workUnitsIndexRef.current = JSON.parse(stored);
          console.log('[CACHE] Loaded work units index from localStorage:', workUnitsIndexRef.current?.length);
        } else {
          console.log('[CACHE] Work units index expired');
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TIMESTAMP_KEY);
        }
      }
    } catch (e) {
      console.warn('[CACHE] Error loading from localStorage:', e);
    }
  }, []);

  // =============================================================================
  // GROUP B: VISIBILITY & FILTERS
  // =============================================================================
  // B1. MASTER - Layer Visibility & Filters (was #5)
  // =============================================================================
  // === useEffect MASTER: Layer Visibility & Filters ===
  // =============================================================================
  // This single useEffect controls ALL layer visibility and filter logic.
  // It replaces the previous #5, #7, #8, #17, #18 useEffects.
  // 
  // Logic flow by state:
  // - init: forests+workUnits visible, compartments+stands hidden, clear filters & selection
  // - create: forests visible (no filter), others hidden
  // - wayList without forest: forests visible (no filter), others hidden
  // - graphic modes (click/rect/poly): 
  //   - workUnits+compartments hidden
  //   - with forest: forests+stands filtered to forest
  //   - without forest: forests+stands visible (no filter)
  // =============================================================================
  React.useEffect(() => { // === useEffect#B1 MASTER  (Layer Visibility & Filters) === Visibility
    // Wait until ALL layers are available
    if (!layers.forests || !layers.workUnits || !layers.compartments || !layers.stands) {
      return;
    }

    const state = data.currentState;
    const fields = {
      forests: LAYERS_CONFIG.forests.fields,
      stands: LAYERS_CONFIG.stands.fields,
      compartments: LAYERS_CONFIG.compartments.fields
    };

    // Helper: Check if we're in a graphic mode
    const isGraphicMode =
      state === 'create.baseStands.wayClick' ||
      state === 'create.baseStands.wayRect' ||
      state === 'create.baseStands.wayPoly' ||
      state === 'edit.selected.baseStands.wayClick' ||
      state === 'edit.selected.baseStands.wayRect' ||
      state === 'edit.selected.baseStands.wayPoly';

    const isWayClickState =
      state === 'create.baseStands.wayClick' ||
      state === 'edit.selected.baseStands.wayClick';

    const isWayListState =
      state === 'create.baseStands.wayList' ||
      state === 'edit.selected.baseStands.wayList';

    // =========================================================================
    // STATE: init
    // =========================================================================
    if (state === 'init') {
      // Clear selection
      if (jimuMapView) {
        jimuMapView.clearSelectedFeatures();
      }

      // Forests and WorkUnits visible, Compartments and Stands hidden
      layers.forests.visible = true;
      clearFilterFromLayer(jimuMapView, layers.forests, props.id);

      layers.workUnits.visible = true;
      clearFilterFromLayer(jimuMapView, layers.workUnits, props.id);

      layers.compartments.visible = false;

      layers.stands.visible = false;
      layers.stands.refresh();

      console.log('[MASTER] init: forests+workUnits visible, compartments+stands hidden');
      return;
    }

    // =========================================================================
    // STATE: create (base selection screen)
    // =========================================================================
    if (state === 'create') {
      layers.forests.visible = true;
      clearFilterFromLayer(jimuMapView, layers.forests, props.id);

      layers.workUnits.visible = false;
      layers.compartments.visible = false;
      layers.stands.visible = false;

      console.log('[MASTER] create: forests visible, others hidden');
      return;
    }

    // =========================================================================
    // STATE: edit (waiting for user to click on a work unit)
    // =========================================================================
    if (state === 'edit') {
      // If work unit selector is shown, don't change filters (they're set by the selector logic)
      if (data.showWorkUnitSelector) {
        console.log('[MASTER] edit: selector shown, skipping filter changes');
        return;
      }

      // Forests and WorkUnits visible, Compartments and Stands hidden
      layers.forests.visible = true;
      clearFilterFromLayer(jimuMapView, layers.forests, props.id);

      // Show only editable work units
      layers.workUnits.visible = true;
      const editableStatuses = LAYERS_CONFIG.workUnits.editableStatuses;
      const statusField = LAYERS_CONFIG.workUnits.fields.status.name;
      const statusFilter = editableStatuses.map(s => `'${s}'`).join(',');
      applyFilterToLayer(
        jimuMapView,
        layers.workUnits,
        `${statusField} IN (${statusFilter})`,
        props.id
      );

      layers.compartments.visible = false;
      layers.stands.visible = false;

      console.log('[MASTER] edit: forests visible, workUnits filtered to editable, others hidden');
      return;
    }
    // =========================================================================
    // STATE: edit.selected.baseStands (after selecting work unit, before selecting way)
    // =========================================================================
    if (state === 'edit.selected.baseStands') {
      // Show only selected forest, hide others
      layers.forests.visible = true;
      applyFilterToLayer(
        jimuMapView,
        layers.forests,
        `${fields.forests.forestNum.name} = ${data.selectedForest.forestNum}`,
        props.id
      );

      layers.workUnits.visible = false;
      layers.compartments.visible = false;

      // Show stands filtered to forest
      layers.stands.visible = true;
      applyFilterToLayer(
        jimuMapView,
        layers.stands,
        `${fields.stands.forestNum.name} = ${data.selectedForest.forestNum}`,
        props.id
      );

      console.log('[MASTER] edit.selected.baseStands: filtered forest, stands visible');
      return;
    }

    // =========================================================================
    // STATE: wayList
    // =========================================================================
    if (isWayListState) {
      // Always hide workUnits in wayList
      layers.workUnits.visible = false;

      if (!data.selectedForest) {
        // No forest selected - show all forests
        layers.forests.visible = true;
        clearFilterFromLayer(jimuMapView, layers.forests, props.id);

        layers.compartments.visible = false;
        layers.stands.visible = false;

        console.log('[MASTER] wayList: no forest, showing all forests');
        return;
      }

      // Forest selected - filter to selected forest
      layers.forests.visible = true;
      applyFilterToLayer(
        jimuMapView,
        layers.forests,
        `${fields.forests.forestNum.name} = ${data.selectedForest.forestNum}`,
        props.id
      );

      // Show compartments for selected forest
      //layers.compartments.visible = true;
      //applyFilterToLayer(
      //  jimuMapView,
      //  layers.compartments,
      //  `${fields.compartments.forestNum.name} = ${data.selectedForest.forestNum}`,
      //  props.id
      //);

      if (data.selectedCompartment) {
        // Compartment selected - show stands for selected forest
        layers.stands.visible = true;
        applyFilterToLayer(
          jimuMapView,
          layers.stands,
          `${fields.stands.forestNum.name} = ${data.selectedForest.forestNum}`,
          props.id
        );

        console.log('[MASTER] wayList: forest+compartment selected, showing stands');
      } else {
        // No compartment selected - hide stands
        layers.stands.visible = false;

        console.log('[MASTER] wayList: forest selected, showing compartments');
      }

      return;
    }

    // =========================================================================
    // STATE: Graphic modes (click/rect/poly)
    // =========================================================================
    if (isGraphicMode) {
      // Always hide workUnits and compartments in graphic modes
      layers.workUnits.visible = false;
      layers.compartments.visible = false;

      if (data.selectedForest) {
        // Forest selected - filter forests and stands to selected forest
        layers.forests.visible = true;
        applyFilterToLayer(
          jimuMapView,
          layers.forests,
          `${fields.forests.forestNum.name} = ${data.selectedForest.forestNum}`,
          props.id
        );

        layers.stands.visible = true;
        applyFilterToLayer(
          jimuMapView,
          layers.stands,
          `${fields.stands.forestNum.name} = ${data.selectedForest.forestNum}`,
          props.id
        );

        console.log('[MASTER] graphic mode: filtered to forest', data.selectedForest.forestNum);
      } else {
        // No forest selected - show all forests and stands without filter
        layers.forests.visible = true;
        clearFilterFromLayer(jimuMapView, layers.forests, props.id);

        layers.stands.visible = true;
        clearFilterFromLayer(jimuMapView, layers.stands, props.id);

        console.log('[MASTER] graphic mode: no forest, showing all');
      }

      // Note: clearSelectedFeatures for wayClick+!forest is handled in a separate useEffect
      // because it needs setTimeout with proper cleanup

      return;
    }

    // =========================================================================
    // Default / other states - no changes
    // =========================================================================

  }, [
    data.currentState,
    data.selectedForest,
    data.selectedCompartment,
    data.workUnitStands.length,
    data.showWorkUnitSelector,
    layers.forests,
    layers.stands,
    layers.workUnits,
    layers.compartments,
    jimuMapView,
    props.id
  ]);

  // === useEffect: Watch stands layer loading state ===
  React.useEffect(() => {
    if (!jimuMapView?.view || !layers.stands) return;

    let layerViewHandle: __esri.WatchHandle | null = null;
    let isSubscribed = true;

    const watchLayerView = async () => {
      try {
        const layerView = await jimuMapView.view.whenLayerView(layers.stands);

        if (!isSubscribed) return;

        // Set initial state
        if (layerView.updating) {
          setData(prev => ({ ...prev, isLoadingStands: true }));
        }

        // Watch for updates
        layerViewHandle = layerView.watch('updating', (updating: boolean) => {
          if (isSubscribed) {
            setData(prev => ({ ...prev, isLoadingStands: updating }));
          }
        });
      } catch (e) {
        console.warn('[STANDS] Could not watch layer view:', e);
      }
    };

    watchLayerView();

    return () => {
      isSubscribed = false;
      if (layerViewHandle) {
        layerViewHandle.remove();
      }
    };
  }, [jimuMapView, layers.stands]);

  // B2. Clear Selection (was #6)
  // =============================================================================
  // === useEffect Clear Selection  (separate due to setTimeout cleanup) ===
  // =============================================================================
  React.useEffect(() => { // === useEffect#B2 (Clear Selection) === Visibility
    const isWayClickState =
      data.currentState === 'create.baseStands.wayClick' ||
      data.currentState === 'edit.selected.baseStands.wayClick';

    // When forest is cleared in wayClick mode, clear the native selection highlight
    if (isWayClickState && !data.selectedForest && jimuMapView) {
      const timeoutId = setTimeout(() => {
        jimuMapView.clearSelectedFeatures();
        console.log('[SELECTION] Selection cleared - forest was cleared in wayClick');
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [data.selectedForest, data.currentState, jimuMapView]);

  // B3. Focus on forest when selected
  // =============================================================================
  React.useEffect(() => { // === useEffect#B3 (Focus on Forest) === Visibility
    if (!jimuMapView?.view || !layers.forests || !data.selectedForest) return;

    // Don't zoom to forest in edit mode - zoom to work unit instead
    if (data.currentState.startsWith('edit.selected')) {
      console.log('[FOCUS] Skipping forest zoom in edit mode');
      return;
    }

    const fields = LAYERS_CONFIG.forests.fields;

    // Query the forest geometry to zoom to it
    const query = layers.forests.createQuery();
    query.where = `${fields.forestNum.name} = ${data.selectedForest.forestNum}`;
    query.returnGeometry = true;
    query.outFields = ['*'];

    layers.forests.queryFeatures(query).then(result => {
      if (result.features.length > 0) {
        const forestGeometry = result.features[0].geometry;
        jimuMapView.view.goTo(forestGeometry.extent.expand(1.2), {
          duration: 1000
        }).catch(err => {
          console.warn('[FOCUS] Could not zoom to forest:', err);
        });
        console.log('[FOCUS] Zoomed to forest:', data.selectedForest.forestNum);
      }
    }).catch(err => {
      console.warn('[FOCUS] Error querying forest geometry:', err);
    });

  }, [data.selectedForest?.forestNum, data.currentState, jimuMapView, layers.forests]);

  // =============================================================================
  // GROUP C: INTERACTIONS (user input handlers)
  // =============================================================================
  // C1. Map wayClick handler for wayClick mode (was #7)
  React.useEffect(() => { // === useEffect#C1 Map click handler for wayClick mode === Interactions
    if (!jimuMapView?.view || !layers.stands) return;

    // Only listen in wayClick states
    const isWayClickState = data.currentState === "create.baseStands.wayClick" || data.currentState === "edit.selected.baseStands.wayClick";

    if (!isWayClickState) return;

    console.log("[CLICK] Setting up click handler for wayClick mode");

    // Disable popups while in wayClick mode
    const originalPopupEnabled = jimuMapView.view.popupEnabled;
    jimuMapView.view.popupEnabled = false;
    console.log("[CLICK] Popups disabled");

    const standClickHandler = jimuMapView.view.on("click", async (event: any) => {//wayClick
      console.log("[CLICK] Map clicked at", event.mapPoint);

      try {
        // Hit test on stands layer
        const hitResult = await hitTestForLayer(jimuMapView, event.screenPoint, layers.stands);

        if (!hitResult) {
          console.log("[CLICK] No stand found at click location");
          return;
        }

        const objectId = Number(hitResult.getObjectId());
        console.log("[CLICK] Stand clicked, OBJECTID:", objectId);

        // ADD THIS LINE to clear the auto-selection after 300ms:
        setTimeout(() => {
          jimuMapView?.clearSelectedFeatures();//The ?. is important in case jimuMapView becomes null during those 500ms (e.g., if user navigates away)
        }, 300);

        // Query full stand info
        const stand = await queryStandByObjectId(layers.stands, objectId);
        if (!stand) {
          console.log("[CLICK] Could not query stand details");
          return;
        }

        console.log("[CLICK] Stand details:", stand);

        // Capture current state for checks (outside setData)
        const currentData = data;
        const standKey = `${stand.compartmentNum}-${stand.standNum}`;
        const isAlreadyInList = currentData.workUnitStands.some(s => `${s.compartmentNum}-${s.standNum}` === standKey);
        const standLabel = `${stand.compartmentNum}-${stand.standNum}`;
        const isEditMode = currentData.currentState.startsWith('edit.');

        // Check if stand is in standsToRemove (edit mode - restore removed stand)
        const isInStandsToRemove = currentData.standsToRemove.some(s => `${s.compartmentNum}-${s.standNum}` === standKey);

        if (isInStandsToRemove) {
          console.log("[CLICK] Restoring removed stand");
          setData((prev) => {
            const restoredStand = prev.standsToRemove.find(s => `${s.compartmentNum}-${s.standNum}` === standKey);
            return {
              ...prev,
              workUnitStands: [...prev.workUnitStands, restoredStand],
              standsToRemove: prev.standsToRemove.filter(s => `${s.compartmentNum}-${s.standNum}` !== standKey),
              lastMessageType: null,
              lastMessage: `עומד ${standLabel} שוחזר`,
              lastAddedStandIds: []
            };
          });
          return;
        }

        if (isAlreadyInList) {
          // === REMOVE from list (toggle off) ===
          console.log("[CLICK] Removing stand from list");

          // Convert stand geometry to ITM first
          const standGeometryITM = stand.geometry ? geo2itm(projection, stand.geometry) as __esri.Polygon : null;

          setData((prev) => {
            const newStands = prev.workUnitStands.filter(s => `${s.compartmentNum}-${s.standNum}` !== standKey);

            // If both lists become empty, clear forest too (but not in edit mode)
            const shouldClearForest = !isEditMode && newStands.length === 0 && prev.standsToAdd.length === 0;

            // If removing last stand, clear selection immediately with delay
            if (newStands.length === 0) {
              setTimeout(() => {
                jimuMapView?.clearSelectedFeatures();
              }, 50);
            }

            // Update wuPolygonFinal by removing this stand's geometry
            let newPolygon = prev.wuPolygonFinal;
            if (newPolygon && standGeometryITM) {
              const result = differenceOperator.execute(newPolygon, standGeometryITM);
              if (result) newPolygon = result as __esri.Polygon;
            }
            // If all stands removed, clear polygon too
            if (shouldClearForest) {
              newPolygon = null;
            }

            return {
              ...prev,
              workUnitStands: newStands,
              selectedForest: shouldClearForest ? null : prev.selectedForest,
              allForestStands: shouldClearForest ? [] : prev.allForestStands,
              wuPolygonFinal: newPolygon,
              lastMessageType: null,
              lastMessage: `עומד שלם ${standLabel} הוסר`,
              lastAddedStandIds: []
            };
          });

        } else {
          // === ADD to list ===

          // Check if stand is in the same forest (if forest already selected)
          if (currentData.selectedForest && currentData.selectedForest.forestNum !== stand.forestNum) {
            console.log(`[CLICK] Stand ${standLabel} שייך ליער ${stand.forestName}, לא ליער ${currentData.selectedForest.forestName}, ignoring`);

            setData(prev => ({
              ...prev,
              lastMessageType: 'warning',
              lastMessage: `עומד ${standLabel} נמצא ביער ${stand.forestName}`,
            }));
            return;
          }

          console.log("[CLICK] Adding stand to list");

          const isFirstStand = !currentData.selectedForest &&
            currentData.workUnitStands.length === 0 &&
            currentData.standsToAdd.length === 0;

          if (isFirstStand) {
            // === First stand - need to load all forest stands ===
            console.log("[CLICK] First stand - loading forest stands for:", stand.forestNum);

            const newForest: Forest = {
              forestNum: stand.forestNum,
              forestName: stand.forestName,
            };

            // Show loading indicator
            setData(prev => ({
              ...prev,
              isLoading: true,
              loadingMessage: 'טוען עומדי יער...'
            }));

            try {
              const allStands = await loadForestStands(stand.forestNum);

              const standGeometryITM = stand.geometry ? geo2itm(projection, stand.geometry) as __esri.Polygon : null;
              setData(prev => ({
                ...prev,
                workUnitStands: [...prev.workUnitStands, { ...stand, geometry: standGeometryITM }],
                selectedForest: newForest,
                allForestStands: allStands,
                wuPolygonFinal: standGeometryITM,
                isLoading: false,
                loadingMessage: '',
                lastMessageType: null,
                lastMessage: `עומד שלם ראשון ${standLabel} צורף`,
                lastAddedStandIds: [standKey]
              }));
            } catch (err) {
              console.error("[CLICK] Error loading forest stands:", err);
              // Still add the stand even if cache load fails
              const standGeometryITM = stand.geometry ? geo2itm(projection, stand.geometry) as __esri.Polygon : null;
              setData(prev => ({
                ...prev,
                workUnitStands: [...prev.workUnitStands, { ...stand, geometry: standGeometryITM }],
                selectedForest: newForest,
                wuPolygonFinal: standGeometryITM,
                isLoading: false,
                loadingMessage: '',
                lastMessageType: 'warning',
                lastMessage: `עומד שלם ${standLabel} צורף (שגיאה בטעינת יער)`,
                lastAddedStandIds: [standKey]
              }));
            }

          } else {
            // === Not first stand - just add ===
            // Convert stand geometry to ITM first
            const standGeometryITM = stand.geometry ? geo2itm(projection, stand.geometry) as __esri.Polygon : null;

            setData(prev => {
              // Update wuPolygonFinal by adding this stand's geometry
              let newPolygon = prev.wuPolygonFinal;
              console.log('[CLICK DEBUG] standGeometryITM:', standGeometryITM);
              console.log('[CLICK DEBUG] prev.wuPolygonFinal:', prev.wuPolygonFinal);
              console.log('[CLICK DEBUG] prev.wuPolygonFinal SR:', prev.wuPolygonFinal?.spatialReference?.wkid);
              console.log('[CLICK DEBUG] standGeometryITM SR:', standGeometryITM?.spatialReference?.wkid);
              if (standGeometryITM) {
                if (!newPolygon) {
                  console.log('[CLICK DEBUG] No existing polygon, using stand geometry');
                  newPolygon = standGeometryITM;
                } else {
                  console.log('[CLICK DEBUG] Executing union...');
                  const result = unionOperator.execute(newPolygon, standGeometryITM);
                  console.log('[CLICK DEBUG] Union result:', result);
                  if (result) newPolygon = result as __esri.Polygon;
                }
              }
              console.log('[CLICK DEBUG] Final newPolygon:', newPolygon);

              return {
                ...prev,
                workUnitStands: [...prev.workUnitStands, { ...stand, geometry: standGeometryITM }],
                wuPolygonFinal: newPolygon,
                lastMessageType: null,
                lastMessage: `עומד שלם ${standLabel} צורף`,
                lastAddedStandIds: [`${stand.compartmentNum}-${stand.standNum}`]
              };
            });
          }
        }

      } catch (error) {
        console.error("[CLICK] Error handling click:", error);
      }
    });

    // Cleanup
    return () => {
      console.log("[CLICK] Removing click handler");
      standClickHandler.remove();

      // Restore popups
      jimuMapView.view.popupEnabled = originalPopupEnabled;
      console.log("[CLICK] Popups restored");
    };
  }, [jimuMapView, layers.stands, data.currentState, data.selectedForest, data.workUnitStands, data.standsToAdd]);

  // C2. Map click handler for edit mode - select work unit
  React.useEffect(() => { // === useEffect#C2 Map click handler for edit mode === Interactions
    if (!jimuMapView?.view || !layers.workUnits || !layers.stands) return;

    // Only listen in edit state (waiting for work unit selection)
    // Don't listen when selector dropdown is shown
    if (data.currentState !== 'edit' || data.showWorkUnitSelector) return;

    console.log('[EDIT] Setting up click handler for edit mode');

    // Disable popups while in edit mode
    const originalPopupEnabled = jimuMapView.view.popupEnabled;
    jimuMapView.view.popupEnabled = false;
    console.log('[EDIT] Popups disabled');

    const wuClickHandler = jimuMapView.view.on('click', async (event: any) => {

      console.log('[EDIT] Click detected, showWorkUnitSelectorRef.current =', showWorkUnitSelectorRef.current);

      // If selector dropdown is shown, ignore clicks
      if (showWorkUnitSelectorRef.current) {
        console.log('[EDIT] Selector shown, ignoring click');
        return;
      }

      console.log('[EDIT] Map clicked, checking for work unit...');

      // Query all work units at click location (not just hitTest which returns only one)
      const query = layers.workUnits.createQuery();
      query.geometry = jimuMapView.view.toMap(event.screenPoint);
      query.spatialRelationship = 'intersects';
      query.outFields = ['*'];
      query.returnGeometry = true;

      const result = await layers.workUnits.queryFeatures(query);

      if (result.features.length === 0) {
        console.log('[EDIT] No work unit found at click location');
        return;
      }

      console.log('[EDIT] Found', result.features.length, 'work units at click location');

      // If multiple work units, show selection dialog
      if (result.features.length > 1) {
        const fields = LAYERS_CONFIG.workUnits.fields;
        const workUnits: WorkUnit[] = result.features.map(f => ({
          objectId: Number(f.getObjectId()),
          forestNum: f.attributes[fields.forestNum.name],
          forestName: f.attributes[fields.forestName.name],
          compartments: f.attributes[fields.compartments.name],
          stands: f.attributes[fields.stands.name],
          workUnitId: f.attributes[fields.workUnitId.name],
          status: f.attributes[fields.status.name],
          lockTimestamp: f.attributes[fields.lockTimestamp.name],
          geometry: f.geometry
        }));

        // Clear any selection highlight
        jimuMapView.clearSelectedFeatures();

        // Disable popups while selector is shown
        jimuMapView.view.popupEnabled = false;
        if (layers.forests) layers.forests.popupEnabled = false;
        if (layers.workUnits) layers.workUnits.popupEnabled = false;

        // Get objectIds of overlapping work units for filtering
        const overlappingIds = workUnits.map(wu => wu.objectId);

        // Get forest number (all overlapping work units are from the same forest)
        const forestNum = workUnits[0].forestNum;

        // Filter work units layer to show only overlapping ones
        if (layers.workUnits) {
          layers.workUnits.definitionExpression =
            `${layers.workUnits.objectIdField} IN (${overlappingIds.join(',')})`;
        }

        // Filter forests layer to show only the relevant forest
        if (layers.forests) {
          const forestField = LAYERS_CONFIG.forests.fields.forestNum.name;
          layers.forests.definitionExpression = `${forestField} = ${forestNum}`;
        }

        // Hide stands layer (will be filtered when user selects a work unit)
        if (layers.stands) {
          layers.stands.visible = false;
        }

        setData(prev => ({
          ...prev,
          overlappingWorkUnits: workUnits,
          selectedOverlappingIndex: 0,
          showWorkUnitSelector: true
        }));
        return;
      }

      // Single work unit - continue as before
      const graphic = result.features[0];
      const objectId = Number(graphic.getObjectId());

      console.log('[EDIT] Work unit clicked, objectId:', objectId);

      // Show loading
      setData(prev => ({
        ...prev,
        isLoading: true,
        loadingMessage: translate('loadingFromServer')
      }));

      try {
        // Build work unit from query result (no need to query again)
        const fields = LAYERS_CONFIG.workUnits.fields;
        const f = graphic;
        const workUnit: WorkUnit = {
          objectId: objectId,
          forestNum: f.attributes[fields.forestNum.name],
          forestName: f.attributes[fields.forestName.name],
          compartments: f.attributes[fields.compartments.name],
          stands: f.attributes[fields.stands.name],
          workUnitId: f.attributes[fields.workUnitId.name],
          status: f.attributes[fields.status.name],
          lockTimestamp: f.attributes[fields.lockTimestamp.name],
          geometry: f.geometry
        };

        console.log('[EDIT] Work unit data:', workUnit);

        // Check if editable
        if (!isWorkUnitEditable(workUnit)) {
          console.log('[EDIT] Work unit is not editable, status:', workUnit.status);
          setData(prev => ({
            ...prev,
            isLoading: false,
            errorMessage: translate('workUnitNotEditable')
          }));
          return;
        }

        // Step 1: Query server for current lock timestamp
        const LOCK_TIMEOUT = 25000;
        const serverTimestamp = await getLockTimestamp(layers.workUnits, objectId);
        const now = Date.now();
        let lockAcquired = false;
        let acquiredTimestamp = 0;

        // Step 2: No timestamp on server - lock is free
        if (!serverTimestamp) {
          console.log('[LOCK] No lock on server, acquiring...');
          const result = await acquireLock(layers.workUnits, objectId);
          lockAcquired = result.success;
          acquiredTimestamp = result.timestamp;
        }
        // Step 3: Timestamp older than 25 sec - lock expired, acquire normally
        else if ((now - serverTimestamp) > LOCK_TIMEOUT) {
          console.log('[LOCK] Server lock expired (age:', now - serverTimestamp, 'ms), acquiring...');
          const result = await acquireLock(layers.workUnits, objectId);
          lockAcquired = result.success;
          acquiredTimestamp = result.timestamp;
        }
        // Step 4: Timestamp is fresh (≤25 sec) - check if it's ours
        else {
          console.log('[LOCK] Server lock is fresh (age:', now - serverTimestamp, 'ms), checking localStorage...');
          const savedTimestamp = localStorage.getItem(`defineWorkUnit_lock_${objectId}`);

          if (savedTimestamp && Math.abs(parseInt(savedTimestamp) - serverTimestamp) < 100) {
            // It's OUR lock - reclaim it
            console.log('[LOCK] localStorage matches server - this is OUR lock, reclaiming...');
            const refreshResult = await refreshLock(layers.workUnits, objectId);
            if (refreshResult.success) {
              console.log('[LOCK] Successfully reclaimed our lock');
              lockAcquired = true;
              acquiredTimestamp = refreshResult.newTimestamp;
            }
          } else {
            // Not our lock - someone else has it
            console.log('[LOCK] Lock belongs to someone else (no localStorage or mismatch)');
            console.log('[LOCK] savedTimestamp:', savedTimestamp, 'serverTimestamp:', serverTimestamp);
          }
        }

        // If lock not acquired, enter waiting loop
        if (!lockAcquired) {
          console.log('[LOCK] Could not acquire lock, entering wait mode...');
          localStorage.removeItem(`defineWorkUnit_lock_${objectId}`);  // Clean up stale localStorage
          setData(prev => ({
            ...prev,
            isLoading: false,
            isWaiting: true,
            lockedWorkUnitId: workUnit.workUnitId,
            editingWorkUnit: workUnit,
            waitingStartTime: Date.now()
          }));
          return;
        }

        // Lock acquired successfully - save the EXACT timestamp from server to localStorage
        console.log('[LOCK] Lock acquired, proceeding to edit');
        lastLockedTimeRef.current = acquiredTimestamp;
        try {
          localStorage.setItem(`defineWorkUnit_lock_${objectId}`, acquiredTimestamp.toString());
          console.log('[LOCK] Saved timestamp to localStorage:', acquiredTimestamp);
        } catch (e) { /* ignore */ }

        // Set forest info
        const forest: Forest = {
          forestNum: parseInt(workUnit.forestNum),
          forestName: workUnit.forestName
        };

        // Load all forest stands (from cache or server)
        console.log('[EDIT] Loading all stands for forest:', forest.forestNum);
        const allStands = await loadForestStands(forest.forestNum);

        // Parse stands string and filter from cached stands
        const standsData = parseStandsStringWithPartial(workUnit.stands);
        console.log('[EDIT] Parsed stands:', standsData.length);

        const workUnitStands = allStands
          .filter(s =>
            standsData.some(sd =>
              sd.compartmentNum === s.compartmentNum && sd.standNum === s.standNum
            )
          )
          .map(s => {
            const standData = standsData.find(sd =>
              sd.compartmentNum === s.compartmentNum && sd.standNum === s.standNum
            );
            return { ...s, isPartial: standData?.isPartial || false };
          });
        console.log('[EDIT] Matched stands with geometry:', workUnitStands.length);

        // Zoom to work unit
        if (workUnit.geometry && jimuMapView?.view) {
          jimuMapView.view.goTo(workUnit.geometry.extent.expand(1.3), {
            duration: 1000
          }).catch(err => {
            console.warn('[EDIT] Could not zoom to work unit:', err);
          });
          console.log('[EDIT] Zoomed to work unit:', workUnit.workUnitId);
        }

        // Transition to edit.selected.baseStands
        logStateChange(data.currentState, 'edit.selected.baseStands', 'Work unit selected');

        const polygonITM = workUnit.geometry ? geo2itm(projection, workUnit.geometry) as __esri.Polygon : null;
        setData(prev => ({
          ...prev,
          currentState: 'edit.selected.baseStands',
          editingWorkUnit: workUnit,
          selectedForest: forest,
          workUnitStands: workUnitStands,
          initialStands: [...workUnitStands],
          wuPolygonFinal: polygonITM,
          initialPolygon: polygonITM,
          allForestStands: allStands,
          isLoading: false,
          errorMessage: null,
          lastMessage: null
        }));

      } catch (error) {
        console.error('[EDIT] Error loading work unit:', error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          errorMessage: String(error)
        }));
      }
    });

    return () => {
      wuClickHandler.remove();
      jimuMapView.view.popupEnabled = originalPopupEnabled;
      console.log('[EDIT] Click handler removed, popups restored');
    };
  }, [data.currentState, data.showWorkUnitSelector, jimuMapView, layers.workUnits, layers.stands, translate]);

  // C2. Handle wayRect and wayPoly modes (was #11)
  React.useEffect(() => { // === useEffect#C2 Handle wayRect and wayPoly modes - shape drawing === Interactions
    if (!sketchVMRef.current || !layers.stands || !jimuMapView?.view) return;

    const isWayRectState =
      data.currentState === 'create.baseStands.wayRect' ||
      data.currentState === 'edit.selected.baseStands.wayRect';

    const isWayPolyState =
      data.currentState === 'create.baseStands.wayPoly' ||
      data.currentState === 'edit.selected.baseStands.wayPoly';

    const isDrawingState = isWayRectState || isWayPolyState;

    if (!isDrawingState || !data.isDrawing) {
      return;
    }

    const shapeType = isWayPolyState ? 'polygon' : 'rectangle';
    const isForRemoval = data.isDrawingForRemoval;
    console.log('[DRAW] Drawing mode active:', shapeType, 'forRemoval:', isForRemoval);

    // Track if there was actual drawing (not just click) - for rectangle only
    let hadDragEvent = false;

    // Handle sketch events
    const handleCreate = sketchVMRef.current.on('create', async (event) => {
      console.log('[DRAW] Event:', event.state, event.toolEventInfo?.type);

      // Track drag events (only relevant for rectangle)
      if (event.state === 'active' && event.toolEventInfo?.type === 'cursor-update') {
        hadDragEvent = true;
      }

      if (event.state !== 'complete') return;

      // For rectangle: check if this was just a click without drag
      if (shapeType === 'rectangle' && !hadDragEvent) {
        console.log('[DRAW] Rectangle requires drag, single click ignored');
        if (sketchLayerRef.current) {
          sketchLayerRef.current.removeAll();
        }
        setData(prev => ({
          ...prev,
          isDrawing: false,
          isDrawingForRemoval: false,
          lastMessageType: 'warning', lastMessage: 'יש לגרור את העכבר כדי לצייר מלבן',
        }));
        return;
      }

      // Reset for next drawing
      hadDragEvent = false;

      console.log('[DRAW] Shape completed:', shapeType);
      const shapeGeometry = event.graphic.geometry;

      try {
        // Query stands that intersect the shape
        const fields = LAYERS_CONFIG.stands.fields;
        const query = layers.stands.createQuery();
        query.geometry = shapeGeometry;
        query.spatialRelationship = 'intersects';
        query.outFields = [
          layers.stands.objectIdField,
          fields.forestNum.name,
          fields.forestName.name,
          fields.compartmentNum.name,
          fields.standNum.name
        ];
        query.returnGeometry = true;

        const result = await layers.stands.queryFeatures(query);
        console.log('[DRAW] Found', result.features.length, 'stands in shape');

        if (result.features.length === 0) {
          setData(prev => ({
            ...prev,
            isDrawing: false,
            isDrawingForRemoval: false,
            lastDrawnStandIds: [],
            lastMessageType: 'warning', lastMessage: `לא נמצאו עומדים ב${isWayPolyState ? 'פוליגון' : 'מלבן'}`,
          }));
          if (sketchLayerRef.current) {
            sketchLayerRef.current.removeAll();
          }
          return;
        }

        // Convert to Stand objects, ensuring geometry is in ITM (2039)
        const newStands: Stand[] = result.features.map(f => ({
          objectId: Number(f.getObjectId()),
          forestNum: f.attributes[fields.forestNum.name],
          forestName: f.attributes[fields.forestName.name],
          compartmentNum: f.attributes[fields.compartmentNum.name],
          standNum: f.attributes[fields.standNum.name],
          geometry: f.geometry ? geo2itm(projection, f.geometry) : null
        }));

        if (isForRemoval) {
          // === REMOVAL MODE ===
          setData(prev => {
            // Filter only stands that exist in workUnitStands or standsToAdd
            const existingKeys = new Set([
              ...prev.workUnitStands.map(s => `${s.compartmentNum}-${s.standNum}`),
              ...prev.standsToAdd.map(s => `${s.compartmentNum}-${s.standNum}`)
            ]);

            const standsToRemoveFiltered = newStands.filter(s => existingKeys.has(`${s.compartmentNum}-${s.standNum}`));

            // Filter by selected forest
            const standsInForest = prev.selectedForest
              ? standsToRemoveFiltered.filter(s => s.forestNum === prev.selectedForest.forestNum)
              : standsToRemoveFiltered;

            // Don't add duplicates to standsToRemove
            const alreadyInRemoveList = new Set(prev.standsToRemove.map(s => `${s.compartmentNum}-${s.standNum}`));
            const trulyNewToRemove = standsInForest.filter(s => !alreadyInRemoveList.has(`${s.compartmentNum}-${s.standNum}`));

            if (sketchLayerRef.current) {
              sketchLayerRef.current.removeAll();
            }

            if (trulyNewToRemove.length === 0) {
              return {
                ...prev,
                isDrawing: false,
                isDrawingForRemoval: false,
                lastMessageType: 'warning', lastMessage: 'אין עומדים להסרה בצורה זו',
              };
            }

            return {
              ...prev,
              standsToRemove: [...prev.standsToRemove, ...trulyNewToRemove],
              isDrawing: false,
              isDrawingForRemoval: false,
              lastMessageType: null, lastMessage: `${trulyNewToRemove.length} עומדים נוספו לרשימת ההסרה`
            };
          });
        } else {
          // === ADD MODE ===
          const currentData = data; // capture current state
          let selectedForest = currentData.selectedForest;
          const isFirstTime = !selectedForest &&
            currentData.workUnitStands.length === 0 &&
            currentData.standsToAdd.length === 0;

          if (isFirstTime) {
            // First time - determine forest by majority
            const forestCounts: { [key: number]: { count: number; name: string; firstIndex: number } } = {};

            newStands.forEach((s, index) => {
              if (!forestCounts[s.forestNum]) {
                forestCounts[s.forestNum] = { count: 0, name: s.forestName, firstIndex: index };
              }
              forestCounts[s.forestNum].count++;
            });

            let maxCount = 0;
            let selectedForestNum = 0;
            let selectedForestName = '';
            let selectedFirstIndex = Infinity;

            Object.entries(forestCounts).forEach(([forestNumStr, info]) => {
              const forestNum = parseInt(forestNumStr);
              if (info.count > maxCount ||
                (info.count === maxCount && info.firstIndex < selectedFirstIndex)) {
                maxCount = info.count;
                selectedForestNum = forestNum;
                selectedForestName = info.name;
                selectedFirstIndex = info.firstIndex;
              }
            });

            selectedForest = {
              forestNum: selectedForestNum,
              forestName: selectedForestName
            };
            console.log('[DRAW] Forest determined:', selectedForest.forestName);
          }

          // Safety check
          if (!selectedForest) {
            console.error('[DRAW] No forest could be determined');
            if (sketchLayerRef.current) {
              sketchLayerRef.current.removeAll();
            }
            setData(prev => ({
              ...prev,
              isDrawing: false,
              isDrawingForRemoval: false,
              lastMessageType: 'warning', lastMessage: 'לא ניתן לקבוע יער',
            }));
            return;
          }

          const standsInForest = newStands.filter(s => s.forestNum === selectedForest.forestNum);

          // Filter out stands already in workUnitStands or standsToAdd
          const existingKeys = new Set([
            ...currentData.workUnitStands.map(s => `${s.compartmentNum}-${s.standNum}`),
            ...currentData.standsToAdd.map(s => `${s.compartmentNum}-${s.standNum}`)
          ]);
          const trulyNewStands = standsInForest.filter(s => !existingKeys.has(`${s.compartmentNum}-${s.standNum}`));
          console.log('[DRAW] New stands:', trulyNewStands.length);

          // Clear the sketch graphic
          if (sketchLayerRef.current) {
            sketchLayerRef.current.removeAll();
          }

          if (trulyNewStands.length === 0) {
            setData(prev => ({
              ...prev,
              selectedForest,
              isDrawing: false,
              isDrawingForRemoval: false,
              lastDrawnStandIds: [],
              lastMessageType: null, lastMessage: `אין עומדים חדשים ב${isWayPolyState ? 'פוליגון' : 'מלבן'}`,
            }));
            return;
          }

          const newKeys = trulyNewStands.map(s => `${s.compartmentNum}-${s.standNum}`);

          if (isFirstTime) {
            // First time - load forest stands
            console.log('[DRAW] First time - loading forest stands');

            loadForestStands(selectedForest.forestNum).then(allStands => {
              setData(prev => ({
                ...prev,
                selectedForest,
                standsToAdd: [...prev.standsToAdd, ...trulyNewStands],
                allForestStands: allStands,
                isDrawing: false,
                isDrawingForRemoval: false,
                lastDrawnStandIds: newKeys,
                lastMessageType: null, lastMessage: `${trulyNewStands.length} עומדים נוספו לרשימת הצירוף`
              }));
            }).catch(err => {
              console.error('[DRAW] Error loading forest stands:', err);
              setData(prev => ({
                ...prev,
                selectedForest,
                standsToAdd: [...prev.standsToAdd, ...trulyNewStands],
                isDrawing: false,
                isDrawingForRemoval: false,
                lastDrawnStandIds: newKeys,
                lastMessageType: 'warning', lastMessage: `${trulyNewStands.length} עומדים נוספו (שגיאה בטעינת יער)`
              }));
            });
          } else {
            // Not first time
            setData(prev => ({
              ...prev,
              selectedForest,
              standsToAdd: [...prev.standsToAdd, ...trulyNewStands],
              isDrawing: false,
              isDrawingForRemoval: false,
              lastDrawnStandIds: newKeys,
              lastMessageType: null, lastMessage: `${trulyNewStands.length} עומדים נוספו לרשימת הצירוף`
            }));
          }
        }
      } catch (error) {
        console.error('[DRAW] Error querying stands:', error);
        setData(prev => ({
          ...prev,
          isDrawing: false,
          isDrawingForRemoval: false,
          lastMessageType: 'warning', lastMessage: 'שגיאה בשאילתת עומדים',
        }));
        if (sketchLayerRef.current) {
          sketchLayerRef.current.removeAll();
        }
      }
    });

    // Cleanup
    return () => {
      handleCreate.remove();
    };

  }, [jimuMapView, layers.stands, data.currentState, data.isDrawing, data.isDrawingForRemoval]);


  // C3. Handle correction line drawing
  React.useEffect(() => { // === useEffect#C3 Handle correction line drawing ===
    if (!sketchVMRef.current || !jimuMapView?.view) return;
    if (!data.isDrawingCorrectionLine) return;

    console.log('[CORRECTION] Correction line drawing mode active');

    const handleCreate = sketchVMRef.current.on('create', async (event) => {
      if (event.state !== 'complete') return;

      console.log('[CORRECTION] Line completed');

      // Convert line to ITM immediately
      const lineGeometry = geo2itm(projection, event.graphic.geometry) as __esri.Polyline;

      // Keep the drawn line visible as dashed cyan
      if (sketchLayerRef.current && event.graphic) {
        event.graphic.symbol = {
          type: 'simple-line',
          color: [0, 255, 255, 1],  // Cyan
          width: 3,
          style: 'short-dash'
        } as any;
      }

      // Get current work unit polygon (already in ITM from getCurrentWorkUnitPolygon)
      const currentPolygon = getCurrentWorkUnitPolygon();
      if (!currentPolygon) {
        console.warn('[CORRECTION] No work unit polygon to correct');
        setData(prev => ({
          ...prev,
          isDrawingCorrectionLine: false,
          lastMessageType: 'warning',
          lastMessage: translate('correctionLineNoPolygon')
        }));
        return;
      }

      try {
        // Apply correction and get results
        const result = await applyCorrectionLine(lineGeometry, currentPolygon);

        // CorrectionResult is a discriminated union.
        // TypeScript needs you to narrow the type using type guards
        // before accessing properties.Here's the correct pattern:

        // FIRST: Check for needsConfirmation (it has no 'success' property)
        if ('needsConfirmation' in result) {
          // TypeScript now knows it's the { needsConfirmation: true; drawnPolygon; message } variant
          setData(prev => ({
            ...prev,
            isDrawingCorrectionLine: false,
            correctionDialog: {
              visible: true,
              drawnPolygon: result.drawnPolygon,
              message: result.message
            }
          }));
          return;
        }

        // SECOND: Check for failure
        if (!result.success) {
          // TypeScript now knows it's the { success: false; message } variant
          if (sketchLayerRef.current) {
            sketchLayerRef.current.removeAll();
          }
          // Reset SketchViewModel state
          if (sketchVMRef.current) {
            sketchVMRef.current.cancel();
          }
          setData(prev => ({
            ...prev,
            isDrawingCorrectionLine: false,
            lastMessageType: 'warning',
            lastMessage: result.message || translate('correctionLineNoIntersection')
          }));
          return;
        }

        /// THIRD: Success case - show preview only, don't apply yet
        // Draw segments with per-segment colors (cyan for add, red for remove)
        if (sketchLayerRef.current) {
          sketchLayerRef.current.removeAll();
          const targetWkid = layers.stands?.spatialReference?.wkid || 2039;

          // Draw added pockets with cyan fill
          if (result.addedPockets) {
            for (const pocket of result.addedPockets) {
              const pocketGraphic = new Graphic({
                geometry: pocket,
                symbol: {
                  type: 'simple-fill',
                  color: [0, 255, 255, 0.2],  // Cyan fill
                  outline: {
                    color: [0, 255, 255, 1],
                    width: 2
                  }
                } as any
              });
              sketchLayerRef.current.add(pocketGraphic);
            }
          }

          // Draw removed pockets with red fill
          if (result.removedPockets) {
            for (const pocket of result.removedPockets) {
              const pocketGraphic = new Graphic({
                geometry: pocket,
                symbol: {
                  type: 'simple-fill',
                  color: [255, 0, 0, 0.2],  // Red fill
                  outline: {
                    color: [255, 0, 0, 1],
                    width: 2
                  }
                } as any
              });
              sketchLayerRef.current.add(pocketGraphic);
            }
          }

          // Draw added segments in cyan dashed line
          if (result.addedSegmentPaths) {
            for (const path of result.addedSegmentPaths) {
              const lineGraphic = new Graphic({
                geometry: new Polyline({
                  paths: [path],
                  spatialReference: { wkid: targetWkid }
                }),
                symbol: {
                  type: 'simple-line',
                  color: [0, 255, 255, 1],  // Cyan for add
                  width: 3,
                  style: 'short-dash'
                } as any
              });
              sketchLayerRef.current.add(lineGraphic);
            }
          }

          // Draw removed segments in red dashed line
          if (result.removedSegmentPaths) {
            for (const path of result.removedSegmentPaths) {
              const lineGraphic = new Graphic({
                geometry: new Polyline({
                  paths: [path],
                  spatialReference: { wkid: targetWkid }
                }),
                symbol: {
                  type: 'simple-line',
                  color: [255, 0, 0, 1],  // Red for remove
                  width: 3,
                  style: 'short-dash'
                } as any
              });
              sketchLayerRef.current.add(lineGraphic);
            }
          }
        }

        // Store pending correction (don't apply polygon/stands yet)
        setData(prev => ({
          ...prev,
          isDrawingCorrectionLine: false,
          pendingCorrection: {
            newPolygon: result.newPolygon,
            partialStandIds: result.partialStandIds,
            standsListAffectedByReshapeLine: result.standsListAffectedByReshapeLine,
            operationType: result.operationType || 'remove'
          },
          lastMessageType: null,
          lastMessage: null
        }));

      } catch (error) {
        console.error('[CORRECTION] Error applying correction:', error);
        setData(prev => ({
          ...prev,
          isDrawingCorrectionLine: false,
          lastMessageType: 'warning',
          lastMessage: 'שגיאה בביצוע התיקון'
        }));
      }
    });

    return () => {
      handleCreate.remove();
    };

  }, [jimuMapView, data.isDrawingCorrectionLine]);

  // Handle correction POLYGON drawing completion
  React.useEffect(() => {
    if (!data.isDrawingCorrectionPolygon || !sketchVMRef.current) return;

    console.log('[CORRECTION] Correction polygon drawing mode active');

    const handleCreate = sketchVMRef.current.on('create', async (event) => {
      if (event.state !== 'complete') return;

      console.log('[CORRECTION] Polygon completed');

      // Get geometry FIRST (before cancel clears it)
      const drawnPolygon = geo2itm(projection, event.graphic.geometry) as __esri.Polygon;

      // Cancel sketch IMMEDIATELY to prevent entering update mode (especially with freehand) _ml_
      //if (sketchVMRef.current) {
      //  setTimeout(() => {
      //    sketchVMRef.current.cancel();
      //  }, 300);
      //}

      // Get current work unit polygon (already in ITM)
      const currentPolygon = getCurrentWorkUnitPolygon();
      if (!currentPolygon) {
        console.warn('[CORRECTION] No work unit polygon to correct');
        setData(prev => ({
          ...prev,
          isDrawingCorrectionPolygon: false,
          lastMessageType: 'warning',
          lastMessage: translate('correctionLineNoPolygon')
        }));
        return;
      }

      try {
        // Both polygons are now in ITM - no projection needed
        const analysis = analyzeDrawnPolygon(drawnPolygon, currentPolygon);
        console.log('[CORRECTION] Polygon analysis:', analysis.type);
        // Handle based on analysis
        if (analysis.type === 'ambiguous') {
          // Cancel sketch FIRST to remove handles, then clear and add our preview
          if (sketchVMRef.current) {
            sketchVMRef.current.cancel();
          }
          if (sketchLayerRef.current) {
            sketchLayerRef.current.removeAll();
            const outlineGraphic = new Graphic({
              geometry: drawnPolygon,
              symbol: {
                type: 'simple-fill',
                color: [0, 255, 255, 0.2],
                outline: {
                  color: [0, 255, 255, 1],
                  width: 3,
                  style: 'short-dash'
                }
              } as any
            });
            sketchLayerRef.current.add(outlineGraphic);
          }

          // Need user input
          setData(prev => ({
            ...prev,
            isDrawingCorrectionPolygon: false,
            correctionDialog: {
              visible: true,
              drawnPolygon: drawnPolygon,
              message: 'הפוליגון חוצה את גבול יחידת העבודה. מה ברצונך לעשות?'
            }
          }));
          return;
        }

        // Auto action
        let newPolygon: __esri.Polygon;
        let message: string;
        let addedPockets: __esri.Polygon[] | undefined;
        let removedPockets: __esri.Polygon[] | undefined;

        if (analysis.type === 'empty_area') {
          console.log('[CORRECTION] Auto action: UNION (add area)');
          newPolygon = unionOperator.execute(currentPolygon, drawnPolygon) as __esri.Polygon;
          message = 'הפוליגון נוסף ליחידת העבודה';
          addedPockets = [drawnPolygon];
        } else {
          // wholly_inside
          console.log('[CORRECTION] Auto action: DIFFERENCE (cut hole)');
          newPolygon = differenceOperator.execute(currentPolygon, drawnPolygon) as __esri.Polygon;
          message = 'נוצר חור ביחידת העבודה';
          removedPockets = [drawnPolygon];
        }

        if (!newPolygon) {
          setData(prev => ({
            ...prev,
            isDrawingCorrectionPolygon: false,
            lastMessageType: 'warning',
            lastMessage: 'שגיאה בעדכון הפוליגון'
          }));
          return;
        }

        // Find partial stands
        const { partialStandIds, standsListAffectedByReshapeLine } = await findPartialStands(
          currentPolygon, newPolygon, addedPockets, removedPockets
        );

        // Draw the polygon outline as dashed cyan preview
        if (sketchLayerRef.current) {
          sketchLayerRef.current.removeAll();
          const outlineGraphic = new Graphic({
            geometry: drawnPolygon,
            symbol: {
              type: 'simple-fill',
              color: [0, 255, 255, 0.2],
              outline: {
                color: [0, 255, 255, 1],
                width: 3,
                style: 'short-dash'
              }
            } as any
          });
          sketchLayerRef.current.add(outlineGraphic);
        }

        // Store pending correction
        setData(prev => ({
          ...prev,
          isDrawingCorrectionPolygon: false,
          pendingCorrection: {
            newPolygon,
            partialStandIds,
            standsListAffectedByReshapeLine,
            operationType: analysis.type === 'empty_area' ? 'add' : 'remove'
          },
          lastMessageType: null,
          lastMessage: null
        }));

      } catch (error) {
        console.error('[CORRECTION] Error applying correction polygon:', error);
        setData(prev => ({
          ...prev,
          isDrawingCorrectionPolygon: false,
          lastMessageType: 'warning',
          lastMessage: 'שגיאה בביצוע התיקון'
        }));
      }
    });

    return () => {
      handleCreate.remove();
    };

  }, [jimuMapView, data.isDrawingCorrectionPolygon]);

  // =============================================================================
  // GROUP D: DATA LOADING
  // =============================================================================
  // D1. Load forests when entering wayList mode (was #12)
  React.useEffect(() => { // === useEffect#D1 Load forests when entering wayList mode === Data Loading
    const isWayListState =
      data.currentState === 'create.baseStands.wayList' ||
      data.currentState === 'edit.selected.baseStands.wayList';

    if (!isWayListState) return;

    // If forest already selected (from existing stands), load compartments
    if (data.selectedForest) {
      console.log('[LIST] Forest already selected:', data.selectedForest.forestName);

      if (data.availableCompartments.length === 0 && layers.compartments) {
        loadCompartments(data.selectedForest.forestNum);
      }

      // Load forests for dropdown display
      if (data.availableForests.length === 0) {
        loadForestsFromCacheOrStorage();
      }
      return;
    }

    // Load forests
    loadForestsFromCacheOrStorage();

  }, [data.currentState, data.selectedForest, layers.forests, layers.compartments, data.availableCompartments]);

  // =============================================================================
  // GROUP E: GRAPHICS (visual updates)
  // =============================================================================
  // E1. Update forest and compartment outline (was #9)

  // E2. Update highlight graphics (was #14)
  React.useEffect(() => { // === useEffect#E2 Update highlight graphics when stands lists change === Graphics
    const isWayListState =
      data.currentState === 'create.baseStands.wayList' ||
      data.currentState === 'edit.selected.baseStands.wayList';

    // Update workUnitStands highlights (orange)
    if (false && highlightLayerRef.current) {
      highlightLayerRef.current.removeAll();

      const orangeSymbol = new SimpleFillSymbol({
        color: [255, 165, 0, 0.3],
        outline: { color: [255, 165, 0, 1], width: 3 }
      });

      data.workUnitStands.forEach(stand => {
        if (stand.geometry) {
          const graphic = new Graphic({
            geometry: stand.geometry,
            symbol: orangeSymbol
          });
          highlightLayerRef.current.add(graphic);
        }
      });

      console.log('[HIGHLIGHT] Orange:', data.workUnitStands.length, 'stands');
    }

    // Clear workUnitStands highlights - no longer used (polygon shown instead)
    if (highlightLayerRef.current) {
      highlightLayerRef.current.removeAll();
    }

    // Update standsToAdd highlights (cyan / light blue)
    if (standsToAddLayerRef.current) {
      standsToAddLayerRef.current.removeAll();

      const cyanSymbol = new SimpleFillSymbol({ // graphicSymbol
        color: [0, 255, 255, 0.15],
        outline: { color: [0, 255, 255, 1], width: 3 }
      });

      const lightBlueSymbol = new SimpleFillSymbol({ // graphicSymbol
        color: [173, 216, 230, 0.1],
        outline: { color: [100, 149, 237, 0.8], width: 3 }
      });

      const lastAddedIds = new Set(data.lastDrawnStandIds);

      data.standsToAdd.forEach(stand => {
        if (stand.geometry) {
          const isLastAdded = lastAddedIds.has(`${stand.compartmentNum}-${stand.standNum}`);
          const symbol = isWayListState && !isLastAdded ? lightBlueSymbol : cyanSymbol;
          const graphic = new Graphic({
            geometry: stand.geometry,
            symbol: symbol
          });
          standsToAddLayerRef.current.add(graphic);
        }
      });

      console.log(`[HIGHLIGHT] Cyan: ${data.standsToAdd.length} stands (wayList: ${isWayListState})`);
    }

    // Update standsToRemove highlights (red)
    if (standsToRemoveLayerRef.current) {
      standsToRemoveLayerRef.current.removeAll();

      const redSymbol = new SimpleFillSymbol({ // graphicSymbol
        color: [255, 0, 0, 0.15],
        outline: { color: [255, 0, 0, 1], width: 3 }
      });

      data.standsToRemove.forEach(stand => {
        if (stand.geometry) {
          const graphic = new Graphic({
            geometry: stand.geometry,
            symbol: redSymbol
          });
          standsToRemoveLayerRef.current.add(graphic);
        }
      });

      console.log('[HIGHLIGHT] Red:', data.standsToRemove.length, 'stands');
    }

  }, [data.workUnitStands, data.standsToAdd, data.standsToRemove, data.lastDrawnStandIds, data.currentState]);

  // E3. Update work unit polygon when workUnitStands changes ===
  // === useEffect: Update work unit polygon when workUnitStands changes ===
  React.useEffect(() => {
    // Only show polygon in relevant states
    const isInEditOrCreateState =
      data.currentState.startsWith('create.baseStands') ||
      data.currentState.startsWith('edit.selected.baseStands');

    console.log('[WU POLYGON EFFECT] State:', data.currentState,
      'Stands count:', data.workUnitStands.length,
      'isRelevantState:', isInEditOrCreateState);

    if (!isInEditOrCreateState) {
      if (workUnitPolygonLayerRef.current) {
        workUnitPolygonLayerRef.current.removeAll();
      }
      return;
    }

    // If we have a corrected polygon, use it; otherwise rebuild from stands
    if (data.wuPolygonFinal) {
      console.log('[WU POLYGON EFFECT] Using corrected polygon');
      updateWorkUnitPolygonDirect(data.wuPolygonFinal);
    } else {
      updateWorkUnitPolygon(data.workUnitStands);
    }
  }, [data.workUnitStands, data.currentState, data.wuPolygonFinal]);

  // E4. Highlight selected work unit in selector dialog ===
  React.useEffect(() => {// === useEffect#E4 Highlight selected work unit in selector dialog ===
    if (!workUnitHighlightLayerRef.current) return;

    // Clear previous highlight
    workUnitHighlightLayerRef.current.removeAll();

    // Only highlight when selector is shown
    if (!data.showWorkUnitSelector || data.overlappingWorkUnits.length === 0) {
      return;
    }

    const selectedIndex = data.selectedOverlappingIndex;
    if (selectedIndex < 0 || selectedIndex >= data.overlappingWorkUnits.length) {
      return;
    }

    const selectedWU = data.overlappingWorkUnits[selectedIndex];
    if (selectedWU.geometry) {
      const orangeSymbol = new SimpleFillSymbol({
        //color: [255, 165, 0, 0.4],
        color: [255, 165, 0, 0.5],//transparent
        outline: { color: [255, 140, 0, 1], width: 4 }
      });

      const graphic = new Graphic({
        geometry: selectedWU.geometry,
        symbol: orangeSymbol
      });

      workUnitHighlightLayerRef.current.add(graphic);
      console.log('[SELECTOR] Highlighted work unit:', selectedWU.workUnitId);
    }
  }, [data.showWorkUnitSelector, data.selectedOverlappingIndex, data.overlappingWorkUnits]);

  // =============================================================================
  // GROUP F: STATE CHANGES
  // =============================================================================
  // F1. Clear standsToAdd when changing between ways (was #10)
  React.useEffect(() => { // === useEffect#F1 Clear standsToAdd when changing between ways === State
    const prevState = prevStateRef.current;
    const currState = data.currentState;

    const wasInWay = prevState.includes('.way');
    const isInWay = currState.includes('.way');
    const wayChanged = wasInWay && isInWay && prevState !== currState;

    //if (wayChanged) {
    //  console.log('[WAY CHANGE] Clearing state for way change');
    //  setData(prev => ({
    //    ...prev,
    //    standsToAdd: [],
    //    lastDrawnStandIds: [],
    //    // availableForests - לא מנקים! נטענים ב-useEffect נפרד
    //    availableCompartments: [],
    //    availableStands: [],
    //    selectedCompartment: null,
    //    lastMessageType: null, lastMessage: 'רשימת העומדים לצירוף נוקתה'
    //  }));
    //}

    if (wayChanged) {
      console.log('[WAY CHANGE] Clearing state for way change');
      setData(prev => {
        // Only show message if there was something to clear
        const hadStandsToAdd = prev.standsToAdd.length > 0;

        return {
          ...prev,
          standsToAdd: [],
          lastDrawnStandIds: [],
          // availableForests - לא מנקים!
          availableCompartments: [],
          availableStands: [],
          selectedCompartment: null,
          lastMessageType: null,
          lastMessage: hadStandsToAdd ? 'רשימת העומדים לצירוף נוקתה' : null
        };
      });
    }

    prevStateRef.current = currState;
  }, [data.currentState]);


  // =============================================================================
  // GROUP G: UI/MISC
  // =============================================================================
  // G1. Set floating panel height to auto (was #2)
  React.useEffect(() => { // === useEffect#G1 Set floating panel height to auto === UI/Misc
    if (widgetRef.current) {
      // Find the floating panel container
      const floatingPanel = widgetRef.current.closest(".jimu-floating-panel");
      if (floatingPanel) {
        (floatingPanel as HTMLElement).style.height = "auto";
      }
    }
  }, [data.currentState]);

  // G2. Update widget rect when help opens (was #3)
  React.useEffect(() => { // === useEffect#G2 Update widget rect when help opens === UI/Misc
    if (data.isHelpOpen && widgetRef.current) {
      // Small delay to allow DOM to update after state change
      const timeoutId = setTimeout(() => {
        if (widgetRef.current) {
          setWidgetRect(widgetRef.current.getBoundingClientRect());
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [data.isHelpOpen, data.currentState]);

  // Keep ref in sync with state
  React.useEffect(() => {
    showWorkUnitSelectorRef.current = data.showWorkUnitSelector;
  }, [data.showWorkUnitSelector]);

  // =============================================================================
  // GROUP H: DEBUG (can be removed in production)
  // =============================================================================
  // H1. DEBUG: Watch definitionExpression changes (was #6)
  React.useEffect(() => { // === useEffect#H1 DEBUG: Watch definitionExpression changes === Debug
    if (!layers.stands) return;

    const handle = (layers.stands as any).watch('definitionExpression', (newValue: string, oldValue: string) => {
      console.log('[WATCH] definitionExpression changed:', oldValue, '->', newValue);
      //console.trace();
    });

    return () => handle?.remove?.();
  }, [layers.stands]);

  // === useEffect: Heartbeat - refresh lock every 15 seconds while editing ===
  React.useEffect(() => {
    const isEditingWorkUnit = data.editingWorkUnit &&
      data.currentState.startsWith('edit.selected.baseStands');

    if (!isEditingWorkUnit || !layers.workUnits) {
      // Clear heartbeat if not in edit mode
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
        console.log('[LOCK] Heartbeat stopped');
      }
      return;
    }

    console.log('[LOCK] Starting heartbeat');

    heartbeatIntervalRef.current = setInterval(async () => {
      if (!data.editingWorkUnit || !layers.workUnits) return;

      const result = await refreshLock(layers.workUnits, data.editingWorkUnit.objectId);//WorkUnit operations (editingWorkUnit.objectId) - always from server

      if (result.success) {
        lastLockedTimeRef.current = result.newTimestamp;
        // Update localStorage for recovery after page refresh
        try {
          localStorage.setItem(`defineWorkUnit_lock_${data.editingWorkUnit.objectId}`, result.newTimestamp.toString());
        } catch (e) { /* ignore */ }
      } else {
        // Lock was lost!
        console.error('[LOCK] Lock lost! Returning to init state');
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;

        const lostWorkUnitId = data.editingWorkUnit?.workUnitId || '';

        setData(prev => ({
          ...prev,
          currentState: 'init',
          editingWorkUnit: null,
          selectedForest: null,
          workUnitStands: [],
          standsToAdd: [],
          standsToRemove: [],
          initialStands: []
        }));

        alert(`הנעילה על י"ע ${lostWorkUnitId} אבדה!\nהשינויים לא נשמרו.`);
      }
    }, 15000); // 15 seconds

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
        console.log('[LOCK] Heartbeat cleanup');
      }
    };
  }, [data.editingWorkUnit, data.currentState, layers.workUnits]);

  // === useEffect: Polling - check every 25 seconds while waiting for lock release ===
  React.useEffect(() => {
    if (!data.isWaiting || !layers.workUnits || !data.lockedWorkUnitId) {
      // Clear polling if not waiting
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('[LOCK] Polling stopped');
      }
      return;
    }

    console.log('[LOCK] Starting polling for work unit:', data.lockedWorkUnitId);

    // Disable map interactions while waiting
    if (jimuMapView?.view) {
      jimuMapView.view.navigation.mouseWheelZoomEnabled = false;
      jimuMapView.view.navigation.browserTouchPanEnabled = false;
      (jimuMapView.view as any).allLayerViews?.forEach((lv: any) => {
        if (lv.layer) lv.layer.popupEnabled = false;
      });
      jimuMapView.view.popupEnabled = false;
      (jimuMapView.view.container as HTMLElement).style.pointerEvents = 'none';
    }

    const checkLock = async () => {
      // Find the objectId from the work unit we're waiting for
      const objectId = data.editingWorkUnit?.objectId;
      if (!objectId || !layers.workUnits) return;

      // Just check if available (without acquiring)
      const available = await isLockAvailable(layers.workUnits, objectId);

      if (available) {
        console.log('[LOCK] Lock is now available, returning to edit state');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;

        alert(`י"ע ${data.lockedWorkUnitId} התפנתה. לחץ עליה שוב לעריכה.`);

        setData(prev => ({
          ...prev,
          isWaiting: false,
          lockedWorkUnitId: '',
          editingWorkUnit: null,
          waitingStartTime: 0
          // currentState stays at 'edit' - user needs to click again
        }));
      } else {
        console.log('[LOCK] Still locked, will check again...');
      }
    };

    pollingIntervalRef.current = setInterval(checkLock, 25000); // 25 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('[LOCK] Polling cleanup');
      }
      // Re-enable map interactions
      if (jimuMapView?.view) {
        jimuMapView.view.navigation.mouseWheelZoomEnabled = true;
        jimuMapView.view.navigation.browserTouchPanEnabled = true;
        jimuMapView.view.popupEnabled = true;
        (jimuMapView.view.container as HTMLElement).style.pointerEvents = 'auto';
      }
    };
  }, [data.isWaiting, data.lockedWorkUnitId, data.editingWorkUnit?.objectId, layers.workUnits]);

  // === useEffect: Release lock on browser close/refresh ===
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      // Best effort to release lock - may not complete
      if (data.editingWorkUnit && layers.workUnits) {
        const url = layers.workUnits.url + '/applyEdits';
        const fields = LAYERS_CONFIG.workUnits.fields;

        const updates = JSON.stringify([{
          attributes: {
            [layers.workUnits.objectIdField]: data.editingWorkUnit.objectId,
            [fields.lockTimestamp.name]: null
          }
        }]);

        // Use URL-encoded format - more reliable with ArcGIS REST API
        const params = new URLSearchParams();
        params.append('f', 'json');
        params.append('updates', updates);

        const blob = new Blob([params.toString()], {
          type: 'application/x-www-form-urlencoded'
        });

        const success = navigator.sendBeacon(url, blob);
        console.log('[LOCK] sendBeacon attempted, success:', success);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [data.editingWorkUnit, layers.workUnits]);

  /**
   * Handle way selection change with alert on first time
   */
  const handleWayChange = (newWay: string) => {
    // Get config with defaults
    const config = { ...defaultConfig, ...props.config };

    // Check if we have stands to add or remove
    const hasTemporaryStands = data.standsToAdd.length > 0 || data.standsToRemove.length > 0;

    if (hasTemporaryStands) {
      if (config.wayChangeWithTempListBehavior === 'block') {
        // Block mode - never allow changing way while temp list not empty
        alert(translate('wayChangeBlocked'));
        return;
      } else {
        // WarnThenClear mode - warn first time, then clear automatically
        if (!data.wayChangeAlertShown) {
          alert(translate('wayChangeWarning'));
          setData(prev => ({ ...prev, wayChangeAlertShown: true }));
          return;
        }
      }
    }

    // Clear compartments graphics when changing way
    clearCompartmentsGraphics();

    // Proceed with way change
    const baseState = data.currentState.includes('edit.selected')
      ? 'edit.selected.baseStands'
      : 'create.baseStands';

    const newState = `${baseState}.${newWay}` as WidgetState;
    logStateChange(data.currentState, newState, `Way changed to ${newWay}`);

    setData(prev => {
      // Clear forest only if no committed stands AND not in edit mode
      const isEditMode = prev.currentState.startsWith('edit.');
      const shouldClearForest = !isEditMode && prev.workUnitStands.length === 0 && prev.selectedForest !== null;

      return {
        ...prev,
        currentState: newState,
        standsToAdd: [],
        standsToRemove: [],
        lastDrawnStandIds: [],
        selectedCompartment: null,
        availableStands: [],
        availableCompartments: [],
        availableForests: shouldClearForest ? [] : prev.availableForests,
        selectedForest: shouldClearForest ? null : prev.selectedForest,
        lastMessageType: shouldClearForest ? 'warning' : null,
        lastMessage: shouldClearForest ? 'בחירת היער בוטלה' : null,
      };
    });
  };

  /**
   * Start drawing (rectangle or polygon based on current state) for adding stands
   */
  const startDrawingForAdd = () => {
    if (!sketchVMRef.current) return;

    const isPolyState =
      data.currentState === 'create.baseStands.wayPoly' ||
      data.currentState === 'edit.selected.baseStands.wayPoly';

    const drawType = isPolyState ? 'polygon' : 'rectangle';
    console.log('[DRAW] Start drawing for ADD:', drawType);

    setData(prev => ({ ...prev, isDrawing: true, isDrawingForRemoval: false }));

    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = false;
    }

    sketchVMRef.current.create(drawType);
  };

  /**
   * Start drawing (rectangle or polygon based on current state) for removing stands
   */
  const startDrawingForRemove = () => {
    if (!sketchVMRef.current) return;

    const isPolyState =
      data.currentState === 'create.baseStands.wayPoly' ||
      data.currentState === 'edit.selected.baseStands.wayPoly';

    const drawType = isPolyState ? 'polygon' : 'rectangle';
    console.log('[DRAW] Start drawing for REMOVE:', drawType);

    setData(prev => ({ ...prev, isDrawing: true, isDrawingForRemoval: true }));

    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = false;
    }

    sketchVMRef.current.create(drawType);
  };

  /**
   * Start drawing correction line (polyline)
   */
  const startDrawingCorrectionLine = () => {
    if (!sketchVMRef.current) return;

    console.log('[CORRECTION] Start drawing correction line');

    setData(prev => ({ ...prev, isDrawingCorrectionLine: true }));

    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = false;
    }

    sketchVMRef.current.create('polyline');
  };

  /**
   * Start drawing correction polygon
   */
  const startDrawingCorrectionPolygon = () => {
    if (!sketchVMRef.current) return;

    console.log('[CORRECTION] Start drawing correction polygon');

    setData(prev => ({ ...prev, isDrawingCorrectionPolygon: true }));

    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = false;
    }

    sketchVMRef.current.create('polygon');
  };

  /**
   * Cancel current drawing operation
   */
  const cancelDrawing = () => {
    console.log('[DRAW] Cancel drawing');

    if (sketchVMRef.current) {
      sketchVMRef.current.cancel();
    }
    if (sketchLayerRef.current) {
      sketchLayerRef.current.removeAll();
    }

    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = true;
    }

    setData(prev => ({
      ...prev,
      isDrawing: false,
      isDrawingForRemoval: false,
      isDrawingCorrectionLine: false,
      isDrawingCorrectionPolygon: false
    }));
  };

  // ====== ADD handleCorrectionChoice HERE (after startDrawingCorrectionLine) ======

  /**
   * Handle user choice from correction confirmation dialog
   */
  const handleCorrectionChoice = async (choice: 'add' | 'remove' | 'cancel') => {
    if (choice === 'cancel' || !data.correctionDialog?.drawnPolygon) {
      // Clear the preview polygon from sketch layer
      if (sketchLayerRef.current) {
        sketchLayerRef.current.removeAll();
      }
      setData(prev => ({ ...prev, correctionDialog: null }));
      return;
    }

    // Get current work unit polygon
    const currentPolygon = getCurrentWorkUnitPolygon();
    if (!currentPolygon) {
      setData(prev => ({
        ...prev,
        correctionDialog: null,
        lastMessage: translate('correctionLineNoPolygon'),
        lastMessageType: 'warning'
      }));
      return;
    }

    // Both drawnPolygon and currentPolygon are already in ITM
    const result = await applyCorrectionPolygonWithChoice(
      data.correctionDialog.drawnPolygon,
      currentPolygon,
      choice
    );

    if (result.success && result.newPolygon) {
      // Update preview to show only the affected area (added or removed portion)
      if (sketchLayerRef.current && result.affectedArea) {
        sketchLayerRef.current.removeAll();
        const previewColor = choice === 'add' ? [0, 255, 255, 0.2] : [255, 0, 0, 0.2];  // Cyan for add, red for remove
        const outlineColor = choice === 'add' ? [0, 255, 255, 1] : [255, 0, 0, 1];
        const outlineGraphic = new Graphic({
          geometry: result.affectedArea,
          symbol: {
            type: 'simple-fill',
            color: previewColor,
            outline: {
              color: outlineColor,
              width: 3,
              style: 'short-dash'
            }
          } as any
        });
        sketchLayerRef.current.add(outlineGraphic);
      }

      // Store in pendingCorrection to show draft list
      setData(prev => ({
        ...prev,
        correctionDialog: null,
        pendingCorrection: {
          newPolygon: result.newPolygon,
          partialStandIds: result.partialStandIds,
          standsListAffectedByReshapeLine: result.standsListAffectedByReshapeLine,
          operationType: choice
        },
        lastMessage: null,
        lastMessageType: null
      }));
    } else {
      setData(prev => ({
        ...prev,
        correctionDialog: null,
        lastMessage: result.message || translate('correctionError'),
        lastMessageType: 'warning'
      }));
    }
  };

  /**
   * Get current work unit polygon from graphics layer
   */
  const getCurrentWorkUnitPolygon = (): __esri.Polygon | null => {
    if (!workUnitPolygonLayerRef.current) return null;

    const graphics = workUnitPolygonLayerRef.current.graphics;
    if (graphics.length === 0) return null;

    const graphic = graphics.getItemAt(0);
    const polygon = graphic?.geometry as __esri.Polygon;
    if (!polygon) return null;

    // Always return in ITM (2039) using accurate transformation
    return geo2itm(projection, polygon) as __esri.Polygon;
  };

  /**
    * Apply user's choice for ambiguous polygon correction
    * Called after user clicks "Add" or "Remove" in confirmation dialog
    * 
    * @param drawnPolygon - The polygon user drew
    * @param workUnitPolygon - Current work unit polygon
    * @param choice - 'add' or 'remove'
    */
  const applyCorrectionPolygonWithChoice = async (
    drawnPolygon: __esri.Polygon,
    workUnitPolygon: __esri.Polygon,
    choice: CorrectionChoice
  ): Promise<{
    success: boolean;
    message?: string;
    newPolygon?: __esri.Polygon;
    affectedArea?: __esri.Polygon;
    partialStandIds?: Set<string>;
    standsListAffectedByReshapeLine?: Stand[];
  }> => {
    console.log('[CORRECTION] ========== applyCorrectionPolygonWithChoice START ==========');
    console.log('[CORRECTION] User choice:', choice);

    let newPolygon: __esri.Polygon;
    let message: string;

    if (choice === 'add') {
      // UNION - add user polygon to work unit
      // This will:
      // - Add area outside work unit
      // - Fill any holes that are covered
      console.log('[CORRECTION] Applying UNION (add)');
      newPolygon = unionOperator.execute(workUnitPolygon, drawnPolygon) as __esri.Polygon;
      message = 'השטח נוסף ליחידת העבודה';
    } else {
      // DIFFERENCE - subtract user polygon from work unit
      // This will:
      // - Remove area inside work unit that's covered by user polygon
      // - Area outside work unit remains outside (no XOR)
      console.log('[CORRECTION] Applying DIFFERENCE (remove)');
      newPolygon = differenceOperator.execute(workUnitPolygon, drawnPolygon) as __esri.Polygon;
      message = 'השטח הוסר מיחידת העבודה';
    }

    if (!newPolygon) {
      return { success: false, message: 'שגיאה בעדכון הפוליגון' };
    }

    // Check if result is empty (all area removed)
    try {
      const resultArea = Math.abs(areaOperator.execute(newPolygon));
      if (resultArea < 1) {
        return { success: false, message: 'לא ניתן להסיר את כל שטח יחידת העבודה' };
      }
    } catch (e) {
      // If we can't calculate area, the polygon might be invalid
      return { success: false, message: 'שגיאה בחישוב שטח הפוליגון' };
    }

    // Find partial stands
    // For UNION (add): the added area is the part of drawn polygon OUTSIDE the work unit
    // For DIFFERENCE (remove): the removed area is the part of drawn polygon INSIDE the work unit
    let addedPockets: __esri.Polygon[] | undefined;
    let removedPockets: __esri.Polygon[] | undefined;

    if (choice === 'add') {
      // Added area = drawn polygon minus original work unit
      const addedArea = differenceOperator.execute(drawnPolygon, workUnitPolygon) as __esri.Polygon;
      if (addedArea && addedArea.rings?.length > 0) {
        addedPockets = [addedArea];
        console.log('[CORRECTION] Added area calculated, rings:', addedArea.rings.length);
      }
    } else {
      // Removed area = intersection of drawn polygon with work unit
      const removedArea = intersectionOperator.execute(drawnPolygon, workUnitPolygon) as __esri.Polygon;
      if (removedArea && removedArea.rings?.length > 0) {
        removedPockets = [removedArea];
        console.log('[CORRECTION] Removed area calculated, rings:', removedArea.rings.length);
      }
    }

    const { partialStandIds, standsListAffectedByReshapeLine } = await findPartialStands(workUnitPolygon, newPolygon, addedPockets, removedPockets);

    console.log('[CORRECTION] ========== applyCorrectionPolygonWithChoice END ==========');

    // Get the affected area for preview
    const affectedArea = choice === 'add'
      ? (addedPockets?.[0] || null)
      : (removedPockets?.[0] || null);

    return {
      success: true,
      message,
      newPolygon,
      affectedArea,
      partialStandIds,
      standsListAffectedByReshapeLine
    };
  };

  // CORRECTION LINE/POLYGON - MAIN FUNCTION


  /**
   * Check if a polyline intersects itself using ESRI's simplifyOperator
   */
  const isSelfIntersecting03 = (polyline: __esri.Polyline): boolean => {
    console.log('[CORRECTION] isSelfIntersecting check');

    const path = polyline.paths[0];
    if (!path || path.length < 4) {
      console.log('[CORRECTION] Too few points for self-intersection');
      return false;
    }

    // Check each segment against all non-adjacent segments
    for (let i = 0; i < path.length - 1; i++) {
      for (let j = i + 2; j < path.length - 1; j++) {
        // Skip adjacent segments (they share a vertex)
        if (j === i + 1) continue;
        // Skip if last segment connects back to first (would share vertex at ends)
        if (i === 0 && j === path.length - 2) continue;

        // Create two line segments
        const line1 = new Polyline({
          paths: [[[path[i][0], path[i][1]], [path[i + 1][0], path[i + 1][1]]]],
          spatialReference: polyline.spatialReference
        });
        const line2 = new Polyline({
          paths: [[[path[j][0], path[j][1]], [path[j + 1][0], path[j + 1][1]]]],
          spatialReference: polyline.spatialReference
        });

        // Use geometryEngine to find intersection points
        const intersectionPoints = geometryEngine.intersectLinesToPoints(line1, line2);

        if (intersectionPoints && intersectionPoints.length > 0) {
          console.log('[CORRECTION] Self-intersection detected between segments', i, 'and', j);
          return true;
        }
      }
    }

    console.log('[CORRECTION] No self-intersection found');
    return false;
  };
  const isSelfIntersecting02 = (polyline: __esri.Polyline): boolean => {
    console.log('[CORRECTION] isSelfIntersecting check using simplifyOperator');

    const path = polyline.paths[0];
    if (!path || path.length < 4) {
      console.log('[CORRECTION] Too few points for self-intersection');
      return false;
    }

    // Create a polygon from the polyline path to check for self-intersections
    const testPolygon = new Polygon({
      rings: [path],
      spatialReference: polyline.spatialReference
    });

    // isSimple returns false if the polygon has self-intersections
    const isSimple = simplifyOperator.isSimple(testPolygon);
    console.log('[CORRECTION] simplifyOperator.isSimple:', isSimple);

    return !isSimple;
  };
  /**
   * Check if a polyline intersects itself
   */
  const isSelfIntersecting = (polyline: __esri.Polyline): boolean => {
    const path = polyline.paths[0];
    console.log('[CORRECTION] isSelfIntersecting check - path length:', path?.length);
    if (!path || path.length < 4) { // Need at least 4 points to self-intersect
      console.log('[CORRECTION] isSelfIntersecting - too few points, returning false');
      return false;
    }

    // Helper: check if two line segments intersect
    const segmentsIntersect = (
      p1: number[], p2: number[], // segment 1
      p3: number[], p4: number[]  // segment 2
    ): boolean => {
      const d1x = p2[0] - p1[0], d1y = p2[1] - p1[1];
      const d2x = p4[0] - p3[0], d2y = p4[1] - p3[1];
      const d3x = p3[0] - p1[0], d3y = p3[1] - p1[1];

      const denom = d1x * d2y - d1y * d2x;
      if (Math.abs(denom) < 1e-10) return false; // Parallel lines

      const t = (d3x * d2y - d3y * d2x) / denom;
      const u = (d3x * d1y - d3y * d1x) / denom;

      // Intersection occurs if both t and u are strictly between 0 and 1
      // (not at endpoints to avoid false positives at shared vertices)
      return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
    };

    // Check each segment against all non-adjacent segments
    for (let i = 0; i < path.length - 1; i++) {
      for (let j = i + 2; j < path.length - 1; j++) {
        // Skip if segments share a vertex (adjacent)
        if (j === i + 1) continue;

        if (segmentsIntersect(path[i], path[i + 1], path[j], path[j + 1])) {
          console.log('[CORRECTION] Self-intersection detected between segments', i, 'and', j);
          return true;
        }
      }
    }
    console.log('[CORRECTION] isSelfIntersecting - no intersection found');
    return false;
  };

  /**
   * Apply correction line/polygon to work unit polygon
   * 
   * Supports:
   * - Multipart polygons (disjoint parts)
   * - Polygons with holes
   * - User drawing closed polygons or open polylines
   * 
   * CLOSED POLYGON cases:
   * 1. Empty area (outside or in hole) → AUTO UNION
   * 2. Wholly inside solid, no holes → AUTO DIFFERENCE (cut hole)
   * 3. Ambiguous (crosses boundary, intersects hole, contains hole) → ASK USER
   * 
   * OPEN POLYLINE: "Follow the Line" algorithm:
   * 1. Find first segment definitely outside (not in hole)
   * 2. Determine which side (left/right) is "outside"
   * 3. Apply consistently to ALL segments:
   *    - Outside segments: ADD pocket on "outside side"
   *    - Inside segments: REMOVE pocket on "outside side"
   * 4. If pure inside line: compare areas, remove smaller
   */
  const applyCorrectionLine = async (
    reshapeLine: __esri.Polyline,
    wuPolygon: __esri.Polygon
  ): Promise<CorrectionResult> => {
    console.log('[CORRECTION] ========== applyCorrectionLine START ==========');
    console.log('[CORRECTION] workunit Polygon rings:', wuPolygon.rings?.length || 0);

    // ============================================================
    // CASE A: User drew a CLOSED POLYGON
    // ============================================================
    if (isClosedPolygon(reshapeLine) || isSelfIntersecting(reshapeLine)) {
      console.log('[CORRECTION] Detected CLOSED POLYGON or SELF-INTERSECTING line - rejecting');
      return {
        success: false,
        message: `קו חייב להיות פתוח. אסור לו לחתוך את עצמו או להסגר`
      };
    }

    // ============================================================
    // CASE B: User drew an OPEN POLYLINE
    // ============================================================
    console.log('[CORRECTION] Detected OPEN POLYLINE');

    // Split the line at polygon crossings
    const lineInside = intersectionOperator.execute(reshapeLine, wuPolygon) as __esri.Polyline;
    const lineOutside = differenceOperator.execute(reshapeLine, wuPolygon) as __esri.Polyline;

    console.log('[CORRECTION] lineInside paths count:', lineInside?.paths?.length || 0);
    console.log('[CORRECTION] lineOutside paths count:', lineOutside?.paths?.length || 0);

    if (!lineInside && !lineOutside) {
      return { success: false, message: 'הקו אינו חותך את הפוליגון' };
    }

    // Log each path details
    if (lineInside?.paths) {
      lineInside.paths.forEach((path, i) => {
        console.log(`[CORRECTION] Inside path ${i}: ${path.length} points, start:`, path[0], 'end:', path[path.length - 1]);
      });
    }
    if (lineOutside?.paths) {
      lineOutside.paths.forEach((path, i) => {
        console.log(`[CORRECTION] Outside path ${i}: ${path.length} points, start:`, path[0], 'end:', path[path.length - 1]);
      });
    }

    // Collect all valid segments (both endpoints on boundary of SAME ring)
    interface SegmentInfo {
      path: number[][];
      isOutside: boolean;
      startPoint: number[];
      endPoint: number[];
    }

    const allSegments: SegmentInfo[] = [];

    if (lineOutside?.paths) {
      for (const path of lineOutside.paths) {
        if (path.length < 2) continue;
        const startPoint = path[0];
        const endPoint = path[path.length - 1];

        const startOnBoundary = isPointOnBoundary(startPoint, wuPolygon);
        const endOnBoundary = isPointOnBoundary(endPoint, wuPolygon);

        console.log('[CORRECTION] Outside segment check - start on boundary:', startOnBoundary, 'end on boundary:', endOnBoundary);

        if (!startOnBoundary || !endOnBoundary) {
          console.log('[CORRECTION] Skipping outside segment - endpoints not on boundary');
          continue;
        }

        allSegments.push({ path, isOutside: true, startPoint, endPoint });
        console.log('[CORRECTION] Added outside segment');
      }
    }

    if (lineInside?.paths) {
      for (const path of lineInside.paths) {
        if (path.length < 2) continue;
        const startPoint = path[0];
        const endPoint = path[path.length - 1];

        const startOnBoundary = isPointOnBoundary(startPoint, wuPolygon);
        const endOnBoundary = isPointOnBoundary(endPoint, wuPolygon);

        console.log('[CORRECTION] Inside segment check - start on boundary:', startOnBoundary, 'end on boundary:', endOnBoundary);

        if (!startOnBoundary || !endOnBoundary) {
          console.log('[CORRECTION] Skipping inside segment - endpoints not on boundary');
          continue;
        }

        allSegments.push({ path, isOutside: false, startPoint, endPoint });
        console.log('[CORRECTION] Added inside segment');
      }
    }

    console.log('[CORRECTION] Total valid segments:', allSegments.length);

    if (allSegments.length === 0) {
      return { success: false, message: 'לא נמצאו קטעים חוקיים - ודא שהקו חוצה את גבול הפוליגון' };
    }

    // Find "outside side" from first OUTSIDE segment using signed area
    let outsideSide: 'left' | 'right' | null = null;

    for (const segment of allSegments) {
      if (!segment.isOutside) continue;

      // Create both pocket candidates for this segment
      const boundaryPaths = findBoundaryPathsBoth(wuPolygon, segment.startPoint, segment.endPoint);
      if (!boundaryPaths) {
        console.log('[CORRECTION] Could not find boundary paths for outside segment');
        continue;
      }

      const pocket1 = createPocketFromPaths(segment.path, boundaryPaths.path1);
      const pocket2 = createPocketFromPaths(segment.path, boundaryPaths.path2);

      if (!pocket1 || !pocket2) {
        console.log('[CORRECTION] Could not create pockets for outside segment');
        continue;
      }

      // Determine which pocket is outside and which side it's on
      const result = findOutsidePocketAndSide(segment.path, pocket1, pocket2, wuPolygon);

      if (result) {
        outsideSide = result.outsideSide;
        console.log('[CORRECTION] Determined outside side from signed area:', outsideSide);
        break;
      }
    }

    console.log('[CORRECTION] Final outside side:', outsideSide || 'NONE (pure inside line)');

    // Process ALL segments consistently
    let newPolygon: __esri.Polygon = wuPolygon;
    let modificationsApplied = 0;
    const addedPockets: __esri.Polygon[] = [];
    const removedPockets: __esri.Polygon[] = [];
    const addedSegmentPaths: number[][][] = [];
    const removedSegmentPaths: number[][][] = [];

    for (const segment of allSegments) {
      console.log('[CORRECTION] Processing segment, isOutside:', segment.isOutside);

      const boundaryPaths = findBoundaryPathsBoth(newPolygon, segment.startPoint, segment.endPoint);
      if (!boundaryPaths) {
        console.log('[CORRECTION] Could not find boundary paths (may span multiple parts), skipping');
        continue;
      }

      const pocket1 = createPocketFromPaths(segment.path, boundaryPaths.path1);
      const pocket2 = createPocketFromPaths(segment.path, boundaryPaths.path2);

      console.log('[CORRECTION] Pockets created - pocket1:', !!pocket1, 'pocket2:', !!pocket2);

      if (!pocket1 && !pocket2) {
        console.log('[CORRECTION] Could not create pockets, skipping');
        continue;
      }

      let pocketToUse: __esri.Polygon | null = null;

      if (pocket1 && pocket2) {
        // Always use the smaller pocket - it's the correct one
        const area1 = Math.abs(areaOperator.execute(pocket1));
        const area2 = Math.abs(areaOperator.execute(pocket2));

        console.log('[CORRECTION] Pocket1 area:', area1.toFixed(1));
        console.log('[CORRECTION] Pocket2 area:', area2.toFixed(1));

        pocketToUse = area1 <= area2 ? pocket1 : pocket2;
        console.log('[CORRECTION] Selected', area1 <= area2 ? 'pocket1' : 'pocket2', '(smaller area)');
      } else {
        pocketToUse = pocket1 || pocket2;
      }

      if (!pocketToUse) {
        console.log('[CORRECTION] No pocket selected, skipping');
        continue;
      }

      if (segment.isOutside) {
        // OUTSIDE segment: ADD (union)
        console.log('[CORRECTION] Adding pocket (union)');
        try {
          const result = unionOperator.execute(newPolygon, pocketToUse);
          if (result) {
            newPolygon = result as __esri.Polygon;
            modificationsApplied++;
            console.log('[CORRECTION] Union successful');
            addedPockets.push(pocketToUse);
            addedSegmentPaths.push(segment.path);
          }
        } catch (e) {
          console.error('[CORRECTION] Union failed:', e);
        }
      } else {
        // INSIDE segment: REMOVE (difference)
        console.log('[CORRECTION] Removing pocket (difference)');
        try {
          const result = differenceOperator.execute(newPolygon, pocketToUse);
          if (result) {
            newPolygon = result as __esri.Polygon;
            modificationsApplied++;
            console.log('[CORRECTION] Difference successful');
            removedPockets.push(pocketToUse);
            removedSegmentPaths.push(segment.path);
          }
        } catch (e) {
          console.error('[CORRECTION] Difference failed:', e);
        }
      }
    }

    console.log('[CORRECTION] Total modifications applied:', modificationsApplied);

    if (!newPolygon) {
      return { success: false, message: 'שגיאה בעדכון הפוליגון' };
    }

    if (modificationsApplied === 0) {
      return { success: false, message: 'לא בוצעו שינויים בפוליגון - ודא שהקו חוצה את גבול הפוליגון' };
    }

    // Check if polygon actually changed
    const changed = !equalsOperator.execute(wuPolygon, newPolygon);
    console.log('[CORRECTION] Polygon changed:', changed);

    // Find partial stands
    const { partialStandIds, standsListAffectedByReshapeLine } = await findPartialStands(wuPolygon, newPolygon, addedPockets, removedPockets);
    console.log('[CORRECTION] addedPockets:', addedPockets.length, 'removedPockets:', removedPockets.length);
    console.log('[CORRECTION] standsListAffectedByReshapeLine:', standsListAffectedByReshapeLine.map(s => `${s.compartmentNum}/${s.standNum}`));

    console.log('[CORRECTION] ========== applyCorrectionLine END (OPEN POLYLINE) ==========');

    // Determine operation type based on which pockets exist
    const operationType: 'add' | 'remove' = removedPockets.length > 0 ? 'remove' : 'add';

    return {
      success: true,
      message: 'גבול יחידת העבודה עודכן',
      newPolygon,
      partialStandIds,
      standsListAffectedByReshapeLine,
      addedSegmentPaths,
      removedSegmentPaths,
      addedPockets,
      removedPockets,
      operationType
    };
  };

  // CORRECTION LINE/POLYGON - HELPER FUNCTIONS - top

  /**
   * Calculate distance from point to line segment
   */
  const pointToSegmentDistance = (
    point: number[],
    segStart: number[],
    segEnd: number[]
  ): number => {
    const dx = segEnd[0] - segStart[0];
    const dy = segEnd[1] - segStart[1];
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return Math.sqrt(
        Math.pow(point[0] - segStart[0], 2) +
        Math.pow(point[1] - segStart[1], 2)
      );
    }

    let t = ((point[0] - segStart[0]) * dx + (point[1] - segStart[1]) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = segStart[0] + t * dx;
    const projY = segStart[1] + t * dy;

    return Math.sqrt(
      Math.pow(point[0] - projX, 2) +
      Math.pow(point[1] - projY, 2)
    );
  };

  /**
   * Find which edge (by index) contains a point
   * Returns the index of the first vertex of the edge, or -1 if not found
   */
  const findEdgeIndex = (
    point: number[],
    ring: number[][],
    tolerance: number = 0.01
  ): number => {
    for (let i = 0; i < ring.length - 1; i++) {
      const dist = pointToSegmentDistance(point, ring[i], ring[i + 1]);
      if (dist <= tolerance) {
        return i;
      }
    }
    return -1;
  };

  /**
   * Find which ring a point is on, and return that ring
   * Works with multipart polygons and holes
   */
  const findRingContainingPoint = (
    point: number[],
    polygon: __esri.Polygon,
    tolerance: number = 0.01
  ): number[][] | null => {
    if (!polygon.rings || polygon.rings.length === 0) return null;

    for (const ring of polygon.rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const dist = pointToSegmentDistance(point, ring[i], ring[i + 1]);
        if (dist <= tolerance) return ring;
      }
    }

    return null;
  };

  /**
   * Check if a point is on (or very close to) ANY polygon boundary
   * Works with multipart polygons and holes
   */
  const isPointOnBoundary = (
    point: number[],
    polygon: __esri.Polygon,
    tolerance: number = 0.01
  ): boolean => {
    return findRingContainingPoint(point, polygon, tolerance) !== null;
  };

  /**
   * Check if user drew a closed polygon (first point ≈ last point)
   */
  const isClosedPolygon = (line: __esri.Polyline, tolerance: number = 5): boolean => {
    if (!line.paths || line.paths.length === 0) return false;

    const path = line.paths[0];
    if (path.length < 3) return false;

    const first = path[0];
    const last = path[path.length - 1];

    const dist = Math.sqrt(
      Math.pow(first[0] - last[0], 2) +
      Math.pow(first[1] - last[1], 2)
    );

    return dist <= tolerance;
  };

  /**
   * Convert polyline to polygon (for closed shapes)
   */
  const polylineToPolygon = (line: __esri.Polyline): __esri.Polygon => {
    return new Polygon({
      rings: line.paths,
      spatialReference: line.spatialReference
    });
  };

  /**
   * Calculate centroid of a polygon
   */
  const getPolygonCentroid = (polygon: __esri.Polygon): number[] => {
    const ring = polygon.rings[0];
    let sumX = 0, sumY = 0;
    const n = ring.length - 1; // exclude closing point
    for (let i = 0; i < n; i++) {
      sumX += ring[i][0];
      sumY += ring[i][1];
    }
    return [sumX / n, sumY / n];
  };

  /**
   * Calculate total length of a path
   */
  const pathLength = (path: number[][]): number => {
    let len = 0;
    for (let i = 1; i < path.length; i++) {
      len += Math.sqrt(
        Math.pow(path[i][0] - path[i - 1][0], 2) +
        Math.pow(path[i][1] - path[i - 1][1], 2)
      );
    }
    return len;
  };

  /**
   * Find BOTH paths along polygon boundary between two points
   * Works with multipart polygons - finds the correct ring first
   */
  const findBoundaryPathsBoth = (
    polygon: __esri.Polygon,
    startPoint: number[],
    endPoint: number[]
  ): { path1: number[][]; path2: number[][] } | null => {
    if (!polygon.rings || polygon.rings.length === 0) return null;

    const tolerance = 0.01;  // Just for floating-point precision

    // Find which ring contains the start point
    const ring: number[][] | null = findRingContainingPoint(startPoint, polygon, tolerance);
    if (!ring) {
      console.log('[CORRECTION] Start point not on any ring');
      return null;
    }

    // Find which EDGE contains each point
    const startEdgeIdx = findEdgeIndex(startPoint, ring, tolerance);
    const endEdgeIdx = findEdgeIndex(endPoint, ring, tolerance);

    if (startEdgeIdx === -1) {
      console.log('[CORRECTION] Start point not on any edge');
      return null;
    }

    if (endEdgeIdx === -1) {
      console.log('[CORRECTION] End point not on any edge (may be on different ring)');
      return null;
    }

    console.log('[CORRECTION] Found edge indices: startEdge=', startEdgeIdx, 'endEdge=', endEdgeIdx);

    const ringLen = ring.length - 1; // Exclude closing point

    // Special case: both points on the SAME edge
    if (startEdgeIdx === endEdgeIdx) {
      console.log('[CORRECTION] Same edge case - creating direct and around-the-ring paths');

      // Path 1: Direct segment on the edge (short path)
      const path1: number[][] = [];
      path1.push([...endPoint]);
      path1.push([...startPoint]);

      // Path 2: All the way around the ring (long path)
      const path2: number[][] = [];
      path2.push([...endPoint]);

      // Add next vertex after endPoint's edge, then continue around
      let i = (endEdgeIdx + 1) % ringLen;
      for (let safety = 0; safety < ringLen; safety++) {
        path2.push([...ring[i]]);
        i = (i + 1) % ringLen;
        if (i === (startEdgeIdx + 1) % ringLen) break; // Back to start edge's end vertex
      }
      path2.push([...startPoint]);

      console.log('[CORRECTION] Same edge - Path1 points:', path1.length, 'Path2 points:', path2.length);
      return { path1, path2 };
    }

    // Normal case: points on different edges
    // Path 1: from endPoint to startPoint going FORWARD along ring
    // Start at endPoint, go to next vertex, continue to startPoint
    const path1: number[][] = [];
    path1.push([...endPoint]);  // Start exactly at endPoint

    let i = (endEdgeIdx + 1) % ringLen;  // First vertex after endPoint
    let safety = 0;

    // Walk forward until we pass startEdgeIdx
    while (safety < ringLen + 1) {
      path1.push([...ring[i]]);
      if (i === startEdgeIdx) {
        // We've reached the edge containing startPoint
        path1.push([...startPoint]);  // End exactly at startPoint
        break;
      }
      i = (i + 1) % ringLen;
      safety++;
    }

    // Path 2: from endPoint to startPoint going BACKWARD along ring
    const path2: number[][] = [];
    path2.push([...endPoint]);  // Start exactly at endPoint

    i = endEdgeIdx;  // Start at beginning of edge containing endPoint
    safety = 0;

    // Walk backward until we pass startEdgeIdx
    while (safety < ringLen + 1) {
      path2.push([...ring[i]]);
      if (i === (startEdgeIdx + 1) % ringLen) {
        // We've reached the vertex after startPoint's edge
        path2.push([...startPoint]);  // End exactly at startPoint
        break;
      }
      i = (i - 1 + ringLen) % ringLen;
      safety++;
    }

    console.log('[CORRECTION] Path1 points:', path1.length, 'Path2 points:', path2.length);

    return { path1, path2 };
  };

  /**
   * Create a closed polygon from a line path and a specific boundary path
   */
  const createPocketFromPaths = (
    linePath: number[][],
    boundaryPath: number[][],
    wkid: number = 2039
  ): __esri.Polygon | null => {
    if (linePath.length < 2 || boundaryPath.length < 2) return null;

    const closedRing = [...linePath];

    for (let i = 1; i < boundaryPath.length; i++) {
      closedRing.push(boundaryPath[i]);
    }

    const first = closedRing[0];
    const last = closedRing[closedRing.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      closedRing.push([...first]);
    }

    if (closedRing.length < 4) {
      console.log('[CORRECTION] Invalid pocket: too few points', closedRing.length);
      return null;
    }

    return new Polygon({
      rings: [closedRing],
      spatialReference: { wkid }
    });
  };

  /**
   * Calculate signed area of a ring using the shoelace formula.
   * Positive = CCW (counter-clockwise) = interior on LEFT
   * Negative = CW (clockwise) = interior on RIGHT
   */
  const getSignedArea = (ring: number[][]): number => {
    if (ring.length < 3) return 0;

    let area = 0;
    const n = ring.length;

    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += ring[i][0] * ring[j][1];
      area -= ring[j][0] * ring[i][1];
    }

    return area / 2;
  };

  /**
 * Union multiple geometries using unionOperator
 * (unionOperator.execute only takes 2 geometries at a time)
 */
  const unionMultipleGeometries = (geometries: __esri.Geometry[]): __esri.Polygon | null => {
    if (geometries.length === 0) return null;
    if (geometries.length === 1) return geometries[0] as __esri.Polygon;

    let result: __esri.Geometry = geometries[0];
    for (let i = 1; i < geometries.length; i++) {
      const unionResult = unionOperator.execute(result as __esri.Polygon, geometries[i] as __esri.Polygon);
      if (!unionResult) {
        console.warn('[UNION] Failed to union geometry at index', i);
        return null;
      }
      result = unionResult as __esri.Geometry;
    }
    return result as __esri.Polygon;
  };

  /**
   * For an OUTSIDE segment, find which pocket is truly outside the polygon,
   * and determine if it's on LEFT or RIGHT of the segment direction.
   * 
   * Uses signed area: CCW (positive) = LEFT, CW (negative) = RIGHT
   */
  const findOutsidePocketAndSide = (
    segmentPath: number[][],
    pocket1: __esri.Polygon,
    pocket2: __esri.Polygon,
    originalPolygon: __esri.Polygon
  ): { outsideSide: 'left' | 'right'; pocket: __esri.Polygon } | null => {
    // Simple rule: the smaller pocket is ALWAYS the correct "outside" pocket
    // Because: pocket2 (fake) = original polygon + pocket1 (true)
    // So pocket1 < pocket2 always

    const area1 = Math.abs(areaOperator.execute(pocket1));
    const area2 = Math.abs(areaOperator.execute(pocket2));

    console.log('[CORRECTION] Pocket1 area:', area1.toFixed(1));
    console.log('[CORRECTION] Pocket2 area:', area2.toFixed(1));

    const outsidePocket = area1 < area2 ? pocket1 : pocket2;
    console.log('[CORRECTION] Selected', area1 < area2 ? 'pocket1' : 'pocket2', 'as outside pocket (smaller area)');

    if (!outsidePocket?.rings?.[0]) return null;

    const signedArea = getSignedArea(outsidePocket.rings[0]);
    const outsideSide: 'left' | 'right' = signedArea > 0 ? 'left' : 'right';

    console.log('[CORRECTION] Outside pocket signed area:', signedArea.toFixed(1));
    console.log('[CORRECTION] Outside side determined:', outsideSide);

    return { outsideSide, pocket: outsidePocket };
  };

  /**
   * Check if a stand is only partially inside a geometry
   */
  const isStandPartialInGeometry = (stand: Stand, geometry: __esri.Polygon): boolean => {
    if (!stand.geometry) return false;

    const fullyContained = containsOperator.execute(geometry, stand.geometry);
    if (fullyContained) return false;

    const intersects = intersectsOperator.execute(geometry, stand.geometry);
    return intersects;
  };

  /**
   * Check if a point is DEFINITELY outside the polygon
   * For multipart polygons, uses geometry operators which handle this correctly
   */
  const isDefinitelyOutside = (
    point: number[],
    polygon: __esri.Polygon
  ): boolean => {
    if (!polygon.rings || polygon.rings.length === 0) return false;

    // Create proper Point geometry object
    const pointGeom = new Point({
      x: point[0],
      y: point[1],
      spatialReference: polygon.spatialReference
    });

    // containsOperator returns true only for points in SOLID area
    const isInSolidArea = containsOperator.execute(polygon, pointGeom);

    // Not in solid area = definitely outside (or in a hole, but geometry operators classify that as "outside")
    return !isInSolidArea;
  };

  /**
   * Check if user polygon contains any hole from work unit
   * A hole is a ring with negative area (counter-clockwise winding in ArcGIS)
   */
  const checkIfUserPolygonContainsHole = (
    userPolygon: __esri.Polygon,
    workUnit: __esri.Polygon
  ): boolean => {
    for (const ring of workUnit.rings) {
      // Create proper Polygon geometry object
      const ringPolygon = new Polygon({
        rings: [ring],
        spatialReference: workUnit.spatialReference
      });

      const ringArea = areaOperator.execute(ringPolygon);

      // Skip exterior rings (positive area)
      if (ringArea > 0) continue;

      // This is a hole (negative area) - check if user polygon contains it
      const holePoint = new Point({
        x: ring[0][0],
        y: ring[0][1],
        spatialReference: workUnit.spatialReference
      });

      if (containsOperator.execute(userPolygon, holePoint)) {
        console.log('[CORRECTION] User polygon contains a hole');
        return true;
      }
    }

    return false;
  };

  /**
   * Analyze drawn polygon position relative to work unit
   * Returns simple classification for the 3 cases:
   * - empty_area: No intersection (outside or inside hole) → AUTO UNION
   * - wholly_inside: Fully inside solid, no holes involved → AUTO DIFFERENCE
   * - ambiguous: Crosses boundary, intersects hole, or contains hole → ASK USER
   */
  const analyzeDrawnPolygon = (
    drawnPolygon: __esri.Polygon,
    workUnit: __esri.Polygon
  ): {
    type: 'empty_area' | 'wholly_inside' | 'ambiguous';
  } => {
    // Calculate intersection with solid area
    const intersection = intersectionOperator.execute(drawnPolygon, workUnit) as __esri.Polygon;
    let intersectionArea = 0;
    if (intersection) {
      try {
        intersectionArea = Math.abs(areaOperator.execute(intersection));
      } catch (e) { /* ignore */ }
    }

    const drawnArea = Math.abs(areaOperator.execute(drawnPolygon));

    console.log('[CORRECTION] Drawn area:', drawnArea.toFixed(1), 'Intersection area:', intersectionArea.toFixed(1));

    // Case 1: No intersection with solid area
    // This includes:
    // - Completely outside all exterior rings
    // - Completely inside a hole (adding an island)
    if (intersectionArea < 1) {
      console.log('[CORRECTION] Case: Empty area / Inside hole → AUTO UNION');
      return { type: 'empty_area' };
    }

    // Check if fully contained in work unit solid area
    const containedInWorkUnit = containsOperator.execute(workUnit, drawnPolygon);

    if (containedInWorkUnit) {
      // Check if user polygon CONTAINS any hole from work unit
      // If yes → AMBIGUOUS (ask user)
      // If no → AUTO DIFFERENCE (cut new hole)

      const containsHole = checkIfUserPolygonContainsHole(drawnPolygon, workUnit);

      if (containsHole) {
        console.log('[CORRECTION] Case: Inside solid but contains a hole → ASK USER');
        return { type: 'ambiguous' };
      } else {
        console.log('[CORRECTION] Case: Wholly inside solid, no holes involved → AUTO DIFFERENCE');
        return { type: 'wholly_inside' };
      }
    }

    // Everything else: crosses boundary or intersects hole
    console.log('[CORRECTION] Case: Crosses boundary or intersects hole → ASK USER');
    return { type: 'ambiguous' };
  };

  /**
   * Helper to find partial stands after correction
   */
  const findPartialStands = async (
    oldPolygon: __esri.Polygon,
    newPolygon: __esri.Polygon,
    addedPockets?: __esri.Polygon[],
    removedPockets?: __esri.Polygon[]
  ): Promise<{
    partialStandIds: Set<string>;
    standsListAffectedByReshapeLine: Stand[];
  }> => {
    const partialStandIds = new Set<string>();
    const standsListAffectedByReshapeLine: Stand[] = [];

    if (layers.stands && data.selectedForest) {
      // Use provided pockets directly (no difference calculation needed)
      let addedArea: __esri.Polygon | null = null;

      if (addedPockets && addedPockets.length > 0) {
        // Union all added pockets together if multiple
        addedArea = addedPockets[0];
        for (let i = 1; i < addedPockets.length; i++) {
          const result = unionOperator.execute(addedArea, addedPockets[i]);
          if (result) {
            addedArea = result as __esri.Polygon;
          }
        }
        console.log('[CORRECTION] Using provided pocket(s), area:', Math.abs(areaOperator.execute(addedArea)).toFixed(1));
      }

      // Use compartment+stand key instead of objectId (cache may have stale IDs)
      const existingKeys = new Set([
        ...data.workUnitStands.map(s => `${s.compartmentNum}-${s.standNum}`),
        ...data.standsToAdd.map(s => `${s.compartmentNum}-${s.standNum}`)
      ]);
      console.log('[CORRECTION] Existing stand IDs:', Array.from(existingKeys));

      if (addedArea) {
        try {
          const addedStands = await findStandsInGeometry(addedArea, data.selectedForest.forestNum);
          console.log('[CORRECTION] Stands found in pocket:', addedStands.map(s => `${s.compartmentNum}-${s.standNum}`));

          for (const stand of addedStands) {
            const isPartial = isStandPartialInGeometry(stand, newPolygon);
            if (isPartial) {
              partialStandIds.add(`${stand.compartmentNum}-${stand.standNum}`);
            }

            const standKey = `${stand.compartmentNum}-${stand.standNum}`;
            const isExisting = existingKeys.has(standKey);
            console.log('[CORRECTION] Stand', `${stand.compartmentNum}/${stand.standNum}`, 'key:', standKey, 'isExisting:', isExisting, 'isPartial:', isPartial);

            // Include if: new stand OR existing stand that is becoming partial
            if (!isExisting || isPartial) {
              standsListAffectedByReshapeLine.push({ ...stand, isPartial });
            }
          }
        } catch (e) {
          console.error('[CORRECTION] Error finding stands in added area:', e);
        }

        // When adding area, also check existing partial stands that might become whole
        // These are stands already in workUnitStands that were partial but now become whole
        for (const stand of data.workUnitStands) {
          if (!stand.isPartial || !stand.geometry) continue;
          const standKey = `${stand.compartmentNum}-${stand.standNum}`;
          // Skip if already processed (found in added pocket)
          if (standsListAffectedByReshapeLine.some(s => `${s.compartmentNum}-${s.standNum}` === standKey)) continue;

          const isStillPartial = isStandPartialInGeometry(stand, newPolygon);
          if (!isStillPartial) {
            // Stand was partial but is now whole - include in draft to show it's being restored
            standsListAffectedByReshapeLine.push({ ...stand, isPartial: false });
            console.log('[CORRECTION] Existing partial stand becoming whole:', standKey);
          } else if (intersectsOperator.execute(stand.geometry, addedArea)) {
            // Stand is still partial but intersects added area (coverage changed)
            partialStandIds.add(standKey);
            standsListAffectedByReshapeLine.push({ ...stand, isPartial: true });
            console.log('[CORRECTION] Existing partial stand coverage changed:', standKey);
          }
        }
      }

      // Handle removed pockets - find stands affected by removal
      if (removedPockets && removedPockets.length > 0) {
        let removedArea: __esri.Polygon = removedPockets[0];
        for (let i = 1; i < removedPockets.length; i++) {
          const result = unionOperator.execute(removedArea, removedPockets[i]);
          if (result) {
            removedArea = result as __esri.Polygon;
          }
        }
        console.log('[CORRECTION] Using removed pocket(s), area:', Math.abs(areaOperator.execute(removedArea)).toFixed(1));

        try {
          const affectedStands = await findStandsInGeometry(removedArea, data.selectedForest.forestNum);
          console.log('[CORRECTION] Stands found in removed pocket:', affectedStands.map(s => `${s.compartmentNum}/${s.standNum}`));

          for (const stand of affectedStands) {
            const standKey = `${stand.compartmentNum}-${stand.standNum}`;
            const isExisting = existingKeys.has(standKey);
            const isPartial = isStandPartialInGeometry(stand, newPolygon);

            console.log('[CORRECTION] Removed area - Stand', `${stand.compartmentNum}/${stand.standNum}`, 'isExisting:', isExisting, 'isPartial:', isPartial);

            // Show existing stands that become partial due to removal
            if (isExisting) {
              if (isPartial) {
                // Stand becomes partial due to removal
                partialStandIds.add(`${stand.compartmentNum}-${stand.standNum}`);
                standsListAffectedByReshapeLine.push({ ...stand, isPartial: true });
              } else {
                // Stand is wholly removed - mark for complete removal
                // Add to standsListAffectedByReshapeLine with isRemoved flag for display
                standsListAffectedByReshapeLine.push({ ...stand, isPartial: false, isRemoved: true });
                console.log('[CORRECTION] Stand', `${stand.compartmentNum}/${stand.standNum}`, 'marked for complete removal');
              }
            }
          }
        } catch (e) {
          console.error('[CORRECTION] Error finding stands in removed area:', e);
        }
      }
    }

    const allCurrentStands = [...data.workUnitStands, ...data.standsToAdd];
    for (const stand of allCurrentStands) {
      if (!stand.geometry) continue;
      if (isStandPartialInGeometry(stand, newPolygon)) {
        partialStandIds.add(`${stand.compartmentNum}-${stand.standNum}`);
        console.log('[CORRECTION] Stand', stand.standNum, 'marked as partial');
      }
    }

    return { partialStandIds, standsListAffectedByReshapeLine };
  };

  // CORRECTION LINE/POLYGON - HELPER FUNCTIONS - end

  // Handle correction drawing complete - functions - top

  // Handle correction drawing complete - functions - end


  /**
 * Determine which pocket is on the specified side of the line
 * Returns pocket1 or pocket2
 */
  const getPocketOnSide = (
    linePath: number[][],
    pocket1: __esri.Polygon | null,
    pocket2: __esri.Polygon | null,
    side: 'left' | 'right'
  ): __esri.Polygon | null => {
    if (!pocket1 && !pocket2) return null;
    if (!pocket1) return side === 'right' ? pocket2 : null;
    if (!pocket2) return side === 'left' ? pocket1 : null;

    // Line direction
    const startPt = linePath[0];
    const endPt = linePath[linePath.length - 1];
    const dirX = endPt[0] - startPt[0];
    const dirY = endPt[1] - startPt[1];

    // Get centroids
    const centroid1 = getPolygonCentroid(pocket1);
    const centroid2 = getPolygonCentroid(pocket2);

    // Line midpoint
    const midPt = [(startPt[0] + endPt[0]) / 2, (startPt[1] + endPt[1]) / 2];

    // Vector from line midpoint to pocket1 centroid
    const toP1X = centroid1[0] - midPt[0];
    const toP1Y = centroid1[1] - midPt[1];

    // Cross product: dir × toP1
    const cross1 = dirX * toP1Y - dirY * toP1X;

    // cross > 0 means pocket1 is on LEFT
    // cross < 0 means pocket1 is on RIGHT
    const pocket1Side = cross1 > 0 ? 'left' : 'right';

    if (pocket1Side === side) {
      return pocket1;
    } else {
      return pocket2;
    }
  };

  /**
   * Check if polygon A is completely inside the exterior ring of polygon B
   * (ignoring holes)
   */
  const isCompletelyInsideExterior = (
    inner: __esri.Polygon,
    outer: __esri.Polygon
  ): boolean => {
    // Create polygon with only exterior ring
    const exteriorOnly = new Polygon({
      rings: [outer.rings[0]],
      spatialReference: outer.spatialReference
    });

    return containsOperator.execute(exteriorOnly, inner);
  };

  /**
   * Check if polygon A is completely outside polygon B
   * (no intersection at all, OR only intersects holes)
   */
  const isCompletelyOutside = (
    testPolygon: __esri.Polygon,
    workUnit: __esri.Polygon
  ): boolean => {
    // Check if there's any intersection
    const intersection = intersectionOperator.execute(testPolygon, workUnit);

    // If no intersection, it's completely outside
    if (!intersection) return true;

    // If intersection exists but has zero area, it's just touching
    try {
      const area = Math.abs(areaOperator.execute(intersection as __esri.Polygon));
      if (area < 1) return true; // Less than 1 sq meter = just touching
    } catch (e) {
      return true;
    }

    return false;
  };

  /**
   * Convert polygon boundary to polyline
   */
  const polygonToPolyline = (polygon: __esri.Polygon): __esri.Polyline | null => {
    if (!polygon.rings || polygon.rings.length === 0) return null;

    return new Polyline({
      paths: polygon.rings,
      spatialReference: polygon.spatialReference
    });
  };

  /**
   * Extract points from intersection geometry
   */
  const extractPoints = (geom: __esri.Geometry): __esri.Point[] => {
    const points: __esri.Point[] = [];

    if (geom.type === 'point') {
      points.push(geom as __esri.Point);
    } else if (geom.type === 'multipoint') {
      const mp = geom as __esri.Multipoint;
      for (const coord of mp.points) {
        points.push(new Point({
          x: coord[0],
          y: coord[1],
          spatialReference: mp.spatialReference
        }));
      }
    } else if (geom.type === 'polyline') {
      // Line intersection - get endpoints
      const pl = geom as __esri.Polyline;
      for (const path of pl.paths) {
        if (path.length > 0) {
          points.push(new Point({
            x: path[0][0],
            y: path[0][1],
            spatialReference: pl.spatialReference
          }));
          if (path.length > 1) {
            points.push(new Point({
              x: path[path.length - 1][0],
              y: path[path.length - 1][1],
              spatialReference: pl.spatialReference
            }));
          }
        }
      }
    }

    return points;
  };

  /**
   * Sort points by their position along a line
   */
  const sortPointsAlongLine = (points: __esri.Point[], line: __esri.Polyline): __esri.Point[] => {
    if (!line.paths || line.paths.length === 0 || line.paths[0].length === 0) return points;

    const path = line.paths[0];
    const startX = path[0][0];
    const startY = path[0][1];

    // Calculate distance from line start for each point
    const pointsWithDist = points.map(p => ({
      point: p,
      dist: Math.sqrt(Math.pow(p.x - startX, 2) + Math.pow(p.y - startY, 2))
    }));

    // Sort by distance
    pointsWithDist.sort((a, b) => a.dist - b.dist);

    return pointsWithDist.map(pd => pd.point);
  };

  /**
   * Create a line segment between two points, following the original line path
   */
  const createSegmentBetweenPoints = (
    line: __esri.Polyline,
    startPoint: __esri.Point,
    endPoint: __esri.Point
  ): __esri.Polyline | null => {
    if (!line.paths || line.paths.length === 0) return null;

    const path = line.paths[0];
    const segmentPath: number[][] = [];
    let capturing = false;
    const tolerance = 1; // meters tolerance for point matching

    for (let i = 0; i < path.length; i++) {
      const x = path[i][0];
      const y = path[i][1];

      const distToStart = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
      const distToEnd = Math.sqrt(Math.pow(x - endPoint.x, 2) + Math.pow(y - endPoint.y, 2));

      if (!capturing && distToStart < tolerance) {
        capturing = true;
        segmentPath.push([startPoint.x, startPoint.y]);
      }

      if (capturing) {
        segmentPath.push([x, y]);

        if (distToEnd < tolerance) {
          segmentPath.push([endPoint.x, endPoint.y]);
          break;
        }
      }
    }

    // If we didn't capture properly, just create a direct line
    if (segmentPath.length < 2) {
      return new Polyline({
        paths: [[[startPoint.x, startPoint.y], [endPoint.x, endPoint.y]]],
        spatialReference: line.spatialReference
      });
    }

    return new Polyline({
      paths: [segmentPath],
      spatialReference: line.spatialReference
    });
  };

  /**
   * Get midpoint of a line segment
   */
  const getSegmentMidpoint = (segment: __esri.Polyline): __esri.Point => {
    const path = segment.paths[0];
    const midIndex = Math.floor(path.length / 2);

    return new Point({
      x: path[midIndex][0],
      y: path[midIndex][1],
      spatialReference: segment.spatialReference
    });
  };

  /**
   * Find stands that intersect a geometry
   */
  const findStandsInGeometry = async (
    geometry: __esri.Geometry,
    forestNum: number
  ): Promise<Stand[]> => {
    if (!layers.stands) return [];

    const fields = LAYERS_CONFIG.stands.fields;
    const query = layers.stands.createQuery();
    query.geometry = geometry;
    query.spatialRelationship = 'intersects';
    query.where = `${fields.forestNum.name} = ${forestNum}`;
    query.outFields = [
      layers.stands.objectIdField,
      fields.forestNum.name,
      fields.forestName.name,
      fields.compartmentNum.name,
      fields.standNum.name
    ];
    query.returnGeometry = true;

    const result = await layers.stands.queryFeatures(query);

    return result.features.map(f => ({
      objectId: Number(f.getObjectId()),
      forestNum: f.attributes[fields.forestNum.name],
      forestName: f.attributes[fields.forestName.name],
      compartmentNum: f.attributes[fields.compartmentNum.name],
      standNum: f.attributes[fields.standNum.name],
      geometry: f.geometry
    }));
  };

  /**
   * Confirm removal - remove whole stands from workUnitStands and standsToAdd
   */
  const commitWholeStandsRemove = () => {
    if (data.standsToRemove.length === 0) return;

    const removeKeys = new Set(data.standsToRemove.map(s => `${s.compartmentNum}-${s.standNum}`));
    const count = data.standsToRemove.length;

    console.log('[REMOVE] Confirming removal of', count, 'stands');

    setData(prev => {
      const newWorkUnitStands = prev.workUnitStands.filter(s => !removeKeys.has(`${s.compartmentNum}-${s.standNum}`));
      const newStandsToAdd = prev.standsToAdd.filter(s => !removeKeys.has(`${s.compartmentNum}-${s.standNum}`));

      // If all stands removed, clear forest
      const newForest = (newWorkUnitStands.length === 0 && newStandsToAdd.length === 0)
        ? null
        : prev.selectedForest;

      // Update wuPolygonFinal by removing standsToRemove geometries
      let newPolygon = prev.wuPolygonFinal;
      if (newPolygon) {
        for (const stand of prev.standsToRemove) {
          if (stand.geometry) {
            const result = differenceOperator.execute(newPolygon, stand.geometry);
            if (result) newPolygon = result as __esri.Polygon;
          }
        }
      }
      // If all stands removed, clear polygon too
      if (newWorkUnitStands.length === 0 && newStandsToAdd.length === 0) {
        newPolygon = null;
      }

      return {
        ...prev,
        workUnitStands: newWorkUnitStands,
        standsToAdd: newStandsToAdd,
        standsToRemove: [],
        selectedForest: newForest,
        wuPolygonFinal: newPolygon,
        lastMessageType: null, lastMessage: `${count} עומדים שלמים הוסרו`
      };
    });
  };

  /**
   * Cancel removal
   */
  const cancelRemoval = () => {
    console.log('[REMOVE] Canceling removal');
    setData(prev => ({
      ...prev,
      standsToRemove: [],
      lastMessageType: null, lastMessage: 'ההסרה בוטלה'
    }));
  };

  /**
   * Save work unit to server (create or update)
   */
  const saveWorkUnit = async () => {
    if (!data.selectedForest || data.workUnitStands.length === 0) {
      console.log('[SAVE] Cannot save - no forest or no stands');
      return;
    }

    if (!layers.workUnits) {
      console.error('[SAVE] Work units layer not available');
      setData(prev => ({ ...prev, errorMessage: 'שכבת יחידות העבודה לא זמינה' }));
      return;
    }

    const isEditMode = !!data.editingWorkUnit;
    console.log('[SAVE] Saving work unit...', isEditMode ? '(edit mode)' : '(create mode)');

    setData(prev => ({
      ...prev,
      isLoading: true,
      loadingMessage: translate('savingToServer')
    }));

    try {
      if (isEditMode) {
        // === UPDATE existing work unit ===
        const result = await updateWorkUnit(
          layers.workUnits,
          data.editingWorkUnit.objectId,
          data.selectedForest.forestNum,
          data.selectedForest.forestName,
          data.workUnitStands,
          data.editingWorkUnit.workUnitId,
          data.wuPolygonFinal
        );

        if (result.success) {
          console.log('[SAVE] Work unit updated successfully');

          // Stop heartbeat BEFORE releasing lock to prevent race condition
          if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
            console.log('[LOCK] Heartbeat stopped before lock release');
          }

          // Release lock
          await releaseLock(layers.workUnits, data.editingWorkUnit.objectId);
          lastLockedTimeRef.current = 0;

          // Clear localStorage lock entry
          try {
            localStorage.removeItem(`defineWorkUnit_lock_${data.editingWorkUnit.objectId}`);
          } catch (e) { /* ignore */ }

          setData(prev => ({
            ...prev,
            isLoading: false,
            loadingMessage: ''
          }));

          alert(`י"ע ${data.editingWorkUnit.workUnitId} עודכנה בהצלחה`);
          resetToInit();
        } else {
          console.error('[SAVE] Failed to update:', result.error);
          setData(prev => ({
            ...prev,
            isLoading: false,
            loadingMessage: '',
            errorMessage: `שגיאה בעדכון: ${result.error}`
          }));
        }

      } else {
        // === CREATE new work unit ===
        // Load or use cached work units index
        let workUnitsIndex = workUnitsIndexRef.current;

        if (!workUnitsIndex) {
          console.log('[SAVE] Loading work units index...');
          setData(prev => ({ ...prev, loadingMessage: 'טוען רשימת יחידות עבודה...' }));
          workUnitsIndex = await queryWorkUnitsIndex(layers.workUnits);
          workUnitsIndexRef.current = workUnitsIndex;

          // Save to localStorage
          try {
            localStorage.setItem('defineWorkUnit_workUnitsIndex', JSON.stringify(workUnitsIndex));
            localStorage.setItem('defineWorkUnit_workUnitsIndex_timestamp', Date.now().toString());
            console.log('[SAVE] Work units index saved to localStorage');
          } catch (e) {
            console.warn('[SAVE] Error saving to localStorage:', e);
          }
        }

        // Generate work unit ID
        const workUnitId = generateWorkUnitId(workUnitsIndex, data.selectedForest.forestNum);

        setData(prev => ({ ...prev, loadingMessage: translate('savingToServer') }));

        const result = await createWorkUnit(
          layers.workUnits,
          data.selectedForest.forestNum,
          data.selectedForest.forestName,
          data.workUnitStands,
          workUnitId,
          data.wuPolygonFinal
        );

        if (result.success) {
          console.log('[SAVE] Work unit saved successfully, objectId:', result.objectId);

          // Update cache with new work unit
          workUnitsIndexRef.current = [
            ...workUnitsIndex,
            {
              workUnitId: workUnitId,
              status: 'בהכנה',
              forestNum: String(data.selectedForest.forestNum)
            }
          ];

          // Update localStorage
          try {
            localStorage.setItem('defineWorkUnit_workUnitsIndex', JSON.stringify(workUnitsIndexRef.current));
          } catch (e) {
            console.warn('[SAVE] Error updating localStorage:', e);
          }

          setData(prev => ({
            ...prev,
            isLoading: false,
            loadingMessage: ''
          }));

          alert(`י"ע ${workUnitId} נוצרה בהצלחה`);
          resetToInit();
        } else {
          console.error('[SAVE] Failed to save:', result.error);
          setData(prev => ({
            ...prev,
            isLoading: false,
            loadingMessage: '',
            errorMessage: `שגיאה בשמירה: ${result.error}`
          }));
        }
      }
    } catch (error) {
      console.error('[SAVE] Exception:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        loadingMessage: '',
        errorMessage: `שגיאה בשמירה: ${error}`
      }));
    }
  };

  /**
   * Delete current work unit (edit mode only)
   */
  const deleteCurrentWorkUnit = async () => {
    if (!data.editingWorkUnit) {
      console.log('[DELETE] No work unit selected for deletion');
      return;
    }

    if (!layers.workUnits) {
      console.error('[DELETE] Work units layer not available');
      setData(prev => ({ ...prev, errorMessage: 'שכבת יחידות העבודה לא זמינה' }));
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      `${translate('confirmDeleteWorkUnit')}\n\n${data.editingWorkUnit.workUnitId}`
    );

    if (!confirmed) {
      console.log('[DELETE] User cancelled deletion');
      return;
    }

    console.log('[DELETE] ==========================================');
    console.log('[DELETE] User confirmed deletion');
    console.log('[DELETE] workUnitId:', data.editingWorkUnit.workUnitId);
    console.log('[DELETE] objectId:', data.editingWorkUnit.objectId);
    console.log('[DELETE] ==========================================');

    setData(prev => ({
      ...prev,
      isLoading: true,
      loadingMessage: translate('deletingWorkUnit')
    }));

    try {
      const result = await deleteWorkUnit(
        layers.workUnits,
        data.editingWorkUnit.objectId,
        data.editingWorkUnit.workUnitId
      );

      if (result.success) {
        console.log('[DELETE] ✓ DELETE successful for:', data.editingWorkUnit.workUnitId);

        setData(prev => ({
          ...prev,
          isLoading: false,
          loadingMessage: '',
          lastMessageType: null,
          lastMessage: `יחידת עבודה ${data.editingWorkUnit.workUnitId} נמחקה בהצלחה`
        }));

        // Reset after short delay to show success message
        setTimeout(() => {
          resetToInit();
        }, 1500);
      } else {
        console.error('[DELETE] ✗ DELETE failed:', result.error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          loadingMessage: '',
          errorMessage: `שגיאה במחיקה: ${result.error}`
        }));
      }
    } catch (error) {
      console.error('[DELETE] ✗ Exception:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        loadingMessage: '',
        errorMessage: `שגיאה במחיקה: ${error}`
      }));
    }
  };

  /**
   * Load forests from memory cache, localStorage, or server
   */
  const loadForestsFromCacheOrStorage = async () => {
    const STORAGE_KEY = 'defineWorkUnit_forests';

    // 1. Check memory cache first
    if (forestsCacheRef.current) {
      console.log('[LIST] Using memory cached forests:', forestsCacheRef.current.length);
      setData(prev => ({
        ...prev,
        availableForests: forestsCacheRef.current
      }));
      return;
    }

    // 2. Check localStorage (no expiration - data is fixed)
    try {
      const storedForests = localStorage.getItem(STORAGE_KEY);

      if (storedForests) {
        const forests = JSON.parse(storedForests) as Forest[];
        console.log('[LIST] Using localStorage forests:', forests.length);
        forestsCacheRef.current = forests;
        setData(prev => ({
          ...prev,
          availableForests: forests
        }));
        return;
      }
    } catch (error) {
      console.warn('[LIST] Error reading from localStorage:', error);
    }

    // 3. Load from server
    if (!layers.forests) return;

    console.log('[LIST] Loading forests from server');
    setData(prev => ({ ...prev, isLoading: true, loadingMessage: 'טוען יערות...' }));

    try {
      const forests = await queryForests(layers.forests);
      console.log('[LIST] Loaded', forests.length, 'forests from server');

      // Save to memory cache
      forestsCacheRef.current = forests;

      // Save to localStorage (no expiration - data is fixed)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(forests));
        console.log('[LIST] Forests saved to localStorage');
      } catch (storageError) {
        console.warn('[LIST] Error saving to localStorage:', storageError);
      }

      setData(prev => ({
        ...prev,
        availableForests: forests,
        isLoading: false,
        loadingMessage: ''
      }));
    } catch (error) {
      console.error('[LIST] Error loading forests:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        lastMessageType: 'warning', lastMessage: 'שגיאה בטעינת יערות',
      }));
    }
  };

  /**
 * Load forest stands from cache (memory/localStorage) or server
 */
  const loadForestStands = async (forestNum: number): Promise<Stand[]> => {
    const STORAGE_KEY = `defineWorkUnit_forestStands_${forestNum}`;

    // 1. Check memory cache
    if (forestStandsCacheRef.current?.forestNum === forestNum) {
      console.log('[STANDS CACHE] Using memory cache for forest:', forestNum);
      return forestStandsCacheRef.current.stands;
    }

    // 2. Check localStorage (no expiration - data is fixed)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);// localStorege_ read stands

      if (stored) {
        const stands = JSON.parse(stored) as Stand[];

        // Reconstruct geometries as proper Polygon objects
        stands.forEach(s => {
          if (s.geometry && s.geometry.rings) {
            s.geometry = new Polygon({
              rings: s.geometry.rings,
              spatialReference: s.geometry.spatialReference || { wkid: 2039 }
            });
          }
        });

        console.log('[STANDS CACHE] Using localStorage for forest:', forestNum, 'stands:', stands.length);

        // Save to memory cache
        forestStandsCacheRef.current = { forestNum, stands };
        // Return proper Polygon objects
        return stands;
      }
    } catch (e) {
      console.warn('[STANDS CACHE] Error reading localStorage:', e);
    }

    // 3. Load from server
    if (!layers.stands) {
      console.error('[STANDS CACHE] Stands layer not available');
      return [];
    }

    console.log('[STANDS CACHE] Loading from server for forest:', forestNum);
    let stands = await queryStandsByForest(layers.stands, forestNum);

    // Save to memory cache
    forestStandsCacheRef.current = { forestNum, stands };

    // Save to localStorage (if not too large, no expiration - data is fixed)
    try {
      const standsToSave = stands.map(s => ({
        ...s,
        geometry: s.geometry ? {
          type: 'polygon',
          rings: (s.geometry as any).rings,
          spatialReference: (s.geometry as any).spatialReference
        } : null
      }));
      const json = JSON.stringify(standsToSave);
      if (json.length < 4 * 1024 * 1024) { // Max 4MB
        localStorage.setItem(STORAGE_KEY, json);// write stands to localStorage_
        console.log('[STANDS CACHE] Saved to localStorage, size:', (json.length / 1024).toFixed(1), 'KB');
      } else {
        console.log('[STANDS CACHE] Too large for localStorage:', (json.length / 1024 / 1024).toFixed(1), 'MB');
      }
    } catch (e) {
      console.warn('[STANDS CACHE] Error saving to localStorage:', e);
    }

    return stands;
  };

  /**
   * Calculate and display work unit polygon from stands
   */
  const updateWorkUnitPolygon = (stands: Stand[]) => {
    console.log('[WU POLYGON] updateWorkUnitPolygon called with', stands.length, 'stands');

    if (!workUnitPolygonLayerRef.current) {
      console.log('[WU POLYGON] No layer ref!');
      return;
    }

    const beforeCount = workUnitPolygonLayerRef.current.graphics.length;
    workUnitPolygonLayerRef.current.removeAll();
    console.log('[WU POLYGON] Cleared layer (had', beforeCount, 'graphics)');

    if (stands.length === 0) {
      console.log('[WU POLYGON] No stands, cleared polygon');
      return;
    }

    const geometries = stands
      .filter(s => s.geometry)
      .map(s => s.geometry);

    console.log('[WU POLYGON] Geometries count:', geometries.length, '/', stands.length);

    if (geometries.length === 0) {
      console.log('[WU POLYGON] No geometries found');
      return;
    }

    // Log each geometry's spatial reference BEFORE union
    geometries.forEach((g, i) => {
      const ext = g?.extent;
      const sr = g?.spatialReference;
      console.log(`[WU POLYGON] Geometry ${i}: wkid=${sr?.wkid}, extent=[${ext?.xmin?.toFixed(0)}, ${ext?.ymin?.toFixed(0)}, ${ext?.xmax?.toFixed(0)}, ${ext?.ymax?.toFixed(0)}]`);
    });

    // Log each geometry's extent and perimeter BEFORE union
    geometries.forEach((g, i) => {
      const ext = g?.extent;
      console.log(`[WU POLYGON] Geometry ${i}: extent=[${ext?.xmin?.toFixed(0)}, ${ext?.ymin?.toFixed(0)}, ${ext?.xmax?.toFixed(0)}, ${ext?.ymax?.toFixed(0)}]`);
      const perimeter = geometryEngine.planarLength(g, 'meters');//used for debugging. there is no  equivalent geometry operator for length calculation
      console.log(`[WU POLYGON] Geometry ${i}: perimeter=${perimeter?.toFixed(0)}m`);
    });

    try {
      const unionGeometry = unionMultipleGeometries(geometries);
      console.log('[WU POLYGON] Union result:', unionGeometry ? 'OK' : 'NULL',
        'Type:', unionGeometry?.type);

      if (!unionGeometry) {
        console.error('[WU POLYGON] Union returned null!');
        return;
      }

      // Log union extent and perimeter AFTER union
      const unionExt = unionGeometry?.extent;
      const unionPerimeter = geometryEngine.planarLength(unionGeometry, 'meters');//used for debugging. there is no  equivalent geometry operator for length calculation
      console.log(`[WU POLYGON] Union: extent=[${unionExt?.xmin?.toFixed(0)}, ${unionExt?.ymin?.toFixed(0)}, ${unionExt?.xmax?.toFixed(0)}, ${unionExt?.ymax?.toFixed(0)}], perimeter=${unionPerimeter?.toFixed(0)}m`);

      //console.log('[WU POLYGON] Union extent:', JSON.stringify(unionGeometry?.extent?.toJSON())); // ADD THIS

      const orangeOutlineSymbol = new SimpleFillSymbol({//graphicSymbol
        color: [255, 165, 0, 0.3],
        outline: { color: [255, 140, 0, 1], width: 3 }
      });

      const graphic = new Graphic({
        geometry: unionGeometry,
        symbol: orangeOutlineSymbol
      });

      workUnitPolygonLayerRef.current.add(graphic);

      const afterCount = workUnitPolygonLayerRef.current.graphics.length;
      console.log('[WU POLYGON] Added graphic. Layer now has', afterCount, 'graphics');

    } catch (error) {
      console.error('[WU POLYGON] Error creating union:', error);
    }
  };

  /**
   * Update work unit polygon display directly (not from stands)
   * Used after correction line is applied
   */
  const updateWorkUnitPolygonDirect = (polygon: __esri.Polygon) => {
    console.log('[WU POLYGON] updateWorkUnitPolygonDirect called');

    if (!workUnitPolygonLayerRef.current) {
      console.log('[WU POLYGON] No layer ref!');
      return;
    }

    workUnitPolygonLayerRef.current.removeAll();

    if (!polygon) {
      console.log('[WU POLYGON] No polygon provided');
      return;
    }

    const orangeOutlineSymbol = new SimpleFillSymbol({
      color: [255, 165, 0, 0.3],
      outline: { color: [255, 140, 0, 1], width: 3 }
    });

    const graphic = new Graphic({
      geometry: polygon,
      symbol: orangeOutlineSymbol
    });

    workUnitPolygonLayerRef.current.add(graphic);
    console.log('[WU POLYGON] Updated polygon directly');
  };

  /**
   * Build and display all compartment polygons from forest stands with labels
   */
  const showAllCompartmentsGraphics = (forestStands: Stand[]) => {
    if (!compartmentsLayerRef.current) return;

    // Clear previous
    compartmentsLayerRef.current.removeAll();
    if (compartmentLabelsLayerRef.current) {
      compartmentLabelsLayerRef.current.removeAll();
    }

    if (forestStands.length === 0) {
      console.log('[COMPARTMENTS] No stands, cleared layer');
      return;
    }

    // Group stands by compartment
    const standsByCompartment = new Map<number, Stand[]>();
    forestStands.forEach(stand => {
      if (!standsByCompartment.has(stand.compartmentNum)) {
        standsByCompartment.set(stand.compartmentNum, []);
      }
      standsByCompartment.get(stand.compartmentNum).push(stand);
    });

    // Symbol: blue outline, transparent fill
    const compartmentSymbol = new SimpleFillSymbol({
      color: [0, 0, 0, 0], // Fully transparent fill
      outline: { color: [17, 77, 207, 1], width: 3 } // Blue outline
    });

    // Text symbol for labels
    const createLabelSymbol = (text: string) => new TextSymbol({
      text: text,
      color: [17, 77, 207, 1],
      font: {
        size: 14,
        weight: 'bold',
        family: 'Arial'
      },
      haloColor: [255, 255, 255, 0.9],
      haloSize: 2
    });

    // Build polygon for each compartment
    standsByCompartment.forEach((stands, compartmentNum) => {
      const geometries = stands
        .filter(s => s.geometry)
        .map(s => s.geometry);

      if (geometries.length === 0) return;

      try {
        const unionGeometry = unionMultipleGeometries(geometries);
        if (unionGeometry) {
          // Add polygon
          const polygonGraphic = new Graphic({
            geometry: unionGeometry,
            symbol: compartmentSymbol,
            attributes: { compartmentNum }
          });
          compartmentsLayerRef.current.add(polygonGraphic);

          // Add label at centroid
          if (compartmentLabelsLayerRef.current) {
            const centroid = (unionGeometry as __esri.Polygon).centroid;
            if (centroid) {
              const labelGraphic = new Graphic({
                geometry: centroid,
                symbol: createLabelSymbol(String(compartmentNum))
              });
              compartmentLabelsLayerRef.current.add(labelGraphic);
            }
          }
        }
      } catch (error) {
        console.warn('[COMPARTMENTS] Error creating union for compartment:', compartmentNum, error);
      }
    });

    console.log('[COMPARTMENTS] Built', standsByCompartment.size, 'compartment polygons with labels');
  };

  /**
   * Show selected compartment highlight (built from stands)
   */
  const showSelectedCompartmentGraphic = (compartmentNum: number, forestStands: Stand[]) => {
    if (!selectedCompartmentLayerRef.current) return;

    // Clear previous
    selectedCompartmentLayerRef.current.removeAll();

    // Filter stands for this compartment
    const compartmentStands = forestStands.filter(s => s.compartmentNum === compartmentNum);
    const geometries = compartmentStands
      .filter(s => s.geometry)
      .map(s => s.geometry);

    if (geometries.length === 0) {
      console.log('[SELECTED COMP] No geometries for compartment:', compartmentNum);
      return;
    }

    try {
      const unionGeometry = unionMultipleGeometries(geometries);
      if (unionGeometry) {
        // Symbol: green outline with slight fill
        const selectedSymbol = new SimpleFillSymbol({
          color: [0, 255, 0, 0.05], // Light green fill
          outline: { color: [0, 255, 0, 1], width: 1 } // Green outline
        });

        const graphic = new Graphic({
          geometry: unionGeometry,
          symbol: selectedSymbol
        });
        selectedCompartmentLayerRef.current.add(graphic);
        console.log('[SELECTED COMP] Highlighted compartment:', compartmentNum);
      }
    } catch (error) {
      console.error('[SELECTED COMP] Error creating union:', error);
    }
  };

  /**
 * Clear all compartments graphics and labels
 */
  const clearCompartmentsGraphics = () => {
    if (compartmentsLayerRef.current) {
      compartmentsLayerRef.current.removeAll();
    }
    if (selectedCompartmentLayerRef.current) {
      selectedCompartmentLayerRef.current.removeAll();
    }
    if (compartmentLabelsLayerRef.current) {
      compartmentLabelsLayerRef.current.removeAll();
    }
    console.log('[COMPARTMENTS] Cleared all including labels');
  };

  // === Log state changes ===
  const logStateChange = (from: WidgetState, to: WidgetState, reason: string) => {
    console.log("[STATE] " + from + " -> " + to + " | " + reason);
  };

  /**
   * Go to new state
   */
  const goToState = (newState: WidgetState, reason: string = "") => {
    logStateChange(data.currentState, newState, reason);
    setData((prev) => ({ ...prev, currentState: newState }));
  };

  /**
   * Reset to initial state
   */
  const resetToInit = () => {
    logStateChange(data.currentState, 'init', 'Reset');


    // Release lock if we were editing
    if (data.editingWorkUnit && layers.workUnits) {
      releaseLock(layers.workUnits, data.editingWorkUnit.objectId);
      lastLockedTimeRef.current = 0;
    }

    // Clear intervals
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }



    //setData(initialWidgetData);//הוחלף כדי שחלון העזרה יישאר פתוח גם בחזרה למצב התחלתי
    setData(prev => ({
      ...initialWidgetData,
      isHelpOpen: prev.isHelpOpen  // שמור את מצב העזרה
    }));

    if (highlightLayerRef.current) {
      highlightLayerRef.current.removeAll();
    }
    if (standsToAddLayerRef.current) {
      standsToAddLayerRef.current.removeAll();
    }
    if (standsToRemoveLayerRef.current) {
      standsToRemoveLayerRef.current.removeAll();
    }
    clearCompartmentsGraphics();
    if (sketchLayerRef.current) {
      sketchLayerRef.current.removeAll();
    }
    if (sketchVMRef.current) {
      sketchVMRef.current.cancel();
    }
    if (workUnitPolygonLayerRef.current) {
      workUnitPolygonLayerRef.current.removeAll();
    }

    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = true;
    }

    // Reset layer visibility and filters for init state
    // Forests and WorkUnits visible, Compartments and Stands hidden
    if (layers.forests) {
      layers.forests.visible = true;
      clearFilterFromLayer(jimuMapView, layers.forests, props.id);
    }
    if (layers.workUnits) {
      layers.workUnits.visible = true;
      clearFilterFromLayer(jimuMapView, layers.workUnits, props.id);
    }
    if (layers.compartments) {
      layers.compartments.visible = false;
      clearFilterFromLayer(jimuMapView, layers.compartments, props.id);

    }
    if (layers.stands) {
      layers.stands.visible = false;
      clearFilterFromLayer(jimuMapView, layers.stands, props.id);
    }
  };

  /**
   * Toggle help panel (click mode)
   */
  const toggleHelp = () => {
    console.log('[HELP] toggleHelp called, isHelpHoverMode:', isHelpHoverMode);

    if (isHelpHoverMode && data.isHelpOpen) {
      // Help was opened by hover - first click just "locks" it open
      setIsHelpHoverMode(false);
      console.log('[HELP] Locked help panel open (converted from hover to click mode)');
    } else {
      // Normal toggle
      setData((prev) => ({ ...prev, isHelpOpen: !prev.isHelpOpen }));
      setIsHelpHoverMode(false);
    }
  };

  /**
   * Close help panel
   */
  const closeHelp = () => {
    setIsHelpHoverMode(false);
    setData((prev) => ({ ...prev, isHelpOpen: false }));
  };

  /**
   * Show help on hover
   */
  const showHelpOnHover = () => {
    if (!data.isHelpOpen) {
      setIsHelpHoverMode(true);
      setData((prev) => ({ ...prev, isHelpOpen: true }));
    }
  };

  /**
   * Hide help on mouse leave (only if hover mode)
   */
  const hideHelpOnLeave = () => {
    if (isHelpHoverMode) {
      setData((prev) => ({ ...prev, isHelpOpen: false }));
      setIsHelpHoverMode(false);
    }
  };

  /**
   * Commit temp stands to main list
   */
  const commitStandsToAddNew = () => {
    setData(prev => {
      if (prev.standsToAdd.length === 0) return prev;

      const addedKeys = prev.standsToAdd.map(s => `${s.compartmentNum}-${s.standNum}`);
      const count = prev.standsToAdd.length;
      const hasGeometry = prev.standsToAdd.filter(s => s.geometry).length;
      const newWorkUnitStands = [...prev.workUnitStands, ...prev.standsToAdd];

      console.log('[ACTION] Committing', count, 'stands to main list');
      console.log('[ACTION] Stands with geometry:', hasGeometry, '/', count);
      console.log('[ACTION] Current workUnitStands:', prev.workUnitStands.length);
      console.log('[ACTION] New workUnitStands will have:', newWorkUnitStands.length, 'stands');

      return {
        ...prev,
        workUnitStands: newWorkUnitStands,
        standsToAdd: [],
        lastAddedStandIds: addedKeys,
        lastDrawnStandIds: [],
        lastMessageType: null, lastMessage: `${count} עומדים שלמים צורפו לי"ע`
      };
    });
  };
  const commitWholeStandsToAdd = () => {
    if (data.standsToAdd.length === 0) return;

    const addedKeys = data.standsToAdd.map(s => `${s.compartmentNum}-${s.standNum}`);
    const count = data.standsToAdd.length;
    const hasGeometry = data.standsToAdd.filter(s => s.geometry).length;

    console.log('[ACTION] Committing', count, 'stands to main list');
    console.log('[ACTION] Stands with geometry:', hasGeometry, '/', count);
    console.log('[ACTION] Current workUnitStands:', data.workUnitStands.length);

    setData(prev => {
      const newWorkUnitStands = [...prev.workUnitStands, ...prev.standsToAdd];
      console.log('[ACTION] New workUnitStands will have:', newWorkUnitStands.length, 'stands');

      // Add whole stands: Update wuPolygonFinal by adding standsToAdd geometries
      let newPolygon = prev.wuPolygonFinal;
      for (const stand of prev.standsToAdd) {
        if (stand.geometry) {
          if (!newPolygon) {
            newPolygon = stand.geometry as __esri.Polygon;
          } else {
            const result = unionOperator.execute(newPolygon, stand.geometry);
            if (result) newPolygon = result as __esri.Polygon;
          }
        }
      }

      return {
        ...prev,
        workUnitStands: newWorkUnitStands,
        standsToAdd: [],
        wuPolygonFinal: newPolygon,
        lastAddedStandIds: addedKeys,
        lastDrawnStandIds: [],
        lastMessageType: null, lastMessage: `${count} עומדים צורפו לי"ע`
      };
    });
  };

  /**
   * Clear error message
   */
  const clearError = () => {
    setData((prev) => ({ ...prev, errorMessage: null }));
  };

  /**
   * Clear all stands from standsToAdd list
   */
  const clearStandsToAdd = () => {
    console.log('[LIST] Clear all standsToAdd');

    if (sketchVMRef.current) {
      sketchVMRef.current.cancel();
    }
    if (sketchLayerRef.current) {
      sketchLayerRef.current.removeAll();
    }

    setData(prev => {
      const hasCommittedStands = prev.workUnitStands.length > 0;
      const isEditMode = prev.currentState.startsWith('edit.');

      if (hasCommittedStands || isEditMode) {
        // יש עומדים בי"ע, או במצב עריכה - השאר יער וחלקה, רק נקה את רשימת הצירוף
        return {
          ...prev,
          isDrawing: false,
          standsToAdd: [],
          lastDrawnStandIds: [],
          wuPolygonFinal: null,  // Clear the correction
          lastMessageType: null, lastMessage: 'רשימת העומדים לצירוף נוקתה'
        };
      } else {
        // אין עומדים ביחידת העבודה ובמצב יצירה - חזור למצב התחלתי
        return {
          ...prev,
          isDrawing: false,
          standsToAdd: [],
          lastDrawnStandIds: [],
          selectedForest: null,
          selectedCompartment: null,
          availableCompartments: [],
          availableStands: [],
          allForestStands: [],
          wuPolygonFinal: null,  // Clear the correction
          lastMessageType: null, lastMessage: 'רשימת העומדים לצירוף נוקתה'
        };
      }
    });
  };

  /**
   * Confirm pending correction - apply polygon and find stands
   */
  const confirmPendingCorrection = () => {
    if (!data.pendingCorrection) return;

    // Clear dashed lines
    if (sketchLayerRef.current) {
      sketchLayerRef.current.removeAll();
    }

    setData(prev => {
      if (!prev.pendingCorrection) return prev;

      const allNewStands = prev.pendingCorrection!.standsListAffectedByReshapeLine || [];

      // Separate wholly removed stands from partial stands
      const standsToRemoveFromCorrection = allNewStands.filter(s => (s as any).isRemoved === true);
      const standsToAddFromCorrection = allNewStands.filter(s => (s as any).isRemoved !== true);

      // Keys of stands being wholly removed
      const removedKeys = new Set(standsToRemoveFromCorrection.map(s => `${s.compartmentNum}-${s.standNum}`));

      // Update workUnitStands: mark partial, remove wholly removed
      const updatedWorkUnitStands = prev.workUnitStands
        .filter(stand => !removedKeys.has(`${stand.compartmentNum}-${stand.standNum}`))
        .map(stand => {
          const standKey = `${stand.compartmentNum}-${stand.standNum}`;
          const isPartial = prev.pendingCorrection!.partialStandIds?.has(standKey);
          return { ...stand, isPartial: !!isPartial };
        });

      const updatedStandsToAdd = prev.standsToAdd.map(stand => {
        const standKey = `${stand.compartmentNum}-${stand.standNum}`;
        const isPartial = prev.pendingCorrection!.partialStandIds?.has(standKey);
        return isPartial ? { ...stand, isPartial: true } : stand;
      });

      // Filter out stands already in workUnitStands (only add truly new ones)
      const existingKeys = new Set(prev.workUnitStands.map(s => `${s.compartmentNum}-${s.standNum}`));
      const trulyNewStands = standsToAddFromCorrection.filter(s => !existingKeys.has(`${s.compartmentNum}-${s.standNum}`));

      return {
        ...prev,
        workUnitStands: [...updatedWorkUnitStands, ...trulyNewStands],
        standsToAdd: updatedStandsToAdd,
        wuPolygonFinal: prev.pendingCorrection!.newPolygon,
        pendingCorrection: null,
        lastMessageType: 'info',
        lastMessage: translate('correctionLineApplied')
      };
    });
  };

  /**
   * Cancel pending correction - clear preview
   */
  const cancelPendingCorrection = () => {
    // Clear dashed lines
    if (sketchLayerRef.current) {
      sketchLayerRef.current.removeAll();
    }

    setData(prev => ({
      ...prev,
      pendingCorrection: null,
      lastMessageType: 'info',
      lastMessage: translate('correctionCancelled')
    }));
  };

  /**
   * Load compartments for a forest - from stands
   */
  const loadCompartments = async (forestNum: number) => {
    console.log('[LIST] Building compartments list from forest stands:', forestNum);

    // Get compartments from allForestStands (load if needed)
    let forestStands = data.allForestStands;
    if (forestStands.length === 0 || forestStands[0]?.forestNum !== forestNum) {
      forestStands = await loadForestStands(forestNum);
      setData(prev => ({ ...prev, allForestStands: forestStands }));
    }

    // Extract unique compartment numbers and build Compartment objects
    const compartmentMap = new Map<number, Compartment>();
    forestStands.forEach(stand => {
      if (!compartmentMap.has(stand.compartmentNum)) {
        compartmentMap.set(stand.compartmentNum, {
          compartmentNum: stand.compartmentNum,
          forestNum: stand.forestNum
        });
      }
    });

    // Sort by compartment number
    const compartments = Array.from(compartmentMap.values())
      .sort((a, b) => a.compartmentNum - b.compartmentNum);

    console.log('[LIST] Found', compartments.length, 'compartments from stands data');

    // Display all compartment polygons
    showAllCompartmentsGraphics(forestStands);

    setData(prev => ({
      ...prev,
      availableCompartments: compartments,
      availableStands: [],
      selectedCompartment: null
    }));
  };
  const loadCompartmentsMid = async (forestNum: number) => {
    console.log('[LIST] Building compartments list from forest stands:', forestNum);

    // Get compartments from allForestStands
    const forestStands = data.allForestStands.length > 0
      ? data.allForestStands
      : await loadForestStands(forestNum);

    // Extract unique compartment numbers and build Compartment objects
    const compartmentMap = new Map<number, Compartment>();
    forestStands.forEach(stand => {
      if (!compartmentMap.has(stand.compartmentNum)) {
        compartmentMap.set(stand.compartmentNum, {
          compartmentNum: stand.compartmentNum,
          forestNum: stand.forestNum
        });
      }
    });

    // Sort by compartment number
    const compartments = Array.from(compartmentMap.values())
      .sort((a, b) => a.compartmentNum - b.compartmentNum);

    console.log('[LIST] Found', compartments.length, 'compartments from stands data');

    setData(prev => ({
      ...prev,
      availableCompartments: compartments,
      availableStands: [],
      selectedCompartment: null
    }));
  };
  /**
   * Load compartments for a forest - from layer
   */
  const loadCompartmentsOld = async (forestNum: number) => {
    if (!layers.compartments) return;  // תוקן: compartments במקום stands

    console.log('[LIST] Loading compartments for forest:', forestNum);
    setData(prev => ({ ...prev, isLoading: true, loadingMessage: 'טוען חלקות...' }));

    try {
      const compartments = await queryCompartmentsByForest(layers.compartments, forestNum);
      console.log('[LIST] Loaded', compartments.length, 'compartments');
      setData(prev => ({
        ...prev,
        availableCompartments: compartments,
        availableStands: [],
        selectedCompartment: null,
        isLoading: false,
        loadingMessage: ''
      }));
    } catch (error) {
      console.error('[LIST] Error loading compartments:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        lastMessageType: 'warning', lastMessage: 'שגיאה בטעינת חלקות',
      }));
    }
  };

  /**
   * Load stands for a compartment
   */
  const loadStands = async (forestNum: number, compartmentNum: number) => {
    console.log('[LIST] Filtering stands for compartment:', compartmentNum);

    // Filter stands from allForestStands
    const stands = data.allForestStands
      .filter(s => s.compartmentNum === compartmentNum)
      .sort((a, b) => a.standNum - b.standNum);

    console.log('[LIST] Found', stands.length, 'stands in compartment');

    setData(prev => ({
      ...prev,
      availableStands: stands
    }));
  };
  /**
   * Load stands for a compartment
   */
  const loadStandsOld = async (forestNum: number, compartmentNum: number) => {
    if (!layers.stands) return;

    console.log('[LIST] Loading stands for compartment:', compartmentNum);
    setData(prev => ({ ...prev, isLoading: true, loadingMessage: 'טוען עומדים...' }));

    try {
      const stands = await queryStandsByCompartment(layers.stands, forestNum, compartmentNum);
      console.log('[LIST] Loaded', stands.length, 'stands');
      setData(prev => ({
        ...prev,
        availableStands: stands,
        isLoading: false,
        loadingMessage: ''
      }));
    } catch (error) {
      console.error('[LIST] Error loading stands:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        lastMessageType: 'warning', lastMessage: 'שגיאה בטעינת עומדים',
      }));
    }
  };

  /**
 * Handle forest selection in wayList
 */
  const handleForestSelect = async (forestNum: number) => {
    const forest = data.availableForests.find(f => f.forestNum === forestNum);
    if (!forest) return;

    console.log('[LIST] Forest selected:', forest.forestName);

    // Show loading
    setData(prev => ({
      ...prev,
      isLoading: true,
      loadingMessage: 'טוען עומדי יער...'
    }));

    // Filter forests layer to show only selected forest
    if (layers.forests) {
      const fields = LAYERS_CONFIG.forests.fields;
      layers.forests.visible = true;
      applyFilterToLayer(jimuMapView, layers.forests, `${fields.forestNum.name} = ${forestNum}`, props.id);
      console.log('[LAYERS] Forests layer filtered to:', forestNum);
    }

    // Filter compartments layer to show only compartments in selected forest
    //if (layers.compartments) {
    //  const fields = LAYERS_CONFIG.compartments.fields;
    //  layers.compartments.visible = true;
    //  applyFilterToLayer(jimuMapView, layers.compartments, `${fields.forestNum.name} = ${forestNum}`, props.id);
    //  console.log('[LAYERS] Compartments layer filtered to:', forestNum);
    //}

    // Hide stands and workUnits layers
    if (layers.stands) {
      layers.stands.visible = false;
    }
    if (layers.workUnits) {
      layers.workUnits.visible = false;
    }

    try {
      // Load all forest stands
      const allStands = await loadForestStands(forestNum);

      setData(prev => ({
        ...prev,
        selectedForest: forest,
        selectedCompartment: null,
        availableCompartments: [],
        availableStands: [],
        standsToAdd: [],
        standsToRemove: [],
        lastDrawnStandIds: [],
        allForestStands: allStands,
        isLoading: false,
        loadingMessage: '',
        lastMessage: null, lastMessageType: null,
      }));

      loadCompartments(forestNum);
    } catch (error) {
      console.error('[LIST] Error loading forest stands:', error);
      setData(prev => ({
        ...prev,
        selectedForest: forest,
        selectedCompartment: null,
        availableCompartments: [],
        availableStands: [],
        standsToAdd: [],
        standsToRemove: [],
        lastDrawnStandIds: [],
        isLoading: false,
        loadingMessage: '',
        lastMessage: 'שגיאה בטעינת עומדי יער',
        lastMessageType: 'warning',
      }));

      loadCompartments(forestNum);
    }
  };

  /**
   * Handle compartment selection in wayList
   */
  const handleCompartmentSelect = async (compartmentNum: number) => {
    if (!data.selectedForest) return;

    const compartment = data.availableCompartments.find(c => c.compartmentNum === compartmentNum);
    if (!compartment) return;

    console.log('[LIST] Compartment selected:', compartmentNum);

    // Clear all compartments graphics (borders and labels)
    clearCompartmentsGraphics();

    // Show and filter stands layer
    if (layers.stands) {
      const fields = LAYERS_CONFIG.stands.fields;
      layers.stands.visible = true;
      applyFilterToLayer(
        jimuMapView,
        layers.stands,
        `${fields.forestNum.name} = ${data.selectedForest.forestNum}`,
        props.id
      );
      console.log('[LAYERS] Stands layer shown and filtered to forest:', data.selectedForest.forestNum);
    }

    setData(prev => ({
      ...prev,
      selectedCompartment: compartment,
      availableStands: []
      // NOT clearing standsToAdd - user can add from multiple compartments
    }));

    // Show selected compartment highlight (built from stands)
    showSelectedCompartmentGraphic(compartmentNum, data.allForestStands);

    // Zoom to selected compartment (use the built geometry)
    if (jimuMapView?.view && selectedCompartmentLayerRef.current?.graphics.length > 0) {
      try {
        const graphic = selectedCompartmentLayerRef.current.graphics.getItemAt(0);
        if (graphic?.geometry) {
          console.log('[LIST] Zooming to compartment');
          await jimuMapView.view.goTo(graphic.geometry.extent.expand(1.2));
        }
      } catch (error) {
        console.error('[LIST] Error zooming to compartment:', error);
      }
    }

    loadStands(data.selectedForest.forestNum, compartmentNum);
  };

  /**
   * Handle stand checkbox toggle in wayList
   */
  const handleStandToggle = (stand: Stand, isChecked: boolean) => {
    const standLabel = stand.isPartial
      ? `${stand.compartmentNum}-${stand.standNum}*`
      : `${stand.compartmentNum}-${stand.standNum}`;
    const standKey = `${stand.compartmentNum}-${stand.standNum}`;
    const isInWorkUnitStands = data.workUnitStands.some(s => `${s.compartmentNum}-${s.standNum}` === standKey);
    const isInStandsToAdd = data.standsToAdd.some(s => `${s.compartmentNum}-${s.standNum}` === standKey);
    const isInStandsToRemove = data.standsToRemove.some(s => `${s.compartmentNum}-${s.standNum}` === standKey);

    if (isChecked) {
      // Checking the box
      if (isInStandsToRemove) {
        // Was marked for removal - cancel the removal
        console.log('[LIST] Removing stand from standsToRemove:', standLabel);
        setData(prev => ({
          ...prev,
          standsToRemove: prev.standsToRemove.filter(s => `${s.compartmentNum}-${s.standNum}` !== `${stand.compartmentNum}-${stand.standNum}`),
          lastMessageType: null,
          lastMessage: `עומד ${standLabel} הוסר מרשימת ההסרה`
        }));
      } else if (!isInWorkUnitStands && !isInStandsToAdd) {
        // New stand - add to standsToAdd
        console.log('[LIST] Adding stand to standsToAdd:', standLabel);
        setData(prev => ({
          ...prev,
          standsToAdd: [...prev.standsToAdd, stand],
          lastDrawnStandIds: [`${stand.compartmentNum}-${stand.standNum}`],
          lastMessageType: null,
          lastMessage: `עומד ${standLabel} נוסף לרשימת הצירוף`
        }));
      }
    } else {
      // Unchecking the box
      if (isInWorkUnitStands && !isInStandsToRemove) {
        // Committed stand - add to standsToRemove
        console.log('[LIST] Adding stand to standsToRemove:', standLabel);
        setData(prev => ({
          ...prev,
          standsToRemove: [...prev.standsToRemove, stand],
          lastMessageType: null,
          lastMessage: `עומד ${standLabel} נוסף לרשימת ההסרה`
        }));
      } else if (isInStandsToAdd) {
        // Was in standsToAdd - remove from standsToAdd
        console.log('[LIST] Removing stand from standsToAdd:', standLabel);
        setData(prev => {
          const newStandsToAdd = prev.standsToAdd.filter(s => `${s.compartmentNum}-${s.standNum}` !== `${stand.compartmentNum}-${stand.standNum}`);
          const isEditMode = prev.currentState.startsWith('edit.');
          const shouldClearForest = !isEditMode && prev.workUnitStands.length === 0 && newStandsToAdd.length === 0;

          return {
            ...prev,
            standsToAdd: newStandsToAdd,
            selectedForest: shouldClearForest ? null : prev.selectedForest,
            availableForests: shouldClearForest ? [] : prev.availableForests,
            availableCompartments: shouldClearForest ? [] : prev.availableCompartments,
            selectedCompartment: shouldClearForest ? null : prev.selectedCompartment,
            allForestStands: shouldClearForest ? [] : prev.allForestStands,
            lastDrawnStandIds: [],
            lastMessageType: shouldClearForest ? 'warning' : null,
            lastMessage: shouldClearForest
              ? `עומד ${standLabel} הוסר, בחירת היער בוטלה`
              : `עומד ${standLabel} הוסר מרשימת הצירוף`
          };
        });
      }
    }
  };

  /**
 * Handle work unit selection change in selector dropdown
 */
  const handleWorkUnitSelectorChange = (index: number) => {
    setData(prev => ({
      ...prev,
      selectedOverlappingIndex: index
    }));
  };

  /**
   * Handle work unit selection confirm
   */
  const handleWorkUnitSelectorConfirm = async () => {
    const selectedWU = data.overlappingWorkUnits[data.selectedOverlappingIndex];
    if (!selectedWU || !layers.workUnits || !layers.stands) return;

    console.log('[SELECTOR] User confirmed work unit:', selectedWU.workUnitId);

    // Hide selector and show loading
    setData(prev => ({
      ...prev,
      showWorkUnitSelector: false,
      overlappingWorkUnits: [],
      selectedOverlappingIndex: -1,
      isLoading: true,
      loadingMessage: translate('loadingFromServer')
    }));

    // Clear highlight
    if (workUnitHighlightLayerRef.current) {
      workUnitHighlightLayerRef.current.removeAll();
    }

    // Clear work units filter (was filtered for selector)
    if (layers.workUnits) {
      layers.workUnits.definitionExpression = null;
    }

    // Re-enable popups
    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = true;
    }
    if (layers.forests) layers.forests.popupEnabled = true;
    if (layers.workUnits) layers.workUnits.popupEnabled = true;

    // Hide stands layer (was shown for selector)
    if (layers.stands) {
      layers.stands.visible = false;
    }

    try {
      // Check if editable
      if (!isWorkUnitEditable(selectedWU)) {
        console.log('[SELECTOR] Work unit is not editable, status:', selectedWU.status);
        setData(prev => ({
          ...prev,
          isLoading: false,
          errorMessage: translate('workUnitNotEditable')
        }));
        return;
      }

      // Try to acquire lock
      console.log('[LOCK] Attempting to acquire lock...');
      const lockAcquired = await acquireLock(layers.workUnits, selectedWU.objectId);

      if (!lockAcquired) {
        console.log('[LOCK] Work unit is locked by another user');
        setData(prev => ({
          ...prev,
          isLoading: false,
          isWaiting: true,
          lockedWorkUnitId: selectedWU.workUnitId,
          editingWorkUnit: selectedWU,
          waitingStartTime: Date.now()
        }));
        return;
      }

      // Lock acquired successfully
      console.log('[LOCK] Lock acquired, proceeding to edit');
      lastLockedTimeRef.current = Date.now();

      // Set forest info
      const forest: Forest = {
        forestNum: parseInt(selectedWU.forestNum),
        forestName: selectedWU.forestName
      };

      // Load all forest stands (from cache or server)
      console.log('[SELECTOR] Loading all stands for forest:', forest.forestNum);
      const allStands = await loadForestStands(forest.forestNum);

      // Parse stands string and filter from cached stands
      const standsData = parseStandsStringWithPartial(selectedWU.stands);
      console.log('[SELECTOR] Parsed stands:', standsData.length);

      const stands = allStands
        .filter(s =>
          standsData.some(sd =>
            sd.compartmentNum === s.compartmentNum && sd.standNum === s.standNum
          )
        )
        .map(s => {
          const standData = standsData.find(sd =>
            sd.compartmentNum === s.compartmentNum && sd.standNum === s.standNum
          );
          return { ...s, isPartial: standData?.isPartial || false };
        });
      console.log('[SELECTOR] Matched stands with geometry:', stands.length);

      // Zoom to work unit
      if (selectedWU.geometry && jimuMapView?.view) {
        jimuMapView.view.goTo(selectedWU.geometry.extent.expand(1.3), {
          duration: 1000
        }).catch(err => {
          console.warn('[SELECTOR] Could not zoom to work unit:', err);
        });
        console.log('[SELECTOR] Zoomed to work unit:', selectedWU.workUnitId);
      }

      // Transition to edit.selected.baseStands
      logStateChange(data.currentState, 'edit.selected.baseStands', 'Work unit selected from selector');

      setData(prev => ({
        ...prev,
        currentState: 'edit.selected.baseStands',
        editingWorkUnit: selectedWU,
        selectedForest: forest,
        workUnitStands: stands,
        initialStands: [...stands],
        allForestStands: allStands,
        wuPolygonFinal: selectedWU.geometry ? geo2itm(projection, selectedWU.geometry) as __esri.Polygon : null,  // USE SERVER GEOMETRY
        isLoading: false,
        errorMessage: null,
        lastMessage: null
      }));

    } catch (error) {
      console.error('[SELECTOR] Error loading work unit:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        errorMessage: String(error)
      }));
    }
  };

  /**
   * Handle work unit selection cancel
   */
  const handleWorkUnitSelectorCancel = () => {
    console.log('[SELECTOR] User cancelled selection');

    // Clear highlight
    if (workUnitHighlightLayerRef.current) {
      workUnitHighlightLayerRef.current.removeAll();
    }

    // Clear work units filter - show all
    if (layers.workUnits) {
      layers.workUnits.definitionExpression = null;
      layers.workUnits.visible = true;
    }

    // Clear forests filter - show all
    if (layers.forests) {
      layers.forests.definitionExpression = null;
      layers.forests.visible = true;
    }

    // Re-enable popups
    if (jimuMapView?.view) {
      jimuMapView.view.popupEnabled = true;
    }
    if (layers.forests) layers.forests.popupEnabled = true;
    if (layers.workUnits) layers.workUnits.popupEnabled = true;

    // Hide stands layer
    if (layers.stands) {
      layers.stands.definitionExpression = null;
      layers.stands.visible = false;
    }

    // Hide compartments layer
    if (layers.compartments) {
      layers.compartments.definitionExpression = null;
      layers.compartments.visible = false;
    }

    setData(prev => ({
      ...prev,
      showWorkUnitSelector: false,
      overlappingWorkUnits: [],
      selectedOverlappingIndex: -1
    }));
  };
  /**
   * Handle map view ready
   */
  const onActiveViewChange = async (jmv: JimuMapView) => {
    if (!jmv) return;

    console.log("[MAP] JimuMapView ready");

    // Get all layers
    const foundLayers = getAllLayers(jmv);
    console.log("[MAP] Layers found:", {
      forests: foundLayers.forests?.title,
      compartments: foundLayers.compartments?.title,
      stands: foundLayers.stands?.title,
      workUnits: foundLayers.workUnits?.title,
    });

    // Set layers immediately so useEffects can access them
    // DataSources initialization is optional enhancement, not required for basic functionality
    setLayers(foundLayers);
    setJimuMapView(jmv);

    // Initialize all DataSources (optional, controlled by flag)
    await initializeAllLayerDataSources(jmv, INIT_ALL_DATASOURCES);

    // Debug: Log DataSources info
    debugLogDataSources(jmv);

    // Log spatial references of all layers
    console.log('[LAYERS SR] forests:', foundLayers.forests?.spatialReference?.wkid);
    console.log('[LAYERS SR] compartments:', foundLayers.compartments?.spatialReference?.wkid);
    console.log('[LAYERS SR] stands:', foundLayers.stands?.spatialReference?.wkid);
    console.log('[LAYERS SR] workUnits:', foundLayers.workUnits?.spatialReference?.wkid);
  };

  /**
   * Format stands list for display
   */
  //const formatStandsList = (stands: Stand[]): string => { //unused
  //  if (stands.length === 0) return "";
  //
  //  const byCompartment: { [key: number]: number[] } = {};
  //  stands.forEach((s) => {
  //    if (!byCompartment[s.compartmentNum]) {
  //      byCompartment[s.compartmentNum] = [];
  //    }
  //    byCompartment[s.compartmentNum].push(s.standNum);
  //  });
  //
  //  const parts: string[] = [];
  //  Object.keys(byCompartment)
  //    .map(Number)
  //    .sort((a, b) => a - b)
  //    .forEach((comp) => {
  //      const standNums = byCompartment[comp].sort((a, b) => a - b).join(",");
  //      parts.push(comp + "(" + standNums + ")");
  //    });
  //
  //  return parts.join(", ");
  //};

  /**
   * Format stands list for display - returns JSX with bold for last added
   */
  const formatStandsListJsx = (
    stands: Stand[],
    lastAddedIds: string[],
    initialStands: Stand[] = []  // Pass initialStands for comparison
  ): React.ReactNode => {
    if (stands.length === 0) return null;

    // Build map of initial stands using composite key (not objectId!)
    const initialStandsMap = new Map<string, Stand>();
    initialStands.forEach(s => {
      const key = `${s.compartmentNum}-${s.standNum}`;
      initialStandsMap.set(key, s);
    });

    const byCompartment: { [key: number]: Stand[] } = {};
    stands.forEach(s => {
      if (!byCompartment[s.compartmentNum]) {
        byCompartment[s.compartmentNum] = [];
      }
      byCompartment[s.compartmentNum].push(s);
    });

    const compartments = Object.keys(byCompartment)
      .map(Number)
      .sort((a, b) => a - b);

    return compartments.map((comp, compIndex) => {
      const compStands = byCompartment[comp].sort((a, b) => a.standNum - b.standNum);

      return (
        <span key={comp}>
          <span style={{ color: 'black' }}>{comp}(</span>
          {compStands.map((stand, standIndex) => {
            const standKey = `${stand.compartmentNum}-${stand.standNum}`;
            const isLastAdded = lastAddedIds.includes(standKey);
            const initialStand = initialStandsMap.get(standKey);
            const wasInOriginal = !!initialStand;
            const isRemovedStand = (stand as any).isRemoved === true;

            // Determine the "*" suffix
            let showAsterisk: boolean;
            if (isRemovedStand) {
              // For removed stands, use ORIGINAL partial state
              showAsterisk = initialStand?.isPartial ?? false;
            } else {
              // For current stands, use CURRENT partial state
              showAsterisk = stand.isPartial ?? false;
            }

            const standLabel = showAsterisk ? `${stand.standNum}*` : `${stand.standNum}`;
            let content: React.ReactNode = standLabel;

            if (isRemovedStand) {
              // REMOVED TOTALLY: bold red + strikethrough
              content = <span style={{ fontWeight: 'bold', textDecoration: 'line-through', color: '#c62828' }}>{standLabel}</span>;
            } else if (!wasInOriginal) {
              // ADDED FROM NOTHING: bold blue
              content = <span style={{ fontWeight: 'bold', color: '#1565c0' }}>{standLabel}</span>;
            } else {
              // Was in original - check if CHANGED
              const originalWasPartial = initialStand?.isPartial ?? false;
              const currentIsPartial = stand.isPartial ?? false;

              if (originalWasPartial !== currentIsPartial) {
                // CHANGED: bold orange
                content = <span style={{ fontWeight: 'bold', color: '#e65100' }}>{standLabel}</span>;
              } else if (isLastAdded) {
                content = <strong>{standLabel}</strong>;
              }
            }

            return (
              <span key={standKey}>
                {content}
                {standIndex < compStands.length - 1 ? <span style={{ color: 'black' }}>,</span> : ''}
              </span>
            );
          })}
          <span style={{ color: 'black' }}>){compIndex < compartments.length - 1 ? ', ' : ''}</span>
        </span>
      );
    });
  };

  /**
   * Get help text for current state
   */
  const getHelpText = (): string => {
    const helpKeys: { [key in WidgetState]: string } = {
      init: "helpInit",
      create: "helpCreate",
      "create.baseStands": "helpCreateBaseStands",
      "create.baseStands.wayReshape": "helpCreateWayReshape",
      "create.baseStands.wayClick": "helpCreateWayClick",
      "create.baseStands.wayRect": "helpCreateWayRect",
      "create.baseStands.wayPoly": "helpCreateWayPoly",
      "create.baseStands.wayList": "helpCreateWayList",
      edit: "helpEdit",
      "edit.selected": "helpEditSelected",
      "edit.selected.baseStands": "helpEditSelectedBaseStands",
      "edit.selected.baseStands.wayReshape": "helpEditWayReshape",
      "edit.selected.baseStands.wayClick": "helpEditSelectedWayClick",
      "edit.selected.baseStands.wayRect": "helpEditSelectedWayRect",
      "edit.selected.baseStands.wayPoly": "helpEditSelectedWayPoly",
      "edit.selected.baseStands.wayList": "helpEditSelectedWayList",
    };

    const key = helpKeys[data.currentState];
    return translate(key) || "";
  };

  /**
 * Get display name for current state
 */
  const getStateDisplayName = (): string => {
    const stateKeys: Record<string, string> = {
      'init': 'stateInit',
      'create': 'stateCreate',
      'create.baseStands': 'stateCreateBaseStands',
      'create.baseStands.wayClick': 'stateCreateWayClick',
      'create.baseStands.wayRect': 'stateCreateWayRect',
      'create.baseStands.wayPoly': 'stateCreateWayPoly',
      'create.baseStands.wayList': 'stateCreateWayList',
      'edit': 'stateEdit',
      'edit.selected': 'stateEditSelected',
      'edit.selected.baseStands': 'stateEditSelectedBaseStands',
      'edit.selected.baseStands.wayClick': 'stateEditSelectedWayClick',
      'edit.selected.baseStands.wayRect': 'stateEditSelectedWayRect',
      'edit.selected.baseStands.wayPoly': 'stateEditSelectedWayPoly',
      'edit.selected.baseStands.wayList': 'stateEditSelectedWayList',
    };
    const key = stateKeys[data.currentState];
    return key ? translate(key) : data.currentState;
  };

  /**
   * Check if save button should be shown
   */
  const shouldShowSaveButton = (): boolean => {
    return data.workUnitStands.length > 0;
  };

  /**
   * Check if save button should be enabled
   */
  const isSaveButtonEnabled = (): boolean => {
    if (data.workUnitStands.length === 0) return false;

    // In create mode, always enabled if there are stands
    if (data.currentState.startsWith("create")) {
      return true;
    }

    // In edit mode, check if polygon geometry changed
    if (!data.wuPolygonFinal || !data.initialPolygon) {
      return false;
    }

    return !equalsOperator.execute(data.wuPolygonFinal, data.initialPolygon);
  };

  /**
   * Render loading spinner
   */
  const renderLoading = () => {
    if (!data.isLoading) return null;

    return (
      <div className="loading-overlay">
        <div className="loading-spinner"></div>
        <div className="loading-message">{data.loadingMessage}</div>
      </div>
    );
  };

  /**
     * Render waiting dialog when work unit is locked
     */
  const renderWaitingDialog = () => {
    if (!data.isWaiting) return null;

    // Calculate elapsed time
    const ElapsedTimer = () => {
      const [elapsed, setElapsed] = React.useState(0);

      React.useEffect(() => {
        const interval = setInterval(() => {
          const now = Date.now();
          const diff = Math.floor((now - data.waitingStartTime) / 1000);
          setElapsed(diff);
        }, 1000);

        return () => clearInterval(interval);
      }, []);

      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      return (
        <div style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: '#0079c1',
          marginBottom: '16px',
          fontFamily: 'monospace'
        }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
      );
    };

    const dialogContent = (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}>
        <div style={{
          backgroundColor: '#fff',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          direction: 'rtl',
          maxWidth: '320px',
          minWidth: '280px'
        }}>
          <div style={{ marginBottom: '16px', fontSize: '14px' }}>
            י"ע <strong>{data.lockedWorkUnitId}</strong> נערכת כעת ע"י משתמש אחר
          </div>
          <ElapsedTimer />
          <div style={{ marginBottom: '16px', fontSize: '13px', color: '#666' }}>
            בודק שוב כל 25 שניות...
          </div>
          <button
            className="esri-button"
            onClick={() => {
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
              setData(prev => ({
                ...prev,
                isWaiting: false,
                lockedWorkUnitId: '',
                editingWorkUnit: null,
                waitingStartTime: 0,
                currentState: 'init'
              }));
            }}
            style={{ minWidth: '80px' }}
          >
            {translate('cancelWaiting')}
          </button>
        </div>
      </div>
    );

    return ReactDOM.createPortal(dialogContent, document.body);
  };

  /**
 * Render correction confirmation dialog
 */
  const renderCorrectionDialog = (): React.ReactElement | null => {
    if (!data.correctionDialog?.visible) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          textAlign: 'center',
          direction: 'rtl',
          minWidth: '300px'
        }}>
          <p style={{ marginBottom: '16px', fontSize: '16px' }}>
            {data.correctionDialog.message || translate('correctionDialogMessage')}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => handleCorrectionChoice('add')}
              style={{
                padding: '8px 20px',
                borderRadius: '4px',
                border: 'none',
                background: '#4CAF50',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {translate('correctionDialogAdd')}
            </button>
            <button
              onClick={() => handleCorrectionChoice('remove')}
              style={{
                padding: '8px 20px',
                borderRadius: '4px',
                border: 'none',
                background: '#f44336',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {translate('correctionDialogRemove')}
            </button>
            <button
              onClick={() => handleCorrectionChoice('cancel')}
              style={{
                padding: '8px 20px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                background: '#e0e0e0',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {translate('correctionDialogCancel')}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /**
 * Render work unit selector when multiple work units overlap (inline in widget)
 */
  const renderWorkUnitSelector = () => {
    if (!data.showWorkUnitSelector || data.overlappingWorkUnits.length === 0) {
      return null;
    }

    const selectedWU = data.overlappingWorkUnits[data.selectedOverlappingIndex];

    // Parse stands string for display
    const parseStandsForDisplay = (standsStr: string): { compartmentNum: number; standNum: number }[] => {
      if (!standsStr || standsStr.trim() === '') return [];
      const result: { compartmentNum: number; standNum: number }[] = [];
      const parts = standsStr.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\d+)-(\d+)$/);
        if (match) {
          result.push({
            compartmentNum: parseInt(match[1]),
            standNum: parseInt(match[2])
          });
        }
      }
      return result;
    };

    // Format stands for display (grouped by compartment)
    const formatSelectorStands = (standsStr: string): React.ReactNode => {
      const stands = parseStandsForDisplay(standsStr);
      if (stands.length === 0) return translate('emptyList');

      const byCompartment: { [key: number]: number[] } = {};
      stands.forEach(s => {
        if (!byCompartment[s.compartmentNum]) {
          byCompartment[s.compartmentNum] = [];
        }
        byCompartment[s.compartmentNum].push(s.standNum);
      });

      const compartments = Object.keys(byCompartment)
        .map(Number)
        .sort((a, b) => a - b);

      return compartments.map((comp, compIndex) => {
        const compStands = byCompartment[comp].sort((a, b) => a - b);
        return (
          <span key={comp}>
            {comp}({compStands.join(',')})
            {compIndex < compartments.length - 1 ? ', ' : ''}
          </span>
        );
      });
    };

    const getStandsCount = (standsStr: string): number => {
      if (!standsStr || standsStr.trim() === '') return 0;
      return standsStr.split(',').filter(s => s.trim()).length;
    };

    return (
      <div
        className="field-container"
        style={{
          border: '2px dashed #0079c1',
          borderRadius: '6px',
          padding: '12px',
          backgroundColor: '#f8fbff'
        }}
      >
        {/* Prompt text - centered */}
        <div style={{ marginBottom: '8px', color: '#666', fontSize: '13px', textAlign: 'center' }}>
          {translate('selectWorkUnitPrompt')}
        </div>

        {/* Dropdown */}
        <div className="field-row">
          <label className="field-label">{translate('selectWorkUnit')}:</label>
          <select
            className="esri-dropdown"
            value={data.selectedOverlappingIndex}
            onChange={(e) => handleWorkUnitSelectorChange(parseInt(e.target.value))}
          >
            {data.overlappingWorkUnits.map((wu, index) => (
              <option key={wu.objectId} value={index}>
                {wu.workUnitId} ({getStandsCount(wu.stands)} {translate('stands')})
              </option>
            ))}
          </select>
        </div>

        {/* Stands list of selected work unit */}
        {selectedWU && (
          <div className="field-container" style={{ marginTop: '8px' }}>
            <div className="list-header">
              <label className="field-label-right">
                {translate('workUnitStandsPrefix')} {selectedWU.workUnitId}:
              </label>
              <button
                className="wrap-button"
                onClick={() => toggleWrap('selectorStands')}
              >
                {wrappedLists.selectorStands ? translate('doEachLineUnWrap') : translate('doEachLineWrap')}
              </button>
            </div>
            <div className={`stands-list${wrappedLists.selectorStands ? ' wrapped' : ''}`}>
              {formatSelectorStands(selectedWU.stands)}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="bottom-buttons" style={{ marginTop: '12px' }}>
          <button
            className="esri-button"
            onClick={handleWorkUnitSelectorCancel}
          >
            {translate('cancel')}
          </button>
          <button
            className="esri-button active"
            onClick={handleWorkUnitSelectorConfirm}
          >
            {translate('select')}
          </button>
        </div>
      </div>
    );
  };
  /**
 * Render work unit selector when multiple work units overlap (inline in widget)
 */
  const renderWorkUnitSelectorOld = () => {
    if (!data.showWorkUnitSelector || data.overlappingWorkUnits.length === 0) {
      return null;
    }

    const selectedWU = data.overlappingWorkUnits[data.selectedOverlappingIndex];

    // Parse stands string for display
    const parseStandsForDisplay = (standsStr: string): { compartmentNum: number; standNum: number }[] => {
      if (!standsStr || standsStr.trim() === '') return [];
      const result: { compartmentNum: number; standNum: number }[] = [];
      const parts = standsStr.split(',');
      for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\d+)-(\d+)$/);
        if (match) {
          result.push({
            compartmentNum: parseInt(match[1]),
            standNum: parseInt(match[2])
          });
        }
      }
      return result;
    };

    // Format stands for display (grouped by compartment)
    const formatSelectorStands = (standsStr: string): React.ReactNode => {
      const stands = parseStandsForDisplay(standsStr);
      if (stands.length === 0) return translate('emptyList');

      const byCompartment: { [key: number]: number[] } = {};
      stands.forEach(s => {
        if (!byCompartment[s.compartmentNum]) {
          byCompartment[s.compartmentNum] = [];
        }
        byCompartment[s.compartmentNum].push(s.standNum);
      });

      const compartments = Object.keys(byCompartment)
        .map(Number)
        .sort((a, b) => a - b);

      return compartments.map((comp, compIndex) => {
        const compStands = byCompartment[comp].sort((a, b) => a - b);
        return (
          <span key={comp}>
            {comp}({compStands.join(',')})
            {compIndex < compartments.length - 1 ? ', ' : ''}
          </span>
        );
      });
    };

    const getStandsCount = (standsStr: string): number => {
      if (!standsStr || standsStr.trim() === '') return 0;
      return standsStr.split(',').filter(s => s.trim()).length;
    };

    return (
      <div className="field-container">
        {/* Prompt text */}
        <div style={{ marginBottom: '8px', color: '#666', fontSize: '13px' }}>
          {translate('selectWorkUnitPrompt')}
        </div>

        {/* Dropdown */}
        <div className="field-row">
          <label className="field-label">{translate('selectWorkUnit')}:</label>
          <select
            className="esri-dropdown"
            value={data.selectedOverlappingIndex}
            onChange={(e) => handleWorkUnitSelectorChange(parseInt(e.target.value))}
          >
            {data.overlappingWorkUnits.map((wu, index) => (
              <option key={wu.objectId} value={index}>
                {wu.workUnitId} ({getStandsCount(wu.stands)} {translate('stands')})
              </option>
            ))}
          </select>
        </div>

        {/* Stands list of selected work unit */}
        {selectedWU && (
          <div className="field-container" style={{ marginTop: '8px' }}>
            <div className="list-header">
              <label className="field-label-right">
                {translate('workUnitStandsPrefix')} {selectedWU.workUnitId}:
              </label>
              <button
                className="wrap-button"
                onClick={() => toggleWrap('selectorStands')}
              >
                {wrappedLists.selectorStands ? translate('doEachLineUnWrap') : translate('doEachLineWrap')}
              </button>
            </div>
            <div className={`stands-list${wrappedLists.selectorStands ? ' wrapped' : ''}`}>
              {formatSelectorStands(selectedWU.stands)}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="bottom-buttons" style={{ marginTop: '12px' }}>
          <button
            className="esri-button"
            onClick={handleWorkUnitSelectorCancel}
          >
            {translate('cancel')}
          </button>
          <button
            className="esri-button active"
            onClick={handleWorkUnitSelectorConfirm}
          >
            {translate('select')}
          </button>
        </div>
      </div>
    );
  };


  /**
   * Render error message
   */
  const renderError = () => {
    if (!data.errorMessage) return null;

    return (
      <div className="error-message" onClick={clearError}>
        {data.errorMessage}
      </div>
    );
  };

  /**
   * Render cancel button (aligned left)
   */
  const renderCancelButton = () => (
    <div style={{ marginTop: "16px", textAlign: "left" }}>
      <button className="esri-button" onClick={resetToInit} style={{ width: "auto" }}>
        {translate("cancelAll")}
      </button>
    </div>
  );

  /**
   * Render init state
   */
  const renderInitState = () => <div>{/* No content needed - buttons are in header */}</div>;

  /**
   * Render base selection dropdown
   */
  const renderBaseSelection = () => {
    const isCreate = data.currentState.startsWith("create");
    const baseState = isCreate ? "create.baseStands" : "edit.selected.baseStands";

    // Check if base is already selected (we're in a baseStands state)
    const isBaseSelected = data.currentState.includes(".baseStands");

    return (
      <div className="field-container">
        <div className="field-row">
          <label className="field-label">{translate("selectBase")}:</label>
          <select
            className="esri-dropdown"
            value={isBaseSelected ? "stands" : ""}
            onChange={(e) => {
              if (e.target.value === "stands") {
                goToState(baseState as WidgetState, "User selected base: stands");
              }
            }}
          >
            <option value="" disabled>---</option>
            <option value="stands">{translate("baseStands")}</option>
            <option value="line" disabled>
              {translate("baseLine")}
            </option>
            <option value="freeDraw" disabled>
              {translate("baseFreeDraw")}
            </option>
            <option value="polygonFromLayer" disabled>
              {translate("basePolygonFromLayer")}
            </option>
          </select>
        </div>
      </div>
    );
  };

  /**
 * Render way selection dropdown
 */
  const renderWaySelection = () => {
    // Get config with defaults
    const config = { ...defaultConfig, ...props.config };

    // Check if dropdown should be disabled
    const hasTemporaryStands = data.standsToAdd.length > 0 || data.standsToRemove.length > 0;
    const isDrawingOrPending = data.isDrawing || data.isDrawingCorrectionLine || data.isDrawingCorrectionPolygon || !!data.pendingCorrection;
    const isDropdownDisabled = isDrawingOrPending || (config.wayChangeWithTempListBehavior === 'block' && hasTemporaryStands);

    // Determine current way from state
    let currentWay = '';
    if (data.currentState.endsWith('.wayReshape')) {
      currentWay = 'wayReshape';
    } else if (data.currentState.endsWith('.wayClick')) {
      currentWay = 'wayClick';
    } else if (data.currentState.endsWith('.wayRect')) {
      currentWay = 'wayRect';
    } else if (data.currentState.endsWith('.wayPoly')) {
      currentWay = 'wayPoly';
    } else if (data.currentState.endsWith('.wayList')) {
      currentWay = 'wayList';
    }

    // wayReshape available: always in edit mode, only if workUnitStands > 0 in create mode
    const isEditMode = data.currentState.startsWith('edit.');
    const showWayReshape = isEditMode || data.workUnitStands.length > 0;

    return (
      <div className="field-container">
        <div className="field-row">
          <label className="field-label">{translate('selectWay')}:</label>
          <select
            className="esri-dropdown"
            value={currentWay}
            onChange={(e) => handleWayChange(e.target.value)}
            disabled={isDropdownDisabled}
          >
            <option value="" disabled>---</option>
            {showWayReshape && (
              <option value="wayReshape">{translate('wayReshape')}</option>
            )}
            <option value="wayClick">{translate('wayClick')}</option>
            <option value="wayRect">{translate('wayRect')}</option>
            <option value="wayPoly">{translate('wayPoly')}</option>
            <option value="wayList">{translate('wayList')}</option>
          </select>
        </div>
      </div>
    );
  };

  /**
   * Render forest and stands info
   *    * Order: Forest+Message -> DrawButtons -> StandsToAdd -> WorkUnitStands
   */
  const renderForestAndStands = () => {
    const isWayRectState =
      data.currentState === 'create.baseStands.wayRect' ||
      data.currentState === 'edit.selected.baseStands.wayRect';

    const isWayPolyState =
      data.currentState === 'create.baseStands.wayPoly' ||
      data.currentState === 'edit.selected.baseStands.wayPoly';

    const isWayListState =
      data.currentState === 'create.baseStands.wayList' ||
      data.currentState === 'edit.selected.baseStands.wayList';

    const isWayReshapeState =
      data.currentState === 'create.baseStands.wayReshape' ||
      data.currentState === 'edit.selected.baseStands.wayReshape';

    const isDrawingState = isWayRectState || isWayPolyState;

    const drawAddButtonText = isWayPolyState ? translate('drawPolyAdd') : translate('drawRectAdd');
    const drawRemoveButtonText = isWayPolyState ? translate('drawPolyRemove') : translate('drawRectRemove');

    return (
      <div>
        {/* Forest + WorkUnitId + Message row (not for wayList) */}
        {!isWayListState && (
          <div className="info-row">
            {data.selectedForest && (
              <div className="info-item">
                <label className="field-label">{translate('forest')}:</label>
                <span className="field-value">{data.selectedForest.forestName}</span>
                {data.isLoadingStands && (
                  <span className="loading-stands">
                    <span className="loading-spinner-small"></span>
                  </span>
                )}
              </div>
            )}
            {data.lastMessage && (
              <div className="info-item">
                <label className="field-label">{translate('message')}:</label>
                <span className={`message-text${data.lastMessageType === 'warning' ? ' warning' : ''}`}>{data.lastMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Draw buttons (wayRect or wayPoly) */}
        {isDrawingState && (
          <div className="draw-buttons">
            <button
              className="esri-button"
              onClick={startDrawingForAdd}
              disabled={data.isDrawing}
            >
              {drawAddButtonText}
            </button>
            <button
              className="esri-button"
              onClick={startDrawingForRemove}
              disabled={data.isDrawing || (data.workUnitStands.length === 0 && data.standsToAdd.length === 0)}
            >
              {drawRemoveButtonText}
            </button>
            {data.isDrawing && (
              <button className="esri-button" onClick={cancelDrawing}>
                {translate('cancelDrawing')}
              </button>
            )}
          </div>
        )}

        {/* Correction drawing buttons (wayReshape only) */}
        {isWayReshapeState && (
          <div className="draw-buttons">
            <button
              className="esri-button"
              onClick={startDrawingCorrectionLine}
              disabled={data.isDrawingCorrectionLine || data.isDrawingCorrectionPolygon || !!data.pendingCorrection}
            >
              {translate('drawCorrectionPolyline')}
            </button>
            <button
              className="esri-button"
              onClick={startDrawingCorrectionPolygon}
              disabled={data.isDrawingCorrectionLine || data.isDrawingCorrectionPolygon || !!data.pendingCorrection}
            >
              {translate('drawCorrectionPolygon')}
            </button>
            {(data.isDrawingCorrectionLine || data.isDrawingCorrectionPolygon) && (
              <button className="esri-button" onClick={cancelDrawing}>
                {translate('cancelDrawing')}
              </button>
            )}
          </div>
        )}

        {/* Pending correction - stands list + buttons (wayReshape only) */}
        {isWayReshapeState && data.pendingCorrection && (
          <div className="field-container">
            <div className="list-header">
              <label className="field-label-right">{translate('standsToAddOrRemove')}:</label>
              <button
                className="wrap-button"
                onClick={() => toggleWrap('pendingCorrection')}
              >
                {wrappedLists.pendingCorrection ? translate('doEachLineUnWrap') : translate('doEachLineWrap')}
              </button>
            </div>
            {data.pendingCorrection!.standsListAffectedByReshapeLine.length > 0 && (
              <div className={`${data.pendingCorrection!.operationType === 'remove' ? 'stands-to-remove-list' : 'stands-to-add-list'}${wrappedLists.pendingCorrection ? ' wrapped' : ''}`}>
                {formatStandsListJsx(data.pendingCorrection!.standsListAffectedByReshapeLine, data.pendingCorrection!.standsListAffectedByReshapeLine.map(s => `${s.compartmentNum}-${s.standNum}`), data.workUnitStands)}
              </div>
            )}
            <div className="stands-action-buttons">
              <button className="esri-button" onClick={confirmPendingCorrection}>
                {translate('confirmCorrection')}
              </button>
              <button className="esri-button" onClick={cancelPendingCorrection}>
                {translate('cancelCorrection')}
              </button>
            </div>
          </div>
        )}

        {/* List dropdowns and checkboxes (wayList only) */}
        {renderWayListSelection()}

        {/* Stands to add list + action buttons */}
        {data.standsToAdd.length > 0 && (
          <div className="field-container">
            <div className="list-header">
              <label className="field-label-right">{translate('standsToAdd')}:</label>
              <button
                className="wrap-button"
                onClick={() => toggleWrap('standsToAdd')}
              >
                {wrappedLists.standsToAdd ? translate('doEachLineUnWrap') : translate('doEachLineWrap')}
              </button>
            </div>
            <div className={`stands-to-add-list${wrappedLists.standsToAdd ? ' wrapped' : ''}`}>
              {formatStandsListJsx(data.standsToAdd, data.lastDrawnStandIds, [])}
            </div>
            <div className="stands-action-buttons">
              <button className="esri-button" onClick={commitWholeStandsToAdd}>
                {translate('addStands')}
              </button>
              <button className="esri-button" onClick={clearStandsToAdd}>
                {translate('clearStandsToAdd')}
              </button>
            </div>
          </div>
        )}

        {/* Stands to remove list + action buttons */}
        {data.standsToRemove.length > 0 && (
          <div className="field-container">
            <div className="list-header">
              <label className="field-label-right">{translate('standsToRemove')}:</label>
              <button
                className="wrap-button"
                onClick={() => toggleWrap('standsToRemove')}
              >
                {wrappedLists.standsToRemove ? translate('doEachLineUnWrap') : translate('doEachLineWrap')}
              </button>
            </div>
            <div className={`stands-to-remove-list${wrappedLists.standsToRemove ? ' wrapped' : ''}`}>
              {formatStandsListJsx(data.standsToRemove, [], [])}
            </div>
            <div className="stands-action-buttons">
              <button className="esri-button" onClick={commitWholeStandsRemove}>
                {translate('confirmRemoval')}
              </button>
              <button className="esri-button" onClick={cancelRemoval}>
                {translate('cancelRemoval')}
              </button>
            </div>
          </div>
        )}

        {/* Work unit stands */}
        <div className="field-container">
          <div className="list-header">
            <label className="field-label-right">
              {translate('workUnitStandsPrefix')}
              {data.editingWorkUnit && ` ${data.editingWorkUnit.workUnitId}`}
              {' '}{translate('workUnitStandsSuffix')}:
            </label>
            <button
              className="wrap-button"
              onClick={() => toggleWrap('workUnitStands')}
            >
              {wrappedLists.workUnitStands ? translate('doEachLineUnWrap') : translate('doEachLineWrap')}
            </button>
          </div>
          <div className={`stands-list${data.workUnitStands.length === 0 ? ' empty' : ''}${wrappedLists.workUnitStands ? ' wrapped' : ''}`}>
            {(() => {
              const isEditMode = data.currentState.startsWith('edit');

              // Use composite keys instead of objectId
              const initialKeys = new Set(data.initialStands.map(s => `${s.compartmentNum}-${s.standNum}`));
              const currentKeys = new Set(data.workUnitStands.map(s => `${s.compartmentNum}-${s.standNum}`));

              // Stands that were removed (in initial but not in current)
              const removedStands = isEditMode
                ? data.initialStands
                  .filter(s => !currentKeys.has(`${s.compartmentNum}-${s.standNum}`))
                  .map(s => ({ ...s, isRemoved: true }))
                : [];

              const standsToDisplay = [...data.workUnitStands, ...removedStands];

              return standsToDisplay.length > 0
                ? formatStandsListJsx(standsToDisplay, data.lastAddedStandIds, isEditMode ? data.initialStands : [])
                : translate('emptyList');
            })()}
          </div>
        </div>
      </div>
    );
  };

  /**
 * Highlight a compartment on hover
 */
  const highlightCompartmentOnHover = (compartmentNum: number) => {
    if (!hoverHighlightLayerRef.current) return;

    hoverHighlightLayerRef.current.removeAll();

    // Find compartment polygon from compartmentsLayerRef
    if (!compartmentsLayerRef.current) return;

    const compartmentGraphic = compartmentsLayerRef.current.graphics.find(
      g => g.attributes?.compartmentNum === compartmentNum
    );

    if (compartmentGraphic?.geometry) {
      const hoverSymbol = new SimpleFillSymbol({
        color: [255, 255, 0, 0.3], // Yellow semi-transparent
        outline: { color: [255, 200, 0, 1], width: 4 }
      });

      const hoverGraphic = new Graphic({
        geometry: compartmentGraphic.geometry,
        symbol: hoverSymbol
      });

      hoverHighlightLayerRef.current.add(hoverGraphic);
    }
  };

  /**
   * Clear hover highlight
   */
  const clearHoverHighlight = () => {
    if (hoverHighlightLayerRef.current) {
      hoverHighlightLayerRef.current.removeAll();
    }
  };

  /**
   * Highlight a stand on hover
   */
  const highlightStandOnHover = (stand: Stand) => {
    if (!hoverHighlightLayerRef.current || !stand.geometry) return;

    hoverHighlightLayerRef.current.removeAll();
    console.log('[HOVER] Raw geometry:', stand.geometry);
    console.log('[HOVER] Has rings:', !!(stand.geometry as any).rings);
    console.log('[HOVER] Has type:', (stand.geometry as any).type);
    // Reconstruct geometry if it's a plain object from localStorage
    let geometry = stand.geometry;
    if (!(geometry instanceof Polygon)) {
      //geometry = Polygon.fromJSON(geometry);
      geometry = new Polygon({
        rings: (stand.geometry as any).rings,
        spatialReference: (stand.geometry as any).spatialReference
      });
    }

    const hoverSymbol = new SimpleFillSymbol({
      color: [255, 255, 0, 0.4], // Yellow semi-transparent
      outline: { color: [255, 200, 0, 1], width: 3 }
    });

    const hoverGraphic = new Graphic({
      geometry: stand.geometry,
      symbol: hoverSymbol
    });

    hoverHighlightLayerRef.current.add(hoverGraphic);
  };

  /**
 * Render wayList selection dropdowns and checkboxes
 */
  const renderWayListSelection = () => {
    const isWayListState =
      data.currentState === 'create.baseStands.wayList' ||
      data.currentState === 'edit.selected.baseStands.wayList';

    if (!isWayListState) return null;

    const isEditMode = data.currentState.startsWith('edit.');
    const canChangeForest = !isEditMode && data.workUnitStands.length === 0 && data.standsToAdd.length === 0;
    const committedKeys = new Set(data.workUnitStands.map(s => `${s.compartmentNum}-${s.standNum}`));
    const standsToAddKeys = new Set(data.standsToAdd.map(s => `${s.compartmentNum}-${s.standNum}`));

    // הצג checkboxes רק אם יש חלקה נבחרת ויש עומדים זמינים
    const showStandsCheckboxes = data.selectedCompartment && data.availableStands.length > 0;
    const standsToRemoveKeys = new Set(data.standsToRemove.map(s => `${s.compartmentNum}-${s.standNum}`));
    const initialKeys = new Set(data.initialStands.map(s => `${s.compartmentNum}-${s.standNum}`));

    return (
      <div className="field-container">
        {/* Forest dropdown - standard (no hover needed) */}
        <div className="field-row">
          <label className="field-label">{translate('selectForest')}:</label>
          <select
            className="esri-dropdown"
            value={data.selectedForest?.forestNum || ''}
            onChange={(e) => {
              const forestNum = parseInt(e.target.value);
              if (forestNum) handleForestSelect(forestNum);
            }}
            disabled={!canChangeForest}
          >
            <option value="" disabled>---</option>
            {data.availableForests.map(f => (
              <option key={f.forestNum} value={f.forestNum}>
                {f.forestName}
              </option>
            ))}
          </select>
        </div>

        {/* Compartment custom dropdown with hover */}
        {data.selectedForest && (
          <div className="field-row">
            <label className="field-label">{translate('selectCompartment')}:</label>
            <select
              className="esri-dropdown"
              value={data.selectedCompartment?.compartmentNum || ''}
              onChange={(e) => {
                clearHoverHighlight();
                const compNum = parseInt(e.target.value);
                if (compNum) handleCompartmentSelect(compNum);
              }}
              onBlur={clearHoverHighlight}
            >
              <option value="" disabled>---</option>
              {data.availableCompartments.map(c => (
                <option
                  key={c.compartmentNum}
                  value={c.compartmentNum}
                  onMouseEnter={() => highlightCompartmentOnHover(c.compartmentNum)}
                  onMouseLeave={clearHoverHighlight}
                >
                  {c.compartmentNum}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stands checkboxes with label with hover */}
        {showStandsCheckboxes && (
          <div className="field-row">
            <label className="field-label">{translate('selectStands')}:</label>
            <div className="stands-checkboxes">
              {data.availableStands.map(stand => {
                const standKey = `${stand.compartmentNum}-${stand.standNum}`;
                const isCommitted = committedKeys.has(standKey);
                const isInToAdd = standsToAddKeys.has(standKey);
                const isInToRemove = standsToRemoveKeys.has(standKey);
                const isOriginal = initialKeys.has(standKey);

                // Checked if: in standsToAdd, OR in workUnitStands but NOT in standsToRemove
                const isChecked = isInToAdd || (isCommitted && !isInToRemove);

                // Was original but no longer in workUnitStands (removed)
                const isRemovedOriginal = isOriginal && !isCommitted;

                // Determine label suffix
                let labelSuffix = '';
                if (isOriginal) {
                  labelSuffix = ` (${translate('inOriginalWorkUnit')})`;
                } else if (isCommitted && !isOriginal) {
                  // Not original but already committed (added and confirmed)
                  labelSuffix = ` (${translate('toAdd')})`;
                }

                // Determine label style - red + strikethrough for removed originals
                const labelStyle: React.CSSProperties = isRemovedOriginal || isInToRemove
                  ? { color: '#c62828', textDecoration: 'line-through', fontWeight: 'bold' }
                  : {};

                return (
                  <div
                    key={standKey}
                    className={`stand-checkbox-item${isInToRemove ? ' to-remove' : ''}`}
                    onMouseEnter={() => {
                      console.log('[HOVER] Stand:', stand.standNum, 'has geometry:', !!stand.geometry);
                      highlightStandOnHover(stand);
                    }}
                    onMouseLeave={clearHoverHighlight}
                  >
                    <input
                      type="checkbox"
                      id={`stand-${stand.compartmentNum}-${stand.standNum}`}
                      checked={isChecked}
                      onChange={(e) => handleStandToggle(stand, e.target.checked)}
                    />
                    <label htmlFor={`stand-${stand.compartmentNum}-${stand.standNum}`} style={labelStyle}>
                      {stand.isPartial ? `${stand.standNum}*` : stand.standNum}
                      {labelSuffix}
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Message - only in wayList */}
        {data.lastMessage && (
          <div className="field-row" style={{ marginTop: '8px' }}>
            <label className="field-label">{translate('message')}:</label>
            <span className={`message-text${data.lastMessageType === 'warning' ? ' warning' : ''}`}>
              {data.lastMessage}
            </span>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render action buttons (save, cancel) - bottom row
   * RTL: Cancel on right, Save on left
   */
  const renderActionButtons = () => (
    <div className="bottom-buttons">
      <button
        className="esri-button"
        onClick={resetToInit}
        style={{ width: 'auto' }}
      >
        {translate('cancelAll')}
      </button>

      {/* Delete button - only in edit mode with selected work unit */}
      {data.editingWorkUnit && data.currentState.startsWith('edit.selected.baseStands') && (
        <button
          className="esri-button"
          onClick={deleteCurrentWorkUnit}
          style={{ backgroundColor: '#ffebee', color: '#c62828', borderColor: '#ef5350' }}
        >
          {translate('deleteWorkUnit')}
        </button>
      )}

      {shouldShowSaveButton() && (
        <button
          className={'esri-button' + (isSaveButtonEnabled() ? ' active' : '')}
          disabled={!isSaveButtonEnabled()}
          onClick={saveWorkUnit}
        >
          {translate('finishAndSave')}
        </button>
      )}
    </div>
  );

  /**
   * Render create state - only base dropdown
   */
  const renderCreateState = () => (
    <div>
      {renderBaseSelection()}
      {renderCancelButton()}
    </div>
  );

  /**
   * Render create.baseStands.* states - base dropdown + way dropdown
   */
  const renderCreateBaseStandsState = () => (
    <div>
      {renderBaseSelection()}
      {renderWaySelection()}
      <div className="separator"></div>
      {renderForestAndStands()}
      {renderActionButtons()}
    </div>
  );

  /**
   * Render edit state
   */
  const renderEditState = () => (
    <div>
      {data.showWorkUnitSelector ? (
        renderWorkUnitSelector()
      ) : (
        <div className="field-container" style={{ textAlign: 'center' }}>
          <p>{translate("clickOnWorkUnitToEdit")}</p>
        </div>
      )}
      {!data.showWorkUnitSelector && renderCancelButton()}
    </div>
  );

  /**
   * Render edit.selected.baseStands.* states - base dropdown + way dropdown
   */
  const renderEditSelectedBaseStandsState = () => (
    <div>
      {renderBaseSelection()}
      {renderWaySelection()}
      <div className="separator"></div>
      {renderForestAndStands()}
      {renderActionButtons()}
    </div>
  );

  /**
   * Render content based on current state
   */
  const renderContent = () => {
    switch (data.currentState) {
      case "init":
        return renderInitState();

      case "create":
        return renderCreateState();

      case "create.baseStands":
      case "create.baseStands.wayReshape":
      case "create.baseStands.wayClick":
      case "create.baseStands.wayRect":
      case "create.baseStands.wayPoly":
      case "create.baseStands.wayList":
        return renderCreateBaseStandsState();

      case "edit":
        return renderEditState();

      case "edit.selected.baseStands":
      case "edit.selected.baseStands.wayReshape":
      case "edit.selected.baseStands.wayClick":
      case "edit.selected.baseStands.wayRect":
      case "edit.selected.baseStands.wayPoly":
      case "edit.selected.baseStands.wayList":
        return renderEditSelectedBaseStandsState();

      default:
        return <div>Unknown state: {data.currentState}</div>;
    }
  };

  // === Main render ===
  return (
    <div ref={widgetRef} className="define-work-unit-widget" css={getWidgetStyles()}>
      {/* Map connection - hidden component */}
      {mapWidgetId && <JimuMapViewComponent useMapWidgetId={mapWidgetId} onActiveViewChange={onActiveViewChange} />}

      {isDebugMode && (
        <div className="debug-state">
          State: {data.currentState} | Map: {jimuMapView ? "Connected" : "Not connected"}
        </div>
      )}

      {/* Header: create/edit buttons + help button */}
      <div className="widget-header">
        <div className="header-main-buttons">
          <button
            className={"esri-button" + (data.currentState.startsWith("create") ? " active" : "")}
            disabled={data.currentState.startsWith("edit") && data.currentState !== "init"}
            onClick={() => {
              if (data.currentState === "init") {
                jimuMapView?.clearSelectedFeatures();
                goToState("create.baseStands", "User clicked Create (skipping base selection)");
              }
            }}
          >
            {translate("createNewWorkUnit")}
          </button>
          <button
            className={"esri-button" + (data.currentState.startsWith("edit") ? " active" : "")}
            disabled={data.currentState.startsWith("create") && data.currentState !== "init"}
            onClick={() => {
              if (data.currentState === "init") {
                jimuMapView?.clearSelectedFeatures();
                goToState("edit", "User clicked Edit");
              }
            }}
          >
            {translate("editExistingWorkUnit")}
          </button>
        </div>

        <button
          className="esri-button help-button"
          onClick={toggleHelp}
          onMouseEnter={showHelpOnHover}
          onMouseLeave={hideHelpOnLeave}
        >
          {translate("help")}
        </button>
      </div>

      <div className="separator"></div>

      {renderError()}

      {renderContent()}

      {renderLoading()}

      {renderWaitingDialog()}

      {renderCorrectionDialog()}

      {/* Help Panel - rendered outside widget via Portal */}
      <HelpPanel
        isOpen={data.isHelpOpen}
        title={`עזרה - מצב ${getStateDisplayName()}`}
        content={getHelpText()}
        onClose={closeHelp}
        anchorRect={widgetRect}
        isHoverMode={isHelpHoverMode}
      />
    </div>
  );
}

export default Widget;
