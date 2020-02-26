import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {NgRedux} from '@angular-redux/store';

import {filter, first} from 'rxjs/operators';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {TranslateService} from '@ngx-translate/core';
import * as _ from 'lodash';

import {ActionGenerator} from '../store/actions/action';

import {Area} from '../model/area';
import {StoreDataTypeEnum} from '../store/storeDataTypeEnum';
import {GongType} from '../model/gongType';
import {Course} from '../model/course';
import {ScheduledGong} from '../model/ScheduledGong';
import {CourseSchedule} from '../model/courseSchedule';
import {ScheduledCourseGong} from '../model/ScheduledCourseGong';
import {Gong} from '../model/gong';
import {DateFormat} from '../model/dateFormat';
import {BasicServerData} from '../model/basicServerData';
import {IObjectMap} from '../model/store-model';
import {ETopic, ITopicData} from '../model/topics-model';
import {User} from '../model/user';

@Injectable({
  providedIn: 'root'
})
export class StoreService implements OnInit, OnDestroy {

  private areasMapObservable: BehaviorSubject<Area[]> = new BehaviorSubject<Area[]>([]);
  private gongTypesMapObservable: BehaviorSubject<IObjectMap<GongType>> = new BehaviorSubject<IObjectMap<GongType>>({});
  private coursesMapObservableObsolete: BehaviorSubject<IObjectMap<Course>> = new BehaviorSubject<IObjectMap<Course>>({});
  private coursesMapObservable: BehaviorSubject<Map<string, Course>> = new BehaviorSubject<Map<string, Course>>(null);

  areasMap: Area[] = [];
  gongTypesMap: IObjectMap<GongType> = {};
  coursesMapObsolete: IObjectMap<Course> = {};
  coursesMap: Map<string, Course>;

  subscriptionsArray: Subscription[] = [];

  courseScheduleArray: CourseSchedule[];
  isCourseScheduleArrayEnhanced: boolean;

  constructor(private ngRedux: NgRedux<any>,
              private translateService: TranslateService) {
    this.populateAreasMap();
    this.populateGongTypesMap();
    this.populateGongTypeCoursesMap();
    this.populateScheduledCoursesArray();
  }

  ngOnInit(): void {
  }

  private populateAreasMap() {
    const areaSubscription =
      this.ngRedux.select<Area[]>([StoreDataTypeEnum.STATIC_DATA, 'areas']).subscribe((areaArry: Area[]) => {
        if (areaArry && areaArry.length > 0) {
          this.areasMap = [];
          areaArry.forEach((area: Area) => {
            this.translateService.get('general.typesValues.areas.' + area.name).subscribe(areaTrans => {
              area.translation = areaTrans;
            });
            this.areasMap[area.id] = area;
          });
        }
        this.areasMapObservable.next(this.areasMap);
      });

    this.subscriptionsArray.push(areaSubscription);
  }

  private populateGongTypesMap() {
    const gongTypeSubscription =
      this.ngRedux.select<GongType[]>([StoreDataTypeEnum.STATIC_DATA, 'gongTypes'])
        .subscribe((gongTypes: GongType[]) => {
          if (gongTypes && gongTypes.length > 0) {
            this.gongTypesMap = {};
            gongTypes.forEach((gongType: GongType) => {
              this.gongTypesMap[gongType.id] = gongType;
            });
          }
          this.gongTypesMapObservable.next(this.gongTypesMap);
        });

    this.subscriptionsArray.push(gongTypeSubscription);
  }

  private populateGongTypeCoursesMap() {
    const coursesSubscription =
      this.ngRedux.select<Course[]>([StoreDataTypeEnum.STATIC_DATA, 'courses'])
        .subscribe((courses: Course[]) => {
          if (courses && courses.length > 0) {
            this.coursesMapObsolete = {};
            this.coursesMap = new Map();
            courses.forEach((course: Course) => {
              this.coursesMapObsolete[course.name] = course;
              this.coursesMap.set(course.name, course);
            });
          }
          this.coursesMapObservableObsolete.next(this.coursesMapObsolete);
          this.coursesMapObservable.next(this.coursesMap);
        });

    this.subscriptionsArray.push(coursesSubscription);
  }

  private populateScheduledCoursesArray() {
    const coursesSubscription =
      this.ngRedux.select<CourseSchedule[]>([StoreDataTypeEnum.DYNAMIC_DATA, 'coursesSchedule'])
        .subscribe((courseScheduleArray: CourseSchedule[]) => {
          this.isCourseScheduleArrayEnhanced = false;
          this.courseScheduleArray = courseScheduleArray;
        });

    this.subscriptionsArray.push(coursesSubscription);
  }

  readToStore() {
    this.ngRedux.dispatch(ActionGenerator.readToStoreData());
  }

  getAreasMap(): Observable<Area[]> {
    return this.areasMapObservable;
  }

  getGongTypesMap(): Observable<IObjectMap<GongType>> {
    return this.gongTypesMapObservable;
  }

  getCoursesMapObsolete(): Observable<{ [key: string]: Course }> {
    return this.coursesMapObservableObsolete;
  }

  getCoursesMap(): Observable<Map<string, Course>> {
    return this.coursesMapObservable;
  }

  async getAreasMapAsync(): Promise<Area[]> {
    return await this.areasMapObservable.toPromise();
  }

  async getGongTypesMapAsync(): Promise<IObjectMap<GongType>> {
    return await this.gongTypesMapObservable.toPromise();
  }

  getCoursesMapSync(): Map<string, Course> {
    return this.coursesMap;
  }

  getCoursesMapPromise(): Promise<Map<string, Course>> {
    return this.coursesMapObservable.pipe(
      filter(res => !!res),
      first()).toPromise();
  }

  getCourseScheduleArraySync(): CourseSchedule[] {
    this.enhanceCourseScheduleArray();
    return this.courseScheduleArray;
  }

  addManualGong(gongToPlay: ScheduledGong) {
    this.ngRedux.dispatch(ActionGenerator.addManualGong(gongToPlay));
  }

  getBasicData() {
    this.ngRedux.dispatch(ActionGenerator.getBasicData());
  }

  scheduleCourse(aCourseSchedule: CourseSchedule) {
    this.ngRedux.dispatch(ActionGenerator.scheduleCourse(aCourseSchedule));
  }

  removeScheduledCourse(aCourseScheduledToRemove: CourseSchedule) {
    this.ngRedux.dispatch(ActionGenerator.removeScheduleCourse(aCourseScheduledToRemove));
  }

  toggleScheduledGong(aScheduledCourseGong: ScheduledCourseGong) {
    this.ngRedux.dispatch(ActionGenerator.toggleScheduledGong(aScheduledCourseGong));
  }

  removeScheduledGong(a2BRemovedScheduledGong: ScheduledGong) {
    this.ngRedux.dispatch(ActionGenerator.removeScheduledGong(a2BRemovedScheduledGong));
  }

  private enhanceCourseScheduleArray() {
    if (!this.isCourseScheduleArrayEnhanced) {
      this.courseScheduleArray.forEach((courseSchedule: CourseSchedule) => {
        courseSchedule.daysCount = this.coursesMap.get(courseSchedule.name).days;
      });
      this.isCourseScheduleArrayEnhanced = true;
    }
  }

  getDateFormat(): Observable<DateFormat> {
    return this.ngRedux.select<DateFormat>([StoreDataTypeEnum.INNER_DATA, 'dateFormat']);
  }

  setDateFormat(aDateFormat: DateFormat) {
    this.ngRedux.dispatch(ActionGenerator.setDateFormat(aDateFormat));
  }

  getPlayGongEnabled(): Observable<boolean> {
    return this.ngRedux.select<boolean>([StoreDataTypeEnum.INNER_DATA, 'gongPlayEnabled']);
  }


  playGong(aGongToPlay: Gong) {
    this.ngRedux.dispatch(ActionGenerator.playGong(aGongToPlay));
  }

  ngOnDestroy(): void {
    this.subscriptionsArray.forEach(subscription => subscription.unsubscribe());
    console.log('c1');
  }

  uploadCourseFile(aCourseFile: File) {
    this.ngRedux.dispatch(ActionGenerator.uploadCourseFile(aCourseFile));
  }

  uploadGongFile(aGongFile: File) {
    this.ngRedux.dispatch(ActionGenerator.uploadGongFile(aGongFile));
  }

  downloadCourses(aCoursesNamesArray: string[]) {
    const coursesRawData = _.get(this.ngRedux.getState(), [StoreDataTypeEnum.STATIC_DATA, 'coursesRawData']);
    const courses = Array.from(JSON.parse(coursesRawData));
    const filteredCurses = courses.filter((course) => aCoursesNamesArray.includes(_.get(course, 'course_name')));
    const blob = new Blob([JSON.stringify(filteredCurses)], {type: 'text/json'});
    const url = window.URL.createObjectURL(blob);
    // window.open(url);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'courses.json';
    // this is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, view: window}));

    setTimeout(function () {
      // For Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(url);
      link.remove();
    }, 100);

  }

  getTopicsData(aTopic: ETopic, aRole: string, aCheckIfUsed: boolean): ITopicData[] {
    let rawDataArray: any[] = [];
    let retTopicsDataArray: ITopicData[] = [];
    switch (aTopic) {
      case ETopic.COURSE:
        rawDataArray = this.getCourses(aRole);
        retTopicsDataArray = rawDataArray.map((course: Course) => ({
          id: course.name,
          name: course.name,
          inUse: aCheckIfUsed && this.courseScheduleArray.some(courseSchedule => courseSchedule.name === course.name)
        }));
        break;
      case ETopic.GONG:
        rawDataArray = this.getGongs();
        retTopicsDataArray = rawDataArray.map(gong => ({
          id: gong.id.toString(10),
          name: gong.name,
          inUse: aCheckIfUsed && Array.from(this.coursesMap.values()).some(course => course.isGongTypeInCourse(gong))
        }));
        break;
    }
    return retTopicsDataArray;
  }

  getGongs(): GongType[] {
    const gongsArray = Array.from(Object.values(this.gongTypesMap));
    return gongsArray;
  }

  getCourses(a4Role: String): Course[] {
    let coursesArray = Array.from(this.coursesMap.values());
    if (a4Role !== 'dev') {
      coursesArray = coursesArray.filter((course) => !course.isTest && !course.name.toLowerCase().includes('test'));
    }
    return coursesArray;
  }

  getCoursesNames(a4Role: String): string[] {
    const coursesArray = this.getCourses(a4Role);
    const coursesNamesArray = coursesArray.map((course) => course.name);
    return coursesNamesArray;
  }

  getIsLoggedIn(): boolean {
    const isLoggedIn = _.get(this.ngRedux.getState(), [StoreDataTypeEnum.INNER_DATA, 'isLoggedIn']) as boolean;
    return isLoggedIn;
  }

  setLoggedIn(aIsLoggedIn: boolean) {
    this.ngRedux.dispatch(ActionGenerator.setLoggedIn(aIsLoggedIn));
  }

  getBasicServerDataPromise(): Promise<BasicServerData> {
    return this.ngRedux.select<BasicServerData>([StoreDataTypeEnum.DYNAMIC_DATA, 'basicServerData'])
      .pipe(
        filter(res => !!res),
        first()).toPromise();

  }

  deleteCourse(aCourseName: string) {

  }

  getLastGongTopicData(): ITopicData {
    const gongTypesArray = Object.values(this.gongTypesMap);
    if (gongTypesArray.length > 0) {
      const lastGong = gongTypesArray[gongTypesArray.length - 1];
      const inUse = Array.from(this.coursesMap.values()).some(course => course.isGongTypeInCourse(lastGong));
      return {id: lastGong.id.toString(10), name: lastGong.name, inUse};
    } else {
      return undefined;
    }
  }

  deleteGong(aGongTopicData: ITopicData) {

  }

  getUsersArray() {
    this.ngRedux.dispatch(ActionGenerator.getUsersArray());
  }

  getRolesArray(): string[] {
    // TODO ********
    return ['admin', 'teacher', 'dw'];
  }

  getExistingUsersIdsArray() {
    // TODO ********
    return ['admin', 'dev'];
  }

  addUser(aUser: User) {
    this.ngRedux.dispatch(ActionGenerator.addUser(aUser));
  }

  deleteUser(aSelectedUser4Delete: User) {
    this.ngRedux.dispatch(ActionGenerator.deleteUser(aSelectedUser4Delete));
  }
}
