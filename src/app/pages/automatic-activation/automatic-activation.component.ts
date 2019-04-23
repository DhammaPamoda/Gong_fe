import {Component, OnDestroy, OnInit} from '@angular/core';
import {NgRedux} from '@angular-redux/store';
import {MatDialog, MatTableDataSource} from '@angular/material';
import {combineLatest, Subscription} from 'rxjs';
import swal from 'sweetalert';

import {CourseSchedule} from '../../model/courseSchedule';
import {Course} from '../../model/course';
import {ScheduledGong} from '../../model/ScheduledGong';
import {StoreDataTypeEnum} from '../../store/storeDataTypeEnum';
import {StoreService} from '../../services/store.service';
import {ScheduleCourseDialogComponent} from '../../dialogs/schedule-course-dialog/schedule-course-dialog.component';
import {TranslateService} from '@ngx-translate/core';
import {ScheduledCourseGong} from '../../model/ScheduledCourseGong';

@Component({
  selector: 'app-automatic-activation',
  templateUrl: './automatic-activation.component.html',
  styleUrls: ['./automatic-activation.component.css']
})
export class AutomaticActivationComponent implements OnInit, OnDestroy {

  coursesDisplayedColumns = ['course_name', 'daysCount', 'date'];
  coursesDataSource: MatTableDataSource<CourseSchedule>;
  coursesData: CourseSchedule[] = [];
  selectedCourseScheduled: CourseSchedule;

  coursesMap: Map<string, Course>;

  selectedCourseRoutineArray: ScheduledGong[] = [];

  subscription: Subscription;

  displayDate: boolean = false;

  waitToScroll: boolean = false;

  constructor(private ngRedux: NgRedux<any>,
              private dialog: MatDialog,
              private translate: TranslateService,
              private storeService: StoreService) {
  }

  ngOnInit() {
    const mergedObservable =
      combineLatest(
        this.ngRedux.select<CourseSchedule[]>([StoreDataTypeEnum.DYNAMIC_DATA, 'coursesSchedule']),
        this.storeService.getCoursesMap()
      );

    this.subscription = mergedObservable.subscribe(mergedResult => {
      const coursesSchedule: CourseSchedule[] = mergedResult[0];
      this.coursesMap = mergedResult[1];
      if (coursesSchedule && this.coursesMap) {
        coursesSchedule.sort(((a, b) => a.date.getTime() - b.date.getTime()));
        this.coursesData = [];
        coursesSchedule.forEach((courseSchedule: CourseSchedule) => {
          const course = this.coursesMap.get(courseSchedule.name);
          if (course) {
            const clonedCourseSchedule = courseSchedule.clone();
            clonedCourseSchedule.daysCount = course.days;
            this.coursesData.push(clonedCourseSchedule);
          }
        });
        if (this.coursesData.length > 0) {
          this.coursesDataSource = new MatTableDataSource<CourseSchedule>(this.coursesData);
        }
        if (this.selectedCourseScheduled) {
          this.selectedCourseScheduled = this.coursesData.find(
            (courseSchedule: CourseSchedule) => courseSchedule.id === this.selectedCourseScheduled.id);
          if (this.selectedCourseScheduled) {
            this.getCourseRoutine(this.selectedCourseScheduled);
          }
        }
      }
    });
  }

  onRowClick(row): void {
    this.selectedCourseScheduled = row;
    this.getCourseRoutine(row);
  }

  private getCourseRoutine(aSelectedCourseScheduled: CourseSchedule) {
    const selectedCourseStartDate = aSelectedCourseScheduled.date;
    const selectedCourseName = aSelectedCourseScheduled.name;

    const foundCourse = this.coursesMap.get(selectedCourseName);

    this.selectedCourseRoutineArray = [];
    const newSelectedCourseRoutineArray: ScheduledGong[] = [];
    if (foundCourse) {
      foundCourse.routine.forEach(course => {
        const copiedCourse = course.cloneForUi(selectedCourseStartDate);
        if (!copiedCourse.volume) {
          copiedCourse.volume = 100;
        }
        // Dealing with Active/InActive
        copiedCourse.isActive = true;
        if (aSelectedCourseScheduled.exceptions &&
          aSelectedCourseScheduled.exceptions.some(
            (scheduledCourseGong: ScheduledCourseGong) =>
              scheduledCourseGong.dayNumber === copiedCourse.dayNumber && scheduledCourseGong.time === copiedCourse.time)) {
          copiedCourse.isActive = false;
        }
        // Adding to the list
        newSelectedCourseRoutineArray.push(copiedCourse);
      });
      this.selectedCourseRoutineArray = newSelectedCourseRoutineArray;
    } else {
      console.error('couldn\'t find course name : ' + selectedCourseName);
    }
  }

  scheduleCourse() {
    const dialogRef = this.dialog.open(ScheduleCourseDialogComponent, {
      height: '70vh',
      width: '70vw',
      position: {top: '15vh'},
      data: {}
    });

    dialogRef.afterClosed().subscribe((aCourseSchedule: CourseSchedule) => {
      if (aCourseSchedule) {
        this.storeService.scheduleCourse(aCourseSchedule);
      }
    });
  }

  removeScheduledCourse() {
    const translationKeyBase = 'automaticActivation.alerts.confirmRemoveSchedule.';
    const translationKeyTitle = translationKeyBase + 'title';
    const translationKeyText = translationKeyBase + 'text';
    const translationKeyCancel = translationKeyBase + 'buttons.cancel';
    const translationKeyConfirm = translationKeyBase + 'buttons.confirm';

    this.translate.get([translationKeyTitle, translationKeyText,
      translationKeyCancel, translationKeyConfirm]).subscribe(transResult => {
      swal({
        title: transResult[translationKeyTitle],
        text: transResult[translationKeyText],
        icon: 'warning',
        dangerMode: true,
        buttons: {
          cancel: {
            text: transResult[translationKeyCancel],
            value: null,
            visible: true,
          },
          confirm: {
            text: transResult[translationKeyConfirm],
          },
        },
      })
        .then(willRemove => {
          if (willRemove && this.selectedCourseScheduled) {
            this.storeService.removeScheduledCourse(this.selectedCourseScheduled);
            this.selectedCourseScheduled = undefined;
          }
        });
    });
  }

  onGongActiveToggle(aToggledScheduledGong: ScheduledGong) {
    let toggledScheduledCourseGong: ScheduledCourseGong;
    if (aToggledScheduledGong.isActive) {
      toggledScheduledCourseGong = this.selectedCourseScheduled.findException(aToggledScheduledGong.dayNumber,
        aToggledScheduledGong.time);
    } else {
      toggledScheduledCourseGong = new ScheduledCourseGong();
      toggledScheduledCourseGong.dayNumber = aToggledScheduledGong.dayNumber;
      toggledScheduledCourseGong.time = aToggledScheduledGong.time;
    }

    if (toggledScheduledCourseGong) {
      toggledScheduledCourseGong.courseId = this.selectedCourseScheduled.id;
      this.storeService.toggleScheduledGong(toggledScheduledCourseGong);
    } else {
      console.error('onGongActiveToggle Error : couldn\'t find ScheduledCourseGong for ScheduledGong =', aToggledScheduledGong,
        'selectedCourseScheduled = ', this.selectedCourseScheduled);
    }
  }

  scrollToNextGong() {
    const firstCourseSchedule = this.coursesData[0];
    if (!firstCourseSchedule) {
      return;
    }

    if (this.selectedCourseScheduled === firstCourseSchedule) {
      this.waitToScroll = true;
      this.onGongsTableDataChangedEvent();
    } else {
      this.onRowClick(firstCourseSchedule);
      this.waitToScroll = true;
    }
  }

  onGongsTableDataChangedEvent() {
    if (this.waitToScroll) {
      const el = document.getElementById('NEXT_GONG');
      if (el) {
        el.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});
        this.waitToScroll = false;
      }
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
