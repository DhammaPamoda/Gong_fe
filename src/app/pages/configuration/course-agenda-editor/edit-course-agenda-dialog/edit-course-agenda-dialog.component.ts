import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import moment from 'moment';
import { CourseAgenda } from 'src/app/model/course';
import { Area } from 'src/app/model/area';
import { GongType } from 'src/app/model/gongType';
import { Titles } from 'src/app/shared/titles';
import { EditTimeDialogComponent, EditTimeDialogResult } from './edit-time-dialog/edit-time-dialog.component';

export interface EditCourseAgendaDialogData {
    agendaItem?: CourseAgenda;
    courseDays: number;
    areas: Area[];
    gongTypes: GongType[];
}

@Component({
    selector: 'app-edit-course-agenda-dialog',
    templateUrl: './edit-course-agenda-dialog.component.html',
    styleUrls: ['./edit-course-agenda-dialog.component.scss']
})
export class EditCourseAgendaDialogComponent implements OnInit {
    public titles = Titles;

    title: string = '';
    selectedAreas: number[] = [];
    selectedGongType: number | null = null;
    selectedDays: number[] = [];
    times: string[] = [];
    volume: number = 100;
    repeat: number = 1;

    availableDays: number[] = [];
    areas: Area[] = [];
    gongTypes: GongType[] = [];

    // Time picker controls
    isTimePickerOpen: boolean = false;
    tempPickerTime: Date = new Date();
    manualTimeInput: string = '';

    constructor(
        public dialogRef: MatDialogRef<EditCourseAgendaDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: EditCourseAgendaDialogData,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.areas = this.data.areas || [];
        this.gongTypes = this.data.gongTypes || [];

        const totalDays = this.data.courseDays != null ? this.data.courseDays : 10;
        this.availableDays = Array.from({ length: totalDays + 1 }, (_, i) => i);

        if (this.data.agendaItem) {
            const item = this.data.agendaItem;
            this.title = item.title || '';
            this.selectedDays = item.days ? [...item.days] : [];
            if (item.gongs) {
                this.selectedAreas = item.gongs.areas ? [...item.gongs.areas] : [];
                this.selectedGongType = item.gongs.type != null ? item.gongs.type : null;
                this.times = item.gongs.times ? [...item.gongs.times] : [];
                this.volume = item.gongs.volume != null ? item.gongs.volume : 100;
                this.repeat = item.gongs.repeat != null ? item.gongs.repeat : 1;
            }
        }
    }

    getGongTypeLabel(gongType: GongType): string {
        const mapped = (this.titles.general.typesValues.gongType as Record<string, string>)[gongType.name];
        return mapped || gongType.name;
    }

    // Days selection logic
    isDaySelected(day: number): boolean {
        return this.selectedDays.includes(day);
    }

    toggleDay(day: number): void {
        if (this.isDaySelected(day)) {
            this.selectedDays = this.selectedDays.filter(d => d !== day);
        } else {
            this.selectedDays = [...this.selectedDays, day].sort((a, b) => a - b);
        }
    }

    selectAllDays(): void {
        this.selectedDays = [...this.availableDays];
    }

    clearAllDays(): void {
        this.selectedDays = [];
    }

    // Time picker logic
    openClockPicker(): void {
        this.tempPickerTime = new Date();
        this.isTimePickerOpen = true;
    }

    onClockPickerClose(): void {
        this.isTimePickerOpen = false;
        if (this.tempPickerTime) {
            const timeFormatted = moment(this.tempPickerTime).format('HH:mm');
            this.addTime(timeFormatted);
        }
    }

    addManualTime(): void {
        if (!this.manualTimeInput) {
            return;
        }
        const trimmed = this.manualTimeInput.trim();
        if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
            const parts = trimmed.split(':');
            const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
            this.addTime(formatted);
            this.manualTimeInput = '';
        }
    }

    addTime(timeStr: string): void {
        if (timeStr && !this.times.includes(timeStr)) {
            this.times = [...this.times, timeStr].sort();
        }
    }

    editTime(timeStr: string): void {
        const dialogRef = this.dialog.open(EditTimeDialogComponent, {
            width: '320px',
            data: { time: timeStr }
        });

        dialogRef.afterClosed().subscribe((res: EditTimeDialogResult | null) => {
            if (!res) return;
            if (res.action === 'delete') {
                this.removeTime(timeStr);
            } else if (res.action === 'save' && res.time) {
                if (res.time !== timeStr) {
                    const idx = this.times.indexOf(timeStr);
                    if (idx >= 0) {
                        const newTimes = this.times.filter(t => t !== timeStr);
                        if (!newTimes.includes(res.time)) {
                            newTimes.push(res.time);
                        }
                        this.times = newTimes.sort();
                    }
                }
            }
        });
    }

    removeTime(timeStr: string): void {
        this.times = this.times.filter(t => t !== timeStr);
    }

    // Areas selection logic
    selectAllAreas(): void {
        this.selectedAreas = this.areas.map(a => a.id);
    }

    clearAllAreas(): void {
        this.selectedAreas = [];
    }

    isValid(): boolean {
        return (
            this.title.trim().length > 0 &&
            this.selectedGongType != null &&
            this.selectedAreas.length > 0 &&
            this.selectedDays.length > 0 &&
            this.times.length > 0
        );
    }

    save(): void {
        if (!this.isValid()) {
            return;
        }

        const updatedAgenda: CourseAgenda = {
            title: this.title.trim(),
            days: [...this.selectedDays].sort((a, b) => a - b),
            gongs: {
                type: this.selectedGongType!,
                areas: [...this.selectedAreas],
                times: [...this.times].sort(),
                volume: this.volume,
                repeat: this.repeat
            }
        };

        this.dialogRef.close(updatedAgenda);
    }

    cancel(): void {
        this.dialogRef.close(null);
    }
}
