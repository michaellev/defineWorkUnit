/**
 * data-source-utils.ts
 * Utility functions for working with Experience Builder DataSource API
 * 
 * This module provides helpers to:
 * 1. Find DataSources for layers (by layer reference or title)
 * 2. Apply filters using updateQueryParams (the EXB-native way)
 * 3. Clear filters
 * 
 * Why use DataSource API instead of layer.definitionExpression?
 * - EXB manages filters through DataSourceManager
 * - Direct definitionExpression changes get overwritten by EXB
 * - Using updateQueryParams ensures EXB tracks who applied which filter
 */

import { DataSourceManager, type FeatureLayerDataSource, type SqlQueryParams } from 'jimu-core';
import { type JimuMapView, type JimuLayerView } from 'jimu-arcgis';

// Type aliases for clarity (avoid importing non-existent types)
//type FeatureLayerDataSource = any;
//type SqlQueryParams = { where: string };
/**
 * Get the DataSource for a specific layer
 * 
 * @param jimuMapView - The JimuMapView instance
 * @param layer - The FeatureLayer to find DataSource for
 * @returns The FeatureLayerDataSource or null if not found
 * 
 * @example
 * const standsDs = getDataSourceForLayer(jimuMapView, layers.stands);
 * if (standsDs) {
 *   standsDs.updateQueryParams({ where: 'FOR_NO = 3410' }, widgetId);
 * }
 */
export function getDataSourceForLayer(
  jimuMapView: JimuMapView,
  layer: __esri.FeatureLayer
): FeatureLayerDataSource | null {
  if (!jimuMapView || !layer) return null;

  try {
    const jimuLayerViews = jimuMapView.jimuLayerViews;

    if (jimuLayerViews) {
      for (const key in jimuLayerViews) {
        const jimuLayerView = jimuLayerViews[key] as JimuLayerView;

        // Check if this JimuLayerView corresponds to our layer
        if (jimuLayerView?.layer === layer ||
          jimuLayerView?.layer?.id === layer.id) {
          
          const dsId = jimuLayerView.layerDataSourceId;
          if (!dsId) continue;

          // Method 1: Try getLayerDataSource() first
          try {
            const ds = jimuLayerView.getLayerDataSource?.();
            if (ds) {
              console.log('[DS] Found DataSource via getLayerDataSource for:', layer.title);
              return ds as FeatureLayerDataSource;
            }
          } catch (e) {
            // Method might not exist or throw
          }

          // Method 2: Try DataSourceManager directly
          const dsFromManager = DataSourceManager.getInstance().getDataSource(dsId);
          if (dsFromManager) {
            console.log('[DS] Found DataSource via DataSourceManager for:', layer.title);
            return dsFromManager as FeatureLayerDataSource;
          }

          // Method 3: Try through map DataSource's child DataSources
          const mapDsId = jimuMapView.dataSourceId;
          if (mapDsId) {
            const mapDs = DataSourceManager.getInstance().getDataSource(mapDsId);
            if (mapDs && typeof (mapDs as any).getChildDataSource === 'function') {
              const childDs = (mapDs as any).getChildDataSource(dsId);
              if (childDs) {
                console.log('[DS] Found DataSource via map child for:', layer.title);
                return childDs as FeatureLayerDataSource;
              }
            }
            
            // Method 4: Search through all child DataSources
            if (mapDs && typeof (mapDs as any).getChildDataSources === 'function') {
              const children = (mapDs as any).getChildDataSources() || [];
              for (const child of children) {
                if (child.id === dsId) {
                  console.log('[DS] Found DataSource in children for:', layer.title);
                  return child as FeatureLayerDataSource;
                }
              }
            }
          }

          console.log('[DS] DataSource ID exists but not initialized:', dsId);
        }
      }
    }

    console.log('[DS] DataSource not found for layer:', layer.title);
    return null;

  } catch (error) {
    console.error('[DS] Error finding DataSource:', error);
    return null;
  }
}

/**
 * Get DataSource for a layer by its title
 * 
 * @param jimuMapView - The JimuMapView instance
 * @param layerTitle - The title of the layer to find
 * @returns The FeatureLayerDataSource or null if not found
 */
export function getDataSourceByLayerTitle(
  jimuMapView: JimuMapView,
  layerTitle: string
): FeatureLayerDataSource | null {
  if (!jimuMapView?.view?.map || !layerTitle) return null;

  const layer = jimuMapView.view.map.allLayers.find(l => l.title === layerTitle);
  if (!layer) {
    console.warn('[DS] Layer not found by title:', layerTitle);
    return null;
  }

  return getDataSourceForLayer(jimuMapView, layer as __esri.FeatureLayer);
}

/**
 * Apply a filter to a layer using DataSource API
 * This is the EXB-native way that won't be overridden by the framework
 * 
 * @param jimuMapView - The JimuMapView instance
 * @param layer - The FeatureLayer to filter
 * @param where - SQL where clause (e.g., "FOR_NO = 3410")
 * @param widgetId - The widget ID (required by EXB to track who applied the filter)
 * @returns true if filter was applied successfully via DataSource API
 * 
 * @example
 * // Apply filter
 * applyFilterToLayer(jimuMapView, layers.stands, 'FOR_NO = 3410', props.id);
 * 
 * // Clear filter
 * applyFilterToLayer(jimuMapView, layers.stands, '1=1', props.id);
 */
export function applyFilterToLayer(
  jimuMapView: JimuMapView,
  layer: __esri.FeatureLayer,
  where: string,
  widgetId: string
): boolean {
  const ds = getDataSourceForLayer(jimuMapView, layer);

  if (!ds) {
    console.log('[DS] Cannot apply filter via DataSource - not found for:', layer?.title);
    // Fallback to direct layer manipulation (not recommended but ensures functionality)
    if (layer) {
      layer.definitionExpression = where === '1=1' ? null : where;
      console.log('[DS] Fallback: Applied filter directly to layer:', layer.title, '->', where);
    }
    return false;
  }

  try {
    const queryParams: SqlQueryParams = { where };
    ds.updateQueryParams(queryParams, widgetId);
    console.log('[DS] Filter applied via DataSource:', layer.title, '->', where);
    return true;
  } catch (error) {
    console.error('[DS] Error applying filter:', error);
    // Fallback on error
    if (layer) {
      layer.definitionExpression = where === '1=1' ? null : where;
      console.log('[DS] Fallback after error: Applied filter directly to layer');
    }
    return false;
  }
}

/**
 * Clear filter from a layer
 * 
 * @param jimuMapView - The JimuMapView instance
 * @param layer - The FeatureLayer to clear filter from
 * @param widgetId - The widget ID
 * @returns true if filter was cleared successfully
 */
export function clearFilterFromLayer(
  jimuMapView: JimuMapView,
  layer: __esri.FeatureLayer,
  widgetId: string
): boolean {
  return applyFilterToLayer(jimuMapView, layer, '1=1', widgetId);
}

/**
 * Apply filters to multiple layers at once
 * 
 * @param jimuMapView - The JimuMapView instance
 * @param filters - Array of {layer, where} objects
 * @param widgetId - The widget ID
 */
export function applyFiltersToLayers(
  jimuMapView: JimuMapView,
  filters: Array<{ layer: __esri.FeatureLayer; where: string }>,
  widgetId: string
): void {
  for (const { layer, where } of filters) {
    if (layer) {
      applyFilterToLayer(jimuMapView, layer, where, widgetId);
    }
  }
}

/**
 * Clear filters from multiple layers at once
 * 
 * @param jimuMapView - The JimuMapView instance
 * @param layers - Array of layers to clear filters from
 * @param widgetId - The widget ID
 */
export function clearFiltersFromLayers(
  jimuMapView: JimuMapView,
  layers: __esri.FeatureLayer[],
  widgetId: string
): void {
  for (const layer of layers) {
    if (layer) {
      clearFilterFromLayer(jimuMapView, layer, widgetId);
    }
  }
}

/**
 * Get all layer DataSources from the map
 * Useful for debugging or bulk operations
 * 
 * @param jimuMapView - The JimuMapView instance
 * @returns Map of layer title to DataSource
 */
export function getAllLayerDataSources(
  jimuMapView: JimuMapView
): Map<string, FeatureLayerDataSource> {
  const result = new Map<string, FeatureLayerDataSource>();

  if (!jimuMapView?.jimuLayerViews) return result;

  for (const key in jimuMapView.jimuLayerViews) {
    const jimuLayerView = jimuMapView.jimuLayerViews[key] as JimuLayerView;
    const layer = jimuLayerView?.layer as __esri.FeatureLayer;

    if (layer?.title && jimuLayerView.layerDataSourceId) {
      const ds = DataSourceManager.getInstance().getDataSource(
        jimuLayerView.layerDataSourceId
      ) as FeatureLayerDataSource;

      if (ds) {
        result.set(layer.title, ds);
      }
    }
  }

  console.log('[DS] Found DataSources for layers:', Array.from(result.keys()));
  return result;
}

/**
 * Debug: Log all available DataSources
 * Call this in onActiveViewChange to see what's available
 * 
 * @param jimuMapView - The JimuMapView instance
 */
export function debugLogDataSources(jimuMapView: JimuMapView): void {
  console.group('[DS DEBUG] Available DataSources');

  // Log map DataSource
  console.log('Map DataSource ID:', jimuMapView?.dataSourceId);

  // Log all JimuLayerViews
  if (jimuMapView?.jimuLayerViews) {
    console.log('JimuLayerViews:');
    for (const key in jimuMapView.jimuLayerViews) {
      const jlv = jimuMapView.jimuLayerViews[key] as JimuLayerView;
      const hasGetLayerDS = typeof jlv?.getLayerDataSource === 'function';
      console.log(`  - ${jlv?.layer?.title || 'unknown'}: dsId=${jlv?.layerDataSourceId || 'none'}, hasGetLayerDS=${hasGetLayerDS}`);
    }
  }

  // Log DataSourceManager state
  const dsManager = DataSourceManager.getInstance();
  const allDs = dsManager.getDataSources();
  console.log('All registered DataSources:', Object.keys(allDs));

  // Log map DataSource details
  const mapDsId = jimuMapView?.dataSourceId;
  if (mapDsId) {
    const mapDs = dsManager.getDataSource(mapDsId);
    if (mapDs) {
      console.log('Map DataSource methods:', {
        hasGetChildDataSource: typeof (mapDs as any).getChildDataSource === 'function',
        hasGetChildDataSources: typeof (mapDs as any).getChildDataSources === 'function',
        hasGetDataSourceByLayer: typeof (mapDs as any).getDataSourceByLayer === 'function',
      });
      
      // Try to get children
      if (typeof (mapDs as any).getChildDataSources === 'function') {
        const children = (mapDs as any).getChildDataSources() || [];
        console.log('Map DataSource children count:', children.length);
        children.forEach((child: any) => {
          console.log(`  Child DS: ${child.id}`);
        });
      }
    }
  }

  console.groupEnd();
}

/**
 * Initialize all layer DataSources eagerly
 * 
 * EXB lazily creates DataSources - they don't exist until something accesses them.
 * This function forces creation of all layer DataSources upfront.
 * 
 * @param jimuMapView - The JimuMapView instance
 * @param enabled - Flag to enable/disable initialization (default: true)
 * @returns Promise that resolves when all DataSources are initialized
 * 
 * @example
 * // In onActiveViewChange:
 * await initializeAllLayerDataSources(jimuMapView, true);
 */
export async function initializeAllLayerDataSources(
  jimuMapView: JimuMapView,
  enabled: boolean = true
): Promise<void> {
  if (!enabled) {
    console.log('[DS] DataSource initialization skipped (disabled)');
    return;
  }

  // Use the getter for jimuLayerViews
  const layerViews = jimuMapView.jimuLayerViews;

  if (!layerViews || Object.keys(layerViews).length === 0) {
    console.warn('[DS] Cannot initialize DataSources - no JimuLayerViews found');
    return;
  }

  console.log('[DS] Initializing all layer DataSources...');
  const dsManager = DataSourceManager.getInstance();
  let initialized = 0;
  let alreadyExists = 0;
  let failed = 0;

  // Convert to array to handle async/await cleaner in a loop
  const layerViewKeys = Object.keys(layerViews);

  for (const key of layerViewKeys) {
    const jlv = layerViews[key];
    const dsId = jlv?.layerDataSourceId;
    const layerTitle = jlv?.layer?.title || 'unknown';

    if (!dsId) continue;

    // Check if already initialized in the manager
    if (dsManager.getDataSource(dsId)) {
      alreadyExists++;
      continue;
    }

    try {
      /**
       * This ensures the JimuLayerView and its underlying JS API LayerView are loaded.
       */
      await jimuMapView.whenJimuLayerViewLoaded(jlv.id);

      /**
       * CORRECTION 2: Use the standard way to fetch the data source.
       * If jlv.layerDataSourceId exists, we can create it via the manager 
       * or access it via createDataSource.
       */
      let ds = jlv.getLayerDataSource?.();

      if (!ds) {
        // Attempt to force-create the data source if it hasn't been instantiated yet
        ds = await dsManager.createDataSource(dsId);
      }

      if (ds) {
        // Ensure the DS is ready for queries/use
        await ds.ready();
        console.log('[DS] Initialized DataSource for:', layerTitle);
        initialized++;
      } else {
        console.warn('[DS] Could not initialize DataSource for:', layerTitle);
        failed++;
      }
    } catch (e) {
      console.warn('[DS] Error initializing DataSource for:', layerTitle, e);
      failed++;
    }
  }

  console.log(`[DS] Initialization complete: ${initialized} initialized, ${alreadyExists} existing, ${failed} failed`);
}
