import { ScheduledGong } from './ScheduledGong';
import { GongType } from './gongType';

export interface CourseAgendaGongs {
  times: string[];
  areas: number[];
  type: number;
  volume?: number;
  repeat?: number;
}

export interface CourseAgenda {
  title?: string;
  days: number[];
  gongs: CourseAgendaGongs;
}

export class Course {
  name: string;
  isTest: boolean;
  days: number;
  routine: ScheduledGong[];
  agenda: CourseAgenda[];

  isGongTypeInCourse(aGongType: GongType): boolean {
    return this.routine.some(scheduledGong => scheduledGong.gongTypeId === aGongType.id);
  }
}
