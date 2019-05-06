import {
  ADD_MANUAL_GONG,
  AppAction,
  REMOVE_MANUAL_GONG,
  SCHEDULE_COURSE_ADD,
  SCHEDULED_COURSE_REMOVE,
  SCHEDULED_COURSE_UPDATE,
  SET_BASIC_DATA,
  SET_COURSES_SCHEDULE,
  SET_MANUAL_GONGS_LIST,
  UPDATE_MANUAL_GONG
} from '../actions/action';
import {DynamicDataState, INITIAL_DYNAMIC_DATA_STATE} from '../states/dynamic.data.state';
import {ScheduledGong} from '../../model/ScheduledGong';
import {CourseSchedule} from '../../model/courseSchedule';

export function dynamicDataReducer(state: DynamicDataState = INITIAL_DYNAMIC_DATA_STATE,
                                   action: AppAction): any {
  switch (action.type) {
    case SET_BASIC_DATA:
      return Object.assign({}, state, {basicServerData: action.payload});
    case SET_COURSES_SCHEDULE:
      return Object.assign({}, state, {coursesSchedule: action.payload});
    case SET_MANUAL_GONGS_LIST:
      return Object.assign({}, state, {manualGongs: action.payload});
    case ADD_MANUAL_GONG:
      const newScheduledGong = (action.payload as ScheduledGong).clone();
      state.manualGongs.push(newScheduledGong);
      state.manualGongs = [...state.manualGongs];
      return Object.assign({}, state);
    case UPDATE_MANUAL_GONG:
      const updatedGong = action.payload as ScheduledGong;
      if (state.manualGongs) {
        const foundGong = state.manualGongs.find(gong => gong.date === updatedGong.date);
        if (foundGong) {
          foundGong.isActive = updatedGong.isActive;
          foundGong.updateStatus = updatedGong.updateStatus;
        }
      }
      return Object.assign({}, state);
    case REMOVE_MANUAL_GONG:
      const gong2BRemoved = action.payload as ScheduledGong;
      if (state.manualGongs) {
        const foundGongIndex = state.manualGongs.findIndex(gong => gong.date === gong2BRemoved.date);
        if (foundGongIndex >= 0) {
          state.manualGongs.splice(foundGongIndex, 1);
          state.manualGongs = [...state.manualGongs];
        }
      }
      return Object.assign({}, state);
    case SCHEDULE_COURSE_ADD:
      addCoursesScheduleToState(state, action.payload);
      return Object.assign({}, state);
    case SCHEDULED_COURSE_REMOVE:
      removeCoursesScheduleToState(state, action.payload as CourseSchedule);
      state.coursesSchedule = [...state.coursesSchedule];
      return Object.assign({}, state);
    case SCHEDULED_COURSE_UPDATE:
      const updatedCourseSchedule = action.payload as CourseSchedule;
      if (removeCoursesScheduleToState(state, updatedCourseSchedule)) {
        addCoursesScheduleToState(state, updatedCourseSchedule);
      }
      return Object.assign({}, state);
    default:
      return Object.assign({}, state);
  }
}

function addCoursesScheduleToState(state: DynamicDataState, aCourseSchedule: CourseSchedule) {
  state.coursesSchedule = [...state.coursesSchedule];
  state.coursesSchedule.push(aCourseSchedule.clone());
  state.coursesSchedule.sort(((a, b) => a.date.getTime() - b.date.getTime()));
}

function removeCoursesScheduleToState(state: DynamicDataState, aCourseSchedule: CourseSchedule): boolean {
  if (state.coursesSchedule) {
    const indexOfFoundGong = state.coursesSchedule.findIndex(
      courseSchedule => (courseSchedule.id && (courseSchedule.id === aCourseSchedule.id)) ||
        (courseSchedule.tmpId && (courseSchedule.tmpId === aCourseSchedule.tmpId)));
    if (indexOfFoundGong >= 0) {
      state.coursesSchedule.splice(indexOfFoundGong, 1);
      return true;
    }
  }
  return false;
}

