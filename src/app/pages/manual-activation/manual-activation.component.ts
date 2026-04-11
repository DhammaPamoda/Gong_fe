import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import { MatListOption, MatSelectionList, MatSelectionListChange } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';

import { BehaviorSubject, Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgRedux } from '@angular-redux/store';
import moment from 'moment';
import Swal from 'sweetalert2';

import { GongType } from '../../model/gongType';
import { Area } from '../../model/area';
import { StoreService } from '../../services/store.service';
import { ScheduledGong } from '../../model/ScheduledGong';
import { UpdateStatusEnum } from '../../model/updateStatusEnum';
import { StoreDataTypeEnum } from '../../store/storeDataTypeEnum';
import { MessagesService } from '../../services/messages.service';
import { Gong } from '../../model/gong';
import { IObjectMap } from '../../model/store-model';
import { AuthService } from '../../services/auth.service';
import { BaseComponent } from '../../shared/baseComponent';

@Component({
  selector: 'app-manual-activation',
  templateUrl: './manual-activation.component.html',
  styleUrls: ['./manual-activation.component.scss']
})
export class ManualActivationComponent extends BaseComponent {

  @ViewChild('allAreasSelectionCtrl', { static: false }) allSelectedOptionCtrl: MatListOption;
  @ViewChild('areasSelectionCtrl', { static: true }) areasSelectionCtrl: MatSelectionList;

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
    private messagesService: MessagesService) {
    super();
  }

  protected hookOnInit() {
    this.gongToPlay.areas = [0];
    this.gongToPlay.gongTypeId = 1; // Default to Long Gong
    this.gongToPlay.volume = 100;
    this.gongToPlay.repeat = 1;
    this.gongToPlay.isActive = true;
    this.gongToPlay.updateStatus = UpdateStatusEnum.PENDING;

    this.constructGongTypesArray();
    this.constructAreasArray();
  }


  protected listenForUpdates() {
    this.setOnScheduledGongsArrayChange();
    this.setOnAreasSelectionChange();
    this.setOnPlayGongEnabledChange();

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
          if (s.option.selected) {
            this.areasSelectionCtrl.selectAll();
          } else {
            this.areasSelectionCtrl.deselectAll();
          }
        } else {
          const selectedAreaIds = this.gongToPlay.areas.filter(value => value > 0);
          const areAllAreasSelected = selectedAreaIds.length >= this.areas.length;

          if (s.option.selected) {
            if (areAllAreasSelected && !this.gongToPlay.areas.includes(0)) {
              this.areasSelectionCtrl.selectAll();
            }
          } else {
            if (this.gongToPlay.areas.includes(0)) {
              this.allSelectedOptionCtrl.selected = false;
              // Manually removing 0 from the model since toggling the option might not be enough depending on MatSelectionList implementation
              this.gongToPlay.areas = this.gongToPlay.areas.filter(a => a !== 0);
            }
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
          this.areas = areasMap.filter((area: Area) => area && area.id !== 0);
          this.areas.forEach((area: Area) => {
            this.areasMap[area.id] = area;
          });

          if (this.gongToPlay.areas && this.gongToPlay.areas.includes(0)) {
            const allAreaIds = [0].concat(this.areas.map(a => a.id));
            this.gongToPlay.areas = allAreaIds;
          }
        }
      });
  }

  playGong() {
    console.log('▶️ Play button clicked');

    const selectedGongType = this.gongTypes.find(g => g.id === this.gongToPlay.gongTypeId);
    const isSensitive = selectedGongType && ['siren', 'prepare', 'end'].includes(selectedGongType.name);

    if (isSensitive) {
      Swal.fire({
        title: 'Warning',
        text: 'Are you sure you want to activate this emergency wartime alert?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes',
        cancelButtonText: 'Cancel'
      }).then((result) => {
        if (result.value) {
          this.executePlayGong();
        }
      });
    } else {
      this.executePlayGong();
    }
  }

  private executePlayGong() {
    const createdGong = Gong.createOutOfScheduledGong(this.gongToPlay);
    this.storeService.playGong(createdGong);

    // Start polling to monitor gong status
    this.startPollingGongStatus();
  }

  scheduleGong() {
    if (this.gongToPlay.areas.length <= 0) {
      const messageTrans = this.titles.manualActivation.messages.areaIsEmpty;
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


  private startPollingGongStatus() {
    // Stop any existing polling first
    this.stopPollingGongStatus();

    console.log('Starting gong status polling');
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

              // Stop polling when gong finishes playing
              if (!this.isGongCurrentlyPlaying) {
                console.log('Gong finished - stopping polling');
                this.stopPollingGongStatus();
              }
            }
          },
          (error) => {
            console.error('Error checking gong playing status:', error);
            // Don't change status on error to avoid flickering
          }
        );
      });
  }

  private stopPollingGongStatus() {
    if (this.gongPlayingCheckSubscription) {
      console.log('Stopping gong status polling');
      this.gongPlayingCheckSubscription.unsubscribe();
      this.gongPlayingCheckSubscription = null;
    }
  }

  cancelGong() {
    console.log('🛑 Cancel button clicked');

    // Stop polling immediately when cancel is clicked
    this.stopPollingGongStatus();

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
    this.stopPollingGongStatus();
    super.ngOnDestroy();
  }
}
