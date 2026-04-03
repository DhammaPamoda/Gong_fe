import { INITIAL_INNER_DATA_STATE, InnerDataState } from '../states/inner.data.state';
import { ActionTypesEnum, AppAction } from '../actions/action';

import { DateFormat } from '../../model/dateFormat';

export function innerReducer(state: InnerDataState = INITIAL_INNER_DATA_STATE,
  action: AppAction): any {

  switch (action.type) {
    case ActionTypesEnum.SET_LOGGED_IN:
      return Object.assign({}, state, { isLoggedIn: action.payload as boolean });
    case ActionTypesEnum.STORE_STATIC_DATA_WAS_UPDATED:
      return Object.assign({}, state, { staticDataWasUpdated: new Date() });
    case ActionTypesEnum.SET_DATE_FORMAT:
      const oldDateFormat = action.payload as DateFormat;
      const newDateFormat = new DateFormat(oldDateFormat.template, oldDateFormat.delimiter);
      return Object.assign({}, state, { dateFormat: newDateFormat });
    case ActionTypesEnum.SET_PLAY_GONG_ENABLED:
      return Object.assign({}, state, { gongPlayEnabled: action.payload as boolean });
    case ActionTypesEnum.UPLOAD_COURSES_FILE_WAS_COMPLETED:
      return Object.assign({}, state, { uploadCoursesFileEnded: state.uploadCoursesFileEnded + 1 });
    case ActionTypesEnum.UPLOAD_GONG_FILE_WAS_COMPLETED:
      return Object.assign({}, state, { uploadGongFileEnded: state.uploadGongFileEnded + 1 });
    default:
      return Object.assign({}, state);
  }
}

