/** @jsx jsx */
import { React, jsx, type AllWidgetProps, utils, moduleLoader, lodash, ReactResizeDetector, hooks, type IMState, ReactRedux, css, getAppStore, appActions } from 'jimu-core'//_ml_ aded last 3
import { type CoordinateConfig, DisplayOrderType, ElevationUnitType, type IMConfig, type WidgetRect, WidgetStyleType } from '../config'
import defaultMessages from './translations/default'
import { type JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import {
  Modal, Radio, Label,//_ml_ added line (3 items)
  Button, Card, CardBody, CardFooter, Dropdown, DropdownButton, DropdownItem,
  DropdownMenu, WidgetPlaceholder, defaultMessages as jimuiDefaultMessages
} from 'jimu-ui'
import Graphic from 'esri/Graphic'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import SpatialReference from 'esri/geometry/SpatialReference'
import PictureMarkerSymbol from 'esri/symbols/PictureMarkerSymbol'
import * as coordinateFormatter from 'esri/geometry/coordinateFormatter'
import * as webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import Point from 'esri/geometry/Point'
import * as projection from 'esri/geometry/projection'
import * as geometryService from 'esri/rest/geometryService'
import ProjectParameters from 'esri/rest/support/ProjectParameters'
import { degToDDM, degToDMS, getCrsBySpheroidStr, getCSUnitByCrs, getWktKeyStr, getUnitRate, getUnits, isGeographicUnit, isProjectUnit, localizeNumberBySettingInfo } from '../utils'
import { getStyle } from './style'
import { CopyButton } from 'jimu-ui/basic/copy-button'
import { TextAutoFit } from './components/text-fit'
import coordinatesIcon from '../../icon.svg'
import { DownOutlined } from 'jimu-icons/outlined/directional/down'
import { LocatorOutlined } from 'jimu-icons/outlined/editor/locator'
import { LayoutItemSizeModes } from 'jimu-layouts/layout-runtime'
import * as reactiveUtils from 'esri/core/reactiveUtils'
//import type * as JimuCoreWkid from 'jimu-core/wkid'
import ElevEye from './components/elev-eye'
//import * as myUtils from '../utils'//_ml_ added import, for debugging
import * as ofekUtils from '../ofekUtils'//_ml_ added import co_is__alone
//import * as DialogBox from "./DialogBox" //_ml_ c

const { useState, useEffect, useRef } = React

const Widget = (props: AllWidgetProps<IMConfig>): React.ReactElement => {
  const { config, useMapWidgetIds, theme, id, layoutId, layoutItemId, controllerWidgetId } = props//_ml_ add controllerWidgetIdfrom 1.17
  const { coordinateSystem, coordinateDecimal, altitudeDecimal, showSeparators, displayOrder, widgetStyle, mapInfo, mapInfo2,
    ofekCfgObliqueAppUrl, showBaseMapInfo, showRotation, showScale, showZoom, showTilt//_ml_ added line
  } = config
  const useMapWidgetId = useMapWidgetIds?.[0]//_ml_ copied from 1.17
  const widgetSizeAuto = ReactRedux.useSelector((state: IMState) => {
    const appConfig = state && state.appConfig
    const layout = appConfig.layouts?.[layoutId]
    const layoutSetting = layout?.content?.[layoutItemId]?.setting
    const isHeightAuto =
      layoutSetting?.autoProps?.height === LayoutItemSizeModes.Auto ||
      layoutSetting?.autoProps?.height === true
    const isWidthAuto =
      layoutSetting?.autoProps?.width === LayoutItemSizeModes.Auto ||
      layoutSetting?.autoProps?.width === true
    return isHeightAuto || isWidthAuto
  })
  // state
  const [widgetRect, setWidgetRect] = useState<WidgetRect>({ width: 250, height: 100 })
  const [currentJimuMapView, setCurrentJimuMapView] = useState(null)
  const [enableRealtime, setEnableRealtime] = useState(true)
  const [selectedSystemId, setSelectedSystemId] = useState(coordinateSystem?.[0]?.id)
  const [locateActive, setLocateActive] = useState(false)
  const [showTips, setShowTips] = useState(false)
  const [showMouseTips, setShowMouseTips] = useState(false)
  const [geoInfo, setGeoInfo] = useState('')

  const [elevInfo, setElevInfo] = useState('')
  const [elevNum, setElevNum] = useState(null)
  const [elevUnit, setElevUnit] = useState('')

  const [eyeInfo, setEyeInfo] = useState('')//_ml_ to_delete
  const [eyeNum, setEyeNum] = useState(null)
  const [eyeUnit, setEyeUnit] = useState('')

  const [modulesLoaded, setModulesLoaded] = useState(false)

  // translate
  const translate = hooks.useTranslation(defaultMessages, jimuiDefaultMessages)
  const mapClickTips = translate('mapClickTips')
  const mouseMoveTips = translate('mouseMoveTips')
  const enableClickTips = translate('enableClickTips')
  const disableClickTips = translate('disableClickTips')
  const computing = translate('computing')
  const placeHolderName = translate('_widgetLabel')
  //units
  const unitInches = translate('unitsInches')
  const unitFoot = translate('unitsLabelFeet')
  const unitFootUs = translate('unitsFoot_US')
  const unitYards = translate('unitsLabelYards')
  const unitMiles = translate('unitsLabelMiles')
  const unitNauticalMiles = translate('unitsLabelNauticalMiles')
  const unitMillimeters = translate('unitsMillimeters')
  const unitCentimeters = translate('unitsCentimeters')
  const unitMeters = translate('unitsLabelMeters')
  const unitKilometers = translate('unitsLabelKilometers')
  const unitDecimeters = translate('unitsDecimeters')
  const unitDD = translate('unitsDecimalDegrees')
  const unitDDM = translate('unitsDegreesDecimalMinutes')
  const unitDMS = translate('unitsDegreeMinutesSeconds')
  const unitMgrs = translate('unitsMgrs')
  const unitUsng = translate('unitsUsng')
  const changeSystem = translate('changeSystem')
  // global variables
  const mapWkid = useRef(null)
  const mapPortalId = useRef(null)
  const graphicsLayer = useRef(null)
  const markerGraphic = useRef(null)
  const moveListener = useRef(null)
  const clickListener = useRef(null)
  const wkidUtilsRef = useRef(null)
  // unit nls map
  const unitNlsMap = {
    INCHES: unitInches,
    FOOT: unitFoot,
    FOOT_US: unitFootUs,
    YARDS: unitYards,
    MILES: unitMiles,
    NAUTICAL_MILES: unitNauticalMiles,
    MILLIMETERS: unitMillimeters,
    CENTIMETERS: unitCentimeters,
    METER: unitMeters,
    KILOMETERS: unitKilometers,
    DECIMETERS: unitDecimeters,
    DEGREE: unitDD,
    DECIMAL_DEGREES: unitDD,
    DEGREES_DECIMAL_MINUTES: unitDDM,
    DEGREE_MINUTE_SECONDS: unitDMS,
    MGRS: unitMgrs,
    USNG: unitUsng
  }
  const unitAbbrMap = {
    [unitKilometers]: translate('kilometerAbbr'),
    [unitMeters]: translate('meterAbbr'),
    [unitFoot]: translate('feetAbbr')
  }
  const COORDINATES_MIN_WIDTH = 160
  const COORDINATES_MIN_HEIGHT = 26

  //_ml_ added block top
  //const [lastMousePointAsScreenCoordinates, setLastMousePointAsScreenCoordinates] = useState(null)//_ml_ c
  const [baseMapInfo, setBaseMapInfo] = useState('')
  const [itmInfo, setItmInfo] = useState('')
  const [scaleInfo, setScaleInfo] = useState('')
  const [zoomInfo, setZoomInfo] = useState('')
  const [rotationInfo, setRotationInfo] = useState('')

  const [eyeInfoAlt, setEyeInfoAlt] = useState('')
  const [eyeInfoTilt, setEyeInfoTilt] = useState('')
  const [widgetName, setWidgetName] = useState('coordinates-ofek')

  const [isOpenModalCoord, setIsOpenModalCoord] = useState(false)

  var _app = {};
  const __app = useRef<object>({});
  const isLockedRef = useRef<boolean>(false);
  const wkidTMRef = useRef<number>(2039);
  const mapWidgetIdRef = useRef<string | null>(null);// Ref to store the mapWidgetId for this instance

  const configOfekCfgObliqueAppUrl = props.config.ofekCfgObliqueAppUrl; // Use from props.config
  const configOfekCfgOfek3dAppUrl = props.config.ofek3dAppUrl; // Use from props.config
  //_ml_ added block end

  useEffect(() => {
    // _ml_ added block top
    //
    /** Call initGlobalApp */
    //useEffect runs only on 1st render
    //log("** coordinates-ofek-after-mount-1")
    //debugger;
    mapWidgetIdRef.current = ofekUtils.initGlobalApp(props.label, props.id, props.config.token || null);
    //const __app = window._app_;
    __app.current = (typeof window !== 'undefined' && (window as any)._app_) || null;//better?
    _app = __app.current;
    const widgetContext = __app?.current?.maps?.[mapWidgetIdRef.current || 'noMap'][props.id];
    //
    /** Allowance check */
    if (!widgetContext?.isWidgetAllowed) {
      isLockedRef.current = true;
      if (__app?.current?.isDbgLogLegal) console.log(`${props.label} (${props.id}) NOT ALLOWED and hidden during mount.`);
      return;
    }
    wkidTMRef.current = ofekUtils.__geoXfrm_setup();
    if (__app?.current?.isDbgLogLegal) console.log(`${props.label} (${props.id}) IS ALLOWED.`);
    //
    /** Store map-specific info if this is the coordinates widget and we have a valid map ID */
    if (mapWidgetIdRef.current && widgetContext) {
      widgetContext.coordinatesWidgetId = props.id; // Store this widget's ID in its map's context
      // Populate obliqueApp and ofek3dAppUrl from widget config into map context
      widgetContext.obliqueApp = widgetContext.obliqueApp || { name: null, ofekCfgObliqueAppUrl: "" };
      widgetContext.obliqueApp.ofekCfgObliqueAppUrl = ofekUtils.isBlank(props.config.ofekCfgObliqueAppUrl) ? "" : props.config.ofekCfgObliqueAppUrl;
      // Determine ObliqueApp.name based on URL (as in arcgis-map-ofek)
      let newTabUrl = widgetContext.obliqueApp.ofekCfgObliqueAppUrl.toLowerCase();
      if (newTabUrl.includes("publication")) {
        widgetContext.obliqueApp.name = ofekUtils.ObliqueApp.Orbit;
      } else if (newTabUrl.includes("oblivisionjs")) {
        widgetContext.obliqueApp.name = ofekUtils.ObliqueApp.Idan;
      } else {
        widgetContext.obliqueApp.name = null;
      }
      widgetContext.ofek3dAppUrl = props.config.ofek3dAppUrl; // Assuming ofek3dAppUrl is in props.config
      if (__app?.current?.isDbgLog) console.log(`coordinates-ofek: Map context for ${mapWidgetIdRef.current} updated with its info:`, widgetContext);
    }
    //
    /** fitContent */
    const discoveredMapId = ofekUtils.findParentMapWidgetId(props.id, props.label); // Use props.id for function component
    console.log(`${props.label} (id: ${props.id}) map id: ${discoveredMapId} 20250510-15:00`)
    setTimeout(() => {
      //log("** coordinates-ofek-after-mount-2")
      let myElements = document.querySelectorAll("div.jimu-widget.jimu-widget-coordinates")
      for (let myElement of myElements) {
        let parent = myElement.closest(".is-widget")
        if (parent) {
          parent.style.setProperty("width", "fit-content")
        }
      }
    }, 1000)
    //_ml_ added block end

    return () => {
      if (markerGraphic.current) {
        graphicsLayer.current?.remove(markerGraphic.current)
      }
      if (graphicsLayer.current) {
        const map = currentJimuMapView?.view?.map
        map?.remove(graphicsLayer.current)
      }
      if (clickListener.current) clickListener.current?.remove()
      if (moveListener.current) moveListener.current?.remove()
    }
    // eslint-disable-next-line
  }, [props.id, props.config.token, props.label, props.config.ofekCfgObliqueAppUrl, props.config.ofek3dAppUrl]) // _ml_ Added all dependencies

  hooks.useUpdateEffect(() => {
    // _ml_ This effect manages mouse move and click listeners based on locateActive.
    // _ml_ _gali_ For Step 1, inter-widget state (__app.current.maps[mapId].isNewTabWaitingForClick) is NOT considered here.
    const view = currentJimuMapView?.view
    const viewTypeIsThree = view?.type === '3d'
    if (/*true ||*/ enableRealtime) {//_ml_ added "true ||" 20250514
      clickListener.current?.remove()
      moveListener.current?.remove()
      moveListener.current = view?.on('pointer-move', (event) => {
        const point = view.toMap({ x: event.x, y: event.y })
        if (point && point.x && point.y) {//_ml_ added line ("if" envelope top)
          const threeDPoint = { x: event?.native?.pageX, y: event?.native?.pageY }
          onMouseMove(point, viewTypeIsThree ? threeDPoint : undefined)
        }//_ml_ added line ("if" envelope end)
      })
    }//_ml_ commented 20250514
    else {//_ml_ commented 20250514
      clickListener.current?.remove()//_ml_ commented 20250514
      moveListener.current?.remove()//_ml_ commented 20250514
      if (locateActive) {
        clickListener.current = view?.on('click', (event) => {
          const threeDPoint = { x: event?.native?.pageX, y: event?.native?.pageY }
          onMapClick(event, viewTypeIsThree ? threeDPoint : undefined)
        })
      }
    }
    //const __app = window._app_;
    if (__app?.current?.isDbgLogCo) console.log(`** @hooks.useUpdateEffect: enableRealtime=${enableRealtime}, locateActive=${locateActive}`);
  }, [currentJimuMapView, locateActive, enableRealtime, selectedSystemId,
    coordinateSystem, coordinateDecimal, altitudeDecimal, showSeparators, displayOrder])

  useEffect(() => {
    graphicsLayer.current = new GraphicsLayer({ listMode: 'hide' })
    markerGraphic.current = null
    const map = currentJimuMapView?.view?.map
    map?.add(graphicsLayer.current)
    // change status when view switch
    if (__app?.current?.isDbgLogCo) console.log(`** @useEffect[currentJimuMapView]: before- enableRealtime=${enableRealtime}, locateActive=${locateActive}`);
    checkSystemSetTips()
    // eslint-disable-next-line
    if (__app?.current?.isDbgLogCo) console.log(`** @useEffect[currentJimuMapView]: after-enableRealtime=${enableRealtime}, locateActive=${locateActive}`);
  }, [currentJimuMapView, mapInfo, mapInfo2])// _ml_ (_gali_ Removed props.config.mapInfo, props.config.mapInfo2 ???)

  useEffect(() => {//_ml_ func added from 1.17 needed to update locateActive in checkSystemSetTips()
    if (__app?.current?.isDbgLogCo) console.log(`** @useEffect[locateActive, coordinateSystem, selectedSystemId]: before- enableRealtime=${enableRealtime}, locateActive=${locateActive}`);
    checkSystemSetTips()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (__app?.current?.isDbgLogCo) console.log(`** @useEffect[locateActive, coordinateSystem, selectedSystemId]: after- enableRealtime=${enableRealtime}, locateActive=${locateActive}`);
  }, [locateActive, coordinateSystem, selectedSystemId])

  const resetAllGeoInfo = () => {
    setGeoInfo(''); setBaseMapInfo(''); setItmInfo('')//_ml_ added 2 last calls
    setElevInfo('')
    setElevNum(null)
    setElevUnit('')
    /*setEyeInfo('')*/ setEyeInfoTilt('')//_ml_ modified - splitted setEyeInfo to alt and tilt
    setEyeNum(null)
    setEyeUnit('')
    setScaleInfo(''); setZoomInfo(''); setRotationInfo('')//_ml_ added line
    setLocateActive(false)
  }

  const removeLayerAndMarker = () => {
    if (markerGraphic.current) {
      graphicsLayer.current?.remove(markerGraphic.current)
    }
    if (graphicsLayer.current) {
      const orgMap = currentJimuMapView?.view?.map
      orgMap?.remove(graphicsLayer.current)
    }
  }

  const onActiveViewChange = (jimuMapView: JimuMapView) => {
    // switch map: clear all geo info
    resetAllGeoInfo()
    removeLayerAndMarker()
    setCurrentJimuMapView(jimuMapView)
    ofekUtils.rdwt(widgetName, "currentJimuMapView", "wt", jimuMapView)//_ml_ added line
    const view = jimuMapView?.view
    if (!view) return
    mapWkid.current = view?.spatialReference?.wkid
    mapPortalId.current = (view?.map as any)?.portalItem?.id
    // monitor basemap change
    reactiveUtils.watch(() => view?.map?.basemap, () => {
      (view as any).cursor = 'default'
      if (!view?.basemapView) return
      const baseMapView = view.basemapView?.view
      mapWkid.current = baseMapView?.spatialReference?.wkid
      mapPortalId.current = (baseMapView?.map as any)?.portalItem?.id
      checkSystemSetTips()
      resetAllGeoInfo()
      removeLayerAndMarker()
    })
    //_ml_ added block top
    reactiveUtils.watch(() => view?.extent, async () => {
      if (!view?.basemapView) return
      let screenPoint = ofekUtils.rdwt(widgetName, "lastMousePointAsScreenCoordinates", "rd")
      if (screenPoint && screenPoint.x && screenPoint.y) {
        if (__app?.current?.isDbgLogCo) console.log(`** @reactiveUtils - extent change - call displayOnClient`);
        const point = view.toMap(screenPoint)
        await displayOnClient(point, screenPoint)//@reactiveUtils - extent change
      }
    })
    //view.watch("extent", async (evt) => {//_ml_ c
    //  let screenPoint = ofekUtils.rdwt(widgetName, "lastMousePointAsScreenCoordinates", "rd")
    //  if (screenPoint &&
    //    screenPoint.x && screenPoint.y) {
    //    const point = view.toMap(screenPoint)
    //    await displayOnClient(point, screenPoint)
    //  }
    //})
    //_ml_ added block end
  }

  const debounceOnResize = lodash.debounce(
    (width, height) => { onResize(width, height) },
    200
  )

  const onResize = (width, height) => {
    const newWidgetRect = {
      width,
      height
    }
    const notResetSize = width < COORDINATES_MIN_WIDTH || height < COORDINATES_MIN_HEIGHT
    if (notResetSize) return
    setWidgetRect(newWidgetRect)
  }

  const checkSystemSetTips = async () => {
    //const __app = window._app_;
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const canShowClient = await canShowInClient(selectedSystem)//@checkSystemSetTips
    if (canShowClient) {
      if (!locateActive) {
        setEnableRealtime(true)
        setShowMouseTips(true)
        if (__app?.current?.isDbgLogCo) console.log(`** @checkSystemSetTips: canShowClient=${canShowClient}, locateActive=${locateActive} - enableRealtime->true`);
      }
      else {
        if (__app?.current?.isDbgLogCo) console.log(`** @checkSystemSetTips: canShowClient=${canShowClient}, locateActive=${locateActive}, enableRealtime=${enableRealtime} - do nothing`);
      }
    } else {
      setEnableRealtime(false)
      setShowMouseTips(false)
      if (__app?.current?.isDbgLogCo) console.log(`** @checkSystemSetTips: canShowClient=${canShowClient}, locateActive=${locateActive} - enableRealtime->false`);
    }
  }

  const getMarkerGraphic = (mapPoint) => {
    const symbol = new PictureMarkerSymbol({
      url: require('./assets/pin-exb.svg'),
      width: 12,
      height: 22,
      yoffset: 11
    })
    return new Graphic({
      geometry: mapPoint,
      symbol
    })
  }

  const getUsedmapInfo = () => {
    const curMapId = currentJimuMapView?.view?.map?.portalItem?.id
    const mapArr = []
    if (mapInfo) mapArr.push(mapInfo)
    if (mapInfo2) mapArr.push(mapInfo2)
    return mapArr.find(info => info?.id === curMapId)
  }

  const canShowInClient = async (selectedSystem: CoordinateConfig): Promise<boolean> => {////_ml_ _bmk_
    if (__app?.current?.isA) {
      debugger;
    }
    const { wkid, crs } = selectedSystem
    const curWkidNum = parseInt(wkid)
    const curSr = new SpatialReference({ wkid: curWkidNum })
    const mapSr = new SpatialReference({ wkid: mapWkid.current })
    const specialCase = (mapWkid.current === 4326 && curSr.isWebMercator)
      || (mapSr.isWebMercator && curWkidNum === 4326)
      || ((mapWkid.current === 3857 || mapWkid.current === 102100) && curSr.isWebMercator)
      || (mapWkid.current === wkidTMRef.current)//_ml_ added line for 2039
    const curLabel = crs?.name
    // If same wkid with basemap, use the recorded wkid.Otherwise, load wkidutils.
    const uesdConfigMapInfo = getUsedmapInfo()
    // get map label
    const hasMap = useMapWidgetIds && useMapWidgetIds?.length > 0
    const getMapLabel = (): Promise<string> => {
      if (!mapWkid.current || !hasMap) {
        return Promise.resolve('')
      } else if (uesdConfigMapInfo?.wkid && mapWkid.current === uesdConfigMapInfo?.wkid) {
        return Promise.resolve(uesdConfigMapInfo?.label)
      } else {
        if (!modulesLoaded) {
          return moduleLoader.loadModule('jimu-core/wkid').then(module => {
            wkidUtilsRef.current = module
            setModulesLoaded(true)
            const { getSRLabel } = module
            return getSRLabel(mapWkid.current)
          })
        } else {
          const { getSRLabel } = wkidUtilsRef.current
          return getSRLabel(mapWkid.current)
        }
      }
    }
    const mapLabel = await getMapLabel()
    const isSameSR = curLabel && curLabel === mapLabel
    if (isSameSR || specialCase) return true
    return false
  }

  const projectMapPoint = (point, selectedSystem, threeDPoint?) => {
    const { wkid, datumWkid, datumWkid2, displayUnit, crs } = selectedSystem
    if (!wkid) return
    const curWkidNum = parseInt(wkid)
    const curSr = new SpatialReference({ wkid: curWkidNum })
    const mapSr = new SpatialReference({ wkid: mapWkid.current })
    let outWkid = null
    const params = new ProjectParameters({
      geometries: [point],
      transformForward: false
    })

    outWkid = curWkidNum
    let useGeo = false
    let outCrs
    if (curSr.isGeographic) {
      outWkid = curWkidNum
    } else {
      const useDisplayUnit = displayUnit || getDefaultUnits(curSr.isGeographic, mapSr.isWebMercator, crs)
      if (isProjectUnit(useDisplayUnit)) {
        outWkid = curWkidNum
      } else { // geoUnit or USNG, MGRS
        // When output wkid is not used, need to use GEOGCS to find the outSR
        const spheroidStr = getWktKeyStr(crs, 'GEOGCS')
        outCrs = getCrsBySpheroidStr(spheroidStr)
        outWkid = outCrs?.wkid
        useGeo = true
      }
    }

    if (datumWkid && datumWkid2) {
      if (mapPortalId.current === mapInfo.id) {
        params.transformation = new SpatialReference({ wkid: parseInt(datumWkid) })
      } else if (mapPortalId.current === mapInfo2.id) {
        params.transformation = new SpatialReference({ wkid: parseInt(datumWkid2) })
      }
    } else if (datumWkid && !datumWkid2) {
      params.transformation = new SpatialReference({ wkid: parseInt(datumWkid) })
    }
    // This parameter is not used, but used in WAB
    // params.transformForward = JSON.parse(this.forward)
    params.outSpatialReference = new SpatialReference({ wkid: parseInt(outWkid) })
    setGeoInfo(computing)
    const defUrl = utils.getGeometryService()
    geometryService.project(defUrl, params).then(geometries => {
      const point = geometries[0]
      let outputUnit = displayUnit
      // use default units
      if (!outputUnit) {
        outputUnit = getDefaultUnits(curSr.isGeographic, mapSr.isWebMercator, crs)
      }
      if (outputUnit === 'MGRS' || outputUnit === 'USNG') {
        displayUsngOrMgrs(outputUnit, point)
      } else if (isGeographicUnit(outputUnit)) {
        displayDegOrDms(outputUnit, point, mapSr.isWebMercator, useGeo ? outCrs.unit : '')
      } else {
        displayProject(outputUnit, point, mapSr.isWebMercator, useGeo ? outCrs.unit : '')
      }
    })

    let view = currentJimuMapView?.view//_ml_ modified const->let
    //_ml_ added block top
    if (!view) {
      view = ofekUtils.rdwt(widgetName, "currentJimuMapView", "rd")?.view
    }
    //_ml_ added block end
    const viewTypeIsThree = view?.type === '3d'
    if (viewTypeIsThree) {
      _setEyeInfo()
      if (threeDPoint) _setElevInfo(threeDPoint)
    }
    //_ml_ added block top
    else {
      _setEyeInfo2D()
    }//_ml_ added block end
  }

  const onMapClick = async (evt, threeDPoint?) => {//_ml_  _bmk_ called only when locate active
    if (isLockedRef.current) return;//_ml_ added line
    // if (window.appInfo.isRunInMobile) {
    //   return
    // }
    // Changing the reference causes a bug where mark's position is changed the first time
    if (!evt.mapPoint) return
    const copyMapPoint = Point.fromJSON(evt.mapPoint.toJSON())
    evt.stopPropagation()
    setShowTips(false)
    if (enableRealtime || !selectedSystemId)//_ml_ commented 1st condition 20250514
      return
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const canShowClient = await canShowInClient(selectedSystem);//@onMapClick
    const needMarker = canShowClient || locateActive
    if (needMarker && !markerGraphic.current) {
      markerGraphic.current = getMarkerGraphic(evt.mapPoint)
      graphicsLayer.current.add(markerGraphic.current)
    }
    if (canShowClient) {
      //_ml_ added block top
      let lng, lat, pItm;
      if (copyMapPoint.spatialReference.wkid === wkidTMRef.current) {
        pItm = copyMapPoint;
        let pGeo = await ofekUtils.itm2geo(copyMapPoint);
        lng = pGeo.longitude;
        lat = pGeo.latitude;
      } else {
        lng = copyMapPoint.longitude;
        lat = copyMapPoint.latitude;
        pItm = await ofekUtils.geo2itm(copyMapPoint);
      }
      let newTabDataObj = { lng: lng, lat: lat, p: pItm }
      ofekUtils.rdwt(widgetName, "newTabDataObj", "wt", newTabDataObj)
      //DialogBox.handleClickToOpenDBox();//_ml_ c
      if (1 === 2) {
        let promptMsg = translate('promptMsgChooseNewTab')
        let choice = prompt(promptMsg);
        if (ofekUtils.isBlank(choice)) {
          choice = null
        } else if (choice.charAt(0).toLowerCase() === "g") {
          choice = "g"
        } else if (choice.charAt(0).toLowerCase() === "v") {
          choice = "v"
        } else if (choice.charAt(0).toLowerCase() === "d") {
          choice = "d"
        } else {
          choice = null
        }
        switch (choice) {
          case "g":
            let urlGooglemap = 'https://www.google.com/maps/?q=loc:' + lat + ',' + lng;
            ofekUtils.openNewBackgroundTab(urlGooglemap);//@promptMsgChooseNewTab
            ofekUtils.monitor("coordinates", "open-app-in-new-tab", "Success", "app-in-new-tab=google-map")
            break;
          case "v":
            let urlGovmap = `https://www.govmap.gov.il/?z=9&lay=NADLAN,NEIGHBORHOODS_AREA`;
            urlGovmap = `${urlGovmap}${urlGovmap.includes("?") ? "&" : "?"}c=${lng},${lat}&crs=4326`;
            ofekUtils.openNewBackgroundTab(urlGovmap);//@promptMsgChooseNewTab
            ofekUtils.monitor("coordinates", "open-app-in-new-tab", "Success", "app-in-new-tab=gov-map")
            break;
          case "d":
            let obliqueAppUrl = ofekCfgObliqueAppUrl
            obliqueAppUrl = `${obliqueAppUrl}${obliqueAppUrl.includes("?") ? "&" : "?"}x=${pItm.x}&y=${pItm.y}&crs=2039`;
            ofekUtils.openNewBackgroundTab(obliqueAppUrl);//@promptMsgChooseNewTab
            ofekUtils.monitor("coordinates", "open-app-in-new-tab", "Success", "app-in-new-tab=diagonal-project")
            break;
          default:
            break;
        }
      }
      //_ml_ added block end
      markerGraphic.current.geometry = evt.mapPoint
      await displayOnClient(copyMapPoint, threeDPoint)//_ml_ modified async @onMapClick
      toggleIsOpenModalCoord()//_ml_ added line route_newTab-02 @@@ onMapClick
      return;//_ml_ TODO why 1.14 added return here?
    }
    if (locateActive) {
      markerGraphic.current.geometry = evt.mapPoint
      const { x, y } = evt.mapPoint
      const mapSr = currentJimuMapView?.view?.spatialReference
      const point = new Point({ x, y, spatialReference: mapSr })
      projectMapPoint(point, selectedSystem, threeDPoint)
    }
  }

  const onMouseMove = async (point, threeDPoint?) => {//_ml_ _bmk_ cc in mark mode we dont come here
    if (isLockedRef.current)//_ml_ added line
      return;//_ml_ added line
    // if (window.appInfo.isRunInMobile) {
    //   return
    // }
    setShowMouseTips(false)
    if (!enableRealtime || !selectedSystemId)//_ml_ commented 1st condition 20250514
      return
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const canShowClient = await canShowInClient(selectedSystem)//@onMouseMove
    if (canShowClient) {
      //setLastMousePointAsScreenCoordinates(threeDPoint)//_ml_ c
      ofekUtils.rdwt(widgetName, "lastMousePointAsScreenCoordinates", "wt", threeDPoint ? threeDPoint : point)//_ml_ added line
      await displayOnClient(point, threeDPoint)//_ml_ modified async @onMouseMove
    }
    //_ml_ added block top co_is__alone
    //if (__app.current.newTab && __app.current.newTab.name) {//@onMouseMove
    //  if (__app.current.newTab.state === "start") {//_ml_ route_img_on 1
    //    __app.current.newTab.state = "waitingForMapClick"//@onMouseMove
    //    await onLocateClick()//_ml_ route_img_on.1 route_newTab-08 shut-off all 3 newTab image-widgets
    //  }
    //  else if (__app.current.newTab.state === "off") {//@onMouseMove
    //    clearNewTabWidgets()
    //  }
    //}
    //_ml_ added block end co_is__alone
  }

  const unitToNls = (unit): string => {
    return unitNlsMap[unit] || unitNlsMap[unit?.toUpperCase()]
  }

  const displayUsngOrMgrs = (unit: 'MGRS' | 'USNG', normalizedPoint) => {
    coordinateFormatter.load().then(() => {
      const nlsUnit = unitToNls(unit)
      if (unit === 'MGRS') {
        const mgrs = coordinateFormatter.toMgrs(normalizedPoint, 'automatic', 5)
        setGeoInfo(`${mgrs} ${nlsUnit}`)
      } else if (unit === 'USNG') {
        const usng = coordinateFormatter.toUsng(normalizedPoint, 5)
        setGeoInfo(`${usng} ${nlsUnit}`)
      }
    })
  }

  const displayDegOrDms = (unit: string, normalizedPoint, mapIsMercator?: boolean, outCrsUnit?: string) => {//_ml_ _bmk_
    let { x, y } = normalizedPoint
    const orderXy = displayOrder === DisplayOrderType.xy
    // get unitRate
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const { crs } = selectedSystem
    const defaultUnit = outCrsUnit || getCSUnitByCrs(crs)
    //const unitRate = getUnitRate(defaultUnit, unit, mapIsMercator)//_ml_ line replaced by next line
    const unitRate = normalizedPoint.spatialReference.wkid === 4326 ? 1 : getUnitRate(defaultUnit, unit, mapIsMercator)//_ml_ line
    x = x * unitRate
    y = y * unitRate
    if (unit === 'DEGREE_MINUTE_SECONDS') {
      x = degToDMS(x, 'LON', coordinateDecimal, showSeparators)
      y = degToDMS(y, 'LAT', coordinateDecimal, showSeparators)
      orderXy ? setGeoInfo(`${x} ${y}`) : setGeoInfo(`${y} ${x}`)
    } else if (unit === 'DEGREES_DECIMAL_MINUTES') {
      //for hack DEGREES_DECIMAL_MINUTES
      x = degToDDM(x, coordinateDecimal, showSeparators, 'longitude')
      y = degToDDM(y, coordinateDecimal, showSeparators, 'latitude')
      orderXy ? setGeoInfo(`${x} ${y}`) : setGeoInfo(`${y} ${x}`)
    } else {
      const nlsUnit = unitToNls(unit)
      //orderXy ? setGeoInfo(`${toFormat(x)} ${toFormat(y)} ${nlsUnit}`) : setGeoInfo(`${toFormat(y)} ${toFormat(x)} ${nlsUnit}`)//_ml_ replaced by next block
      //_ml_ added block top
      if (ofekUtils.isRtlLocale()) {
        orderXy
          ? setGeoInfo(`${toFormat(y)} ${toFormat(x)} ${nlsUnit}`)
          : setGeoInfo(`${toFormat(x)} ${toFormat(y)} ${nlsUnit}`)
      } else {
        orderXy
          ? setGeoInfo(`${toFormat(x)} ${toFormat(y)} ${nlsUnit}`)
          : setGeoInfo(`${toFormat(y)} ${toFormat(x)} ${nlsUnit}`)
      }
      //_ml_ added block end
    }
  }

  const toFormat = (num) => {
    if (isNaN(num)) return ''
    return localizeNumberBySettingInfo(num, {
      places: coordinateDecimal,
      digitSeparator: showSeparators
    })
  }

  const displayProject = (unit: string, normalizedPoint, mapIsMercator?: boolean, outCrsUnit?: string) => {
    let { x, y } = normalizedPoint
    // get unitRate
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const { crs } = selectedSystem
    const defaultUnit = outCrsUnit || getCSUnitByCrs(crs)
    const unitRate = getUnitRate(defaultUnit, unit, mapIsMercator)
    x = x * unitRate
    y = y * unitRate
    const nlsUnit = unitToNls(unit)
    //const orderXy = displayOrder === DisplayOrderType.xy//_ml_ modified - line replaced by next line
    const orderXy = displayOrder === (ofekUtils.isRtlLocale() ? DisplayOrderType.yx : DisplayOrderType.xy)//_ml_ modified
    orderXy
      ? setGeoInfo(`${toFormat(x)} ${toFormat(y)} ${nlsUnit}`)
      : setGeoInfo(`${toFormat(y)} ${toFormat(x)} ${nlsUnit}`)
  }

  const getDefaultUnits = (isGeographic: boolean, mapIsWebMercator: boolean, crs: any): string => {
    const userUnit = getUnits()
    let outputUnit = ''
    if (isGeographic) {
      outputUnit = getCSUnitByCrs(crs)
      if (!outputUnit) outputUnit = 'METER'
    } else {
      outputUnit = userUnit === 'english' ? 'FOOT' : 'METER'
    }
    //default show mercator is degrees.
    if (mapIsWebMercator) {
      outputUnit = 'DECIMAL_DEGREES'
    }
    return outputUnit
  }

  const _setElevInfo = (threeDPoint) => {
    let view = currentJimuMapView?.view//_ml_ modified const->let
    //_ml_ added block top
    if (!view) {
      view = ofekUtils.rdwt(widgetName, "currentJimuMapView", "rd")?.view
    }
    //_ml_ added block end
    if (!threeDPoint) {
      setElevInfo('')
      setElevNum(null)
      setElevUnit('')
      return
    }
    view.hitTest({
      x: threeDPoint.x,
      y: threeDPoint.y
    }).then(position => {
      let elev = ''
      // if (!isJustElev) {
      //   this._setLonLat(position);
      // }
      if (position.results && position.results[0] &&
        position.results[0].mapPoint && position.results[0].mapPoint.z) {
        elev = _getElev(position.results[0].mapPoint) // result elev(raycasting)
        setElevInfo(elev)
      } else if (typeof position !== 'undefined' && position.ground &&
        position.ground.mapPoint !== null && typeof position.ground.mapPoint.z !== 'undefined') {
        elev = _getElev(position.ground.mapPoint) // ground elev
      }
      setElevInfo(elev)
    })
  }

  const _getElev = (pos) => {
    let elev = ''
    if (pos && pos.z !== undefined) {
      const { num, unit } = trunNumToKmOrM(pos.z, true)
      const abbtUnit = unitAbbrMap[unit]
      setElevNum(num)
      setElevUnit(unit)
      elev = `${translate('elev', { ele: abbtUnit })} ${num} ${unit}`//_ml_ line replaced by next
      elev = `${translate('elev')} ${num} ${abbrUnit}`//_ml_ modified
    } else {
      setElevNum(null)
      setElevUnit('')
    }
    return elev
  }

  const _setEyeInfoOrg = () => {//_ml_ func replaced
    const view = currentJimuMapView?.view
    if (!view || !view?.camera || !view?.camera?.position) {
      setEyeInfo('')
      setEyeNum(null)
      setEyeUnit('')
      return
    }
    const eyeAlt = view.camera.position?.z
    const { num, unit } = trunNumToKmOrM(eyeAlt)
    const abbtUnit = unitAbbrMap[unit]
    setEyeInfo(`${translate('eyeAlt', { alt: abbtUnit })} ${num} ${unit}`)
    setEyeNum(num)
    setEyeUnit(unit)
  }
  const _setEyeInfo2D = () => {//_ml_ added func
    setScaleInfo('')
    setZoomInfo('')
    setRotationInfo('')
    const view = currentJimuMapView?.view
    if (view?.center) {//_ml_ added "?"
      let scale = Math.round(view.scale * 1) / 1
      setScaleInfo(`${translate('scale')} ${scale}`)
      let zoom = view.zoom.toFixed(2)
      setZoomInfo(`${translate('zoom')} ${zoom}`)
      let heading = view.viewpoint.rotation
      if (heading > 180) heading = heading - 360;
      let headingStr
      if (heading >= 0) {
        heading = heading.toFixed(1);
        headingStr = `${heading}`;
      } else {
        heading = - heading;
        heading = heading.toFixed(1);
        if (ofekUtils.isRtlLocale()) {
          headingStr = `${heading}-`;
        } else {
          headingStr = `-${heading}`;
        }
      }
      setRotationInfo(`${translate('heading')} ${headingStr}`)
    }
  }
  const _setEyeInfo = () => {//_ml_ modified func
    let view = currentJimuMapView?.view//_ml_ modified const->let
    //_ml_ added block top
    if (!view) {
      view = ofekUtils.rdwt(widgetName, "currentJimuMapView", "rd")?.view
    }
    //_ml_ added block end
    if (!view || !view?.camera || !view?.camera?.position) {
      //setEyeInfo('')//_ml_ modified deleted
      setEyeNum(null)
      setEyeUnit('')
      //_ml_ added block top
      setEyeInfoAlt('')
      setEyeInfoTilt('')
      setScaleInfo('')
      setZoomInfo('')
      setRotationInfo('')
      //_ml_ added block end
      return
    }
    //_ml_ added block top
    let scale = Math.round(view.scale * 1) / 1
    //setScaleInfo(`${translate('scale')} ${scale}`)
    let zoom = view.zoom.toFixed(2)
    //setZoomInfo(`${translate('zoom')} ${zoom}`)
    let heading = view.camera.heading
    if (heading > 180) heading = heading - 360;
    let headingStr
    if (heading >= 0) {
      heading = heading.toFixed(1);
      headingStr = `${heading}`;
    } else {
      heading = - heading;
      heading = heading.toFixed(1);
      if (ofekUtils.isRtlLocale()) {
        headingStr = `${heading}-`;
      } else {
        headingStr = `-${heading}`;
      }
    }
    setRotationInfo(`${translate('heading')} ${headingStr}`)
    const tilt = view.camera.tilt.toFixed(1)
    setEyeInfoTilt(`${translate(`eyeTilt`)} ${tilt}`)
    //_ml_ added block end

    const eyeAltValue = view.camera.position?.z
    const { num, unit } = tranNumToKmOrM(eyeAltValue)
    //setEyeInfoAlt(num)//_ml_ c
    const abbtUnit = unitAbbrMap[unit]
    ////setEyeInfo(`${translate('eyeAlt', { alt: abbtUnit })} ${num} ${unit}`)//_ml_ modified line replaced by next pair of lines
    ////setEyeInfo(`${translate('eyeAlt', { alt: abbtUnit })} ${num}`)//_ml_ c
    ////setEyeInfo(`${translate('eyeAlt')} ${num} ${abbtUnit} | ${translate(`eyeTilt`)} ${tilt}`)//_ml_ c
    //setEyeInfo(`${eyeInfoAlt} | ${eyeInfoTilt}`)//_ml_ c
    //_ml_ added block top
    setEyeInfoAlt(`${translate('eyeAlt')} ${num} ${abbtUnit}`)
    setEyeInfoTilt(`${translate(`eyeTilt`)} ${tilt}`)
    //_ml_ added block end
    setEyeNum(num)
    setEyeUnit(unit)
  }

  const trunNumToKmOrM = (num, isElev?: boolean) => {
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const { elevationUnit } = selectedSystem
    const isMetric = elevationUnit === ElevationUnitType.metric
    if (!num) return { num: 0, unit: isMetric ? unitMeters : unitFoot }
    let unit = ''
    const unitRate = 1
    let threshold = 1000
    num = parseFloat(num)
    if (isElev) {
      //switch to km if more than 10,000 m.
      threshold = 10000
    }
    if (isMetric) {
      if (num >= threshold || num <= -(threshold)) {
        num = num / 1000
        unit = unitKilometers
      } else {
        unit = unitMeters
      }
    } else {
      //show elevation in feet and not meters.
      num = num * unitRate
      unit = unitFoot
    }
    num = localizeNumberBySettingInfo(num, {
      places: altitudeDecimal,
      digitSeparator: showSeparators
    })
    return { num, unit }
  }

  const getOutputWkid = (selectedSystem: CoordinateConfig) => {
    const { wkid, displayUnit, crs } = selectedSystem
    const curWkidNum = parseInt(wkid)
    let outWkid = curWkidNum
    const curSr = new SpatialReference({ wkid: curWkidNum })
    const mapSr = new SpatialReference({ wkid: mapWkid.current })
    let outCrs
    if (!curSr.isGeographic) {
      const useDisplayUnit = displayUnit || getDefaultUnits(curSr.isGeographic, mapSr.isWebMercator, crs)
      if (isProjectUnit(useDisplayUnit)) {
        outWkid = curWkidNum
      } else { // geoUnit or USNG, MGRS
        // When output wkid is not used, need to use GEOGCS to find the outSR
        const spheroidStr = getWktKeyStr(crs, 'GEOGCS')
        outCrs = getCrsBySpheroidStr(spheroidStr)
        outWkid = outCrs?.wkid
      }
    }
    return outWkid
  }

  const displayOnClientOrg = async (mapPoint, threeDPoint?) => {//_ml_ modified async
    // when the mouse pointer out of earth, show eyeInfo only
    if (!mapPoint || !mapPoint?.x || !mapPoint?.y) {
      //setElevInfo(''); setElevNum(null); setElevUnit(''); setGeoInfo('');//_ml_ line replaced by next block
      //_ml_ added block top
      setGeoInfo(''); setBaseMapInfo(''); setItmInfo('')//_ml_ added 2 last calls
      setElevInfo(''); setElevNum(null); setElevUnit('')
      setEyeInfoAlt(''); setEyeInfoTilt('')//_ml_ added line
      setScaleInfo(''); setZoomInfo(''); setRotationInfo('')//_ml_ added line
      //_ml_ added block end
      return
    }
    let pItm = null;//_ml_ added line
    const copyMapPoint = Point.fromJSON(mapPoint.toJSON())
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const { displayUnit, wkid, crs } = selectedSystem
    const curWkidNum = parseInt(wkid)
    const curSr = new SpatialReference({ wkid: curWkidNum })
    const mapSr = new SpatialReference({ wkid: mapWkid.current })
    let { x, y } = mapPoint
    //_ml_ added block top
    if (ofekUtils.isRtlLocale()) {
      let unitMeter = translate('meterAbbr')
      setBaseMapInfo(`${x.toFixed(1)} ${y.toFixed(1)} ${unitMeter} `)
    } else {
      setBaseMapInfo(`${x.toFixed(1)} ${y.toFixed(1)} m `)
    }
    //_ml_ added block end
    const convertInClient = (mapWkid.current === 4326 && curSr.isWebMercator)
      || (mapSr.isWebMercator && curWkidNum === 4326)
    //|| ((mapWkid.current === 3857 || mapWkid.current === 102100) && curSr.isWebMercator)
    //|| (mapWkid.current === wkidTMRef.current)//_ml_ added line for 2039
    let normalizedPoint = null
    // make sure longitude values stays within -180/180
    normalizedPoint = mapPoint.normalize()
    // get default units
    let outputUnit = displayUnit
    const systemDefaultUnit = getDefaultUnits(curSr.isGeographic, mapSr.isWebMercator, crs)
    // const systemDefaultUnit = getCSUnitByCrs(crs)
    if (!outputUnit) {
      outputUnit = systemDefaultUnit
    }
    // this means system output unit
    const isGeoUnit = isGeographicUnit(outputUnit)
    const isProUnit = isProjectUnit(outputUnit)
    if (isGeoUnit) {//true for geo or webMercator
      //_ml_ added block top
      pItm = await ofekUtils.geo2itm(normalizedPoint);
      if (pItm && pItm.x && pItm.y) {
        if (ofekUtils.isRtlLocale()) {
          let unitMeter = translate('meterAbbr')
          setItmInfo(`${pItm.y.toFixed(1)} ${pItm.x.toFixed(1)} ${unitMeter}`)
        } else {
          setItmInfo(`${pItm.x.toFixed(1)} ${pItm.y.toFixed(1)} m`)
        }
      } else {
        setItmInfo('')
      }
      //_ml_ added block end
      x = normalizedPoint.longitude || x
      y = normalizedPoint.latitude || y
      normalizedPoint.x = x
      normalizedPoint.y = y
    }

    // 'MGRS' & 'USNG' need to convert pro point to gcs point
    const convertPoint = projection.project(copyMapPoint, new SpatialReference({ wkid: getOutputWkid(selectedSystem) }))
    if (convertInClient) {//
      // process special case
      if (mapPoint.spatialReference.wkid === 4326 && curSr.isWebMercator) {
        if (outputUnit === 'MGRS' || outputUnit === 'USNG') {
          displayUsngOrMgrs(outputUnit, convertPoint)
        } else if (isGeoUnit) {
          displayDegOrDms(outputUnit, normalizedPoint, mapSr.isWebMercator)
        } else if (isProUnit) {
          const mCoord = webMercatorUtils.lngLatToXY(x, y)
          displayProject(outputUnit, { x: mCoord[0], y: mCoord[1] }, mapSr.isWebMercator)
        }
      } else if (curWkidNum === 4326 && mapSr.isWebMercator) {
        if (outputUnit === 'MGRS' || outputUnit === 'USNG') {
          displayUsngOrMgrs(outputUnit, convertPoint)
        } else if (isGeoUnit) {
          displayDegOrDms(outputUnit, normalizedPoint, mapSr.isWebMercator)
        }
      }
    } else {
      // setting display units
      if (mapPoint.spatialReference.wkid === 4326 || mapPoint.spatialReference.isWebMercator) {
        if (outputUnit === 'MGRS' || outputUnit === 'USNG') {
          displayUsngOrMgrs(outputUnit, convertPoint)
        } else if (isGeoUnit) {
          displayDegOrDms(outputUnit, normalizedPoint, mapSr.isWebMercator)
        } else if (isProUnit) {
          displayProject(outputUnit, normalizedPoint, mapSr.isWebMercator)
        }
      } else { // proj or geo
        if (curSr.isGeographic) {
          if (outputUnit === 'MGRS' || outputUnit === 'USNG') {
            displayUsngOrMgrs(outputUnit, convertPoint)
          } else if (isGeoUnit) {
            displayDegOrDms(outputUnit, normalizedPoint, mapSr.isWebMercator)
          }
        } else {
          displayProject(outputUnit, normalizedPoint, mapSr.isWebMercator)
        }
      }
    }

    let view = currentJimuMapView?.view//_ml_ modified const->let
    //_ml_ added block top
    if (!view) {
      view = ofekUtils.rdwt(widgetName, "currentJimuMapView", "rd")?.view
    }
    //_ml_ added block end
    const viewTypeIsThree = view?.type === '3d'
    if (viewTypeIsThree) {
      _setEyeInfo()
      if (threeDPoint) _setElevInfo(threeDPoint)
    }
    //_ml_ added block top (because useState problem?)
    else {
      _setEyeInfo2D()
    }
    //_ml_ added block end
  }

  const displayOnClient = async (mapPoint, threeDPoint?) => {//_ml_ modified async
    // when the mouse pointer out of earth, show eyeInfo only
    if (!mapPoint || !mapPoint?.x || !mapPoint?.y) {
      //setElevInfo(''); setElevNum(null); setElevUnit(''); setGeoInfo('');//_ml_ line replaced by next block
      //_ml_ added block top
      setGeoInfo(''); setBaseMapInfo(''); setItmInfo('')//_ml_ added 2 last calls
      setElevInfo(''); setElevNum(null); setElevUnit('')
      setEyeInfoAlt(''); setEyeInfoTilt('')//_ml_ added line
      setScaleInfo(''); setZoomInfo(''); setRotationInfo('')//_ml_ added line
      //_ml_ added block end
      return
    }
    let pItm = null;//_ml_ added line
    let pGeo = null;//_ml_ added line
    const copyMapPoint = Point.fromJSON(mapPoint.toJSON())
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const { displayUnit, wkid, crs } = selectedSystem
    const curWkidNum = parseInt(wkid)
    const curSr = new SpatialReference({ wkid: curWkidNum })
    const mapSr = new SpatialReference({ wkid: mapWkid.current })
    let { x, y } = mapPoint
    //_ml_ added block top
    if (ofekUtils.isRtlLocale()) {
      let unitMeter = translate('meterAbbr')
      setBaseMapInfo(`${x.toFixed(1)} ${y.toFixed(1)} ${unitMeter} `)
    } else {
      setBaseMapInfo(`${x.toFixed(1)} ${y.toFixed(1)} m `)
    }
    //_ml_ added block end
    const convertInClient = (mapWkid.current === 4326 && curSr.isWebMercator)
      || (mapSr.isWebMercator && curWkidNum === 4326)
      || ((mapWkid.current === 3857 || mapWkid.current === 102100) && curSr.isWebMercator)
      || (mapWkid.current === wkidTMRef.current)//_ml_ added line for 2039
    let normalizedPoint = null
    normalizedPoint = mapPoint.normalize();// make sure longitude values stays within -180/180
    // get default units
    let outputUnit = displayUnit
    const systemDefaultUnit = getDefaultUnits(curSr.isGeographic, mapSr.isWebMercator, crs);
    // const systemDefaultUnit = getCSUnitByCrs(crs)
    if (!outputUnit) {
      outputUnit = systemDefaultUnit
    }
    outputUnit = outputUnit.toUpperCase(); // this means system output unit
    if (mapWkid.current === wkidTMRef.current) {//true for geo or webMercator
      pItm = mapPoint;
      pGeo = await ofekUtils.itm2geo(normalizedPoint);
    }
    else {
      pGeo = normalizedPoint;
      pItm = await ofekUtils.geo2itm(normalizedPoint);
      x = normalizedPoint.longitude || x
      y = normalizedPoint.latitude || y
      normalizedPoint.x = x
      normalizedPoint.y = y
    }
    if (pItm && pItm.x && pItm.y) {
      let unitMeter = translate('meterAbbr')
      if (ofekUtils.isRtlLocale()) {
        setItmInfo(`${pItm.y.toFixed(1)} ${pItm.x.toFixed(1)} ${unitMeter}`)
      } else {
        setItmInfo(`${pItm.x.toFixed(1)} ${pItm.y.toFixed(1)} ${unitMeter}`)
      }
    } else {
      setItmInfo('')
    }
    if (pGeo) {
      displayDegOrDms("DECIMAL_DEGREES", pGeo, mapSr.isWebMercator)
    }

    let view = currentJimuMapView?.view//_ml_ modified const->let
    //_ml_ added block top
    if (!view) {
      view = ofekUtils.rdwt(widgetName, "currentJimuMapView", "rd")?.view
    }
    //_ml_ added block end
    const viewTypeIsThree = view?.type === '3d'
    if (viewTypeIsThree) {
      _setEyeInfo()
      if (threeDPoint) _setElevInfo(threeDPoint)
    }
    //_ml_ added block top (because useState problem?)
    else {
      _setEyeInfo2D()
    }
    //_ml_ added block end
  }

  const onLocateClick = async () => {//_ml_   _bmk_
    if (isLockedRef.current)//_ml_ added line
      return;//_ml_ added line
    setGeoInfo(''); setBaseMapInfo(''); setItmInfo('')//_ml_ added 2 last calls
    setElevInfo(''); setElevNum(null); setElevUnit('')
    /*setEyeInfo('')*/ setEyeInfoAlt(''); setEyeInfoTilt(''); setEyeNum(null); setEyeUnit('')//_ml_ modified - splitted setEyeInfo
    setScaleInfo(''); setZoomInfo(''); setRotationInfo('')//_ml_ added
    // Inform other widgets, map is used. _ml_ block copied from 1.17
    if (locateActive) {
      getAppStore().dispatch(
        appActions.releaseAutoControlMapWidget(useMapWidgetId)
      )
    } else {
      getAppStore().dispatch(
        appActions.requestAutoControlMapWidget(useMapWidgetId, id)
      )
    }
    graphicsLayer.current.remove(markerGraphic.current)
    markerGraphic.current = null
    const selectedSystem = coordinateSystem.find(item => item.id === selectedSystemId)
    const canShowClient = await canShowInClient(selectedSystem)//@onLocateClick
    if (canShowClient) {
      if (!locateActive) {
        setShowTips(true)
        setShowMouseTips(false)
        setEnableRealtime(false)
      }
      else {
        setShowTips(false)
        setShowMouseTips(true)
        setEnableRealtime(true)
      }
    }
    else {
      setShowMouseTips(false)
      setEnableRealtime(false)
      if (!locateActive) {
        setShowTips(true)
      }
      else {
        setShowTips(false)
        setGeoInfo(''); setBaseMapInfo(''); setItmInfo('')//_ml_ added 2 last calls
      }
    }
    if (currentJimuMapView?.view) {
      const cursorType = locateActive ? 'default' : 'crosshair'
      currentJimuMapView.view.cursor = cursorType
    }
    //_ml_ added block top
    //const __app = window._app_;
    if (locateActive && __app.current.newTab) {//@onLocateClick route_newTab-09 shut-off all 3 newTab image-widgets
      //if (__app.current.newTab?.name) {//co_is__alone
      //  ofekUtils.setImageOfNewTabWidget(__app.current.newTab?.name);
      //}
      __app.current.newTab = null; //@onLocateClick co_is__alone @onLocateClick
    }
    //_ml_ added block end
    setLocateActive(!locateActive)//@onLocateClick reset locateactive
  }

  const handleSystemChange = async (systemId: string) => {
    const selectedSystem = coordinateSystem.find(item => item.id === systemId)
    const canShowClient = await canShowInClient(selectedSystem)//@handleSystemChange
    if (canShowClient) {
      setEnableRealtime(true)
      setShowMouseTips(true)
    } else {
      setEnableRealtime(false)
      setShowMouseTips(false)
    }
    setSelectedSystemId(systemId)
    setLocateActive(false)
    setShowTips(false)
    setGeoInfo(''); setBaseMapInfo(''); setItmInfo('')//_ml_ added 2 last calls
    setElevInfo(''); setElevNum(null); setElevUnit('')
    /*setEyeInfo('')*/ setEyeInfoAlt(''); setEyeInfoTilt(''); setEyeNum(null); setEyeUnit('')//_ml_ modified - splitted setEyeInfo
    setScaleInfo(''); setZoomInfo(''); setRotationInfo('')//_ml_ added
    graphicsLayer.current.remove(markerGraphic.current)
    markerGraphic.current = null
  }

  //_ml_ added block top
  // modal_db
  const radioHandler = (event: React.ChangeEvent<HTMLInputElement>) => {//_ml_  _bmk_
    if (isLockedRef.current) return;
    // This function will be triggered when a radio button is selected
    openNewTab(event.target.value); // @radioHandler
    toggleIsOpenModalCoord()// by radioBtn
  }
  const openNewTab = (nawTabName) => {//_ml_ route_newTab-00 _bmk_
    if (isLockedRef.current) return;
    //const __app = window._app_;
    let newTabDataObj = ofekUtils.rdwt(widgetName, "newTabDataObj", "rd")
    let { lat, lng, p } = newTabDataObj
    let widget = /*(__app.current.newTab?.name) ? __app.current.newTab.name :*/ "coordinates";//@openNewTab co_is__alone
    let isNewTabOpened = false
    switch (nawTabName) {
      case ofekUtils.enumNewTab.googlemapName:
        isNewTabOpened = true
        let urlGooglemap = 'https://www.google.co.il/maps/?hl=iw&q=loc:' + lat + ',' + lng;
        ofekUtils.openNewBackgroundTab(urlGooglemap);//@openNewTab
        ofekUtils.monitor(widget, "open-app-in-new-tab", "Success", "app-in-new-tab=google-map")
        break;
      case ofekUtils.enumNewTab.govmapName:
        isNewTabOpened = true
        let urlGovmap = `https://www.govmap.gov.il/?z=9&lay=NADLAN,NEIGHBORHOODS_AREA`;
        urlGovmap = `${urlGovmap}${urlGovmap.includes("?") ? "&" : "?"}c=${p.x},${p.y}&crs=4326&bs=NEIGHBORHOODS_AREA%7C${p.x},${p.y}`;
        ofekUtils.openNewBackgroundTab(urlGovmap);//@openNewTab
        ofekUtils.monitor(widget, "open-app-in-new-tab", "Success", "app-in-new-tab=gov-map")
        break;
      case ofekUtils.enumNewTab.ofek3dAppName:
        isNewTabOpened = true
        let urlOfek3dApp = configOfekCfgOfek3dAppUrl;
        urlOfek3dApp = `${urlOfek3dApp}${urlOfek3dApp.includes("?") ? "&" : "?"}x=${p.x}&y=${p.y}`;
        ofekUtils.openNewBackgroundTab(urlOfek3dApp);//@openNewTab
        ofekUtils.monitor(widget, "open-app-in-new-tab", "Success", "app-in-new-tab=ofek-3d-app")
        break;
      case ofekUtils.enumNewTab.obliqueAppName:
      case ofekUtils.ObliqueApp.Idan:
      case ofekUtils.ObliqueApp.Orbit:
        isNewTabOpened = true
        let obliqueAppUrl = configOfekCfgObliqueAppUrl;//@openNewTab  ofekCfgObliqueAppUrl
        obliqueAppUrl = `${obliqueAppUrl}${obliqueAppUrl.includes("?") ? "&" : "?"}x=${p.x}&y=${p.y}&crs=2039`;
        ofekUtils.openNewBackgroundTab(obliqueAppUrl);//@openNewTab
        ofekUtils.monitor(widget, "open-app-in-new-tab", "Success", "app-in-new-tab=diagonal-project")
        break;
    }
    if (isNewTabOpened) {
      clearNewTabWidgets()
    }
  }
  const clearNewTabWidgets = () => {//_ml_ added func _bmk_
    if (isLockedRef.current) return;
    //const __app = window._app_;
    //if (__app.current.newTab?.name) {//@clearNewTabWidgets co_is__alone
    //  ofekUtils.setImageOfNewTabWidget(__app.current.newTab?.name);
    //}
    __app.current.newTab = null; //@clearNewTabWidgets co_is__alone
    if (currentJimuMapView?.view) {
      const cursorType = locateActive ? 'default' : 'crosshair'
      currentJimuMapView.view.cursor = cursorType
    }
    graphicsLayer.current.remove(markerGraphic.current)
    markerGraphic.current = null
    setLocateActive(!locateActive)
  }
  const toggleIsOpenModalCoord = () => {//_ml_ route_newTab-04 _bmk_
    if (isLockedRef.current) return;
    //const __app = window._app_;
    if (isOpenModalCoord) {
      setIsOpenModalCoord(!isOpenModalCoord)
      if (__app?.current?.newTab) {
        //if (__app.current.newTab?.name) {// co_is__alone
        //  ofekUtils.setImageOfNewTabWidget(__app.current.newTab?.name);//@clearNewTabWidgets
        //}
        __app.current.newTab = null; //@toggleIsOpenModalCoord co_is__alone
      }
    } else {//co_is__alone - comment the 2 if sentences
      //if (__app.current.newTab?.name && __app.current.newTab.state === "start") {
      //  __app.current.newTab.state = "waitingForMapClick"
      //}
      //if (__app.current.newTab?.name && __app.current.newTab?.state === "waitingForMapClick") {// move from "start" to "waitingForMapClick"
      //  openNewTab(__app.current.newTab.name); // @toggleIsOpenModalCoord image was clicked. open new tab
      //}
      //else {
      setIsOpenModalCoord(!isOpenModalCoord)//coordinates "+" was clicked. open modal with radio buttons
      if (__app.current.newTab) {
        //if (__app.current.newTab?.name) {// co_is__alone
        //  ofekUtils.setImageOfNewTabWidget(__app.current.newTab?.name);//@clearNewTabWidgets
        //}
        __app.current.newTab = null; //@toggleIsOpenModalCoord co_is__alone
      }
      //}
    }
  }
  //_ml_ added block end modal_db

  const useMap = useMapWidgetIds?.length > 0
  if (!useMap) {
    return (
      <WidgetPlaceholder
        widgetId={id}
        icon={coordinatesIcon}
        data-testid='coordinatesPlaceholder'
        message={placeHolderName}
        css={css`
          & {
            ${controllerWidgetId && `
              min-height: 140px;
              min-width: 242px;
              .thumbnail-wrapper {
                padding: 46px 0 !important;
              }
            `}
          }
        `}
      />
    )
  }
  const locateBtnTips = locateActive ? disableClickTips : enableClickTips
  const isClassic = widgetStyle === WidgetStyleType.classic
  const hasSecondDivider = geoInfo || elevInfo
  //const classicGeo = `${geoInfo}${elevInfo && `${geoInfo && ' | '}${elevInfo}`}${eyeInfo && `${hasSecondDivider && ' | '}${eyeInfo}`}`//_ml_ modified org line replaced
  const classicGeo =//_ml_ modified this is the new line
    `${itmInfo && `${itmInfo}`}` +
    `${showBaseMapInfo && (mapWkid.current !== wkidTMRef.current) ? baseMapInfo && ` | ${baseMapInfo}` : ""}` +
    ` | ${geoInfo}${elevInfo ? ` | ${elevInfo }` : ""}` +
    `${showZoom ? ` | ${zoomInfo}` : ""}` +
    `${showScale && scaleInfo ? ` | ${scaleInfo}` : ""}` +//_ml_ 20250706 - added " | " for Haifa
    `${eyeInfoAlt && ` | ${eyeInfoAlt}`}` +
    `${showRotation ? ` | ${rotationInfo}` : ""}` +
    `${showTilt && eyeInfoTilt ? ` | ${eyeInfoTilt}` : ""}`
  const classicGeoCopyText = `${geoInfo}${elevInfo && `${geoInfo && ' | '}${elevInfo} ${elevUnit}`}${eyeInfo && `${hasSecondDivider && ' | '}${eyeInfo} ${eyeUnit}`}`//_ml_ copied from 1.17
  const classicCoorInfo = showTips ? mapClickTips : (showMouseTips ? mouseMoveTips : classicGeo || enableClickTips)
  const hasElevOrEye = (eyeNum !== null) || (elevNum !== null)
  const elevText = translate('elev', { ele: unitAbbrMap[elevUnit] })
  const eyeAltText = translate('eyeAlt', { alt: unitAbbrMap[eyeUnit] })
  const modernCoorInfo = (
    showTips
      ? mapClickTips
      : (showMouseTips
        ? mouseMoveTips
        : <div className='info-container'>
          <div className={`d-flex w-100 ${hasElevOrEye ? 'h-50' : 'h-100'}`}>
            {(geoInfo === computing || !geoInfo)
              ? <div className='coordinates-computing'>{geoInfo || (hasElevOrEye ? '--' : enableClickTips)}</div>
              : (widgetSizeAuto
                ? <div className='coordinates-card-text-geo-fixed'>{geoInfo}</div>
                : <TextAutoFit className='coordinates-card-text-geo' text={geoInfo} widgetRect={widgetRect} domChange={hasElevOrEye} />
              )
            }
          </div>
          {hasElevOrEye &&
            <div className='h-50'>
              <div className='textfit-container'>
                {elevNum !== null
                  ? (widgetSizeAuto
                    ? <div className='coordinates-card-text-fixed'>{elevNum}</div>
                    : <TextAutoFit className='coordinates-card-text' text={elevNum} widgetRect={widgetRect} />
                  )
                  : <div className='coordinates-card-text-empty'>--</div>
                }
                <div className='info-unit truncate-two' title={elevText}>{elevText}</div>
              </div>
              <div className='textfit-container'>
                {eyeNum !== null
                  ? (widgetSizeAuto
                    ? <div className='coordinates-card-text-fixed'>{eyeNum}</div>
                    : <TextAutoFit className='coordinates-card-text' text={eyeNum} widgetRect={widgetRect} />
                  )
                  : <div className='coordinates-card-text-empty'>--</div>
                }
                <div className='info-unit truncate-two' title={eyeAltText}>{eyeAltText}</div>
              </div>
            </div>
          }
        </div>
      )
  )
  const infoTipsArr = [mapClickTips, mouseMoveTips, enableClickTips]
  const isDefaultTips = infoTipsArr.includes(classicCoorInfo)
  const classicCopyDisable = enableRealtime || isDefaultTips || (!locateActive && !geoInfo)
  const modernCopyDisable = enableRealtime || isDefaultTips || (!locateActive && !classicCoorInfo.trim())
  const hasSystem = coordinateSystem?.length > 0

  // Renderer
  return (
    <div style={{ display: isLockedRef.current ? 'none' : 'flex !important' }}>
      {/*_ml_ added envelope line above*/}
      <div className='jimu-widget-coordinates jimu-widget h-100' css={getStyle(theme, isClassic, widgetRect, widgetSizeAuto)}>
        {isClassic
          ? <div className='coordinates-widget-container d-flex justify-content-between surface-1'>
            <Button
              icon
              size='sm'
              type='tertiary'
              onClick={onLocateClick}
              active={locateActive}
              title={locateBtnTips}
              aria-label={locateBtnTips}
              className='jimu-outline-inside coordinates-locate'
              disabled={!hasSystem}
            >
              <LocatorOutlined />
            </Button>
            <div className='coordinates-info text-truncate' title={classicCoorInfo}>
              {classicCoorInfo}
            </div>
            <CopyButton
              text={classicCoorInfo}
              disabled={classicCopyDisable}
            />
            {hasSystem &&
              <Dropdown size='sm' activeIcon>
                <DropdownButton
                  arrow={false}
                  icon
                  size='sm'
                  type='tertiary'
                  className='suspension-drop-btn jimu-outline-inside'
                  title={changeSystem}
                >
                  <DownOutlined />
                </DropdownButton>
                <DropdownMenu>
                  {coordinateSystem.map(item => {
                    const isActived = item.id === selectedSystemId
                    return (
                      <DropdownItem key={item.id} active={isActived} onClick={() => handleSystemChange(item.id)}>
                        {item.name}
                      </DropdownItem>
                    )
                  })}
                </DropdownMenu>
              </Dropdown>
            }
          </div>
          : <div className='coordinates-widget-container w-100 h-100 surface-1'>
            <Card className='h-100 coordinates-card'>
              <CardBody className='widget-card-content'>
                {modernCoorInfo}
              </CardBody>
              <CardFooter className='widget-card-footer'>
                <div className='jimu-widget d-flex justify-content-between'>
                  <Button
                    icon
                    size='sm'
                    type='tertiary'
                    onClick={onLocateClick}
                    active={locateActive}
                    title={locateBtnTips}
                    aria-label={locateBtnTips}
                  >
                    <LocatorOutlined />
                  </Button>
                  <div className='d-flex justify-content-between'>
                    {classicCoorInfo &&
                      <CopyButton
                        text={classicCoorInfo}
                        disabled={modernCopyDisable}
                        className='coordinates-card-copy mr-1'
                      />
                    }
                    {hasSystem &&
                      <Dropdown size='sm' activeIcon>
                        <DropdownButton
                          arrow={false}
                          icon
                          size='sm'
                          type='tertiary'
                          className='suspension-drop-btn'
                          title={changeSystem}
                        >
                          <DownOutlined className='suspension-drop-btn' />
                        </DropdownButton>
                        <DropdownMenu>
                          {coordinateSystem.map(item => {
                            const isActived = item.id === selectedSystemId
                            return (
                              <DropdownItem key={item.id} active={isActived} onClick={() => handleSystemChange(item.id)}>
                                {item.name}
                              </DropdownItem>
                            )
                          })}
                        </DropdownMenu>
                      </Dropdown>
                    }
                  </div>
                </div>
              </CardFooter>
            </Card>
          </div>
        }
        <JimuMapViewComponent
          useMapWidgetId={useMapWidgetIds?.[0]}
          onActiveViewChange={onActiveViewChange}
        />
        <ReactResizeDetector
          handleWidth
          handleHeight
          onResize={debounceOnResize}
        />
        {/*_ml_ added block top - Modal_Dialog_Box*/}
        <Modal
          isOpen={isOpenModalCoord}
          style={{ width: "fit-content" }}
        >
          <div className="container">
            <h3 style={{ color: "#cd2a1f" }}>{translate('newTabModalPrompt')}:</h3>
            <div
              role='radiogroup'
              aria-label={translate('newTabModalPrompt')}
              style={{ color: "#007ac2", fontWeight: "normal" }}
            >
              {/*<fieldset role='radiogroup'  style={{ color: "#007ac2", fontWeight: "normal" }}>*/}
              <Label className='d-flex align-items-center'>
                <Radio
                  name='nawTab'
                  value="cancelNewTab"
                  className='mr-2'
                  onChange={radioHandler}
                />
                {translate("cancelNewTab")}
              </Label>
              <Label className='d-flex align-items-center'>
                <Radio
                  name='nawTab'
                  value="googleMap"
                  className='mr-2'
                  onChange={radioHandler}
                />
                {translate("googleMap")}
              </Label>
              <Label className='d-flex align-items-center'
                style={{ marginBottom: "0.5rem" }}>
                <Radio
                  name='nawTab'
                  value="govMap"
                  className='mr-2'
                  onChange={radioHandler}
                />
                {translate("govMap")}
              </Label>
              {ofekUtils.isBlank(configOfekCfgOfek3dAppUrl)
                ? null
                :
                (
                  <Label className='d-flex align-items-center'
                    style={{ marginBottom: "0.5rem" }}>
                    <Radio
                      name='nawTab'
                      value="ofek3dApp"
                      className='mr-2'
                      onChange={radioHandler}
                    />
                    {translate("ofek3dApp")}
                  </Label>
                )
              }
              {ofekUtils.isBlank(configOfekCfgObliqueAppUrl)
                ? null
                :
                (
                  <Label className='d-flex align-items-center'
                    style={{ marginBottom: "0.5rem" }}>
                    <Radio
                      name='nawTab'
                      value="obliqueApp"
                      className='mr-2'
                      onChange={radioHandler}
                    />
                    {translate("diagonalProject")}
                  </Label>
                )
              }
              {/*</fieldset>*/}
            </div>

            {/*<legend>Select which App will be opened in the new Tab</legend>*/}
            {/*
          <fieldset style={{ color: "#007ac2", fontWeight: "normal" }}>
            <p>
              <input
                type="radio"
                name="nawTab"
                value="cancelNewTab"
                id="cancelNewTab"
                onChange={radioHandler}
              />
              <label htmlFor="cancelNewTab">{translate("cancelNewTab")}</label>
            </p>
            <p>
              <input
                type="radio"
                name="nawTab"
                value="googleMap"
                id="googleMap"
                onChange={radioHandler}
              />
              <label htmlFor="googleMap">{translate("googleMap")}</label>
            </p>
            <p>
              <input
                type="radio"
                name="nawTab"
                value="govMap"
                id="govMap"
                onChange={radioHandler}
              />
              <label htmlFor="govMap">{translate("govMap")}</label>
            </p>
            {ofekUtils.isBlank(ofekCfgObliqueAppUrl)
              ? null
              :
              (
                <p>
                  <input
                    type="radio"
                    name="nawTab"
                    value="obliqueApp"
                    id="diagonalProject"
                    onChange={radioHandler}
                  />
                  <label htmlFor="obliqueApp">{translate("diagonalProject")}</label>
                </p>
              )
            }
          </fieldset>
          */}
          </div>
          {/*
        <Button onClick={toggleIsOpenModalCoord}>
          Close Modal
        </Button>
        */}
        </Modal>
        {/*_ml_ added block end*/}
      </div>
      {/*_ml_ added envelope line below*/}
    </div>
  )
}

export default Widget
