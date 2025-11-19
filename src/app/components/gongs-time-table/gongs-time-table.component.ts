import {
  AfterViewChecked,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChildren
} from '@angular/core';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatTableDataSource} from '@angular/material/table';
import {Observable, Subscription, timer} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import Swal, {SweetAlertResult} from 'sweetalert2';
import moment from 'moment';

import {ScheduledGong} from '../../model/ScheduledGong';
import {StoreService} from '../../services/store.service';
import {DateFormat} from '../../model/dateFormat';

enum Translation_Enum {
  CONFIRM_DEGONG_TITLE_DISABLE,
  CONFIRM_DEGONG_TITLE_DELETE,
  CONFIRM_DEGONG_TEXT,
  CONFIRM_DEGONG_CANCEL,
  CONFIRM_DEGONG_CONFIRM_DISABLE,
  CONFIRM_DEGONG_CONFIRM_DELETE,
}

@Component({
  selector: 'app-gongs-time-table',
  templateUrl: './gongs-time-table.component.html',
  styleUrls: ['./gongs-time-table.component.scss']
})
export class GongsTimeTableComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {

  private _scheduledGongsArray: ScheduledGong[];
  private _displayDate: boolean = true;

  @Input()
  displayDay: boolean = true;

  @Input()
  isDeleteButton: boolean = false;

  @Input()
  isDisableToggle: boolean = false;

  @Input()
  isFindNext: boolean = false;

  @Input('displayDate')
  set displayDate(aNewValue: boolean) {
    this._displayDate = aNewValue;
  }

  get displayDate(): boolean {
    return this._displayDate;
  }

  @Input('scheduledGongs')
  set scheduledGongsArray(aNewValue: ScheduledGong[]) {
    if (this.lastToggledCB) {
      const foundRecord = aNewValue.find(
        (scheduledGong) => `${scheduledGong.exactMoment.valueOf()}` === this.lastToggledCB.id);
      if (foundRecord) {
        const foundRecordOnMemberArray = this._scheduledGongsArray.find(
          (scheduledGong) => `${scheduledGong.exactMoment.valueOf()}` === this.lastToggledCB.id);
        if (foundRecordOnMemberArray) {
          foundRecordOnMemberArray.isActive = foundRecord.isActive;
        }
        this.lastToggledCB.checked = foundRecord.isActive;
        this.lastToggledCB.disabled = false;
        if (this.nextGongIndex >= 0) {
          this.iterateListToComputeNextGong();
        }
      }
    } else {
      this._scheduledGongsArray = aNewValue;
    }
  }

  @Input()
  private computeNextGong: boolean = false;

  @Output() gongActiveToggleEvent = new EventEmitter<ScheduledGong>();

  @Output() gongsTableDataChangedEvent = new EventEmitter<void>();

  @Output() scheduledGongEndedEvent = new EventEmitter<boolean>();

  @ViewChildren('cmd') customComponentChildren: QueryList<MatCheckbox>;

  translationMap = new Map<Translation_Enum, string>();

  displayedColumnsOptions = ['day', 'date', 'time', 'gongType', 'area', 'volume', 'isOn'];
  displayedColumns = [];
  dataSource: MatTableDataSource<ScheduledGong>;

  gongTypesSubscription: Subscription;
  nextGongSubscription: Subscription;
  nextGongIndex: number = -1;

  dataSourceWasChanged: boolean;

  dateFormat: DateFormat;

  lastToggledCB: MatCheckbox;

  constructor(private storeService: StoreService,
              private translate: TranslateService) {
  }

  ngOnInit() {
    this.translateNeededText();

    this.resetDisplayedColumns();

    this.translate.onLangChange.subscribe(() => this.translateNeededText());

    this.storeService.getDateFormat().subscribe(dateFormat => this.dateFormat = dateFormat.convertToDateFormatter());
  }

  public scrollToNextGong() {
    if (this.nextGongIndex >= 0) {
      const nextGong = this._scheduledGongsArray[this.nextGongIndex];
      if (nextGong) {
        const gongId = nextGong.exactMoment.valueOf();
        const foundCheckbox = this.customComponentChildren.find((item: MatCheckbox) => +item.id === gongId);
        if (foundCheckbox) {
          foundCheckbox.focus();
        }
      }
    }
  }

  private resetDisplayedColumns() {
    this.displayedColumns = this.displayedColumnsOptions.filter((colItemName: string) => {
      const isFieldNoDisplay = (!this.displayDay && colItemName === 'day') || (!this._displayDate && colItemName === 'date');
      return !isFieldNoDisplay;
    });
  }

  private translateNeededText() {
    const transKeysConfirmDeGongMap = new Map<string, Translation_Enum>();

    const transKeyBase = 'gongsTimeTable.confirmations.disableDeleteGong.';
    transKeysConfirmDeGongMap.set(transKeyBase + 'title.disable', Translation_Enum.CONFIRM_DEGONG_TITLE_DISABLE);
    transKeysConfirmDeGongMap.set(transKeyBase + 'title.delete', Translation_Enum.CONFIRM_DEGONG_TITLE_DELETE);
    transKeysConfirmDeGongMap.set(transKeyBase + 'text', Translation_Enum.CONFIRM_DEGONG_TEXT);
    transKeysConfirmDeGongMap.set(transKeyBase + 'buttons.cancel', Translation_Enum.CONFIRM_DEGONG_CANCEL);
    transKeysConfirmDeGongMap.set(
      transKeyBase + 'buttons.confirm.disable', Translation_Enum.CONFIRM_DEGONG_CONFIRM_DISABLE);
    transKeysConfirmDeGongMap.set(transKeyBase + 'buttons.confirm.delete', Translation_Enum.CONFIRM_DEGONG_CONFIRM_DELETE);

    this.translate.get(Array.from(transKeysConfirmDeGongMap.keys())).subscribe(transResult => {
      transKeysConfirmDeGongMap.forEach(((value, key) =>
        this.translationMap.set(transKeysConfirmDeGongMap.get(key), transResult[key])));
    });
  }

  private gongActivationToggle(aId: number, aIsOnAction: boolean, aChkBxCtrl: MatCheckbox) {
    this.lastToggledCB = aChkBxCtrl;
    const foundScheduledGong =
      this._scheduledGongsArray.find((scheduledGong: ScheduledGong) => scheduledGong.exactMoment.isSame(aId));
    if (foundScheduledGong) {
      aChkBxCtrl.disabled = true; // This will be refreshed when updating the data from the server
      const clonedObj = foundScheduledGong.clone();
      clonedObj.isActive = aIsOnAction;
      this.gongActiveToggleEvent.emit(clonedObj);
    }
  }

  async gongToggle(aEvent, aId) {
    const foundItem = this.customComponentChildren.find((item: MatCheckbox) => +item.id === aId);

    if (foundItem) {
      if (foundItem.checked) {
        aEvent.preventDefault();
        const isDisablingConfirmed = await this.confirmGongDisablingOrDeletion(false);
        if (isDisablingConfirmed) {
          foundItem.checked = false;
          this.gongActivationToggle(aId, false, foundItem);
        }
      } else {
        this.gongActivationToggle(aId, true, foundItem);
      }
    }

    return true;
  }

  gongRemove(aScheduledGongId: number) {
    const foundScheduledGong =
      this._scheduledGongsArray.find(
        (scheduledGong: ScheduledGong) => scheduledGong.exactMoment.isSame(aScheduledGongId));
    if (foundScheduledGong) {
      const clonedObj = foundScheduledGong.clone();
      clonedObj.isActive = false;
      this.gongActiveToggleEvent.emit(clonedObj);
    }
  }

  private async confirmGongDisablingOrDeletion(aIsDelete: boolean = false): Promise<boolean> {
    const title = this.translationMap.get(
      aIsDelete ? Translation_Enum.CONFIRM_DEGONG_TITLE_DELETE : Translation_Enum.CONFIRM_DEGONG_TITLE_DISABLE);

    const confirm = this.translationMap.get(
      aIsDelete ? Translation_Enum.CONFIRM_DEGONG_CONFIRM_DELETE : Translation_Enum.CONFIRM_DEGONG_CONFIRM_DISABLE);


    const result: SweetAlertResult = await Swal.fire({
      title,
      text: this.translationMap.get(Translation_Enum.CONFIRM_DEGONG_TEXT),
      imageUrl: '/assets/icons/alerts/icons8-error-48.png',
      customClass: { popup: 'confirmClass' },
      confirmButtonText: confirm,
      showCancelButton: true,
      cancelButtonText: this.translationMap.get(Translation_Enum.CONFIRM_DEGONG_CANCEL),
    });

    return Promise.resolve(result.value === true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.displayDate) {
      this.resetDisplayedColumns();
    } else if (changes.scheduledGongsArray) {
      if (this.lastToggledCB) {
        this.lastToggledCB = null;
      } else {
        this.createDataSource();
      }
    }
  }

  ngAfterViewChecked() {
    if (this.dataSourceWasChanged) {
      this.gongsTableDataChangedEvent.emit();
      this.dataSourceWasChanged = false;
    }
  }

  private createDataSource() {
    this.cancelSubscription();

    if (this._scheduledGongsArray && this._scheduledGongsArray.length > 0) {
      this.gongTypesSubscription = this.storeService.getGongTypesMap().subscribe(gongTypesMap => {
        if (!gongTypesMap || !Object.keys(gongTypesMap).length) {
          return;
        }
        let lastScheduledGongRecord: ScheduledGong = new ScheduledGong();
        this._scheduledGongsArray.forEach((scheduledGong: ScheduledGong, index) => {
          scheduledGong.gongTypeName = gongTypesMap[scheduledGong.gongTypeId].name;

          if (scheduledGong.dayNumber !== lastScheduledGongRecord.dayNumber) {
            lastScheduledGongRecord = scheduledGong;
            lastScheduledGongRecord.span = 1;
          } else {
            scheduledGong.span = 0;
            lastScheduledGongRecord.span++;
          }
        });
        this.iterateListToComputeNextGong();
      });
    }

    this.dataSource = new MatTableDataSource<ScheduledGong>(this._scheduledGongsArray);
    this.dataSourceWasChanged = true;
  }

  private iterateListToComputeNextGong() {
    this.nextGongIndex = -1;
    if (this.nextGongSubscription) {
      this.nextGongSubscription.unsubscribe();
    }

    let nextGongIndex = -1;
    const currentMoment = moment();
    this._scheduledGongsArray.forEach((scheduledGong: ScheduledGong, index) => {
      if (nextGongIndex < 0 && this.isFindNext) {
        scheduledGong.isAfterNextGong = scheduledGong.exactMoment.isSameOrAfter(currentMoment);
        if (scheduledGong.isAfterNextGong && scheduledGong.isActive) {
          scheduledGong.isTheNextGong = true;
          nextGongIndex = index;
        } else {
          scheduledGong.isTheNextGong = false;
        }
      } else {
        scheduledGong.isAfterNextGong = true;
        scheduledGong.isTheNextGong = false;
      }
    });
    this.timerToChangeNextGong(nextGongIndex);
  }

  private timerToChangeNextGong(aNextGongIndex: number) {
    if (aNextGongIndex < 0) {
      return;
    }
    if (aNextGongIndex >= this._scheduledGongsArray.length) {
      this.scheduledGongEndedEvent.emit(true);
      return;
    }
    this.nextGongIndex = aNextGongIndex;
    const timeOfNextGong = this._scheduledGongsArray[aNextGongIndex].exactMoment.clone().add(1, 'm');
    this.nextGongSubscription = timer(timeOfNextGong.toDate()).subscribe(() => {
      this.scheduledGongEndedEvent.emit(false);
      this._scheduledGongsArray[aNextGongIndex].isTheNextGong = false;
      this._scheduledGongsArray[aNextGongIndex].isAfterNextGong = false;
      const newNextGongIndex = this.findNextActiveGongIndex(aNextGongIndex);
      if (newNextGongIndex > 0) {
        this._scheduledGongsArray[newNextGongIndex].isTheNextGong = true;
        this.timerToChangeNextGong(newNextGongIndex);
      } else {
        this.nextGongIndex = -1;
      }
    });
  }

  private findNextActiveGongIndex(aGongIndex: number) {
    let newNextGongIndex = aGongIndex + 1;
    while (newNextGongIndex < this._scheduledGongsArray.length) {
      if (this._scheduledGongsArray[newNextGongIndex].isActive) {
        break;
      }
      newNextGongIndex++;
    }
    return (newNextGongIndex >= this._scheduledGongsArray.length) ? -1 : newNextGongIndex;
  }

  cancelSubscription() {
    if (this.gongTypesSubscription) {
      this.gongTypesSubscription.unsubscribe();
    }
    if (this.nextGongSubscription) {
      this.nextGongSubscription.unsubscribe();
    }
  }

  ngOnDestroy(): void {
    this.cancelSubscription();
  }

}
