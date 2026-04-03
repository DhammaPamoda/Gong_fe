import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { fromEvent, Subscription, timer } from 'rxjs';
import { filter, first, takeUntil, tap } from 'rxjs/operators';
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

import { IObjectMap } from '../../model/store-model';



@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent extends BaseComponent {

  @ViewChild('courseFile', { static: false }) courseFile: ElementRef;
  @ViewChild('gongFile', { static: false }) gongFile: ElementRef;


  dateFormatOptions: DateFormat[];
  currentDateFormat: DateFormat;
  delimitersOptions: string[];

  public now: moment.Moment;
  nextGongTime: moment.Moment;
  isManual: boolean;

  timerSubscription: Subscription;
  nextGongSubscription: Subscription;
  syncCheckSubscription: Subscription;

  topic = ETopic;
  topicAction = EAction;

  viewExportImportPermissions: boolean;
  private gongId4Update: string;
  isEmergency: boolean;

  constructor(ngRedux: NgRedux<any>,
    private storeService: StoreService,
    authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private messagesService: MessagesService) {
    super(ngRedux, authService);
  }

  protected hookOnInit() {
    this.getBasicData();
    this.initDateFormatOptions();
  }



  protected listenForUpdates() {
    // Permissions
    this.authServiceObj.hasPermission('view_export_import')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.viewExportImportPermissions = isPermitted);

    this.ngReduxObj.select<BasicServerData>([StoreDataTypeEnum.DYNAMIC_DATA, 'basicServerData'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((basicServerData: BasicServerData) => {
        console.log('🔍 Header received basicServerData:', basicServerData);
        if (basicServerData) {
          if (this.timerSubscription) {
            this.timerSubscription.unsubscribe();
          }

          // 🔹 Use local PC clock time instead of server time
          this.now = moment();
          console.log('Updated time from PC clock:', this.now.format('YYYY-MM-DD HH:mm:ss'))

          // 🔹 Track expected time vs actual time to detect clock changes
          let expectedTime = this.now.clone();

          const timeToNextMin = this.now.clone().endOf('minute').diff(this.now) + 1;
          this.timerSubscription = timer(timeToNextMin, 60 * 1000).subscribe((tik) => {
            const actualTime = moment(); // Get current PC time

            if (tik === 0) {
              expectedTime.add(timeToNextMin, 'ms');
            } else {
              expectedTime.add(1, 'm');
            }

            this.now = actualTime; // Always use actual PC time

            // 🔹 Detect if PC clock was manually changed (drift > 5 minutes)
            const timeDrift = Math.abs(actualTime.diff(expectedTime, 'seconds'));
            if (timeDrift > 300) {
              console.log(`Clock change detected! Drift: ${timeDrift} seconds. Refreshing schedule...`);
              expectedTime = actualTime.clone(); // Reset expected time
              this.getBasicData(); // Refresh next gong from server
            }
          });

          // 🔹 Periodic sync check: every 60 seconds, check if next gong is stuck in the past
          if (this.syncCheckSubscription) {
            this.syncCheckSubscription.unsubscribe();
          }
          this.syncCheckSubscription = timer(60000, 60000).subscribe(() => {
            if (this.nextGongTime && this.nextGongTime.isBefore(moment().subtract(3, 'minutes'))) {
              console.log('🔄 Sync check: Next gong is stuck in the past. Refreshing...');
              this.getBasicData();
            }
          });

          this.isManual = basicServerData.isManual;

          // If not nextScheduledJobTime - reset next gong and subscription. 
          console.log('🔍 basicServerData.nextScheduledJobTime:', basicServerData.nextScheduledJobTime);
          if (!basicServerData.nextScheduledJobTime) {
            console.log('🔍 No next scheduled job time, clearing next gong display');
            this.nextGongTime = null;
            if (this.nextGongSubscription) {
              this.nextGongSubscription.unsubscribe();
            }
            return;
          }

          const nextGongTime = moment(basicServerData.nextScheduledJobTime);

          // 🔹 Check if next gong is in the past (stuck gong) - refresh immediately
          if (nextGongTime && nextGongTime.isBefore(moment().subtract(3, 'minutes'))) {
            console.log('⚠️ Next gong is in the past! Refreshing schedule...', nextGongTime.format('HH:mm'));
            setTimeout(() => this.getBasicData(), 2000); // Refresh after 2 seconds
          }

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

    this.storeService.getEmergencyState()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isEmergency: boolean) => this.isEmergency = isEmergency);
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


  logout() {
    this.authServiceObj.logout();
    this.router.navigate(['']);
  }

  getBasicData(): void {
    this.storeService.getBasicData();
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

  clearEmergency() {
    this.storeService.clearEmergencyState().subscribe();
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
    const mainText = aTopic === ETopic.GONG ? this.titles.main.header.confirm.delete.text.gong : this.titles.main.header.confirm.delete.text.course;
    const result: SweetAlertResult = await Swal.fire({
      title: this.titles.main.header.confirm.delete.title,
      text: `${mainText} : ${aTopicData.name}?`,
      imageUrl: '/assets/icons/alerts/icons8-error-48.png',
      customClass: { popup: 'confirmClass' },
      confirmButtonText: this.titles.main.header.confirm.delete.buttons.confirm,
      showCancelButton: true,
      cancelButtonText: this.titles.main.header.confirm.delete.buttons.cancel,
    });


    return (result.value === true) ? Promise.resolve() : Promise.reject();
  }

  ngOnDestroy() {
    // Clean up all subscriptions
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    if (this.nextGongSubscription) {
      this.nextGongSubscription.unsubscribe();
    }
    if (this.syncCheckSubscription) {
      this.syncCheckSubscription.unsubscribe();
    }
    // Call parent's ngOnDestroy
    super.ngOnDestroy();
  }
}
