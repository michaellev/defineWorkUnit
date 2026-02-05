/**
 * map-utils.ts
 * פונקציות עזר לעבודה עם המפה והשכבות
 */

import { type JimuMapView } from 'jimu-arcgis';
import * as unionOperator from 'esri/geometry/operators/unionOperator';
import { LAYERS_CONFIG } from '../config/layers.config';
import { type Stand, type Forest, type Compartment, type WorkUnit } from '../config/types';

/**
 * מצא שכבה לפי שם
 */
export function findLayerByTitle(jimuMapView: JimuMapView, title: string): __esri.FeatureLayer | null {
  if (!jimuMapView?.view?.map) return null;

  const layer = jimuMapView.view.map.allLayers.find(l => l.title === title);
  return layer as __esri.FeatureLayer || null;
}

/**
 * קבל את כל השכבות הרלוונטיות
 */
export function getAllLayers(jimuMapView: JimuMapView) {
  return {
    forests: findLayerByTitle(jimuMapView, LAYERS_CONFIG.forests.title),
    compartments: findLayerByTitle(jimuMapView, LAYERS_CONFIG.compartments.title),
    stands: findLayerByTitle(jimuMapView, LAYERS_CONFIG.stands.title),
    workUnits: findLayerByTitle(jimuMapView, LAYERS_CONFIG.workUnits.title)
  };
}

/**
 * שאילתת יערות משכבת היערות
 */
export async function queryForests(layer: __esri.FeatureLayer): Promise<Forest[]> {
  const fields = LAYERS_CONFIG.forests.fields;
  const query = layer.createQuery();//forest, to fill forests list
  query.where = '1=1';
  query.outFields = [fields.forestNum.name, fields.forestName.name];
  query.orderByFields = [fields.forestName.name];
  query.returnGeometry = false;//default is true

  const result = await layer.queryFeatures(query);

  return result.features.map(f => ({
    forestNum: f.attributes[fields.forestNum.name],
    forestName: f.attributes[fields.forestName.name]
  })).sort((a, b) =>
    a.forestName.localeCompare(b.forestName, 'he')
  );
}

/**
 * שאילתת חלקות ייחודיות לפי יער - משכבת העומדים
 */
/**
 * שאילתת חלקות לפי יער - משכבת החלקות
 */
export async function queryCompartmentsByForest(
  layer: __esri.FeatureLayer,
  forestNum: number
): Promise<Compartment[]> {
  const fields = LAYERS_CONFIG.compartments.fields;

  console.log('[QUERY] queryCompartmentsByForest');
  console.log('[QUERY] Layer:', layer?.title);
  console.log('[QUERY] forestNum:', forestNum);
  console.log('[QUERY] where:', `${fields.forestNum.name} = ${forestNum}`);

  const query = layer.createQuery();//compartments, to fill list of compartments in a forest
  query.where = `${fields.forestNum.name} = ${forestNum}`;
  query.outFields = [fields.forestNum.name, fields.compartmentNum.name];
  // הסרנו: query.returnDistinctValues = true;
  query.orderByFields = [fields.compartmentNum.name];
  query.returnGeometry = false;//default is true ml

  const result = await layer.queryFeatures(query);
  console.log('[QUERY] Results:', result.features.length);

  // Remove duplicates by compartmentNum in code
  const compMap = new Map<number, Compartment>();
  result.features.forEach(f => {
    const compNum = f.attributes[fields.compartmentNum.name];
    if (!compMap.has(compNum)) {
      compMap.set(compNum, {
        forestNum: f.attributes[fields.forestNum.name],
        compartmentNum: compNum
      });
    }
  });

  return Array.from(compMap.values()).sort((a, b) =>
    a.compartmentNum - b.compartmentNum
  );
}

/**
 * שאילתת עומדים לפי יער וחלקה
 */
export async function queryStandsByCompartment(
  layer: __esri.FeatureLayer,
  forestNum: number,
  compartmentNum: number
): Promise<Stand[]> {
  const fields = LAYERS_CONFIG.stands.fields;
  const query = layer.createQuery();//stands by compartments (need geometry)
  query.where = `${fields.forestNum.name} = ${forestNum} AND ${fields.compartmentNum.name} = ${compartmentNum}`;
  query.outFields = [
    layer.objectIdField,  // גנרי
    fields.forestNum.name,
    fields.forestName.name,
    fields.compartmentNum.name,
    fields.standNum.name
  ];
  query.returnGeometry = true;
  query.outSpatialReference = { wkid: 2039 };  // Always return in ITM
  query.orderByFields = [fields.standNum.name];

  const result = await layer.queryFeatures(query);

  return result.features.map(f => ({
    objectId: Number(f.getObjectId()),  // גנרי
    forestNum: f.attributes[fields.forestNum.name],
    forestName: f.attributes[fields.forestName.name],
    compartmentNum: f.attributes[fields.compartmentNum.name],
    standNum: f.attributes[fields.standNum.name],
    geometry: f.geometry
  }));
}

/**
 * שאילתת כל עומדי היער (עם geometry)
 */
export async function queryStandsByForest(
  layer: __esri.FeatureLayer,
  forestNum: number
): Promise<Stand[]> {
  const fields = LAYERS_CONFIG.stands.fields;

  console.log('[QUERY] queryStandsByForest:', forestNum);

  const query = layer.createQuery();
  query.where = `${fields.forestNum.name} = ${forestNum}`;
  query.outFields = [
    layer.objectIdField,
    fields.forestNum.name,
    fields.forestName.name,
    fields.compartmentNum.name,
    fields.standNum.name
  ];
  query.returnGeometry = true;
  query.outSpatialReference = { wkid: 2039 };  // Always return in ITM

  const result = await layer.queryFeatures(query);

  console.log('[QUERY] queryStandsByForest results:', result.features.length);

  return result.features.map(f => ({
    objectId: Number(f.getObjectId()),
    forestNum: f.attributes[fields.forestNum.name],
    forestName: f.attributes[fields.forestName.name],
    compartmentNum: f.attributes[fields.compartmentNum.name],
    standNum: f.attributes[fields.standNum.name],
    geometry: f.geometry
  }));
}

/**
 * שאילתת עומד לפי ObjectID
 */
export async function queryStandByObjectIdTry(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<Stand | null> {
  const fields = LAYERS_CONFIG.stands.fields;

  // Save current definitionExpression before query
  const savedDefinitionExpression = layer.definitionExpression;
  console.log('[QUERY] Saved definitionExpression:', savedDefinitionExpression);

  // Don't use createQuery() as it may reset definitionExpression
  // Create query object manually
  const query = {//stands. need geometry
    objectIds: [objectId],
    outFields: [
      layer.objectIdField,
      fields.forestNum.name,
      fields.forestName.name,
      fields.compartmentNum.name,
      fields.standNum.name
    ],
    returnGeometry: true
  };

  const result = await layer.queryFeatures(query as __esri.Query);

  // Restore definitionExpression after query
  if (layer.definitionExpression !== savedDefinitionExpression) {
    layer.definitionExpression = savedDefinitionExpression;
    console.log('[QUERY] Restored definitionExpression:', savedDefinitionExpression);
  }

  if (result.features.length === 0) return null;

  const f = result.features[0];
  return {
    objectId: Number(f.getObjectId()),
    forestNum: f.attributes[fields.forestNum.name],
    forestName: f.attributes[fields.forestName.name],
    compartmentNum: f.attributes[fields.compartmentNum.name],
    standNum: f.attributes[fields.standNum.name],
    geometry: f.geometry
  };
}

/**
 * שאילתת עומד לפי ObjectID
 */
export async function queryStandByObjectId(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<Stand | null> {
  const fields = LAYERS_CONFIG.stands.fields;

  // Save current definitionExpression
  const savedDefinitionExpression = layer.definitionExpression;
  console.log('[QUERY] Saved definitionExpression:', savedDefinitionExpression);

  const query = layer.createQuery();//stands. need geometry
  query.objectIds = [objectId];
  query.outFields = [
    layer.objectIdField,
    fields.forestNum.name,
    fields.forestName.name,
    fields.compartmentNum.name,
    fields.standNum.name
  ];
  query.returnGeometry = true;
  query.outSpatialReference = { wkid: 2039 };  // Always return in ITM

  const result = await layer.queryFeatures(query);

  // Restore definitionExpression after query
  if (layer.definitionExpression !== savedDefinitionExpression) {
    layer.definitionExpression = savedDefinitionExpression;
    console.log('[QUERY] Restored definitionExpression:', savedDefinitionExpression);
  }

  if (result.features.length === 0) return null;

  const f = result.features[0];
  return {
    objectId: Number(f.getObjectId()),
    forestNum: f.attributes[fields.forestNum.name],
    forestName: f.attributes[fields.forestName.name],
    compartmentNum: f.attributes[fields.compartmentNum.name],
    standNum: f.attributes[fields.standNum.name],
    geometry: f.geometry
  };
}

/**
 * שאילתת יחידת עבודה לפי ObjectID
 */
export async function queryWorkUnitByObjectId(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<WorkUnit | null> {
  const fields = LAYERS_CONFIG.workUnits.fields;
  const query = layer.createQuery();//workunits. need geometry
  query.objectIds = [objectId];  // גנרי
  query.outFields = [
    layer.objectIdField,
    fields.forestNum.name,
    fields.forestName.name,
    fields.compartments.name,
    fields.stands.name,
    fields.workUnitId.name,
    fields.status.name,
    fields.lockTimestamp.name
  ];
  query.returnGeometry = true;
  query.outSpatialReference = { wkid: 2039 };  // Always return in ITM

  const result = await layer.queryFeatures(query);

  if (result.features.length === 0) return null;

  const f = result.features[0];
  return {
    objectId: Number(f.getObjectId()),  // גנרי
    forestNum: f.attributes[fields.forestNum.name],
    forestName: f.attributes[fields.forestName.name],
    compartments: f.attributes[fields.compartments.name],
    stands: f.attributes[fields.stands.name],
    workUnitId: f.attributes[fields.workUnitId.name],
    status: f.attributes[fields.status.name],
    lockTimestamp: f.attributes[fields.lockTimestamp.name],
    geometry: f.geometry
  };
}

/**
 * בדיקה האם יחידת עבודה ניתנת לעריכה
 */
export function isWorkUnitEditable(workUnit: WorkUnit): boolean {
  return LAYERS_CONFIG.workUnits.editableStatuses.includes(workUnit.status);
}

/**
 * hitTest - מצא feature בנקודת קליק
 */
export async function hitTestForLayer(
  jimuMapView: JimuMapView,
  screenPoint: { x: number; y: number },
  layer: __esri.FeatureLayer
): Promise<__esri.Graphic | null> {
  const response = await jimuMapView.view.hitTest(screenPoint, {
    include: [layer]
  });

  const result = response.results.find(
    r => r.type === 'graphic' && r.graphic.layer === layer
  );

  return result ? (result as __esri.GraphicHit).graphic : null;
}

/**
 * יצירת יחידת עבודה חדשה
 */
export async function createWorkUnit(
  layer: __esri.FeatureLayer,
  forestNum: number,
  forestName: string,
  stands: Stand[],
  workUnitId: string,
  wuPolygonFinal?: __esri.Polygon
): Promise<{ success: boolean; objectId?: number; error?: string }> {
  const fields = LAYERS_CONFIG.workUnits.fields;

  console.log('[CREATE] ========== Starting CREATE work unit ==========');
  console.log('[CREATE] workUnitId:', workUnitId);
  console.log('[CREATE] forestNum:', forestNum, 'forestName:', forestName);
  console.log('[CREATE] stands count:', stands.length);

  // הכן רשימת חלקות ייחודיות
  const uniqueCompartments = [...new Set(stands.map(s => s.compartmentNum))].sort((a, b) => a - b);
  const compartmentsStr = uniqueCompartments.join(',');
  console.log('[CREATE] compartments:', compartmentsStr);

  // הכן רשימת עומדים בפורמט "חלקה-עומד" כולל סימון * לחלקיים
  const standsStr = buildStandsStringForServer(stands);
  console.log('[CREATE] stands string:', standsStr);

  //create geometry - if there is wuPolygonFinal, use it. else - union all stands
  let unionGeometry: __esri.Geometry | null = null;

  if (wuPolygonFinal) {
    unionGeometry = wuPolygonFinal;
    console.log('[CREATE] Using corrected polygon for geometry');
  } else {
    try {
      const geometries = stands
        .filter(s => s.geometry)
        .map(s => s.geometry);

      if (geometries.length > 0) {
        unionGeometry = unionOperator.executeMany(geometries);
        console.log('[CREATE] Union geometry created from', geometries.length, 'geometries');
      } else {
        console.warn('[CREATE] No geometries found in stands!');
      }
    } catch (error) {
      console.error('[CREATE] Error creating union geometry:', error);
    }
  }

  // הכן את ה-attributes
  const attributes: { [key: string]: any } = {
    [fields.forestNum.name]: String(forestNum),
    [fields.forestName.name]: forestName,
    [fields.compartments.name]: compartmentsStr,
    [fields.stands.name]: standsStr,
    [fields.workUnitId.name]: workUnitId,
    [fields.status.name]: "בהכנה",
    [fields.date.name]: new Date()
  };

  console.log('[CREATE] Attributes to save:', JSON.stringify(attributes, null, 2));

  // יצירת ה-feature
  const newFeature = {
    attributes: attributes,
    geometry: unionGeometry
  };

  try {
    console.log('[CREATE] Calling applyEdits with addFeatures...');
    const result = await layer.applyEdits({
      addFeatures: [newFeature as __esri.Graphic]
    });

    console.log('[CREATE] applyEdits result:', result);

    if (result.addFeatureResults && result.addFeatureResults.length > 0) {
      const addResult = result.addFeatureResults[0];
      if (addResult.error) {
        console.error('[CREATE] Error from server:', addResult.error);
        return { success: false, error: addResult.error.message };
      }
      console.log('[CREATE] ✓ ** Server - Work unit successfully created! objectId:', addResult.objectId);
      console.log('[CREATE] ========== CREATE completed ==========');
      return { success: true, objectId: addResult.objectId };
    }

    console.error('[CREATE] No addFeatureResults returned from server');
    return { success: false, error: 'No result returned from server' };
  } catch (error) {
    console.error('[CREATE] Exception during applyEdits:', error);
    return { success: false, error: String(error) };
  }
}
/**
 * עדכון יחידת עבודה קיימת
 */
export async function updateWorkUnit(
  layer: __esri.FeatureLayer,
  objectId: number,
  forestNum: number,
  forestName: string,
  stands: Stand[],
  workUnitId: string,
  wuPolygonFinal?: __esri.Polygon
): Promise<{ success: boolean; error?: string }> {
  const fields = LAYERS_CONFIG.workUnits.fields;

  console.log('[UPDATE] ========== Starting UPDATE work unit ==========');
  console.log('[UPDATE] objectId:', objectId);
  console.log('[UPDATE] workUnitId:', workUnitId);
  console.log('[UPDATE] forestNum:', forestNum, 'forestName:', forestName);
  console.log('[UPDATE] stands count:', stands.length);

  // הכן רשימת חלקות ייחודיות
  const uniqueCompartments = [...new Set(stands.map(s => s.compartmentNum))].sort((a, b) => a - b);
  const compartmentsStr = uniqueCompartments.join(',');
  console.log('[UPDATE] compartments:', compartmentsStr);

  // הכן רשימת עומדים בפורמט "חלקה-עומד" כולל סימון לחלקיים
  const standsStr = buildStandsStringForServer(stands);
  console.log('[UPDATE] stands string:', standsStr);

  //create geometry - if there is wuPolygonFinal, use it. else - union all stands
  let unionGeometry: __esri.Geometry | null = null;

  if (wuPolygonFinal) {
    unionGeometry = wuPolygonFinal;
    console.log('[UPDATE] Using corrected polygon for geometry');
  } else {
    try {
      const geometries = stands
        .filter(s => s.geometry)
        .map(s => s.geometry);

      if (geometries.length > 0) {
        unionGeometry = unionOperator.executeMany(geometries);
        console.log('[UPDATE] Union geometry created from', geometries.length, 'geometries');
      } else {
        console.warn('[UPDATE] No geometries found in stands!');
      }
    } catch (error) {
      console.error('[UPDATE] Error creating union geometry:', error);
    }
  }

  // הכן את ה-attributes - אותם שדות כמו ב-create
  const attributes: { [key: string]: any } = {
    [layer.objectIdField]: objectId,
    [fields.forestNum.name]: String(forestNum),
    [fields.forestName.name]: forestName,
    [fields.compartments.name]: compartmentsStr,
    [fields.stands.name]: standsStr,
    [fields.workUnitId.name]: workUnitId,
    [fields.status.name]: "בהכנה",
    [fields.date.name]: new Date()
  };

  console.log('[UPDATE] Attributes to save:', JSON.stringify(attributes, null, 2));

  // יצירת ה-feature לעדכון
  const updateFeature = {
    attributes: attributes,
    geometry: unionGeometry
  };

  try {
    console.log('[UPDATE] Calling applyEdits with updateFeatures...');
    const result = await layer.applyEdits({
      updateFeatures: [updateFeature as __esri.Graphic]
    });

    console.log('[UPDATE] applyEdits result:', result);

    if (result.updateFeatureResults && result.updateFeatureResults.length > 0) {
      const updateResult = result.updateFeatureResults[0];
      if (updateResult.error) {
        console.error('[UPDATE] Error from server:', updateResult.error);
        return { success: false, error: updateResult.error.message };
      }
      console.log('[UPDATE] ✓ ** Server - Work unit successfully updated! objectId:', objectId);
      console.log('[UPDATE] ========== UPDATE completed ==========');
      return { success: true };
    }

    console.error('[UPDATE] No updateFeatureResults returned from server');
    return { success: false, error: 'No result returned from server' };
  } catch (error) {
    console.error('[UPDATE] Exception during applyEdits:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * מחיקת יחידת עבודה
 */
export async function deleteWorkUnit(
  layer: __esri.FeatureLayer,
  objectId: number,
  workUnitId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[DELETE] ========== Starting DELETE work unit ==========');
  console.log('[DELETE] objectId:', objectId);
  console.log('[DELETE] workUnitId:', workUnitId);

  try {
    console.log('[DELETE] Calling applyEdits with deleteFeatures...');
    const result = await layer.applyEdits({
      deleteFeatures: [{ objectId: objectId }]
    });

    console.log('[DELETE] applyEdits result:', result);

    if (result.deleteFeatureResults && result.deleteFeatureResults.length > 0) {
      const deleteResult = result.deleteFeatureResults[0];
      if (deleteResult.error) {
        console.error('[DELETE] Error from server:', deleteResult.error);
        return { success: false, error: deleteResult.error.message };
      }
      console.log('[DELETE] ✓ ** Server - Work unit deleted successfully! objectId:', objectId);
      console.log('[DELETE] ========== DELETE completed ==========');
      return { success: true };
    }

    console.error('[DELETE] No deleteFeatureResults returned from server');
    return { success: false, error: 'No result returned from server' };
  } catch (error) {
    console.error('[DELETE] Exception during applyEdits:', error);
    return { success: false, error: String(error) };
  }
}

/**
* טעינת רשימת יחידות עבודה (TRTUnit + Status) - לצורך יצירת מזהה חדש
*/
export async function queryWorkUnitsIndex(
  layer: __esri.FeatureLayer
): Promise<{ workUnitId: string; status: string; forestNum: string }[]> {
  const fields = LAYERS_CONFIG.workUnits.fields;
  const query = layer.createQuery();//working units
  query.where = '1=1';
  query.outFields = [
    fields.workUnitId.name,
    fields.status.name,
    fields.forestNum.name
  ];
  query.returnGeometry = false;//default is true

  console.log('[QUERY] Loading work units index...');
  const result = await layer.queryFeatures(query);

  const workUnits = result.features.map(f => {
    const workUnitId = f.attributes[fields.workUnitId.name];
    const status = f.attributes[fields.status.name];
    const forestNum = f.attributes[fields.forestNum.name];

    // Log for debugging
    console.log('[QUERY] WorkUnit:', { workUnitId, status, forestNum });

    return {
      workUnitId: workUnitId || '',
      status: status || '',
      forestNum: String(forestNum || '')
    };
  });

  console.log('[QUERY] Loaded', workUnits.length, 'work units');
  return workUnits;
}

/**
 * בניית מזהה יחידת עבודה חדש
 * פורמט: T{forestNum}{sequenceNumber}
 */
export function generateWorkUnitId(
  existingWorkUnits: { workUnitId: string; forestNum: string }[],
  forestNum: number
): string {
  const forestNumStr = String(forestNum);
  const prefix = `T${forestNumStr}`;

  // מצא את המספר הסידורי הגבוה ביותר לאותו יער
  let maxSequence = 0;

  existingWorkUnits.forEach(wu => {
    if (wu.forestNum === forestNumStr && wu.workUnitId && wu.workUnitId.startsWith(prefix)) {
      const sequencePart = wu.workUnitId.substring(prefix.length);
      const sequence = parseInt(sequencePart);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });

  const newSequence = maxSequence + 1;
  const newWorkUnitId = `${prefix}${newSequence}`;

  console.log('[GENERATE] New work unit ID:', newWorkUnitId, '(max was:', maxSequence, ')');
  return newWorkUnitId;
}

/**
 * פרסור מחרוזת עומדים לרשימת אובייקטים
 * פורמט קלט: "2-125,2-121,3-118,8-101"
 * פורמט פלט: [{compartmentNum: 2, standNum: 125}, {compartmentNum: 2, standNum: 121}, ...]
 */
export function parseStandsString(standsStr: string): { compartmentNum: number; standNum: number }[] {
  if (!standsStr || standsStr.trim() === '') {
    return [];
  }

  const result: { compartmentNum: number; standNum: number }[] = [];

  // Split by comma and process each stand
  const parts = standsStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Expected format: "compartmentNum-standNum" e.g., "2-125"
    const match = trimmed.match(/^(\d+)-(\d+)$/);
    if (match) {
      result.push({
        compartmentNum: parseInt(match[1]),
        standNum: parseInt(match[2])
      });
    } else {
      console.warn('[PARSE] Invalid stand format:', trimmed);
    }
  }

  return result;
}

/**
 * שאילתת עומדים לפי רשימה (עם geometry)
 */
export async function queryStandsByList(
  layer: __esri.FeatureLayer,
  forestNum: number,
  standsList: { compartmentNum: number; standNum: number }[]
): Promise<Stand[]> {
  if (standsList.length === 0) {
    return [];
  }

  const fields = LAYERS_CONFIG.stands.fields;

  // Build WHERE clause: (HELKA = 2 AND STAND_NO = 125) OR (HELKA = 3 AND STAND_NO = 118) ...
  const conditions = standsList.map(s =>
    `(${fields.compartmentNum.name} = ${s.compartmentNum} AND ${fields.standNum.name} = ${s.standNum})`
  );

  const whereClause = `${fields.forestNum.name} = ${forestNum} AND (${conditions.join(' OR ')})`;

  console.log('[QUERY] queryStandsByList where:', whereClause);

  const query = layer.createQuery();
  query.where = whereClause;
  query.outFields = [
    layer.objectIdField,
    fields.forestNum.name,
    fields.forestName.name,
    fields.compartmentNum.name,
    fields.standNum.name
  ];
  query.returnGeometry = true;

  const result = await layer.queryFeatures(query);

  console.log('[QUERY] queryStandsByList results:', result.features.length);

  return result.features.map(f => ({
    objectId: Number(f.getObjectId()),
    forestNum: f.attributes[fields.forestNum.name],
    forestName: f.attributes[fields.forestName.name],
    compartmentNum: f.attributes[fields.compartmentNum.name],
    standNum: f.attributes[fields.standNum.name],
    geometry: f.geometry
  }));
}

/**
 * Check if lock is available (without trying to acquire)
 * Returns true if lock is expired or empty
 */
export async function isLockAvailable(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<boolean> {
  const fields = LAYERS_CONFIG.workUnits.fields;
  const LOCK_TIMEOUT = 25000;

  const query = layer.createQuery();
  query.objectIds = [objectId];
  query.outFields = [fields.lockTimestamp.name];
  query.returnGeometry = false;

  const result = await layer.queryFeatures(query);
  if (result.features.length === 0) {
    return false;
  }

  const currentLock = result.features[0].attributes[fields.lockTimestamp.name];
  const now = Date.now();

  // Available if no lock or lock expired
  if (!currentLock || (now - currentLock) > LOCK_TIMEOUT) {
    console.log('[LOCK] Lock is available (expired or empty)');
    return true;
  }

  console.log('[LOCK] Lock is still active, age:', now - currentLock, 'ms');
  return false;
}

/**
 * Get current lock timestamp from server
 * Returns timestamp or null if no lock
 */
export async function getLockTimestamp(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<number | null> {
  const fields = LAYERS_CONFIG.workUnits.fields;

  const query = layer.createQuery();
  query.objectIds = [objectId];
  query.outFields = [fields.lockTimestamp.name];
  query.returnGeometry = false;

  const result = await layer.queryFeatures(query);
  if (result.features.length === 0) {
    return null;
  }

  return result.features[0].attributes[fields.lockTimestamp.name] || null;
}

/**
 * Acquire lock on a work unit
 * Returns true if lock acquired successfully, false if occupied
 */
export async function acquireLock(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<{ success: boolean; timestamp: number }> {
  const fields = LAYERS_CONFIG.workUnits.fields;
  const LOCK_TIMEOUT = 25000;

  // Step A: Check current lock status
  const query = layer.createQuery();
  query.objectIds = [objectId];
  query.outFields = [fields.lockTimestamp.name];
  query.returnGeometry = false;

  const result = await layer.queryFeatures(query);
  if (result.features.length === 0) {
    console.error('[LOCK] Work unit not found:', objectId);
    return { success: false, timestamp: 0 };
  }

  const currentLock = result.features[0].attributes[fields.lockTimestamp.name];
  const now = Date.now();

  // Check if locked by someone else (fresh lock)
  if (currentLock && (now - currentLock) <= LOCK_TIMEOUT) {
    console.log('[LOCK] Work unit is locked, lock age:', now - currentLock, 'ms');
    return { success: false, timestamp: 0 };
  }

  // Step B: Write our timestamp
  const myTimestamp = Date.now();
  const updateFeature = {
    attributes: {
      [layer.objectIdField]: objectId,
      [fields.lockTimestamp.name]: myTimestamp
    }
  };

  try {
    await layer.applyEdits({ updateFeatures: [updateFeature as __esri.Graphic] });
  } catch (error) {
    console.error('[LOCK] Failed to write lock:', error);
    return { success: false, timestamp: 0 };
  }

  // Step C: Verify we won - read back from server
  const verifyResult = await layer.queryFeatures(query);
  const verifyLock = verifyResult.features[0].attributes[fields.lockTimestamp.name];

  if (Math.abs(verifyLock - myTimestamp) < 100) { // Small tolerance for rounding
    console.log('[LOCK] Lock acquired successfully for objectId:', objectId, 'timestamp:', verifyLock);
    return { success: true, timestamp: verifyLock };  // Return the VERIFIED timestamp from server
  } else {
    console.log('[LOCK] Lock acquisition failed - someone else won');
    return { success: false, timestamp: 0 };
  }
}

/**
 * Release lock on a work unit
 */
export async function releaseLock(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<boolean> {
  const fields = LAYERS_CONFIG.workUnits.fields;

  const updateFeature = {
    attributes: {
      [layer.objectIdField]: objectId,
      [fields.lockTimestamp.name]: null
    }
  };

  try {
    await layer.applyEdits({ updateFeatures: [updateFeature as __esri.Graphic] });
    console.log('[LOCK] Lock released for objectId:', objectId);
    return true;
  } catch (error) {
    console.error('[LOCK] Failed to release lock:', error);
    return false;
  }
}

/**
 * Refresh lock (heartbeat) - returns false if lock was lost
 */
export async function refreshLock(
  layer: __esri.FeatureLayer,
  objectId: number
): Promise<{ success: boolean; newTimestamp: number }> {
  const fields = LAYERS_CONFIG.workUnits.fields;

  const myTimestamp = Date.now();

  // Write new timestamp
  const updateFeature = {
    attributes: {
      [layer.objectIdField]: objectId,
      [fields.lockTimestamp.name]: myTimestamp
    }
  };

  try {
    await layer.applyEdits({ updateFeatures: [updateFeature as __esri.Graphic] });
  } catch (error) {
    console.error('[LOCK] Heartbeat write failed:', error);
    return { success: false, newTimestamp: 0 };
  }

  // Verify we still own the lock
  const query = layer.createQuery();
  query.objectIds = [objectId];
  query.outFields = [fields.lockTimestamp.name];
  query.returnGeometry = false;

  const result = await layer.queryFeatures(query);
  const verifyLock = result.features[0].attributes[fields.lockTimestamp.name];

  if (Math.abs(verifyLock - myTimestamp) < 100) {
    console.log('[LOCK] Heartbeat successful');
    return { success: true, newTimestamp: myTimestamp };
  } else {
    console.log('[LOCK] Heartbeat failed - lock was stolen');
    return { success: false, newTimestamp: 0 };
  }
}

/**
 * פרסור מחרוזת עומדים עם תמיכה ב-* (עומדים חלקיים)
 * פורמט קלט: "2-125*,2-121,3-118*"
 * פורמט פלט: [{compartmentNum: 2, standNum: 125, isPartial: true}, ...]
 */
export function parseStandsStringWithPartial(standsStr: string): { compartmentNum: number; standNum: number; isPartial: boolean }[] {
  if (!standsStr || standsStr.trim() === '') {
    return [];
  }

  const result: { compartmentNum: number; standNum: number; isPartial: boolean }[] = [];
  const parts = standsStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Format: "compartmentNum-standNum" or "compartmentNum-standNum*"
    const match = trimmed.match(/^(\d+)-(\d+)(\*)?$/);
    if (match) {
      result.push({
        compartmentNum: parseInt(match[1]),
        standNum: parseInt(match[2]),
        isPartial: match[3] === '*'
      });
    } else {
      console.warn('[PARSE] Invalid stand format:', trimmed);
    }
  }

  return result;
}

/**
 * בניית מחרוזת עומדים לשמירה בשרת (עם תמיכה ב-*)
 * פורמט פלט: "2-125*,2-121,3-118"
 */
export function buildStandsStringForServer(stands: Stand[]): string {
  return stands
    .map(s => `${s.compartmentNum}-${s.standNum}${s.isPartial ? '*' : ''}`)
    .join(',');
}

/**
 * בניית מחרוזת עומדים לתצוגה (פורמט מקובץ לפי חלקות)
 * פורמט פלט: "2(101*,102) 3(118)"
 */
export function buildStandsDisplayString(stands: Stand[]): string {
  if (stands.length === 0) return '';

  // Group by compartment
  const byCompartment = new Map<number, { standNum: number; isPartial?: boolean }[]>();

  for (const stand of stands) {
    if (!byCompartment.has(stand.compartmentNum)) {
      byCompartment.set(stand.compartmentNum, []);
    }
    byCompartment.get(stand.compartmentNum)!.push({
      standNum: stand.standNum,
      isPartial: stand.isPartial
    });
  }

  // Sort compartments and build string
  const sortedCompartments = Array.from(byCompartment.keys()).sort((a, b) => a - b);

  return sortedCompartments.map(compNum => {
    const standsList = byCompartment.get(compNum)!
      .sort((a, b) => a.standNum - b.standNum)
      .map(s => `${s.standNum}${s.isPartial ? '*' : ''}`)
      .join(',');
    return `${compNum}(${standsList})`;
  }).join(' ');
}
