import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild} from '@angular/core';

import {fromEvent, Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged, filter, map, takeUntil} from 'rxjs/operators';
import * as _ from 'lodash';

import {MatBottomSheet} from '@angular/material/bottom-sheet';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatDialog} from '@angular/material/dialog';
import {MatMenuTrigger} from '@angular/material/menu';

import {JsonNode, ProblemType, SearchByEnum} from '../../shared/dataModels/tree.model';
import {JsonTreeComponent, Node4Change} from '../json-tree/json-tree.component';

import {LanguageProperties, NotificationTypesEnum} from '../../shared/dataModels/lang.model';
import {langPropsArray as knownLanguages} from './known-languages';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

const MAX_NO_LANGUAGES_4_EDITING = 2;

const KNOWN_LANGS_ABBR_ARRAY = [''];

const ENGLISH_CODE = 'en';

interface IKnowLang {
  name: string;
  nativeName: string;
  code: string;
  isRtl?: boolean;
}

@Component({
  selector: 'app-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.scss'],
})
export class JsonEditorComponent implements OnInit, AfterViewInit, OnDestroy {

  private static knownLangsArray: Array<LanguageProperties> = JsonEditorComponent.constructKnownLangsArray();

  @Input() languagesMap: Map<string, any>;

  @Input() allowNodesMenu: boolean = true;
  @Input() allowMainToolbar: boolean = true;
  @Input() allowUpload: boolean = true;
  @Input() readonlyLanguages: string[] = [];

  @Input() translateMethod: (sourceStrings: Array<string>, targetLang: string) => (Promise<Array<string>>);

  @Input()
  addedControlsTemplate: TemplateRef<any>;

  @Output() outputMessages = new EventEmitter<NotificationTypesEnum>();

  @Output() languagesMapOutput = new EventEmitter<Map<string, any>>();

  @ViewChild(JsonTreeComponent, {static: false}) treeComponent: JsonTreeComponent;
  @ViewChild('searchTextInput', {static: false}) searchTextInput: ElementRef;
  @ViewChild('postfixInput', {static: false}) postfixInputInput: ElementRef;

  foundObjectID: string;

  wasLangLoadedOk: boolean = false;


  maxNoLanguages4Editing = MAX_NO_LANGUAGES_4_EDITING;
  langsArray = JsonEditorComponent.getKnownLangsArray();

  searchCounter = -1;
  searchByOptions = SearchByEnum;
  searchBy: SearchByEnum = SearchByEnum.PROBLEM;
  searchText = '';
  searchBufferObjectMap: { [key: string]: Array<JsonNode> } = {};  // Only one item representing

  onDestroy$ = new Subject<boolean>();

  // current search

  constructor(private dialog: MatDialog, private bottomSheet: MatBottomSheet) {
  }

  private static constructKnownLangsArray(): Array<LanguageProperties> {
    return (knownLanguages as IKnowLang[])
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(jsonItem => new LanguageProperties(jsonItem.name, jsonItem.nativeName, jsonItem.code, jsonItem.isRtl));
  }

  static getKnownLangsArray = (): Array<LanguageProperties> => _.cloneDeep(JsonEditorComponent.knownLangsArray);

  ngOnInit() {
  }

  ngOnDestroy() {
    this.onDestroy$.next(true);
    this.onDestroy$.complete();
  }

  ngAfterViewInit() {
    this.listenToSearchTextChange();
  }

  private listenToSearchTextChange() {
    if (this.searchTextInput) {
      fromEvent(this.searchTextInput.nativeElement, 'keyup').pipe(
        takeUntil(this.onDestroy$),
        // get value
        map((event: any) => {
          return event.target.value;
        }),
        // if character length greater then 2
        filter(res => res.length > 2),
        // Time in milliseconds between key events
        debounceTime(1000),
        // If previous query is diffent from current
        distinctUntilChanged()
        // subscription for response
      ).subscribe((newSearchText: string) => {
        this.searchTextChanged(newSearchText);
      });
    }
  }


  collapseAll() {
    // this.tree.treeControl.collapseAll()
    this.treeComponent.collapseAll();
  }

  expandAll() {
    this.treeComponent.expandAll();
  }

  getLanguages4EditingArray(): Array<LanguageProperties> {
    if (this.treeComponent) {
      return this.treeComponent.languages4EditingArray;
    }
    return [];
  }

  getTreeData(): Array<JsonNode> {
    if (this.treeComponent) {
      return this.treeComponent.data;
    }
    return [];
  }


  onSearchBySelectedChange() {
    this.searchText = '';
    this.foundObjectID = '';
    this.searchCounter = -1;
  }

  searchNextOrPrev(aIsNext: boolean = true) {
    if (this.searchBy === SearchByEnum.PROBLEM && this.searchCounter < 0) {
      this.getSearchBufferForProblem();
    }

    this.recalculateSearchCounter(aIsNext);
    this.scrollNode2View(aIsNext);
  }

  private recalculateSearchCounter(aIsNext: boolean) {
    const valuesArray = Object.values(this.searchBufferObjectMap);
    const searchCount = (valuesArray && valuesArray.length > 0) ? valuesArray[0].length : 0;

    if (searchCount > 0) {
      const step = aIsNext ? 1 : -1;
      this.searchCounter += step;
      const isInRange = _.inRange(this.searchCounter, 0, searchCount);
      this.searchCounter = isInRange ? this.searchCounter : (this.searchCounter < 0 ? searchCount - 1 : 0);
    } else {
      this.searchCounter = -1;
    }
  }

  searchTextChanged(aSearchText: string) {
    this.searchText = aSearchText;
    this.searchCounter = 0;
    const searchBufferForText = this.getSearchBufferForText();
    this.scrollNode2View();

  }

  scrollNode2View(aIsNext: boolean = true) {
    const searchBufferForText = Object.values(this.searchBufferObjectMap)[0];
    if (searchBufferForText && searchBufferForText.length > 0) {
      const nodeToFocusOn = searchBufferForText[this.searchCounter];
      this.expandNode(nodeToFocusOn);
      setTimeout(() => {
        const el = document.getElementById(nodeToFocusOn.id);
        if (el) {
          el.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
          this.foundObjectID = nodeToFocusOn.id;
        }
      }, 0);
    } else {
      this.notifyParent(NotificationTypesEnum.NOT_FOUND_SEARCH_OBJECT);
    }
  }

  private expandNode(aJsonNode: JsonNode) {
    this.treeComponent.expandNode(aJsonNode);
  }

  private getSearchBufferForProblem(): JsonNode[] {
    return this.getSearchBuffer(SearchByEnum.PROBLEM, (jsonNode: JsonNode) => jsonNode.problemType !== ProblemType.NONE);
  }

  private getSearchBufferForText(): JsonNode[] {
    return this.getSearchBuffer(this.searchText, this.checkForText.bind(this));
  }

  private getSearchBuffer(aBufferId: string, aCheckFunc: (JsonNode) => boolean): JsonNode[] {
    let searchBuffer = this.searchBufferObjectMap[aBufferId] as JsonNode[];
    if (!searchBuffer) {
      this.searchBufferObjectMap = {};
      searchBuffer = new Array<JsonNode>();
      this.accumulateFoundNodes(this.treeComponent.data, searchBuffer, aCheckFunc);
      this.searchBufferObjectMap[aBufferId] = searchBuffer;
    }
    return searchBuffer;
  }


  private accumulateFoundNodes(aData: JsonNode[], aFoundNodesArray: JsonNode[], aCheckFunc: (JsonNode) => boolean) {
    _.forEach(aData, (jsonNodeObject: JsonNode) => {
      const checkFuncReyValue = aCheckFunc(jsonNodeObject);
      if (checkFuncReyValue) {
        aFoundNodesArray.push(jsonNodeObject);
      }

      if (jsonNodeObject.hasChildren) {
        this.accumulateFoundNodes(jsonNodeObject.children(), aFoundNodesArray, aCheckFunc);
      }
    });
  }

  private checkForText(aJsonNode: JsonNode): boolean {
    let retIsValid4Search = false;
    if (aJsonNode.key.indexOf(this.searchText) >= 0) {
      retIsValid4Search = true;
    } else if (!aJsonNode.hasChildren) {
      retIsValid4Search = this.treeComponent.languages4EditingArray.some((langObj: { lang: string }) => {
        const value = aJsonNode.value[langObj.lang] as string;
        return (value && value.indexOf(this.searchText) >= 0);
      });
    }
    return retIsValid4Search;
  }

  private notifyParent(aNotificationTypesEnum: NotificationTypesEnum) {
    this.outputMessages.emit(aNotificationTypesEnum);
  }


  selectLangChange(aLanguageProperties: LanguageProperties, aIsChecked: boolean) {
    aLanguageProperties.isAdded = aIsChecked;
    this.treeComponent.addOrRemoveLanguage(aLanguageProperties, aIsChecked);
  }

  getTranslationMethod() {
    return this.translateEnTo.bind(this);
  }

  getCopyMethod() {
    return this.copyEnTo.bind(this);
  }

  translateEnTo(aLanguageProperties: LanguageProperties) {
    this.convertEn(this.treeComponent.data, aLanguageProperties, NotificationTypesEnum.TRANSLATION_COMPLETE, this.translateMethod);
  }

  copyEnTo(aLanguageProperties: LanguageProperties) {
    const postFix = this.postfixInputInput.nativeElement.value ? this.postfixInputInput.nativeElement.value : '';
    const copyMethod = (sourceStrings: Array<string>, lang: string): Promise<Array<string>> => {
      const copiedValues = sourceStrings.map(sourceString => `${sourceString}${postFix}`);
      return new Promise<Array<string>>((resolve, reject) => {
        resolve(copiedValues);
      });
    };
    this.convertEn(this.treeComponent.data, aLanguageProperties, NotificationTypesEnum.ENGLISH_COPY_COMPLETE, copyMethod);
  }

  private convertEn(aData: JsonNode[], aLanguageProperties: LanguageProperties, aMessagesEnum: NotificationTypesEnum,
                    aConversionMethod: (sourceStrings: Array<string>, targetLang: string) => Promise<Array<string>>) {
    const nodesForConversionArray = [];
    this.getNodesForConversion(aData, aLanguageProperties, nodesForConversionArray);

    const englishValuesArray = nodesForConversionArray.map(jsonNode => jsonNode.value[ENGLISH_CODE]);

    aConversionMethod(englishValuesArray, aLanguageProperties.lang).then(retValuesArray => {
      const jsonNodes4updateArray: Node4Change[] = [];
      nodesForConversionArray.forEach((jsonNode, index) => {
        jsonNodes4updateArray.push(new Node4Change(jsonNode, aLanguageProperties.lang, retValuesArray[index]));
      });
      this.treeComponent.updateControls(jsonNodes4updateArray);
      this.notifyParent(aMessagesEnum);
    });
  }

  private getNodesForConversion(aData: JsonNode[], aLanguageProperties: LanguageProperties, aNodesForConversionArray: JsonNode[]) {
    aData.forEach(jsonNode => {
      if (jsonNode.hasChildren) {
        this.getNodesForConversion(jsonNode.children(), aLanguageProperties, aNodesForConversionArray);
      } else {
        const langValue = jsonNode.value[aLanguageProperties.lang];
        if (_.isNil(langValue) || langValue.trim().length <= 0) {
          aNodesForConversionArray.push(jsonNode);
        }
      }
    });
  }

  refreshProblems() {
    this.treeComponent.recalculateProblems(this.getTreeData());
    delete this.searchBufferObjectMap[SearchByEnum.PROBLEM];
    this.getSearchBufferForProblem();
  }

  /**
   * Manipulate the Json tree to update its model - then emitting this model up for uploading/saving
   */
  upload() {
    const languagesMap = new Map<string, any>();
    const languagesUtilsObjectMap: { [key: string]: any } = {};

    this.getLanguages4EditingArray().forEach((langProperties: LanguageProperties) => {
      const newJson4Lang = {};
      languagesMap.set(langProperties.lang, newJson4Lang);
      languagesUtilsObjectMap[langProperties.lang] = newJson4Lang;
    });

    this.treeComponent.updateDataFromInputControls();
    this.convertDataToJsonObjects(this.getTreeData(), languagesUtilsObjectMap);

    // In case removed a language
    const deletedLanguages = _.difference(Array.from(this.languagesMap.keys()), Object.keys(languagesUtilsObjectMap));
    if (deletedLanguages && deletedLanguages.length > 0) {
      deletedLanguages.forEach((deletedLanguage) => languagesMap.set(deletedLanguage, {}));
    }
    this.treeComponent.resetDirtyState();

    this.refreshProblems();
    this.languagesMapOutput.emit(languagesMap);
  }

  private convertDataToJsonObjects(aSourceJsonNodeArray: JsonNode[], aLangObjectMap: { [key: string]: any }) {
    aSourceJsonNodeArray.forEach(jsonNode => {
      const key = jsonNode.key;
      if (jsonNode.hasChildren) {
        this.convertDataToJsonObjects(jsonNode.children(), aLangObjectMap);
      } else {
        this.getLanguages4EditingArray().forEach((langProperties: LanguageProperties) => {
          const lang = langProperties.lang;
          const value = jsonNode.value[lang] ? jsonNode.value[lang] : '';
          _.set(aLangObjectMap[lang], jsonNode.fullPath, value);
        });
      }
    });
  }

  handleLangSelectMenuChange(aMatCheckBox: MatCheckbox, aLangSelectTrigger: MatMenuTrigger) {
    // console.log(aMatCheckBox.checked, aMatCheckBox, aLangSelectTrigger);
    // if (aMatCheckBox.checked) {
    // } else {
    //   setTimeout(() => aLangSelectTrigger.closeMenu(), 500);
    // }
  }

  jsonTreeMessageReceived(aNotificationEnum: NotificationTypesEnum) {
    switch (aNotificationEnum) {
      case NotificationTypesEnum.TREE_INITIALIZATION_SUCCESS:
        // Defer to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => this.wasLangLoadedOk = true);
        break;
      case NotificationTypesEnum.TREE_INITIALIZATION_FAILED:
        setTimeout(() => this.wasLangLoadedOk = false);
        break;
    }
    this.outputMessages.emit(aNotificationEnum);
  }

  languageChangeOrderOrVisibility(aEvent: CdkDragDrop<any, any>, aLang: LanguageProperties = null) {
    if (aEvent && aEvent.currentIndex !== 0) {
      moveItemInArray(this.getLanguages4EditingArray(), aEvent.previousIndex, aEvent.currentIndex);
    }
    this.treeComponent.saveLanguages4EditingOrderAndVisibility(aLang);
  }
}
