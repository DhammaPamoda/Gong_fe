import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NgRedux } from '@angular-redux/store';
import { Course, CourseAgenda } from 'src/app/model/course';
import { StoreService } from 'src/app/services/store.service';
import { Titles } from 'src/app/shared/titles';
import { Area } from 'src/app/model/area';
import { GongType } from 'src/app/model/gongType';
import { IObjectMap } from 'src/app/model/store-model';
import { ActionGenerator } from 'src/app/store/actions/action';
import { EditCourseAgendaDialogComponent } from './edit-course-agenda-dialog/edit-course-agenda-dialog.component';
import { CourseSchedule } from 'src/app/model/courseSchedule';
import { takeUntil } from 'rxjs/operators';
import { BaseComponent } from 'src/app/shared/baseComponent';
import { StoreDataTypeEnum } from 'src/app/store/storeDataTypeEnum';

export interface GroupedAgenda {
    groupKey: string;
    items: CourseAgenda[];
}

@Component({
    selector: 'app-course-agenda-editor',
    templateUrl: './course-agenda-editor.component.html',
    styleUrls: ['./course-agenda-editor.component.scss']
})
export class CourseAgendaEditorComponent extends BaseComponent {
    public titles = Titles;

    courses: Course[] = [];
    selectedCourse: Course | null = null;
    agendaItems: CourseAgenda[] = [];
    groupedAgendaItems: GroupedAgenda[] = [];

    groupByOptions: string[] = ['title', 'days', 'area'];
    selectedGroupBy: string = 'title';
    scheduledCourseNames: string[] = []

    areasMap: Area[] = [];
    gongTypes: IObjectMap<GongType> = {};
    gongTypesList: GongType[] = [];

    constructor(
        private storeService: StoreService,
        private dialog: MatDialog,
        private ngRedux: NgRedux<any>
    ) { super(); }

    async ngOnInit(): Promise<void> {
        const coursesMap = await this.storeService.getCoursesMapPromise();
        coursesMap.forEach(course => {
            if (!course.isTest && !course.name.toLowerCase().includes('test')) {
                this.courses.push(course);
            }
        });

        this.storeService.getGongTypesMap().subscribe(gongTypesMap => {
            this.gongTypes = gongTypesMap;
            this.gongTypesList = this.storeService.getGongs();
        });

        this.storeService.getAreasMap().subscribe(areasMap => {
            this.areasMap = areasMap;
        });

        this.ngRedux.select<CourseSchedule[]>([StoreDataTypeEnum.DYNAMIC_DATA, 'coursesSchedule'])
            .pipe(takeUntil(this.onDestroy$))
            .subscribe((coursesSchedule: CourseSchedule[]) => {
                this.scheduledCourseNames = coursesSchedule.map(cs => cs.name);
            });
    }

    selectCourse(selectedCourse: Course): void {
        this.selectedCourse = selectedCourse;
        this.agendaItems = selectedCourse?.agenda || [];
        this.updateGrouping();
    }

    onGroupByChange(groupBy: string): void {
        this.selectedGroupBy = groupBy;
        this.updateGrouping();
    }

    updateGrouping(): void {
        const groupsMap = new Map<string, CourseAgenda[]>();

        this.agendaItems.forEach(item => {
            let key = '';
            if (this.selectedGroupBy === 'title') {
                key = item.title || 'Untitled';
            } else if (this.selectedGroupBy === 'days') {
                key = item.days && item.days.length ? `Day(s): ${item.days.join(', ')}` : 'No Days';
            } else if (this.selectedGroupBy === 'area') {
                key = `Area: ${this.getAreaNames(item.gongs?.areas) || 'None'}`;
            }

            if (!groupsMap.has(key)) {
                groupsMap.set(key, []);
            }
            groupsMap.get(key)!.push(item);
        });

        this.groupedAgendaItems = Array.from(groupsMap.entries()).map(([groupKey, items]) => ({
            groupKey,
            items
        }));
    }

    editAgendaItem(item: CourseAgenda): void {
        const dialogRef = this.dialog.open(EditCourseAgendaDialogComponent, {
            width: '560px',
            data: {
                agendaItem: item,
                courseDays: this.selectedCourse?.days ?? 10,
                areas: Object.values(this.areasMap),
                gongTypes: this.gongTypesList
            }
        });

        dialogRef.afterClosed().subscribe((updatedItem: CourseAgenda | null) => {
            if (updatedItem) {
                const index = this.agendaItems.indexOf(item);
                if (index >= 0) {
                    this.agendaItems[index] = updatedItem;
                    if (this.selectedCourse) {
                        this.selectedCourse.agenda = this.agendaItems;
                        // Dispatch action to update static data via backend
                        this.ngRedux.dispatch(ActionGenerator.updateCourseAgenda({
                            course_name: this.selectedCourse.name,
                            course_agenda: this.selectedCourse.agenda
                        }));
                    }
                    this.updateGrouping();
                }
            }
        });
    }

    getGongTypeName(typeId: number): string {
        if (!this.gongTypes || !typeId) {
            return typeId ? typeId.toString() : '';
        }
        const gongType = this.gongTypes[typeId];
        if (!gongType) {
            return typeId.toString();
        }
        const titleMapping = (this.titles.general.typesValues.gongType as Record<string, string>)[gongType.name];
        return titleMapping || gongType.name;
    }

    getAreaNames(areaIds: number[]): string {
        if (!areaIds || !areaIds.length) {
            return '';
        }
        if (!this.areasMap || Object.keys(this.areasMap).length == 0) {
            return areaIds.join(', ');
        }
        return areaIds.map(areaId => {
            if(areaId in this.areasMap ){
                return this.areasMap[areaId].name;
            }
            return areaId.toString();
        }).join(', ');
    }

    isSelectedCourseScheduled(): boolean {
        return this.selectedCourse != null && this.scheduledCourseNames.includes(this.selectedCourse.name)
    }

    formatDays(days: number[]): string {
        if (!days || !days.length) {
            return '';
        }
        return days.join(', ');
    }

    formatTimes(times: string[]): string {
        if (!times || !times.length) {
            return '';
        }
        return times.join(', ');
    }
}
