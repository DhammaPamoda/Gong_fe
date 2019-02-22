import {Component, OnDestroy, OnInit} from '@angular/core';
import {CourseSchedule} from '../../model/courseSchedule';
import {NgRedux} from '@angular-redux/store';
import {Course} from '../../model/course';
import {MatDialog, MatTableDataSource} from '@angular/material';
import {ScheduledGong} from '../../model/ScheduledGong';
import {StoreDataTypeEnum} from '../../store/storeDataTypeEnum';
import {combineLatest, Subscription} from 'rxjs';
import {StoreService} from '../../services/store.service';
import {GongType} from '../../model/gongType';
import {ScheduleCourseDialogComponent} from '../../dialogs/schedule-course-dialog/schedule-course-dialog.component';

@Component({
  selector: 'app-automatic-activation',
  templateUrl: './automatic-activation.component.html',
  styleUrls: ['./automatic-activation.component.css']
})
export class AutomaticActivationComponent implements OnInit, OnDestroy {

  coursesDisplayedColumns = ['course_name', 'daysCount', 'date'];
  coursesDataSource: MatTableDataSource<CourseSchedule>;
  coursesData: CourseSchedule[] = [];
  selectedRowIndex: number = -1;

  selectedCourseRoutineArray: ScheduledGong[] = [];

  subscription: Subscription;

  constructor(private ngRedux: NgRedux<any>,
              private dialog: MatDialog,
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
      const coursesMap: { [key: string]: Course } = mergedResult[1];
      if (coursesSchedule && coursesMap) {
        this.coursesData = [];
        coursesSchedule.forEach((courseSchedule: CourseSchedule) => {
          const course = coursesMap[courseSchedule.name];
          if (course) {
            courseSchedule.daysCount = course.days;
            this.coursesData.push(courseSchedule);
          }
        });
        if (this.coursesData.length > 0) {
          this.coursesDataSource = new MatTableDataSource<CourseSchedule>(this.coursesData);
        }
      }
    });
  }

  onRowClick(row): void {
    this.selectedRowIndex = row.id;
    this.getCourseRoutine(row);
  }

  private getCourseRoutine(selectedCourseScheduled: CourseSchedule) {
    const selectedCourseStartDate = selectedCourseScheduled.date;
    const selectedCourseName = selectedCourseScheduled.name;

    this.subscription = this.storeService.getCoursesMap().subscribe(courseMap => {

      const foundCourse = courseMap[selectedCourseName];

      this.selectedCourseRoutineArray = [];
      if (foundCourse) {
        foundCourse.routine.forEach(course => {
          const copiedCourse = course.cloneForUi(selectedCourseStartDate);
          if (!copiedCourse.volume) {
            copiedCourse.volume = 100;
          }
          this.selectedCourseRoutineArray.push(copiedCourse);
        });
      } else {
        console.error('couldn\'t find course name : ' + selectedCourseName);
      }
    });
  }

  addCourse() {
    const dialogRef = this.dialog.open(ScheduleCourseDialogComponent, {
      height: '70vh',
      width: '70vw',
      position: {top: '15vh'},
      data: {}
    });

    dialogRef.afterClosed().subscribe((data: CourseSchedule) => {
      if (data) {
        this.storeService.addCourse(data);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  gongToggle() {
    return undefined;
  }
}
