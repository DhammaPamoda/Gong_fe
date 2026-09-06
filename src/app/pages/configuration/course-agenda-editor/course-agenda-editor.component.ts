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
import { EditCourseAgendaDialogComponent, EditCourseAgendaDialogResult } from './edit-course-agenda-dialog/edit-course-agenda-dialog.component';
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
        this.storeService.getCoursesMap()
            .pipe(takeUntil(this.onDestroy$))
            .subscribe((coursesMap: Map<string, Course>) => {
                if (coursesMap) {
                    this.courses = [];
                    coursesMap.forEach(course => {
                        if (!course.isTest && !course.name.toLowerCase().includes('test')) {
                            this.courses.push(course);
                        }
                    });

                    if (this.selectedCourse) {
                        const updatedSelected = this.courses.find(c => c.name === this.selectedCourse!.name);
                        if (updatedSelected) {
                            this.selectedCourse = updatedSelected;
                            this.agendaItems = updatedSelected.agenda || [];
                            this.updateGrouping();
                        }
                    }
                }
            });

        this.storeService.getGongTypesMap()
            .pipe(takeUntil(this.onDestroy$))
            .subscribe(gongTypesMap => {
                this.gongTypes = gongTypesMap;
                this.gongTypesList = this.storeService.getGongs();
            });

        this.storeService.getAreasMap()
            .pipe(takeUntil(this.onDestroy$))
            .subscribe(areasMap => {
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

        this.groupedAgendaItems = Array.from(groupsMap.entries()).map(entry => ({
            groupKey: entry[0],
            items: entry[1]
        }));
    }

    addAgendaItem(): void {
        if (!this.selectedCourse || this.isSelectedCourseScheduled()) {
            return;
        }

        const areasList = Array.isArray(this.areasMap) ? this.areasMap : Object.values(this.areasMap || {});
        const gongTypesList = (this.gongTypesList && this.gongTypesList.length > 0) ? this.gongTypesList : Object.values(this.gongTypes || {});

        const dialogRef = this.dialog.open(EditCourseAgendaDialogComponent, {
            width: '600px',
            maxWidth: '92vw',
            data: {
                agendaItem: null,
                courseDays: (this.selectedCourse && this.selectedCourse.days != null) ? this.selectedCourse.days : 10,
                areas: areasList,
                gongTypes: gongTypesList
            }
        });

        dialogRef.afterClosed().subscribe((result: EditCourseAgendaDialogResult | null) => {
            if (result && result.action === 'save' && result.agendaItem && this.selectedCourse) {
                const currentAgenda = this.selectedCourse.agenda || [];
                const newAgenda = currentAgenda.slice();
                newAgenda.push(result.agendaItem);
                this.selectedCourse.agenda = newAgenda;
                this.agendaItems = newAgenda;
                this.updateGrouping();
                this.storeService.updateCourseAgenda(this.selectedCourse.name, newAgenda);
            }
        });
    }

    editAgendaItem(item: CourseAgenda): void {
        const areasList = Array.isArray(this.areasMap) ? this.areasMap : Object.values(this.areasMap || {});
        const gongTypesList = (this.gongTypesList && this.gongTypesList.length > 0) ? this.gongTypesList : Object.values(this.gongTypes || {});

        const dialogRef = this.dialog.open(EditCourseAgendaDialogComponent, {
            width: '600px',
            maxWidth: '92vw',
            data: {
                agendaItem: item,
                courseDays: (this.selectedCourse && this.selectedCourse.days != null) ? this.selectedCourse.days : 10,
                areas: areasList,
                gongTypes: gongTypesList
            }
        });

        dialogRef.afterClosed().subscribe((result: EditCourseAgendaDialogResult | null) => {
            if (!result || !this.selectedCourse) {
                return;
            }

            if (result.action === 'save' && result.agendaItem) {
                let index = (this.selectedCourse.agenda || []).indexOf(item);
                if (index < 0) {
                    index = this.agendaItems.indexOf(item);
                }
                if (index < 0 && this.selectedCourse.agenda) {
                    index = this.selectedCourse.agenda.findIndex(a => a === item || (a.title === item.title && JSON.stringify(a.days) === JSON.stringify(item.days)));
                }

                if (index >= 0) {
                    const newAgenda = (this.selectedCourse.agenda || this.agendaItems).slice();
                    newAgenda[index] = result.agendaItem;
                    this.selectedCourse.agenda = newAgenda;
                    this.agendaItems = newAgenda;
                    this.updateGrouping();
                    this.storeService.updateCourseAgenda(this.selectedCourse.name, newAgenda);
                }
            } else if (result.action === 'delete') {
                let index = (this.selectedCourse.agenda || []).indexOf(item);
                if (index < 0) {
                    index = this.agendaItems.indexOf(item);
                }
                if (index < 0 && this.selectedCourse.agenda) {
                    index = this.selectedCourse.agenda.findIndex(a => a === item || (a.title === item.title && JSON.stringify(a.days) === JSON.stringify(item.days)));
                }

                if (index >= 0) {
                    const newAgenda = (this.selectedCourse.agenda || this.agendaItems).slice();
                    newAgenda.splice(index, 1);
                    this.selectedCourse.agenda = newAgenda;
                    this.agendaItems = newAgenda;
                    this.updateGrouping();
                    this.storeService.updateCourseAgenda(this.selectedCourse.name, newAgenda);
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
