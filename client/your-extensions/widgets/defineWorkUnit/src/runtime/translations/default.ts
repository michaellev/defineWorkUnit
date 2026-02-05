/**
 * default.ts - English translations (default)
 */
export default {
  // Widget title
  _widgetLabel: "Define Work Unit",

  // State display names
  stateInit: "Initial",
  stateCreate: "Create",
  stateCreateBaseStands: "Create - Stands",
  stateCreateWayReshape: "Create - Reshape",
  stateCreateWayClick: "Create - Click",
  stateCreateWayRect: "Create - Rectangle",
  stateCreateWayPoly: "Create - Polygon",
  stateCreateWayList: "Create - List",
  stateEdit: "Edit",
  stateEditSelected: "Edit - Selected",
  stateEditSelectedBaseStands: "Edit - Stands",
  stateEditSelectedWayReshape: "Edit - Reshape",
  stateEditSelectedWayClick: "Edit - Click",
  stateEditSelectedWayRect: "Edit - Rectangle",
  stateEditSelectedWayPoly: "Edit - Polygon",
  stateEditSelectedWayList: "Edit - List",

  // Main buttons
  createNewWorkUnit: "Create",
  editExistingWorkUnit: "Edit",
  help: "Help",
  cancelAll: "Cancel All",
  finishAndSave: "Finish & Save",

  // "Geometry Source" dropdown
  selectBase: "Construction Method",
  baseStands: "Choosing Stands",
  baseFreeDraw: "Free Draw",
  baseLine: "Line With Buffer",
  basePolygonFromLayer: "Polygon from Layer",

  // "Selection Method" dropdown
  selectWay: "Selection Method",
  wayReshape: "Graphic: Reshape by Multyline/Polygon",
  wayClick: "Graphic: Whole Stands by Click",
  wayRect: "Graphic: Whole Stands by Rectangle",
  wayPoly: "Graphic: Whole Stands by Polygon",
  wayList: "Whole Stands by: List",

  // Forest/Compartment/Stands dropdowns
  selectForest: "Select Forest",
  selectCompartment: "Select Compartment",
  selectStands: "Select Stands",

  // Action buttons
  drawRectAdd: 'Draw Rectangle to Add',
  drawRectRemove: 'Draw Rectangle to Remove',
  drawPolyAdd: 'Draw Polygon to Add',
  drawPolyRemove: 'Draw Polygon to Remove',

  addStands: "Confirm Additiopn",
  clearStandsToAdd: "Cancel Addition",
  confirmRemoval: 'Confirm Removal',
  cancelRemoval: 'Cancel Removal',

  doEachLineWrap: "Wrap",
  doEachLineUnWrap: "No Wrap",

  // Delete
  deleteWorkUnit: "Delete Work Unit",
  confirmDeleteWorkUnit: "Are you sure you want to delete this work unit?",
  deletingWorkUnit: "Deleting work unit...",
  deleteSuccess: "Work unit deleted successfully",
  deleteFailed: "Failed to delete work unit",

  // Correction line
  drawCorrectionPolyline: "Line",
  drawCorrectionPolygon: "Polygon",
  correctionLineNoPolygon: "No polygon to correct",
  correctionLineNoIntersection: "Line does not intersect polygon",
  correctionPolygonAdded: "Polygon added to work unit",
  correctionHoleCreated: "Hole created in work unit",
  correctionAreaAdded: "Area added to work unit",
  correctionAreaRemoved: "Area removed from work unit",
  correctionBoundaryUpdated: "Work unit boundary updated",
  correctionError: "Error updating polygon",
  correctionNoChanges: "No changes made - ensure line crosses polygon boundary",
  cancelDrawing: 'Cancel',
  confirmCorrection: 'Confirm Correction',
  cancelCorrection: 'Cancel Correction',
  correctionLineApplied: "Correction applied",
  correctionCancelled: 'Correction cancelled',

  // Correction dialog
  correctionDialogTitle: "Polygon crosses boundary",
  correctionDialogMessage: "The polygon crosses the work unit boundary. What would you like to do?",
  correctionDialogAdd: "Add",
  correctionDialogRemove: "Remove",
  correctionDialogCancel: "Cancel",

  // Field labels
  forest: "Forest",
  workUnitId: "Work Unit ID", //for what is this used??
  workUnitStandsPrefix: "W.U Stands",
  workUnitStandsSuffix: "(final list)",
  standsToAdd: "Stands to Add (draft)",
  standsToRemove: 'Stands to Remove (draft)',
  standsToAddOrRemove: 'Draft list to Add/Remove',
  addedStands: "Added Stands",
  alreadyInWorkUnit: 'already in W.U.',
  inOriginalWorkUnit: `In original WU`,
  toAdd: "added",
  message: "Message",

  // Messages
  clickOnWorkUnitToEdit: "Click on a work unit to edit",
  loadingFromServer: "Loading from server...",
  savingToServer: "Saving to server...",
  saveSuccess: "Work unit saved successfully",
  saveFailed: "Failed to save work unit",
  workUnitNotEditable: "This work unit cannot be edited",
  standNotInForest: "Stand is not in the selected forest",
  noStandsSelected: "No stands selected",
  workUnitLocked: "Work unit is locked by another user. Retrying in 25 seconds...",
  lockAcquired: "Lock acquired, you can now edit",
  cancelWaiting: "Cancel",
  emptyList: "(empty)",

  //Alert Messages
  wayChangeBlocked: 'Cannot change selection method while temporary lists exist',
  wayChangeWarning: 'Warning: The temporary stands list (to add or remove) is not empty. Next time it will be cleared automatically',

  // Work unit selector dialog
  selectWorkUnit: "Select Work Unit",
  selectWorkUnitPrompt: "Multiple work units found. Select one:",
  stands: "stands",
  select: "Select",
  cancel: "Cancel",

  // Help - state.init
  helpInit:
    `Initial state. Nothing is defined yet.\n` +
    `Choose a process - Create or Edit (modify).`,

  // Help - state.create
  helpCreate:
    `You chose to create a new work unit.\n` +
    `Nothing is defined in it yet.\n` +
    `First, you need to choose\n` +
    `the geometry source from which you will build\n` +
    `the polygon of the work unit.\n` +
    `In the first phase -\n` +
    `only building based on whole stands geometry will be active.`,

  // Help - state.create.baseStands
  helpCreateBaseStands:
    `You chose Create, with geometry source as whole stands.\n` +
    `You need to choose the stand selection method for adding/removing -\n` +
    `via list, or via one of three graphic methods.\n` +
    `You can start with one method and continue with others.\n` +
    `When there are no draft lists, you can switch between methods.`,

  // Help - state.create.baseStands.wayClick
  helpCreateWayClick:
    `Click on stands in the same forest to add/remove them.\n` +
    `You can switch to another method at any time.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.create.baseStands.wayRect
  helpCreateWayRect:
    `Rectangle creation buttons will create temporary lists for adding/removing.\n` +
    `Rectangle is drawn by dragging the mouse.\n` +
    `'Confirm' button moves from draft list to committed list.\n` +
    `When there are no draft lists, you can switch between methods.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.create.baseStands.wayPoly
  helpCreateWayPoly:
    `Polygon creation buttons will create temporary lists for adding/removing.\n` +
    `Polygon is drawn by clicks. Double-click to finish.\n` +
    `'Confirm' button moves from draft list to committed list.\n` +
    `When there are no draft lists, you can switch between methods.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.create.baseStands.wayList
  helpCreateWayList:
    `Select forest, then compartment, then stands (from that compartment).\n` +
    `Clicks on checkboxes will create draft lists for adding/removing.\n` +
    `'Confirm' button moves from draft list to committed list.\n` +
    `When there are no draft lists, you can switch between methods.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.create.baseStands.wayReshape
  helpCreateWayReshape:
    `Free correction mode.\n` +
    `Draw a correction line or polygon to modify the work unit boundary.\n` +
    `The line must cross the boundary at least twice.\n` +
    `After drawing, confirm or cancel the correction.`,

  // Help - state.edit
  helpEdit:
    `You chose to edit (modify) an existing work unit.\n` +
    `First, you need to select it by clicking on it.`,

  // Help - state.edit.selected
  helpEditSelected:
    `This state does not exist.`,

  // Help - state.edit.selected.baseStands
  helpEditSelectedBaseStands:
    `In edit mode, after selecting a work unit,\n` +
    `the forest name, work unit ID,\n` +
    `geometry source of the work unit,\n` +
    `and if the geometry source is stands,\n` +
    `the list of stands belonging to it will be displayed.\n` +
    `You cannot change the forest.`,

  // Help - state.edit.selected.baseStands.wayClick
  helpEditSelectedWayClick:
    `Click on stands in the same forest to add/remove them.\n` +
    `You can switch to another method at any time.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.edit.selected.baseStands.wayRect
  helpEditSelectedWayRect:
    `Rectangle creation buttons will create temporary lists for adding/removing.\n` +
    `Rectangle is drawn by dragging the mouse.\n` +
    `'Confirm' button moves from draft list to committed list.\n` +
    `When there are no draft lists, you can switch between methods.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.edit.selected.baseStands.wayPoly
  helpEditSelectedWayPoly:
    `Polygon creation buttons will create temporary lists for adding/removing.\n` +
    `Polygon is drawn by clicks. Double-click to finish.\n` +
    `'Confirm' button moves from draft list to committed list.\n` +
    `When there are no draft lists, you can switch between methods.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.edit.selected.baseStands.wayList
  helpEditSelectedWayList:
    `In edit mode, the forest is known.\n` +
    `Select compartment, then stands (from that compartment).\n` +
    `Clicks on checkboxes will create draft lists for adding/removing.\n` +
    `'Confirm' button moves from draft list to committed list.\n` +
    `When there are no draft lists, you can switch between methods.\n` +
    `'Finish & Save' button is active when the committed list is not empty.`,

  // Help - state.edit.selected.baseStands.wayReshape
  helpEditSelectedWayReshape:
    `Free correction mode.\n` +
    `Draw a correction line or polygon to modify the work unit boundary.\n` +
    `The line must cross the boundary at least twice.\n` +
    `After drawing, confirm or cancel the correction.`,
};
