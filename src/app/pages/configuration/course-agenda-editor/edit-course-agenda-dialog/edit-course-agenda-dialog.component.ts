import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import moment from 'moment';
import Swal, { SweetAlertResult } from 'sweetalert2';
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

export interface EditCourseAgendaDialogResult {
    action: 'save' | 'delete';
    agendaItem?: CourseAgenda;
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

    // Validation touched tracking
    isDaysTouched: boolean = false;
    isTimesTouched: boolean = false;

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
        this.isDaysTouched = true;
        if (this.isDaySelected(day)) {
            this.selectedDays = this.selectedDays.filter(d => d !== day);
        } else {
            this.selectedDays = [...this.selectedDays, day].sort((a, b) => a - b);
        }
    }

    selectAllDays(): void {
        this.isDaysTouched = true;
        this.selectedDays = [...this.availableDays];
    }

    clearAllDays(): void {
        this.isDaysTouched = true;
        this.selectedDays = [];
    }

    // Time picker logic
    openClockPicker(): void {
        this.tempPickerTime = new Date();
        this.isTimePickerOpen = true;
    }

    onTimePicked(event: any): void {
        const val = (event && event.value) ? event.value : this.tempPickerTime;
        if (val) {
            this.isTimesTouched = true;
            const timeFormatted = moment(val).format('HH:mm');
            this.addTime(timeFormatted);
        }
    }

    onClockPickerClose(): void {
        this.isTimePickerOpen = false;
        if (this.tempPickerTime) {
            this.isTimesTouched = true;
            const timeFormatted = moment(this.tempPickerTime).format('HH:mm');
            this.addTime(timeFormatted);
        }
    }

    isManualTimeValid(): boolean {
        if (!this.manualTimeInput) {
            return false;
        }
        const trimmed = this.manualTimeInput.trim();
        if (!/^\d{1,2}:\d{2}$/.test(trimmed)) {
            return false;
        }
        const [h, m] = trimmed.split(':').map(Number);
        return h >= 0 && h < 24 && m >= 0 && m < 60;
    }

    addManualTime(): void {
        if (!this.manualTimeInput) {
            return;
        }
        const trimmed = this.manualTimeInput.trim();
        if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
            const parts = trimmed.split(':');
            const h = Number(parts[0]);
            const m = Number(parts[1]);
            if (h >= 0 && h < 24 && m >= 0 && m < 60) {
                this.isTimesTouched = true;
                const formatted = `${parts[0].padStart(2, '0')}:${parts[1]}`;
                this.addTime(formatted);
                this.manualTimeInput = '';
            }
        }
    }

    addTime(timeStr: string): void {
        if (timeStr && !this.times.includes(timeStr)) {
            this.isTimesTouched = true;
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
            this.isTimesTouched = true;
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
        this.isTimesTouched = true;
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
        const hasTitle = Boolean(this.title && this.title.trim().length > 0);
        const hasGongType = this.selectedGongType != null;
        const hasAreas = Array.isArray(this.selectedAreas) && this.selectedAreas.length > 0;
        const hasDays = Array.isArray(this.selectedDays) && this.selectedDays.length > 0;
        const hasTimes = (Array.isArray(this.times) && this.times.length > 0) || this.isManualTimeValid();

        return Boolean(hasTitle && hasGongType && hasAreas && hasDays && hasTimes);
    }

    save(): void {
        if (this.isManualTimeValid()) {
            this.addManualTime();
        }

        if (!this.isValid()) {
            return;
        }

        const updatedAgenda: CourseAgenda = {
            title: (this.title || '').trim(),
            days: [...this.selectedDays].sort((a, b) => a - b),
            gongs: {
                type: this.selectedGongType!,
                areas: [...this.selectedAreas],
                times: [...this.times].sort(),
                volume: this.volume != null ? Number(this.volume) : 100,
                repeat: this.repeat != null ? Number(this.repeat) : 1
            }
        };

        this.dialogRef.close({ action: 'save', agendaItem: updatedAgenda });
    }

    async delete(): Promise<void> {
        const itemTitle = this.data.agendaItem?.title || this.title || 'this agenda item';
        const alertConfig = (this.titles.config as any)?.courseAgendaEditor?.alerts?.confirmDeleteAgendaItem;

        const result: SweetAlertResult = await Swal.fire({
            title: alertConfig?.title || 'Delete Agenda Item',
            text: alertConfig?.text || `Are you sure you want to delete "${itemTitle}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: alertConfig?.buttons?.confirm || 'Delete',
            cancelButtonText: alertConfig?.buttons?.cancel || 'Cancel'
        });

        if (result.value === true) {
            this.dialogRef.close({ action: 'delete' });
        }
    }

    cancel(): void {
        this.dialogRef.close(null);
    }
}
