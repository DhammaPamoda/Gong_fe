import {Component} from '@angular/core';
import {MatRadioChange} from '@angular/material/radio';

import {NgRedux} from '@angular-redux/store';

import {takeUntil} from 'rxjs/operators';

import * as _ from 'lodash';
import {TranslateService} from '@ngx-translate/core';
import Swal, {SweetAlertResult} from 'sweetalert2';

import {NotificationTypesEnum} from '../../../json-editor/shared/dataModels/lang.model';
import {IndexedDbService} from '../../../shared/indexed-db.service';
import {BaseLangComponent} from '../base-lang.component';
import {EnumUtils} from '../../../utils/enumUtils';
import {StoreDataTypeEnum} from '../../../store/storeDataTypeEnum';

enum TopicsEnum {
  AREAS = 'areas',
  COURSES = 'courses',
  GONGS = 'gongType',
}

enum TransKeysEnum {
  UNSAVED_CONFIRM_TITLE = 'config.i18n.confirm.unsaved.title',
  UNSAVED_CONFIRM_MESSAGE = 'config.i18n.confirm.unsaved.message',
  UNSAVED_CONFIRM_CANCEL = 'config.i18n.confirm.unsaved.buttons.cancel',
  UNSAVED_CONFIRM_ACTION = 'config.i18n.confirm.unsaved.buttons.confirm',
}

@Component({
  selector: 'app-areas-i18n',
  templateUrl: './i18n-editing.component.html',
  styleUrls: ['./i18n-editing.component.scss']
})
export class I18nEditingComponent extends BaseLangComponent {
  languagesMap: Map<string, any> = new Map<string, any>();

  topics: Array<TopicsEnum> = [];
  selectedTopic: TopicsEnum;

  showJsonEditor: boolean = false;

  isJsonDirty = false;

  keysArray4Translations: Array<string>;

  staticDataRecentUpdateDate: Date;

  constructor(ngRedux: NgRedux<any>,
              indexedDbService: IndexedDbService,
              translate: TranslateService) {
    super(translate, ngRedux, null, indexedDbService);
    this.topics.push(...EnumUtils.getEnumValues(TopicsEnum));
    this.selectedTopic = this.topics[0];
  }


  protected listenForUpdates() {
    this.ngReduxObj.select<Date>([StoreDataTypeEnum.INNER_DATA, 'staticDataWasUpdated'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((staticDataUpdateDate) => {
        if (staticDataUpdateDate && this.staticDataRecentUpdateDate !== staticDataUpdateDate) {
          this.staticDataRecentUpdateDate = staticDataUpdateDate;
          this.getLanguagesMap();
        }
      });
  }

  protected getKeysArray4Translations(): string[] {
    if (!this.keysArray4Translations) {
      this.keysArray4Translations = [];
      this.keysArray4Translations.push(...EnumUtils.getEnumValues(TransKeysEnum));
    }
    return this.keysArray4Translations;
  }


  protected getLanguagesMap(): Promise<void> {
    return super.getLanguagesMap().then(() => {
      this.reloadJsonEditorForTopic();
    });
  }

  languagesMapUpdateReceived(aReceivedLangMap: Map<string, any>) {
    this.saveJsonEditorDataForTopic(aReceivedLangMap);
    super.saveGlobalLanguagesMap(this.globalLanguagesMap );
  }

  jsonEditorMessageReceived(aMessagesEnum: NotificationTypesEnum) {
    switch (aMessagesEnum) {
      case NotificationTypesEnum.TREE_INITIALIZATION_SUCCESS:
        if (!this.showJsonEditor) {
          setTimeout(() => this.showJsonEditor = true);
        }
        break;
      case NotificationTypesEnum.TREE_IS_DIRTY:
        this.isJsonDirty = true;
        break;
      case NotificationTypesEnum.TREE_IS_CLEAN:
        this.isJsonDirty = false;
        break;
    }

  }

  async topicHasChanged(aEvent: MatRadioChange) {
    if (this.isJsonDirty) {
      const beforeChangeSelectedTopic = this.selectedTopic;
      const title = super.getTranslation(TransKeysEnum.UNSAVED_CONFIRM_TITLE);
      const message = super.getTranslation(TransKeysEnum.UNSAVED_CONFIRM_MESSAGE);
      const confirm = super.getTranslation(TransKeysEnum.UNSAVED_CONFIRM_ACTION);
      const cancel = super.getTranslation(TransKeysEnum.UNSAVED_CONFIRM_CANCEL);

      const result: SweetAlertResult = await Swal.fire({
        title: title,
        html: message,
        imageUrl: '/assets/icons/alerts/icons8-error-48.png',
        customClass: { popup: 'confirmClass' },
        confirmButtonText: confirm,
        showCancelButton: true,
        cancelButtonText: cancel,
      });

      if (result.value !== true) {
        setTimeout(() => {
          this.selectedTopic = beforeChangeSelectedTopic;
        });
        return;
      }
    }

    this.isJsonDirty = false;
    this.reloadJsonEditorForTopic(aEvent.value as TopicsEnum);
  }

  private reloadJsonEditorForTopic(aSelectedTopic: TopicsEnum = this.selectedTopic) {
    this.languagesMap = new Map<string, any>();

    const keys = Array.from(this.globalLanguagesMap.keys());
    keys.forEach(key => {
      const translation = this.globalLanguagesMap.get(key);
      const translationSubPart = _.get(translation, ['general', 'typesValues', aSelectedTopic]);
      this.languagesMap.set(key, translationSubPart);
    });
  }

  private saveJsonEditorDataForTopic(aReceivedLangMap: Map<string, any>) {
    const keys = Array.from(aReceivedLangMap.keys());
    keys.forEach(key => {
      const updatedTranslation = aReceivedLangMap.get(key);
      const translationOnGlobal = this.globalLanguagesMap.get(key);
      _.set(translationOnGlobal, ['general', 'typesValues', this.selectedTopic], updatedTranslation);
    });
  }
}
