import {Injectable} from '@angular/core';
import {Router} from '@angular/router';

import * as _ from 'lodash';
import moment from 'moment';

import {AngularJsonClassConverterService} from 'angular-json-class-converter';
import {API_ERROR, API_SUCCESS, apiMockSuccess, apiRequest} from '../../actions/api.actions';

import {ActionFeaturesEnum, ActionGenerator, ActionTypesEnum} from '../../actions/action';
import {Area} from '../../../model/area';
import {CourseSchedule} from '../../../model/courseSchedule';
import {Course} from '../../../model/course';
import {GongType} from '../../../model/gongType';
import {UpdateStatusEnum} from '../../../model/updateStatusEnum';
import {ScheduledGong} from '../../../model/ScheduledGong';
import {BasicServerData} from '../../../model/basicServerData';
import {ScheduledCourseGong} from '../../../model/ScheduledCourseGong';
import {MessagesService} from '../../../services/messages.service';
import {DateFormat} from '../../../model/dateFormat';
import {AuthService} from '../../../services/auth.service';
import {DbObjectTypeEnum, IndexedDbService} from '../../../shared/indexed-db.service';
import {StoreService} from '../../../services/store.service';
import {User} from '../../../model/user';
import {Permission} from '../../../model/permission';


const BASIC_URL = 'api/';
const GET_STATIC_DATA_URL = `${BASIC_URL}data/staticData`;
const GONG_TYPES_URL = `${BASIC_URL}data/gongTypes`;
const AREA_URL = `${BASIC_URL}data/areas`;
const COURSES_URL = `${BASIC_URL}data/courses`;
const COURSES_SCHEDULE_URL = `${BASIC_URL}data/coursesSchedule`;
const ADD_COURSE_SCHEDULE_URL = `${BASIC_URL}data/coursesSchedule/add`;
const REMOVE_COURSE_SCHEDULE_URL = `${BASIC_URL}data/coursesSchedule/remove`;
const GET_MANUAL_GONGS_URL = `${BASIC_URL}data/gongs/list`;
const ADD_MANUAL_GONG_URL = `${BASIC_URL}data/gong/add`;
const TOGGLE_SCHEDULED_GONG_URL = `${BASIC_URL}data/gong/toggle`;
const REMOVE_SCHEDULED_GONG_URL = `${BASIC_URL}data/gong/remove`;
const GET_BASIC_DATA_URL = `${BASIC_URL}nextgong`;
const PLAY_GONG_URL = `${BASIC_URL}relay/playGong`;
const UPLOAD_COURSES_URL = `${BASIC_URL}data/course/uploadCourses`;
const UPLOAD_GONG_URL = `${BASIC_URL}data/gong/upload`;
const DELETE_GONG_URL = `${BASIC_URL}data/gong/deleteFile`;
const DELETE_COURSE_URL = `${BASIC_URL}data/course/remove`;
const UPDATE_LANGUAGES_URL = `${BASIC_URL}data/languagesUpdate`;
const GET_USERS_URL = `${BASIC_URL}data/users/list`;
const ADD_USER_URL = `${BASIC_URL}data/user/add`;
const DELETE_USER_URL = `${BASIC_URL}data/user/remove`;
const UPDATE_USER_URL = `${BASIC_URL}data/user/update`;
const RESET_USER_PASSWORD_URL = `${BASIC_URL}data/user/resetPassword`;
const UPDATE_PERMISSIONS_URL = `${BASIC_URL}data/permissions/update`;

@Injectable()
export class GeneralMiddlewareService {
  constructor(private jsonConverterService: AngularJsonClassConverterService,
              private authService: AuthService,
              private storeService: StoreService,
              private router: Router,
              private indexedDbService: IndexedDbService,
              private messagesService: MessagesService) {
  }

  generalMiddleware = ({getState, dispatch}) => (next) => (action) => {
    next(action);

    switch (action.type) {
      case ActionTypesEnum.READ_TO_STORE_DATA:
        dispatch(
          ActionGenerator.readToStoreStaticData()
        );

        next(
          apiRequest(null, 'GET', COURSES_SCHEDULE_URL, ActionFeaturesEnum.COURSES_SCHEDULE_FEATURE, null)
        );
        next(
          apiRequest(null, 'GET', GET_MANUAL_GONGS_URL, ActionFeaturesEnum.MANUAL_GONGS_LIST_FEATURE, null)
        );
        next(ActionGenerator.setPlayGongEnabled(true));
        break;
      case ActionTypesEnum.READ_TO_STORE_STATIC_DATA:
        // load data from indexedDB
        let promise;
        let promiseArray: Promise<any>[] = [];

        promise = this.indexedDbService.getAllStoredDataRecords(DbObjectTypeEnum.AREAS).then((pAreasJson) => {
          dispatch(apiMockSuccess(pAreasJson, ActionFeaturesEnum.AREA_FEATURE, null));
        });
        promiseArray.push(promise);

        promise = this.indexedDbService.getAllStoredDataRecords(DbObjectTypeEnum.COURSES).then((pCoursesJson) => {
          dispatch(apiMockSuccess(pCoursesJson, ActionFeaturesEnum.COURSES_FEATURE, null));
        });
        promiseArray.push(promise);

        promise = this.indexedDbService.getAllStoredDataRecords(DbObjectTypeEnum.GONGS).then((pGongTypesJson) => {
          dispatch(apiMockSuccess(pGongTypesJson, ActionFeaturesEnum.GONG_TYPES_FEATURE, null));
        });
        promiseArray.push(promise);

        promise = this.indexedDbService.getAllStoredDataRecords(DbObjectTypeEnum.PERMISSIONS).then((pPermissionsJson) => {
          dispatch(apiMockSuccess(pPermissionsJson, ActionFeaturesEnum.PERMISSIONS_FEATURE, null));
        });
        promiseArray.push(promise);

        Promise.all(promiseArray)
          .then(() => next(ActionGenerator.storeStaticDataWasUpdated()))
          .catch(error =>
            console.error(`GeneralMiddlewareService:${ActionTypesEnum.READ_TO_STORE_STATIC_DATA}` + '' +
              'Error in  processing API middleware : ', error));

        break;
      case `${ActionFeaturesEnum.GONG_TYPES_FEATURE} ${API_SUCCESS}`:
        const gongsTypesArray = this.jsonConverterService.convert<GongType>(action.payload.data, 'GongType');
        next(
          ActionGenerator.setGongTypes(gongsTypesArray)
        );
        break;
      case `${ActionFeaturesEnum.AREA_FEATURE} ${API_SUCCESS}`:
        const areasArray = this.jsonConverterService.convert<Area>(action.payload.data, 'Area');
        next(
          ActionGenerator.setAreas(areasArray)
        );
        break;
      case `${ActionFeaturesEnum.COURSES_FEATURE} ${API_SUCCESS}`:
        const coursesArray = this.jsonConverterService.convert<Course>(action.payload.data, 'Course');
        next(
          ActionGenerator.setCourses(coursesArray)
        );
        next(
          ActionGenerator.setCoursesRawData(JSON.stringify(action.payload.data))
        );
        break;
      case `${ActionFeaturesEnum.PERMISSIONS_FEATURE} ${API_SUCCESS}`:
        const permissionsArray = this.jsonConverterService.convert<Permission>(action.payload.data, 'Permission');
        next(
          ActionGenerator.setPermissions(permissionsArray)
        );
        break;
      case `${ActionFeaturesEnum.COURSES_SCHEDULE_FEATURE} ${API_SUCCESS}`:
        const courseScheduleArray = this.jsonConverterService.convert<CourseSchedule>(
          action.payload.data, 'CourseSchedule');
        next(
          ActionGenerator.setCoursesSchedule(courseScheduleArray)
        );
        break;
      case `${ActionFeaturesEnum.MANUAL_GONGS_LIST_FEATURE} ${API_SUCCESS}`:
        const scheduledGongsArray = this.jsonConverterService.convert<ScheduledGong>(
          action.payload.data, 'ScheduledGong');
        next(
          ActionGenerator.setManualGongsList(scheduledGongsArray)
        );
        break;
      case ActionTypesEnum.GET_BASIC_DATA:
        console.log('🔍 GET_BASIC_DATA action triggered, source:', action.data);
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE, action.data)
        );
        const bypassRefreshDateFormat = _.get(action.data, ['bypassRefreshDateFormat']) as boolean;
        if (!bypassRefreshDateFormat) {
          const localStorageDateFormatStrigified = localStorage.getItem('date_format');
          if (localStorageDateFormatStrigified) {
            const localStorageDateFormatParsed = JSON.parse(localStorageDateFormatStrigified);
            const localStorageDateFormat =
              this.jsonConverterService.convertOneObject<DateFormat>(localStorageDateFormatParsed, 'DateFormat');
            next(
              ActionGenerator.setDateFormat(localStorageDateFormat)
            );
          }
        }
        break;
      case `${ActionFeaturesEnum.BASIC_DATA_FEATURE} ${API_SUCCESS}`:
        console.log('🔍 Basic data received:', action.payload.data);
        const basicServerData = this.jsonConverterService.convertOneObject<BasicServerData>(
          action.payload.data, 'BasicServerData');
        console.log('🔍 Converted basicServerData:', basicServerData);
        next(
          ActionGenerator.setBasicServerData(basicServerData)
        );
        const newlyLastUpdateTime = this.needToUpdateStaticData(basicServerData);
        if (newlyLastUpdateTime) {
          dispatch(
            apiRequest(null, 'GET', GET_STATIC_DATA_URL, ActionFeaturesEnum.STATIC_DATA_FEATURE
              , newlyLastUpdateTime)
          );
        }
        break;
      case `${ActionFeaturesEnum.STATIC_DATA_FEATURE} ${API_SUCCESS}`:
        localStorage.setItem('static_update_time', action.data);
        this.indexedDbService.clearAllStaticData().then(() => {
          promiseArray = [];
          const staticData = _.get(action, ['payload', 'data']);

          const languagesJson = _.get(staticData, 'languages');
          promise = this.indexedDbService.saveDataArray2DB(DbObjectTypeEnum.LANGUAGES, languagesJson
            , (val) => val.translation, (val) => val.language);
          promiseArray.push(promise);

          const areasJson = _.get(staticData, 'areas');
          promise = this.indexedDbService.saveDataArray2DB(DbObjectTypeEnum.AREAS, areasJson);
          promiseArray.push(promise);

          const gongTypesJson = _.get(staticData, 'gongTypes');
          promise = this.indexedDbService.saveDataArray2DB(DbObjectTypeEnum.GONGS, gongTypesJson);
          promiseArray.push(promise);

          const coursesJson = _.get(staticData, 'courses');
          promise = this.indexedDbService.saveDataArray2DB(DbObjectTypeEnum.COURSES, coursesJson, undefined
            , (val) => val.course_name);
          promiseArray.push(promise);

          const permissionsJson = _.get(staticData, 'permissions');
          promise = this.indexedDbService.saveDataArray2DB(DbObjectTypeEnum.PERMISSIONS, permissionsJson, undefined
            , (val) => val.action);
          promiseArray.push(promise);

          Promise.all(promiseArray)
            .then(() => dispatch(ActionGenerator.readToStoreStaticData()))
            .catch(error =>
              console.error(`GeneralMiddlewareService:${ActionFeaturesEnum.STATIC_DATA_FEATURE} ${API_SUCCESS}` + '' +
                'Error in  processing API middleware : ', error));
        });
        break;
      case ActionTypesEnum.UPDATE_LANGUAGES:
        const stringedifiedLanguagesJson = JSON.stringify(action.payload);
        next(
          apiRequest(stringedifiedLanguagesJson, 'POST', UPDATE_LANGUAGES_URL,
            ActionFeaturesEnum.UPDATE_LANGUAGES_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.UPDATE_LANGUAGES_FEATURE} ${API_SUCCESS}`:
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true}));
        break;
      case ActionTypesEnum.ADD_MANUAL_GONG:
        const manualGongJson = this.jsonConverterService.convertToJson(action.payload);
        const stringedifiedManualGongJson = JSON.stringify(manualGongJson);
        next(
          apiRequest(stringedifiedManualGongJson, 'POST', ADD_MANUAL_GONG_URL,
            ActionFeaturesEnum.MANUAL_GONG_ADD_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.MANUAL_GONG_ADD_FEATURE} ${API_SUCCESS}`:
        (action.data as ScheduledGong).updateStatus =
          action.payload.data === 'SUCCESS' ? UpdateStatusEnum.SUCCESS : UpdateStatusEnum.FAILED;
        next(
          ActionGenerator.updateManualGong(action.data)
        );
        dispatch(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true})
        );
        break;
      case `${ActionFeaturesEnum.MANUAL_GONG_ADD_FEATURE} ${API_ERROR}`:
        (action.data as ScheduledGong).updateStatus = UpdateStatusEnum.FAILED;
        next(
          ActionGenerator.updateManualGong(action.data)
        );
        break;
      case ActionTypesEnum.SCHEDULE_COURSE_ADD:
        const courseSchedule = this.jsonConverterService.convertToJson(action.payload);
        const stringedifiedCourseScheduleJson = JSON.stringify(courseSchedule);
        next(
          apiRequest(stringedifiedCourseScheduleJson, 'POST',
            ADD_COURSE_SCHEDULE_URL, ActionFeaturesEnum.SCHEDULE_COURSE_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.SCHEDULE_COURSE_FEATURE} ${API_SUCCESS}`:
        const oldCourseSchedule = action.data as CourseSchedule;
        const addedCourseSchedule = this.jsonConverterService.convertOneObject<CourseSchedule>(
          action.payload.data, 'CourseSchedule');
        addedCourseSchedule.tmpId = oldCourseSchedule.tmpId;
        addedCourseSchedule.updateStatus = UpdateStatusEnum.SUCCESS;
        next(
          ActionGenerator.updateCourseSchedule(addedCourseSchedule)
        );
        // Refresh basic data to update next gong after course scheduling
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true}));
        break;
      case `${ActionFeaturesEnum.SCHEDULE_COURSE_FEATURE} ${API_ERROR}`:
        const newCourseSchedule = (action.data as CourseSchedule).clone();
        newCourseSchedule.updateStatus = UpdateStatusEnum.FAILED;
        next(
          ActionGenerator.updateCourseSchedule(newCourseSchedule)
        );
        break;
      case ActionTypesEnum.SCHEDULED_COURSE_REMOVE:
        console.log('🔍 SCHEDULED_COURSE_REMOVE action triggered');
        const courseScheduleForRemoval = this.jsonConverterService.convertToJson(action.payload);
        const stringedifiedCourseScheduleForRemovalJson = JSON.stringify(courseScheduleForRemoval);
        next(
          apiRequest(stringedifiedCourseScheduleForRemovalJson, 'DELETE', REMOVE_COURSE_SCHEDULE_URL,
            ActionFeaturesEnum.SCHEDULED_COURSE_REMOVE_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.SCHEDULED_COURSE_REMOVE_FEATURE} ${API_SUCCESS}`:
        console.log('🔍 Course schedule removal successful, refreshing basic data...');
        // Refresh basic data after a short delay to ensure backend has processed the removal
        setTimeout(() => {
          dispatch(
            apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
              , {bypassRefreshDateFormat: true})
          );
        }, 500);
        break;
      case ActionTypesEnum.TOGGLE_SCHEDULED_GONG:
        const scheduledCourseGongJson = this.jsonConverterService.convertToJson(action.payload);
        const stringedifiedScheduledCourseGongJsonJson = JSON.stringify(scheduledCourseGongJson);
        next(
          apiRequest(stringedifiedScheduledCourseGongJsonJson, 'POST', TOGGLE_SCHEDULED_GONG_URL,
            ActionFeaturesEnum.TOGGLE_SCHEDULED_GONG_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.TOGGLE_SCHEDULED_GONG_FEATURE} ${API_SUCCESS}`:
        const aToggledScheduledCourseGong = action.data as ScheduledCourseGong;
        next(
          apiRequest(null, 'GET', COURSES_SCHEDULE_URL, ActionFeaturesEnum.COURSES_SCHEDULE_FEATURE, null)
        );
        const currentState = getState();
        const foundCourseSchedule = currentState.dynamic_data.coursesSchedule.find(
          (tCourseSchedule: CourseSchedule) => tCourseSchedule.id === aToggledScheduledCourseGong.courseId);
        if (foundCourseSchedule) {
          const computedMomentOfGong = moment(foundCourseSchedule.date);
          computedMomentOfGong.add(aToggledScheduledCourseGong.dayNumber, 'd');
          computedMomentOfGong.add(aToggledScheduledCourseGong.time, 'ms');
          if (computedMomentOfGong.isSame(currentState.dynamic_data.basicServerData.nextScheduledJobTime)) {
            dispatch(ActionGenerator.getBasicData());
          }
        } else {
          console.error(`GeneralMiddlewareService:${ActionFeaturesEnum.TOGGLE_SCHEDULED_GONG_FEATURE} ${API_SUCCESS}` + '' +
            'Error in  processing API middleware : ', action);

        }
        break;
      case ActionTypesEnum.REMOVE_MANUAL_GONG:
        const toBRemovedScheduledGongJson = this.jsonConverterService.convertToJson(action.payload);
        const stringedified2BRemovedScheduledGongJson = JSON.stringify(toBRemovedScheduledGongJson);
        next(
          apiRequest(stringedified2BRemovedScheduledGongJson, 'POST', REMOVE_SCHEDULED_GONG_URL,
            ActionFeaturesEnum.REMOVE_MANUAL_GONG_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.REMOVE_MANUAL_GONG_FEATURE} ${API_ERROR}`:
        this.messagesService.cannotDeleteRecord(action.data);
        dispatch(
          apiRequest(null, 'GET', GET_MANUAL_GONGS_URL, ActionFeaturesEnum.MANUAL_GONGS_LIST_FEATURE, null)
        );
        break;
      case ActionTypesEnum.PLAY_GONG:
        next(ActionGenerator.setPlayGongEnabled(false));
        const toBPlayedGongJson = this.jsonConverterService.convertToJson(action.payload);
        const stringedified2PlayedGongJson = JSON.stringify(toBPlayedGongJson);
        next(
          apiRequest(stringedified2PlayedGongJson, 'POST', PLAY_GONG_URL,
            ActionFeaturesEnum.PLAY_GONG_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.PLAY_GONG_FEATURE} ${API_SUCCESS}`:
        next(ActionGenerator.setPlayGongEnabled(true));
        this.messagesService.gongPlayedResult(action.payload.data.gongSuccessPlay);
        break;
      case `${ActionFeaturesEnum.PLAY_GONG_FEATURE} ${API_ERROR}`:
        // Re-enable the play button on error so user can try again
        next(ActionGenerator.setPlayGongEnabled(true));
        console.error('Play gong API error:', action.payload);
        break;
      case ActionTypesEnum.SET_DATE_FORMAT:
        localStorage.setItem('date_format', JSON.stringify(action.payload));
        break;
      case ActionTypesEnum.UPLOAD_COURSES_FILE:
        let file = action.payload as File;
        let formData: FormData = new FormData();
        formData.append('file', file, file.name);
        next(
          apiRequest(formData, 'POST', UPLOAD_COURSES_URL,
            ActionFeaturesEnum.UPLOAD_COURSES_FILE_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.UPLOAD_COURSES_FILE_FEATURE} ${API_SUCCESS}`:
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true}));
      // tslint:disable-next-line:no-switch-case-fall-through
      case `${ActionFeaturesEnum.UPLOAD_COURSES_FILE_FEATURE} ${API_ERROR}`:
        this.messagesService.coursesUploaded(action.payload.error && action.payload.error.additional_message);
        next(
          ActionGenerator.uploadCourseFileHasComplete()
        );
        break;
      case ActionTypesEnum.UPLOAD_GONG_FILE:
        file = action.payload.file as File;
        const gongId = action.payload.gongId as string;
        formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('gongId', gongId);
        next(
          apiRequest(formData, 'POST', UPLOAD_GONG_URL,
            ActionFeaturesEnum.UPLOAD_GONG_FILE_FEATURE, action.payload)
        );
        break;
      case `${ActionFeaturesEnum.UPLOAD_GONG_FILE_FEATURE} ${API_SUCCESS}`:
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true}));
      // tslint:disable-next-line:no-switch-case-fall-through
      case `${ActionFeaturesEnum.UPLOAD_GONG_FILE_FEATURE} ${API_ERROR}`:
        let additionalErrorInfo = action.payload.error && action.payload.error.additional_message;
        if (action.payload.error) {
          if (!additionalErrorInfo) {
            additionalErrorInfo = action.payload.error.message ? action.payload.error.message : 'Unknown Error';
          }
        } else {
          additionalErrorInfo = undefined;
        }
        this.messagesService.gongsUploaded(additionalErrorInfo);
        next(
          ActionGenerator.uploadGongFileHasComplete()
        );
        break;
      case ActionTypesEnum.DELETE_COURSE:
        console.log('🔍 DELETE_COURSE action triggered with payload:', action.payload);
        next(
          apiRequest(JSON.stringify({courseName: action.payload}),
            'POST', DELETE_COURSE_URL, ActionFeaturesEnum.DELETE_COURSE_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.DELETE_COURSE_FEATURE} ${API_SUCCESS}`:
        console.log('🔍 Course deletion successful, refreshing basic data...');
        this.messagesService.courseDeletedSuccessfully();
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true}));

        break;
      case ActionTypesEnum.DELETE_GONG:
        next(
          apiRequest(JSON.stringify({gongId: action.payload}),
            'POST', DELETE_GONG_URL, ActionFeaturesEnum.DELETE_GONG_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.DELETE_GONG_FEATURE} ${API_SUCCESS}`:
        this.messagesService.gongDeletedSuccessfully();
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true}));

        break;
      case ActionTypesEnum.GET_USERS_ARRAY:
        next(
          apiRequest(null, 'GET', GET_USERS_URL, ActionFeaturesEnum.GET_USERS_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.GET_USERS_FEATURE} ${API_SUCCESS}`:
        const usersArray = this.jsonConverterService.convert<User>(
          action.payload.data, 'User');
        next(
          ActionGenerator.setUsersArray(usersArray)
        );
        break;
      case ActionTypesEnum.ADD_USER:
        const userAsJson = this.jsonConverterService.convertToJson(action.payload);
        next(
          apiRequest(userAsJson, 'POST', ADD_USER_URL, ActionFeaturesEnum.ADD_USER_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.ADD_USER_FEATURE} ${API_SUCCESS}`:
        dispatch(
          ActionGenerator.getUsersArray()
        );
        break;
      case ActionTypesEnum.DELETE_USER:
        next(
          apiRequest(JSON.stringify({userId: action.payload.id}), 'POST',
            DELETE_USER_URL, ActionFeaturesEnum.DELETE_USER_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.DELETE_USER_FEATURE} ${API_SUCCESS}`:
        dispatch(
          ActionGenerator.getUsersArray()
        );
        break;
      case ActionTypesEnum.UPDATE_USER:
        let user: User = action.payload;
        next(
          apiRequest(JSON.stringify({userId: user.id, role: user.role}), 'POST',
            UPDATE_USER_URL, ActionFeaturesEnum.UPDATE_USER_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.UPDATE_USER_FEATURE} ${API_SUCCESS}`:
        dispatch(
          ActionGenerator.getUsersArray()
        );
        break;
      case ActionTypesEnum.RESET_USER_PASSWORD:
        user = action.payload;
        next(
          apiRequest(JSON.stringify({userId: user.id, password: user.password}), 'POST',
            RESET_USER_PASSWORD_URL, ActionFeaturesEnum.RESET_USER_PASSWORD_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.RESET_USER_PASSWORD_FEATURE} ${API_SUCCESS}`:
        this.messagesService.coursesUploaded(action.payload.error && action.payload.error.additional_message);
        break;
      case ActionTypesEnum.UPDATE_PERMISSIONS:
        const permissionsArrayAsJson = this.jsonConverterService.convertToJson(action.payload);
        next(
          apiRequest(permissionsArrayAsJson, 'POST',
            UPDATE_PERMISSIONS_URL, ActionFeaturesEnum.UPDATE_PERMISSIONS_FEATURE, null)
        );
        break;
      case `${ActionFeaturesEnum.UPDATE_PERMISSIONS_FEATURE} ${API_SUCCESS}`:
        next(
          apiRequest(null, 'GET', GET_BASIC_DATA_URL, ActionFeaturesEnum.BASIC_DATA_FEATURE
            , {bypassRefreshDateFormat: true}));
        break;
    }

    if (action.type.includes(API_ERROR)) {

      if (action.payload && action.payload.error && action.payload.error.message &&
        (action.payload.error.message as string).includes('invalid token')) {
        console.error('Logged In expired');
        this.authService.logout();
        this.router.navigate(['loginPage']);
      } else {
        console.error('Error in  processing API middleware : ', action);
      }
    }
  };

  private needToUpdateStaticData(aNewlyRecievedBasicServerData: BasicServerData): number {
    const staticUpdateTime = Number(localStorage.getItem('static_update_time'));
    const serverStaticDataLastUpdateTime = aNewlyRecievedBasicServerData.staticDataLastUpdateTime.getTime();
    let newlyLastUpdateTime = Number.isNaN(staticUpdateTime) ? serverStaticDataLastUpdateTime : undefined;
    if (!newlyLastUpdateTime) {
      newlyLastUpdateTime = serverStaticDataLastUpdateTime > staticUpdateTime ? serverStaticDataLastUpdateTime : undefined;
    }
    return newlyLastUpdateTime;
  }
}
