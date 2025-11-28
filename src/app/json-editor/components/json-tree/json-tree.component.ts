import {Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {NestedTreeControl} from '@angular/cdk/tree';

import {MatBottomSheet} from '@angular/material/bottom-sheet';
import {MatDialog} from '@angular/material/dialog';
import {MatTree, MatTreeNestedDataSource} from '@angular/material/tree';
import * as _ from 'lodash';

import {LanguageProperties, NotificationTypesEnum} from '../../shared/dataModels/lang.model';
import {JsonNode, ProblemType} from '../../shared/dataModels/tree.model';

import {NameEditDialogComponent} from '../../dialogs/name-edit-dialog/name-edit-dialog.component';
import {MessagesComponent} from '../../dialogs/messages/messages.component';
import {BasicNode, NewNodeDialogComponent} from '../../dialogs/new-node-dialog/new-node-dialog.component';
import {FormControl, FormGroup} from '@angular/forms';
import {Subject, Subscription} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

const LANGUAGES_4_EDITING_ORDER_KEY = 'languagesOrder';

export class Node4Change {
  node: JsonNode;
  lang: string;
  value: string;

  constructor(node: JsonNode, lang: string, value: string) {
    this.node = node;
    this.lang = lang;
    this.value = value;
  }
}

interface ICtrlNode {
  ctrl: FormControl;
  node: JsonNode;
}

@Component({
  selector: 'app-json-tree',
  templateUrl: './json-tree.component.html',
  styleUrls: ['./json-tree.component.scss']
})
export class JsonTreeComponent implements OnInit, OnChanges, OnDestroy {

  @Input() languagesMap: Map<string, any>;
  @Input() foundObjectID: string;
  @Input() knownLangsArray: Array<LanguageProperties>;

  @Input() allowNodesMenu: boolean = true;
  @Input() readonlyLanguages: string[] = [];

  @Output() outputMessages = new EventEmitter<NotificationTypesEnum>();

  @ViewChild('tree', {static: true}) tree: MatTree<JsonNode>;

  treeForm: FormGroup = new FormGroup({});
  formControlObjectMap: { [key: string]: ICtrlNode } = {};
  changedControls: { key: string; value: string }[]; // key = <id>-<lang>
  wasStructureUpdated = false;

  problemType = ProblemType;

  treeControl = new NestedTreeControl<JsonNode>(node => node.children());
  dataSource = new MatTreeNestedDataSource<JsonNode>();
  data: JsonNode[];

  languages4EditingArray: Array<LanguageProperties>;

  onDestroy$ = new Subject<boolean>();
  valueChangeSubscription: Subscription;

  constructor(private dialog: MatDialog, private bottomSheet: MatBottomSheet) {
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
    this.onDestroy$.complete();
  }

  ngOnInit() {
    // this.reconstructData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.languagesMap) {
      this.reconstructData();
    }
  }

  private unsubscribeToValueChange() {
    if (this.valueChangeSubscription) {
      this.valueChangeSubscription.unsubscribe();
      this.valueChangeSubscription = undefined;
    }
  }

  private subscribeToValueChange() {
    this.valueChangeSubscription = this.treeForm.valueChanges.pipe(
      takeUntil(this.onDestroy$)
    ).subscribe((ctrlsObjMap) => {
      const changedCtrls = Object.entries(ctrlsObjMap)
        .map(entry => ({key: entry[0] as string, value: entry[1] as string}))
        .filter(mappedEntry => {  // Filtering only ctrls that are changed compared with the original data
          const value = mappedEntry.value;
          let isOnFiltered = _.isString(value);
          if (isOnFiltered) {
            const key = mappedEntry.key;
            const node = this.formControlObjectMap[key].node;
            const lang = key.substr(key.length - 2);
            isOnFiltered = node.value[lang] !== value;
          }
          return isOnFiltered;
        });
      this.handleChangeInData(changedCtrls, null);
    });
  }

  private handleChangeInData(aChangedCtrlsNewArray: { value: string; key: string }[], aWasStructureUpdated: Boolean) {
    const wasDirty = this.wasStructureUpdated || this.changedControls.length > 0;
    if (aWasStructureUpdated) {
      this.wasStructureUpdated = aWasStructureUpdated.valueOf();
    }

    if (aChangedCtrlsNewArray) {
      this.changedControls = aChangedCtrlsNewArray;
    }

    const isNowDirty = this.wasStructureUpdated || this.changedControls.length > 0;
    if (isNowDirty !== wasDirty) {
      const notificationType = isNowDirty ? NotificationTypesEnum.TREE_IS_DIRTY : NotificationTypesEnum.TREE_IS_CLEAN;
      this.outputMessages.emit(notificationType);
    }
  }

  /**
   * Takes the data in the changed controls to modify the model.
   * Then erases the changes markings (i.e changedControls and wasStructureUpdated
   */
  updateDataFromInputControls() {
    if (!this.changedControls || this.changedControls.length <= 0) {
      return;
    }

    this.changedControls.forEach(changeStruct => {
      const tokensArray = changeStruct.key.split('-');
      const ctrlLang = tokensArray[1];
      const foundCtrlNode = this.formControlObjectMap[changeStruct.key];
      if (foundCtrlNode) {
        foundCtrlNode.node.value[ctrlLang] = changeStruct.value;
      }
    });

    this.handleChangeInData([], Boolean(false));
  }

  getInputCtrlArray(aNode: JsonNode, aLang: string) {
    const key = aNode.id + '-' + aLang;
    let ctrlStruct: ICtrlNode = this.formControlObjectMap[key];
    let cr = false;
    if (!ctrlStruct) {
      cr = true;
      const isDisabled = this.readonlyLanguages.includes(aLang) ? {value: '', disabled: true} : undefined;
      const newCtrl = new FormControl(isDisabled);
      ctrlStruct = {ctrl: newCtrl, node: aNode};
      this.formControlObjectMap[key] = ctrlStruct;
      this.treeForm.addControl(key, newCtrl);
    }
    return ctrlStruct.ctrl;
  }

  updateControls(aJsonNodes4updateArray: Node4Change[]) {
    aJsonNodes4updateArray.forEach((node4Change) => {
      const key = node4Change.node.id + '-' + node4Change.lang;
      const ctrlStruct = this.formControlObjectMap[key];
      if (ctrlStruct) {
        ctrlStruct.ctrl.setValue(node4Change.value);
      } else {
        console.error(`JsonTreeComponent::updateControls Error. Couldn't find ctrl for ${JSON.stringify(aJsonNodes4updateArray)}`);
      }
    });
  }

  private clearUpdateMonitorData() {
    this.formControlObjectMap = {};
    this.changedControls = [];
    this.treeForm.controls = {};
  }


  private reconstructData() {
    this.unsubscribeToValueChange();
    this.clearUpdateMonitorData();
    const constructionOK = this.constructLanguagesDataStructure();
    this.outputMessages.emit(constructionOK ? NotificationTypesEnum.TREE_INITIALIZATION_SUCCESS
      : NotificationTypesEnum.TREE_INITIALIZATION_FAILED);

    this.dataSource.data = this.data;
    this.treeControl.dataNodes = this.data;
    setTimeout(() => {
      this.subscribeToValueChange();
    });
  }

  hasChild = (aNumber: number, node: JsonNode) => !!node.hasChildren;

  collapseAll() {
    this.treeControl.collapseAll();
  }

  expandAll() {
    this.treeControl.expandAll();
  }

  expandNode(aJsonNode: JsonNode) {
    if (aJsonNode.parent) {
      this.expandNode(aJsonNode.parent);
    }
    this.treeControl.expand(aJsonNode);
  }

  private constructLanguagesDataStructure(): boolean {
    this.languages4EditingArray = [];

    if (!this.languagesMap || !this.languagesMap.get('en')) {
      return false;
    }

    const englishJson = this.languagesMap.get('en');

    // First load the english
    this.data = this.convertJsonIntoJsonNode(englishJson, 'en');
    let langProperty = this.knownLangsArray.find(languageProperties => languageProperties.lang === 'en');
    langProperty.isPreLoaded = true;
    langProperty.isDisplayed = true;
    this.languages4EditingArray.push(langProperty);

    // Now load the other languages
    this.languagesMap.forEach((langJson: any, lang: string) => {
      if (lang !== 'en') {
        this.loadAnotherLanguage(this.data, langJson, lang);
        langProperty = this.knownLangsArray.find(languageProperties => languageProperties.lang === lang);
        if (!langProperty) {
          langProperty = new LanguageProperties('Customized', 'Customized', lang);
          langProperty.isCustomized = true;
          this.knownLangsArray.push(langProperty);
        }
        langProperty.isPreLoaded = true;
        langProperty.isDisplayed = true;
        this.languages4EditingArray.push(langProperty);
      }
    });

    this.orderLanguages4EditingArray();

    this.search4AdditionalProblems(this.data);

    return true;
  }

  private search4AdditionalProblems(aData: JsonNode[]) {
    const langArray = this.languages4EditingArray.filter(langObj => langObj.lang !== 'en').map(langObj => langObj.lang);
    aData.forEach(jsonNodeObj => {
      if (!jsonNodeObj.hasChildren && jsonNodeObj.problemType === ProblemType.NONE) {
        const notTrans = langArray.some(lang => !jsonNodeObj.value[lang] ||
          jsonNodeObj.value[lang].trim().length <= 0);
        jsonNodeObj.problemType = notTrans ? ProblemType.NOT_EXIST_ON_OTHER_LANG : ProblemType.NONE;
      } else if (jsonNodeObj.hasChildren) {
        this.search4AdditionalProblems(jsonNodeObj.children());
      }
    });
  }

  recalculateProblems(aData: JsonNode[]) {
    const supportedLangArray = this.languages4EditingArray.map(languageProperties => languageProperties.lang);
    aData.forEach(jsonNodeObj => {
      if (!jsonNodeObj.hasChildren) {
        jsonNodeObj.problemType = ProblemType.NONE;
        Array.from(Object.entries(jsonNodeObj.value)).some((valueEntry) => {
          if ((!valueEntry[1] || valueEntry[1].trim().length <= 0) && (supportedLangArray.includes(valueEntry[0]))) {
            jsonNodeObj.problemType = (valueEntry[0] === 'en') ? ProblemType.NOT_EXIST_ON_EN : ProblemType.NOT_EXIST_ON_OTHER_LANG;
          }
          return (jsonNodeObj.problemType !== ProblemType.NONE);
        });
      } else if (jsonNodeObj.hasChildren) {
        this.recalculateProblems(jsonNodeObj.children());
      }
    });
  }

  getProblemText(aProblemType: ProblemType): string {
    let retProblemTest = '';
    switch (aProblemType) {
      case ProblemType.MISS_MATCH_PROBLEM:
        retProblemTest = 'Mismatch in types of clauses between languages';
        break;
      case ProblemType.NOT_EXIST_ON_EN:
        retProblemTest = 'Clause found on other languages than English';
        break;
      case ProblemType.NOT_EXIST_ON_OTHER_LANG:
        retProblemTest = 'Clause not found on some other languages than English';
        break;

    }

    return retProblemTest;
  }

  getMaxLabelWidth(aNode: JsonNode): string {
    const maxLen = aNode.maxKeyLength4Level;
    let retWidth;
    if (maxLen < 10) {
      retWidth = '12vw';
    } else if (maxLen < 20) {
      retWidth = '18vw';
    } else if (maxLen < 25) {
      retWidth = '22vw';
    } else {
      retWidth = '27vw';
    }
    return retWidth;
  }

  editNodeName(aNode: JsonNode) {
    const dialogRef = this.dialog.open(NameEditDialogComponent, {
      position: {top: '25vh', left: '25vw'},
      height: '30vh',
      width: '50vw',
      data: {initialKeyName: aNode.key},
    });

    dialogRef.afterClosed().subscribe((aNewKeyName: string) => {
      if (aNewKeyName) {
        aNode.key = aNewKeyName;
        this.setNodeFullPath(aNode);
      }
    });

    this.reRenderTree();
  }

  editNodePath(aNode: JsonNode) {
    // TO DO
  }

  deleteNode(aNode: JsonNode) {
    const bottomSheetRef = this.bottomSheet.open(MessagesComponent, {
      data: {message: `Aru you sure about deleting ${aNode.key} node?`, submitText: 'Delete', cancelText: 'Cancel'}
    });
    bottomSheetRef.afterDismissed().subscribe(dialogResult => {
      if (dialogResult) {
        const parentChildrenArray = aNode.parent ? aNode.parent.children() : this.data;
        const res = _.remove(parentChildrenArray, (jsonNode: JsonNode) => jsonNode.id === aNode.id);

        this.handleChangeInData(null, Boolean(true));

        this.reRenderTree();
      }
    });

  }

  addChildNode(aNode: JsonNode, aIsContainer: boolean = true) {
    const siblingsKeyNamesArray = aNode.children().map((jsonNode: JsonNode) => jsonNode.key);
    const dialogRef = this.dialog.open(NewNodeDialogComponent, {
      height: '80vh',
      width: '50vw',
      data: {siblingsKeyNamesArray, handledLang: aIsContainer ? null : this.languages4EditingArray},
    });

    dialogRef.afterClosed().subscribe((aNewNodeBasicData: BasicNode) => {
      if (aNewNodeBasicData) {
        const newJsonNode = new JsonNode();
        newJsonNode.key = aNewNodeBasicData.key;
        newJsonNode.hasChildren = aIsContainer;
        if (aIsContainer) {
          newJsonNode.value = [];
        } else {
          newJsonNode.value = aNewNodeBasicData.value;
        }

        newJsonNode.parent = aNode;
        this.setNodeFullPath(newJsonNode);
        this.setNewNodeId(newJsonNode);
        aNode.children().push(newJsonNode);
        this.recalculateMaxKeyLength4Level(aNode);

        this.handleChangeInData(null, Boolean(true));
        this.treeControl.expand(aNode);
        this.reRenderTree();
      }
    });
  }

  private recalculateMaxKeyLength4Level(aNode: JsonNode) {
    let maxKeyLen = 0;
    aNode.children().forEach(jsonNode => maxKeyLen = Math.max(jsonNode.key.length, maxKeyLen));
    aNode.children().forEach(jsonNode => jsonNode.maxKeyLength4Level = maxKeyLen);
  }


  private reRenderTree() {
    this.dataSource.data = null;
    this.dataSource.data = this.data;

    this.changedControls.forEach(changeStruct => {
      const key = changeStruct.key;
      const ctrl = this.formControlObjectMap[key].ctrl;
      if (ctrl) {
        ctrl.setValue(changeStruct.value);
      } else {
        console.error(`Couldn't find ctrl for key :${key}`);
      }
    });
  }

  private setNodeFullPath(aNode: JsonNode) {
    if (aNode.parent) {
      aNode.fullPath = `${aNode.parent.fullPath}.${aNode.key}`;
    } else {
      aNode.fullPath = aNode.key;
    }

    if (aNode.hasChildren) {
      aNode.children().forEach((jsonNode: JsonNode) => this.setNodeFullPath(jsonNode));
    }
  }

  // TO DO - tie loose hands for Id
  private setNewNodeId(aNode: JsonNode) {
    if (aNode.parent) {
      aNode.id = `${aNode.parent.id}.1`;
    } else {
      aNode.id = '111'; // TO DO **************
    }

    if (aNode.hasChildren) {
      aNode.children().forEach((jsonNode: JsonNode) => this.setNewNodeId(jsonNode));
    }
  }

  private convertJsonIntoJsonNode(aJsonObj: { [key: string]: string | any },
                                  aLang: string,
                                  aParent: JsonNode = null): JsonNode[] {
    const retJsonNodeArray: JsonNode[] = [];
    let maxKeyLen = 0;
    Object.entries(aJsonObj).forEach((objectItem: Array<any>, index) => {

      const key = objectItem[0] as string;
      const value = objectItem[1];

      const newJsonNode = this.createJsonNodeFromKeyValue(index, key, value, aLang, aParent);
      maxKeyLen = !newJsonNode.hasChildren ? Math.max(maxKeyLen, key.length) : maxKeyLen;

      retJsonNodeArray.push(newJsonNode);
    });
    retJsonNodeArray.forEach(jsonNode => jsonNode.maxKeyLength4Level = maxKeyLen);
    return retJsonNodeArray;
  }


  private createJsonNodeFromKeyValue(
    aIndex: number, aKey: string, aValue: string | any, aLang: string, aParent: JsonNode = null): JsonNode {
    const newJsonNode = new JsonNode();

    newJsonNode.key = aKey;
    newJsonNode.id = `${aParent ? aParent.id + '.' : ''}${aIndex}`;
    newJsonNode.fullPath = `${aParent ? aParent.fullPath + '.' : ''}${aKey}`;
    const hasChildren = !!aValue && !_.isString(aValue);
    newJsonNode.hasChildren = hasChildren;
    newJsonNode.parent = aParent;
    newJsonNode.value = (!hasChildren) ? {[aLang]: aValue} : this.convertJsonIntoJsonNode(aValue, aLang, newJsonNode);

    return newJsonNode;
  }

  private loadAnotherLanguage(aBaseDataModelArray: JsonNode[], aJsonObj: { [key: string]: string | any }, aLang: string) {
    const jsonNodeObjectMap: { [key: string]: JsonNode } = aBaseDataModelArray.reduce((retObjectMap: any, currentValue: JsonNode) => {
      retObjectMap[currentValue.key] = currentValue;
      return retObjectMap;
    }, {});
    Object.entries(aJsonObj).forEach((objectItem: Array<any>) => {
      const key = objectItem[0] as string;
      const foundJsonNode = jsonNodeObjectMap[key];
      const value = objectItem[1];
      const hasChildren = !!value && !_.isString(value);
      if (foundJsonNode) {
        if (foundJsonNode.hasChildren === hasChildren) {
          if (hasChildren) {
            this.loadAnotherLanguage(foundJsonNode.children(), value, aLang);
          } else {
            foundJsonNode.value[aLang] = value;
          }

        } else {
          foundJsonNode.problemType = ProblemType.MISS_MATCH_PROBLEM;
        }
      } else {
        const currentFirstItemParent = aBaseDataModelArray[0] ? aBaseDataModelArray[0].parent : null;
        const newJsonNode = this.createJsonNodeFromKeyValue(aBaseDataModelArray.length, key, value, aLang, currentFirstItemParent);
        newJsonNode.problemType = ProblemType.NOT_EXIST_ON_EN;
        aBaseDataModelArray.push(newJsonNode);
      }
    });
  }

  addOrRemoveLanguage(aLanguageProperties: LanguageProperties, aIsAdded: boolean) {
    if (aIsAdded) {
      const clonedLanguageProperties = _.cloneDeep(aLanguageProperties);
      clonedLanguageProperties.isDisplayed = true;
      this.languages4EditingArray.push(clonedLanguageProperties);
    } else {
      _.remove(this.languages4EditingArray, langProperties => langProperties.lang === aLanguageProperties.lang);
    }
    this.handleChangeInData(null, Boolean(true));
  }

  saveLanguages4EditingOrderAndVisibility(aLang: LanguageProperties = null) {
    const langOrder = this.languages4EditingArray.map(
      (languageProperties) => {
        const isDisplayed = (aLang && aLang.lang === languageProperties.lang) ? aLang.isDisplayed : languageProperties.isDisplayed;
        return [languageProperties.lang, isDisplayed];
      });
    localStorage.setItem(LANGUAGES_4_EDITING_ORDER_KEY, JSON.stringify(langOrder));
  }

  private orderLanguages4EditingArray() {
    const langOrderStr = localStorage.getItem(LANGUAGES_4_EDITING_ORDER_KEY);
    if (langOrderStr) {
      const newLanguages4EditingArray: Array<LanguageProperties> = [];
      const langOrder = JSON.parse(langOrderStr) as [string, boolean][];
      langOrder.forEach((langStruct) => {
        const foundLang = this.languages4EditingArray.find(languageProperties => languageProperties.lang === langStruct[0]);
        if (foundLang) {
          foundLang.isDisplayed = langStruct[1];
          newLanguages4EditingArray.push(foundLang);
        }
      });
      this.languages4EditingArray = newLanguages4EditingArray;
    }
  }

  resetDirtyState() {
    this.saveLanguages4EditingOrderAndVisibility();
    this.wasStructureUpdated = false;
    this.changedControls = [];
    this.outputMessages.emit(NotificationTypesEnum.TREE_IS_CLEAN);
  }
}
