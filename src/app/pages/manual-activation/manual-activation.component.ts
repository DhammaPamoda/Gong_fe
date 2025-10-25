import {ChangeDetectorRef, Component, ViewChild} from '@angular/core';
import {MatListOption, MatSelectionList, MatSelectionListChange} from '@angular/material/list';
import {MatSnackBar} from '@angular/material/snack-bar';

import {BehaviorSubject, Subscription, timer} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {NgRedux} from '@angular-redux/store';
import {TranslateService} from '@ngx-translate/core';
import moment from 'moment';

import {GongType} from '../../model/gongType';
import {Area} from '../../model/area';
import {StoreService} from '../../services/store.service';
import {ScheduledGong} from '../../model/ScheduledGong';
import {UpdateStatusEnum} from '../../model/updateStatusEnum';
import {StoreDataTypeEnum} from '../../store/storeDataTypeEnum';
import {MessagesService} from '../../services/messages.service';
import {Gong} from '../../model/gong';
import {IObjectMap} from '../../model/store-model';
import {AuthService} from '../../services/auth.service';
import {BaseComponent} from '../../shared/baseComponent';

@Component({
  selector: 'app-manual-activation',
  templateUrl: './manual-activation.component.html',
  styleUrls: ['./manual-activation.component.scss']
})
export class ManualActivationComponent extends BaseComponent {

  @ViewChild('allAreasSelectionCtrl', {static: false}) allSelectedOptionCtrl: MatListOption;
  @ViewChild('areasSelectionCtrl', {static: true}) areasSelectionCtrl: MatSelectionList;

  gongToPlay: ScheduledGong = new ScheduledGong();
  gongTypes: GongType[];
  areas: Area[];
  areasMap: Area[] = [];

  isScheduledDatePickerOpen: boolean;
  chosenTime: Date;
  scheduleGongStartDate: Date;

  scheduledGongsArray: ScheduledGong[];

  timerSubscription: Subscription;
  gongPlayingCheckSubscription: Subscription;

  playGongEnabled: boolean;
  isGongCurrentlyPlaying: boolean = false;

  private isGongTypesArrayReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  playGongPermissions: boolean;
  scheduleGongPermissions: boolean;
  deleteGongPermissions: boolean;

  constructor(private ngRedux: NgRedux<any>,
              private changeDetectorRef: ChangeDetectorRef,
              private authService: AuthService,
              private storeService: StoreService,
              private snackBar: MatSnackBar,
              private messagesService: MessagesService,
              translateService: TranslateService) {
    super(translateService);
  }

  protected hookOnInit() {
    this.gongToPlay.areas = [];
    this.gongToPlay.volume = 100;
    this.gongToPlay.repeat = 1;
    this.gongToPlay.isActive = true;
    this.gongToPlay.updateStatus = UpdateStatusEnum.PENDING;

    this.constructGongTypesArray();
    this.constructAreasArray();
  }

  protected getKeysArray4Translations(): string[] {
    return ['manualActivation.messages.areaIsEmpty'];
  }

  protected listenForUpdates() {
    this.setOnScheduledGongsArrayChange();
    this.setOnAreasSelectionChange();
    this.setOnPlayGongEnabledChange();
    this.startGongPlayingCheck();

    // Permissions
    this.authService.hasPermission('play_manual')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.playGongPermissions = isPermitted);

    this.authService.hasPermission('schedule_manual')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.scheduleGongPermissions = isPermitted);

    this.authService.hasPermission('delete_manual')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.deleteGongPermissions = isPermitted);

  }

  private setOnAreasSelectionChange() {
    this.areasSelectionCtrl.selectionChange
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((s: MatSelectionListChange) => {
          if (s.option.value === 0) {
            if (this.gongToPlay.areas.includes(0)) {
              this.areasSelectionCtrl.selectAll();
            } else {
              this.areasSelectionCtrl.deselectAll();
            }
          } else {
            if (this.gongToPlay.areas.includes(s.option.value)) {
              if (this.gongToPlay.areas.filter(value => value > 0).length >= this.areas.length) {
                this.areasSelectionCtrl.selectAll();
              }
            } else if (this.gongToPlay.areas.includes(0)) {
              this.allSelectedOptionCtrl.toggle();
            }
          }
        }
      );
  }

  private setOnPlayGongEnabledChange() {
    this.storeService.getPlayGongEnabled()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((aIsEnabled) => this.playGongEnabled = aIsEnabled);
  }

  private constructGongTypesArray() {
    this.gongTypes = [];

    this.storeService.getGongTypesMap()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((gongTypesMap: IObjectMap<GongType>) => {
        this.gongTypes = Array.from(Object.values(gongTypesMap));
        this.isGongTypesArrayReady.next(true);
        if (this.gongTypes && this.gongTypes[0]) {
          this.gongToPlay.gongTypeId = this.gongTypes[0].id;
        }
      });
  }

  private constructAreasArray() {
    this.storeService.getAreasMap()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(areasMap => {
        if (areasMap && areasMap.length > 0) {
          this.areas = areasMap.filter((value: Area) => value.id !== 0);
          this.gongToPlay.areas.push(0);
          this.areas.forEach((area: Area) => {
            this.areasMap[area.id] = area;
            this.gongToPlay.areas.push(area.id);
          });
        }
      });
  }

  playGong() {
    console.log('▶️ Play button clicked');
    console.trace('Play gong called from:');
    const createdGong = Gong.createOutOfScheduledGong(this.gongToPlay);
    this.storeService.playGong(createdGong);
  }

  scheduleGong() {
    if (this.gongToPlay.areas.length <= 0) {
      const messageTrans = this.getTranslation('manualActivation.messages.areaIsEmpty');
      this.snackBar.open(messageTrans, null, {
        duration: 5000,
        panelClass: 'snackBarClass',
      });
      return;
    }
    this.chosenTime = undefined;
    this.computeDatePickerStartTime();
    this.isScheduledDatePickerOpen = true;
  }

  private computeDatePickerStartTime() {
    this.scheduleGongStartDate = moment().add(1, 'm').toDate();
  }

  repeatIncrement(aIncrementValue = 1) {
    this.gongToPlay.repeat += aIncrementValue;
  }

  reopen() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
    this.computeDatePickerStartTime();
    this.isScheduledDatePickerOpen = true;
  }

  scheduledDateOnClose() {
    if (this.chosenTime) {
      if (moment().isAfter(this.chosenTime)) {
        this.timerSubscription = timer(100)
          .pipe(takeUntil(this.onDestroy$))
          .subscribe(() => this.reopen());
        this.isScheduledDatePickerOpen = false;
        this.messagesService.scheduleGongToFutureTime();
        return;
      }
      this.gongToPlay.date = this.chosenTime;
      this.storeService.addManualGong(this.gongToPlay);
    }
    this.isScheduledDatePickerOpen = false;
    this.chosenTime = new Date();
  }

  private setOnScheduledGongsArrayChange() {
    this.ngRedux.select<ScheduledGong[]>([StoreDataTypeEnum.DYNAMIC_DATA, 'manualGongs'])
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((scheduledGongs: ScheduledGong[]) => {
        if (scheduledGongs) {
          this.scheduledGongsArray = [];
          scheduledGongs.forEach((scheduledGong: ScheduledGong) => {
            const clonedScheduledGong = scheduledGong.cloneForUi();
            this.scheduledGongsArray.push(clonedScheduledGong);
          });
          this.scheduledGongsArray.sort((a, b) => a.date.getTime() - b.date.getTime());
        }
      });
  }

  onGongRemove(aRemovedScheduledGong: ScheduledGong) {
    this.storeService.removeScheduledGong(aRemovedScheduledGong);
  }

  private startGongPlayingCheck() {
    // Poll every 1 second to check if a gong is playing
    this.gongPlayingCheckSubscription = timer(0, 1000)
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(() => {
        this.storeService.isGongPlaying().subscribe(
          (result: any) => {
            const wasPlaying = this.isGongCurrentlyPlaying;
            this.isGongCurrentlyPlaying = result.data && result.data.isPlaying;
            if (wasPlaying !== this.isGongCurrentlyPlaying) {
              console.log('Gong playing status changed:', this.isGongCurrentlyPlaying);
            }
          },
          (error) => {
            console.error('Error checking gong playing status:', error);
            // Don't change status on error to avoid flickering
          }
        );
      });
  }

  cancelGong() {
    console.log('🛑 Cancel button clicked');
    this.storeService.cancelGong().subscribe(
      (result: any) => {
        console.log('Cancel gong result:', result);
        const data = result.data || result;
        const message = data.gongCanceled ? 'Gong canceled successfully' : 'No gong was playing';
        this.snackBar.open(message, null, {
          duration: 3000,
          panelClass: 'snackBarClass',
        });
        // Add a small delay before showing the play button again to prevent accidental double-clicks
        setTimeout(() => {
          this.isGongCurrentlyPlaying = false;
        }, 500);
      },
      (error) => {
        console.error('Cancel gong error:', error);
        this.snackBar.open('Failed to cancel gong', null, {
          duration: 3000,
          panelClass: 'snackBarClass',
        });
      }
    );
  }

  ngOnDestroy() {
    if (this.gongPlayingCheckSubscription) {
      this.gongPlayingCheckSubscription.unsubscribe();
    }
    super.ngOnDestroy();
  }
}
