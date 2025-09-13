import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material';

import { fromEvent, Subscription, timer } from 'rxjs';
import { filter, first, takeUntil, tap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { NgRedux } from '@angular-redux/store';

import moment from 'moment';

import Swal, { SweetAlertResult } from 'sweetalert2';

import { BaseComponent } from '../../shared/baseComponent';
import { DateFormat } from '../../model/dateFormat';
import { BasicServerData } from '../../model/basicServerData';
import { StoreDataTypeEnum } from '../../store/storeDataTypeEnum';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { EAction, SelectTopicsDialogComponent } from '../../dialogs/select-topics-dialog/select-topics-dialog.component';
import { ETopic, ITopicData } from '../../model/topics-model';
import { EnumUtils } from '../../utils/enumUtils';
import { MessagesService } from '../../services/messages.service';
import { JsonEditorComponent } from '../../json-editor/components/json-editor/json-editor.component';
import { LanguageProperties } from '../../json-editor/shared/dataModels/lang.model';
import { IObjectMap } from '../../model/store-model';

enum ETranslation {
  DELETE_CONFIRM_TITLE = 'main.header.confirm.delete.title',
  DELETE_GONG_CONFIRM_TEXT = 'main.header.confirm.delete.text.gong',
  DELETE_COURSE_CONFIRM_TEXT = 'main.header.confirm.delete.text.course',
  CONFIRM_DELETE_SUBMIT = 'main.header.confirm.delete.buttons.confirm',
  CONFIRM_DELETE_CANCEL = 'main.header.confirm.delete.buttons.cancel',
}

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent extends BaseComponent {

  @ViewChild('courseFile', { static: false }) courseFile: ElementRef;
  @ViewChild('gongFile', { static: false }) gongFile: ElementRef;

  knownLangsObjectMap: IObjectMap<LanguageProperties> = {};
  supportedLanguagesArray: string[];
  currentLanguage: string = 'en';

  dateFormatOptions: DateFormat[];
  currentDateFormat: DateFormat;
  delimitersOptions: string[];

  public now: moment.Moment;
  nextGongTime: moment.Moment;
  isManual: boolean;

  timerSubscription: Subscription;
  nextGongSubscription: Subscription;

  topic = ETopic;
  topicAction = EAction;
  deleteConfirmTranslationObjectKey: { [key: string]: ETranslation } = {};

  viewExportImportPermissions: boolean;
  private gongId4Update: string;

  constructor(ngRedux: NgRedux<any>,
    private storeService: StoreService,
    authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    translate: TranslateService,
    private messagesService: MessagesService) {
    super(translate, ngRedux, authService);

    this.deleteConfirmTranslationObjectKey[ETopic.GONG] = ETranslation.DELETE_GONG_CONFIRM_TEXT;
    this.deleteConfirmTranslationObjectKey[ETopic.COURSE] = ETranslation.DELETE_COURSE_CONFIRM_TEXT;
  }

  protected hookOnInit() {
    this.getBasicData();
    this.getLanguageData();
    this.getSupportedLanguages();
    this.initDateFormatOptions();
  }

  protected getKeysArray4Translations(): string[] {
    return EnumUtils.getEnumValues(ETranslation);
  }

  protected listenForUpdates() {
    // Permissions
    this.authServiceObj.hasPermission('view_export_import')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.viewExportImportPermissions = isPermitted);

    this.ngReduxObj.select<BasicServerData>([StoreDataTypeEnum.DYNAMIC_DATA, 'basicServerData'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((basicServerData: BasicServerData) => {
        if (basicServerData) {
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
          }

          this.now = moment(basicServerData.currentServerTime);
          console.log('updated', this.now)
          const lastSavedTime = this.now.clone();
          const timeToNextMin = this.now.clone().endOf('minute').diff(this.now) + 1;
          this.timerSubscription = timer(timeToNextMin, 60 * 1000).subscribe((tik) => {
            if (tik === 0) {
              this.now = this.now.clone().add(timeToNextMin, 'ms');
            } else {
              this.now = this.now.clone().add(1, 'm');
            }
            if (this.now.diff(lastSavedTime) / (1000 * 60) > 21) {
              location.reload();  // If not logged-in the application will display the login page
            }
          });
          this.isManual = basicServerData.isManual;

          // If not nextScheduledJobTime - reset next gong and subscription. 
          if (!basicServerData.nextScheduledJobTime) {
            this.nextGongTime = null;
             if (this.nextGongSubscription) {
              this.nextGongSubscription.unsubscribe();
            }
            return;
          }

          const nextGongTime = moment(basicServerData.nextScheduledJobTime);
          if (!nextGongTime.isSame(this.nextGongTime)) {
            this.nextGongTime = nextGongTime;
            const timeToNextScheduledJob = this.nextGongTime.clone().startOf('minute').add(1, 'm');

            if (this.nextGongSubscription) {
              this.nextGongSubscription.unsubscribe();
            }

            this.nextGongSubscription = timer(timeToNextScheduledJob.toDate()).subscribe(() => {
              this.getBasicData();
            });
          }
        }
      });

    this.storeService.getDateFormat()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((dateFormat: DateFormat) => {
        this.currentDateFormat = dateFormat;
        this.delimiterChanged();
      });

    this.ngReduxObj.select<number>([StoreDataTypeEnum.INNER_DATA, 'uploadCoursesFileEnded'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((uploadCount) => {
        if (this.courseFile && this.courseFile.nativeElement) {
          this.courseFile.nativeElement.value = '';
        }
      });

    this.ngReduxObj.select<number>([StoreDataTypeEnum.INNER_DATA, 'uploadGongFileEnded'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((uploadCount) => {
        if (this.gongFile && this.gongFile.nativeElement) {
          this.gongFile.nativeElement.value = '';
        }
      });

    this.translateService.onLangChange.pipe(
      filter(res => !!res && (res.lang.trim() !== '')),
      takeUntil(this.onDestroy$))
      .subscribe((newSetLang) => {
        this.getSupportedLanguages();
      });

  }

  initDateFormatOptions(): void {

    this.delimitersOptions = [];
    this.delimitersOptions.push('-');
    this.delimitersOptions.push('/');

    this.dateFormatOptions = [];
    this.dateFormatOptions.push(new DateFormat('DD/MM/YYYY', '/'));
    this.dateFormatOptions.push(new DateFormat('MM/DD/YYYY', '/'));
    this.dateFormatOptions.push(new DateFormat('YYYY/MM/DD', '/'));
    this.dateFormatOptions.push(new DateFormat('YYYY/DD/MM', '/'));

  }

  private getSupportedLanguages() {
    this.supportedLanguagesArray = this.translateService.getLangs().filter(lang => lang.trim() !== '');
  }

  logout() {
    this.authServiceObj.logout();
    this.router.navigate(['']);
  }

  getBasicData(): void {
    this.storeService.getBasicData();
  }

  getLanguageData(): void {
    JsonEditorComponent.getKnownLangsArray().forEach(
      (languageProperties) => this.knownLangsObjectMap[languageProperties.lang] = languageProperties);
  }

  setLanguage(lang: string) {
    this.currentLanguage = lang;
    this.translateService.use(lang);
  }

  setDateFormat(aDateFormat: DateFormat) {
    this.currentDateFormat = aDateFormat;
    this.storeService.setDateFormat(this.currentDateFormat);
  }

  setDelimiter(aDelimiter: string) {
    this.currentDateFormat.delimiter = aDelimiter;
    this.storeService.setDateFormat(this.currentDateFormat);
  }

  delimiterChanged() {
    if (this.dateFormatOptions) {
      this.dateFormatOptions.forEach(dateFormat => dateFormat.changeDelimited(this.currentDateFormat.delimiter));
    }
  }

  uploadCoursesFile() {
    this.courseFile.nativeElement.click();
  }

  uploadGongFile() {
    this.gongFile.nativeElement.click();
  }

  onCoursesFileChange() {
    const files = this.courseFile.nativeElement.files;

    if (files && files.length === 1) {
      this.storeService.uploadCourseFile(files[0]);
    }
  }

  onGongFileChange() {
    const files = this.gongFile.nativeElement.files;
    if (files && files.length === 1) {
      this.storeService.uploadGongFile(files[0], this.gongId4Update);
    }
  }

  openUpdateDeleteDialog(aTopic: ETopic, aAction: EAction) {
    const checkIfUsed = aAction === EAction.DELETE;
    const isMany = aAction === EAction.DOWNLOAD;
    const availableTopics: ITopicData[] = this.storeService.getTopicsData(aTopic, this.currentRole, checkIfUsed);

    const dialogRef = this.dialog.open(SelectTopicsDialogComponent, {
      height: '600px',
      width: '800px',
      position: { top: '15vh' },
      data: { topic: aTopic, availableTopics, forAction: aAction, many: isMany }
    });

    dialogRef.afterClosed()
      .pipe(first())
      .subscribe((selectedTopics: ITopicData[]) => {
        if (!selectedTopics) {
          return;
        }
        switch (aAction) {
          case EAction.DOWNLOAD:
            const selectedCourses = selectedTopics.map(topicData => topicData.id);
            this.storeService.downloadCourses(selectedCourses);
            break;
          case EAction.UPDATE:
            this.gongId4Update = selectedTopics[0].id;
            fromEvent(window, 'focus').pipe(
              first(),
              tap(() => setTimeout(() => delete this.gongId4Update, 700))
            ).subscribe();
            this.gongFile.nativeElement.click();
            break;
          case EAction.DELETE:
            this.displayDeleteConfirmAlert(ETopic.COURSE, selectedTopics[0]).then(
              () => this.storeService.deleteCourse(selectedTopics[0].id)).catch(() => false);
            break;
        }
      });
  }

  deleteLastGong() {
    const lastGongTopicData: ITopicData = this.storeService.getLastGongTopicData();
    if (lastGongTopicData && !lastGongTopicData.inUse) {
      this.displayDeleteConfirmAlert(ETopic.GONG, lastGongTopicData).then(() => this.storeService.deleteGong(lastGongTopicData))
        .catch(() => false);
    } else {
      this.messagesService.lastGongIsBeingUsed(lastGongTopicData && lastGongTopicData.name);
    }
  }


  private async displayDeleteConfirmAlert(aTopic: ETopic, aTopicData: ITopicData): Promise<void> {
    const mainText = this.translationMap.get(this.deleteConfirmTranslationObjectKey[aTopic]);
    const result: SweetAlertResult = await Swal.fire({
      title: this.translationMap.get(ETranslation.DELETE_CONFIRM_TITLE),
      text: `${mainText} : ${aTopicData.name}?`,
      imageUrl: '/assets/icons/alerts/icons8-error-48.png',
      customClass: 'confirmClass',
      confirmButtonText: this.translationMap.get(ETranslation.CONFIRM_DELETE_SUBMIT),
      showCancelButton: true,
      cancelButtonText: this.translationMap.get(ETranslation.CONFIRM_DELETE_CANCEL),
    });


    return (result.value === true) ? Promise.resolve() : Promise.reject();
  }
}
