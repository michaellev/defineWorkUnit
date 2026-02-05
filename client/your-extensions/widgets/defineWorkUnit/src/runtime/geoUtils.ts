import * as projection from 'esri/geometry/projection'
import SpatialReference from 'esri/geometry/SpatialReference'
import GeographicTransformationStep from 'esri/geometry/support/GeographicTransformationStep'
import GeographicTransformation from 'esri/geometry/support/GeographicTransformation'

var isInitialized = false;
export var __wkidTM = 2039;
var __geoXfrm_sr_ITM: SpatialReference | null = null;
var __geoXfrm_geoStep_ITM2GEO: GeographicTransformationStep | null = null;
var __geoXfrm_geoTrans_ITM2GEO: GeographicTransformation | null = null;
var __geoXfrm_sr_GEO: SpatialReference | null = null;
var __geoXfrm_geoStep_GEO2ITM: GeographicTransformationStep | null = null;
var __geoXfrm_geoTrans_GEO2ITM: GeographicTransformation | null = null;
// _gali_ Other utility functions, keep as is
export async function __geoXfrm_setup(projection: any, wkidTMValue?: number, wkidTMReverseValue?: number) { // _gali_ Made params optional
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
  await projection.load();
  isInitialized = true;
  return __wkidTM;
}

export function itm2geo(projection: any, geometryOrGeometries: any) {
  //__geoXfrm_setup(/*2039, 108021*/);// _gali_ Call without params to use defaults or previously set __geoXfrm_setup()
  let ret = geometryOrGeometries;
  let sr: SpatialReference | undefined = geometryOrGeometries?.spatialReference;
  if (!sr && Array.isArray(geometryOrGeometries) && geometryOrGeometries.length > 0) {
    sr = geometryOrGeometries[0]?.spatialReference;
  }
  if (sr && !(sr.isWGS84 || sr.isGeographic || sr.isWebMercator)) {
    //await projection.load();
    ret = projection.project(geometryOrGeometries, __geoXfrm_sr_GEO!, __geoXfrm_geoTrans_ITM2GEO!);
  }
  return ret;
}

export function geo2itm(projection: any, geometryOrGeometries: any) {
  //__geoXfrm_setup(/*2039, 108021*/);// _gali_ Call without params __geoXfrm_setup()
  let ret = geometryOrGeometries;
  let sr: SpatialReference | undefined = geometryOrGeometries?.spatialReference;
  if (!sr && Array.isArray(geometryOrGeometries) && geometryOrGeometries.length > 0) {
    sr = geometryOrGeometries[0]?.spatialReference;
  }
  if (sr && (sr.isWGS84 || sr.isGeographic || sr.isWebMercator)) {
    //await projection.load();
    ret = projection.project(geometryOrGeometries, __geoXfrm_sr_ITM!, __geoXfrm_geoTrans_GEO2ITM!);
  }
  return ret;
}
