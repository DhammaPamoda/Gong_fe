import moment from 'moment';
import {ScheduledGong} from '../../model/ScheduledGong';
import {ScheduledCourseGong} from '../../model/ScheduledCourseGong';
import {BasicServerData} from '../../model/basicServerData';
import {Area} from '../../model/area';
import {Course} from '../../model/course';
import {GongType} from '../../model/gongType';
import {CourseSchedule} from '../../model/courseSchedule';
import {Gong} from '../../model/gong';
import {DateFormat} from '../../model/dateFormat';
import {ClassMapEntry, MethodMapEntry} from 'angular-json-class-converter';
import {User} from '../../model/user';
import {Permission} from '../../model/permission';

const dateFormat = 'YYYY-MM-DD';

const addNewGongToArray = (aCourseDay, aGongTime, aGongRecord, aGongsArray) => {
  const newScheduledGong = new ScheduledGong();
  newScheduledGong.dayNumber = aCourseDay;
  newScheduledGong.time = aGongTime;
  newScheduledGong.gongTypeId = aGongRecord.type;
  newScheduledGong.areas = aGongRecord.areas;
  newScheduledGong.volume = aGongRecord.volume ? aGongRecord.volume : 100;
  newScheduledGong.repeat = aGongRecord.repeat ? aGongRecord.repeat : 1;
  aGongsArray.push(newScheduledGong);
};

const agendaConversion = (coursesAgendaArray: Array<any>): ScheduledGong[] => {
  const returnedScheduledGongArray = new Array<ScheduledGong>();

  coursesAgendaArray.forEach(agendaRecord => {
    (agendaRecord.days as Array<any>).forEach(day => {
      const gongRecord = agendaRecord.gongs;
      (gongRecord.times as Array<any>).forEach(gongTime => {
        // For test courses, times are in format ":XX" (minutes)
        // For regular courses, times are in format "HH:MM"
        const computedGongTime = (gongTime.indexOf(':') === 0) ? `0${gongTime}` : gongTime;
        // Time should be in format "day.HH:MM" to represent time from course start
        const timeFromCourseStart = `${day}.${computedGongTime}`;
        const timeInMillis = moment.duration(timeFromCourseStart).asMilliseconds();
        addNewGongToArray(day, timeInMillis, gongRecord, returnedScheduledGongArray);
      });
    });
  });

  // Sorting the results
  returnedScheduledGongArray.sort((a: ScheduledGong, b: ScheduledGong) => {
    if (a.dayNumber !== b.dayNumber) {
      return a.dayNumber - b.dayNumber;
    } else {
      return a.time - b.time;
    }
  });

  // console.log('Convering Agenda : ', returnedScheduledGongArray);

  return returnedScheduledGongArray;
};

const timeConversion = (timeAsStr: string): number => {
  const timeNumber = moment.duration(timeAsStr).asMilliseconds();
  return timeNumber;
};

const timeToStrConversionForJson = (aTime: number): string => {
  const duration = moment.duration(aTime);
  // const timeStr = `${duration.hours()}:${duration.minutes()}`;
  const timeStr = moment.utc(aTime).format('HH:mm');
  return timeStr;
};

const nextScheduledJobTimeConversion = (nextScheduledJob: any): Date | null => {
  console.log('🔍 nextScheduledJobTimeConversion called with:', nextScheduledJob);
  if (!nextScheduledJob || !nextScheduledJob.time) {
    console.log('🔍 nextScheduledJob is null or has no time, returning null');
    return null;
  }
  const converted = timeToDateConversion(nextScheduledJob.time);
  console.log('🔍 Converted time:', converted);
  return converted;
};

const isManualConversion = (nextScheduledJob: any): boolean => {
  if (!nextScheduledJob) {
    return false; // Default to false when no scheduled job
  }
  return nextScheduledJob.isManual || false;
};

const dateConversion = (dateAsStr: string): Date => {
  const date = moment(dateAsStr, dateFormat).toDate();
  return date;
};

const timeToDateConversion = (time: number): Date => {
  const date = moment(time).toDate();
  return date;
};

const dateToTimeConversionForJson = (date: Date): number => {
  const time = date.getTime();
  return time;
};

const dateToStrDateConversionForJson = (aDate: Date): string => {
  const dateStr = moment(aDate).format(dateFormat);
  return dateStr;
};


export default {
  functionsMapArray: [
    {methodName: 'agendaConversion', method: agendaConversion},
    {methodName: 'timeConversion', method: timeConversion},
    {methodName: 'dateConversion', method: dateConversion},
    {methodName: 'timeToDateConversion', method: timeToDateConversion},
    {methodName: 'dateToTimeConversionForJson', method: dateToTimeConversionForJson},
    {methodName: 'dateToStrDateConversionForJson', method: dateToStrDateConversionForJson},
    {methodName: 'timeToStrConversionForJson', method: timeToStrConversionForJson},
    {methodName: 'nextScheduledJobTimeConversion', method: nextScheduledJobTimeConversion},
    {methodName: 'isManualConversion', method: isManualConversion}
  ] as MethodMapEntry[],
  classesMapArray: [
    {className: 'BasicServerData', clazz: BasicServerData},
    {className: 'Area', clazz: Area},
    {className: 'Course', clazz: Course},
    {className: 'GongType', clazz: GongType},
    {className: 'ScheduledCourseGong', clazz: ScheduledCourseGong},
    {className: 'CourseSchedule', clazz: CourseSchedule},
    {className: 'ScheduledGong', clazz: ScheduledGong},
    {className: 'Gong', clazz: Gong},
    {className: 'DateFormat', clazz: DateFormat},
    {className: 'User', clazz: User},
    {className: 'Permission', clazz: Permission},
    ] as ClassMapEntry[]
};
