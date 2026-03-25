import { Injectable } from '@angular/core';
import { Titles } from '../shared/titles';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ScheduledGong } from '../model/ScheduledGong';
import { EnumUtils } from '../utils/enumUtils';
import { sprintf } from 'sprintf-js';

// var old_sprintf = require('sprintf-js');
enum MessagesTranslationEnum {
  CANNOT_DELETE_SCHEDULED_GONG = 'couldNotDeleteScheduledGong',
  CANNOT_SCHEDULE_OBSOLETE_GONG = 'couldNotScheduleObsoleteGong',
  GONG_PLAYED_SUCCESSFULLY = 'gongPlayedSuccessfully',
  GONG_PLAYED_FAILED = 'gongPlayedFailed',
  COURSES_UPLOADED_SUCCESSFULLY = 'coursesUploadedSuccessfully',
  COURSES_UPLOAD_FAILED = 'coursesUploadFailed',
  GONGS_UPLOADED_SUCCESSFULLY = 'gongUploadedSuccessfully',
  GONGS_UPLOAD_FAILED = 'gongUploadFailed',
  LAST_GONGS_IS_IN_USE = 'lastGongIsInUse',
  LAST_GONGS_NOT_FOUND = 'lastGongNotFound',
  RESET_USER_PASSWORD_SUCCESSFUL = 'resetUserPasswordSuccessful',
  GONG_DELETED_SUCCESSFUL = 'gongDeletedSuccessful',
  COURSE_DELETED_SUCCESSFUL = 'courseDeletedSuccessful',
}

@Injectable({
  providedIn: 'root'
})
export class MessagesService {

  constructor(
    private snackBar: MatSnackBar) {
  }

  private getTranlation(aTransKey: MessagesTranslationEnum) {
    const enumVal = aTransKey as string;
    return Titles.general.messages[enumVal] || enumVal;
  }

  cannotDeleteRecord(aScheduledGong: ScheduledGong) {
    const messageTrans = this.getTranlation(MessagesTranslationEnum.CANNOT_DELETE_SCHEDULED_GONG);
    const messageTransWithParams = sprintf(messageTrans, aScheduledGong.exactMoment.format('YYYY-MM-DD HH:mm'));
    this.snackBar.open(messageTransWithParams, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  scheduleGongToFutureTime() {
    const messageTrans = this.getTranlation(MessagesTranslationEnum.CANNOT_SCHEDULE_OBSOLETE_GONG);
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  gongPlayedResult(aWasSuccessfully: boolean) {
    const transKey = aWasSuccessfully ? MessagesTranslationEnum.GONG_PLAYED_SUCCESSFULLY :
      MessagesTranslationEnum.GONG_PLAYED_FAILED;
    const messageTrans = this.getTranlation(transKey);
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  coursesUploaded(aFailedInfo: string) {
    const transKey = !aFailedInfo ? MessagesTranslationEnum.COURSES_UPLOADED_SUCCESSFULLY :
      MessagesTranslationEnum.COURSES_UPLOAD_FAILED;
    const addedMessage = aFailedInfo ? `\nAdditionalInfo : ${aFailedInfo}` : '';
    const messageTrans = `${this.getTranlation(transKey)} ${addedMessage}`;
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  gongsUploaded(aFailedInfo: string) {
    const transKey = !aFailedInfo ? MessagesTranslationEnum.GONGS_UPLOADED_SUCCESSFULLY :
      MessagesTranslationEnum.GONGS_UPLOAD_FAILED;
    const addedMessage = aFailedInfo ? `\nAdditionalInfo : ${aFailedInfo}` : '';
    const messageTrans = `${this.getTranlation(transKey)} ${addedMessage}`;
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  lastGongIsBeingUsed(aGongName: string) {
    const transKey = aGongName ? MessagesTranslationEnum.LAST_GONGS_IS_IN_USE :
      MessagesTranslationEnum.LAST_GONGS_NOT_FOUND;
    const messageTrans = `${aGongName} ${this.getTranlation(transKey)}`;
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  resetPasswordSuccessful() {
    const messageTrans = this.getTranlation(MessagesTranslationEnum.RESET_USER_PASSWORD_SUCCESSFUL);
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  gongDeletedSuccessfully() {
    const messageTrans = this.getTranlation(MessagesTranslationEnum.GONG_DELETED_SUCCESSFUL);
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }

  courseDeletedSuccessfully() {
    const messageTrans = this.getTranlation(MessagesTranslationEnum.COURSE_DELETED_SUCCESSFUL);
    this.snackBar.open(messageTrans, null, {
      duration: 5000,
      panelClass: 'snackBarClass',
    });
  }
}
