import {Action} from 'redux';
import {Area} from '../../model/area';
import {Course} from '../../model/course';
import {CourseSchedule} from '../../model/courseSchedule';
import {GongType} from '../../model/gongType';
import {ScheduledGong} from '../../model/ScheduledGong';
import {BasicServerData} from '../../model/basicServerData';
import {ScheduledCourseGong} from '../../model/ScheduledCourseGong';
import {Gong} from '../../model/gong';
import {DateFormat} from '../../model/dateFormat';

export enum ActionFeaturesEnum {
  BASIC_DATA_FEATURE = '[BASIC_DATA]',
  STATIC_DATA_FEATURE = '[STATIC_DATA]',
  GONG_TYPES_FEATURE = '[GONG_TYPES]',
  AREA_FEATURE = '[AREA]',
  COURSES_FEATURE = '[COURSES]',
  COURSES_SCHEDULE_FEATURE = '[COURSES_SCHEDULE]',
  MANUAL_GONGS_LIST_FEATURE = '[MANUAL_GONGS_LIST]',
  MANUAL_GONG_ADD_FEATURE = '[MANUAL_GONG_ADD]',
  SCHEDULE_COURSE_FEATURE = '[SCHEDULE_COURSE_ADD]',
  SCHEDULED_COURSE_REMOVE_FEATURE = '[SCHEDULED_COURSE_REMOVE]',
  TOGGLE_SCHEDULED_GONG_FEATURE = '[TOGGLE_SCHEDULED_GONG]',
  REMOVE_MANUAL_GONG_FEATURE = '[REMOVE_MANUAL_GONG]',
  PLAY_GONG_FEATURE = '[PLAY_GONG_FEATURE]',
  DATE_FORMAT_FEATURE = '[DATE_FORMAT_FEATURE]',
  UPLOAD_COURSES_FILE_FEATURE = '[UPLOAD_COURSES_FILE]',
  UPLOAD_GONG_FILE_FEATURE = '[UPLOAD_GONG_FILE]',
  UPDATE_LANGUAGES_FEATURE = '[UPDATE_LANGUAGES]',
}

export enum ActionTypesEnum {
  SET_LOGGED_IN = 'SET_LOGGED_IN',
  READ_TO_STORE_DATA = 'READ_TO_STORE_DATA',
  READ_TO_STORE_STATIC_DATA = 'READ_TO_STORE_STATIC_DATA',
  STORE_STATIC_DATA_WAS_UPDATED = 'STORE_STATIC_DATA_WAS_UPDATED',
  GET_BASIC_DATA = 'GET_BASIC_DATA',
  SET_BASIC_DATA = 'SET_BASIC_DATA',
  SET_GONG_TYPES = 'SET_GONG_TYPES',
  SET_AREAS = 'SET_AREAS',
  SET_COURSES = 'SET_COURSES',
  SET_COURSES_RAW_DATA = 'SET_COURSES_RAW_DATA',
  SET_COURSES_SCHEDULE = 'SET_COURSES_SCHEDULE',
  SET_MANUAL_GONGS_LIST = 'SET_MANUAL_GONGS_LIST',
  ADD_MANUAL_GONG = 'ADD_MANUAL_GONG',
  UPDATE_MANUAL_GONG = 'UPDATE_MANUAL_GONG',
  SCHEDULE_COURSE_ADD = 'SCHEDULE_COURSE_ADD',
  SCHEDULED_COURSE_UPDATE = 'SCHEDULED_COURSE_UPDATE',
  SCHEDULED_COURSE_REMOVE = 'SCHEDULED_COURSE_REMOVE',
  TOGGLE_SCHEDULED_GONG = 'TOGGLE_SCHEDULED_GONG',
  REMOVE_MANUAL_GONG = 'REMOVE_MANUAL_GONG',
  PLAY_GONG = 'PLAY_GONG',
  SET_DATE_FORMAT = 'SET_DATE_FORMAT',
  SET_PLAY_GONG_ENABLED = 'SET_PLAY_GONG_ENABLED',
  UPLOAD_COURSES_FILE = 'UPLOAD_COURSE_FILE',
  UPLOAD_GONG_FILE = 'UPLOAD_GONG_FILE',
  UPLOAD_COURSES_FILE_WAS_COMPLETED = 'UPLOAD_COURSES_FILE_WAS_COMPLETED',
  UPLOAD_GONG_FILE_WAS_COMPLETED = 'UPLOAD_GONG_FILE_WAS_COMPLETED',
  UPDATE_LANGUAGES = 'UPDATE_LANGUAGES',
}

export interface AppAction extends Action {
  payload: any;
}

// action creators
export class ActionGenerator {
  static readToStoreData = () => ({
    type: ActionTypesEnum.READ_TO_STORE_DATA
  });

  static readToStoreStaticData = () => ({
    type: ActionTypesEnum.READ_TO_STORE_STATIC_DATA
  });

  static storeStaticDataWasUpdated = () => ({
    type: ActionTypesEnum.STORE_STATIC_DATA_WAS_UPDATED
  });

  static getBasicData = () => ({
    type: ActionTypesEnum.GET_BASIC_DATA
  });

  static setBasicServerData = (basicServerData: BasicServerData) => ({
    type: ActionTypesEnum.SET_BASIC_DATA,
    payload: basicServerData,
    meta: {feature: ActionFeaturesEnum.BASIC_DATA_FEATURE}
  });

  static setGongTypes = (gongTypes: GongType[]) => ({
    type: ActionTypesEnum.SET_GONG_TYPES,
    payload: gongTypes,
    meta: {feature: ActionFeaturesEnum.GONG_TYPES_FEATURE}
  });

  static setAreas = (areas: Area[]) => ({
    type: ActionTypesEnum.SET_AREAS,
    payload: areas,
    meta: {feature: ActionFeaturesEnum.AREA_FEATURE}
  });

  static setCourses = (courses: Course[]) => ({
    type: ActionTypesEnum.SET_COURSES,
    payload: courses,
    meta: {feature: ActionFeaturesEnum.COURSES_FEATURE}
  });

  static setCoursesRawData = (aCoursesRawData: String) => ({
    type: ActionTypesEnum.SET_COURSES_RAW_DATA,
    payload: aCoursesRawData,
    meta: {feature: ActionFeaturesEnum.COURSES_FEATURE}
  });

  static setCoursesSchedule = (coursesSchedule: CourseSchedule[]) => ({
    type: ActionTypesEnum.SET_COURSES_SCHEDULE,
    payload: coursesSchedule,
    meta: {feature: ActionFeaturesEnum.COURSES_SCHEDULE_FEATURE}
  });

  static setManualGongsList = (scheduledGongsArray: ScheduledGong[]) => ({
    type: ActionTypesEnum.SET_MANUAL_GONGS_LIST,
    payload: scheduledGongsArray,
    meta: {feature: ActionFeaturesEnum.MANUAL_GONGS_LIST_FEATURE}
  });

  static addManualGong = (manualGong: ScheduledGong) => ({
    type: ActionTypesEnum.ADD_MANUAL_GONG,
    payload: manualGong,
    meta: {feature: ActionFeaturesEnum.MANUAL_GONG_ADD_FEATURE}
  });

  static updateManualGong = (manualGong: ScheduledGong) => ({
    type: ActionTypesEnum.UPDATE_MANUAL_GONG,
    payload: manualGong,
    meta: {feature: ActionFeaturesEnum.MANUAL_GONG_ADD_FEATURE}
  });

  static scheduleCourse = (aCourseSchedule: CourseSchedule) => ({
    type: ActionTypesEnum.SCHEDULE_COURSE_ADD,
    payload: aCourseSchedule,
    meta: {feature: ActionFeaturesEnum.SCHEDULE_COURSE_FEATURE}
  });

  static updateCourseSchedule = (aCourseSchedule: CourseSchedule) => ({
    type: ActionTypesEnum.SCHEDULED_COURSE_UPDATE,
    payload: aCourseSchedule,
    meta: {feature: ActionFeaturesEnum.SCHEDULE_COURSE_FEATURE}
  });

  static removeScheduleCourse = (aCourseScheduledToRemove: CourseSchedule) => ({
    type: ActionTypesEnum.SCHEDULED_COURSE_REMOVE,
    payload: aCourseScheduledToRemove,
    meta: {feature: ActionFeaturesEnum.SCHEDULED_COURSE_REMOVE_FEATURE}
  });

  static toggleScheduledGong = (aToggledScheduledCourseGong: ScheduledCourseGong) => ({
    type: ActionTypesEnum.TOGGLE_SCHEDULED_GONG,
    payload: aToggledScheduledCourseGong,
    meta: {feature: ActionFeaturesEnum.TOGGLE_SCHEDULED_GONG_FEATURE}
  });

  static removeScheduledGong = (aRemovedScheduledGong: ScheduledGong) => ({
    type: ActionTypesEnum.REMOVE_MANUAL_GONG,
    payload: aRemovedScheduledGong,
    meta: {feature: ActionFeaturesEnum.REMOVE_MANUAL_GONG_FEATURE}
  });

  static playGong = (aGong: Gong) => ({
    type: ActionTypesEnum.PLAY_GONG,
    payload: aGong,
    meta: {feature: ActionFeaturesEnum.PLAY_GONG_FEATURE}
  });

  static setDateFormat = (aDateFormat: DateFormat) => ({
    type: ActionTypesEnum.SET_DATE_FORMAT,
    payload: aDateFormat,
    meta: {feature: ActionFeaturesEnum.DATE_FORMAT_FEATURE}
  });

  static setPlayGongEnabled = (aIsPlayGongEnabled: boolean) => ({
    type: ActionTypesEnum.SET_PLAY_GONG_ENABLED,
    payload: aIsPlayGongEnabled,
  });

  static uploadCourseFile = (aCourseFile: File) => ({
    type: ActionTypesEnum.UPLOAD_COURSES_FILE,
    payload: aCourseFile,
  });

  static uploadCourseFileHasComplete = () => ({
    type: ActionTypesEnum.UPLOAD_COURSES_FILE_WAS_COMPLETED,
  });

  static uploadGongFile = (aGongFile: File) => ({
    type: ActionTypesEnum.UPLOAD_GONG_FILE,
    payload: aGongFile,
  });

  static uploadGongFileHasComplete = () => ({
    type: ActionTypesEnum.UPLOAD_GONG_FILE_WAS_COMPLETED,
  });

  static setLoggedIn = (aIsLoggedIn: boolean) => ({
    type: ActionTypesEnum.SET_LOGGED_IN,
    payload: aIsLoggedIn,
  });


  static updateLanguages = (aLanguagesMap: any) => ({
    type: ActionTypesEnum.UPDATE_LANGUAGES,
    payload: aLanguagesMap,
  });

}
