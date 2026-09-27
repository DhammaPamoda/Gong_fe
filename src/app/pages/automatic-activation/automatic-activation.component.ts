import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';

import { Subscription } from 'rxjs';
import { first, takeUntil } from 'rxjs/operators';
import { NgRedux } from '@angular-redux/store';
import moment from 'moment';
import Swal from 'sweetalert2';

import { BaseComponent } from '../../shared/baseComponent';
import { Titles } from '../../shared/titles';
import { CourseSchedule } from '../../model/courseSchedule';
import { Course } from '../../model/course';
import { ScheduledGong } from '../../model/ScheduledGong';
import { StoreDataTypeEnum } from '../../store/storeDataTypeEnum';
import { StoreService } from '../../services/store.service';
import { ScheduleCourseDialogComponent } from '../../dialogs/schedule-course-dialog/schedule-course-dialog.component';
import { ScheduledCourseGong } from '../../model/ScheduledCourseGong';
import { DateFormat } from '../../model/dateFormat';
import { AuthService } from '../../services/auth.service';
import { GongsTimeTableComponent } from '../../components/gongs-time-table/gongs-time-table.component';

@Component({
  selector: 'app-automatic-activation',
  templateUrl: './automatic-activation.component.html',
  styleUrls: ['./automatic-activation.component.scss']
})
export class AutomaticActivationComponent extends BaseComponent {

  public titles = Titles;
  @ViewChild('timeTable', { static: false }) timeTable: GongsTimeTableComponent;

  coursesDisplayedColumns = ['course_name', 'daysCount', 'date'];
  coursesDataSource: MatTableDataSource<CourseSchedule>;
  coursesData: CourseSchedule[] = [];
  selectedCourseScheduled: CourseSchedule;

  coursesMap: Map<string, Course>;

  selectedCourseRoutineArray: ScheduledGong[] = [];

  displayDate: boolean = false;

  waitToScroll: boolean = false;

  dateFormat: DateFormat;

  loggedInRole: string;
  scheduleCoursePermissions: boolean;
  toggleGongPermissions: boolean;
  removeScheduledCoursePermissions: boolean;


  constructor(private ngRedux: NgRedux<any>,
    private authService: AuthService,
    private dialog: MatDialog,
    private storeService: StoreService) {
    super();
  }

  protected listenForUpdates() {

    // Permissions
    this.loggedInRole = this.authService.getRole();

    this.authService.hasPermission('schedule_course')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.scheduleCoursePermissions = isPermitted);

    this.authService.hasPermission('control_active_gong_on_scheduled_course')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.toggleGongPermissions = isPermitted);

    this.authService.hasPermission('remove_scheduled_course')
      .pipe(takeUntil(this.onDestroy$))
      .subscribe((isPermitted) => this.removeScheduledCoursePermissions = isPermitted);

    // Date format
    this.storeService.getDateFormat()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(dateFormat => this.dateFormat = dateFormat.convertToDateFormatter());

    // Courses
    this.storeService.getCoursesMap()
      .pipe(takeUntil(this.onDestroy$))
      .subscribe(coursesMap => {
        this.coursesMap = coursesMap;

        this.ngRedux.select<CourseSchedule[]>([StoreDataTypeEnum.DYNAMIC_DATA, 'coursesSchedule'])
          .pipe(takeUntil(this.onDestroy$))
          .subscribe((coursesSchedule: CourseSchedule[]) => {
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
              this.coursesDataSource = new MatTableDataSource<CourseSchedule>(this.coursesData);
              if (this.selectedCourseScheduled) {
                this.selectedCourseScheduled = this.coursesData.find(
                  (courseSchedule: CourseSchedule) => courseSchedule.id === this.selectedCourseScheduled.id)!;
                if (this.selectedCourseScheduled) {
                  this.getCourseRoutine(this.selectedCourseScheduled);
                }
              }
            }
          });
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
      foundCourse.routine.forEach(scheduledGong => {
        // If start the course from day other than 0 -> disregarding this record
        if (aSelectedCourseScheduled.startFromDay > scheduledGong.dayNumber) {
          return;
        }

        const copiedScheduledGong = scheduledGong.cloneForUi(selectedCourseStartDate, aSelectedCourseScheduled.startFromDay);
        let scheduledGongArray = Array.of(copiedScheduledGong);
        if (foundCourse.isTest) {
          scheduledGongArray = copiedScheduledGong.cloneAsTestToArray(aSelectedCourseScheduled.testHoursRange);
        }
        scheduledGongArray.forEach((scheduledGongItem) => {
          if (!scheduledGongItem.volume) {
            scheduledGongItem.volume = 100;
          }
          // Dealing with Active/InActive
          const currentMoment = moment();
          scheduledGongItem.isActive = scheduledGongItem.exactMoment.isSameOrAfter(currentMoment);

          // exceptions store time-of-day only; scheduledGongItem.time is a total offset
          const MS_IN_DAY = 24 * 60 * 60 * 1000;
          if (aSelectedCourseScheduled.exceptions &&
            aSelectedCourseScheduled.exceptions.some(
              (scheduledCourseGong: ScheduledCourseGong) =>
                scheduledCourseGong.dayNumber === scheduledGongItem.dayNumber &&
                scheduledCourseGong.time === (scheduledGongItem.time % MS_IN_DAY))) {
            scheduledGongItem.isActive = false;
          }
          // Adding to the list
          newSelectedCourseRoutineArray.push(scheduledGongItem);
        });
      });
      newSelectedCourseRoutineArray.sort((a, b) => a.exactMoment.valueOf() - b.exactMoment.valueOf());
      // this.debugLogForRoutineArray(newSelectedCourseRoutineArray);
      this.selectedCourseRoutineArray = newSelectedCourseRoutineArray;
    } else {
      console.error('couldn\'t find course name : ' + selectedCourseName);
    }
  }

  scheduleCourse() {
    const dialogRef = this.dialog.open(ScheduleCourseDialogComponent, {
      height: '50vh',
      width: '70vw',
      panelClass: 'schedule-course-dialog',
      position: { top: '15vh' },
      data: { role: this.loggedInRole }
    });

    dialogRef.afterClosed().pipe(first()).subscribe((aCourseSchedule: CourseSchedule) => {
      if (aCourseSchedule) {
        this.storeService.scheduleCourse(aCourseSchedule);
        this.selectedCourseScheduled = aCourseSchedule.clone();
        this.selectedCourseScheduled.id = moment(aCourseSchedule.date).startOf('d').valueOf();
      }
    });
  }

  removeScheduledCourse() {
    Swal.fire({
      title: this.titles.automaticActivation.alerts.confirmRemoveSchedule.title,
      text: this.titles.automaticActivation.alerts.confirmRemoveSchedule.text,
      icon: 'warning',
      confirmButtonText: this.titles.automaticActivation.alerts.confirmRemoveSchedule.buttons.confirm,
      showCancelButton: true,
      cancelButtonText: this.titles.automaticActivation.alerts.confirmRemoveSchedule.buttons.cancel,
    })
      .then(result => {
        if (result.value && this.selectedCourseScheduled) {
          this.storeService.removeScheduledCourse(this.selectedCourseScheduled);
          this.selectedCourseRoutineArray = [];
          this.selectedCourseScheduled = undefined;
        }
      });
  }

  onGongActiveToggle(aToggledScheduledGong: ScheduledGong) {
    let toggledScheduledCourseGong: ScheduledCourseGong;
    // Backend ExceptionGong expects time-of-day only (NOT total course offset).
    // scheduledGong.time is a total offset (dayOffset + timeOfDay), so strip the day portion.
    const MS_IN_DAY = 24 * 60 * 60 * 1000;
    const timeOfDay = aToggledScheduledGong.time % MS_IN_DAY;

    if (aToggledScheduledGong.isActive) {
      // Gong is now active → find the existing exception to remove it
      toggledScheduledCourseGong = this.selectedCourseScheduled.findException(aToggledScheduledGong.dayNumber,
        timeOfDay);
    } else {
      // Gong is now inactive → create a new exception to deactivate it
      toggledScheduledCourseGong = new ScheduledCourseGong();
      toggledScheduledCourseGong.dayNumber = aToggledScheduledGong.dayNumber;
      toggledScheduledCourseGong.time = timeOfDay;
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
      this.timeTable.scrollToNextGong();
    } else {
      this.onRowClick(firstCourseSchedule);
      this.waitToScroll = true;
    }
  }

  onGongsTableDataChangedEvent() {
    if (this.waitToScroll) {
      this.timeTable.scrollToNextGong();
      this.waitToScroll = false;
    } else {
      const el = document.getElementById('FIRST_GONG');
      if (el) {
        el.parentElement.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'start' });
      }
    }
  }

  private debugLogForRoutineArray(aRoutineArray: ScheduledGong[]) {
    aRoutineArray.forEach((scheduledGong) => {
      console.log(scheduledGong.dayNumber, scheduledGong.exactMoment.format('YY-MM-DD HH:mm'));
    });
  }
}
